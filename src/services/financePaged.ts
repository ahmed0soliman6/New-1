import {
  collection,
  count,
  documentId,
  getAggregateFromServer,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  sum,
  where,
  type DocumentSnapshot,
  type QueryConstraint,
} from 'firebase/firestore';
import { db } from './firebase';
import { ID_FIELD_MAP, normalize } from './repositories/common';
import { meterQuery } from './readMeter';
import { todayKey } from '../utils/dayKey';
import type { Invoice, Payment } from '../types/database';

export const FINANCE_PAGE_SIZE = 25;

/** year: 'all' | '2026' ، month: 'all' | '01'..'12' */
export type PeriodSel = { year: string; month: string };
export type KeyRange = { from?: string; to?: string };

export function currentPeriod(): PeriodSel {
  const t = todayKey();
  return { year: t.slice(0, 4), month: t.slice(5, 7) };
}

export function periodToRange(sel: PeriodSel): KeyRange {
  if (sel.year === 'all') return {};
  if (sel.month === 'all') return { from: `${sel.year}-01-01`, to: `${sel.year}-12-31` };
  return { from: `${sel.year}-${sel.month}-01`, to: `${sel.year}-${sel.month}-31` };
}

function rangeConstraints(field: string, r: KeyRange): QueryConstraint[] {
  const c: QueryConstraint[] = [];
  if (r.from) c.push(where(field, '>=', r.from));
  if (r.to) c.push(where(field, '<=', r.to));
  return c;
}

function mapDoc<T>(name: string, d: { id: string; data: () => Record<string, unknown> }): T {
  const idField = ID_FIELD_MAP[name] || 'id';
  const data = d.data();
  return normalize({ ...data, [idField]: (data[idField] as string) || d.id }) as T;
}

export interface PageResult<T> {
  items: T[];
  cursor: DocumentSnapshot | null;
  hasNext: boolean;
}

/** مجموع وعدد السجلات بقراءة رخيصة (قراءة واحدة لكل ~1000 مدخل فهرس) */
export async function fetchTotal(
  name: 'payments' | 'expenses',
  r: KeyRange
): Promise<{ total: number; count: number }> {
  if (!db) throw new Error('Firestore غير مهيأ');
  const field = name === 'payments' ? 'dayKey' : 'date';
  const snap = await getAggregateFromServer(
    query(collection(db, name), ...rangeConstraints(field, r)),
    { total: sum('amount'), n: count() }
  );
  const d = snap.data();
  return { total: Math.max(0, Number(d.total) || 0), count: Number(d.n) || 0 };
}

export interface ShiftBreakdown {
  totalInflow: number;
  cashInflow: number;
  electronicInflow: number;
  expensesTotal: number;
  netDrawerCash: number;
  netTotalRevenue: number;
  paymentsCount: number;
  expensesCount: number;
}

/** تفصيل تقفيل الوردية اليومي: يفصل النقدي عن الإلكتروني (فيزا / إنستاباي) والمصروفات */
export async function fetchShiftBreakdown(r: KeyRange): Promise<ShiftBreakdown> {
  if (!db) throw new Error('Firestore غير مهيأ');
  const [paymentsSnap, expensesAgg] = await Promise.all([
    getDocs(query(collection(db, 'payments'), ...rangeConstraints('dayKey', r))),
    fetchTotal('expenses', r),
  ]);
  meterQuery('financeShift:payments', paymentsSnap);

  let cashInflow = 0;
  let electronicInflow = 0;
  let paymentsCount = 0;

  paymentsSnap.docs.forEach((docSnap) => {
    const p = mapDoc<Payment>('payments', docSnap);
    const amt = Number(p.amount) || 0;
    if (amt <= 0 || (p.status && p.status !== 'PAID')) return;
    paymentsCount += 1;
    const methodStr = String(p.method || 'CASH').toUpperCase();
    if (methodStr === 'CARD' || methodStr === 'TRANSFER' || methodStr.includes('فيزا') || methodStr.includes('إنستا')) {
      electronicInflow += amt;
    } else {
      cashInflow += amt;
    }
  });

  const totalInflow = cashInflow + electronicInflow;
  const expensesTotal = Math.max(0, expensesAgg.total);
  return {
    totalInflow,
    cashInflow,
    electronicInflow,
    expensesTotal,
    netDrawerCash: cashInflow - expensesTotal,
    netTotalRevenue: totalInflow - expensesTotal,
    paymentsCount,
    expensesCount: expensesAgg.count,
  };
}

/** صفحة واحدة من الدفعات + فواتير هذه الصفحة فقط */
export async function fetchPaymentsPage(
  r: KeyRange,
  after: DocumentSnapshot | null
): Promise<PageResult<Payment> & { invoices: Invoice[] }> {
  if (!db) throw new Error('Firestore غير مهيأ');
  const q = query(
    collection(db, 'payments'),
    ...rangeConstraints('dayKey', r),
    orderBy('dayKey', 'desc'),
    ...(after ? [startAfter(after)] : []),
    limit(FINANCE_PAGE_SIZE + 1) // سجل زائد لمعرفة وجود صفحة تالية
  );
  const snap = await getDocs(q);
  meterQuery('financePage:payments', snap);

  const hasNext = snap.docs.length > FINANCE_PAGE_SIZE;
  const pageDocs = snap.docs.slice(0, FINANCE_PAGE_SIZE);
  const items = pageDocs.map((d) => mapDoc<Payment>('payments', d));

  const ids = [...new Set(items.map((p) => p.invoiceId).filter(Boolean))];
  let invoices: Invoice[] = [];
  if (ids.length > 0) {
    const iSnap = await getDocs(query(collection(db, 'invoices'), where(documentId(), 'in', ids))); // ≤ 25 (الحد 30)
    meterQuery('financePage:invoices', iSnap);
    invoices = iSnap.docs.map((d) => mapDoc<Invoice>('invoices', d));
  }
  return { items, invoices, cursor: pageDocs[pageDocs.length - 1] ?? null, hasNext };
}

/** الفواتير غير المسددة (عادة قليلة) */
export async function fetchUnpaidInvoices(): Promise<Invoice[]> {
  if (!db) throw new Error('Firestore غير مهيأ');
  const snap = await getDocs(
    query(collection(db, 'invoices'), where('status', 'in', ['UNPAID', 'PARTIALLY_PAID']), limit(100))
  );
  meterQuery('financePage:unpaid', snap);
  return snap.docs.map((d) => mapDoc<Invoice>('invoices', d));
}

/** صفحة واحدة من المصروفات */
export async function fetchExpensesPage<T = Record<string, unknown>>(
  r: KeyRange,
  after: DocumentSnapshot | null
): Promise<PageResult<T>> {
  if (!db) throw new Error('Firestore غير مهيأ');
  const q = query(
    collection(db, 'expenses'),
    ...rangeConstraints('date', r),
    orderBy('date', 'desc'),
    ...(after ? [startAfter(after)] : []),
    limit(FINANCE_PAGE_SIZE + 1)
  );
  const snap = await getDocs(q);
  meterQuery('financePage:expenses', snap);
  const hasNext = snap.docs.length > FINANCE_PAGE_SIZE;
  const pageDocs = snap.docs.slice(0, FINANCE_PAGE_SIZE);
  return {
    items: pageDocs.map((d) => mapDoc<T>('expenses', d)),
    cursor: pageDocs[pageDocs.length - 1] ?? null,
    hasNext,
  };
}

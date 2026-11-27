/**
 * On-demand receipt search for the GlobalSearchBar.
 *
 * لماذا هذه الخدمة موجودة؟ القوائم الحية (canonical) للمدفوعات والفواتير
 * مقيّدة بنوافذ زمنية (المدفوعات يومان، الفواتير 90 يوماً ثم 30)، فإيصال
 * مدفوع أقدم من يومين يختفي من البحث الحي: دفعته خارج نافذة المدفوعات،
 * وفاتورته مستثناة من حلقة «الفواتير بلا دفعة» في buildTransactions لأن
 * لها دفعة. هذه الخدمة تجلب — عند البحث فقط، وبدون توسيع أي اشتراك حي —
 * المدفوعات والفواتير المطابقة من الخادم، ثم تبني منها نفس سجلات
 * TransactionRecord عبر buildTransactions، فيكون البحث مكتملاً من أي تاريخ.
 *
 * الاستعلامات (كلها مساواة على حقل واحد — لا فهارس مركّبة مطلوبة):
 *  (أ) رقم إيصال/فاتورة: payments حيث receiptNumber == الاستعلام
 *      (بصيغه المختلفة)، و invoices بجلب المستند مباشرة برقم الفاتورة
 *      أو بنطاق بادئة على documentId — لأن ما يعرضه ملف المريض
 *      (#inv-1795) هو أول 8 أحرف فقط من معرّف الفاتورة الكامل
 *      (inv-<Date.now()>)، وgetDoc يتطلب المعرّف الكامل.
 *  (ب) اسم مريض: المرضى قائمة كاملة محلياً، فيُحلّ الاسم محلياً أولاً
 *      (يفعل ذلك المكوّن)، ثم تُجلب مدفوعات وفواتير كل مريض مطابق
 *      عبر patientId.
 *  (ج) الربط: لكل دفعة وُجدت تُجلب فاتورتها (invoiceId) حتى يكون
 *      serviceName/total صحيحين — وهذا يصلح أيضاً حالة «الدفع المتأخر»
 *      (فاتورة 31–90 يوماً دُفعت خلال آخر يومين) التي كانت تظهر في
 *      البحث الحي بخدمة وإجمالي افتراضيين.
 */
import {
  collection,
  doc,
  documentId,
  getDoc,
  getDocs,
  limit,
  query,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import { ID_FIELD_MAP, mapDocs, normalize } from './repositories/common';
import { meterQuery } from './readMeter';
import { buildTransactions } from '../utils/buildTransactions';
import type { Invoice, Payment, Patient } from '../types/database';
import type { PatientListItem, TransactionRecord } from '../types';

/** حد أقصى لعدد المرضى المطابقين بالاسم الذين نبحث سجلاتهم في طلب واحد. */
const MAX_PATIENTS_PER_SEARCH = 10;
/** حد أقصى لسجلات كل مريض في طلب واحد. */
const PER_PATIENT_LIMIT = 50;
/** حد أقصى للنتائج المباشرة برقم الإيصال. */
const RECEIPT_MATCH_LIMIT = 10;

export interface ReceiptSearchInput {
  /** نص البحث كما كتبه المستخدم (قبل أي تطبيع). */
  query: string;
  /** المرضى المطابقون للاسم محلياً (من القائمة الكاملة) — تُجلب سجلاتهم. */
  matchedPatients: PatientListItem[];
  /** قائمة المرضى الكاملة — تُستخدم فقط لحل أسماء المرضى في النتائج. */
  allPatients: PatientListItem[];
}

function mapDoc<T>(name: string, d: { id: string; data: () => Record<string, unknown> }): T {
  const idField = ID_FIELD_MAP[name] || 'id';
  const data = d.data();
  return normalize({ ...data, [idField]: (data[idField] as string) || d.id }) as T;
}

/**
 * يشتق بادئة معرّف فاتورة من نص البحث، أو null إن لم يكن النص رقم فاتورة:
 * «inv-1795» / «INV-1795» ← «inv-1795»، والرقم المجرد «1795» ← «inv-1795»
 * (معرّفات الفواتير inv-<Date.now()>، فالرقم المجرد هو بداية الطابع
 * الزمني). تُشترط 4 أحرف/أرقام فأكثر بعد inv- حتى لا يرجع استعلام
 * قصير كل فواتير الحقبة الحالية.
 */
function invoiceIdPrefix(q: string): string | null {
  const m = q.match(/^inv-?(\d+)$/i);
  if (m) return m[1].length >= 4 ? `inv-${m[1]}` : null;
  if (/^inv-/i.test(q)) {
    const rest = q.slice(4);
    return rest.length >= 4 ? q.toLowerCase() : null;
  }
  if (/^\d+$/.test(q)) return q.length >= 4 ? `inv-${q}` : null;
  return null;
}

/**
 * يبحث في كل السجل (أي تاريخ) عن إيصالات/فواتير مطابقة، ويعيد سجلات
 * TransactionRecord جاهزة للدمج مع نتائج البحث الحي. لا يغيّر أي اشتراك
 * حي ولا يكتب أي بيانات — قراءات getDocs/getDoc فقط.
 */
export async function searchReceiptsOnDemand({
  query: rawQuery,
  matchedPatients,
  allPatients,
}: ReceiptSearchInput): Promise<TransactionRecord[]> {
  if (!db) return [];
  const q = rawQuery.trim();
  if (q.length < 2) return [];

  const payments = new Map<string, Payment>();
  const invoices = new Map<string, Invoice>();

  try {
    // ——— (أ) مطابقة رقم الإيصال / رقم الفاتورة ———
    // أرقام الإيصالات المخزنة بصيغة REC-XXXXXXXX (أحرف كبيرة)؛ نجرب النص
    // كما كُتب، وبأحرف كبيرة، وباللاحقة REC- إن كتب المستخدم الرقم مجرداً.
    const receiptCandidates = [...new Set([q, q.toUpperCase(), `REC-${q.toUpperCase()}`])].filter(
      (c) => c.length >= 2 && c !== 'REC-'
    );
    await Promise.all(
      receiptCandidates.map(async (cand) => {
        const snap = await getDocs(
          query(collection(db, 'payments'), where('receiptNumber', '==', cand), limit(RECEIPT_MATCH_LIMIT))
        );
        meterQuery('search:receipts', snap);
        mapDocs<Payment>('payments', snap).forEach((p) => payments.set(p.paymentId, p));
      })
    );

    // الفاتورة ليس لها حقل رقم إيصال مخزن — رقمها الظاهر INV-<آخر 5>
    // مشتق من معرّفها، فيُجلب المستند مباشرة بمعرّفه (النص كما كُتب، أو
    // بعد تجريد بادئة INV-، وبأحرف كبيرة). المستند غير الموجود لا يكلف
    // إلا قراءة واحدة ويرجع فارغاً.
    const invoiceIdCandidates = [...new Set([q, q.toUpperCase()])];
    if (/^INV-/i.test(q)) {
      const stripped = q.replace(/^INV-/i, '');
      invoiceIdCandidates.push(stripped, stripped.toUpperCase());
    }
    await Promise.all(
      invoiceIdCandidates.map(async (id) => {
        if (!id) return;
        const snap = await getDoc(doc(db, 'invoices', id));
        if (snap.exists()) {
          const inv = mapDoc<Invoice>('invoices', snap);
          invoices.set(inv.invoiceId, inv);
        }
      })
    );

    // البادئة المعروضة في ملف المريض (#inv-1795) هي أول 8 أحرف فقط من
    // معرّف الفاتورة الكامل (inv-<Date.now()>)، وgetDoc أعلاه يتطلب
    // المعرّف الكامل فيفشل دائماً مع البادئة — لذلك نبحث أيضاً بنطاق
    // بادئة على documentId (استعلام حقل واحد، لا فهرس مركّب): «inv-1795»
    // أو الرقم المجرد «1795» يتحولان إلى البادئة inv-1795. البادئة
    // مقيّدة بـ 4 أحرف فأكثر بعد inv- حتى لا يرجع استعلام قصير كل فواتير
    // الفترة (كل معرّفات الحقبة الحالية تبدأ inv-1795).
    const invoicePrefix = invoiceIdPrefix(q);
    if (invoicePrefix) {
      const snap = await getDocs(
        query(
          collection(db, 'invoices'),
          where(documentId(), '>=', invoicePrefix),
          where(documentId(), '<', `${invoicePrefix}\uf8ff`),
          limit(RECEIPT_MATCH_LIMIT)
        )
      );
      meterQuery('search:receipts', snap);
      mapDocs<Invoice>('invoices', snap).forEach((inv) => invoices.set(inv.invoiceId, inv));
    }

    // الربط العكسي: فاتورة وُجدت برقمها قد تكون مدفوعة — نجلب دفعتها
    // (invoiceId ==) حتى يبنيها buildTransactions كسجل مدفوع صحيح
    // بدل سجل «فاتورة بلا دفعة» بإجمالي/خدمة افتراضيين.
    const foundInvoiceIds = [...invoices.keys()];
    await Promise.all(
      foundInvoiceIds.map(async (invId) => {
        const snap = await getDocs(
          query(collection(db, 'payments'), where('invoiceId', '==', invId), limit(RECEIPT_MATCH_LIMIT))
        );
        meterQuery('search:receipts', snap);
        mapDocs<Payment>('payments', snap).forEach((p) => payments.set(p.paymentId, p));
      })
    );

    // ——— (ب) مطابقة اسم المريض: سجلات كل مريض مطابق بالكامل ———
    const patientIds = matchedPatients.slice(0, MAX_PATIENTS_PER_SEARCH).map((p) => p.id);
    await Promise.all(
      patientIds.map(async (pid) => {
        const [pSnap, iSnap] = await Promise.all([
          getDocs(
            query(collection(db, 'payments'), where('patientId', '==', pid), limit(PER_PATIENT_LIMIT))
          ),
          getDocs(
            query(collection(db, 'invoices'), where('patientId', '==', pid), limit(PER_PATIENT_LIMIT))
          ),
        ]);
        meterQuery('search:receipts', pSnap);
        meterQuery('search:receipts', iSnap);
        mapDocs<Payment>('payments', pSnap).forEach((p) => payments.set(p.paymentId, p));
        mapDocs<Invoice>('invoices', iSnap).forEach((inv) => invoices.set(inv.invoiceId, inv));
      })
    );

    // ——— (ج) الربط: فاتورة كل دفعة وُجدت ولم تُجلب بعد ———
    const missingInvoiceIds = [...payments.values()]
      .map((p) => p.invoiceId)
      .filter((id): id is string => Boolean(id) && !invoices.has(id));
    // where(documentId(), 'in', ...) يقبل 30 قيمة كحد أقصى في الاستعلام الواحد.
    for (let i = 0; i < missingInvoiceIds.length; i += 30) {
      const chunk = [...new Set(missingInvoiceIds.slice(i, i + 30))];
      const snap = await getDocs(
        query(collection(db, 'invoices'), where(documentId(), 'in', chunk))
      );
      meterQuery('search:receipts', snap);
      mapDocs<Invoice>('invoices', snap).forEach((inv) => invoices.set(inv.invoiceId, inv));
    }
  } catch (err) {
    // البحث عند الطلب تحسينٌ فوق البحث الحي — أي فشل هنا لا يجب أن يكسر
    // البحث: تبقى النتائج الحية كما هي.
    console.warn('[receiptSearch] on-demand search failed', err);
    return [];
  }

  if (payments.size === 0 && invoices.size === 0) return [];

  // buildTransactions يقرأ من المريض patientId و fullName فقط؛ نمرر القائمة
  // الكاملة (لا المطابقين بالاسم فقط) لأن ضربة رقم الإيصال قد تخص مريضاً
  // لا يطابق اسمه نص البحث.
  const patientsForJoin = allPatients.map(
    (p) => ({ patientId: p.id, fullName: p.name }) as unknown as Patient
  );
  return buildTransactions({
    payments: [...payments.values()],
    invoices: [...invoices.values()],
    patients: patientsForJoin,
  });
}

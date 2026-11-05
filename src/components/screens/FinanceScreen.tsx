import React, { useState, useEffect } from 'react';
import { TransactionRecord, PatientListItem } from '../../types';
import { usePermissions } from '../../context/AuthContext';
import { PermissionGate } from '../auth/PermissionGate';
import {
  loadMedicalServices,
  loadExpenseCategories,
  addClinicExpense,
  removeClinicExpense,
  setCachedMedicalServices,
  setCachedExpenseCategories,
  MedicalServiceItem,
  ExpenseCategoryItem,
  ClinicExpenseRecord,
} from '../../utils/financeManager';
import { db } from '../../services/firebase';
import { doc, setDoc } from 'firebase/firestore';
import {
  subscribeToServices,
  subscribeToExpenseCategories,
} from '../../services/repositories';
import { toEnglishDigits, formatAppTime } from '../../utils/numberUtils';
import { useLanguage } from '../../i18n/LanguageContext';
import { todayKey } from '../../utils/dayKey';
import { fetchShiftBreakdown, type ShiftBreakdown } from '../../services/financePaged';
import { InflowPage } from '../finance/InflowPage';
import { ExpensesPage } from '../finance/ExpensesPage';
import type { Patient } from '../../types/database';

export interface FinanceScreenProps {
  transactions: TransactionRecord[];
  onAddTransaction: (newTx: TransactionRecord) => void | Promise<void>;
  onDeleteTransaction?: (txId: string) => void | Promise<void>;
  patients?: PatientListItem[];
  patientsCanonical?: Patient[];
}

export const FinanceScreen: React.FC<FinanceScreenProps> = ({
  onAddTransaction,
  onDeleteTransaction,
  patientsCanonical = [],
}) => {
  const { assertPermission, canDelete, userProfile } = usePermissions();
  const { language } = useLanguage();
  const allowFinanceDelete = canDelete('billing-payments');

  // Main Tab: Inflow ('in') vs Outflow ('out')
  const [financeTab, setFinanceTab] = useState<'in' | 'out'>('in');
  const [refreshKey, setRefreshKey] = useState<number>(0);

  // Dynamic Medical Services & Expense Categories loaded from Settings
  const [medicalServices, setMedicalServices] = useState<MedicalServiceItem[]>(loadMedicalServices);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategoryItem[]>(loadExpenseCategories);

  // Sync with local event dispatches (when changes happen in Settings)
  useEffect(() => {
    const handleServicesUpdate = () => {
      setMedicalServices(loadMedicalServices());
    };
    const handleExpCatsUpdate = () => {
      setExpenseCategories(loadExpenseCategories());
    };

    window.addEventListener('soli_services_updated', handleServicesUpdate);
    window.addEventListener('soli_expense_categories_updated', handleExpCatsUpdate);

    return () => {
      window.removeEventListener('soli_services_updated', handleServicesUpdate);
      window.removeEventListener('soli_expense_categories_updated', handleExpCatsUpdate);
    };
  }, []);

  // Sync directly from Firestore collections
  useEffect(() => {
    if (!db) return;

    const unsubServices = subscribeToServices(
      db,
      (srvs) => {
        if (Array.isArray(srvs)) {
          if (srvs.length > 0) {
            setMedicalServices(srvs as MedicalServiceItem[]);
            setCachedMedicalServices(srvs as MedicalServiceItem[]);
          } else {
            const current = loadMedicalServices();
            current.forEach((s) => {
              setDoc(doc(db!, 'services', s.id), s).catch(() => {});
            });
          }
        }
      },
      (err) => console.warn('Services sync error in FinanceScreen:', err)
    );

    const unsubExpCats = subscribeToExpenseCategories(
      db,
      (cats) => {
        if (Array.isArray(cats)) {
          if (cats.length > 0) {
            setExpenseCategories(cats as ExpenseCategoryItem[]);
            setCachedExpenseCategories(cats as ExpenseCategoryItem[]);
          } else {
            const current = loadExpenseCategories();
            current.forEach((c) => {
              setDoc(doc(db!, 'expenseCategories', c.id), c).catch(() => {});
            });
          }
        }
      },
      (err) => console.warn('Expense categories sync error in FinanceScreen:', err)
    );

    return () => {
      unsubServices();
      unsubExpCats();
    };
  }, []);

  // UI Modal & Confirmation States
  const [toast, setToast] = useState<string | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<TransactionRecord | null>(null);
  const [txToDelete, setTxToDelete] = useState<TransactionRecord | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<ClinicExpenseRecord | null>(null);
  const [shiftSummaryModal, setShiftSummaryModal] = useState<(ShiftBreakdown & { date: string }) | null>(null);

  // Submission locks to prevent duplicate writes on double-click (FIN-04)
  const [isSavingInvoice, setIsSavingInvoice] = useState(false);
  const [isSavingExpense, setIsSavingExpense] = useState(false);
  const [isClosingShift, setIsClosingShift] = useState(false);
  const [isDeletingRecord, setIsDeletingRecord] = useState(false);

  // New Invoice Modal States
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceDraftId, setInvoiceDraftId] = useState(() => `inv-${crypto.randomUUID()}`);
  const [invPatientName, setInvPatientName] = useState('');
  const [invService, setInvService] = useState('كشف واستشارة طبية');
  const [invAmount, setInvAmount] = useState<number>(300);
  const [invDiscount, setInvDiscount] = useState<number>(0);
  const [invStatus, setInvStatus] = useState<'مدفوعة' | 'غير مدفوعة' | 'مؤجلة'>('مدفوعة');
  const [invPaymentMethod, setInvPaymentMethod] = useState<'نقدي' | 'فيزا / كارت' | 'إنستاباي'>('نقدي');

  // Quick Expense Input States (FIN-05: use local todayKey instead of UTC toISOString)
  const [selectedExpenseCategory, setSelectedExpenseCategory] = useState<string>('');
  const [quickExpenseAmount, setQuickExpenseAmount] = useState<string>('');
  const [quickExpenseDate, setQuickExpenseDate] = useState<string>(() => todayKey());
  const [quickExpenseNotes, setQuickExpenseNotes] = useState<string>('');

  const showToastMessage = (msg: string, ms = 3500) => {
    setToast(msg);
    setTimeout(() => setToast(null), ms);
  };

  // Auto-fill price when medical service is selected
  const handleServiceChange = (serviceName: string) => {
    setInvService(serviceName);
    const matchedService = medicalServices.find((s) => s.name === serviceName);
    if (matchedService) {
      setInvAmount(Math.max(0, Number(matchedService.price) || 0));
    }
  };

  // Submit New Invoice
  const handleSaveInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingInvoice) return;

    const trimmedPatientName = invPatientName.trim();
    if (!trimmedPatientName) {
      showToastMessage('يرجى كتابة اسم المريض');
      return;
    }

    const cleanAmount = Number(invAmount);
    const cleanDiscount = Number(invDiscount);

    if (!Number.isFinite(cleanAmount) || cleanAmount <= 0) {
      showToastMessage('يرجى إدخال قيمة خدمة صحيحة أكبر من الصفر.');
      return;
    }
    if (!Number.isFinite(cleanDiscount) || cleanDiscount < 0) {
      showToastMessage('لا يمكن إدخال قيمة خصم سالبة.');
      return;
    }
    if (cleanDiscount > cleanAmount) {
      showToastMessage('لا يمكن أن تتجاوز قيمة الخصم إجمالي قيمة الخدمة.');
      return;
    }

    setIsSavingInvoice(true);
    try {
      assertPermission('billing.create', 'إنشاء فاتورة جديدة');
      const netAmount = Math.max(0, cleanAmount - cleanDiscount);
      const finalPaid = invStatus === 'مدفوعة' ? netAmount : 0;
      const localDate = todayKey();
      const newTx: TransactionRecord = {
        id: invoiceDraftId,
        receiptNo: `INV-${invoiceDraftId.slice(-6).toUpperCase()}`,
        patientName: trimmedPatientName,
        serviceName: invService,
        description: `${invService}${cleanDiscount > 0 ? ` (خصم ${toEnglishDigits(cleanDiscount)} ج.م)` : ''}`,
        totalAmount: cleanAmount,
        discountAmount: cleanDiscount,
        paidAmount: finalPaid,
        amount: netAmount,
        type: 'in',
        method: invPaymentMethod,
        paymentMethod: invPaymentMethod,
        status: invStatus,
        time: formatAppTime(new Date()),
        date: localDate,
        rawTimestamp: new Date().toISOString(),
        category: 'خدمات طبية',
      };

      await onAddTransaction(newTx);
      setShowInvoiceModal(false);
      setInvoiceDraftId(`inv-${crypto.randomUUID()}`);
      setInvPatientName('');
      setInvDiscount(0);
      setInvStatus('مدفوعة');

      setRefreshKey((k) => k + 1);
      showToastMessage(`تم إنشاء الفاتورة بنجاح للمريض (${trimmedPatientName})`);
    } catch (err) {
      showToastMessage(err instanceof Error ? err.message : 'حدث خطأ أثناء حفظ الفاتورة.');
    } finally {
      setIsSavingInvoice(false);
    }
  };

  // Submit Quick Expense
  const handleAddQuickExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingExpense) return;

    const cleanAmountStr = toEnglishDigits(quickExpenseAmount);
    const amountNum = Number(cleanAmountStr);
    if (!selectedExpenseCategory) {
      showToastMessage('يرجى اختيار بند المصروف');
      return;
    }
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      showToastMessage('يرجى إدخال مبلغ موجب صحيح للمصروف (أكبر من الصفر)');
      return;
    }

    setIsSavingExpense(true);
    try {
      assertPermission('billing.expenses', 'تسجيل مصروف للعيادة');
      const now = new Date();
      const validDate = quickExpenseDate && /^\d{4}-\d{2}-\d{2}$/.test(quickExpenseDate) ? quickExpenseDate : todayKey();
      const newExp: ClinicExpenseRecord = {
        id: `exp-${Date.now()}`,
        category: selectedExpenseCategory,
        amount: amountNum,
        date: validDate,
        time: formatAppTime(now),
        notes: quickExpenseNotes.trim() || undefined,
        createdAt: now.toISOString(),
        createdBy: userProfile?.displayName || 'الاستقبال',
      };

      addClinicExpense(newExp);

      // Register into transactions stream
      const txExp: TransactionRecord = {
        id: newExp.id,
        receiptNo: `EXP-${Math.floor(Math.random() * 900) + 100}`,
        patientName: `مصروف: ${selectedExpenseCategory}`,
        description: newExp.notes || selectedExpenseCategory,
        amount: amountNum,
        type: 'out',
        method: 'نقدي',
        time: newExp.time,
        date: newExp.date,
        rawTimestamp: newExp.createdAt,
        category: 'مصروفات العيادة',
      };
      await onAddTransaction(txExp);

      setSelectedExpenseCategory('');
      setQuickExpenseAmount('');
      setQuickExpenseNotes('');

      setRefreshKey((k) => k + 1);
      showToastMessage(`تم تسجيل مصروف "${selectedExpenseCategory}" بمبلغ ${amountNum} ج.م بنجاح ✓`);
    } catch (err) {
      showToastMessage(err instanceof Error ? err.message : 'ليس لديك صلاحية لتسجيل المصروفات.');
    } finally {
      setIsSavingExpense(false);
    }
  };

  // Handle Close Shift: Asynchronously queries today's breakdown (Total, Cash, Electronic, Expenses)
  const handleCloseShift = async () => {
    if (isClosingShift) return;
    setIsClosingShift(true);
    try {
      assertPermission('billing.closeShift', 'تقفيل الوردية وتسليم النقدية');
      const t = todayKey();
      const breakdown = await fetchShiftBreakdown({ from: t, to: t });
      setShiftSummaryModal({ ...breakdown, date: t });
    } catch (err) {
      showToastMessage(err instanceof Error ? err.message : 'ليس لديك صلاحية لتقفيل الوردية.');
    } finally {
      setIsClosingShift(false);
    }
  };

  return (
    <div className="flex flex-col w-full pb-16 space-y-6 text-slate-800 dark:text-[#dde2f5]">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-[#18233C] border border-[#00c2cb] text-slate-900 dark:text-[#45dee7] px-6 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in">
          <span className="material-symbols-outlined text-2xl text-[#00c2cb]">payments</span>
          <span className="text-sm font-bold">{toast}</span>
        </div>
      )}

      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-[#859394] mb-1">
            <span>الرئيسية</span>
            <span>&gt;</span>
            <span className="text-[#008f97] dark:text-[#00c2cb]">الفواتير والمالية</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-[#dde2f5] flex items-center gap-3">
            <span>إدارة الفواتير والتحصيل المالي</span>
            <span className="bg-emerald-100 dark:bg-[#10B981]/20 text-emerald-700 dark:text-[#10B981] px-3 py-0.5 rounded-full text-xs font-bold border border-emerald-200 dark:border-[#10B981]/30">
              وردية اليوم مفتوحة
            </span>
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          <PermissionGate permission="billing.closeShift">
            <button
              onClick={handleCloseShift}
              disabled={isClosingShift}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 dark:bg-[#18233C] hover:bg-slate-200 dark:hover:bg-[#223254] disabled:opacity-60 text-slate-800 dark:text-[#dde2f5] text-xs font-bold border border-slate-200 dark:border-white/10 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-base text-[#00c2cb]">lock_clock</span>
              <span>{isClosingShift ? 'جارٍ حساب الوردية...' : 'تقفيل الوردية وتسليم النقدية'}</span>
            </button>
          </PermissionGate>
        </div>
      </div>

      {/* Segmented Tab Switcher: Inflow vs Outflow */}
      <div className="flex items-center gap-2 bg-slate-100 dark:bg-[#111A2E] p-1 rounded-2xl border border-slate-200 dark:border-white/5 w-fit">
        <button
          type="button"
          onClick={() => setFinanceTab('in')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            financeTab === 'in'
              ? 'bg-[#00c2cb] text-slate-950 shadow-sm'
              : 'text-slate-600 dark:text-[#bbc9ca] hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <span className="material-symbols-outlined text-base">payments</span>
          <span>الوارد (المتحصلات والفواتير)</span>
        </button>

        <button
          type="button"
          onClick={() => setFinanceTab('out')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            financeTab === 'out'
              ? 'bg-[#00c2cb] text-slate-950 shadow-sm'
              : 'text-slate-600 dark:text-[#bbc9ca] hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <span className="material-symbols-outlined text-base">trending_down</span>
          <span>المنصرف (مصروفات العيادة)</span>
        </button>
      </div>

      {/* Main Tab Content */}
      {financeTab === 'in' ? (
        <InflowPage
          patientsCanonical={patientsCanonical}
          refreshKey={refreshKey}
          onPrint={setSelectedReceipt}
          onDelete={allowFinanceDelete && onDeleteTransaction ? setTxToDelete : undefined}
          onCreateInvoice={() => setShowInvoiceModal(true)}
        />
      ) : (
        <div className="space-y-6">
          {/* Quick Expense Registration Form */}
          <div className="bg-white dark:bg-[#111A2E] rounded-2xl border border-slate-200 dark:border-white/5 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-lg">add_shopping_cart</span>
                </div>
                <div>
                  <h3 className="font-bold text-xs text-slate-900 dark:text-white">تسجيل مصروف جديد للعيادة</h3>
                  <p className="text-[11px] text-slate-500 dark:text-[#859394]">
                    تسجيل المصروفات النثرية والتشغيلية المعتمدة
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5">
              <form onSubmit={handleAddQuickExpense} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {/* Select Expense Category */}
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-[#859394] block">
                      اختر بند المصروف *
                    </label>
                    <select
                      value={selectedExpenseCategory}
                      onChange={(e) => setSelectedExpenseCategory(e.target.value)}
                      required
                      className="w-full bg-slate-50 dark:bg-[#18233C] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-[#00c2cb] cursor-pointer"
                    >
                      <option value="">اختر بند المصروف...</option>
                      {expenseCategories.map((cat) => (
                        <option key={cat.id || cat.name} value={cat.name}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Amount (ج.م) */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-[#859394] block">
                      المبلغ (ج.م) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={quickExpenseAmount}
                      onChange={(e) => setQuickExpenseAmount(e.target.value)}
                      placeholder="مثال: 150"
                      className="w-full bg-slate-50 dark:bg-[#18233C] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/10 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-[#00c2cb]"
                    />
                  </div>

                  {/* Date Picker */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-[#859394] block">
                      التاريخ
                    </label>
                    <input
                      type="date"
                      value={quickExpenseDate}
                      onChange={(e) => setQuickExpenseDate(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-[#18233C] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/10 font-mono focus:outline-none focus:ring-1 focus:ring-[#00c2cb] cursor-pointer"
                    />
                  </div>

                  {/* Notes / Optional */}
                  <div className="space-y-1 sm:col-span-2 md:col-span-4">
                    <input
                      type="text"
                      value={quickExpenseNotes}
                      onChange={(e) => setQuickExpenseNotes(e.target.value)}
                      placeholder="ملاحظات أو تفاصيل إضافية عن المصروف (اختياري)..."
                      className="w-full bg-slate-50 dark:bg-[#18233C] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/10 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={isSavingExpense}
                    className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-60 text-white font-bold text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-98"
                  >
                    <span className="material-symbols-outlined text-base">add_circle</span>
                    <span>{isSavingExpense ? 'جارٍ الحفظ...' : 'تسجيل المصروف'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Expenses Paginated Table from Server */}
          <ExpensesPage
            refreshKey={refreshKey}
            onDelete={allowFinanceDelete ? setExpenseToDelete : undefined}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: إنشاء فاتورة جديدة (CREATE INVOICE MODAL) */}
      {/* ========================================================================= */}
      {showInvoiceModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#18233C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-[#00c2cb]">receipt</span>
                <span>إنشاء فاتورة كشف أو خدمة طبية</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowInvoiceModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveInvoice} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-[#859394]">
                  اسم المريض *
                </label>
                <input
                  type="text"
                  required
                  value={invPatientName}
                  onChange={(e) => setInvPatientName(e.target.value)}
                  placeholder="أدخل اسم المريض..."
                  className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-white text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-[#00c2cb]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-[#859394]">
                  الخدمة الطبية *
                </label>
                <select
                  value={invService}
                  onChange={(e) => handleServiceChange(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-white text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/10 focus:outline-none cursor-pointer"
                >
                  {medicalServices.map((srv) => (
                    <option key={srv.id || srv.name} value={srv.name}>
                      {srv.name} ({toEnglishDigits(srv.price)} ج.م)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-[#859394]">
                    قيمة الخدمة (ج.م) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={invAmount}
                    onChange={(e) => setInvAmount(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-white text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/10 font-mono font-bold focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-[#859394]">
                    الخصم (إن وجد)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={invAmount}
                    value={invDiscount}
                    onChange={(e) => setInvDiscount(Math.min(invAmount, Math.max(0, Number(e.target.value) || 0)))}
                    className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-white text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/10 font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="p-3 bg-teal-50 dark:bg-[#00c2cb]/10 rounded-xl flex items-center justify-between text-xs">
                <span className="font-bold text-teal-800 dark:text-[#45dee7]">المبلغ المستحق بعد الخصم:</span>
                <span className="font-mono font-black text-sm text-[#008f97] dark:text-[#00c2cb]">
                  {toEnglishDigits(Math.max(0, invAmount - invDiscount))} ج.م
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-[#859394]">
                    طريقة الدفع
                  </label>
                  <select
                    value={invPaymentMethod}
                    onChange={(e) => setInvPaymentMethod(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-white text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/10 focus:outline-none cursor-pointer"
                  >
                    <option value="نقدي">نقدي (كاش)</option>
                    <option value="فيزا / كارت">فيزا / كارت</option>
                    <option value="إنستاباي">إنستاباي</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-[#859394]">
                    حالة الفاتورة
                  </label>
                  <select
                    value={invStatus}
                    onChange={(e) => setInvStatus(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-white text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/10 focus:outline-none cursor-pointer"
                  >
                    <option value="مدفوعة">مدفوعة ومسددة</option>
                    <option value="غير مدفوعة">غير مدفوعة (آجل)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setShowInvoiceModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-[#859394] hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSavingInvoice}
                  className="px-5 py-2 rounded-xl bg-[#00c2cb] hover:bg-[#45dee7] disabled:opacity-60 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer"
                >
                  {isSavingInvoice ? 'جارٍ الحفظ...' : 'حفظ الفاتورة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: طباعة إيصال السداد */}
      {/* ========================================================================= */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <span className="text-xs font-black text-[#008f97] uppercase tracking-wider">
                إيصال استلام نقدية
              </span>
              <button
                type="button"
                onClick={() => setSelectedReceipt(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="text-center py-2 space-y-1">
              <div className="w-12 h-12 bg-teal-50 text-[#008f97] rounded-full mx-auto flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">check_circle</span>
              </div>
              <div className="text-2xl font-black font-mono text-slate-900 pt-2">
                {toEnglishDigits(
                  (selectedReceipt.paidAmount ?? selectedReceipt.amount ?? selectedReceipt.totalAmount ?? 0).toLocaleString('en-US')
                )}{' '}
                ج.م
              </div>
              <div className="text-xs text-slate-500 font-bold">
                {selectedReceipt.patientName}
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl space-y-2 text-xs font-mono text-slate-700 border border-slate-100">
              <div className="flex justify-between">
                <span className="text-slate-400">رقم الإيصال:</span>
                <span className="font-bold">{selectedReceipt.receiptNo || selectedReceipt.receiptNumber || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">الخدمة:</span>
                <span className="font-bold text-slate-900">{selectedReceipt.serviceName || selectedReceipt.description || 'كشف'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">طريقة الدفع:</span>
                <span className="font-bold">{selectedReceipt.paymentMethod || selectedReceipt.method || 'نقدي'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">التاريخ:</span>
                <span>{toEnglishDigits(selectedReceipt.date)}</span>
              </div>
              {selectedReceipt.time && (
                <div className="flex justify-between">
                  <span className="text-slate-400">الوقت:</span>
                  <span>{toEnglishDigits(selectedReceipt.time)}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedReceipt(null)}
                className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold font-sans cursor-pointer hover:bg-slate-200"
              >
                إغلاق
              </button>
              <button
                type="button"
                onClick={() => {
                  window.print();
                }}
                className="flex-1 py-2 rounded-xl bg-[#00c2cb] text-[#08101C] text-xs font-bold font-sans cursor-pointer hover:bg-[#45dee7]"
              >
                طباعة الآن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CONFIRMATION MODAL: DELETE INVOICE / TRANSACTION */}
      {/* ========================================================================= */}
      {txToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111A2E] border border-rose-500/30 rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 mx-auto flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl">delete_sweep</span>
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                تأكيد حذف الفاتورة
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#859394] leading-relaxed">
                هل أنت متأكد من حذف الفاتورة بمبلغ{' '}
                <strong className="text-[#008f97] dark:text-[#00c2cb] font-mono">
                  {toEnglishDigits(txToDelete.amount)} ج.م
                </strong>{' '}
                للمريض <strong className="text-slate-800 dark:text-white">({txToDelete.patientName})</strong>؟
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setTxToDelete(null)}
                disabled={isDeletingRecord}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-[#18233C] text-slate-700 dark:text-[#dde2f5] text-xs font-bold transition-all cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={isDeletingRecord}
                onClick={async () => {
                  if (!onDeleteTransaction || !txToDelete || isDeletingRecord) return;
                  setIsDeletingRecord(true);
                  try {
                    assertPermission('billing.delete', 'حذف الفاتورة');
                    await onDeleteTransaction(txToDelete.id);
                    showToastMessage('تم حذف الفاتورة بنجاح', 3000);
                    setRefreshKey((k) => k + 1);
                  } catch (err) {
                    showToastMessage(
                      err instanceof Error ? err.message : 'تعذر حذف الفاتورة لعدم توفر الصلاحية.',
                      4000
                    );
                  } finally {
                    setIsDeletingRecord(false);
                    setTxToDelete(null);
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-60 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
              >
                {isDeletingRecord ? 'جارٍ الحذف...' : 'تأكيد الحذف'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CONFIRMATION MODAL: DELETE CLINIC EXPENSE */}
      {/* ========================================================================= */}
      {expenseToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111A2E] border border-rose-500/30 rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 mx-auto flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl">delete_sweep</span>
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                تأكيد حذف المصروف
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#859394] leading-relaxed">
                هل أنت متأكد من حذف مصروف{' '}
                <strong className="text-slate-800 dark:text-white">({expenseToDelete.category})</strong> بمبلغ{' '}
                <strong className="text-rose-600 dark:text-[#ef4444] font-mono">
                  {toEnglishDigits(expenseToDelete.amount)} ج.م
                </strong>؟
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setExpenseToDelete(null)}
                disabled={isDeletingRecord}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-[#18233C] text-slate-700 dark:text-[#dde2f5] text-xs font-bold transition-all cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={isDeletingRecord}
                onClick={async () => {
                  if (!expenseToDelete || isDeletingRecord) return;
                  setIsDeletingRecord(true);
                  try {
                    assertPermission('billing.delete', 'حذف المصروف');
                    await removeClinicExpense(expenseToDelete.id);
                    showToastMessage(`تم حذف مصروف ${expenseToDelete.category} بنجاح`, 3000);
                    setRefreshKey((k) => k + 1);
                  } catch (err) {
                    showToastMessage(
                      err instanceof Error ? err.message : 'تعذر حذف المصروف لعدم توفر الصلاحية.',
                      4000
                    );
                  } finally {
                    setIsDeletingRecord(false);
                    setExpenseToDelete(null);
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-60 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
              >
                {isDeletingRecord ? 'جارٍ الحذف...' : 'تأكيد الحذف'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: تقفيل الوردية وتسليم النقدية (SHIFT CLOSING BREAKDOWN MODAL) */}
      {/* ========================================================================= */}
      {shiftSummaryModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-white/10 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#00c2cb]/15 text-[#008f97] dark:text-[#00c2cb] flex items-center justify-center">
                  <span className="material-symbols-outlined text-xl">lock_clock</span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    ملخص تقفيل الوردية وتسليم النقدية
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-[#859394] font-mono">
                    تاريخ الوردية: {toEnglishDigits(shiftSummaryModal.date)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShiftSummaryModal(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* الإجمالي الكلي للتحصيل */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#18233C] border border-slate-200 dark:border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-[#dde2f5]">
                  الإجمالي الكلي للتحصيل ({toEnglishDigits(shiftSummaryModal.paymentsCount)} عملية)
                </span>
                <span className="text-base font-black font-mono tabular-nums text-slate-900 dark:text-white">
                  {toEnglishDigits(
                    shiftSummaryModal.totalInflow.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  )}{' '}
                  ج.م
                </span>
              </div>

              {/* سطر تفصيلي للنقدي والإلكتروني والمصروفات */}
              <div className="pt-2.5 border-t border-slate-200/70 dark:border-white/10 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-[#859394] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>التحصيل النقدي (كاش بالدرج)</span>
                  </span>
                  <span className="font-mono font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                    {toEnglishDigits(
                      shiftSummaryModal.cashInflow.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    )}{' '}
                    ج.م
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-[#859394] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                    <span>التحصيل الإلكتروني (فيزا / إنستاباي)</span>
                  </span>
                  <span className="font-mono font-bold tabular-nums text-indigo-600 dark:text-indigo-400">
                    {toEnglishDigits(
                      shiftSummaryModal.electronicInflow.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    )}{' '}
                    ج.م
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-[#859394] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                    <span>إجمالي المصروفات ({toEnglishDigits(shiftSummaryModal.expensesCount)} بند)</span>
                  </span>
                  <span className="font-mono font-bold tabular-nums text-rose-600 dark:text-rose-400">
                    -{' '}
                    {toEnglishDigits(
                      shiftSummaryModal.expensesTotal.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    )}{' '}
                    ج.م
                  </span>
                </div>
              </div>
            </div>

            {/* صافي النقدية بالدرج وصافي الإيراد الكلي */}
            <div className="p-4 rounded-2xl bg-teal-50/80 dark:bg-[#00c2cb]/10 border border-teal-200 dark:border-[#00c2cb]/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-teal-900 dark:text-[#45dee7]">
                  صافي النقدية الفعلي بالدرج (النقدي - المصروفات):
                </span>
                <span className="text-base font-black font-mono tabular-nums text-[#008f97] dark:text-[#00c2cb]">
                  {toEnglishDigits(
                    shiftSummaryModal.netDrawerCash.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  )}{' '}
                  ج.م
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-[#859394]">
                <span>صافي الإيراد الكلي (شاملاً الإلكتروني):</span>
                <span className="font-mono font-bold tabular-nums">
                  {toEnglishDigits(
                    shiftSummaryModal.netTotalRevenue.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  )}{' '}
                  ج.م
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShiftSummaryModal(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-[#18233C] text-slate-700 dark:text-[#dde2f5] text-xs font-bold transition-all cursor-pointer"
              >
                إغلاق
              </button>
              <button
                type="button"
                onClick={() => {
                  const formattedCash = `${toEnglishDigits(
                    shiftSummaryModal.netDrawerCash.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  )} ج.م`;
                  setShiftSummaryModal(null);
                  showToastMessage(`تم اعتماد تقفيل الوردية بنجاح! صافي النقدية المسلمة: ${formattedCash}`, 4500);
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#00c2cb] hover:bg-[#45dee7] text-slate-950 text-xs font-bold shadow-md transition-all cursor-pointer"
              >
                اعتماد وتسليم الوردية
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

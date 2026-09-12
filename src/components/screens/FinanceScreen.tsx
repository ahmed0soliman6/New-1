import React, { useState, useEffect, useMemo } from 'react';
import { CLINIC_INFO } from '../../data/previewClinicData';
import { TransactionRecord, PatientListItem } from '../../types';
import { usePermissions } from '../../context/AuthContext';
import { PermissionGate } from '../auth/PermissionGate';
import {
  loadMedicalServices,
  setCachedMedicalServices,
  loadExpenseCategories,
  setCachedExpenseCategories,
  loadClinicExpenses,
  setCachedClinicExpenses,
  addClinicExpense,
  removeClinicExpense,
  MedicalServiceItem,
  ExpenseCategoryItem,
  ClinicExpenseRecord,
} from '../../utils/financeManager';
import { db } from '../../services/firebase';
import {
  subscribeToServices,
  subscribeToExpenseCategories,
  subscribeToExpenses,
} from '../../services/repositories';

interface FinanceScreenProps {
  transactions: TransactionRecord[];
  onAddTransaction: (tx: TransactionRecord) => void;
  onDeleteTransaction?: (txId: string) => void;
  patients?: PatientListItem[];
}

type TimeframeOption = 'day' | 'week' | 'month' | 'year' | 'all';

export const FinanceScreen: React.FC<FinanceScreenProps> = ({
  transactions,
  onAddTransaction,
  onDeleteTransaction,
  patients = [],
}) => {
  const { assertPermission, userProfile } = usePermissions();

  // Dynamic Medical Services & Expense Categories loaded from Settings
  const [medicalServices, setMedicalServices] = useState<MedicalServiceItem[]>(loadMedicalServices);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategoryItem[]>(loadExpenseCategories);
  const [expenses, setExpenses] = useState<ClinicExpenseRecord[]>(loadClinicExpenses);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeframeOption>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const PAGE_SIZE = 40; // 40 items per page

  // Month & Year Filter for Top Statistical Cards
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  // Month & Year Filter for Visits/Inflow Records Table
  const [tableFilterYear, setTableFilterYear] = useState<string>('all');
  const [tableFilterMonth, setTableFilterMonth] = useState<string>('all');

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedTimeframe, tableFilterMonth, tableFilterYear]);

  // Sync directly from Firestore collections
  useEffect(() => {
    if (!db) return;

    const unsubServices = subscribeToServices(
      db,
      (srvs) => {
        if (srvs && srvs.length > 0) {
          setMedicalServices(srvs as MedicalServiceItem[]);
          setCachedMedicalServices(srvs as MedicalServiceItem[]);
        }
      },
      (err) => console.warn('Services sync error in FinanceScreen:', err)
    );

    const unsubExpCats = subscribeToExpenseCategories(
      db,
      (cats) => {
        if (cats && cats.length > 0) {
          setExpenseCategories(cats as ExpenseCategoryItem[]);
          setCachedExpenseCategories(cats as ExpenseCategoryItem[]);
        }
      },
      (err) => console.warn('Expense categories sync error in FinanceScreen:', err)
    );

    const unsubExpenses = subscribeToExpenses(
      db,
      (exps) => {
        setExpenses(exps as ClinicExpenseRecord[]);
        setCachedClinicExpenses(exps as ClinicExpenseRecord[]);
      },
      (err) => console.warn('Expenses sync error in FinanceScreen:', err)
    );

    return () => {
      unsubServices();
      unsubExpCats();
      unsubExpenses();
    };
  }, []);

  // UI Modal & Confirmation States
  const [toast, setToast] = useState<string | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<TransactionRecord | null>(null);
  const [txToDelete, setTxToDelete] = useState<TransactionRecord | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<ClinicExpenseRecord | null>(null);

  // New Invoice Modal States
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invPatientName, setInvPatientName] = useState('');
  const [invService, setInvService] = useState('كشف واستشارة طبية');
  const [invAmount, setInvAmount] = useState<number>(300);
  const [invDiscount, setInvDiscount] = useState<number>(0);
  const [invStatus, setInvStatus] = useState<'مدفوعة' | 'غير مدفوعة' | 'مؤجلة'>('مدفوعة');
  const [invPaymentMethod, setInvPaymentMethod] = useState<'نقدي' | 'فيزا / كارت' | 'إنستاباي'>('نقدي');

  // Quick Expense Input States
  const [selectedExpenseCategory, setSelectedExpenseCategory] = useState<string>('');
  const [quickExpenseAmount, setQuickExpenseAmount] = useState<string>('');
  const [quickExpenseDate, setQuickExpenseDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [quickExpenseNotes, setQuickExpenseNotes] = useState<string>('');

  // Auto-fill price when medical service is selected
  const handleSelectService = (serviceName: string) => {
    setInvService(serviceName);
    const matched = medicalServices.find((s) => s.name === serviceName);
    if (matched) {
      setInvAmount(matched.price);
    }
  };

  // Live System Inflow Transactions (sorted newest first)
  const allInflowRecords = useMemo(() => {
    return [...transactions]
      .filter((t) => t.type !== 'out')
      .sort((a, b) => {
        const timeA = new Date(`${a.date || '2026-01-01'} ${a.time || '00:00'}`).getTime();
        const timeB = new Date(`${b.date || '2026-01-01'} ${b.time || '00:00'}`).getTime();
        if (!isNaN(timeB) && !isNaN(timeA) && timeB !== timeA) return timeB - timeA;
        return (b.id || '').localeCompare(a.id || '');
      });
  }, [transactions]);

  // Live System Expenses (sorted newest first)
  const sortedExpenses = useMemo(() => {
    return [...expenses].sort((a, b) => {
      const timeA = new Date(a.date || a.createdAt || '2026-01-01').getTime();
      const timeB = new Date(b.date || b.createdAt || '2026-01-01').getTime();
      if (!isNaN(timeB) && !isNaN(timeA) && timeB !== timeA) return timeB - timeA;
      return (b.id || '').localeCompare(a.id || '');
    });
  }, [expenses]);

  // Month Names in Arabic
  const MONTH_NAMES_AR: Record<string, string> = {
    '1': 'يناير',
    '2': 'فبراير',
    '3': 'مارس',
    '4': 'أبريل',
    '5': 'مايو',
    '6': 'يونيو',
    '7': 'يوليو',
    '8': 'أغسطس',
    '9': 'سبتمبر',
    '10': 'أكتوبر',
    '11': 'نوفمبر',
    '12': 'ديسمبر',
  };

  // Helper to extract year, month, and day safely
  const extractDateParts = (dateStr?: string) => {
    const now = new Date();
    if (!dateStr) return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
    const match = dateStr.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (match) {
      return {
        year: parseInt(match[1], 10),
        month: parseInt(match[2], 10),
        day: parseInt(match[3], 10),
      };
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return {
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        day: d.getDate(),
      };
    }
    return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
  };

  // Selected period label for top statistics cards
  const selectedPeriodLabel = useMemo(() => {
    if (selectedMonth === 'all') {
      return selectedYear === 'all' ? 'جميع الفترات' : `عام ${selectedYear}`;
    }
    const monthName = MONTH_NAMES_AR[selectedMonth] || selectedMonth;
    return selectedYear === 'all' ? `شهر ${monthName}` : `${monthName} ${selectedYear}`;
  }, [selectedMonth, selectedYear]);

  // 6 Metric Values Calculations (Dynamically calculated directly from live system transactions & expenses)
  const metrics = useMemo(() => {
    let totalInflowAll = 0;
    transactions
      .filter((t) => t.type !== 'out')
      .forEach((t) => {
        totalInflowAll += (t.paidAmount ?? t.amount ?? t.totalAmount ?? 0);
      });

    let totalOutflowAll = 0;
    expenses.forEach((exp) => {
      totalOutflowAll += (exp.amount || 0);
    });
    transactions
      .filter((t) => t.type === 'out')
      .forEach((tx) => {
        totalOutflowAll += (tx.amount || 0);
      });

    const actualNetDrawer = totalInflowAll - totalOutflowAll;

    // Calculate Inflow for the selected period (الشهر / السنة المختارة)
    let periodInflow = 0;
    allInflowRecords.forEach((rec) => {
      const parts = extractDateParts(rec.date);
      if (selectedYear !== 'all' && parts.year !== Number(selectedYear)) return;
      if (selectedMonth !== 'all' && parts.month !== Number(selectedMonth)) return;
      periodInflow += (rec.paidAmount ?? rec.amount ?? rec.totalAmount ?? 0);
    });

    // Calculate Outflow for the selected period (الشهر / السنة المختارة)
    let periodOutflow = 0;
    expenses.forEach((exp) => {
      const parts = extractDateParts(exp.date);
      if (selectedYear !== 'all' && parts.year !== Number(selectedYear)) return;
      if (selectedMonth !== 'all' && parts.month !== Number(selectedMonth)) return;
      periodOutflow += (exp.amount || 0);
    });

    transactions
      .filter((t) => t.type === 'out')
      .forEach((tx) => {
        const parts = extractDateParts(tx.date);
        if (selectedYear !== 'all' && parts.year !== Number(selectedYear)) return;
        if (selectedMonth !== 'all' && parts.month !== Number(selectedMonth)) return;
        periodOutflow += (tx.amount || 0);
      });

    const periodBalance = periodInflow - periodOutflow;

    return {
      totalInflowAll,
      totalOutflowAll,
      actualNetDrawer,
      periodInflow,
      periodOutflow,
      periodBalance,
    };
  }, [allInflowRecords, expenses, transactions, selectedYear, selectedMonth]);

  // Format currency with 2 decimals
  const formatCurrency = (val: number) => {
    return `${val.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ج.م`;
  };

  // Filter records based on timeframe, month, year, and search query
  const filteredInflowRecords = useMemo(() => {
    return allInflowRecords.filter((rec) => {
      // 1. Timeframe Filter
      if (selectedTimeframe !== 'all') {
        const parts = extractDateParts(rec.date);
        const now = new Date();
        const todayYear = now.getFullYear();
        const todayMonth = now.getMonth() + 1;
        const todayDay = now.getDate();

        if (selectedTimeframe === 'day') {
          const isToday =
            (parts.year === todayYear && parts.month === todayMonth && parts.day === todayDay) ||
            rec.time?.includes('اليوم');
          if (!isToday) return false;
        } else if (selectedTimeframe === 'week') {
          const txDate = new Date(rec.date);
          const diffDays = Math.abs(now.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24);
          if (diffDays > 7) return false;
        } else if (selectedTimeframe === 'month') {
          if (tableFilterYear !== 'all' && parts.year !== Number(tableFilterYear)) return false;
          if (tableFilterMonth !== 'all' && parts.month !== Number(tableFilterMonth)) return false;
        } else if (selectedTimeframe === 'year') {
          if (tableFilterYear !== 'all' && parts.year !== Number(tableFilterYear)) return false;
        }
      }

      // 2. Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const pat = (rec.patientName || '').toLowerCase();
        const desc = (rec.description || '').toLowerCase();
        const srv = (rec.serviceName || '').toLowerCase();
        const receipt = (rec.receiptNo || rec.receiptNumber || '').toLowerCase();
        if (!pat.includes(q) && !desc.includes(q) && !srv.includes(q) && !receipt.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [allInflowRecords, selectedTimeframe, tableFilterMonth, tableFilterYear, searchQuery]);

  // Paginated records
  const totalRecordsCount = filteredInflowRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalRecordsCount / PAGE_SIZE));
  const paginatedRecords = useMemo(() => {
    const startIdx = (currentPage - 1) * PAGE_SIZE;
    return filteredInflowRecords.slice(startIdx, startIdx + PAGE_SIZE);
  }, [filteredInflowRecords, currentPage, PAGE_SIZE]);

  // Total visits display counter
  const totalVisitsCount = allInflowRecords.length;

  // Format Date in Arabic readable
  const formatArabicDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('ar-EG', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Submit New Invoice
  const handleSaveInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invPatientName.trim()) {
      alert('يرجى كتابة اسم المريض');
      return;
    }
    try {
      assertPermission('billing.create', 'إنشاء فاتورة جديدة');
      const finalPaid = invStatus === 'مدفوعة' ? Math.max(0, invAmount - invDiscount) : 0;
      const newTx: TransactionRecord = {
        id: `inv-${Date.now()}`,
        receiptNo: `INV-${Math.floor(Math.random() * 9000) + 1000}`,
        patientName: invPatientName.trim(),
        serviceName: invService,
        description: `${invService}${invDiscount > 0 ? ` (خصم ${invDiscount} ج.م)` : ''}`,
        totalAmount: invAmount,
        discountAmount: invDiscount,
        paidAmount: finalPaid,
        amount: finalPaid > 0 ? finalPaid : invAmount,
        type: 'in',
        method: invPaymentMethod,
        paymentMethod: invPaymentMethod,
        status: invStatus,
        time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
        date: new Date().toISOString().split('T')[0],
        category: 'خدمات طبية',
      };

      onAddTransaction(newTx);
      setShowInvoiceModal(false);
      setInvPatientName('');
      setInvDiscount(0);
      setInvStatus('مدفوعة');

      setToast(`تم إنشاء الفاتورة رقم ${newTx.receiptNo} بنجاح للمريض (${invPatientName})`);
      setTimeout(() => setToast(null), 3500);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'ليس لديك صلاحية لإنشاء الفواتير.');
    }
  };

  // Submit Quick Expense
  const handleAddQuickExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = Number(quickExpenseAmount);
    if (!selectedExpenseCategory) {
      alert('يرجى اختيار بند المصروف');
      return;
    }
    if (!amountNum || amountNum <= 0) {
      alert('يرجى إدخال مبلغ صحيح للمصروف');
      return;
    }

    try {
      assertPermission('billing.expenses', 'تسجيل مصروف للعيادة');
      const newExp: ClinicExpenseRecord = {
        id: `exp-${Date.now()}`,
        category: selectedExpenseCategory,
        amount: amountNum,
        date: quickExpenseDate,
        time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
        notes: quickExpenseNotes.trim() || undefined,
        createdAt: new Date().toISOString(),
        createdBy: userProfile?.displayName || 'الاستقبال',
      };

      const updated = addClinicExpense(newExp);
      setExpenses(updated);

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
        category: 'مصروفات العيادة',
      };
      onAddTransaction(txExp);

      setSelectedExpenseCategory('');
      setQuickExpenseAmount('');
      setQuickExpenseNotes('');

      setToast(`تم تسجيل مصروف "${selectedExpenseCategory}" بمبلغ ${amountNum} ج.م بنجاح ✓`);
      setTimeout(() => setToast(null), 3500);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'ليس لديك صلاحية لتسجيل المصروفات.');
    }
  };

  // Handle Close Shift
  const handleCloseShift = () => {
    try {
      assertPermission('billing.closeShift', 'تقفيل الوردية وتسليم النقدية');
      setToast(`تم إغلاق وردية الاستقبال بنجاح! صافي النقدية بالخزينة: ${formatCurrency(metrics.actualNetDrawer)}`);
      setTimeout(() => setToast(null), 4500);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'ليس لديك صلاحية لتقفيل الوردية.');
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
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 dark:bg-[#18233C] hover:bg-slate-200 dark:hover:bg-[#223254] text-slate-800 dark:text-[#dde2f5] text-xs font-bold border border-slate-200 dark:border-white/10 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-base text-[#00c2cb]">lock_clock</span>
              <span>تقفيل الوردية وتسليم النقدية</span>
            </button>
          </PermissionGate>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6 TOP STATISTICAL FINANCIAL CARDS (بطاقات المؤشرات المالية) */}
      {/* ========================================================================= */}
      
      {/* Cards 1, 2, 3: الإجماليات الشاملة */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Card 1: إجمالي الوارد (كل الفترات) */}
        <div className="bg-white dark:bg-[#111A2E] p-4.5 rounded-2xl border border-slate-200 dark:border-white/5 shadow-xs flex flex-col justify-between transition-all hover:border-emerald-500/40">
          <div className="flex items-center justify-between gap-3 mb-2">
            <span className="text-xs font-bold text-slate-600 dark:text-[#bbc9ca]">
              إجمالي الوارد (كل الفترات)
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-[#10B981] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-lg">trending_up</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-[#10B981] font-mono tracking-tight block">
              {formatCurrency(metrics.totalInflowAll)}
            </span>
            <span className="text-[10px] text-slate-400 dark:text-[#859394] mt-0.5 block">
              إجمالي المتحصلات الطبية المسجلة
            </span>
          </div>
        </div>

        {/* Card 2: إجمالي المنصرف (كل الفترات) */}
        <div className="bg-white dark:bg-[#111A2E] p-4.5 rounded-2xl border border-slate-200 dark:border-white/5 shadow-xs flex flex-col justify-between transition-all hover:border-rose-500/40">
          <div className="flex items-center justify-between gap-3 mb-2">
            <span className="text-xs font-bold text-slate-600 dark:text-[#bbc9ca]">
              إجمالي المنصرف (كل الفترات)
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-[#ef4444] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-lg">trending_down</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xl sm:text-2xl font-black text-rose-600 dark:text-[#ef4444] font-mono tracking-tight block">
              {formatCurrency(metrics.totalOutflowAll)}
            </span>
            <span className="text-[10px] text-slate-400 dark:text-[#859394] mt-0.5 block">
              المصروفات التشغيلية والنثرية
            </span>
          </div>
        </div>

        {/* Card 3: الرصيد الحالي الفعلي */}
        <div className="bg-white dark:bg-[#111A2E] p-4.5 rounded-2xl border border-slate-200 dark:border-white/5 shadow-xs flex flex-col justify-between transition-all hover:border-[#00c2cb]/40">
          <div className="flex items-center justify-between gap-3 mb-2">
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              الرصيد الحالي الفعلي
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#00c2cb]/15 text-[#008f97] dark:text-[#00c2cb] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-lg">account_balance_wallet</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xl sm:text-2xl font-black text-[#008f97] dark:text-[#45dee7] font-mono tracking-tight block">
              {formatCurrency(metrics.actualNetDrawer)}
            </span>
            <span className="text-[10px] text-slate-400 dark:text-[#859394] mt-0.5 block">
              صافي الخزينة والدرج المتاح الآن
            </span>
          </div>
        </div>
      </div>

      {/* شريط اختيار الشهر والسنة بجوار بطاقات الفترة */}
      <div className="bg-slate-50 dark:bg-[#18233C]/60 p-3 sm:px-4 rounded-2xl border border-slate-200 dark:border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#00c2cb]/15 text-[#008f97] dark:text-[#00c2cb] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-lg">date_range</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900 dark:text-[#dde2f5]">
                عرض إيرادات ومصروفات حسب الشهر والسنة:
              </span>
              <span className="text-xs font-black text-[#008f97] dark:text-[#45dee7] bg-[#00c2cb]/10 px-2 py-0.5 rounded-md border border-[#00c2cb]/20">
                {selectedPeriodLabel}
              </span>
            </div>
            <span className="text-[10px] text-slate-500 dark:text-[#859394]">
              تحديث مباشر للبطاقات الثلاث أدناه بناءً على اختيارك
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* اختيار الشهر */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-[#111A2E] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 shadow-2xs">
            <span className="text-xs font-bold text-slate-500 dark:text-[#859394]">الشهر:</span>
            <select
              value={selectedMonth}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedMonth(val);
                setTableFilterMonth(val);
              }}
              className="bg-transparent text-xs font-bold text-slate-900 dark:text-[#dde2f5] focus:outline-none cursor-pointer"
            >
              <option value="all">كامل السنة (جميع الشهور)</option>
              <option value="1">يناير (01)</option>
              <option value="2">فبراير (02)</option>
              <option value="3">مارس (03)</option>
              <option value="4">أبريل (04)</option>
              <option value="5">مايو (05)</option>
              <option value="6">يونيو (06)</option>
              <option value="7">يوليو (07)</option>
              <option value="8">أغسطس (08)</option>
              <option value="9">سبتمبر (09)</option>
              <option value="10">أكتوبر (10)</option>
              <option value="11">نوفمبر (11)</option>
              <option value="12">ديسمبر (12)</option>
            </select>
          </div>

          {/* اختيار السنة */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-[#111A2E] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 shadow-2xs">
            <span className="text-xs font-bold text-slate-500 dark:text-[#859394]">السنة:</span>
            <select
              value={selectedYear}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedYear(val);
                setTableFilterYear(val);
              }}
              className="bg-transparent text-xs font-bold text-slate-900 dark:text-[#dde2f5] focus:outline-none cursor-pointer"
            >
              <option value="all">كل السنوات</option>
              <option value="2027">2027</option>
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
            </select>
          </div>
        </div>
      </div>

      {/* Cards 4, 5, 6: بطاقات الفترة المحددة (الشهر والسنة) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Card 4: وارد [الفترة المحددة] */}
        <div className="bg-white dark:bg-[#111A2E] p-4.5 rounded-2xl border border-slate-200 dark:border-white/5 shadow-xs flex flex-col justify-between transition-all hover:border-emerald-500/40">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div>
              <span className="text-xs font-bold text-slate-700 dark:text-[#bbc9ca] block">
                وارد {selectedPeriodLabel}
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-[#10B981] font-bold">
                إيرادات الفترة المحددة
              </span>
            </div>
            <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-lg">calendar_month</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-[#10B981] font-mono tracking-tight block">
              {formatCurrency(metrics.periodInflow)}
            </span>
            <span className="text-[10px] text-slate-400 dark:text-[#859394] mt-0.5 block">
              {selectedMonth === 'all' ? `إجمالي وارد عام ${selectedYear}` : `المحصل الفعلي خلال ${selectedPeriodLabel}`}
            </span>
          </div>
        </div>

        {/* Card 5: منصرف [الفترة المحددة] */}
        <div className="bg-white dark:bg-[#111A2E] p-4.5 rounded-2xl border border-slate-200 dark:border-white/5 shadow-xs flex flex-col justify-between transition-all hover:border-rose-500/40">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div>
              <span className="text-xs font-bold text-slate-700 dark:text-[#bbc9ca] block">
                منصرف {selectedPeriodLabel}
              </span>
              <span className="text-[10px] text-rose-500 font-bold">
                مصروفات الفترة المحددة
              </span>
            </div>
            <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-500 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-lg">shopping_cart</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xl sm:text-2xl font-black text-rose-600 dark:text-[#ef4444] font-mono tracking-tight block">
              {formatCurrency(metrics.periodOutflow)}
            </span>
            <span className="text-[10px] text-slate-400 dark:text-[#859394] mt-0.5 block">
              {selectedMonth === 'all' ? `إجمالي مصروفات عام ${selectedYear}` : `مصروفات العيادة خلال ${selectedPeriodLabel}`}
            </span>
          </div>
        </div>

        {/* Card 6: صافي رصيد [الفترة المحددة] */}
        <div className="bg-white dark:bg-[#111A2E] p-4.5 rounded-2xl border border-slate-200 dark:border-white/5 shadow-xs flex flex-col justify-between transition-all hover:border-blue-500/40">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-[#dde2f5] block">
                صافي رصيد {selectedPeriodLabel}
              </span>
              <span className="text-[10px] text-[#008f97] dark:text-[#00c2cb] font-bold">
                (الوارد - المنصرف)
              </span>
            </div>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-lg">savings</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xl sm:text-2xl font-black text-[#008f97] dark:text-[#45dee7] font-mono tracking-tight block">
              {formatCurrency(metrics.periodBalance)}
            </span>
            <span className="text-[10px] text-slate-400 dark:text-[#859394] mt-0.5 block">
              صافي الفائض المالي للفترة المحددة
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SEARCH AND FILTER TOOLBAR (شريط البحث وتصفية الحركات والزيارات) */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-[#111A2E] p-4 rounded-2xl border border-slate-200 dark:border-white/5 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Left / Search Input */}
          <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-[#dde2f5] shrink-0">
              <span className="material-symbols-outlined text-base text-[#00c2cb]">search</span>
              <span>بحث فى الحركات:</span>
            </div>
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث باسم المريض أو البيان..."
                className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-[#00c2cb]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Right: Visit Records Badge + View Mode Filters */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Visit Records Badge */}
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-[#18233C] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/5 shrink-0">
              <span className="material-symbols-outlined text-base text-[#008f97] dark:text-[#00c2cb]">
                history_edu
              </span>
              <span className="text-xs text-slate-600 dark:text-[#859394]">سجل الزيارات:</span>
              <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                {totalVisitsCount} زيارة
              </span>
            </div>

            {/* Timeframe View Filters */}
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-[#18233C] p-1 rounded-xl border border-slate-200 dark:border-white/5">
              <span className="text-[11px] font-bold text-slate-500 dark:text-[#859394] px-2 flex items-center gap-1">
                <span>📅 عرض حسب:</span>
              </span>

              <button
                type="button"
                onClick={() => setSelectedTimeframe('day')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedTimeframe === 'day'
                    ? 'bg-[#00c2cb] text-slate-950 shadow-xs'
                    : 'text-slate-600 dark:text-[#bbc9ca] hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                اليوم
              </button>

              <button
                type="button"
                onClick={() => setSelectedTimeframe('week')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedTimeframe === 'week'
                    ? 'bg-[#00c2cb] text-slate-950 shadow-xs'
                    : 'text-slate-600 dark:text-[#bbc9ca] hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                الاسبوع
              </button>

              {/* اختيار الشهر المخصص لسجل الزيارات */}
              <div className={`flex items-center gap-1 px-2 py-1 rounded-lg border transition-all ${
                selectedTimeframe === 'month'
                  ? 'bg-white dark:bg-[#111A2E] border-[#00c2cb]/50 shadow-xs'
                  : 'border-transparent'
              }`}>
                <button
                  type="button"
                  onClick={() => setSelectedTimeframe('month')}
                  className={`text-xs font-bold transition-all cursor-pointer ${
                    selectedTimeframe === 'month'
                      ? 'text-[#008f97] dark:text-[#00c2cb]'
                      : 'text-slate-600 dark:text-[#bbc9ca] hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  الشهر:
                </button>
                <select
                  value={tableFilterMonth}
                  onChange={(e) => {
                    setTableFilterMonth(e.target.value);
                    setSelectedTimeframe('month');
                  }}
                  className="bg-transparent text-xs font-bold text-slate-900 dark:text-[#dde2f5] focus:outline-none cursor-pointer"
                >
                  <option value="all">كل الشهور</option>
                  <option value="1">يناير (01)</option>
                  <option value="2">فبراير (02)</option>
                  <option value="3">مارس (03)</option>
                  <option value="4">أبريل (04)</option>
                  <option value="5">مايو (05)</option>
                  <option value="6">يونيو (06)</option>
                  <option value="7">يوليو (07)</option>
                  <option value="8">أغسطس (08)</option>
                  <option value="9">سبتمبر (09)</option>
                  <option value="10">أكتوبر (10)</option>
                  <option value="11">نوفمبر (11)</option>
                  <option value="12">ديسمبر (12)</option>
                </select>
              </div>

              {/* اختيار السنة لسجل الزيارات */}
              <div className={`flex items-center gap-1 px-2 py-1 rounded-lg border transition-all ${
                selectedTimeframe === 'year'
                  ? 'bg-white dark:bg-[#111A2E] border-[#00c2cb]/50 shadow-xs'
                  : 'border-transparent'
              }`}>
                <button
                  type="button"
                  onClick={() => setSelectedTimeframe('year')}
                  className={`text-xs font-bold transition-all cursor-pointer ${
                    selectedTimeframe === 'year'
                      ? 'text-[#008f97] dark:text-[#00c2cb]'
                      : 'text-slate-600 dark:text-[#bbc9ca] hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  السنة:
                </button>
                <select
                  value={tableFilterYear}
                  onChange={(e) => {
                    setTableFilterYear(e.target.value);
                    setSelectedTimeframe('year');
                  }}
                  className="bg-transparent text-xs font-bold text-slate-900 dark:text-[#dde2f5] focus:outline-none cursor-pointer"
                >
                  <option value="all">كل السنوات</option>
                  <option value="2027">2027</option>
                  <option value="2026">2026</option>
                  <option value="2025">2025</option>
                  <option value="2024">2024</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedTimeframe('all');
                  setTableFilterMonth('all');
                  setTableFilterYear('all');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedTimeframe === 'all'
                    ? 'bg-[#00c2cb] text-slate-950 shadow-xs'
                    : 'text-slate-600 dark:text-[#bbc9ca] hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                الكل
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2 SEPARATED MAIN CARDS: CARD 1 (الوارد) & CARD 2 (المنصرف) SIDE-BY-SIDE */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* ========================================== */}
        {/* CARD 1: بطاقة الوارد (INFLOW & INVOICES) */}
        {/* ========================================== */}
        <div className="xl:col-span-7 bg-white dark:bg-[#111A2E] rounded-2xl border border-slate-200 dark:border-white/5 shadow-xs overflow-hidden flex flex-col">
          {/* Card 1 Header */}
          <div className="p-5 border-b border-slate-100 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50 dark:bg-[#18233C]/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-[#10B981] flex items-center justify-center font-bold">
                <span className="material-symbols-outlined text-xl">savings</span>
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-[#dde2f5] flex items-center gap-2">
                  <span>سجل الفواتير والتحصيل المالي (الوارد)</span>
                  <span className="text-[11px] font-mono bg-emerald-100 dark:bg-[#10B981]/20 text-emerald-700 dark:text-[#10B981] px-2 py-0.5 rounded-full">
                    {totalRecordsCount} سجل
                  </span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-[#859394] mt-0.5">
                  تسجيل وتحصيل تلقائي من الزيارات والفواتير المنشأة
                </p>
              </div>
            </div>

            <PermissionGate permission="billing.create">
              <button
                type="button"
                onClick={() => setShowInvoiceModal(true)}
                className="px-4 py-2 rounded-xl bg-[#00c2cb] hover:bg-[#45dee7] text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95 shrink-0"
              >
                <span className="material-symbols-outlined text-base">add_circle</span>
                <span>إنشاء فاتورة كشف</span>
              </button>
            </PermissionGate>
          </div>

          {/* Table of Inflow (40 per page) */}
          <div className="p-5 pt-4 flex-1 flex flex-col">
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/5">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 dark:bg-[#18233C] text-slate-700 dark:text-[#bbc9ca] border-b border-slate-200 dark:border-white/5 font-bold">
                    <th className="p-3">المريض</th>
                    <th className="p-3">الخدمة الطبية</th>
                    <th className="p-3 text-center">المبلغ الإجمالي</th>
                    <th className="p-3 text-center">التاريخ والوقت</th>
                    <th className="p-3 text-center">الحالة</th>
                    <th className="p-3 text-center">إجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {paginatedRecords.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-xs text-slate-400 dark:text-[#859394]">
                        لا توجد فواتير أو متحصلات مطابقة للبحث أو التصفية الحالية
                      </td>
                    </tr>
                  ) : (
                    paginatedRecords.map((tx) => {
                      const amountDisplay = tx.amount || tx.paidAmount || tx.totalAmount || 0;
                      const isPaid = tx.status === 'غير مدفوعة' ? false : true;
                      return (
                        <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-[#18233C]/60 transition-colors">
                          <td className="p-3 font-bold text-slate-900 dark:text-[#dde2f5]">
                            <div>{tx.patientName}</div>
                            {tx.receiptNo && (
                              <span className="text-[10px] text-[#008f97] dark:text-[#00c2cb] font-mono block">
                                {tx.receiptNo}
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-slate-700 dark:text-[#bbc9ca]">
                            {tx.serviceName || tx.description || 'كشف واستشارة طبية'}
                          </td>
                          <td className="p-3 text-center font-mono font-bold text-sm text-emerald-600 dark:text-[#10B981]">
                            {amountDisplay.toLocaleString()} ج.م
                          </td>
                          <td className="p-3 text-center font-mono text-[11px] whitespace-nowrap">
                            <div className="text-slate-800 dark:text-slate-200 font-bold">{tx.date || '—'}</div>
                            <div className="text-[10px] text-[#008f97] dark:text-[#00c2cb] font-bold flex items-center justify-center gap-1 mt-0.5">
                              <span className="material-symbols-outlined text-[12px]">schedule</span>
                              <span>{tx.time ? `الساعة ${tx.time}` : '—'}</span>
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                isPaid
                                  ? 'bg-emerald-100 dark:bg-[#10B981]/20 text-emerald-700 dark:text-[#10B981] border border-emerald-200 dark:border-[#10B981]/30'
                                  : 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                              }`}
                            >
                              {tx.status || 'مدفوعة'}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setSelectedReceipt(tx)}
                                className="p-1.5 rounded-lg bg-slate-100 dark:bg-[#080e1b] hover:bg-[#00c2cb]/20 text-slate-600 dark:text-[#bbc9ca] hover:text-[#008f97] dark:hover:text-[#00c2cb] transition-colors cursor-pointer"
                                title="عرض وطباعة إيصال السداد"
                              >
                                <span className="material-symbols-outlined text-base">print</span>
                              </button>
                              {onDeleteTransaction && (
                                <button
                                  type="button"
                                  onClick={() => setTxToDelete(tx)}
                                  className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
                                  title="حذف الفاتورة"
                                >
                                  <span className="material-symbols-outlined text-base">delete</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls (40 items per page) */}
            {totalPages > 1 && (
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="text-slate-500 dark:text-[#859394]">
                  عرض{' '}
                  <strong className="font-mono text-slate-800 dark:text-white">
                    {(currentPage - 1) * PAGE_SIZE + 1}
                  </strong>{' '}
                  -{' '}
                  <strong className="font-mono text-slate-800 dark:text-white">
                    {Math.min(currentPage * PAGE_SIZE, totalRecordsCount)}
                  </strong>{' '}
                  من أصل{' '}
                  <strong className="font-mono text-slate-800 dark:text-white">
                    {totalRecordsCount}
                  </strong>{' '}
                  سجل (40 اسم بالصفحة)
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      currentPage === 1
                        ? 'opacity-40 cursor-not-allowed border-slate-200 dark:border-white/5 text-slate-400'
                        : 'bg-white dark:bg-[#18233C] border-slate-200 dark:border-white/10 text-slate-700 dark:text-[#dde2f5] hover:bg-slate-100'
                    }`}
                  >
                    السابق
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, idx) => {
                      let pageNum = idx + 1;
                      if (totalPages > 5 && currentPage > 3) {
                        pageNum = currentPage - 3 + idx;
                        if (pageNum > totalPages) pageNum = totalPages - (4 - idx);
                      }
                      return (
                        <button
                          key={pageNum}
                          type="button"
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-8 h-8 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer ${
                            currentPage === pageNum
                              ? 'bg-[#00c2cb] text-slate-950 shadow-xs'
                              : 'bg-slate-100 dark:bg-[#18233C] text-slate-700 dark:text-[#dde2f5] hover:bg-slate-200 dark:hover:bg-[#223254]'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      currentPage === totalPages
                        ? 'opacity-40 cursor-not-allowed border-slate-200 dark:border-white/5 text-slate-400'
                        : 'bg-white dark:bg-[#18233C] border-slate-200 dark:border-white/10 text-slate-700 dark:text-[#dde2f5] hover:bg-slate-100'
                    }`}
                  >
                    التالي
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ========================================== */}
        {/* CARD 2: بطاقة المنصرف (OUTFLOW / EXPENSES) */}
        {/* ========================================== */}
        <div className="xl:col-span-5 bg-white dark:bg-[#111A2E] rounded-2xl border border-slate-200 dark:border-white/5 shadow-xs overflow-hidden flex flex-col">
          {/* Card 2 Header */}
          <div className="p-5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-[#18233C]/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-[#ef4444] flex items-center justify-center font-bold">
                <span className="material-symbols-outlined text-xl">shopping_bag</span>
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-[#dde2f5]">
                  المنصرف ومصروفات العيادة
                </h2>
                <p className="text-xs text-slate-500 dark:text-[#859394] mt-0.5">
                  تسجيل المصروفات النثرية والتشغيلية المعتمدة
                </p>
              </div>
            </div>
          </div>

          {/* Quick Expense Registration Form */}
          <div className="p-5 pb-3">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#080e1b] border border-slate-200 dark:border-white/5 space-y-3">
              <span className="text-xs font-bold text-slate-900 dark:text-[#dde2f5] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base text-rose-500">add_shopping_cart</span>
                <span>تسجيل مصروف جديد</span>
              </span>

              <form onSubmit={handleAddQuickExpense} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Select Expense Category */}
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-[#859394] block">
                      اختر بند المصروف... *
                    </label>
                    <select
                      value={selectedExpenseCategory}
                      onChange={(e) => setSelectedExpenseCategory(e.target.value)}
                      required
                      className="w-full bg-white dark:bg-[#18233C] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-[#00c2cb]"
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
                      className="w-full bg-white dark:bg-[#18233C] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/10 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-[#00c2cb]"
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
                      className="w-full bg-white dark:bg-[#18233C] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/10 font-mono focus:outline-none focus:ring-1 focus:ring-[#00c2cb]"
                    />
                  </div>

                  {/* Notes / Optional */}
                  <div className="space-y-1 sm:col-span-2">
                    <input
                      type="text"
                      value={quickExpenseNotes}
                      onChange={(e) => setQuickExpenseNotes(e.target.value)}
                      placeholder="ملاحظات أو تفاصيل إضافية (اختياري)..."
                      className="w-full bg-white dark:bg-[#18233C] text-slate-900 dark:text-[#dde2f5] text-xs p-2 rounded-xl border border-slate-200 dark:border-white/10 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-98"
                >
                  <span className="material-symbols-outlined text-base">add_circle</span>
                  <span>إضافة مصروف</span>
                </button>
              </form>
            </div>
          </div>

          {/* Table of Expenses */}
          <div className="p-5 pt-0 flex-1 flex flex-col">
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/5">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 dark:bg-[#18233C] text-slate-700 dark:text-[#bbc9ca] border-b border-slate-200 dark:border-white/5 font-bold">
                    <th className="p-3">البند</th>
                    <th className="p-3 text-center">المبلغ</th>
                    <th className="p-3 text-center">التاريخ</th>
                    <th className="p-3 text-center">حذف</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {sortedExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-xs text-slate-400 dark:text-[#859394]">
                        لا توجد مصروفات مسجلة حتى الآن
                      </td>
                    </tr>
                  ) : (
                    sortedExpenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-slate-50 dark:hover:bg-[#18233C]/60 transition-colors">
                        <td className="p-3 font-bold text-slate-900 dark:text-[#dde2f5]">
                          <div>{exp.category}</div>
                          {exp.notes && (
                            <span className="text-[10px] text-slate-500 dark:text-[#859394] block font-normal">
                              {exp.notes}
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-sm text-rose-600 dark:text-[#ef4444]">
                          {exp.amount.toLocaleString()} ج.م
                        </td>
                        <td className="p-3 text-center font-mono text-slate-500 dark:text-[#859394] text-[11px] whitespace-nowrap">
                          {formatArabicDate(exp.date)}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => setExpenseToDelete(exp)}
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
                            title="حذف المصروف"
                          >
                            <span className="material-symbols-outlined text-base">delete</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: إنشاء فاتورة جديدة (CREATE INVOICE MODAL) */}
      {/* ========================================================================= */}
      {showInvoiceModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#18233C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-[#dde2f5] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#00c2cb]">receipt_long</span>
                <span>إنشاء فاتورة جديدة</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowInvoiceModal(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveInvoice} className="space-y-4">
              {/* Field 1: اسم المريض * */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-[#dde2f5] block">
                  اسم المريض *
                </label>
                <input
                  type="text"
                  required
                  value={invPatientName}
                  onChange={(e) => setInvPatientName(e.target.value)}
                  placeholder="مثال: دينا رمضان"
                  list="patients-suggestions"
                  className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs p-3 rounded-xl border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-[#00c2cb]"
                />
                <datalist id="patients-suggestions">
                  {patients.map((p) => (
                    <option key={p.id} value={p.name} />
                  ))}
                </datalist>
              </div>

              {/* Field 2: الخدمة الطبية */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-[#dde2f5] block">
                  الخدمة الطبية
                </label>
                <select
                  value={invService}
                  onChange={(e) => handleSelectService(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs p-3 rounded-xl border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-[#00c2cb]"
                >
                  {medicalServices.map((srv) => (
                    <option key={srv.id || srv.name} value={srv.name}>
                      {srv.name} ({srv.price} ج.م)
                    </option>
                  ))}
                </select>
              </div>

              {/* Grid: المبلغ + الخصم */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Field 3: المبلغ (ج.م) */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-[#dde2f5] block">
                    المبلغ (ج.م) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={invAmount}
                    onChange={(e) => setInvAmount(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs p-3 rounded-xl border border-slate-200 dark:border-white/10 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-[#00c2cb]"
                  />
                </div>

                {/* Field 4: الخصم (ج.م) */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-[#dde2f5] block">
                    الخصم (ج.م)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={invDiscount}
                    onChange={(e) => setInvDiscount(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs p-3 rounded-xl border border-slate-200 dark:border-white/10 font-mono focus:outline-none focus:ring-1 focus:ring-[#00c2cb]"
                  />
                </div>
              </div>

              {/* Grid: حالة الفاتورة + طريقة الدفع */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Field 5: حالة الفاتورة */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-[#dde2f5] block">
                    حالة الفاتورة
                  </label>
                  <select
                    value={invStatus}
                    onChange={(e) => setInvStatus(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs p-3 rounded-xl border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-[#00c2cb]"
                  >
                    <option value="مدفوعة">مدفوعة</option>
                    <option value="غير مدفوعة">غير مدفوعة</option>
                    <option value="مؤجلة">مؤجلة</option>
                  </select>
                </div>

                {/* Field 6: طريقة الدفع */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-[#dde2f5] block">
                    طريقة الدفع
                  </label>
                  <select
                    value={invPaymentMethod}
                    onChange={(e) => setInvPaymentMethod(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs p-3 rounded-xl border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-[#00c2cb]"
                  >
                    <option value="نقدي">نقدي (كاش)</option>
                    <option value="فيزا / كارت">فيزا / كارت POS</option>
                    <option value="إنستاباي">إنستاباي / تحويل</option>
                  </select>
                </div>
              </div>

              {/* Net Total Summary Badge */}
              <div className="p-3 bg-teal-50 dark:bg-[#00c2cb]/10 border border-[#00c2cb]/30 rounded-xl flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 dark:text-[#dde2f5]">الصافي المطلوب تحصيله:</span>
                <span className="font-mono font-extrabold text-base text-[#008f97] dark:text-[#45dee7]">
                  {Math.max(0, invAmount - invDiscount)} ج.م
                </span>
              </div>

              {/* Actions: إلغاء / حفظ الفاتورة */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setShowInvoiceModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-[#111A2E] text-xs font-bold text-slate-600 dark:text-[#bbc9ca] hover:bg-slate-200 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#00c2cb] hover:bg-[#45dee7] text-slate-950 font-bold text-xs shadow-md shadow-[#00c2cb]/20 cursor-pointer active:scale-95"
                >
                  حفظ الفاتورة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* RECEIPT PRINT MODAL (THERMAL 80MM) */}
      {/* ========================================================================= */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 border border-slate-300 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4 font-mono animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-2 text-xs font-sans">
              <span className="font-bold text-slate-700">معاينة إيصال سداد نقدي (Thermal 80mm)</span>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="text-slate-400 hover:text-slate-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-bold text-sm">عيادات سولي التخصصية</h3>
              <p className="text-[11px] text-slate-500">{CLINIC_INFO.doctorName} - باطنة وقلب</p>
              <p className="text-[10px] text-slate-400">14 شارع جامعة الدول العربية - المهندسين</p>
            </div>

            <div className="border-t border-b border-dashed border-slate-300 py-2.5 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">رقم الإيصال:</span>
                <span className="font-bold">{selectedReceipt.receiptNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">التاريخ والوقت:</span>
                <span>{selectedReceipt.time}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">المريض:</span>
                <span className="font-bold">{selectedReceipt.patientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">الخدمة:</span>
                <span>{selectedReceipt.serviceName || selectedReceipt.description}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">طريقة الدفع:</span>
                <span>{selectedReceipt.method}</span>
              </div>
              <div className="flex justify-between text-sm font-bold pt-1 border-t border-slate-200">
                <span>المبلغ المسدد:</span>
                <span className="text-emerald-700">{selectedReceipt.amount} ج.م</span>
              </div>
            </div>

            <div className="text-center text-[10px] text-slate-400 space-y-1">
              <p>شكراً لزيارتكم - نتمنى لكم دوام الصحة والعافية</p>
              <p className="font-sans">للاستفسارات وحجز المتابعات: 01092847162</p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setSelectedReceipt(null)}
                className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold font-sans cursor-pointer hover:bg-slate-200"
              >
                إغلاق
              </button>
              <button
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
                هل أنت متأكد من حذف الفاتورة <strong className="text-slate-800 dark:text-white">({txToDelete.receiptNo})</strong> بمبلغ <strong className="text-[#008f97] dark:text-[#00c2cb] font-mono">{txToDelete.amount} ج.م</strong> لـ ({txToDelete.patientName})؟
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setTxToDelete(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-[#18233C] text-slate-700 dark:text-[#dde2f5] text-xs font-bold transition-all cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteTransaction && txToDelete) {
                    onDeleteTransaction(txToDelete.id);
                    setToast(`تم حذف الفاتورة ${txToDelete.receiptNo} بنجاح`);
                    setTimeout(() => setToast(null), 3000);
                    setTxToDelete(null);
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
              >
                تأكيد الحذف
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
                هل أنت متأكد من حذف مصروف <strong className="text-slate-800 dark:text-white">({expenseToDelete.category})</strong> بمبلغ <strong className="text-rose-600 dark:text-[#ef4444] font-mono">{expenseToDelete.amount} ج.م</strong>؟
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setExpenseToDelete(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-[#18233C] text-slate-700 dark:text-[#dde2f5] text-xs font-bold transition-all cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => {
                  const updated = removeClinicExpense(expenseToDelete.id);
                  setExpenses(updated);
                  setToast(`تم حذف مصروف ${expenseToDelete.category} بنجاح`);
                  setTimeout(() => setToast(null), 3000);
                  setExpenseToDelete(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
              >
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

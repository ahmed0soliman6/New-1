import React, { useState, useMemo } from 'react';
import { ScreenType, AppointmentListItem, QueueItem, TransactionRecord, PatientListItem } from '../../types';
import { Visit } from '../../types/database';
import { FollowUpItem } from './AppointmentsScreen';
import { usePermissions } from '../../context/AuthContext';
import { usePrescriptionDoctor } from '../../utils/prescriptionDoctor';
import { loadMedicalServices, MedicalServiceItem } from '../../utils/financeManager';
import { ClinicAlertPayload } from '../../utils/alertManager';

interface DashboardScreenProps {
  onNavigate: (screen: ScreenType) => void;
  appointments: AppointmentListItem[];
  queue: QueueItem[];
  visits?: Visit[];
  transactions?: TransactionRecord[];
  followUps?: FollowUpItem[];
  recentAlerts?: ClinicAlertPayload[];
  doctorStatus?: 'available' | 'break';
  activeExamPatientName?: string;
  onConfirmCheckIn: (appointment: AppointmentListItem, fee: number, method: string) => void;
  onCallPatient: (ticket: string, name: string) => void;
  onSelectPatient?: (patient: PatientListItem | null) => void;
  onStartIntakeFromAppointment?: (appointment: AppointmentListItem) => void;
  patients?: PatientListItem[];
  onAddTransaction?: (tx: TransactionRecord) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  onNavigate,
  appointments = [],
  queue = [],
  visits = [],
  transactions = [],
  followUps = [],
  recentAlerts = [],
  doctorStatus = 'available',
  activeExamPatientName,
  onConfirmCheckIn,
  onCallPatient,
  onSelectPatient,
  onStartIntakeFromAppointment,
  patients = [],
  onAddTransaction,
}) => {
  const { canAccess } = usePermissions();
  const doctorInfo = usePrescriptionDoctor();

  const [dashboardTimeframe, setDashboardTimeframe] = useState<'today' | 'week' | 'month' | 'all'>('today');
  const [activeMainTab, setActiveMainTab] = useState<'appointments' | 'followups'>('appointments');
  const [appointmentFilter, setAppointmentFilter] = useState<'all' | 'scheduled' | 'arrived' | 'cancelled'>('all');
  const [selectedPayMethod, setSelectedPayMethod] = useState<'cash' | 'card' | 'instapay'>('cash');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [checkInNotice, setCheckInNotice] = useState<string | null>(null);

  // New Clinical Alerts Hub Card Tab State
  const [activeAlertsCardTab, setActiveAlertsCardTab] = useState<'queue' | 'alerts' | 'followups'>('queue');
  const [dashboardWhatsappToast, setDashboardWhatsappToast] = useState<string | null>(null);

  // Urgent upcoming follow-ups: strictly less than 3 days (< 3 days: 0, 1, 2 days remaining) sorted in order
  const dashboardUrgentFollowUps = useMemo(() => {
    return (followUps || [])
      .filter((f) => f.daysRemaining >= 0 && f.daysRemaining < 3)
      .sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [followUps]);

  const handleDashboardSendWhatsapp = (phone: string, patientName: string, dueDate?: string) => {
    const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
    const formattedPhone = cleanPhone.startsWith('0') ? `2${cleanPhone}` : cleanPhone;
    const dateText = dueDate || 'الأيام القادمة';

    const message = `مرحباً بحضرتك أستاذ/ة *${patientName}* 🌸
نود تذكيركم بموعد المتابعة والاستشارة الطبية المحدد لكم في *عيادة ${doctorInfo.doctorName}* 🩺
🗓 موعد المتابعة: *${dateText}*
📍 التخصص: *${doctorInfo.specialtyAr}*
مع تمنياتنا لكم بدوام الصحة والعافية ✨`;

    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
    try {
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    } catch {
      // Fallback
    }

    setDashboardWhatsappToast(`تم تجهيز رسالة تذكير الواتساب وإرسالها لـ (${patientName})`);
    setTimeout(() => setDashboardWhatsappToast(null), 4000);
  };

  // Quick Invoice Modal State
  const [showQuickInvoiceModal, setShowQuickInvoiceModal] = useState(false);
  const [invPatientName, setInvPatientName] = useState('');
  const [invSelectedService, setInvSelectedService] = useState('كشف واستشارة طبية');
  const [invAmount, setInvAmount] = useState<number>(300);
  const [invDiscount, setInvDiscount] = useState<number>(0);
  const [invPaymentMethod, setInvPaymentMethod] = useState<'نقدي' | 'فيزا / كارت' | 'إنستاباي'>('نقدي');
  const [invStatus, setInvStatus] = useState<'مدفوعة' | 'غير مدفوعة'>('مدفوعة');
  const [invIsSubmitting, setInvIsSubmitting] = useState(false);

  // Medical services list for quick invoice
  const medicalServices = useMemo(() => {
    return loadMedicalServices();
  }, []);

  // Revenue Chart / Indicator State
  const [revIndicatorMode, setRevIndicatorMode] = useState<'weekly' | 'monthly'>('weekly');
  const [selectedWeekOffset, setSelectedWeekOffset] = useState<number>(0); // 0 = current week, 1 = prev week, etc.
  const [selectedYearMonth, setSelectedYearMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Calculate Revenue Data for Weekly Indicator
  const weeklyRevenueData = useMemo(() => {
    // Current week starting from Saturday (standard in Egypt) or Sunday
    const now = new Date();
    // Offset by selectedWeekOffset
    now.setDate(now.getDate() - selectedWeekOffset * 7);

    // Get Saturday of this week
    const currentDay = now.getDay(); // 0 is Sunday, 6 is Saturday
    // Distance from Saturday (6): Saturday is 0, Sunday is 1, Monday is 2, etc.
    const distanceToSaturday = (currentDay + 1) % 7;
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - distanceToSaturday);
    startOfWeek.setHours(0, 0, 0, 0);

    const daysMap = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
    const daysData = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      const ymd = d.toISOString().split('T')[0];

      // Sum transactions for this day
      const dayTotal = transactions
        .filter((t) => {
          if (t.type === 'out') return false;
          const tDate = t.date ? (t.date.includes('T') ? t.date.split('T')[0] : t.date) : (t.timestamp ? t.timestamp.split('T')[0] : '');
          return tDate === ymd;
        })
        .reduce((sum, t) => sum + (t.paidAmount ?? t.amount ?? 0), 0);

      const isToday = ymd === new Date().toISOString().split('T')[0];

      daysData.push({
        label: daysMap[i],
        date: ymd,
        amount: dayTotal,
        isToday,
      });
    }

    const totalWeek = daysData.reduce((sum, d) => sum + d.amount, 0);
    const maxDay = Math.max(...daysData.map((d) => d.amount), 500);

    const startDateLabel = `${startOfWeek.getDate()}/${startOfWeek.getMonth() + 1}`;
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    const endDateLabel = `${endOfWeek.getDate()}/${endOfWeek.getMonth() + 1}`;

    return {
      daysData,
      totalWeek,
      maxDay,
      periodTitle: `${startDateLabel} - ${endDateLabel}`,
    };
  }, [transactions, selectedWeekOffset]);

  // Calculate Revenue Data for Monthly Indicator
  const monthlyRevenueData = useMemo(() => {
    const [yearStr, monthStr] = selectedYearMonth.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10); // 1-12

    const daysInMonth = new Date(year, month, 0).getDate();
    // Group into 4 weeks of the month
    const weeks = [
      { label: 'الأسبوع 1 (1-7)', start: 1, end: 7, amount: 0 },
      { label: 'الأسبوع 2 (8-14)', start: 8, end: 14, amount: 0 },
      { label: 'الأسبوع 3 (15-21)', start: 15, end: 21, amount: 0 },
      { label: `الأسبوع 4 (22-${daysInMonth})`, start: 22, end: daysInMonth, amount: 0 },
    ];

    let totalMonth = 0;

    transactions
      .filter((t) => t.type !== 'out')
      .forEach((t) => {
        const tDate = t.date ? (t.date.includes('T') ? t.date.split('T')[0] : t.date) : (t.timestamp ? t.timestamp.split('T')[0] : '');
        if (!tDate) return;
        const [ty, tm, td] = tDate.split('-').map(Number);
        if (ty === year && tm === month) {
          const val = t.paidAmount ?? t.amount ?? 0;
          totalMonth += val;
          weeks.forEach((w) => {
            if (td >= w.start && td <= w.end) {
              w.amount += val;
            }
          });
        }
      });

    const maxWeek = Math.max(...weeks.map((w) => w.amount), 1000);

    const monthNamesAr = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];
    const monthName = monthNamesAr[month - 1] || '';

    return {
      weeks,
      totalMonth,
      maxWeek,
      monthName: `${monthName} ${year}`,
    };
  }, [transactions, selectedYearMonth]);

  // Quick invoice submission
  const handleQuickInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invPatientName.trim()) {
      alert('يرجى كتابة أو اختيار اسم المريض');
      return;
    }
    if (invAmount <= 0) {
      alert('يرجى تحديد قيمة الفاتورة');
      return;
    }

    setInvIsSubmitting(true);
    try {
      const finalPaid = invStatus === 'مدفوعة' ? Math.max(0, invAmount - invDiscount) : 0;
      const receiptNo = `INV-${Math.floor(Math.random() * 9000) + 1000}`;
      const now = new Date();

      const newTx: TransactionRecord = {
        id: `inv-${Date.now()}`,
        receiptNo,
        patientName: invPatientName.trim(),
        serviceName: invSelectedService,
        description: `${invSelectedService}${invDiscount > 0 ? ` (خصم ${invDiscount} ج.م)` : ''}`,
        totalAmount: invAmount,
        discountAmount: invDiscount,
        paidAmount: finalPaid,
        amount: finalPaid > 0 ? finalPaid : invAmount,
        type: 'in',
        method: invPaymentMethod,
        paymentMethod: invPaymentMethod,
        status: invStatus,
        time: now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
        date: now.toISOString().split('T')[0],
        timestamp: now.toISOString(),
        category: 'خدمات طبية',
      };

      if (onAddTransaction) {
        onAddTransaction(newTx);
      }

      setShowQuickInvoiceModal(false);
      setInvPatientName('');
      setInvDiscount(0);
      setInvStatus('مدفوعة');
      setCheckInNotice(`تم إنشاء وحفظ الفاتورة (${receiptNo}) بنجاح للمريض (${newTx.patientName}) بمبلغ ${finalPaid} ج.م ومزامنتها سحابياً`);
      setTimeout(() => setCheckInNotice(null), 5000);
    } catch (err) {
      alert('حدث خطأ أثناء حفظ الفاتورة');
    } finally {
      setInvIsSubmitting(false);
    }
  };

  // Time Greeting (Morning / Evening)
  const greetingText = useMemo(() => {
    const hour = new Date().getHours();
    return hour >= 5 && hour < 13 ? 'صباح الخير' : 'مساء الخير';
  }, []);

  // Formatted today Arabic date
  const todayArabicDate = useMemo(() => {
    return new Date().toLocaleDateString('ar-EG', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, []);

  // Timeframe date filtering helper
  const isInTimeframe = (dateStr?: string) => {
    if (dashboardTimeframe === 'all') return true;
    if (!dateStr) return true;

    const targetDate = new Date(dateStr);
    if (isNaN(targetDate.getTime())) return true;

    const now = new Date();
    const targetYmd = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const nowYmd = now.toISOString().split('T')[0];

    if (dashboardTimeframe === 'today') {
      return targetYmd === nowYmd;
    }

    if (dashboardTimeframe === 'week') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      return targetDate >= oneWeekAgo && targetDate <= now;
    }

    if (dashboardTimeframe === 'month') {
      const oneMonthAgo = new Date();
      oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
      return targetDate >= oneMonthAgo && targetDate <= now;
    }

    return true;
  };

  // =========================================================================
  // REAL SYSTEM METRICS (100% SOURCED FROM CANONICAL ARRAYS)
  // =========================================================================
  const liveStats = useMemo(() => {
    // 1. Actual registered visits in this period
    const periodVisits = visits.filter((v) => isInTimeframe(v.createdAt));
    const actualVisitsCount = periodVisits.length;

    // 2. Scheduled appointments in this period
    const periodAppointments = appointments.filter((a) => {
      if (a.date && !isInTimeframe(a.date)) return false;
      return true;
    });
    const scheduledOnlyCount = periodAppointments.filter(
      (a) => a.status === 'مجدول' || a.status === 'بانتظار التأكيد'
    ).length;

    // 3. Completed visits in this period
    const completedVisitsCount = periodVisits.filter(
      (v) => v.status === 'COMPLETED' || v.status === 'IN_PROGRESS'
    ).length;

    // 4. Live Cash Drawer Revenue in this period
    const periodTransactions = transactions.filter((t) => {
      if (t.type === 'out') return false;
      return isInTimeframe(t.date || t.timestamp);
    });
    const totalRevenue = periodTransactions.reduce(
      (sum, t) => sum + (t.paidAmount ?? t.amount ?? 0),
      0
    );

    // 5. Waiting Queue average wait time
    const avgWaitMinutes =
      queue.length > 0
        ? Math.round(
            queue.reduce((sum, q) => sum + (q.elapsedMinutes || 1), 0) / queue.length
          )
        : 0;

    // 6. Upcoming follow-ups
    const totalFollowUpsCount = followUps.length;

    const labelMap = {
      today: 'اليوم',
      week: 'هذا الأسبوع',
      month: 'هذا الشهر',
      all: 'الإجمالي العام',
    };

    return {
      periodLabel: labelMap[dashboardTimeframe],
      actualVisitsCount,
      scheduledOnlyCount,
      completedVisitsCount,
      totalFollowUpsCount,
      liveWaitingCount: queue.length,
      avgWaitMinutes,
      revenueFormatted: totalRevenue.toLocaleString('en-US'),
      totalRevenue,
    };
  }, [visits, appointments, transactions, queue, followUps, dashboardTimeframe]);

  // =========================================================================
  // APPOINTMENTS FILTERING & INTERACTION
  // =========================================================================
  const filteredAppointments = useMemo(() => {
    return appointments.filter((app) => {
      if (!app) return false;

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const pName = (app.patientName || '').toLowerCase();
        const pPhone = app.phone || '';
        const pCode = (app.medicalCode || '').toLowerCase();
        if (!pName.includes(q) && !pPhone.includes(q) && !pCode.includes(q)) {
          return false;
        }
      }

      // Status filter
      if (appointmentFilter === 'scheduled') {
        return app.status === 'مجدول' || app.status === 'بانتظار التأكيد';
      }
      if (appointmentFilter === 'arrived') {
        return (
          app.status === 'فى الانتظار حضر المريض' ||
          app.status === 'حضر وسدد' ||
          app.status === 'في الانتظار'
        );
      }
      if (appointmentFilter === 'cancelled') {
        return app.status === 'ملغى' || app.status === 'ملغي';
      }

      return true;
    });
  }, [appointments, searchQuery, appointmentFilter]);

  // Status counters for chips
  const appointmentCounts = useMemo(() => {
    let scheduled = 0;
    let arrived = 0;
    let cancelled = 0;

    appointments.forEach((app) => {
      if (app.status === 'مجدول' || app.status === 'بانتظار التأكيد') {
        scheduled++;
      } else if (
        app.status === 'فى الانتظار حضر المريض' ||
        app.status === 'حضر وسدد' ||
        app.status === 'في الانتظار'
      ) {
        arrived++;
      } else if (app.status === 'ملغى' || app.status === 'ملغي') {
        cancelled++;
      }
    });

    return {
      all: appointments.length,
      scheduled,
      arrived,
      cancelled,
    };
  }, [appointments]);

  // Filtered follow-ups
  const filteredFollowUps = useMemo(() => {
    return followUps.filter((fu) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const pName = (fu.patientName || '').toLowerCase();
      const pPhone = fu.phone || '';
      const pDiag = (fu.diagnosis || '').toLowerCase();
      return pName.includes(q) || pPhone.includes(q) || pDiag.includes(q);
    });
  }, [followUps, searchQuery]);

  // Next scheduled appointment awaiting check-in
  const targetCheckIn = useMemo(() => {
    return (
      appointments.find(
        (a) => a.status === 'مجدول' || a.status === 'بانتظار التأكيد'
      ) || null
    );
  }, [appointments]);

  // Execute check-in
  const handleAppCheckIn = (app: AppointmentListItem) => {
    const payMethodName =
      selectedPayMethod === 'cash'
        ? 'نقدي'
        : selectedPayMethod === 'card'
        ? 'فيزا / كارت'
        : 'إنستاباي';

    onConfirmCheckIn(app, app.expectedFee || 0, payMethodName);
    setCheckInNotice(
      `تم تأكيد حضور المريض (${app.patientName}) وتحويله لصالة الانتظار وتوريد ${app.expectedFee || 0} ج.م للدرج.`
    );
    setTimeout(() => setCheckInNotice(null), 5000);
  };

  return (
    <div className="flex flex-col w-full pb-12 space-y-6 text-slate-800 dark:text-[#dde2f5]">
      {/* Dynamic Toast Notice */}
      {checkInNotice && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-500/50 text-emerald-800 dark:text-emerald-300 px-4 py-3 rounded-2xl flex items-center justify-between shadow-md animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5 font-bold text-xs sm:text-sm">
            <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-xl">
              check_circle
            </span>
            <span>{checkInNotice}</span>
          </div>
          <button
            onClick={() => setCheckInNotice(null)}
            className="text-xs text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer font-bold px-2 py-1"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* =========================================================================
          1. TOP WELCOME DOCTOR CARD (NAME & SPECIALTY ONLY - NO CLINIC LOGO)
         ========================================================================= */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-slate-900 via-[#0c172e] to-[#08101f] text-white p-4 sm:p-5 shadow-xl border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {/* Decorative Background Accent */}
        <div className="absolute top-0 left-0 -mt-8 -ml-8 w-48 h-48 bg-[#00c2cb]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 -mb-8 -mr-8 w-48 h-48 bg-[#8B5CF6]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Doctor Identity & Information */}
        <div className="flex items-center gap-3 z-10 min-w-0 w-full">
          <div className="space-y-1 min-w-0 flex-1">
            <h1 className="text-lg sm:text-2xl font-black text-white tracking-tight flex items-center gap-2 truncate">
              <span className="truncate">{doctorInfo.doctorName}</span>
              <span
                className="material-symbols-outlined text-teal-400 text-base sm:text-xl shrink-0"
                title="طبيب معتمد"
              >
                verified
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-[#00c2cb] font-bold truncate">
              {doctorInfo.specialtyAr}
            </p>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 font-medium z-10">
            <span className="flex items-center gap-1 shrink-0 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
              <span className="material-symbols-outlined text-sm text-[#00c2cb]">
                calendar_today
              </span>
              <span>{todayArabicDate}</span>
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          QUICK NAVIGATION & ACTION CARDS (SEPARATED FROM DOCTOR PROFILE)
         ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: New Visit (Reception) */}
        <button
          onClick={() => onNavigate('new-visit')}
          className="group text-right p-4 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 hover:border-[#00c2cb] dark:hover:border-[#00c2cb] shadow-sm hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden"
        >
          <div className="flex items-center justify-between w-full">
            <div className="w-10 h-10 rounded-xl bg-[#00c2cb]/15 text-[#00c2cb] group-hover:bg-[#00c2cb] group-hover:text-slate-950 flex items-center justify-center transition-colors">
              <span className="material-symbols-outlined text-2xl">person_add</span>
            </div>
            <span className="material-symbols-outlined text-slate-400 group-hover:text-[#00c2cb] text-lg transition-transform group-hover:-translate-x-1">
              arrow_back
            </span>
          </div>
          <div className="mt-3">
            <h3 className="text-sm font-black text-slate-900 dark:text-white group-hover:text-[#00c2cb] transition-colors">
              كشف جديد (استقبال)
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 line-clamp-1">
              تسجيل مريض جديد أو إضافته لطابور الانتظار
            </p>
          </div>
        </button>

        {/* Card 2: Book Appointment */}
        <button
          onClick={() => onNavigate('appointments')}
          className="group text-right p-4 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 hover:border-purple-500 dark:hover:border-purple-400 shadow-sm hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden"
        >
          <div className="flex items-center justify-between w-full">
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 group-hover:bg-purple-600 group-hover:text-white flex items-center justify-center transition-colors">
              <span className="material-symbols-outlined text-2xl">calendar_month</span>
            </div>
            <span className="material-symbols-outlined text-slate-400 group-hover:text-purple-500 text-lg transition-transform group-hover:-translate-x-1">
              arrow_back
            </span>
          </div>
          <div className="mt-3">
            <h3 className="text-sm font-black text-slate-900 dark:text-white group-hover:text-purple-500 transition-colors">
              حجز موعد
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 line-clamp-1">
              جدولة الحجوزات والمتابعات وتنظيم المواعيد
            </p>
          </div>
        </button>

        {/* Card 3: Clinical Examination Room */}
        {canAccess('clinical-exam') ? (
          <button
            onClick={() => onNavigate('clinical-exam')}
            className="group text-right p-4 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 hover:border-emerald-500 dark:hover:border-emerald-400 shadow-sm hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden"
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white flex items-center justify-center transition-colors">
                <span className="material-symbols-outlined text-2xl">stethoscope</span>
              </div>
              <span className="material-symbols-outlined text-slate-400 group-hover:text-emerald-500 text-lg transition-transform group-hover:-translate-x-1">
                arrow_back
              </span>
            </div>
            <div className="mt-3">
              <h3 className="text-sm font-black text-slate-900 dark:text-white group-hover:text-emerald-500 transition-colors">
                غرفة الكشف
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 line-clamp-1">
                فحص المريض الحالي، التشخيص، وكتابة الروشتة
              </p>
            </div>
          </button>
        ) : (
          <button
            onClick={() => onNavigate('waiting-queue')}
            className="group text-right p-4 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 hover:border-amber-500 dark:hover:border-amber-400 shadow-sm hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden"
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 group-hover:bg-amber-600 group-hover:text-white flex items-center justify-center transition-colors">
                <span className="material-symbols-outlined text-2xl">groups</span>
              </div>
              <span className="material-symbols-outlined text-slate-400 group-hover:text-amber-500 text-lg transition-transform group-hover:-translate-x-1">
                arrow_back
              </span>
            </div>
            <div className="mt-3">
              <h3 className="text-sm font-black text-slate-900 dark:text-white group-hover:text-amber-500 transition-colors">
                صالة الانتظار
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 line-clamp-1">
                متابعة طابور المرضى والنداء الآلي
              </p>
            </div>
          </button>
        )}

        {/* Card 4: Quick Exam Invoice Modal (add_circle) */}
        <button
          onClick={() => setShowQuickInvoiceModal(true)}
          className="group text-right p-4 rounded-2xl bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-[#00c2cb]/10 dark:to-emerald-950/20 border-2 border-dashed border-[#00c2cb]/50 hover:border-[#00c2cb] shadow-sm hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden"
        >
          <div className="flex items-center justify-between w-full">
            <div className="w-10 h-10 rounded-xl bg-[#00c2cb] text-slate-950 group-hover:scale-105 flex items-center justify-center shadow-md transition-transform">
              <span className="material-symbols-outlined text-2xl">add_circle</span>
            </div>
            <span className="text-[11px] font-black text-teal-800 dark:text-[#45dee7] bg-[#00c2cb]/20 px-2 py-0.5 rounded-full">
              سريع
            </span>
          </div>
          <div className="mt-3">
            <h3 className="text-sm font-black text-slate-900 dark:text-white group-hover:text-[#00c2cb] transition-colors flex items-center gap-1.5">
              <span>إنشاء فاتورة كشف</span>
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
            </h3>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium mt-0.5 line-clamp-1">
              إصدار فاتورة فوري ومزامنة سحابية للخزينة
            </p>
          </div>
        </button>
      </div>

      {/* Timeframe Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between bg-white dark:bg-[#0f172a] p-3 rounded-2xl border border-slate-200 dark:border-white/10 shadow-xs gap-2.5">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#00c2cb] text-xl">
            insights
          </span>
          <span className="text-xs font-bold text-slate-900 dark:text-white">
            نطاق الإحصائيات الحية:
          </span>
          <span className="text-[11px] text-teal-700 dark:text-[#45dee7] font-bold bg-teal-50 dark:bg-[#00c2cb]/15 px-2 py-0.5 rounded-md">
            {liveStats.periodLabel}
          </span>
        </div>

        <div className="flex items-center bg-slate-100 dark:bg-[#111A2E] p-1 rounded-xl border border-slate-200 dark:border-white/5 overflow-x-auto">
          {[
            { id: 'today', label: 'اليوم' },
            { id: 'week', label: 'هذا الأسبوع' },
            { id: 'month', label: 'هذا الشهر' },
            { id: 'all', label: 'الكل' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setDashboardTimeframe(tab.id as any)}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                dashboardTimeframe === tab.id
                  ? 'bg-[#00c2cb] text-[#08101C] shadow-sm'
                  : 'text-slate-600 dark:text-[#bbc9ca] hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* =========================================================================
          2. CSS SELECTOR 1: TOP 5 KPI SUMMARY GRID (LIVE & ACCURATE STATS - CLICKABLE)
         ========================================================================= */}
      <section className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* KPI 1: Actual Arrived / Registered Visits -> Navigates to waiting-queue / reception */}
        <button
          onClick={() => onNavigate('waiting-queue')}
          className="text-right relative overflow-hidden rounded-2xl bg-white dark:bg-[#0f172a] p-4 shadow-sm dark:shadow-lg border border-slate-200 dark:border-white/10 flex flex-col justify-between hover:border-teal-400 dark:hover:border-teal-500 transition-all cursor-pointer group"
          title="عرض الكشوفات وصالة الانتظار"
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 group-hover:text-[#00c2cb] transition-colors">
              الكشوفات والزيارات ({liveStats.periodLabel})
            </span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-[#00c2cb]/20 text-teal-700 dark:text-[#00c2cb] group-hover:bg-[#00c2cb] group-hover:text-slate-950 flex items-center justify-center font-bold transition-colors">
              <span className="material-symbols-outlined text-lg">how_to_reg</span>
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between w-full">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono">
              {liveStats.actualVisitsCount}
            </div>
            <span className="text-xs text-teal-800 dark:text-[#45dee7] font-bold bg-teal-100/70 dark:bg-[#00c2cb]/20 px-2 py-0.5 rounded-md">
              زيارة مثبتة
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1">
            سجلوا بالاستقبال وكشوفات فعلية
          </p>
        </button>

        {/* KPI 2: Live Waiting Queue -> Navigates to waiting-queue */}
        <button
          onClick={() => onNavigate('waiting-queue')}
          className="text-right relative overflow-hidden rounded-2xl bg-white dark:bg-[#0f172a] p-4 shadow-sm dark:shadow-lg border-2 border-teal-500 dark:border-[#00c2cb] flex flex-col justify-between hover:bg-slate-50 dark:hover:bg-[#1e293b] transition-all cursor-pointer group"
          title="عرض تفاصيل غرفة الانتظار والنداء"
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00c2cb] opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#00c2cb]" />
              </span>
              <span className="text-xs text-teal-800 dark:text-[#45dee7] font-bold">
                في الانتظار الآن
              </span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-[#00c2cb] text-slate-950 flex items-center justify-center font-bold shadow-sm group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-lg">chair</span>
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between w-full">
            <div className="text-2xl sm:text-3xl font-black text-teal-700 dark:text-[#45dee7] font-mono">
              {liveStats.liveWaitingCount}
            </div>
            <span className="text-xs text-teal-800 dark:text-[#45dee7] font-bold">
              {liveStats.liveWaitingCount > 0
                ? `متوسط: ${liveStats.avgWaitMinutes} د`
                : 'متاح للدخول'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1">
            جاهزون لدخول غرفة الكشف
          </p>
        </button>

        {/* KPI 3: Scheduled Appointments -> Navigates to appointments */}
        <button
          onClick={() => onNavigate('appointments')}
          className="text-right relative overflow-hidden rounded-2xl bg-white dark:bg-[#0f172a] p-4 shadow-sm dark:shadow-lg border border-slate-200 dark:border-white/10 flex flex-col justify-between hover:border-purple-400 dark:hover:border-purple-500 transition-all cursor-pointer group"
          title="عرض جدول المواعيد والحجوزات"
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 group-hover:text-purple-400 transition-colors">
              المواعيد المجدولة ({liveStats.periodLabel})
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-[#8B5CF6]/20 text-purple-700 dark:text-[#d0bcff] group-hover:bg-purple-600 group-hover:text-white flex items-center justify-center font-bold transition-colors">
              <span className="material-symbols-outlined text-lg">calendar_month</span>
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between w-full">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono">
              {liveStats.scheduledOnlyCount}
            </div>
            <span className="text-xs text-purple-800 dark:text-[#e9ddff] bg-purple-100 dark:bg-[#8B5CF6]/30 px-2 py-0.5 rounded-md font-bold">
              حجز مسبق
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1">
            بانتظار تسجيل الحضور بالعيادة
          </p>
        </button>

        {/* KPI 4: Upcoming Follow-ups (Doctor Determined) -> Navigates to appointments with follow-ups tab */}
        <button
          onClick={() => {
            setActiveMainTab('followups');
            const targetEl = document.getElementById('dashboard-main-section');
            if (targetEl) targetEl.scrollIntoView({ behavior: 'smooth' });
          }}
          className="text-right relative overflow-hidden rounded-2xl bg-white dark:bg-[#0f172a] p-4 shadow-sm dark:shadow-lg border border-slate-200 dark:border-white/10 flex flex-col justify-between hover:border-sky-400 dark:hover:border-sky-500 transition-all cursor-pointer group"
          title="عرض مواعيد الاستشارات والمتابعات"
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 group-hover:text-sky-400 transition-colors">
              المتابعات القادمة
            </span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-[#38BDF8]/20 text-sky-700 dark:text-[#9dd0ff] group-hover:bg-sky-500 group-hover:text-white flex items-center justify-center font-bold transition-colors">
              <span className="material-symbols-outlined text-lg">event_repeat</span>
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between w-full">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono">
              {liveStats.totalFollowUpsCount}
            </div>
            <span className="text-xs text-sky-800 dark:text-[#9dd0ff] font-bold bg-sky-100 dark:bg-[#0284C7]/30 px-2 py-0.5 rounded-md">
              استشارة دورية
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1">
            حددها الطبيب من الكشوفات السابقة
          </p>
        </button>

        {/* KPI 5: Cash Drawer Revenue -> Navigates to billing-payments */}
        <button
          onClick={() => onNavigate('billing-payments')}
          className="col-span-2 sm:col-span-2 lg:col-span-1 text-right relative overflow-hidden rounded-2xl bg-white dark:bg-[#0f172a] p-4 shadow-sm dark:shadow-xl border border-purple-300 dark:border-[#8B5CF6]/40 flex flex-col justify-between hover:bg-slate-50 dark:hover:bg-[#1e293b] transition-all cursor-pointer group"
          title="عرض سجل الفواتير والمقبوضات بالكامل"
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-bold text-purple-950 dark:text-[#e9ddff] group-hover:text-purple-400 transition-colors">
              إيراد الخزينة ({liveStats.periodLabel})
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#8B5CF6] text-white group-hover:scale-110 flex items-center justify-center font-bold transition-transform">
              <span className="material-symbols-outlined text-lg">payments</span>
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-start gap-1 w-full">
            <div className="text-2xl sm:text-3xl font-black text-teal-700 dark:text-[#45dee7] tracking-tight font-mono">
              {liveStats.revenueFormatted}
            </div>
            <span className="text-sm text-slate-700 dark:text-slate-300 font-bold">ج.م</span>
          </div>
          <div className="mt-1 flex items-center gap-1 text-[11px] text-purple-900 dark:text-[#d0bcff] font-semibold">
            <span className="material-symbols-outlined text-xs">arrow_forward</span>
            <span>انقر لفتح صفحة الفواتير</span>
          </div>
        </button>
      </section>

      {/* =========================================================================
          CLINICAL ALERTS & NOTIFICATION HUB CARD (بطاقة التنبيهات والإشعارات السريرية)
         ========================================================================= */}
      <section className="bg-white dark:bg-[#0f172a] rounded-3xl border border-slate-200 dark:border-white/10 p-4 sm:p-6 shadow-sm dark:shadow-xl space-y-4">
        {/* Card Header & Doctor Status Indicator */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 dark:border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-[#00c2cb]/15 text-[#00c2cb] flex items-center justify-center font-bold shadow-xs">
              <span className="material-symbols-outlined text-2xl animate-pulse">campaign</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  مركز التنبيهات والإشعارات السريرية
                </h2>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00c2cb] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00c2cb]" />
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                متابعة فورية لطابور الانتظار، التنبيهات الإكلينيكية، والمتابعات العاجلة
              </p>
            </div>
          </div>

          {/* Doctor Status Badge */}
          <div className="flex items-center gap-2">
            <div
              className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 text-xs font-bold ${
                doctorStatus === 'available'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400 animate-pulse'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  doctorStatus === 'available' ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
              <span>{doctorStatus === 'available' ? 'الطبيب متاح للكشف' : 'الطبيب في استراحة ☕'}</span>
            </div>
          </div>
        </div>

        {/* 3 Main Action Sub-Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-[#111A2E] p-1.5 rounded-2xl border border-slate-200 dark:border-white/5 overflow-x-auto">
          {/* Tab 1: Waiting Queue */}
          <button
            type="button"
            onClick={() => setActiveAlertsCardTab('queue')}
            className={`flex-1 min-w-[130px] px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeAlertsCardTab === 'queue'
                ? 'bg-[#00c2cb] text-slate-950 shadow-sm font-black'
                : 'text-slate-600 dark:text-[#bbc9ca] hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-base">chair</span>
            <span>مرضى في الانتظار</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-black font-mono ${
                activeAlertsCardTab === 'queue'
                  ? 'bg-slate-950/20 text-slate-950'
                  : 'bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300'
              }`}
            >
              {queue.length}
            </span>
          </button>

          {/* Tab 2: Clinical Alerts & Exam Status */}
          <button
            type="button"
            onClick={() => setActiveAlertsCardTab('alerts')}
            className={`flex-1 min-w-[130px] px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeAlertsCardTab === 'alerts'
                ? 'bg-[#00c2cb] text-slate-950 shadow-sm font-black'
                : 'text-slate-600 dark:text-[#bbc9ca] hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-base">notifications_active</span>
            <span>التنبيهات وحالة الكشف</span>
            {recentAlerts.length > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-black font-mono ${
                  activeAlertsCardTab === 'alerts'
                    ? 'bg-slate-950/20 text-slate-950'
                    : 'bg-teal-500/20 text-teal-700 dark:text-[#45dee7]'
                }`}
              >
                {recentAlerts.length}
              </span>
            )}
          </button>

          {/* Tab 3: Upcoming Follow-ups (< 3 days) */}
          <button
            type="button"
            onClick={() => setActiveAlertsCardTab('followups')}
            className={`flex-1 min-w-[130px] px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeAlertsCardTab === 'followups'
                ? 'bg-[#8B5CF6] text-white shadow-sm font-black'
                : 'text-slate-600 dark:text-[#bbc9ca] hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-base">event_repeat</span>
            <span>المتابعات القادمة (&lt; 3 أيام)</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-black font-mono ${
                activeAlertsCardTab === 'followups'
                  ? 'bg-white/20 text-white'
                  : 'bg-purple-500/20 text-purple-700 dark:text-purple-300'
              }`}
            >
              {dashboardUrgentFollowUps.length}
            </span>
          </button>
        </div>

        {/* Tab 1 Content: Waiting Queue in Order */}
        {activeAlertsCardTab === 'queue' && (
          <div className="space-y-3">
            {queue.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {queue.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                      idx === 0
                        ? 'bg-teal-50/50 dark:bg-[#00c2cb]/10 border-[#00c2cb] shadow-sm'
                        : 'bg-slate-50 dark:bg-[#111A2E] border-slate-200 dark:border-white/10'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl flex flex-col items-center justify-center font-bold shrink-0 ${
                            idx === 0
                              ? 'bg-[#00c2cb] text-slate-950 font-black'
                              : 'bg-slate-200 dark:bg-white/10 text-slate-800 dark:text-slate-200 font-mono text-xs'
                          }`}
                        >
                          <span className="text-[9px] leading-none">#{idx + 1}</span>
                          <span className="text-xs font-black">{item.ticketNumber || '#'}</span>
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                            {item.patientName}
                          </h4>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                            <span className="text-teal-700 dark:text-[#45dee7] font-semibold">
                              {item.visitType || 'كشف'}
                            </span>
                            <span>•</span>
                            <span>منذ {item.elapsedMinutes || 1} د</span>
                          </div>
                        </div>
                      </div>
                      {idx === 0 && (
                        <span className="text-[10px] font-black bg-[#00c2cb] text-slate-950 px-2 py-0.5 rounded-full shrink-0">
                          الدور الحالي
                        </span>
                      )}
                    </div>

                    {item.complaint && (
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-1 bg-white dark:bg-black/40 p-1.5 rounded-lg border border-slate-200/60 dark:border-white/5">
                        <span className="font-bold text-slate-700 dark:text-slate-200">الشكوى: </span>
                        {item.complaint}
                      </p>
                    )}

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => onCallPatient(item.ticketNumber || `#0${idx + 1}`, item.patientName)}
                        className="py-1.5 px-2 rounded-xl bg-white dark:bg-[#18233C] hover:bg-slate-100 dark:hover:bg-[#242f4c] text-teal-800 dark:text-[#45dee7] border border-teal-300 dark:border-[#00c2cb]/30 text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        title="نداء المريض صوتياً وعلى الشاشة"
                      >
                        <span className="material-symbols-outlined text-sm">campaign</span>
                        <span>نداء</span>
                      </button>

                      {canAccess('clinical-exam') && (
                        <button
                          type="button"
                          onClick={() => {
                            const matchingPat = patients.find((p) => p.name === item.patientName) || {
                              id: item.patientId,
                              name: item.patientName,
                              fileNumber: item.fileNumber,
                              medicalCode: item.medicalCode,
                              phone: item.phone,
                              age: item.age,
                              gender: (item.gender === 'female' ? 'female' : 'male') as any,
                              bloodType: item.bloodType,
                              address: item.address,
                              chronicConditions: item.chronicConditions,
                              chiefComplaint: item.complaint,
                              visitsCount: 1,
                            };
                            if (onSelectPatient) {
                              onSelectPatient(matchingPat as any);
                            }
                            onCallPatient(item.ticketNumber || `#0${idx + 1}`, item.patientName);
                            onNavigate('clinical-exam');
                          }}
                          className="py-1.5 px-2 rounded-xl bg-[#00c2cb] hover:bg-[#45dee7] text-slate-950 text-xs font-black flex items-center justify-center gap-1 transition-colors cursor-pointer"
                          title="بدء الكشف ودخول غرفة الطبيب"
                        >
                          <span className="material-symbols-outlined text-sm">stethoscope</span>
                          <span>دخول الكشف</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50 dark:bg-[#111A2E] rounded-2xl border border-slate-200 dark:border-white/5 space-y-2">
                <span className="material-symbols-outlined text-3xl text-slate-400">chair</span>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  لا يوجد مرضى في طابور الانتظار حالياً
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate('new-visit')}
                  className="px-3.5 py-1.5 rounded-xl bg-[#00c2cb] text-slate-950 text-xs font-bold hover:bg-[#45dee7] transition-all cursor-pointer inline-flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">person_add</span>
                  <span>تسجيل كشف جديد (استقبال)</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab 2 Content: Clinical Alerts & Exam Status */}
        {activeAlertsCardTab === 'alerts' && (
          <div className="space-y-3">
            {/* Active Examination Room Status Banner */}
            <div className="p-3 rounded-2xl bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-[#00c2cb]/15 dark:to-emerald-950/20 border border-[#00c2cb]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#00c2cb] text-slate-950 flex items-center justify-center font-bold shrink-0">
                  <span className="material-symbols-outlined text-lg">stethoscope</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      حالة غرفة الكشف لدى الطبيب
                    </h4>
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        doctorStatus === 'available'
                          ? 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                          : 'bg-amber-500/20 text-amber-800 dark:text-amber-300'
                      }`}
                    >
                      {doctorStatus === 'available' ? 'جاهز ومتاح للكشف 🟢' : 'فترة استراحة مؤقتة ☕'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                    {activeExamPatientName
                      ? `المريض قيد الفحص حالياً: (${activeExamPatientName})`
                      : 'الغرفة مستعدة لاستقبال وفحص المريض التالي من طابور الانتظار.'}
                  </p>
                </div>
              </div>

              {canAccess('clinical-exam') && (
                <button
                  type="button"
                  onClick={() => onNavigate('clinical-exam')}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-bold text-xs hover:opacity-90 transition-all cursor-pointer shrink-0 flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">open_in_new</span>
                  <span>فتح غرفة الكشف</span>
                </button>
              )}
            </div>

            {/* Alerts Feed */}
            {recentAlerts.length > 0 ? (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {recentAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-3 rounded-xl border flex items-start justify-between gap-3 ${
                      alert.type === 'finish'
                        ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-500/30'
                        : alert.type === 'call'
                        ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-300 dark:border-amber-500/30'
                        : 'bg-slate-50 dark:bg-[#111A2E] border-slate-200 dark:border-white/10'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold shrink-0 mt-0.5 ${
                          alert.type === 'finish'
                            ? 'bg-emerald-500 text-white'
                            : alert.type === 'call'
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-[#00c2cb] text-slate-950'
                        }`}
                      >
                        <span className="material-symbols-outlined text-base">
                          {alert.type === 'finish'
                            ? 'task_alt'
                            : alert.type === 'call'
                            ? 'campaign'
                            : 'notifications'}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {alert.title}
                          </h4>
                          {alert.ticketNumber && (
                            <span className="text-[10px] font-mono font-bold bg-white dark:bg-black/50 px-1.5 py-0.2 rounded border border-slate-200 dark:border-white/10">
                              {alert.ticketNumber}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                          {alert.message}
                        </p>
                      </div>
                    </div>

                    <span className="text-[10px] text-slate-400 font-mono shrink-0">
                      {alert.timestamp}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center bg-slate-50 dark:bg-[#111A2E] rounded-2xl border border-slate-200 dark:border-white/5 space-y-1">
                <span className="material-symbols-outlined text-2xl text-slate-400">notifications_none</span>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  سجل التنبيهات الإكلينيكية هادئ
                </p>
                <p className="text-[11px] text-slate-400">
                  تظهر هنا تنبيهات انتهاء الكشف واعتماد الروشتات وتغييرات حالة الطبيب فور حدوثها.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab 3 Content: Upcoming Follow-ups (Strictly < 3 days remaining) */}
        {activeAlertsCardTab === 'followups' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-[#111A2E] p-2.5 rounded-xl border border-slate-200 dark:border-white/5">
              <span className="flex items-center gap-1 font-semibold text-purple-700 dark:text-purple-400">
                <span className="material-symbols-outlined text-sm">schedule</span>
                <span>تصفية تلقائية: تعرض فقط من لديه متابعة خلال أقل من 3 أيام (بالترتيب)</span>
              </span>
              <button
                type="button"
                onClick={() => onNavigate('upcoming-followups')}
                className="text-xs font-bold text-[#00c2cb] hover:underline cursor-pointer flex items-center gap-0.5"
              >
                <span>كافة المتابعات</span>
                <span className="material-symbols-outlined text-sm">arrow_left</span>
              </button>
            </div>

            {dashboardUrgentFollowUps.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {dashboardUrgentFollowUps.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#111A2E] border border-purple-200/70 dark:border-purple-500/20 hover:border-purple-400 transition-all flex flex-col justify-between space-y-2.5 shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                          {item.patientName}
                        </h4>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                          كود: {item.patientCode || 'P-00'}
                        </span>
                      </div>

                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${
                          item.daysRemaining === 0
                            ? 'bg-rose-500 text-white animate-pulse'
                            : item.daysRemaining === 1
                            ? 'bg-amber-500 text-slate-950 font-black'
                            : 'bg-purple-100 dark:bg-purple-500/20 text-purple-800 dark:text-purple-300'
                        }`}
                      >
                        {item.daysRemaining === 0
                          ? 'اليوم ⚠️'
                          : item.daysRemaining === 1
                          ? 'غداً ⏰'
                          : 'متبقي يومين 🗓️'}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-600 dark:text-slate-300 space-y-0.5 bg-white dark:bg-black/30 p-2 rounded-xl border border-slate-200/60 dark:border-white/5">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">تاريخ المتابعة:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 font-mono" dir="ltr">
                          {item.dueDate}
                        </span>
                      </div>
                      {item.diagnosis && (
                        <div className="truncate">
                          <span className="text-slate-400">التشخيص: </span>
                          <span>{item.diagnosis}</span>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDashboardSendWhatsapp(item.phone, item.patientName, item.dueDate)}
                      className="w-full py-1.5 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                      title="إرسال تذكير المتابعة عبر واتساب"
                    >
                      <span className="material-symbols-outlined text-sm">chat</span>
                      <span>إرسال تذكير واتساب 💬</span>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center bg-slate-50 dark:bg-[#111A2E] rounded-2xl border border-slate-200 dark:border-white/5 space-y-1">
                <span className="material-symbols-outlined text-2xl text-emerald-500">task_alt</span>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  لا توجد متابعات عاجلة خلال الـ 3 أيام القادمة (أقل من 3 أيام)
                </p>
                <p className="text-[11px] text-slate-400">
                  جميع المتابعات المجدولة تقع في مواعيد أبعد أو مسجلة بالكامل.
                </p>
              </div>
            )}
          </div>
        )}
      </section>

      {/* =========================================================================
          4. REVENUE INDICATOR & PERFORMANCE CARD (WEEKLY / MONTHLY)
         ========================================================================= */}
      <div className="rounded-3xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 p-5 sm:p-6 shadow-sm dark:shadow-xl flex flex-col space-y-5">
        {/* Header with Mode Switcher & Date Picker & Jump to Billing Button */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#00c2cb]/15 text-[#00c2cb] flex items-center justify-center font-bold shadow-xs">
              <span className="material-symbols-outlined text-2xl">trending_up</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  مؤشر الإيرادات والتحصيلات
                </h3>
                <span className="text-[10px] font-black bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  مزامنة حية
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                تحليل حركة الإيرادات أسبوعياً وشهرياً من واقع الفواتير المسددة
              </p>
            </div>
          </div>

          {/* Controls: Mode Switcher, Date Chooser, and Direct Billing Screen Button */}
          <div className="flex items-center gap-2.5 flex-wrap self-stretch sm:self-auto">
            {/* Mode: Weekly / Monthly */}
            <div className="flex items-center bg-slate-100 dark:bg-[#111A2E] p-1 rounded-xl border border-slate-200 dark:border-white/5 text-xs font-bold">
              <button
                onClick={() => setRevIndicatorMode('weekly')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  revIndicatorMode === 'weekly'
                    ? 'bg-[#00c2cb] text-slate-950 font-black shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                أسبوعي
              </button>
              <button
                onClick={() => setRevIndicatorMode('monthly')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  revIndicatorMode === 'monthly'
                    ? 'bg-[#00c2cb] text-slate-950 font-black shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                شهري
              </button>
            </div>

            {/* Date/Period Selector */}
            {revIndicatorMode === 'weekly' ? (
              <div className="flex items-center bg-slate-100 dark:bg-[#111A2E] px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-white/5 text-xs font-bold text-slate-700 dark:text-slate-200">
                <button
                  onClick={() => setSelectedWeekOffset((prev) => prev + 1)}
                  title="الأسبوع السابق"
                  className="p-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">chevron_right</span>
                </button>
                <span className="px-2 font-mono">{weeklyRevenueData.periodTitle}</span>
                <button
                  onClick={() => setSelectedWeekOffset((prev) => Math.max(0, prev - 1))}
                  disabled={selectedWeekOffset === 0}
                  title="الأسبوع التالي"
                  className={`p-1 rounded-lg transition-colors ${
                    selectedWeekOffset === 0
                      ? 'opacity-30 cursor-not-allowed'
                      : 'hover:bg-slate-200 dark:hover:bg-white/10 cursor-pointer'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">chevron_left</span>
                </button>
                {selectedWeekOffset > 0 && (
                  <button
                    onClick={() => setSelectedWeekOffset(0)}
                    className="mr-1 text-[10px] text-teal-700 dark:text-[#45dee7] hover:underline cursor-pointer font-black"
                  >
                    هذا الأسبوع
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center bg-slate-100 dark:bg-[#111A2E] px-2 py-1 rounded-xl border border-slate-200 dark:border-white/5">
                <span className="material-symbols-outlined text-slate-400 text-sm ml-1">calendar_month</span>
                <input
                  type="month"
                  value={selectedYearMonth}
                  onChange={(e) => setSelectedYearMonth(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-800 dark:text-white focus:outline-none cursor-pointer"
                />
              </div>
            )}

            {/* Requested Small Button to Navigate to Billing & Payments */}
            <button
              onClick={() => onNavigate('billing-payments')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600/15 hover:bg-purple-600 text-purple-700 hover:text-white dark:text-purple-300 dark:hover:text-white font-bold text-xs transition-all cursor-pointer border border-purple-500/30"
              title="الانتقال إلى صفحة الفواتير والمدفوعات"
            >
              <span className="material-symbols-outlined text-base">receipt_long</span>
              <span>صفحة الفواتير والمدفوعات</span>
              <span className="material-symbols-outlined text-xs">arrow_back</span>
            </button>
          </div>
        </div>

        {/* Visual Revenue Bars / Chart */}
        {revIndicatorMode === 'weekly' ? (
          <div>
            <div className="flex items-baseline justify-between mb-4">
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">إجمالي إيرادات الأسبوع:</span>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono mt-0.5">
                  {weeklyRevenueData.totalWeek.toLocaleString('en-US')}{' '}
                  <span className="text-sm font-bold text-[#00c2cb]">ج.م</span>
                </div>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                نطاق الأسبوع: {weeklyRevenueData.periodTitle}
              </span>
            </div>

            {/* Daily Bars */}
            <div className="grid grid-cols-7 gap-2 sm:gap-4 pt-4 border-t border-slate-100 dark:border-white/5 items-end h-44 sm:h-52">
              {weeklyRevenueData.daysData.map((d, idx) => {
                const heightPct = weeklyRevenueData.maxDay > 0
                  ? Math.max(8, Math.round((d.amount / weeklyRevenueData.maxDay) * 100))
                  : 8;

                return (
                  <div key={idx} className="flex flex-col items-center h-full justify-end group">
                    <span className="text-[10px] sm:text-xs font-mono font-bold text-slate-700 dark:text-slate-300 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {d.amount > 0 ? `${d.amount} ج.م` : '0'}
                    </span>
                    <div className="w-full max-w-[42px] bg-slate-100 dark:bg-white/5 rounded-t-xl overflow-hidden flex flex-col justify-end p-0.5 h-32 sm:h-36">
                      <div
                        style={{ height: `${heightPct}%` }}
                        className={`w-full rounded-t-lg transition-all duration-500 flex items-center justify-center ${
                          d.isToday
                            ? 'bg-gradient-to-t from-teal-500 to-[#00c2cb] shadow-md shadow-[#00c2cb]/30'
                            : d.amount > 0
                            ? 'bg-gradient-to-t from-purple-600 to-indigo-500'
                            : 'bg-slate-200 dark:bg-white/10'
                        }`}
                      />
                    </div>
                    <span className={`text-[11px] sm:text-xs font-bold mt-2 truncate ${
                      d.isToday ? 'text-[#00c2cb] font-black' : 'text-slate-600 dark:text-slate-400'
                    }`}>
                      {d.label}
                    </span>
                    <span className="text-[9px] font-mono text-slate-400">
                      {d.date.split('-')[2]}/{d.date.split('-')[1]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-baseline justify-between mb-4">
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">إجمالي إيرادات الشهر:</span>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono mt-0.5">
                  {monthlyRevenueData.totalMonth.toLocaleString('en-US')}{' '}
                  <span className="text-sm font-bold text-[#00c2cb]">ج.م</span>
                </div>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                شهر: {monthlyRevenueData.monthName}
              </span>
            </div>

            {/* Weekly Bars for Selected Month */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 pt-4 border-t border-slate-100 dark:border-white/5 items-end h-44 sm:h-52">
              {monthlyRevenueData.weeks.map((w, idx) => {
                const heightPct = monthlyRevenueData.maxWeek > 0
                  ? Math.max(10, Math.round((w.amount / monthlyRevenueData.maxWeek) * 100))
                  : 10;

                return (
                  <div key={idx} className="flex flex-col items-center h-full justify-end group">
                    <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {w.amount.toLocaleString('en-US')} ج.م
                    </span>
                    <div className="w-full bg-slate-100 dark:bg-white/5 rounded-t-2xl overflow-hidden flex flex-col justify-end p-1 h-32 sm:h-36">
                      <div
                        style={{ height: `${heightPct}%` }}
                        className={`w-full rounded-t-xl transition-all duration-500 ${
                          w.amount > 0
                            ? 'bg-gradient-to-t from-teal-500 to-[#00c2cb] shadow-md shadow-[#00c2cb]/20'
                            : 'bg-slate-200 dark:bg-white/10'
                        }`}
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-2">
                      {w.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          5. QUICK INVOICE CREATION MODAL (إنشاء فاتورة كشف سريع)
         ========================================================================= */}
      {showQuickInvoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-[#0f172a] rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden flex flex-col animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 bg-gradient-to-l from-slate-900 via-[#0c172e] to-[#08101f] text-white flex items-center justify-between border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#00c2cb] text-slate-950 flex items-center justify-center font-bold shadow-lg">
                  <span className="material-symbols-outlined text-2xl">add_circle</span>
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black">إنشاء فاتورة كشف سريعة</h3>
                  <p className="text-xs text-slate-300 font-medium">
                    إصدار فوري بدون الحاجة للدخول إلى شاشة الفواتير
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowQuickInvoiceModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleQuickInvoiceSubmit} className="p-5 sm:p-6 space-y-4">
              {/* Patient Name with Quick Autocomplete from registered patients */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  اسم المريض <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="اكتب اسم المريض أو اختر من المرضى..."
                    value={invPatientName}
                    onChange={(e) => setInvPatientName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-[#111A2E] text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#00c2cb]"
                  />
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg pointer-events-none">
                    person
                  </span>
                </div>
                {/* Suggestions if any patients match */}
                {invPatientName.trim() && (
                  <div className="flex items-center gap-1.5 flex-wrap mt-1.5 max-h-20 overflow-y-auto">
                    {patients
                      .filter((p) => p.name.includes(invPatientName.trim()) && p.name !== invPatientName.trim())
                      .slice(0, 4)
                      .map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setInvPatientName(p.name)}
                          className="text-[10px] bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 hover:bg-[#00c2cb]/20 hover:text-[#00c2cb] px-2 py-0.5 rounded-md font-bold transition-colors cursor-pointer"
                        >
                          {p.name}
                        </button>
                      ))}
                  </div>
                )}
              </div>

              {/* Service Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  نوع الخدمة / الكشف
                </label>
                <select
                  value={invSelectedService}
                  onChange={(e) => {
                    const sName = e.target.value;
                    setInvSelectedService(sName);
                    const sObj = medicalServices.find((s) => s.name === sName);
                    if (sObj) setInvAmount(sObj.price);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-[#111A2E] text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#00c2cb] cursor-pointer"
                >
                  {medicalServices.map((srv) => (
                    <option key={srv.id} value={srv.name}>
                      {srv.name} - ({srv.price} ج.م)
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount & Discount */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    المبلغ الإجمالي (ج.م)
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={invAmount}
                    onChange={(e) => setInvAmount(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-[#111A2E] text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#00c2cb]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    الخصم (إن وجد)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={invAmount}
                    value={invDiscount}
                    onChange={(e) => setInvDiscount(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-[#111A2E] text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#00c2cb]"
                  />
                </div>
              </div>

              {/* Payment Method & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    طريقة الدفع
                  </label>
                  <select
                    value={invPaymentMethod}
                    onChange={(e) => setInvPaymentMethod(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-[#111A2E] text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#00c2cb] cursor-pointer"
                  >
                    <option value="نقدي">نقدي</option>
                    <option value="فيزا / كارت">فيزا / كارت</option>
                    <option value="إنستاباي">إنستاباي</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    حالة الفاتورة
                  </label>
                  <select
                    value={invStatus}
                    onChange={(e) => setInvStatus(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-[#111A2E] text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#00c2cb] cursor-pointer"
                  >
                    <option value="مدفوعة">مدفوعة ومحصلة</option>
                    <option value="غير مدفوعة">غير مدفوعة (آجل)</option>
                  </select>
                </div>
              </div>

              {/* Total Summary Display */}
              <div className="p-3.5 rounded-2xl bg-teal-50 dark:bg-[#00c2cb]/10 border border-teal-200 dark:border-[#00c2cb]/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#00c2cb] text-xl">payments</span>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    الصافي المستحق:
                  </span>
                </div>
                <div className="text-lg font-black text-teal-700 dark:text-[#45dee7] font-mono">
                  {Math.max(0, invAmount - invDiscount)} ج.م
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={invIsSubmitting}
                  className="flex-1 py-3 rounded-xl bg-[#00c2cb] hover:bg-[#45dee7] text-slate-950 font-black text-xs shadow-lg shadow-[#00c2cb]/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-base">check_circle</span>
                  <span>{invIsSubmitting ? 'جاري الحفظ والمزامنة...' : 'حفظ وإصدار الفاتورة'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowQuickInvoiceModal(false)}
                  className="px-4 py-3 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WhatsApp Action Feedback Toast */}
      {dashboardWhatsappToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-700 text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-2xl border border-emerald-400 flex items-center gap-2 animate-in slide-in-from-bottom-4">
          <span className="material-symbols-outlined text-base">chat</span>
          <span>{dashboardWhatsappToast}</span>
        </div>
      )}
    </div>
  );
};

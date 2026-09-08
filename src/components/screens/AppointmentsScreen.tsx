import React, { useState, useMemo } from 'react';
import { AppointmentListItem, ScreenType } from '../../types';
import { usePermissions } from '../../context/AuthContext';

interface FollowUpItem {
  id: string;
  patientName: string;
  phone: string;
  medicalCode: string;
  lastVisitDate: string;
  dueDate: string;
  daysRemaining: number;
  isFreeEligible: boolean;
  diagnosis: string;
  notes?: string;
}

interface AppointmentsScreenProps {
  appointments: AppointmentListItem[];
  followUps?: FollowUpItem[];
  onCheckInPatient: (appointment: AppointmentListItem) => void;
  onOpenNewAppointment?: () => void;
  onAddAppointment?: (appointment: AppointmentListItem) => void;
  onNavigate: (screen: ScreenType) => void;
}

// All statuses requested by the user
export type AppointmentStatusType =
  | 'بانتظار التأكيد'
  | 'مجدول'
  | 'فى الانتظار'
  | 'داخل الكشف'
  | 'اكتمل  الكشف'
  | 'ملغى';

const ALL_STATUSES: AppointmentStatusType[] = [
  'بانتظار التأكيد',
  'مجدول',
  'فى الانتظار',
  'داخل الكشف',
  'اكتمل  الكشف',
  'ملغى',
];

export const AppointmentsScreen: React.FC<AppointmentsScreenProps> = ({
  appointments,
  followUps = [],
  onCheckInPatient,
  onAddAppointment,
  onNavigate,
}) => {
  const { canAccess } = usePermissions();

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Archive toggle & status filter state
  const [showArchive, setShowArchive] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [appointmentSearch, setAppointmentSearch] = useState('');

  // WhatsApp helper modal
  const [isWhatsappModalOpen, setIsWhatsappModalOpen] = useState(false);
  const [whatsappRawText, setWhatsappRawText] = useState('');

  // Form state for "إضافة موعد"
  const [patientName, setPatientName] = useState('');
  const [phone, setPhone] = useState('');
  const [scheduledDate, setScheduledDate] = useState('2026-09-07');
  const [scheduledTime, setScheduledTime] = useState('09:00 ص');
  const [visitType, setVisitType] = useState('كشف');
  const [appointmentNotes, setAppointmentNotes] = useState('');
  const [formFeedback, setFormFeedback] = useState<string | null>(null);

  // Follow-ups search state
  const [followupSearch, setFollowupSearch] = useState('');

  // Sample initial appointments including the requested "جمال على محمد" and archive items
  const [customAppointments, setCustomAppointments] = useState<AppointmentListItem[]>([
    {
      id: 'app-sample-1',
      patientName: 'جمال على محمد',
      phone: '01021434947',
      medicalCode: 'EG-102',
      timeSlot: '09:00',
      branch: 'الفرع الرئيسي',
      visitType: 'متابعة',
      expectedFee: 0,
      status: 'مجدول' as any,
      notes: 'متابعة كشف واستشارة',
    },
    {
      id: 'app-sample-2',
      patientName: 'سارة إبراهيم محمود',
      phone: '01145829103',
      medicalCode: 'EG-103',
      timeSlot: '09:30',
      branch: 'الفرع الرئيسي',
      visitType: 'كشف',
      expectedFee: 300,
      status: 'بانتظار التأكيد' as any,
      notes: 'كشف باطنة جديد',
    },
    {
      id: 'app-sample-3',
      patientName: 'خالد مصطفى العوضي',
      phone: '01284910293',
      medicalCode: 'EG-104',
      timeSlot: '10:15',
      branch: 'الفرع الرئيسي',
      visitType: 'كشف',
      expectedFee: 300,
      status: 'فى الانتظار' as any,
      notes: 'حضر للعيادة وفي صالة الانتظار',
    },
    // 3 Archived/Completed Appointments for "عرض الأرشيف (3)"
    {
      id: 'app-archived-1',
      patientName: 'أحمد محمود رضوان',
      phone: '01019283746',
      medicalCode: 'EG-088',
      timeSlot: '08:00',
      branch: 'الفرع الرئيسي',
      visitType: 'كشف',
      expectedFee: 300,
      status: 'اكتمل  الكشف' as any,
      notes: 'تم فحص المريض واستلام الروشتة',
    },
    {
      id: 'app-archived-2',
      patientName: 'مروة كمال الشناوي',
      phone: '01129384756',
      medicalCode: 'EG-091',
      timeSlot: '08:30',
      branch: 'الفرع الرئيسي',
      visitType: 'متابعة',
      expectedFee: 0,
      status: 'اكتمل  الكشف' as any,
      notes: 'استشارة ومتابعة تحاليل الغدة',
    },
    {
      id: 'app-archived-3',
      patientName: 'ياسر عبد العزيز',
      phone: '01594837261',
      medicalCode: 'EG-095',
      timeSlot: '08:45',
      branch: 'الفرع الرئيسي',
      visitType: 'كشف',
      expectedFee: 300,
      status: 'ملغى' as any,
      notes: 'اعتذر المريض عن الحضور وتم الإلغاء',
    },
  ]);

  // Merge canonical appointments from props if available
  const allAppointments = useMemo(() => {
    const list = [...customAppointments];
    if (appointments && appointments.length > 0) {
      appointments.forEach((app) => {
        if (!list.some((existing) => existing.id === app.id || existing.patientName === app.patientName)) {
          list.push(app);
        }
      });
    }
    return list;
  }, [customAppointments, appointments]);

  // Count of archived appointments (اكتمل الكشف / ملغى)
  const archivedCount = useMemo(() => {
    return allAppointments.filter((app) => app.status === 'اكتمل  الكشف' || app.status === 'مكتمل' || app.status === 'ملغى' || app.status === 'ملغي').length;
  }, [allAppointments]);

  // Filter appointments according to status & archive toggle
  const displayedAppointments = useMemo(() => {
    return allAppointments.filter((app) => {
      const isArchived = app.status === 'اكتمل  الكشف' || app.status === 'مكتمل' || app.status === 'ملغى' || app.status === 'ملغي';
      
      // If archive mode is OFF, hide archived appointments unless user explicitly filtered for them
      if (!showArchive && isArchived && statusFilter === 'all') {
        return false;
      }
      // If archive mode is ON, show only archived appointments
      if (showArchive && !isArchived && statusFilter === 'all') {
        return false;
      }

      // Filter by status dropdown
      if (statusFilter !== 'all') {
        if (statusFilter === 'اكتمل  الكشف') {
          if (app.status !== 'اكتمل  الكشف' && app.status !== 'مكتمل') return false;
        } else if (statusFilter === 'ملغى') {
          if (app.status !== 'ملغى' && app.status !== 'ملغي') return false;
        } else if (app.status !== statusFilter) {
          return false;
        }
      }

      // Search query
      if (appointmentSearch.trim()) {
        const q = appointmentSearch.toLowerCase();
        const pName = (app.patientName || '').toLowerCase();
        const pPhone = app.phone || '';
        if (!pName.includes(q) && !pPhone.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [allAppointments, showArchive, statusFilter, appointmentSearch]);

  // Default follow-ups if empty from prop
  const activeFollowUps = useMemo(() => {
    if (followUps && followUps.length > 0) {
      return followUps;
    }
    return [
      {
        id: 'fu-1',
        patientName: 'جمال على محمد',
        phone: '01021434947',
        medicalCode: 'EG-102',
        lastVisitDate: '2026-08-28',
        dueDate: '2026-09-11',
        daysRemaining: 3,
        isFreeEligible: true,
        diagnosis: 'نزلة برد حادة والتهاب الحلق واللوزتين',
        notes: 'متابعة استجابة المضاد الحيوي وصورة الدم',
      },
      {
        id: 'fu-2',
        patientName: 'مريم عادل الشريف',
        phone: '01123456789',
        medicalCode: 'EG-105',
        lastVisitDate: '2026-08-30',
        dueDate: '2026-09-13',
        daysRemaining: 5,
        isFreeEligible: true,
        diagnosis: 'ارتفاع ضغط الدم ونظم القلب',
        notes: 'متابعة قياسات الضغط اليومية',
      },
      {
        id: 'fu-3',
        patientName: 'عمر شريف الدسوقي',
        phone: '01234567890',
        medicalCode: 'EG-108',
        lastVisitDate: '2026-08-26',
        dueDate: '2026-09-09',
        daysRemaining: 1,
        isFreeEligible: true,
        diagnosis: 'التهاب المعدة وجرثومة المعدة H.Pylori',
        notes: 'إعادة تقييم الأعراض بعد كورس العلاج الثلاثي',
      },
      {
        id: 'fu-4',
        patientName: 'نهى إبراهيم خليل',
        phone: '01098765432',
        medicalCode: 'EG-110',
        lastVisitDate: '2026-08-20',
        dueDate: '2026-09-03',
        daysRemaining: 0,
        isFreeEligible: false,
        diagnosis: 'فحوصات الغدة الدرقية والكولسترول',
        notes: 'انتهت فترة الاستشارة المجانية (14 يوماً)',
      },
    ];
  }, [followUps]);

  // Filtered follow-ups
  const displayedFollowUps = useMemo(() => {
    return activeFollowUps.filter((f) => {
      if (!followupSearch.trim()) return true;
      const q = followupSearch.toLowerCase();
      return f.patientName.toLowerCase().includes(q) || f.phone.includes(q) || f.medicalCode.toLowerCase().includes(q);
    });
  }, [activeFollowUps, followupSearch]);

  // Update Status handler
  const handleUpdateStatus = (appId: string, newStatus: AppointmentStatusType) => {
    setCustomAppointments((prev) =>
      prev.map((item) => {
        if (item.id === appId) {
          return { ...item, status: newStatus as any };
        }
        return item;
      })
    );

    setToastMessage(`تم تحديث حالة الموعد إلى "${newStatus}"`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Convert to Waiting Queue handler
  const handleTransferToWaitingQueue = (app: AppointmentListItem) => {
    handleUpdateStatus(app.id, 'فى الانتظار');
    onCheckInPatient(app);
    setToastMessage(`تم تحويل المريض (${app.patientName}) بنجاح إلى قائمة الانتظار`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // WhatsApp reminder for Appointment
  const handleSendWhatsappAppointmentReminder = (app: AppointmentListItem) => {
    const cleanPhone = (app.phone || '').replace(/[^0-9]/g, '');
    const formattedPhone = cleanPhone.startsWith('0') ? `2${cleanPhone}` : cleanPhone || '201000000000';
    const message = `مرحباً بحضرتك أستاذ/ة *${app.patientName}* 🌸
نود تذكيركم بموعدكم في *عيادة د. حازم القاضي* 🩺
🗓 موعد الحجز: *${app.timeSlot || '09:00 ص'}* (${app.visitType || 'كشف'})
📍 العنوان: عيادة الباطنة التخصصية - المهندسين
📞 للتأكيد أو تعديل الموعد: 01000000000
مع تمنياتنا لكم بدوام الصحة والعافية ✨`;

    try {
      window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
    } catch {
      // ignore
    }
    setToastMessage(`تم فتح واتساب وتجهيز رسالة تذكير الموعد للمريض (${app.patientName})`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // WhatsApp reminder for Follow-up
  const handleSendWhatsappFollowupReminder = (fu: FollowUpItem) => {
    const cleanPhone = (fu.phone || '').replace(/[^0-9]/g, '');
    const formattedPhone = cleanPhone.startsWith('0') ? `2${cleanPhone}` : cleanPhone || '201000000000';
    const eligibleText = fu.isFreeEligible ? 'ضمن فترة الاستشارة والمتابعة المجانية' : 'موعد فحص المتابعة الدورية';
    
    const message = `مرحباً بحضرتك أستاذ/ة *${fu.patientName}* 🌸
نود تذكيركم بموعد الاستشارة والمتابعة الطبية الخاص بكم في *عيادة د. حازم القاضي* 🩺
🗓 موعد المتابعة المستحق: *${fu.dueDate}* (${eligibleText})
📋 التشخيص المسجل: ${fu.diagnosis || 'متابعة دورية'}
📍 العنوان: عيادة الباطنة التخصصية - المهندسين
📞 لتأكيد الحضور أو حجز موعد مناسب: 01000000000
مع تمنياتنا لكم بتمام الشفاء والعافية ✨`;

    try {
      window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
    } catch {
      // ignore
    }
    setToastMessage(`تم فتح واتساب وتجهيز رسالة تذكير المتابعة للمريض (${fu.patientName})`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Save new appointment handler
  const handleSaveNewAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim()) {
      setFormFeedback('يرجى كتابة اسم المريض');
      return;
    }

    const newApp: AppointmentListItem = {
      id: `app-${Date.now()}`,
      patientName: patientName.trim(),
      phone: phone.trim() || 'بدون هاتف',
      medicalCode: `EG-${Math.floor(100 + Math.random() * 900)}`,
      timeSlot: scheduledTime || '09:00 ص',
      branch: 'الفرع الرئيسي',
      visitType: visitType || 'كشف',
      expectedFee: visitType.includes('متابعة') ? 0 : 300,
      status: 'مجدول' as any,
      notes: appointmentNotes.trim() || 'موعد كشف جديد',
    };

    setCustomAppointments((prev) => [newApp, ...prev]);

    if (onAddAppointment) {
      onAddAppointment(newApp);
    }

    // Reset Form
    setPatientName('');
    setPhone('');
    setAppointmentNotes('');
    setFormFeedback('تم حفظ الموعد بنجاح ✓');
    setToastMessage(`تم حفظ موعد المريض (${newApp.patientName}) بنجاح`);
    setTimeout(() => {
      setFormFeedback(null);
      setToastMessage(null);
    }, 3500);
  };

  // Parse text from WhatsApp request
  const handleParseWhatsappText = () => {
    if (!whatsappRawText.trim()) return;

    let parsedName = '';
    let parsedPhone = '';
    let parsedVisitType = 'كشف';

    // Extract phone
    const phoneMatch = whatsappRawText.match(/(?:01[0125]\d{8}|\+?201[0125]\d{8})/);
    if (phoneMatch) {
      parsedPhone = phoneMatch[0];
    }

    // Extract name
    const nameKeywords = ['اسمي', 'اسم', 'الاسم:', 'أنا', 'المريض:', 'المريض'];
    for (const kw of nameKeywords) {
      const idx = whatsappRawText.indexOf(kw);
      if (idx !== -1) {
        const after = whatsappRawText.slice(idx + kw.length).replace(/[:]/g, '').trim();
        const words = after.split(/[\n,.-]/)[0].trim().split(/\s+/).slice(0, 3).join(' ');
        if (words.length > 2) {
          parsedName = words;
          break;
        }
      }
    }

    if (!parsedName) {
      // Fallback: take first non-empty line
      const firstLine = whatsappRawText.split('\n').map((l) => l.trim()).filter((l) => l.length > 2)[0];
      if (firstLine && !firstLine.includes('01')) {
        parsedName = firstLine.slice(0, 30);
      } else {
        parsedName = 'مريض واتساب';
      }
    }

    if (whatsappRawText.includes('متابعة') || whatsappRawText.includes('استشارة') || whatsappRawText.includes('إعادة')) {
      parsedVisitType = 'متابعة';
    }

    // Populate form
    setPatientName(parsedName);
    if (parsedPhone) setPhone(parsedPhone);
    setVisitType(parsedVisitType);
    setAppointmentNotes(`طلب حجز عبر واتساب: ${whatsappRawText.slice(0, 80)}...`);

    setIsWhatsappModalOpen(false);
    setWhatsappRawText('');
    setToastMessage('تم استخراج بيانات الموعد من رسالة واتساب وتعبئة النموذج');
    setTimeout(() => setToastMessage(null), 3500);
  };

  return (
    <div className="flex flex-col w-full max-w-full overflow-x-hidden pb-24 space-y-8 text-slate-800 dark:text-[#dde2f5]">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 dark:bg-[#18233C] text-white border border-[#00c2cb] px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in duration-200">
          <span className="material-symbols-outlined text-[#00c2cb] text-xl">check_circle</span>
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* البطاقة الأولى: إدارة المواعيد والتقويم */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-[#111A2E] p-5 sm:p-7 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm space-y-6">
        {/* Header of Card 1 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-5">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-[#00c2cb]/15 text-[#008f97] dark:text-[#00c2cb] flex items-center justify-center font-bold shadow-xs shrink-0">
                <span className="material-symbols-outlined text-2xl">calendar_month</span>
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  إدارة المواعيد والتقويم
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-[#859394] mt-0.5">
                  نظّم المواعيد وحوّل الموعد إلى قائمة الانتظار عند حضور المريض.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs px-3 py-1.5 rounded-full bg-teal-50 dark:bg-teal-950/40 text-[#008f97] dark:text-[#45dee7] font-bold border border-teal-200 dark:border-teal-800/40 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#00c2cb] animate-pulse"></span>
              <span>مباشر اليوم: 8 سبتمبر 2026</span>
            </span>
          </div>
        </div>

        {/* Two-Column Responsive Grid matching the screenshot data */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Column A (Left / Center in RTL): قائمة المواعيد والأرشيف */}
          <div className="lg:col-span-7 flex flex-col space-y-4">
            {/* Top Toolbar: عرض الأرشيف + كل الحالات فلتر */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-[#080e1b] p-3 rounded-2xl border border-slate-200 dark:border-white/5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowArchive(!showArchive)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                    showArchive
                      ? 'bg-[#1e293b] dark:bg-slate-700 text-white border-slate-600 shadow-sm'
                      : 'bg-white dark:bg-[#18233C] text-slate-700 dark:text-[#dde2f5] border-slate-200 dark:border-white/10 hover:bg-slate-100'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">archive</span>
                  <span>عرض الأرشيف ({archivedCount})</span>
                </button>

                {showArchive && (
                  <span className="text-[11px] text-amber-600 dark:text-amber-400 font-bold px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/30">
                    وضع الأرشيف
                  </span>
                )}
              </div>

              {/* Status Filter Dropdown with exact requested items */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-600 dark:text-[#859394]">الحالة:</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-white dark:bg-[#18233C] text-slate-900 dark:text-[#dde2f5] text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-[#00c2cb] cursor-pointer font-medium"
                >
                  <option value="all">كل الحالات</option>
                  <option value="بانتظار التأكيد">بانتظار التأكيد</option>
                  <option value="مجدول">مجدول</option>
                  <option value="فى الانتظار">فى الانتظار</option>
                  <option value="داخل الكشف">داخل الكشف</option>
                  <option value="اكتمل  الكشف">اكتمل  الكشف</option>
                  <option value="ملغى">ملغى</option>
                </select>
              </div>
            </div>

            {/* Quick Search */}
            <div className="relative">
              <span className="material-symbols-outlined absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
                search
              </span>
              <input
                type="text"
                value={appointmentSearch}
                onChange={(e) => setAppointmentSearch(e.target.value)}
                placeholder="بحث باسم المريض أو رقم الهاتف في المواعيد..."
                className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] placeholder:text-slate-400 text-xs pr-10 pl-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/5 focus:outline-none focus:ring-1 focus:ring-[#00c2cb]"
              />
            </div>

            {/* Appointments List */}
            <div className="space-y-3">
              {displayedAppointments.length === 0 ? (
                <div className="p-8 rounded-2xl bg-slate-50 dark:bg-[#080e1b] border border-dashed border-slate-200 dark:border-white/10 text-center space-y-2">
                  <span className="material-symbols-outlined text-3xl text-slate-400">event_busy</span>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    لا توجد مواعيد تطابق الفلتر المحدد حالياً
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setStatusFilter('all');
                      setShowArchive(false);
                      setAppointmentSearch('');
                    }}
                    className="text-xs text-[#008f97] dark:text-[#00c2cb] font-bold hover:underline"
                  >
                    إعادة ضبط الفلاتر
                  </button>
                </div>
              ) : (
                displayedAppointments.map((app) => {
                  const isScheduled = app.status === 'مجدول' || app.status === 'بانتظار التأكيد';
                  const isWaiting = app.status === 'فى الانتظار' || app.status === 'في الانتظار';
                  const isCompleted = app.status === 'اكتمل  الكشف' || app.status === 'مكتمل';
                  const isCancelled = app.status === 'ملغى' || app.status === 'ملغي';
                  const isInExam = app.status === 'داخل الكشف' || app.status === 'جاري الكشف';

                  return (
                    <div
                      key={app.id}
                      className="p-4 rounded-2xl bg-slate-50/70 dark:bg-[#080e1b] border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/15 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 group"
                    >
                      {/* Right Details: Time + Name + Badge + Meta */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* Time box */}
                        <div className="px-2.5 py-2 rounded-xl bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-white/5 text-center shrink-0 min-w-[62px]">
                          <span className="font-mono font-black text-sm text-[#008f97] dark:text-[#00c2cb]">
                            {app.timeSlot || '09:00'}
                          </span>
                        </div>

                        {/* Patient info */}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                              {app.patientName}
                            </h3>
                            {/* Status Badge */}
                            <span
                              className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                                isScheduled
                                  ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900/30'
                                  : isWaiting
                                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/30'
                                  : isInExam
                                  ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-900/30'
                                  : isCompleted
                                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/30'
                                  : isCancelled
                                  ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/30'
                                  : 'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {app.status}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-[#859394] mt-1">
                            <span className="font-medium text-slate-700 dark:text-slate-300">
                              {app.visitType || 'كشف'}
                            </span>
                            <span>•</span>
                            <span className="font-mono" dir="ltr">
                              {app.phone || 'بدون هاتف'}
                            </span>
                            {app.notes && (
                              <>
                                <span>•</span>
                                <span className="line-clamp-1 italic text-[11px]">{app.notes}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Left Actions: Status dropdown + Transfer to queue button + WhatsApp */}
                      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200 dark:border-white/5">
                        {/* Status Changer Select */}
                        <select
                          value={app.status}
                          onChange={(e) => handleUpdateStatus(app.id, e.target.value as AppointmentStatusType)}
                          className="bg-white dark:bg-[#111A2E] text-slate-800 dark:text-[#dde2f5] text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-[#00c2cb] cursor-pointer font-medium"
                          title="تغيير حالة الموعد"
                        >
                          {ALL_STATUSES.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>

                        {/* Transfer to Waiting Queue Button (Only for scheduled / confirmed) */}
                        {isScheduled && (
                          <button
                            type="button"
                            onClick={() => handleTransferToWaitingQueue(app)}
                            className="px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-[#00c2cb]/15 hover:bg-[#00c2cb] text-[#008f97] dark:text-[#45dee7] hover:text-slate-950 text-xs font-bold border border-teal-200 dark:border-[#00c2cb]/30 transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                            title="حوّل الموعد إلى قائمة الانتظار عند حضور المريض"
                          >
                            <span className="material-symbols-outlined text-base">how_to_reg</span>
                            <span>حضر المريض</span>
                          </button>
                        )}

                        {/* WhatsApp Reminder Button */}
                        <button
                          type="button"
                          onClick={() => handleSendWhatsappAppointmentReminder(app)}
                          className="p-1.5 rounded-xl bg-emerald-50 dark:bg-[#25D366]/15 hover:bg-[#25D366] text-emerald-700 dark:text-[#25D366] hover:text-white transition-all cursor-pointer border border-emerald-200 dark:border-[#25D366]/30"
                          title="إرسال تذكير واتساب للموعد"
                        >
                          <span className="material-symbols-outlined text-base">chat</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Column B (Right in RTL): نموذج إضافة موعد (Matching the screenshot form) */}
          <div className="lg:col-span-5 bg-slate-50 dark:bg-[#080e1b] p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-white/5 space-y-4">
            {/* Header: إضافة موعد + إضافة من طلب واتساب */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-white/5 pb-3">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-[#008f97] dark:text-[#00c2cb] text-xl">
                  add_circle
                </span>
                <span>إضافة موعد</span>
              </h2>

              <button
                type="button"
                onClick={() => setIsWhatsappModalOpen(true)}
                className="px-3 py-1 rounded-xl bg-emerald-50 dark:bg-[#25D366]/15 hover:bg-emerald-100 dark:hover:bg-[#25D366]/25 text-emerald-700 dark:text-[#25D366] text-xs font-bold border border-emerald-200 dark:border-[#25D366]/30 transition-all cursor-pointer flex items-center gap-1.5"
                title="استخراج البيانات من محادثة واتساب"
              >
                <span className="material-symbols-outlined text-base">chat</span>
                <span>إضافة من طلب واتساب</span>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveNewAppointment} className="space-y-3.5">
              {/* Patient Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-[#dde2f5]">
                  اسم المريض <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="اسم المريض"
                  className="w-full bg-white dark:bg-[#111A2E] text-slate-900 dark:text-white placeholder:text-slate-400 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-[#00c2cb]"
                />
              </div>

              {/* Phone */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-[#dde2f5]">
                  رقم الهاتف
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="مثال: 01012345678"
                  className="w-full bg-white dark:bg-[#111A2E] text-slate-900 dark:text-white placeholder:text-slate-400 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 font-mono focus:outline-none focus:ring-1 focus:ring-[#00c2cb]"
                />
              </div>

              {/* Date & Time Row */}
              <div className="grid grid-cols-2 gap-3">
                {/* Date */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-[#dde2f5]">التاريخ</label>
                  <input
                    type="text"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    placeholder="7 سبتمبر 2026"
                    className="w-full bg-white dark:bg-[#111A2E] text-slate-900 dark:text-white text-xs px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-[#00c2cb]"
                  />
                </div>

                {/* Time */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-[#dde2f5]">الوقت</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      placeholder="٠٩:٠٠ ص"
                      className="w-full bg-white dark:bg-[#111A2E] text-slate-900 dark:text-white text-xs pl-8 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-[#00c2cb]"
                    />
                    <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-base pointer-events-none">
                      schedule
                    </span>
                  </div>
                </div>
              </div>

              {/* Visit Type */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-[#dde2f5]">نوع الموعد</label>
                <select
                  value={visitType}
                  onChange={(e) => setVisitType(e.target.value)}
                  className="w-full bg-white dark:bg-[#111A2E] text-slate-900 dark:text-white text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-[#00c2cb] cursor-pointer"
                >
                  <option value="كشف">كشف</option>
                  <option value="متابعة">متابعة</option>
                  <option value="استشارة دورية">استشارة دورية</option>
                  <option value="فحص سريع">فحص سريع</option>
                  <option value="طوارئ عيادة">طوارئ عيادة</option>
                </select>
              </div>

              {/* Appointment Notes */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-[#dde2f5]">ملاحظات الموعد</label>
                <textarea
                  rows={2}
                  value={appointmentNotes}
                  onChange={(e) => setAppointmentNotes(e.target.value)}
                  placeholder="ملاحظات الموعد"
                  className="w-full bg-white dark:bg-[#111A2E] text-slate-900 dark:text-white placeholder:text-slate-400 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-[#00c2cb] resize-none"
                />
              </div>

              {/* Form Feedback */}
              {formFeedback && (
                <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold text-center">
                  {formFeedback}
                </div>
              )}

              {/* Save Appointment Button (Matching blue color in screenshot) */}
              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">bookmark_add</span>
                <span>حفظ الموعد</span>
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* البطاقة الثانية: المتابعات القادمة (مع زر تذكير للواتس اب بالمتابعة) */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-[#111A2E] p-5 sm:p-7 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm space-y-6">
        {/* Header of Card 2 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shadow-xs shrink-0">
              <span className="material-symbols-outlined text-2xl">event_repeat</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  المتابعات القادمة
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 text-xs font-bold font-mono">
                  {displayedFollowUps.length} مريض
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-[#859394] mt-0.5">
                قائمة المرضى المستحقين للمتابعة الدورية والاستشارة مع زر مباشر للتذكير الفوري عبر واتساب.
              </p>
            </div>
          </div>

          {/* Quick Search inside follow-ups */}
          <div className="relative w-full sm:w-72">
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-base">
              search
            </span>
            <input
              type="text"
              value={followupSearch}
              onChange={(e) => setFollowupSearch(e.target.value)}
              placeholder="بحث في المتابعات..."
              className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs pr-9 pl-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-[#00c2cb]"
            />
          </div>
        </div>

        {/* Follow-ups Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayedFollowUps.map((fu) => (
            <div
              key={fu.id}
              className="p-4 sm:p-5 rounded-2xl bg-slate-50/70 dark:bg-[#080e1b] border border-slate-200 dark:border-white/5 hover:border-emerald-300 dark:hover:border-emerald-900/40 transition-all flex flex-col justify-between gap-4 shadow-xs"
            >
              <div>
                {/* Header row: Name + Due badge */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {fu.patientName}
                    </h3>
                    <div className="text-[11px] text-slate-400 dark:text-slate-500 font-mono mt-0.5 flex items-center gap-1.5">
                      <span dir="ltr">{fu.phone || 'بدون هاتف'}</span>
                      <span>•</span>
                      <span>#{fu.medicalCode}</span>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-bold shrink-0 ${
                      fu.isFreeEligible
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/30'
                        : 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {fu.daysRemaining > 0 ? `متبقي ${fu.daysRemaining} يوم` : 'اليوم الأخير'}
                  </span>
                </div>

                {/* Details row: Diagnosis + Dates */}
                <div className="mt-3 space-y-1.5 bg-white dark:bg-[#111A2E] p-3 rounded-xl border border-slate-200/70 dark:border-white/5 text-xs">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-[#859394]">
                    <span>تاريخ آخر زيارة: <strong className="text-slate-700 dark:text-slate-300 font-mono">{fu.lastVisitDate}</strong></span>
                    <span>موعد المتابعة: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{fu.dueDate}</strong></span>
                  </div>
                  <div className="text-slate-700 dark:text-slate-300 font-medium line-clamp-1">
                    <span className="text-slate-400 text-[11px]">التشخيص: </span>
                    {fu.diagnosis}
                  </div>
                  {fu.notes && (
                    <div className="text-slate-500 dark:text-slate-400 text-[11px] italic line-clamp-1">
                      {fu.notes}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons: WhatsApp Reminder Button + Schedule Appointment */}
              <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60 dark:border-white/5">
                {/* 2. زر تذكير للواتس اب بالمتابعة (The requested feature!) */}
                <button
                  type="button"
                  onClick={() => handleSendWhatsappFollowupReminder(fu)}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-slate-950 font-bold text-xs shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
                  title="إرسال رسالة تذكير فورية بالواتساب بالموعد المحدد"
                >
                  <span className="material-symbols-outlined text-base">chat</span>
                  <span>تذكير بالواتساب بالمتابعة</span>
                </button>

                {/* Quick Schedule into Card 1 */}
                <button
                  type="button"
                  onClick={() => {
                    setPatientName(fu.patientName);
                    setPhone(fu.phone);
                    setVisitType('متابعة');
                    setAppointmentNotes(`متابعة لزيارة سابقة: ${fu.diagnosis}`);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    setToastMessage(`تم إدراج بيانات (${fu.patientName}) في نموذج حجز الموعد`);
                    setTimeout(() => setToastMessage(null), 3000);
                  }}
                  className="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-[#dde2f5] font-bold text-xs transition-all cursor-pointer flex items-center gap-1 shrink-0"
                  title="نقل بيانات المريض لنموذج حجز الموعد بالأعلى"
                >
                  <span className="material-symbols-outlined text-base">edit_calendar</span>
                  <span>جدولة موعد</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* Modal: إضافة من طلب واتساب (Smart WhatsApp parser modal) */}
      {/* ========================================================================= */}
      {isWhatsappModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111A2E] rounded-3xl border border-slate-200 dark:border-white/10 max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-[#25D366]/20 text-emerald-700 dark:text-[#25D366] flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-lg">chat</span>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  إضافة موعد من رسالة واتساب
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsWhatsappModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 flex items-center justify-center text-slate-400 cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-[#859394] leading-relaxed">
              انسخ نص رسالة الحجز المرسلة من المريض على واتساب، وسيقوم النظام الذكي تلقائياً باستخراج الاسم ورقم الهاتف ونوع الكشف وتعبئة نموذج الموعد.
            </p>

            <textarea
              rows={4}
              value={whatsappRawText}
              onChange={(e) => setWhatsappRawText(e.target.value)}
              placeholder="الصق رسالة الواتساب هنا... مثال: 
مرحباً دكتور حازم، عايز أحجز كشف كشف باطنة باسم جمال على محمد ورقمي 01021434947 يوم الاثنين 9 صباحاً"
              className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] placeholder:text-slate-400 text-xs p-3.5 rounded-xl border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-[#00c2cb] resize-none"
            />

            {/* Quick Presets */}
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="text-slate-400 font-bold">رسائل سريعة تجريبية:</span>
              <button
                type="button"
                onClick={() =>
                  setWhatsappRawText(
                    'مساء الخير عيادة د. حازم، حجز كشف مستعجل، الاسم: جمال على محمد، هاتف: 01021434947'
                  )
                }
                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-[11px] font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                نموذج 1: جمال علي محمد
              </button>
              <button
                type="button"
                onClick={() =>
                  setWhatsappRawText(
                    'السلام عليكم، متابعة مجانية واستشارة بعد كورس العلاج، اسم المريضة: سارة إبراهيم محمود - 01145829103'
                  )
                }
                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-[11px] font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                نموذج 2: سارة إبراهيم
              </button>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-white/5">
              <button
                type="button"
                onClick={() => setIsWhatsappModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={!whatsappRawText.trim()}
                onClick={handleParseWhatsappText}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold shadow-md cursor-pointer transition-all flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-base">auto_fix_high</span>
                <span>استخراج وتعبئة النموذج</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

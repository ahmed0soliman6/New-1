import React, { useState, useEffect, useMemo } from 'react';
import { 
  getClinicBranches, 
  generateBranchTimeSlots, 
  ClinicBranchItem, 
  formatBranchTime,
  isDateMatchingBranchDays,
  getNextValidWorkingDate,
  getUpcomingDateSuggestions
} from '../../utils/clinicBranches';
import { getPrescriptionDoctorInfo } from '../../utils/prescriptionDoctor';
import { getActiveVisitTypes } from '../../utils/financeManager';
import { AppointmentListItem } from '../../types';
import { QrCodeImage } from '../QrCodeImage';
import { safeStorage } from '../../services/storage';

interface BookingLandingScreenProps {
  onAddAppointment?: (appointment: AppointmentListItem) => void;
  onNavigateToAppointments?: () => void;
  isEmbed?: boolean;
}

function normalizeTimeToMins(str?: string): number | null {
  if (!str) return null;
  const s = str.trim().toLowerCase();
  const isPM = s.includes('م') || s.includes('pm');
  const isAM = s.includes('ص') || s.includes('am');
  const digitsOnly = s.replace(/[^\d:]/g, '');
  const parts = digitsOnly.split(':');
  if (parts.length < 1) return null;
  let h = parseInt(parts[0], 10);
  let m = parts.length >= 2 ? parseInt(parts[1], 10) : 0;
  if (isNaN(h)) return null;
  if (isNaN(m)) m = 0;

  if (isPM && h < 12) h += 12;
  if (isAM && h === 12) h = 0;

  return h * 60 + m;
}

export const BookingLandingScreen: React.FC<BookingLandingScreenProps> = ({
  onAddAppointment,
  onNavigateToAppointments,
  isEmbed = false,
}) => {
  const doctorInfo = useMemo(() => getPrescriptionDoctorInfo(), []);
  const [branches, setBranches] = useState<ClinicBranchItem[]>(() => getClinicBranches());
  const visitTypes = useMemo(() => getActiveVisitTypes(), []);

  // Update branches dynamically if saved in Settings
  useEffect(() => {
    const handleUpdateBranches = () => {
      const updated = getClinicBranches();
      setBranches(updated);
    };

    window.addEventListener('soli_branches_updated', handleUpdateBranches);
    window.addEventListener('soli_prescription_updated', handleUpdateBranches);
    window.addEventListener('storage', handleUpdateBranches);

    return () => {
      window.removeEventListener('soli_branches_updated', handleUpdateBranches);
      window.removeEventListener('soli_prescription_updated', handleUpdateBranches);
      window.removeEventListener('storage', handleUpdateBranches);
    };
  }, []);

  // Form State
  const [patientName, setPatientName] = useState('');
  const [phone, setPhone] = useState('');
  const [scheduledDate, setScheduledDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedBranchId, setSelectedBranchId] = useState<string>(() => branches[0]?.id || '');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [visitType, setVisitType] = useState<string>(() => visitTypes[0]?.name || 'كشف جديد');
  const [notes, setNotes] = useState('');

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState(false);

  // Booked appointments state to exclude already booked slots
  const [bookedAppointments, setBookedAppointments] = useState<any[]>(() => {
    const onlineApps = safeStorage.getJSON<any[]>('soli_appointments_online', []) || [];
    const clinicApps = safeStorage.getJSON<any[]>('soli_clinic_appointments', []) || [];
    const dbApps = safeStorage.getJSON<any>('soli_clinic_db_v1', null)?.appointments || [];
    return [...onlineApps, ...clinicApps, ...dbApps];
  });

  useEffect(() => {
    const loadApps = () => {
      const onlineApps = safeStorage.getJSON<any[]>('soli_appointments_online', []) || [];
      const clinicApps = safeStorage.getJSON<any[]>('soli_clinic_appointments', []) || [];
      const dbApps = safeStorage.getJSON<any>('soli_clinic_db_v1', null)?.appointments || [];
      setBookedAppointments([...onlineApps, ...clinicApps, ...dbApps]);
    };

    window.addEventListener('storage', loadApps);
    window.addEventListener('soli_appointments_updated', loadApps);

    return () => {
      window.removeEventListener('storage', loadApps);
      window.removeEventListener('soli_appointments_updated', loadApps);
    };
  }, []);

  // Get active branch object
  const activeBranch = useMemo(() => {
    return branches.find((b) => b.id === selectedBranchId) || branches[0];
  }, [branches, selectedBranchId]);

  // Check if selected date matches the branch working days
  const isDateValid = useMemo(() => {
    if (!activeBranch) return true;
    return isDateMatchingBranchDays(scheduledDate, activeBranch.workingHours);
  }, [scheduledDate, activeBranch]);

  // Get next 3 available working dates suggestions for the active branch
  const upcomingSuggestions = useMemo(() => {
    if (!activeBranch) return [];
    return getUpcomingDateSuggestions(activeBranch.workingHours);
  }, [activeBranch]);

  // Adjust scheduled date to the next valid working date when branch changes
  useEffect(() => {
    if (activeBranch) {
      const validDate = getNextValidWorkingDate(scheduledDate, activeBranch.workingHours);
      if (validDate !== scheduledDate) {
        setScheduledDate(validDate);
      }
    }
  }, [selectedBranchId, activeBranch]);

  // Set of booked minutes for the selected branch & date
  const bookedMinsSet = useMemo(() => {
    if (!activeBranch) return new Set<number>();

    const set = new Set<number>();
    const targetDate = scheduledDate;
    const branchName = activeBranch.name.trim();

    bookedAppointments.forEach((app: any) => {
      const apptDate = app.date || app.appointmentDate;
      if (!apptDate || !apptDate.startsWith(targetDate)) return;

      const apptBranch = app.branch || app.branchId || app.clinicBranch || '';
      const isSameBranch =
        !apptBranch ||
        apptBranch === branchName ||
        apptBranch === activeBranch.id ||
        branchName.includes(apptBranch) ||
        apptBranch.includes(branchName);
      if (!isSameBranch) return;

      const status = (app.status || '').toString().toUpperCase();
      if (status === 'CANCELLED' || app.status === 'ملغى') return;

      const timeStr = app.timeSlot || app.time || app.startTime;
      const mins = normalizeTimeToMins(timeStr);
      if (mins !== null) {
        set.add(mins);
      }
    });

    return set;
  }, [bookedAppointments, scheduledDate, activeBranch]);

  // Generate dynamic 15-minute time slots based on selected branch's startTime & endTime
  const allTimeSlots = useMemo(() => {
    if (!activeBranch) return [];
    return generateBranchTimeSlots(activeBranch.startTime, activeBranch.endTime, activeBranch.workingHours);
  }, [activeBranch]);

  // Filter out booked slots
  const availableTimeSlots = useMemo(() => {
    return allTimeSlots.filter((slot) => {
      const slotMins = normalizeTimeToMins(slot.raw);
      return slotMins === null || !bookedMinsSet.has(slotMins);
    });
  }, [allTimeSlots, bookedMinsSet]);

  // Set default time slot when available slots change
  useEffect(() => {
    if (availableTimeSlots.length > 0) {
      if (!availableTimeSlots.some((s) => s.label === selectedTimeSlot)) {
        setSelectedTimeSlot(availableTimeSlots[0].label);
      }
    } else {
      setSelectedTimeSlot('');
    }
  }, [availableTimeSlots]);

  // Format WhatsApp Message Text
  const formatWhatsappMessage = () => {
    const branchName = activeBranch?.name || 'الفرع الرئيسي';
    return (
      `طلب حجز موعد جديد 🏥\n` +
      `---------------------------\n` +
      `الاسم: ${patientName.trim() || 'اسم المريض'}\n` +
      `رقم الهاتف: ${phone.trim() || 'بدون هاتف'}\n` +
      `التاريخ: ${scheduledDate}\n` +
      `الوقت: ${selectedTimeSlot}\n` +
      `فرع العيادة: ${branchName}\n` +
      `نوع الموعد: ${visitType}\n` +
      `ملاحظات الموعد: ${notes.trim() || 'لا توجد ملاحظات'}`
    );
  };

  // Send WhatsApp Action
  const handleSendWhatsapp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim()) {
      alert('يرجى كتابة اسم المريض ثلاثي أو رباعي');
      return;
    }

    if (!isDateValid) {
      alert('عفواً، هذا الفرع مغلق في التاريخ المحدد. يرجى اختيار أحد الأيام المتاحة الموضحة في صندوق التنبيه.');
      return;
    }

    if (!selectedTimeSlot) {
      alert('يرجى اختيار موعد متاح للكشف');
      return;
    }

    const doctorPhone = doctorInfo.phone?.replace(/\D/g, '') || '01092847162';
    const cleanPhone = doctorPhone.startsWith('0') ? `2${doctorPhone}` : doctorPhone;
    const text = formatWhatsappMessage();
    const encoded = encodeURIComponent(text);
    const url = `https://wa.me/${cleanPhone}?text=${encoded}`;

    const matchingVt = visitTypes.find((vt) => vt.name === visitType);
    const expectedFee = matchingVt ? matchingVt.fee : 300;
    const newApp: AppointmentListItem = {
      id: `app-${Date.now()}`,
      patientName: patientName.trim(),
      phone: phone.trim() || 'بدون هاتف',
      medicalCode: `EG-${Math.floor(100 + Math.random() * 900)}`,
      timeSlot: selectedTimeSlot,
      time: selectedTimeSlot,
      date: scheduledDate,
      branch: activeBranch?.name || 'الفرع الرئيسي',
      visitType: visitType,
      expectedFee,
      status: 'مجدول' as any,
      notes: `حجز عبر الواتساب: ${notes.trim()}`,
    };

    // Save to local storage for immediate slot exclusion
    try {
      const existingOnline = safeStorage.getJSON<any[]>('soli_appointments_online', []) || [];
      safeStorage.setJSON('soli_appointments_online', [newApp, ...existingOnline]);
      window.dispatchEvent(new Event('soli_appointments_updated'));
    } catch (e) {
      console.warn('Local storage save warning:', e);
    }

    // Auto-save to local callback if provided
    if (onAddAppointment) {
      onAddAppointment(newApp);
    }

    // Direct Firestore sync of Patient & Appointment with correct keys for doctor's dashboard
    try {
      import('../../services/firebase').then(({ db }) => {
        if (db) {
          import('firebase/firestore').then(({ doc, setDoc }) => {
            const patientId = `pat-online-${Date.now()}`;
            const timestamp = new Date().toISOString();
            
            // 1. Create Patient document in 'patients' collection
            setDoc(doc(db, 'patients', patientId), {
              patientId: patientId,
              fullName: newApp.patientName,
              phone: newApp.phone,
              fileNumber: 9000 + Math.floor(Math.random() * 1000),
              medicalCode: newApp.medicalCode || `EG-ONL-${Math.floor(1000 + Math.random() * 9000)}`,
              chronicDiseases: [],
              allergies: [],
              address: '',
              bloodType: 'غير محدد',
              createdAt: timestamp,
              updatedAt: timestamp,
              createdBy: 'online_booking',
            }, { merge: true }).then(() => {
              // 2. Create Appointment document in 'appointments' collection
              setDoc(doc(db, 'appointments', newApp.id), {
                appointmentId: newApp.id,
                patientId: patientId,
                patientName: newApp.patientName,
                phone: newApp.phone,
                clinicLocationId: activeBranch?.id || 'loc-mohandessin',
                scheduledDate: newApp.date,
                scheduledTime: newApp.timeSlot,
                visitType: newApp.visitType,
                status: 'SCHEDULED',
                expectedFee: newApp.expectedFee,
                notes: newApp.notes,
                createdAt: timestamp,
                updatedAt: timestamp,
                createdBy: 'online_booking',
                // Keep backup legacy fields just in case
                appointmentDate: newApp.date,
                startTime: newApp.timeSlot,
                endTime: newApp.timeSlot,
                type: newApp.visitType,
              }, { merge: true }).catch((err) => console.warn('Booking sync warning:', err));
            }).catch((err) => console.warn('Patient sync warning:', err));
          });
        }
      });
    } catch (e) {
      console.warn('Firestore booking write failure:', e);
    }

    window.open(url, '_blank');
    setToastMessage('تم إعداد طلب الحجز وفتح الواتساب لإرساله للعيادة وتسجيله بالنظام بنجاح ✓');
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Copy structured text
  const handleCopyText = () => {
    if (!isDateValid) {
      alert('عفواً، هذا الفرع مغلق في التاريخ المحدد. يرجى اختيار أحد الأيام المتاحة الموضحة في صندوق التنبيه.');
      return;
    }
    const text = formatWhatsappMessage();
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setToastMessage('تم نسخ نص طلب الحجز للحافظة! يمكنك لصقه الآن في الواتساب أو في "إضافة من طلب واتساب"');
    setTimeout(() => {
      setCopiedText(false);
      setToastMessage(null);
    }, 4000);
  };

  const bookingPageUrl = typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}#booking` : 'https://solimedical.com';

  return (
    <div className={`w-full max-w-4xl mx-auto ${isEmbed ? 'p-0' : 'p-4 sm:p-6 pb-24'} space-y-6 text-slate-800 dark:text-[#dde2f5]`}>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 dark:bg-[#18233C] text-white border border-[#00c2cb] px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in duration-200">
          <span className="material-symbols-outlined text-[#00c2cb] text-xl">check_circle</span>
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Top Banner & Doctor Card Header */}
      <div className="bg-gradient-to-r from-slate-900 via-[#0a1829] to-[#0f2438] text-white p-6 rounded-3xl shadow-xl border border-white/10 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-[#00c2cb]/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 text-right">
            {/* Logo */}
            {doctorInfo.logoUrl ? (
              <img
                src={doctorInfo.logoUrl}
                alt="Clinic Logo"
                className="w-16 h-16 rounded-2xl object-contain bg-white/10 p-2 border border-white/20 shadow-md shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-[#00c2cb]/20 border border-[#00c2cb]/40 flex items-center justify-center text-[#00c2cb] shrink-0">
                <span className="material-symbols-outlined text-3xl">medical_services</span>
              </div>
            )}

            <div>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#00c2cb]/20 text-[#45dee7] border border-[#00c2cb]/30 inline-block mb-1">
                بوابة الحجز المباشر بالعيادة 🏥
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-white">{doctorInfo.name}</h1>
              <p className="text-xs text-[#00c2cb] font-bold mt-0.5">{doctorInfo.specialty}</p>
              <p className="text-[11px] text-slate-300 mt-0.5 leading-tight">{doctorInfo.credentials}</p>
            </div>
          </div>

          {/* Quick Contact Badge */}
          <div className="flex flex-col items-center sm:items-end text-center sm:text-left bg-white/5 p-3 px-4 rounded-2xl border border-white/10 text-xs shrink-0">
            <span className="text-[10px] text-slate-400 font-bold mb-0.5">للحجز والاستعلام مباشرة</span>
            <span className="font-mono text-sm font-bold text-[#45dee7]" dir="ltr">{doctorInfo.phone}</span>
            <span className="text-[10px] text-slate-300 mt-1 flex items-center gap-1">
              <span className="material-symbols-outlined text-emerald-400 text-xs">chat</span>
              واتساب متاح 24/7
            </span>
          </div>
        </div>
      </div>

      {/* Main Booking Card Container */}
      <div className="bg-slate-900/90 dark:bg-[#111A2E] p-6 sm:p-8 rounded-3xl border border-slate-700/60 dark:border-white/10 shadow-2xl backdrop-blur-md">
        <div className="flex items-center justify-between gap-3 mb-6 border-b border-slate-800 dark:border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#00c2cb]/20 text-[#00c2cb] flex items-center justify-center border border-[#00c2cb]/30">
              <span className="material-symbols-outlined text-xl">edit_calendar</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>نموذج حجز الكشف والزيارات</span>
              </h2>
              <p className="text-xs text-slate-400">سجّل موعدك بالعيادة واشترط الميعاد المطلوب لإرساله فوراً عبر واتساب</p>
            </div>
          </div>

          {onNavigateToAppointments && (
            <button
              type="button"
              onClick={onNavigateToAppointments}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">calendar_month</span>
              <span>جدول المواعيد</span>
            </button>
          )}
        </div>

        {/* The Form */}
        <form onSubmit={handleSendWhatsapp} className="space-y-6">
          {/* Row 1: Patient Name & Phone */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Patient Name */}
            <div>
              <label className="text-xs font-bold text-slate-200 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-[#00c2cb]">person</span>
                <span>اسم المريض *</span>
                <span className="text-[10px] font-normal text-slate-400">(ثلاثي أو رباعي)</span>
              </label>
              <input
                type="text"
                required
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder="مثال: أحمد سليمان محمد"
                className="w-full px-4 py-3 rounded-2xl bg-slate-950/80 dark:bg-[#080e1b] border border-slate-700 dark:border-white/10 text-white placeholder-slate-500 font-bold focus:outline-none focus:ring-2 focus:ring-[#00c2cb] transition-all"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="text-xs font-bold text-slate-200 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-[#00c2cb]">call</span>
                <span>رقم الهاتف *</span>
                <span className="text-[10px] font-normal text-slate-400">(لإرسال تذكير واتساب)</span>
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="مثال: 01012345678"
                className="w-full px-4 py-3 rounded-2xl bg-slate-950/80 dark:bg-[#080e1b] border border-slate-700 dark:border-white/10 text-white placeholder-slate-500 font-bold font-mono focus:outline-none focus:ring-2 focus:ring-[#00c2cb] transition-all"
                dir="ltr"
              />
            </div>
          </div>

          {/* Row 2: Date & Branch Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Date */}
            <div>
              <label className="text-xs font-bold text-slate-200 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-[#00c2cb]">calendar_month</span>
                <span>التاريخ المطلوب *</span>
              </label>
              <input
                type="date"
                required
                value={scheduledDate}
                onChange={(e) => {
                  setScheduledDate(e.target.value);
                  setSelectedTimeSlot('');
                }}
                className={`w-full px-4 py-3 rounded-2xl bg-slate-950/80 dark:bg-[#080e1b] border ${
                  isDateValid 
                    ? 'border-slate-700 dark:border-white/10 focus:ring-[#00c2cb]' 
                    : 'border-rose-500 ring-2 ring-rose-500/20 focus:ring-rose-500'
                } text-white font-bold font-mono focus:outline-none transition-all`}
              />
              
              {!isDateValid && (
                <div className="mt-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs">
                  <div className="flex items-center gap-1.5 font-bold mb-1.5">
                    <span className="material-symbols-outlined text-rose-400 text-sm">warning</span>
                    <span>عفواً، العيادة مغلقة في هذا اليوم.</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    الرجاء اختيار أحد الأيام المتاحة التالية للحجز مباشرة:
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {upcomingSuggestions.map((s) => (
                      <button
                        key={s.dateStr}
                        type="button"
                        onClick={() => {
                          setScheduledDate(s.dateStr);
                          setSelectedTimeSlot('');
                        }}
                        className="px-2.5 py-1.5 text-[10px] rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 transition-all cursor-pointer font-bold shrink-0"
                      >
                        {s.dayLabel}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Branch (مكان الكشف) */}
            <div>
              <label className="text-xs font-bold text-slate-200 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-[#00c2cb]">domain</span>
                <span>فرع العيادة (مكان الكشف) *</span>
              </label>
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-slate-950/80 dark:bg-[#080e1b] border border-slate-700 dark:border-white/10 text-white font-bold focus:outline-none focus:ring-2 focus:ring-[#00c2cb] transition-all cursor-pointer"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.workingHours ? b.workingHours : `من ${b.startTime || '16:00'} إلى ${b.endTime || '22:00'}`})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Branch Working Hours & Details Info Card */}
          {activeBranch && (
            <div className="p-4 rounded-2xl bg-slate-950/80 dark:bg-[#080e1b] border border-[#00c2cb]/30 text-xs space-y-2 shadow-inner">
              <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
                <div className="flex items-center gap-2 text-[#45dee7] font-bold">
                  <span className="material-symbols-outlined text-lg">storefront</span>
                  <span className="text-sm">{activeBranch.name}</span>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#00c2cb]/20 text-[#00c2cb] border border-[#00c2cb]/30">
                  مواعيد 15 دقيقة / مريض
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {activeBranch.workingHours && (
                  <div className="text-emerald-400 font-bold flex items-start gap-1.5">
                    <span className="material-symbols-outlined text-base text-emerald-400 shrink-0 mt-0.5">schedule</span>
                    <div>
                      <span className="text-slate-400 text-[10px] block font-normal">أيام وساعات العمل الرسمية:</span>
                      <span>{activeBranch.workingHours}</span>
                    </div>
                  </div>
                )}

                <div className="text-slate-200 flex items-start gap-1.5">
                  <span className="material-symbols-outlined text-base text-[#00c2cb] shrink-0 mt-0.5">nest_clock_frequence</span>
                  <div>
                    <span className="text-slate-400 text-[10px] block font-normal">فترة الكشوفات بالفرع:</span>
                    <span>من <strong className="text-white font-mono">{formatBranchTime(activeBranch.startTime || '16:00')}</strong> إلى <strong className="text-white font-mono">{formatBranchTime(activeBranch.endTime || '22:00')}</strong></span>
                  </div>
                </div>

                {activeBranch.address && (
                  <div className="text-slate-300 flex items-start gap-1.5">
                    <span className="material-symbols-outlined text-base text-slate-400 shrink-0 mt-0.5">location_on</span>
                    <div>
                      <span className="text-slate-400 text-[10px] block font-normal">عنوان العيادة:</span>
                      <span>{activeBranch.address}</span>
                    </div>
                  </div>
                )}

                {activeBranch.phone && (
                  <div className="text-slate-300 flex items-start gap-1.5">
                    <span className="material-symbols-outlined text-base text-slate-400 shrink-0 mt-0.5">call</span>
                    <div>
                      <span className="text-slate-400 text-[10px] block font-normal">رقم العيادة للحجز المباشر:</span>
                      <span className="font-mono text-[#45dee7] font-bold" dir="ltr">{activeBranch.phone}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Row 3: Available 15-minute Time Slots (Filtered against booked appointments) */}
          <div className="p-4.5 rounded-2xl bg-slate-950/60 dark:bg-[#080e1b]/60 border border-slate-800 dark:border-white/5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2">
              <div>
                <label className="text-xs font-bold text-slate-200 dark:text-slate-300 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base text-[#00c2cb]">schedule</span>
                  <span>المواعيد المتاحة (مقسمة 15 دقيقة لكل مريض) *</span>
                </label>
                <p className="text-[11px] text-slate-400 mt-0.5">المواعيد المحجوزة مسبقاً تُستبعد تلقائياً لمنع تضارب الحجوزات</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-teal-500/20 text-[#45dee7] border border-teal-500/30">
                  متاح {availableTimeSlots.length} موعد
                </span>
                {allTimeSlots.length - availableTimeSlots.length > 0 && (
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    تم حجز {allTimeSlots.length - availableTimeSlots.length} موعد
                  </span>
                )}
              </div>
            </div>

            {/* Time Slot Grid Selection */}
            {availableTimeSlots.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 pt-1">
                {availableTimeSlots.map((slot) => {
                  const isSelected = selectedTimeSlot === slot.label;
                  return (
                    <button
                      key={slot.raw}
                      type="button"
                      onClick={() => setSelectedTimeSlot(slot.label)}
                      className={`px-3 py-2.5 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer flex items-center justify-center gap-1 border ${
                        isSelected
                          ? 'bg-[#00c2cb] text-slate-950 border-[#00c2cb] shadow-md scale-105 font-black'
                          : 'bg-slate-900 dark:bg-[#111A2E] text-slate-300 hover:text-white hover:bg-slate-800 border-slate-700 dark:border-white/10'
                      }`}
                    >
                      <span className="material-symbols-outlined text-xs">{isSelected ? 'check_circle' : 'schedule'}</span>
                      <span>{slot.label}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-200 text-xs font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-lg text-rose-400">event_busy</span>
                <span>جميع مواعيد هذا الفرع محجوزة بالكامل في تاريخ ({scheduledDate}). يرجى اختيار تاريخ آخر أو فرع آخر.</span>
              </div>
            )}
          </div>

          {/* Row 4: Visit Type & Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Visit Type */}
            <div>
              <label className="text-xs font-bold text-slate-200 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-[#00c2cb]">medical_services</span>
                <span>نوع الموعد *</span>
              </label>
              <select
                value={visitType}
                onChange={(e) => setVisitType(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-slate-950/80 dark:bg-[#080e1b] border border-slate-700 dark:border-white/10 text-white font-bold focus:outline-none focus:ring-2 focus:ring-[#00c2cb] transition-all cursor-pointer"
              >
                {visitTypes.map((vt, index) => (
                  <option key={`${vt.id}-${index}`} value={vt.name}>
                    {vt.name} ({vt.fee} ج.م)
                  </option>
                ))}
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-bold text-slate-200 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-[#00c2cb]">edit_note</span>
                <span>ملاحظات الموعد</span>
                <span className="text-[10px] font-normal text-slate-400">(اختياري)</span>
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="مثال: متابعة قرحة المعدة، كشف مستعجل..."
                className="w-full px-4 py-3 rounded-2xl bg-slate-950/80 dark:bg-[#080e1b] border border-slate-700 dark:border-white/10 text-white placeholder-slate-500 font-bold focus:outline-none focus:ring-2 focus:ring-[#00c2cb] transition-all"
              />
            </div>
          </div>

          {/* Form Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800 dark:border-white/5">
            <button
              type="submit"
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2.5 shadow-xl transition-all cursor-pointer active:scale-95"
            >
              <span className="material-symbols-outlined text-xl">chat</span>
              <span>إرسال طلب الحجز عبر واتساب 💬</span>
            </button>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={handleCopyText}
                className="px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer border border-slate-700"
              >
                <span className="material-symbols-outlined text-base">{copiedText ? 'check' : 'content_copy'}</span>
                <span>{copiedText ? 'تم النسخ ✓' : 'نسخ نص الحجز'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* QR Code Sharing Box for Page */}
      <div className="bg-slate-900/60 dark:bg-[#111A2E]/60 p-5 rounded-3xl border border-slate-800 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 bg-white p-1 rounded-2xl border border-slate-300 shadow-sm shrink-0 flex items-center justify-center">
            <QrCodeImage
              qrType="custom"
              qrWhatsappPhone=""
              qrCustomUrl={bookingPageUrl}
              className="w-full h-full text-slate-950"
            />
          </div>
          <div>
            <span className="font-bold text-white block">رمز استجابة سريع (QR Code) للحجز المباشر</span>
            <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">
              يمكن للمرضى مسح هذا الرمز للكشف عن بوابة الحجز واختيار فرع وموعد الكشف مباشرة من هواتفهم.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(bookingPageUrl);
            setToastMessage('تم نسخ رابط صفحة الحجز للحافظة ✓');
            setTimeout(() => setToastMessage(null), 3000);
          }}
          className="px-4 py-2 rounded-xl bg-[#00c2cb]/15 hover:bg-[#00c2cb]/25 text-[#45dee7] font-bold border border-[#00c2cb]/30 transition-all cursor-pointer shrink-0"
        >
          نسخ رابط صفحة الحجز 🔗
        </button>
      </div>
    </div>
  );
};

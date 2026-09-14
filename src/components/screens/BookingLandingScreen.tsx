import React, { useState, useEffect, useMemo } from 'react';
import { 
  getClinicBranches, 
  generateBranchTimeSlots, 
  ClinicBranchItem, 
  formatBranchTime,
  isDateMatchingBranchDays,
  getNextValidWorkingDate,
  getUpcomingDateSuggestions,
  extractTimesFromWorkingHours
} from '../../utils/clinicBranches';
import { getPrescriptionDoctorInfo, PrescriptionDoctorInfo } from '../../utils/prescriptionDoctor';
import { getActiveVisitTypes } from '../../utils/financeManager';
import { AppointmentListItem } from '../../types';
import { QrCodeImage } from '../QrCodeImage';
import { safeStorage } from '../../services/storage';
import { db } from '../../services/firebase';
import { subscribeToPrescriptionSettings } from '../../services/repositories/settingsRepo';

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

function getMergedVisitTypesAndServices(): { id: string; name: string; fee: number }[] {
  const localVisitTypes = safeStorage.getJSON<any[]>('soli_visit_types', []) || [];
  const localServices = safeStorage.getJSON<any[]>('soli_services', []) || [];
  
  const map = new Map<string, { id: string; name: string; fee: number }>();
  
  // 1. Add visit types
  localVisitTypes.forEach((item, idx) => {
    if (item && item.name) {
      const name = item.name.trim();
      map.set(name, { id: item.id || `vt-${idx}`, name, fee: item.fee || item.price || 300 });
    }
  });

  // 2. Add services
  localServices.forEach((item, idx) => {
    if (item && item.name) {
      const name = item.name.trim();
      if (!map.has(name)) {
        map.set(name, { id: item.id || `srv-${idx}`, name, fee: item.price || item.fee || 300 });
      }
    }
  });

  // Fallback defaults if empty
  if (map.size === 0) {
    return [
      { id: 'vt-1', name: 'كشف جديد', fee: 300 },
      { id: 'vt-2', name: 'استشارة / متابعة', fee: 150 },
      { id: 'vt-3', name: 'كشف طوارئ', fee: 400 },
    ];
  }

  return Array.from(map.values());
}

export const BookingLandingScreen: React.FC<BookingLandingScreenProps> = ({
  onAddAppointment,
  onNavigateToAppointments,
  isEmbed = false,
}) => {
  const [doctorProfile, setDoctorProfile] = useState<PrescriptionDoctorInfo>(() => getPrescriptionDoctorInfo());
  const [branches, setBranches] = useState<ClinicBranchItem[]>(() => getClinicBranches());
  const [visitTypes, setVisitTypes] = useState<{ id: string; name: string; fee: number }[]>(() => getMergedVisitTypesAndServices());

  // Sync state with local changes and custom events
  useEffect(() => {
    const handleUpdate = () => {
      setVisitTypes(getMergedVisitTypesAndServices());
    };
    window.addEventListener('soli_visit_types_updated', handleUpdate);
    window.addEventListener('soli_services_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('soli_visit_types_updated', handleUpdate);
      window.removeEventListener('soli_services_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const doctorInfo = useMemo(() => {
    return {
      name: doctorProfile.doctorName,
      specialty: doctorProfile.specialtyAr,
      credentials: doctorProfile.degreesAr,
      phone: doctorProfile.phone,
      logoUrl: doctorProfile.logoUrl
    };
  }, [doctorProfile]);

  // Real-time Firestore subscription to fetch real doctor settings, clinic branches, visit types and services
  useEffect(() => {
    if (!db) return;

    const unsub = subscribeToPrescriptionSettings(
      db,
      (settings: any) => {
        if (settings && Object.keys(settings).length > 0) {
          // Sync with local storage as secondary backup
          localStorage.setItem('soli_prescription_settings', JSON.stringify(settings));

          // Set branches
          if (Array.isArray(settings.branches) && settings.branches.length > 0) {
            const mappedBranches = settings.branches.map((b: any, index: number) => {
              const parsed = extractTimesFromWorkingHours(b.workingHours);
              return {
                id: b.id || `branch-${index}`,
                name: b.name || `فرع ${index + 1}`,
                address: b.address || '',
                phone: b.phone || b.mobile || '',
                mobile: b.mobile || b.phone || '',
                workingHours: b.workingHours || '',
                startTime: b.startTime || parsed?.startTime || '16:00',
                endTime: b.endTime || parsed?.endTime || '22:00',
              };
            });
            setBranches(mappedBranches);
          }

          // Set doctor profile
          setDoctorProfile({
            doctorName: settings.doctorName?.trim() || 'طبيب العيادة',
            doctorNameEn: settings.doctorNameEn?.trim() || 'Clinic Doctor',
            specialtyAr: settings.specialtyAr?.trim() || 'التخصص الطبي العام للعيادة',
            specialtyEn: settings.specialtyEn?.trim() || 'Clinic Medical Specialty',
            degreesAr: settings.degreesAr?.trim() || 'الدرجات العلمية والشهادات المهنية المسجلة للعيادة',
            degreesEn: settings.degreesEn?.trim() || 'Registered Medical Degrees & Professional Credentials',
            phone: settings.phone?.trim() || '',
            logoUrl: settings.logoUrl || null,
          });
        }
      },
      (err) => console.warn('Public Booking Live Settings Sync Error:', err)
    );

    // Real-time Firestore subscription to fetch visit types
    let unsubVisitTypes = () => {};
    import('firebase/firestore').then(({ doc, onSnapshot }) => {
      unsubVisitTypes = onSnapshot(
        doc(db, 'settings', 'visitTypes'),
        (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            const items = (data.items || data.types || []) as any[];
            if (Array.isArray(items) && items.length > 0) {
              localStorage.setItem('soli_visit_types', JSON.stringify(items));
              window.dispatchEvent(new Event('soli_visit_types_updated'));
            }
          }
        },
        (err) => console.warn('Public Visit Types Sync Error:', err)
      );
    });

    // Real-time Firestore subscription to fetch services
    let unsubServices = () => {};
    import('firebase/firestore').then(({ collection, onSnapshot }) => {
      unsubServices = onSnapshot(
        collection(db, 'services'),
        (snap) => {
          const items: any[] = [];
          snap.forEach((docSnap) => {
            if (docSnap.exists()) {
              items.push({ id: docSnap.id, ...docSnap.data() });
            }
          });
          if (items.length > 0) {
            localStorage.setItem('soli_services', JSON.stringify(items));
            window.dispatchEvent(new Event('soli_services_updated'));
          }
        },
        (err) => console.warn('Public Services Sync Error:', err)
      );
    });

    return () => {
      unsub();
      unsubVisitTypes();
      unsubServices();
    };
  }, []);

  // Update branches dynamically if saved in Settings
  useEffect(() => {
    const handleUpdateBranches = () => {
      const updated = getClinicBranches();
      setBranches(updated);
      setDoctorProfile(getPrescriptionDoctorInfo());
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
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [visitType, setVisitType] = useState<string>('');
  const [notes, setNotes] = useState('');

  // Auto-select first visit type
  useEffect(() => {
    if (visitTypes.length > 0 && !visitType) {
      setVisitType(visitTypes[0].name);
    }
  }, [visitTypes, visitType]);

  // Auto-select first real branch once branches list is populated
  useEffect(() => {
    if (branches.length > 0) {
      const exists = branches.some(b => b.id === selectedBranchId);
      if (!selectedBranchId || !exists) {
        setSelectedBranchId(branches[0].id);
      }
    }
  }, [branches, selectedBranchId]);

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

      {/* Sleek, Single-Row Doctor Header (صف واحد صغير ومنسق) */}
      <div className="bg-gradient-to-r from-slate-950 via-[#0a1829] to-[#0f2438] text-white p-3.5 sm:p-4 rounded-2xl shadow-lg border border-white/10 relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Background shine */}
        <div className="absolute top-0 left-0 w-32 h-32 bg-[#00c2cb]/5 rounded-full blur-2xl pointer-events-none"></div>

        {/* Doctor Info and Logo Group */}
        <div className="relative z-10 flex items-center gap-3 w-full sm:w-auto text-right">
          {/* Logo */}
          {doctorInfo.logoUrl ? (
            <img
              src={doctorInfo.logoUrl}
              alt="Clinic Logo"
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl object-contain bg-white/5 p-1 border border-white/10 shadow-md shrink-0"
            />
          ) : null}

          <div className="flex flex-col justify-center">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-sm sm:text-base font-black text-white">{doctorInfo.name}</h1>
              <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-[#00c2cb]/15 text-[#45dee7] border border-[#00c2cb]/20">
                {doctorInfo.specialty}
              </span>
            </div>
            {doctorInfo.credentials && (
              <p className="text-[10px] text-slate-300 mt-0.5 max-w-md line-clamp-1">
                {doctorInfo.credentials}
              </p>
            )}
          </div>
        </div>

        {/* Quick Contact & WhatsApp Pill */}
        <div className="relative z-10 flex items-center gap-2 sm:gap-3 bg-white/5 hover:bg-white/10 border border-white/10 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 w-full sm:w-auto justify-between sm:justify-start">
          <span className="text-[10px] text-slate-400 font-bold">للحجز والاستعلام مباشرة:</span>
          <a href={`tel:${doctorInfo.phone}`} className="font-mono text-xs font-black text-[#45dee7] hover:underline" dir="ltr">
            {doctorInfo.phone}
          </a>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
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

          {/* Branch Working Hours & Details Info Card (Slim horizontal metadata row) */}
          {activeBranch && (
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3 px-4 rounded-2xl bg-slate-950/60 dark:bg-[#080e1b]/60 border border-[#00c2cb]/20 text-xs text-slate-300 shadow-inner">
              {/* Branch Name Header */}
              <div className="flex items-center gap-2 text-[#45dee7] font-bold shrink-0">
                <span className="material-symbols-outlined text-base">storefront</span>
                <span>{activeBranch.name}</span>
              </div>

              {/* Inline Metadata Grid */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11px] text-slate-300">
                {activeBranch.workingHours && (
                  <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                    <span className="material-symbols-outlined text-sm">schedule</span>
                    <span>{activeBranch.workingHours}</span>
                  </div>
                )}

                <div className="flex items-center gap-1.5 text-slate-300">
                  <span className="material-symbols-outlined text-sm text-[#00c2cb]">nest_clock_frequence</span>
                  <span>الكشوفات: <strong className="font-mono text-white font-bold">{formatBranchTime(activeBranch.startTime || '16:00')}</strong> إلى <strong className="font-mono text-white font-bold">{formatBranchTime(activeBranch.endTime || '22:00')}</strong></span>
                </div>

                {activeBranch.address && (
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <span className="material-symbols-outlined text-sm">location_on</span>
                    <span className="max-w-[180px] sm:max-w-xs truncate" title={activeBranch.address}>{activeBranch.address}</span>
                  </div>
                )}

                {activeBranch.phone && (
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <span className="material-symbols-outlined text-sm">call</span>
                    <span className="font-mono text-[#45dee7] font-bold" dir="ltr">{activeBranch.phone}</span>
                  </div>
                )}
              </div>

              {/* Quick Badge */}
              <span className="hidden sm:inline-block text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#00c2cb]/10 text-[#00c2cb] border border-[#00c2cb]/20 shrink-0">
                ١٥ دقيقة / مريض
              </span>
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
                    {vt.name}
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

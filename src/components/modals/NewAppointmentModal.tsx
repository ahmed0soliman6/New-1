import React, { useState, useMemo } from 'react';
import { AppointmentListItem } from '../../types';
import { getClinicBranches, isDateMatchingBranchDays } from '../../utils/clinicBranches';
import { toDayKey } from '../../utils/dayKey';

/** يحوّل وقتاً بصيغة 24 ساعة أو عربية (04:00 م) إلى دقائق منذ منتصف الليل. */
function parseTimeToMinutes(timeStr?: string): number | null {
  if (!timeStr) return null;
  const s = timeStr.trim();
  const isPM = s.includes('م') || /pm/i.test(s);
  const isAM = s.includes('ص') || /am/i.test(s);
  const digits = s.replace(/[^\d:]/g, '');
  const parts = digits.split(':');
  let h = parseInt(parts[0], 10);
  const m = parts.length > 1 ? parseInt(parts[1], 10) : 0;
  if (isNaN(h) || isNaN(m)) return null;
  if (isPM && h < 12) h += 12;
  if (isAM && h === 12) h = 0;
  return h * 60 + m;
}

/** يوحّد وقتاً (24 ساعة أو عربي) إلى صيغة HH:MM الصالحة لحقل time. */
function normalizeTimeInput(timeStr?: string, fallback = '16:00'): string {
  const mins = parseTimeToMinutes(timeStr);
  if (mins === null) return fallback;
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** هل الوقت داخل دوام الفرع؟ (وقت الإغلاق نفسه غير قابل للحجز) */
function isTimeWithinBranchHours(timeStr: string, branch?: { startTime?: string; endTime?: string }): boolean {
  if (!branch) return true;
  const t = parseTimeToMinutes(timeStr);
  let start = parseTimeToMinutes(branch.startTime) ?? 16 * 60;
  let end = parseTimeToMinutes(branch.endTime) ?? 22 * 60;
  if (t === null) return false;
  if (end <= start) end += 24 * 60; // فروع ليلية تعبر منتصف الليل
  let tt = t;
  if (tt < start) tt += 24 * 60;
  return tt >= start && tt < end;
}

interface NewAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddAppointment: (app: AppointmentListItem) => void;
  visitTypesList?: { id: string; name: string; fee: number }[];
}

export const NewAppointmentModal: React.FC<NewAppointmentModalProps> = ({
  isOpen,
  onClose,
  onAddAppointment,
  visitTypesList = [],
}) => {
  const activeVisitTypes = useMemo(() => {
    const raw = (visitTypesList && visitTypesList.length > 0)
      ? visitTypesList
      : [
          { id: 'vt-1', name: 'كشف جديد', fee: 300 },
          { id: 'vt-2', name: 'استشارة / متابعة', fee: 150 },
          { id: 'vt-3', name: 'كشف طوارئ', fee: 400 },
        ];
    const uniqueMap = new Map<string, { id: string; name: string; fee: number }>();
    raw.forEach((item, index) => {
      const key = item.id || `vt-${index}-${item.name}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, item);
      }
    });
    return Array.from(uniqueMap.values());
  }, [visitTypesList]);

  const clinicBranches = useMemo(() => getClinicBranches(), []);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  // د7: التاريخ الافتراضي بتوقيت القاهرة (toDayKey) لا UTC — toISOString كان
  // يفتح على «أمس» بين منتصف الليل و02:00 صباحاً.
  const [appointmentDate, setAppointmentDate] = useState(() => toDayKey());
  // د7: الوقت الافتراضي هو وقت فتح الفرع الأول، لا 14:30 الثابتة (خارج الدوام).
  const [timeSlot, setTimeSlot] = useState(() => normalizeTimeInput(clinicBranches[0]?.startTime));
  const [branch, setBranch] = useState(() => clinicBranches[0]?.name || 'الفرع الرئيسي - المهندسين');
  const [visitType, setVisitType] = useState(() => activeVisitTypes[0]?.name || 'كشف جديد');
  const [fee, setFee] = useState(() => activeVisitTypes[0]?.fee ?? 300);

  // Sync if visitTypesList updates
  React.useEffect(() => {
    if (activeVisitTypes.length > 0 && !activeVisitTypes.some((vt) => vt.name === visitType)) {
      setVisitType(activeVisitTypes[0].name);
      setFee(activeVisitTypes[0].fee);
    }
  }, [activeVisitTypes, visitType]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      alert('يرجى إدخال اسم المريض ورقم الهاتف');
      return;
    }

    // د7: نفس فحوصات النموذج المضمّن — لا حجز في تاريخ ماضٍ، ولا في يوم مغلق
    // للفرع، ولا خارج ساعات عمل الفرع.
    const todayKey = toDayKey();
    if (!appointmentDate || appointmentDate < todayKey) {
      alert('لا يمكن حجز موعد في تاريخ ماضٍ. اختر تاريخ اليوم أو تاريخاً قادماً.');
      return;
    }
    const selectedBranch = clinicBranches.find((b) => b.name === branch) || clinicBranches[0];
    if (selectedBranch && !isDateMatchingBranchDays(appointmentDate, selectedBranch.workingHours)) {
      alert(`العيادة مغلقة في هذا اليوم بفرع "${selectedBranch.name}". اختر يوم عمل آخر.`);
      return;
    }
    if (selectedBranch && !isTimeWithinBranchHours(timeSlot, selectedBranch)) {
      alert(
        `الوقت المختار خارج ساعات عمل فرع "${selectedBranch.name}" (${normalizeTimeInput(selectedBranch.startTime)} - ${normalizeTimeInput(selectedBranch.endTime, '22:00')}). اختر وقتاً داخل الدوام.`
      );
      return;
    }

    // Format time slot nicely
    let formattedTime = timeSlot;
    if (timeSlot && timeSlot.includes(':')) {
      const parts = timeSlot.split(':');
      const hour = parseInt(parts[0], 10);
      const minutes = parts[1];
      const period = hour >= 12 ? 'م' : 'ص';
      const displayHour = hour % 12 === 0 ? 12 : hour % 12;
      formattedTime = `${String(displayHour).padStart(2, '0')}:${minutes} ${period}`;
    }

    const selectedVt = activeVisitTypes.find((vt) => vt.name === visitType);
    const finalFee = selectedVt ? selectedVt.fee : fee;

    const newApp: AppointmentListItem = {
      id: `app-${Date.now()}`,
      patientName: name.trim(),
      medicalCode: `EG-${Math.floor(Math.random() * 90000) + 10000}`,
      phone: phone.trim(),
      timeSlot: formattedTime,
      time: formattedTime,
      date: appointmentDate,
      visitType,
      expectedFee: finalFee,
      branch,
      status: 'مجدول',
    };

    onAddAppointment(newApp);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#18233C] border border-[#00c2cb]/40 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#00c2cb] text-xl">calendar_add_on</span>
            <h3 className="text-base font-bold text-[#dde2f5]">حجز موعد عيادة مسبق</h3>
          </div>
          <button onClick={onClose} className="text-[#859394] hover:text-white cursor-pointer">
            ✕
          </button>
        </div>

        <p className="text-xs text-[#bbc9ca]">
          هذا الحجز يدرج المريض في جدول مواعيد اليوم بحالة «مجدول» ولا يخصم أو يورد أي مبالغ حتى وصول المريض للاستقبال.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-[#dde2f5] font-bold block mb-1">اسم المريض:</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: يوسف أحمد عبد الرحمن"
              className="w-full bg-[#080e1b] text-[#dde2f5] text-xs p-2.5 rounded-xl border border-white/10 focus:outline-none focus:ring-1 focus:ring-[#00c2cb]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-[#dde2f5] font-bold block mb-1">رقم الهاتف:</label>
              <input
                type="tel"
                required
                dir="ltr"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="010xxxxxxxx"
                className="w-full bg-[#080e1b] text-[#dde2f5] text-xs p-2.5 rounded-xl border border-white/10 font-mono focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs text-[#dde2f5] font-bold block mb-1 flex items-center justify-between">
                <span>التاريخ:</span>
                <span className="text-[10px] text-[#00c2cb]">التقويم</span>
              </label>
              <div className="relative flex items-center">
                <input
                  type="date"
                  required
                  min={toDayKey()}
                  value={appointmentDate}
                  onChange={(e) => setAppointmentDate(e.target.value)}
                  onClick={(e) => {
                    try {
                      (e.currentTarget as any).showPicker?.();
                    } catch {}
                  }}
                  className="w-full bg-[#080e1b] text-[#dde2f5] text-xs p-2.5 pl-9 rounded-xl border border-white/10 font-mono focus:outline-none cursor-pointer font-bold"
                  title="انقر لفتح التقويم"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    const input = e.currentTarget.parentElement?.querySelector('input[type="date"]') as any;
                    try { input?.showPicker?.(); } catch { input?.focus(); }
                  }}
                  className="absolute left-1.5 w-6 h-6 rounded bg-[#00c2cb]/20 text-[#00c2cb] flex items-center justify-center cursor-pointer border border-[#00c2cb]/30"
                  title="فتح التقويم"
                >
                  <span className="material-symbols-outlined text-sm">calendar_month</span>
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs text-[#dde2f5] font-bold block mb-1 flex items-center justify-between">
                <span>الوقت:</span>
                <span className="text-[10px] text-[#00c2cb]">الساعة</span>
              </label>
              <div className="relative flex items-center">
                <input
                  type="time"
                  required
                  value={timeSlot}
                  onChange={(e) => setTimeSlot(e.target.value)}
                  onClick={(e) => {
                    try {
                      (e.currentTarget as any).showPicker?.();
                    } catch {}
                  }}
                  className="w-full bg-[#080e1b] text-[#dde2f5] text-xs p-2.5 pl-9 rounded-xl border border-white/10 font-mono focus:outline-none cursor-pointer font-bold"
                  title="انقر لفتح الساعة"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    const input = e.currentTarget.parentElement?.querySelector('input[type="time"]') as any;
                    try { input?.showPicker?.(); } catch { input?.focus(); }
                  }}
                  className="absolute left-1.5 w-6 h-6 rounded bg-[#00c2cb]/20 text-[#00c2cb] flex items-center justify-center cursor-pointer border border-[#00c2cb]/30"
                  title="فتح الساعة"
                >
                  <span className="material-symbols-outlined text-sm">schedule</span>
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[#dde2f5] font-bold block mb-1">الفرع:</label>
              <select
                value={branch}
                onChange={(e) => {
                  const val = e.target.value;
                  setBranch(val);
                  // د7: عند تغيير الفرع، إن كان الوقت الحالي خارج دوامه أعد ضبطه
                  // على وقت فتح الفرع الجديد.
                  const nextBranch = clinicBranches.find((b) => b.name === val);
                  if (nextBranch && !isTimeWithinBranchHours(timeSlot, nextBranch)) {
                    setTimeSlot(normalizeTimeInput(nextBranch.startTime));
                  }
                }}
                className="w-full bg-[#080e1b] text-[#dde2f5] text-xs p-2.5 rounded-xl border border-white/10 focus:outline-none cursor-pointer font-medium"
              >
                {clinicBranches.map((b) => (
                  <option key={b.id || b.name} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-[#dde2f5] font-bold block mb-1 flex items-center justify-between">
                <span>نوع الكشف:</span>
                <span className="text-[10px] text-[#00c2cb]">الإعدادات</span>
              </label>
              <select
                value={visitType}
                onChange={(e) => {
                  const val = e.target.value;
                  setVisitType(val);
                  const found = activeVisitTypes.find((vt) => vt.name === val);
                  if (found) setFee(found.fee);
                }}
                className="w-full bg-[#080e1b] text-[#dde2f5] text-xs p-2.5 rounded-xl border border-white/10 focus:outline-none cursor-pointer font-bold"
              >
                {activeVisitTypes.map((vt, index) => (
                  <option key={`${vt.id}-${index}`} value={vt.name}>
                    {vt.name} ({vt.fee} ج.م)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#111A2E] text-xs text-[#bbc9ca] hover:bg-[#242a38] cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-[#00c2cb] hover:bg-[#45dee7] text-[#08101C] font-bold text-xs shadow-md shadow-[#00c2cb]/20 transition-all cursor-pointer"
            >
              تأكيد إضافة الموعد
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

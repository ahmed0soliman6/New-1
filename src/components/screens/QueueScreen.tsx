import React, { useState, useEffect } from 'react';
import { QueueItem, ScreenType } from '../../types';
import { usePermissions } from '../../context/AuthContext';

interface QueueScreenProps {
  queue: QueueItem[];
  onCallPatient: (ticket: string, name: string) => void;
  onNavigate: (screen: ScreenType) => void;
}

export const QueueScreen: React.FC<QueueScreenProps> = ({ queue, onCallPatient, onNavigate }) => {
  const { canAccess } = usePermissions();
  const [filter, setFilter] = useState<'all' | 'new' | 'consult' | 'urgent'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [timerSeconds, setTimerSeconds] = useState(14 * 60 + 35);
  const [announcementModal, setAnnouncementModal] = useState<{ title: string; desc: string } | null>(null);
  const [currentTvTicket, setCurrentTvTicket] = useState('#08');
  const [currentTvPatient, setCurrentTvPatient] = useState('أحمد محمد إبراهيم');

  // Examination room timer ticker
  useEffect(() => {
    const interval = setInterval(() => {
      setTimerSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTimer = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const triggerBroadcast = (title: string, desc: string) => {
    setAnnouncementModal({ title, desc });
    setTimeout(() => setAnnouncementModal(null), 4500);
  };

  const filteredQueue = queue.filter((item) => {
    if (!item) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const pName = (item.patientName || '').toLowerCase();
      const pTicket = (item.ticketNumber || '').toLowerCase();
      if (!pName.includes(q) && !pTicket.includes(q)) {
        return false;
      }
    }
    if (filter === 'new') return (item.visitType || '').includes('جديد');
    if (filter === 'consult') return (item.visitType || '').includes('استشارة') || (item.visitType || '').includes('متابعة');
    if (filter === 'urgent') return !!item.isUrgent;
    return true;
  });

  const nextPatient = filteredQueue[0];

  return (
    <div className="flex flex-col w-full pb-16 space-y-6 text-[#dde2f5]">
      {/* Top HUD / Ambient KPI Bar */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Active Examination State Card */}
        <div className="lg:col-span-2 relative overflow-hidden rounded-2xl bg-[#18233C] p-4 shadow-xl border border-[#00c2cb]/30 flex flex-col justify-between">
          <div className="absolute -left-12 -top-12 w-44 h-44 rounded-full bg-[#00c2cb]/10 blur-3xl pointer-events-none"></div>
          <div className="flex items-center justify-between z-10">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00c2cb] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-[#00c2cb]"></span>
              </span>
              <span className="text-xs font-bold text-[#45dee7]">غرفة الفحص 1 - كشف جاري</span>
            </div>
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#080e1b] text-[#00c2cb] font-mono text-xs font-bold border border-white/5">
              <span className="material-symbols-outlined text-sm animate-spin" style={{ animationDuration: '6s' }}>
                timer
              </span>
              <span>{formatTimer(timerSeconds)}</span>
            </div>
          </div>

          <div className="my-2 z-10 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-[#dde2f5]">{currentTvPatient}</span>
                <span className="px-2 py-0.5 rounded-full bg-[#00c2cb]/20 text-[#45dee7] text-[11px] font-semibold">
                  كشف باطنة وقائي
                </span>
              </div>
              <p className="text-xs text-[#bbc9ca] mt-0.5">
                الطبيب المعالج: <strong className="text-[#dde2f5]">د. حازم القاضي</strong> • تذكرة {currentTvTicket}
              </p>
            </div>
            {canAccess('clinical-exam') && (
              <button
                onClick={() => onNavigate('clinical-exam')}
                className="px-3 py-1.5 rounded-xl bg-[#111A2E] hover:bg-[#242a38] text-[#dde2f5] text-xs font-semibold flex items-center gap-1 border border-white/5 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">clinical_notes</span>
                <span>ملف الكشف</span>
              </button>
            )}
          </div>

          <div className="z-10 flex items-center justify-between pt-2 bg-[#080e1b]/60 px-3 py-1.5 rounded-xl text-xs border border-white/5">
            <span className="text-[#bbc9ca]">الشكوى: آلام متكررة بالصدر وصعوبة تنفس</span>
            <span className="text-[#38BDF8] font-mono font-semibold">مستمر منذ 14 دقيقة</span>
          </div>
        </div>

        {/* Total In Clinic */}
        <div className="rounded-2xl bg-[#111A2E] p-4 shadow-md border border-white/5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#bbc9ca]">
            <span className="text-xs font-bold">الحالات بالعيادة الآن</span>
            <div className="w-8 h-8 rounded-lg bg-[#18233C] text-[#00c2cb] flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">groups</span>
            </div>
          </div>
          <div className="flex items-baseline gap-2 my-1">
            <span className="text-3xl font-extrabold text-[#dde2f5] font-mono">5</span>
            <span className="text-xs text-[#859394]">مرضى حاضرين</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#859394]">
            <span className="w-2 h-2 rounded-full bg-[#00c2cb]"></span>
            <span>1 بالغرفة</span>
            <span>•</span>
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span>4 بالانتظار</span>
          </div>
        </div>

        {/* Breakdown */}
        <div className="rounded-2xl bg-[#111A2E] p-4 shadow-md border border-white/5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#bbc9ca]">
            <span className="text-xs font-bold">توزيع الطابور</span>
            <div className="w-8 h-8 rounded-lg bg-[#18233C] text-[#d0bcff] flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">pie_chart</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 my-1">
            <div className="p-1.5 rounded-lg bg-[#080e1b] text-center border border-white/5">
              <span className="block text-xl font-bold text-[#00c2cb] font-mono">3</span>
              <span className="text-[10px] text-[#859394]">كشف جديد</span>
            </div>
            <div className="p-1.5 rounded-lg bg-[#080e1b] text-center border border-white/5">
              <span className="block text-xl font-bold text-[#d0bcff] font-mono">2</span>
              <span className="text-[10px] text-[#859394]">استشارة/متابعة</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-[#859394]">
            <span>السعة اليومية</span>
            <span className="font-bold text-[#dde2f5] font-mono">18 / 25 كشف</span>
          </div>
        </div>

        {/* Wait Time Metric */}
        <div className="rounded-2xl bg-[#111A2E] p-4 shadow-md border border-white/5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#bbc9ca]">
            <span className="text-xs font-bold">متوسط زمن الانتظار</span>
            <div className="w-8 h-8 rounded-lg bg-[#18233C] text-[#38BDF8] flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">avg_pace</span>
            </div>
          </div>
          <div className="flex items-baseline gap-1 my-1">
            <span className="text-3xl font-extrabold text-[#dde2f5] font-mono">16</span>
            <span className="text-sm text-[#bbc9ca]">دقيقة</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-[#10B981]">
            <span className="material-symbols-outlined text-sm">trending_down</span>
            <span>أسرع بـ 4 دقائق مقارنة بالأمس</span>
          </div>
        </div>
      </section>

      {/* Filter & Search Bar */}
      <section className="p-3 rounded-2xl bg-[#111A2E] shadow-md flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 border border-white/5">
        <div className="relative flex-1 max-w-xl">
          <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[#859394] text-lg">
            person_search
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ابحث باسم المريض، رقم التذكرة (#09)، أو رقم الهاتف..."
            className="w-full bg-[#080e1b] text-[#dde2f5] placeholder:text-[#859394] pr-10 pl-4 py-2 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#00c2cb] border border-white/5"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center p-1 rounded-xl bg-[#080e1b] border border-white/5">
            {[
              { id: 'all', label: 'الكل (4)' },
              { id: 'new', label: 'كشف جديد (2)' },
              { id: 'consult', label: 'استشارة / تحاليل (2)' },
              { id: 'urgent', label: 'طوارئ (0)' },
            ].map((b) => (
              <button
                key={b.id}
                onClick={() => setFilter(b.id as any)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  filter === b.id
                    ? 'bg-[#00c2cb] text-[#08101C] font-bold shadow'
                    : 'text-[#bbc9ca] hover:text-white'
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => triggerBroadcast('نداء عام لصالة الانتظار', 'يرجى من جميع الحالات مراقبة شاشة العرض')}
            className="px-3.5 py-2 rounded-xl bg-[#18233C] hover:bg-[#242a38] text-[#d0bcff] text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border border-white/5"
          >
            <span className="material-symbols-outlined text-base">campaign</span>
            <span>نداء شاشة الصالة</span>
          </button>
        </div>
      </section>

      {/* Main Grid: Queue List (8 Cols) + Sidebar Telemetry (4 Cols) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Queue List (8 Cols) */}
        <div className="lg:col-span-8 flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#00c2cb] text-xl">format_list_numbered_rtl</span>
              <h2 className="text-lg font-bold text-[#dde2f5]">طابور الانتظار الفعلي</h2>
              <span className="px-2 py-0.5 rounded-full bg-[#18233C] text-[#00c2cb] font-mono text-xs font-bold">
                {filteredQueue.length} بالانتظار
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[#859394]">
              <span className="w-2 h-2 rounded-full bg-[#10B981]"></span>
              <span>تحديث مباشر متزامن مع شاشة الغرفة</span>
            </div>
          </div>

          {/* Spotlight Next Patient Card */}
          {nextPatient ? (
            <div className="relative rounded-2xl bg-gradient-to-br from-[#18233C] via-[#111A2E] to-[#080e1b] p-5 shadow-2xl border border-[#00c2cb]/40 overflow-hidden">
              <div className="absolute right-0 top-0 bottom-0 w-2 bg-[#00c2cb]"></div>
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 z-10">
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-[#00c2cb] text-[#08101C] font-mono font-bold text-xs shadow-md">
                      {nextPatient.ticketNumber || '#01'} التالي
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-amber-400/10 text-amber-300 text-xs font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                      في صالة الانتظار
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-[#00c2cb]/15 text-[#45dee7] text-xs">
                      {nextPatient.visitType || 'كشف'}
                    </span>
                    <span className="text-xs text-[#859394] font-mono">
                      حضور: {nextPatient.arrivalTime || 'الآن'} (منذ {nextPatient.elapsedMinutes || 0} دقيقة)
                    </span>
                  </div>

                  <div className="pt-1">
                    <h3 className="text-xl font-bold text-[#dde2f5]">{nextPatient.patientName || 'مريض بالانتظار'}</h3>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-[#bbc9ca] mt-1">
                      <span dir="ltr" className="font-mono">{nextPatient.phone || 'بدون هاتف'}</span>
                      <span>•</span>
                      <span>السن: {nextPatient.age || 35} سنة</span>
                      <span>•</span>
                      <span className="text-[#10B981] font-semibold">
                        مدفوع بالكامل: {nextPatient.paidAmount || 0} ج.م ({nextPatient.paymentMethod || 'نقدي'})
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#080e1b]/80 border border-white/5 text-xs text-[#bbc9ca] flex items-start gap-2">
                    <span className="material-symbols-outlined text-[#00c2cb] text-base shrink-0 mt-0.5">
                      stethoscope
                    </span>
                    <div>
                      <span className="font-bold text-[#dde2f5]">الشكوى المبدئية عند الاستقبال: </span>
                      <span>{nextPatient.complaint || 'كشف عيادة باطنة'}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 min-w-[200px] justify-center shrink-0">
                  <button
                    onClick={() => {
                      const tNum = nextPatient.ticketNumber || '#01';
                      const pName = nextPatient.patientName || 'مريض';
                      setCurrentTvTicket(tNum);
                      setCurrentTvPatient(pName);
                      onCallPatient(tNum, pName);
                      triggerBroadcast(`استدعاء دور ${tNum}`, `يرجى من المريض (${pName}) التوجه للغرفة`);
                    }}
                    className="w-full py-3 px-4 rounded-xl bg-[#00c2cb] hover:bg-[#45dee7] text-[#08101C] font-bold text-xs shadow-lg shadow-[#00c2cb]/20 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
                  >
                    <span className="material-symbols-outlined text-xl">door_open</span>
                    <span>استدعاء ودخول الغرفة</span>
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        const tNum = nextPatient.ticketNumber || '#01';
                        const pName = nextPatient.patientName || 'مريض';
                        triggerBroadcast(`نداء صوتي: ${tNum}`, `نداء صوتي للمريض ${pName}`);
                      }}
                      className="py-2 px-2 rounded-xl bg-[#571bc1]/60 hover:bg-[#571bc1] text-[#e9ddff] text-xs font-medium flex items-center justify-center gap-1 transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base">volume_up</span>
                      <span>نداء صوتي</span>
                    </button>
                    <button
                      onClick={() => alert(`تم تأجيل دور ${nextPatient.ticketNumber || '#01'}`)}
                      className="py-2 px-2 rounded-xl bg-[#18233C] hover:bg-[#242a38] text-[#bbc9ca] hover:text-white text-xs font-medium flex items-center justify-center gap-1 transition-all cursor-pointer border border-white/5"
                    >
                      <span className="material-symbols-outlined text-base">low_priority</span>
                      <span>تأجيل</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-[#111A2E]/60 p-8 border border-white/5 text-center text-sm text-[#bbc9ca]">
              لا يوجد مرضى حالياً في طابور الانتظار
            </div>
          )}

          {/* Remaining queue items */}
          <div className="space-y-3">
            {filteredQueue.slice(1).map((item) => (
              <div
                key={item.id}
                className="rounded-2xl bg-[#111A2E] p-4 shadow-md border border-white/5 hover:bg-[#18233C] transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-12 h-12 rounded-xl bg-[#18233C] border border-white/5 flex flex-col items-center justify-center">
                    <span className="text-[10px] text-[#859394]">دور</span>
                    <span className="text-base font-bold font-mono text-[#d0bcff]">{item.ticketNumber || '#02'}</span>
                  </div>
                  <div className="space-y-1 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-bold text-[#dde2f5]">{item.patientName || 'مريض بالانتظار'}</h4>
                      <span className="px-2 py-0.5 rounded-full bg-[#571bc1]/30 text-[#d0bcff] text-[11px]">
                        {item.visitType || 'كشف'}
                      </span>
                      <span className="text-xs text-[#859394] font-mono">وصول منذ {item.elapsedMinutes || 0} دقيقة</span>
                    </div>
                    <p className="text-xs text-[#bbc9ca]">
                      <span dir="ltr" className="font-mono">{item.phone || 'بدون هاتف'}</span>
                      <span className="mx-2">•</span>
                      <span className="text-[#10B981] font-mono">سداد: {item.paidAmount || 0} ج.م ({item.paymentMethod || 'نقدي'})</span>
                    </p>
                    <p className="text-[11px] text-[#859394]">{item.complaint || 'كشف'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center">
                  <button
                    onClick={() => triggerBroadcast(`نداء: ${item.ticketNumber || ''}`, `يرجى من ${item.patientName || 'المريض'} التوجه للاستقبال`)}
                    className="p-2 rounded-xl bg-[#18233C] hover:bg-[#242a38] text-[#d0bcff] transition-all cursor-pointer"
                    title="نداء صوتي"
                  >
                    <span className="material-symbols-outlined text-base">campaign</span>
                  </button>
                  <button
                    onClick={() => {
                      const tNum = item.ticketNumber || '#02';
                      const pName = item.patientName || 'مريض';
                      setCurrentTvTicket(tNum);
                      setCurrentTvPatient(pName);
                      triggerBroadcast(`دخول الغرفة: ${tNum}`, `تم إدخال ${pName}`);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-[#00c2cb]/15 hover:bg-[#00c2cb]/30 text-[#45dee7] border border-[#00c2cb]/30 text-xs font-bold transition-all cursor-pointer"
                  >
                    إدخال
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar Telemetry & Fast Actions (4 Cols) */}
        <div className="lg:col-span-4 flex flex-col space-y-4">
          {/* Waiting Room TV Simulator Box */}
          <div className="rounded-2xl bg-[#111A2E] p-4 shadow-xl border border-white/5 flex flex-col space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#d0bcff] text-xl">tv</span>
                <span className="text-sm font-bold text-[#dde2f5]">شاشة صالة الانتظار</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-[#10B981]/20 text-[#10B981] text-xs font-mono font-bold">
                متصلة • HDMI-1
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#080e1b] flex flex-col items-center justify-center text-center space-y-1 border border-white/5">
              <div className="text-[11px] text-[#859394]">يُعرض الآن على شاشة صالة المرضى:</div>
              <div className="font-mono text-4xl font-extrabold text-[#45dee7] tracking-widest my-1">
                {currentTvTicket}
              </div>
              <div className="text-base font-bold text-[#dde2f5]">{currentTvPatient}</div>
              <div className="text-xs text-[#00c2cb]">تفضل بالدخول إلى غرفة الكشف (1)</div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => triggerBroadcast(`إعادة النداء ${currentTvTicket}`, `يرجى من ${currentTvPatient} الدخول`)}
                className="py-2 px-2 rounded-xl bg-[#18233C] hover:bg-[#242a38] text-[#dde2f5] text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer border border-white/5"
              >
                <span className="material-symbols-outlined text-base">replay</span>
                <span>إعادة نداء {currentTvTicket}</span>
              </button>
              <button
                onClick={() => triggerBroadcast('تنبيه عام بالصالة', 'تم بث جرس التنبيه')}
                className="py-2 px-2 rounded-xl bg-[#571bc1]/50 hover:bg-[#571bc1] text-[#e9ddff] text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">volume_up</span>
                <span>بث تنبيه عام</span>
              </button>
            </div>
          </div>

          {/* Instant Desk Actions */}
          <div className="rounded-2xl bg-[#111A2E] p-4 shadow-md border border-white/5 space-y-3">
            <h3 className="text-sm font-bold text-[#dde2f5] flex items-center gap-2">
              <span className="material-symbols-outlined text-[#00c2cb] text-lg">flash_on</span>
              <span>إجراءات الاستقبال الفورية</span>
            </h3>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => onNavigate('new-visit')}
                className="w-full p-3 rounded-xl bg-[#00c2cb] hover:bg-[#45dee7] text-[#08101C] font-bold text-xs shadow-md shadow-[#00c2cb]/20 flex items-center justify-between transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg">person_add</span>
                  <span>تسجيل مريض حاضر فوراً</span>
                </div>
                <span className="text-[10px] font-mono bg-[#08101C]/20 px-2 py-0.5 rounded">F2</span>
              </button>

              <button
                onClick={() => triggerBroadcast('إدخال حالة حرجة طارئة', 'تم تجاوز الدور وإدخال الحالة الطارئة فوراً')}
                className="w-full p-3 rounded-xl bg-[#ef4444]/20 hover:bg-[#ef4444]/30 text-[#ef4444] border border-[#ef4444]/40 font-bold text-xs flex items-center justify-between transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg animate-pulse">emergency</span>
                  <span>إدخال حالة حرجة (تجاوز الدور)</span>
                </div>
                <span className="text-[10px] font-mono bg-[#ef4444]/20 px-2 py-0.5 rounded">F9</span>
              </button>
            </div>
          </div>

          {/* Active Reception Alerts */}
          <div className="rounded-2xl bg-[#111A2E] p-4 shadow-md border border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#dde2f5] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-amber-400 text-lg">notifications_active</span>
                <span>تنبيهات الاستقبال النشطة</span>
              </h3>
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
            </div>

            <div className="space-y-2">
              <div className="p-2.5 rounded-xl bg-[#080e1b] border border-white/5 text-xs">
                <div className="flex items-center justify-between text-[#00c2cb] font-bold">
                  <span>وصول تقرير معملي عاجل</span>
                  <span className="text-[10px] font-mono text-[#859394]">منذ 4 د</span>
                </div>
                <p className="text-[11px] text-[#bbc9ca] mt-1">
                  وصلت نتيجة تحليل إنزيمات القلب للمريض <strong>أحمد محمد</strong> (داخل الكشف حالياً).
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-[#080e1b] border border-white/5 text-xs">
                <div className="flex items-center justify-between text-[#d0bcff] font-bold">
                  <span>تنبيه وقت الانتظار</span>
                  <span className="text-[10px] font-mono text-[#859394]">منذ 10 د</span>
                </div>
                <p className="text-[11px] text-[#bbc9ca] mt-1">
                  المريض <strong>مروان يوسف (#09)</strong> تجاوز زمن انتظاره 18 دقيقة.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Floating Announcement Audio Notification */}
      {announcementModal && (
        <div className="fixed bottom-6 left-6 z-50 bg-[#18233C] border border-[#00c2cb] rounded-2xl p-4 shadow-2xl flex items-center gap-3 animate-in fade-in">
          <div className="w-10 h-10 rounded-xl bg-[#00c2cb] text-[#08101C] flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-2xl animate-pulse">volume_up</span>
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#dde2f5]">{announcementModal.title}</h4>
            <p className="text-[11px] text-[#00c2cb] font-mono mt-0.5">{announcementModal.desc}</p>
          </div>
        </div>
      )}
    </div>
  );
};

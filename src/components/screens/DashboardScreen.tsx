import React, { useState } from 'react';
import { ScreenType, ScheduledAppointment, QueueItem } from '../../types';

interface DashboardScreenProps {
  onNavigate: (screen: ScreenType) => void;
  appointments: ScheduledAppointment[];
  queue: QueueItem[];
  onConfirmCheckIn: (appointment: ScheduledAppointment, fee: number, method: string) => void;
  onCallPatient: (ticket: string, name: string) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  onNavigate,
  appointments,
  queue,
  onConfirmCheckIn,
  onCallPatient,
}) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedPayMethod, setSelectedPayMethod] = useState<string>('cash');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [checkInNotice, setCheckInNotice] = useState<string | null>(null);

  // Active check-in card patient
  const targetCheckIn = appointments.find((a) => a.id === 'app-1') || appointments[0];

  const handleAppCheckIn = (app: ScheduledAppointment) => {
    onConfirmCheckIn(app, app.expectedFee, selectedPayMethod === 'cash' ? 'نقدي' : selectedPayMethod === 'pos' ? 'فيزا / كارت' : 'إنستاباي');
    setCheckInNotice(`تم تأكيد حضور المريض (${app.patientName}) ونقله لطابور الانتظار وتوريد ${app.expectedFee} ج.م للدرج.`);
    setTimeout(() => setCheckInNotice(null), 4500);
  };

  const filteredAppointments = appointments.filter((app) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (!app.patientName.toLowerCase().includes(q) && !app.phone.includes(q)) {
        return false;
      }
    }
    if (filterType === 'scheduled') return app.status === 'مجدول';
    if (filterType === 'arrived') return app.status === 'حضر وسدد';
    if (filterType === 'in-queue') return app.status === 'في الانتظار';
    if (filterType === 'no-show') return app.status === 'لم يحضر';
    return true;
  });

  return (
    <div className="flex flex-col w-full pb-12 space-y-6 text-[#dde2f5]">
      {/* Header Banner Alert: Strict Separation Rule */}
      <div className="relative overflow-hidden rounded-2xl bg-[#111A2E] p-4 shadow-xl border border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 z-10">
          <div className="w-11 h-11 rounded-xl bg-[#00c2cb]/15 flex items-center justify-center text-[#00c2cb] shrink-0 shadow-[0_0_16px_rgba(0,194,203,0.25)] border border-[#00c2cb]/30">
            <span className="material-symbols-outlined text-2xl">verified_user</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-[#dde2f5]">نظام الفصل الإكلينيكي الصارم</span>
              <span className="bg-[#00c2cb]/15 text-[#45dee7] text-xs px-2.5 py-0.5 rounded-full font-bold border border-[#00c2cb]/20">
                جلسة نشطة
              </span>
            </div>
            <p className="text-xs text-[#bbc9ca] mt-0.5 max-w-2xl leading-relaxed">
              «مواعيد اليوم» تمثل خطط حجز مسبقة ولا تؤثر على الحسابات المالية حتى يتم تأكيد الحضور ودفع الرسوم وتحويلها إلى «زيارة فعلية».
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end md:self-center z-10">
          <div className="flex items-center gap-1.5 text-[#bbc9ca] text-xs bg-[#18233C] px-3 py-1.5 rounded-xl border border-white/5">
            <span className="w-2 h-2 rounded-full bg-[#8B5CF6]"></span>
            <span>حجز مسبق (لا يحسب بالدرج)</span>
          </div>
          <div className="flex items-center gap-1.5 text-[#bbc9ca] text-xs bg-[#18233C] px-3 py-1.5 rounded-xl border border-[#00c2cb]/20">
            <span className="w-2 h-2 rounded-full bg-[#00c2cb] animate-ping"></span>
            <span className="text-[#45dee7] font-semibold">حضور فعلي (مسدد بالدرج)</span>
          </div>
        </div>

        <div className="absolute -left-10 -bottom-10 w-48 h-48 rounded-full bg-[#00c2cb]/5 blur-3xl pointer-events-none"></div>
      </div>

      {checkInNotice && (
        <div className="bg-[#00c2cb]/20 border border-[#00c2cb] text-[#45dee7] px-4 py-3 rounded-xl flex items-center justify-between shadow-lg animate-in fade-in">
          <div className="flex items-center gap-2 font-medium text-sm">
            <span className="material-symbols-outlined text-lg">check_circle</span>
            <span>{checkInNotice}</span>
          </div>
          <button onClick={() => setCheckInNotice(null)} className="text-xs hover:underline cursor-pointer">
            إغلاق
          </button>
        </div>
      )}

      {/* Top 5 KPI Summary Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* KPI 1: Actual Arrived Visits */}
        <div className="relative overflow-hidden rounded-2xl bg-[#111A2E] p-4 shadow-lg border border-white/5 flex flex-col justify-between hover:bg-[#18233C] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#bbc9ca]">مرضى اليوم الفعليين</span>
            <div className="w-8 h-8 rounded-lg bg-[#00c2cb]/15 text-[#00c2cb] flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">how_to_reg</span>
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-3xl font-extrabold text-[#dde2f5] font-mono">14</div>
            <span className="text-xs text-[#00c2cb] font-semibold bg-[#00c2cb]/10 px-2 py-0.5 rounded-md">
              زيارة مثبتة
            </span>
          </div>
          <p className="text-[11px] text-[#859394] mt-1">حضروا وسجلوا بالاستقبال</p>
        </div>

        {/* KPI 2: Live Waiting Queue */}
        <div className="relative overflow-hidden rounded-2xl bg-[#111A2E] p-4 shadow-lg border border-[#00c2cb]/30 flex flex-col justify-between hover:bg-[#18233C] transition-all shadow-[0_0_24px_-6px_rgba(0,194,203,0.25)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00c2cb] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#00c2cb]"></span>
              </span>
              <span className="text-xs text-[#45dee7] font-bold">في الانتظار الآن</span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-[#00c2cb] text-[#08101C] flex items-center justify-center font-bold shadow-md">
              <span className="material-symbols-outlined text-lg">chair</span>
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-3xl font-extrabold text-[#45dee7] font-mono">{queue.length}</div>
            <span className="text-xs text-[#45dee7] font-semibold">متوسط: 14 د</span>
          </div>
          <p className="text-[11px] text-[#859394] mt-1">جاهزون لدخول غرفة الكشف</p>
        </div>

        {/* KPI 3: Scheduled Appointments */}
        <div className="relative overflow-hidden rounded-2xl bg-[#111A2E] p-4 shadow-lg border border-white/5 flex flex-col justify-between hover:bg-[#18233C] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#bbc9ca]">مواعيد اليوم المجدولة</span>
            <div className="w-8 h-8 rounded-lg bg-[#8B5CF6]/20 text-[#d0bcff] flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">calendar_month</span>
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-3xl font-extrabold text-[#dde2f5] font-mono">19</div>
            <span className="text-xs text-[#d0bcff] bg-[#571bc1]/40 px-2 py-0.5 rounded-md font-semibold">
              حجز مسبق
            </span>
          </div>
          <p className="text-[11px] text-[#859394] mt-1">تذكير بالمواعيد وتأكيد</p>
        </div>

        {/* KPI 4: Completed Visits */}
        <div className="relative overflow-hidden rounded-2xl bg-[#111A2E] p-4 shadow-lg border border-white/5 flex flex-col justify-between hover:bg-[#18233C] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#bbc9ca]">الكشوفات المكتملة</span>
            <div className="w-8 h-8 rounded-lg bg-[#38BDF8]/20 text-[#9dd0ff] flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">task_alt</span>
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-3xl font-extrabold text-[#dde2f5] font-mono">10</div>
            <span className="text-xs text-[#9dd0ff] font-semibold bg-[#0284C7]/30 px-2 py-0.5 rounded-md">
              71% من الإجمالي
            </span>
          </div>
          <p className="text-[11px] text-[#859394] mt-1">صدرت لهم روشتات ومتابعة</p>
        </div>

        {/* KPI 5: Cash Drawer Revenue */}
        <div className="relative overflow-hidden rounded-2xl bg-[#18233C] p-4 shadow-xl border border-[#8B5CF6]/30 flex flex-col justify-between hover:bg-[#242a38] transition-all shadow-[0_4px_24px_-4px_rgba(139,92,246,0.3)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#e9ddff]">إيراد الدرج الفعلي</span>
            <div className="w-8 h-8 rounded-lg bg-[#8B5CF6] text-white flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-lg">payments</span>
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-start gap-1">
            <div className="text-3xl font-extrabold text-[#45dee7] tracking-tight font-mono">3,800</div>
            <span className="text-sm text-[#bbc9ca] font-bold">ج.م</span>
          </div>
          <div className="mt-1 flex items-center gap-1 text-[11px] text-[#d0bcff]">
            <span className="material-symbols-outlined text-xs">info</span>
            <span>من الزيارات الفعلية فقط (نقدية وبنكية)</span>
          </div>
        </div>
      </section>

      {/* Dual Panel Layout: 60% Appointments & Registration / 40% Live Waiting Room */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* ================= RIGHT COLUMN (60% / 7 cols): APPOINTMENTS & RAPID INTAKE ================= */}
        <section className="xl:col-span-7 flex flex-col space-y-4">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-6 bg-[#8B5CF6] rounded-full"></div>
              <div>
                <h2 className="text-lg font-bold text-[#dde2f5]">مواعيد اليوم</h2>
                <span className="text-xs text-[#859394]">
                  الحجوزات والتذكيرات فقط (لا تُحتسب ككشوفات حتى يسجل الحضور)
                </span>
              </div>
            </div>

            {/* Quick Slot Search */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث بالاسم أو الهاتف..."
                className="bg-[#111A2E] text-[#dde2f5] text-xs pl-3 pr-8 py-2 rounded-xl placeholder:text-[#859394] focus:outline-none focus:ring-1 focus:ring-[#00c2cb] border border-white/5 w-48 sm:w-56"
              />
              <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-[#859394] text-base">
                search
              </span>
            </div>
          </div>

          {/* Filter Chips Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {[
              { id: 'all', label: 'الكل (19)' },
              { id: 'scheduled', label: 'مجدول (5)' },
              { id: 'in-queue', label: 'في الانتظار (4)' },
              { id: 'arrived', label: 'حضر وسدد (4)' },
              { id: 'no-show', label: 'لم يحضر (1)' },
            ].map((chip) => (
              <button
                key={chip.id}
                onClick={() => setFilterType(chip.id)}
                className={`px-3 py-1.5 rounded-lg shrink-0 transition-all cursor-pointer ${
                  filterType === chip.id
                    ? 'bg-[#00c2cb] text-[#08101C] font-bold shadow-sm'
                    : 'bg-[#111A2E] text-[#bbc9ca] hover:bg-[#18233C] hover:text-white border border-white/5'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Interactive Check-In Drawer Modal Card (Patient Just Arrived Demonstration) */}
          <div className="relative overflow-hidden rounded-2xl bg-[#18233C] p-4 shadow-2xl border border-[#00c2cb]/40 space-y-4 shadow-[0_0_30px_rgba(0,194,203,0.15)]">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#00c2cb]/20 text-[#00c2cb] flex items-center justify-center font-bold text-xl border border-[#00c2cb]/30">
                  <span className="material-symbols-outlined text-2xl">person_pin</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-[#dde2f5]">{targetCheckIn.patientName}</h3>
                    <span className="bg-[#00c2cb]/15 text-[#45dee7] text-xs px-2.5 py-0.5 rounded-full font-bold border border-[#00c2cb]/20">
                      وصل الآن للاستقبال
                    </span>
                  </div>
                  <p className="text-xs text-[#bbc9ca] mt-0.5">
                    موعد مجدول: اليوم {targetCheckIn.timeSlot} • {targetCheckIn.visitType}
                  </p>
                </div>
              </div>
              <div className="text-left">
                <span className="text-2xl font-extrabold text-[#45dee7] font-mono">{targetCheckIn.expectedFee}</span>
                <span className="text-xs text-[#bbc9ca] mr-1">ج.م</span>
              </div>
            </div>

            {/* Interactive Steps / Verification Controls */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 bg-[#080e1b] p-2.5 rounded-xl border border-white/5">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-[#111A2E]">
                <div className="w-6 h-6 rounded-full bg-[#00c2cb]/20 text-[#00c2cb] flex items-center justify-center font-bold text-xs">
                  <span className="material-symbols-outlined text-sm">check</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-[#dde2f5] font-semibold">1. تسجيل الحضور</span>
                  <span className="text-[10px] text-[#45dee7] font-mono">تحويل لزيارة فعلية</span>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2 rounded-lg bg-[#111A2E]">
                <div className="w-6 h-6 rounded-full bg-[#571bc1]/50 text-[#d0bcff] flex items-center justify-center font-bold text-xs">
                  <span className="material-symbols-outlined text-sm">point_of_sale</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-[#dde2f5] font-semibold">2. إثبات الدفع</span>
                  <span className="text-[10px] text-[#d0bcff] font-medium">إيداع بدرج العيادة</span>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2 rounded-lg bg-[#111A2E]">
                <div className="w-6 h-6 rounded-full bg-[#38BDF8]/20 text-[#9dd0ff] flex items-center justify-center font-bold text-xs">
                  <span className="material-symbols-outlined text-sm">queue</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-[#dde2f5] font-semibold">3. منحه دور انتظار</span>
                  <span className="text-[10px] text-[#9dd0ff] font-mono font-bold">تذكرة #09</span>
                </div>
              </div>
            </div>

            {/* Payment Method Choice Selection */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#bbc9ca] font-bold">طريقة السداد:</span>
                <div className="inline-flex rounded-xl bg-[#080e1b] p-1 border border-white/5">
                  {[
                    { id: 'cash', label: 'نقدي (كاش)' },
                    { id: 'pos', label: 'فيزا / كارت' },
                    { id: 'instapay', label: 'InstaPay محفظة' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setSelectedPayMethod(m.id)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        selectedPayMethod === m.id
                          ? 'bg-[#00c2cb] text-[#08101C] font-bold shadow'
                          : 'text-[#bbc9ca] hover:text-white'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => handleAppCheckIn(targetCheckIn)}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#00c2cb] hover:bg-[#45dee7] text-[#08101C] font-bold text-xs shadow-[0_0_16px_rgba(0,194,203,0.35)] transition-all cursor-pointer active:scale-95"
                >
                  <span className="material-symbols-outlined text-base">check_circle</span>
                  <span>تأكيد الحضور والدفع ({targetCheckIn.expectedFee} ج.م)</span>
                </button>
                <button
                  onClick={() => alert('تم تأجيل الموعد لساعة لاحقة')}
                  className="px-3 py-2.5 rounded-xl bg-[#111A2E] hover:bg-[#242a38] text-[#bbc9ca] hover:text-white text-xs transition-colors cursor-pointer border border-white/5"
                >
                  تأجيل
                </button>
              </div>
            </div>
          </div>

          {/* Appointments List */}
          <div className="space-y-2">
            {filteredAppointments.map((app) => (
              <div
                key={app.id}
                className="flex flex-col md:flex-row md:items-center justify-between p-3.5 rounded-xl bg-[#111A2E] hover:bg-[#18233C] transition-all gap-3 border border-white/5"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[#18233C] flex items-center justify-center text-[#dde2f5] font-bold text-xs font-mono border border-white/5">
                    {app.timeSlot}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#dde2f5]">{app.patientName}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-medium ${
                          app.visitType.includes('جديد')
                            ? 'bg-[#00c2cb]/15 text-[#45dee7]'
                            : app.visitType.includes('مجانية')
                            ? 'bg-[#10B981]/20 text-[#10B981]'
                            : 'bg-[#571bc1]/30 text-[#d0bcff]'
                        }`}
                      >
                        {app.visitType}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[#859394] text-xs mt-0.5">
                      <span dir="ltr" className="font-mono">{app.phone}</span>
                      <span>•</span>
                      <span>فرع {app.branch}</span>
                      <span>•</span>
                      <span className="text-[#38BDF8] font-mono">سعر الزيارة: {app.expectedFee} ج.م</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center">
                  <span
                    className={`text-xs px-2.5 py-1 rounded-lg font-medium ${
                      app.status === 'حضر وسدد'
                        ? 'bg-[#10B981]/20 text-[#10B981]'
                        : app.status === 'في الانتظار'
                        ? 'bg-[#00c2cb]/20 text-[#45dee7]'
                        : app.status === 'لم يحضر'
                        ? 'bg-[#EF4444]/20 text-[#EF4444]'
                        : 'bg-[#18233C] text-[#bbc9ca]'
                    }`}
                  >
                    {app.status}
                  </span>
                  {app.status === 'مجدول' && (
                    <button
                      onClick={() => handleAppCheckIn(app)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#00c2cb] text-[#08101C] hover:bg-[#45dee7] text-xs font-bold transition-all shadow-[0_0_12px_rgba(0,194,203,0.25)] cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base">login</span>
                      <span>حضر المريض</span>
                    </button>
                  )}
                  {app.status === 'في الانتظار' && (
                    <button
                      onClick={() => onCallPatient('#09', app.patientName)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#571bc1] text-[#e9ddff] hover:bg-[#8B5CF6] text-xs font-bold transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base">door_open</span>
                      <span>دخول الغرفة</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ================= LEFT COLUMN (40% / 5 cols): LIVE WAITING ROOM ================= */}
        <section className="xl:col-span-5 flex flex-col space-y-4">
          {/* Section Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-6 bg-[#00c2cb] rounded-full"></div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-[#dde2f5]">غرفة الانتظار الآن</h2>
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00c2cb] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00c2cb]"></span>
                  </span>
                </div>
                <span className="text-xs text-[#859394]">
                  المرضى الفعليين المتواجدين بالعيادة ({queue.length} حالات)
                </span>
              </div>
            </div>
            <span className="bg-[#18233C] text-[#00c2cb] border border-[#00c2cb]/30 px-3 py-1 rounded-full text-[11px] font-mono font-bold">
              Live Synced
            </span>
          </div>

          {/* Live Broadcast Alert Notification */}
          <div className="rounded-xl bg-[#00c2cb]/10 border border-[#00c2cb]/30 p-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#00c2cb] text-xl animate-bounce">
                campaign
              </span>
              <span className="text-xs text-[#dde2f5]">
                <strong className="text-[#45dee7]">مريض جديد بالانتظار:</strong> مروان يوسف (كشف جديد - مسدد 300 ج.م)
              </span>
            </div>
            <span className="text-[10px] text-[#00c2cb] font-mono shrink-0">منذ دقيقة</span>
          </div>

          {/* Waiting Queue Cards Container */}
          <div className="space-y-3">
            {/* Next Patient in Line #1 - Highlighted Active Card with Pulse Aura */}
            {queue.length > 0 && (
              <div className="relative overflow-hidden rounded-2xl bg-[#18233C] p-4 shadow-xl border border-[#00c2cb]/50 flex flex-col space-y-3 transition-all shadow-[0_0_24px_rgba(0,194,203,0.2)]">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-[#00c2cb] text-[#08101C] flex flex-col items-center justify-center font-bold shadow-md">
                      <span className="text-[10px] font-mono">دور</span>
                      <span className="text-base font-bold leading-none">{queue[0].ticketNumber}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-[#dde2f5]">{queue[0].patientName}</h3>
                        <span className="bg-[#00c2cb]/20 text-[#45dee7] text-[10px] px-2 py-0.5 rounded-full font-bold">
                          التالي في الدخول
                        </span>
                      </div>
                      <div className="text-[#bbc9ca] text-xs mt-0.5 flex items-center gap-2">
                        <span>{queue[0].visitType}</span>
                        <span>•</span>
                        <span className="text-[#10B981] font-medium font-mono">
                          مدفوع {queue[0].paidAmount} ج.م ({queue[0].paymentMethod}) ✓
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-left">
                    <span className="text-xs text-[#00c2cb] font-bold flex items-center gap-1 font-mono">
                      <span className="material-symbols-outlined text-sm">schedule</span>
                      منذ {queue[0].elapsedMinutes} دقيقة
                    </span>
                  </div>
                </div>

                <div className="bg-[#080e1b] p-2.5 rounded-xl border border-white/5 text-xs text-[#bbc9ca]">
                  <span className="text-[#45dee7] font-semibold">الشكوى المبدئية: </span>
                  <span>{queue[0].complaint}</span>
                </div>

                {/* Doctor Primary Call Action Button */}
                <div className="pt-1">
                  <button
                    onClick={() => {
                      onCallPatient(queue[0].ticketNumber, queue[0].patientName);
                      onNavigate('clinical-exam');
                    }}
                    className="w-full py-3 rounded-xl bg-[#00c2cb] hover:bg-[#45dee7] text-[#08101C] font-bold text-sm shadow-[0_0_20px_rgba(0,194,203,0.4)] flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
                  >
                    <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                      stethoscope
                    </span>
                    <span>بدء الكشف ودخول الغرفة</span>
                  </button>
                </div>
              </div>
            )}

            {/* Waiting Patients #2..#N */}
            {queue.slice(1).map((item) => (
              <div
                key={item.id}
                className="rounded-xl bg-[#111A2E] p-3.5 hover:bg-[#18233C] transition-all flex items-center justify-between gap-3 border border-white/5"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#18233C] text-[#dde2f5] flex flex-col items-center justify-center font-bold border border-white/5">
                    <span className="text-[10px] text-[#859394]">دور</span>
                    <span className="text-sm font-bold font-mono leading-none">{item.ticketNumber}</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#dde2f5]">{item.patientName}</h4>
                    <div className="text-[#859394] text-xs mt-0.5 flex items-center gap-2">
                      <span>{item.visitType}</span>
                      <span>•</span>
                      <span className="text-[#d0bcff] font-mono">{item.paidAmount} ج.م ({item.paymentMethod})</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1.5">
                  <span className="text-xs text-[#bbc9ca] flex items-center gap-1 font-mono">
                    <span className="material-symbols-outlined text-xs">timer</span>
                    منذ {item.elapsedMinutes} دقيقة
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onCallPatient(item.ticketNumber, item.patientName)}
                      className="px-2.5 py-1 rounded-lg bg-[#18233C] hover:bg-[#242a38] text-[#45dee7] text-xs font-semibold transition-colors cursor-pointer"
                      title="استدعاء صوتي"
                    >
                      نداء
                    </button>
                    <span className="bg-[#18233C] text-[#bbc9ca] text-[10px] px-2 py-0.5 rounded font-medium border border-white/5">
                      في الانتظار
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Room Status Mini Card */}
          <div className="rounded-2xl bg-[#111A2E] p-4 border border-white/5 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#00c2cb]/10 text-[#00c2cb] flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">medical_services</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-[#dde2f5]">غرفة الفحص الرئيسية</span>
                <span className="text-[11px] text-[#bbc9ca]">د. حازم القاضي • جاهز لاستقبال المريض</span>
              </div>
            </div>
            <button
              onClick={() => onNavigate('clinical-exam')}
              className="bg-[#00c2cb]/15 hover:bg-[#00c2cb]/30 text-[#45dee7] border border-[#00c2cb]/30 text-xs px-3 py-1.5 rounded-full font-bold cursor-pointer transition-all"
            >
              فتح الغرفة
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

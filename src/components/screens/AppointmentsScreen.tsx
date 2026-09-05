import React, { useState } from 'react';
import { AppointmentListItem, ScreenType } from '../../types';

interface AppointmentsScreenProps {
  appointments: AppointmentListItem[];
  onCheckInPatient: (appointment: AppointmentListItem) => void;
  onOpenNewAppointment: () => void;
  onNavigate: (screen: ScreenType) => void;
}

export const AppointmentsScreen: React.FC<AppointmentsScreenProps> = ({
  appointments,
  onCheckInPatient,
  onOpenNewAppointment,
  onNavigate,
}) => {
  const [activeTab, setActiveTab] = useState<'today' | 'followups' | 'late' | 'archive'>('today');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [whatsappToast, setWhatsappToast] = useState<string | null>(null);

  const handleSendWhatsappReminder = (phone: string, name: string) => {
    setWhatsappToast(`تم إرسال رسالة تذكير آلية بموعد العيادة إلى (${name}) على واتساب`);
    setTimeout(() => setWhatsappToast(null), 3500);
  };

  const filteredAppointments = appointments.filter((app) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (!app.patientName.toLowerCase().includes(q) && !app.phone.includes(q)) {
        return false;
      }
    }
    if (statusFilter !== 'all' && app.status !== statusFilter) {
      return false;
    }
    if (activeTab === 'followups') {
      return app.freeFollowupEligible || app.visitType.includes('متابعة');
    }
    if (activeTab === 'late') {
      return app.status === 'لم يحضر';
    }
    return true;
  });

  return (
    <div className="flex flex-col w-full pb-16 space-y-6 text-[#dde2f5]">
      {/* Toast */}
      {whatsappToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#18233C] border border-[#10B981] text-[#10B981] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in">
          <span className="material-symbols-outlined text-xl">chat</span>
          <span className="text-xs font-bold">{whatsappToast}</span>
        </div>
      )}

      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#859394] mb-1">
            <span>الرئيسية</span>
            <span>&gt;</span>
            <span>جدول المواعيد</span>
            <span>&gt;</span>
            <span className="text-[#00c2cb]">إدارة المواعيد والمتابعة</span>
          </div>
          <h1 className="text-2xl font-bold text-[#dde2f5] flex items-center gap-3">
            <span>المواعيد والمتابعات القادمة</span>
            <span className="px-2.5 py-0.5 rounded-full bg-[#00c2cb]/15 text-[#45dee7] text-xs font-mono font-bold">
              • مباشر اليوم
            </span>
          </h1>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handleSendWhatsappReminder('0109xxxx', 'جميع مرضى الوردية')}
            className="px-3.5 py-2 rounded-xl bg-[#571bc1]/50 hover:bg-[#571bc1] text-[#e9ddff] text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">chat</span>
            <span>تذكير تلقائي (واتساب)</span>
          </button>
          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 rounded-xl bg-[#111A2E] hover:bg-[#18233C] text-[#dde2f5] text-xs font-semibold flex items-center gap-1.5 border border-white/5 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">download</span>
            <span>تصدير اليومية</span>
          </button>
          <button
            onClick={onOpenNewAppointment}
            className="px-4 py-2 rounded-xl bg-[#00c2cb] hover:bg-[#45dee7] text-[#08101C] text-xs font-bold flex items-center gap-1.5 shadow-md shadow-[#00c2cb]/20 transition-all cursor-pointer active:scale-95"
          >
            <span className="material-symbols-outlined text-base">add</span>
            <span>+ إضافة موعد حجز جديد</span>
          </button>
        </div>
      </div>

      {/* Clinical Strict Separation Notice */}
      <div className="bg-[#111A2E] p-4 rounded-2xl border border-white/5 flex items-center justify-between gap-4 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#18233C] flex items-center justify-center text-[#00c2cb]">
            <span className="material-symbols-outlined text-lg">info</span>
          </div>
          <p className="text-xs text-[#bbc9ca] leading-relaxed">
            <strong className="text-[#dde2f5]">مبدأ الفصل السريري: </strong>
            حجز الموعد يعتبر تنظيماً زمنياً مجدولاً ولا ينشئ فاتورة مالية ولا يدخل المريض لقائمة الانتظار الفعلية إلا بعد النقر على <strong className="text-[#45dee7]">"حضر المريض"</strong> عند وصوله مقر العيادة.
          </p>
        </div>
        <span className="text-[11px] text-[#10B981] font-semibold bg-[#10B981]/15 px-3 py-1 rounded-full shrink-0">
          نظام حماية الإيرادات متصل
        </span>
      </div>

      {/* 4 KPI Matrix Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="bg-[#111A2E] p-4 rounded-2xl border border-white/5 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#bbc9ca]">
            <span className="text-xs font-semibold">إجمالي المواعيد المحجوزة اليوم</span>
            <span className="material-symbols-outlined text-base text-[#38BDF8]">event_available</span>
          </div>
          <div className="my-2">
            <span className="text-3xl font-extrabold text-[#dde2f5] font-mono">19</span>
            <span className="text-xs text-[#00c2cb] mr-2">موعد مؤكد</span>
          </div>
          <span className="text-[11px] text-[#859394]">العيادة الرئيسية (14) • فرع الدقي (5)</span>
        </div>

        {/* KPI 2 */}
        <div className="bg-[#111A2E] p-4 rounded-2xl border border-white/5 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#bbc9ca]">
            <span className="text-xs font-semibold">موقف الحضور الفعلي</span>
            <span className="material-symbols-outlined text-base text-[#00c2cb]">how_to_reg</span>
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#45dee7] font-mono">4</span>
            <span className="text-xs text-[#bbc9ca]">حضروا وسددوا (من أصل 19)</span>
          </div>
          <div className="w-full bg-[#080e1b] h-1.5 rounded-full overflow-hidden flex">
            <div className="bg-[#00c2cb] h-full" style={{ width: '25%' }}></div>
            <div className="bg-amber-400 h-full" style={{ width: '60%' }}></div>
            <div className="bg-[#ef4444] h-full" style={{ width: '15%' }}></div>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-[#111A2E] p-4 rounded-2xl border border-white/5 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#bbc9ca]">
            <span className="text-xs font-semibold">متابعات مجانية مستحقة (الأسبوع)</span>
            <span className="material-symbols-outlined text-base text-[#d0bcff]">event_repeat</span>
          </div>
          <div className="my-2">
            <span className="text-3xl font-extrabold text-[#d0bcff] font-mono">15</span>
            <span className="text-xs text-[#bbc9ca] mr-2">مريض</span>
          </div>
          <span className="text-[11px] text-[#859394]">خلال مهلة الـ 14 يوم القانونية</span>
        </div>

        {/* KPI 4 */}
        <div className="bg-[#18233C] p-4 rounded-2xl border border-[#8B5CF6]/30 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#d0bcff]">
            <span className="text-xs font-bold">الإيراد المتوقع عند الحضور</span>
            <span className="material-symbols-outlined text-base text-[#8B5CF6]">payments</span>
          </div>
          <div className="my-2">
            <span className="text-3xl font-extrabold text-[#45dee7] font-mono">4,200</span>
            <span className="text-xs text-[#bbc9ca] mr-1">ج.م</span>
          </div>
          <span className="text-[11px] text-[#bbc9ca]">
            محصل فعلياً: <strong className="text-[#10B981]">1,200 ج.م</strong> • متوقع: 3,000 ج.م
          </span>
        </div>
      </div>

      {/* Tabs Row */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-white/5 pb-2">
        <button
          onClick={() => setActiveTab('today')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'today'
              ? 'bg-[#00c2cb] text-[#08101C] shadow-md'
              : 'bg-[#111A2E] text-[#bbc9ca] hover:bg-[#18233C]'
          }`}
        >
          <span className="material-symbols-outlined text-base">calendar_today</span>
          <span>المواعيد المجدولة والحجوزات</span>
          <span className="bg-[#08101C]/20 px-2 py-0.5 rounded-full font-mono text-[10px]">19</span>
        </button>

        <button
          onClick={() => setActiveTab('followups')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'followups'
              ? 'bg-[#00c2cb] text-[#08101C] shadow-md'
              : 'bg-[#111A2E] text-[#bbc9ca] hover:bg-[#18233C]'
          }`}
        >
          <span className="material-symbols-outlined text-base">event_repeat</span>
          <span>المتابعات القادمة (خلال 14 يوم)</span>
          <span className="bg-[#18233C] px-2 py-0.5 rounded-full font-mono text-[10px]">15</span>
        </button>

        <button
          onClick={() => setActiveTab('late')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'late'
              ? 'bg-[#00c2cb] text-[#08101C] shadow-md'
              : 'bg-[#111A2E] text-[#bbc9ca] hover:bg-[#18233C]'
          }`}
        >
          <span className="material-symbols-outlined text-base">hourglass_bottom</span>
          <span>المتأخرون عن الحضور</span>
          <span className="bg-[#ef4444]/20 text-[#ef4444] px-2 py-0.5 rounded-full font-mono text-[10px]">2</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#111A2E] p-3 rounded-xl border border-white/5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[#859394] text-base">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث باسم المريض، رقم الهاتف، أو كود الملف الطبي..."
            className="w-full bg-[#080e1b] text-[#dde2f5] placeholder:text-[#859394] pr-9 pl-4 py-2 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#00c2cb] border border-white/5"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#080e1b] text-[#dde2f5] text-xs px-3 py-2 rounded-xl border border-white/5 focus:outline-none cursor-pointer"
          >
            <option value="all">كافة الحالات</option>
            <option value="مجدول">مجدول فقط</option>
            <option value="حضر وسدد">حضر وسدد</option>
            <option value="في الانتظار">في الانتظار</option>
            <option value="لم يحضر">لم يحضر</option>
          </select>
        </div>
      </div>

      {/* Appointments Data Table */}
      <div className="bg-[#111A2E] rounded-2xl border border-white/5 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-[#18233C] text-[#bbc9ca] text-xs font-bold border-b border-white/5">
                <th className="p-3.5">المريض وبيانات الاتصال</th>
                <th className="p-3.5">توقيت الحجز</th>
                <th className="p-3.5">الفرع / الطبيب</th>
                <th className="p-3.5">نوع الحجز والرسوم</th>
                <th className="p-3.5">حالة الموعد</th>
                <th className="p-3.5 text-center">الإجراءات السريرية والتنظيمية</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-white/5">
              {filteredAppointments.map((app) => (
                <tr key={app.id} className="hover:bg-[#18233C]/60 transition-colors">
                  <td className="p-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[#00c2cb]/15 text-[#45dee7] flex items-center justify-center font-bold">
                        {app.patientName.slice(0, 2)}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-[#dde2f5]">{app.patientName}</div>
                        <div className="text-[#859394] font-mono text-[11px] mt-0.5">
                          <span dir="ltr">{app.phone}</span> • #{app.medicalCode}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3.5 font-mono text-[#45dee7] font-bold text-sm">
                    {app.timeSlot}
                  </td>
                  <td className="p-3.5 text-[#bbc9ca]">
                    <div>العيادة الرئيسية - {app.branch}</div>
                    <div className="text-[11px] text-[#859394]">د. حازم القاضي (باطنة)</div>
                  </td>
                  <td className="p-3.5">
                    <div className="text-[#dde2f5] font-medium">{app.visitType}</div>
                    <div className="text-[#38BDF8] font-mono font-bold">
                      {app.expectedFee > 0 ? `${app.expectedFee} ج.م متوقعة` : '0 ج.م (ضمن الـ 14 يوم)'}
                    </div>
                  </td>
                  <td className="p-3.5">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        app.status === 'حضر وسدد'
                          ? 'bg-[#10B981]/20 text-[#10B981]'
                          : app.status === 'في الانتظار'
                          ? 'bg-[#00c2cb]/20 text-[#45dee7]'
                          : app.status === 'لم يحضر'
                          ? 'bg-[#ef4444]/20 text-[#ef4444]'
                          : 'bg-[#18233C] text-[#bbc9ca]'
                      }`}
                    >
                      {app.status}
                    </span>
                  </td>
                  <td className="p-3.5 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {app.status === 'مجدول' && (
                        <button
                          onClick={() => onCheckInPatient(app)}
                          className="flex items-center gap-1 bg-[#00c2cb] hover:bg-[#45dee7] text-[#08101C] font-bold text-xs px-3 py-1.5 rounded-xl shadow-sm transition-all cursor-pointer active:scale-95"
                        >
                          <span className="material-symbols-outlined text-base">login</span>
                          <span>حضر المريض</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleSendWhatsappReminder(app.phone, app.patientName)}
                        className="p-1.5 rounded-lg bg-[#080e1b] hover:bg-[#242a38] text-[#10B981] transition-colors cursor-pointer"
                        title="إرسال تذكير واتساب"
                      >
                        <span className="material-symbols-outlined text-base">chat</span>
                      </button>
                      <button
                        onClick={() => onNavigate('patient-records')}
                        className="p-1.5 rounded-lg bg-[#080e1b] hover:bg-[#242a38] text-[#38BDF8] transition-colors cursor-pointer"
                        title="الملف الطبي"
                      >
                        <span className="material-symbols-outlined text-base">folder_shared</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

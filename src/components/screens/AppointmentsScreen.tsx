import React, { useState } from 'react';
import { AppointmentListItem, ScreenType } from '../../types';
import { usePermissions } from '../../context/AuthContext';

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
  const { canAccess } = usePermissions();
  const [activeTab, setActiveTab] = useState<'today' | 'followups' | 'late' | 'archive'>('today');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [whatsappToast, setWhatsappToast] = useState<string | null>(null);

  const handleSendWhatsappReminder = (phone: string, name: string) => {
    setWhatsappToast(`تم إرسال رسالة تذكير آلية بموعد العيادة إلى (${name}) على واتساب`);
    setTimeout(() => setWhatsappToast(null), 3500);
  };

  const filteredAppointments = appointments.filter((app) => {
    if (!app) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const pName = (app.patientName || '').toLowerCase();
      const pPhone = app.phone || '';
      if (!pName.includes(q) && !pPhone.includes(q)) {
        return false;
      }
    }
    if (statusFilter !== 'all' && app.status !== statusFilter) {
      return false;
    }
    if (activeTab === 'followups') {
      return app.freeFollowupEligible || (app.visitType || '').includes('متابعة');
    }
    if (activeTab === 'late') {
      return app.status === 'لم يحضر';
    }
    return true;
  });

  return (
    <div className="flex flex-col w-full pb-16 space-y-6 text-slate-800 dark:text-[#dde2f5]">
      {/* Toast */}
      {whatsappToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-[#18233C] border border-emerald-500 text-emerald-600 dark:text-[#10B981] px-6 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in">
          <span className="material-symbols-outlined text-xl">chat</span>
          <span className="text-xs font-bold">{whatsappToast}</span>
        </div>
      )}

      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-[#859394] mb-1">
            <span>الرئيسية</span>
            <span>&gt;</span>
            <span>جدول المواعيد</span>
            <span>&gt;</span>
            <span className="text-[#008f97] dark:text-[#00c2cb]">إدارة المواعيد والمتابعة</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-[#dde2f5] flex items-center gap-3">
            <span>المواعيد والمتابعات القادمة</span>
            <span className="px-2.5 py-0.5 rounded-full bg-teal-50 dark:bg-[#00c2cb]/15 text-[#008f97] dark:text-[#45dee7] text-xs font-mono font-bold border border-teal-200 dark:border-[#00c2cb]/30">
              • مباشر اليوم
            </span>
          </h1>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          <button
            onClick={() => handleSendWhatsappReminder('0109xxxx', 'جميع مرضى الوردية')}
            className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-purple-50 dark:bg-[#571bc1]/50 hover:bg-purple-100 dark:hover:bg-[#571bc1] text-purple-700 dark:text-[#e9ddff] text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-purple-200 dark:border-transparent"
          >
            <span className="material-symbols-outlined text-base">chat</span>
            <span>تذكير تلقائي (واتساب)</span>
          </button>
          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-[#111A2E] hover:bg-slate-50 dark:hover:bg-[#18233C] text-slate-700 dark:text-[#dde2f5] text-xs font-semibold flex items-center gap-1.5 border border-slate-200 dark:border-white/5 transition-all cursor-pointer shadow-xs"
          >
            <span className="material-symbols-outlined text-base">download</span>
            <span>تصدير</span>
          </button>
          <button
            onClick={onOpenNewAppointment}
            className="px-4 py-2 rounded-xl bg-[#00c2cb] hover:bg-[#45dee7] text-[#08101C] text-xs font-bold flex items-center gap-1.5 shadow-md shadow-[#00c2cb]/20 transition-all cursor-pointer active:scale-95"
          >
            <span className="material-symbols-outlined text-base">add</span>
            <span>+ حجز موعد جديد</span>
          </button>
        </div>
      </div>

      {/* Clinical Strict Separation Notice */}
      <div className="bg-white dark:bg-[#111A2E] p-4 rounded-2xl border border-slate-200 dark:border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-[#18233C] flex items-center justify-center text-[#008f97] dark:text-[#00c2cb] shrink-0">
            <span className="material-symbols-outlined text-lg">info</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-[#bbc9ca] leading-relaxed">
            <strong className="text-slate-900 dark:text-[#dde2f5]">مبدأ الفصل السريري: </strong>
            حجز الموعد يعتبر تنظيماً زمنياً مجدولاً ولا ينشئ فاتورة مالية ولا يدخل المريض لقائمة الانتظار الفعلية إلا بعد النقر على <strong className="text-[#008f97] dark:text-[#45dee7]">"حضر المريض"</strong> عند وصوله مقر العيادة.
          </p>
        </div>
        <span className="text-[11px] text-emerald-700 dark:text-[#10B981] font-semibold bg-emerald-50 dark:bg-[#10B981]/15 px-3 py-1 rounded-full shrink-0 border border-emerald-200 dark:border-transparent">
          نظام حماية الإيرادات متصل
        </span>
      </div>

      {/* 4 KPI Matrix Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* KPI 1 */}
        <div className="bg-white dark:bg-[#111A2E] p-4 rounded-2xl border border-slate-200 dark:border-white/5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-[#bbc9ca]">
            <span className="text-xs font-semibold">إجمالي المواعيد المحجوزة</span>
            <span className="material-symbols-outlined text-base text-sky-500 dark:text-[#38BDF8]">event_available</span>
          </div>
          <div className="my-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-[#dde2f5] font-mono">19</span>
            <span className="text-xs text-[#008f97] dark:text-[#00c2cb] mr-2 font-bold">موعد مؤكد</span>
          </div>
          <span className="text-[11px] text-slate-400 dark:text-[#859394]">العيادة الرئيسية (14) • الفرع (5)</span>
        </div>

        {/* KPI 2 */}
        <div className="bg-white dark:bg-[#111A2E] p-4 rounded-2xl border border-slate-200 dark:border-white/5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-[#bbc9ca]">
            <span className="text-xs font-semibold">موقف الحضور الفعلي</span>
            <span className="material-symbols-outlined text-base text-[#008f97] dark:text-[#00c2cb]">how_to_reg</span>
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-[#008f97] dark:text-[#45dee7] font-mono">4</span>
            <span className="text-xs text-slate-500 dark:text-[#bbc9ca]">حضروا وسددوا (من 19)</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-[#080e1b] h-1.5 rounded-full overflow-hidden flex">
            <div className="bg-[#00c2cb] h-full" style={{ width: '25%' }}></div>
            <div className="bg-amber-400 h-full" style={{ width: '60%' }}></div>
            <div className="bg-red-500 h-full" style={{ width: '15%' }}></div>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white dark:bg-[#111A2E] p-4 rounded-2xl border border-slate-200 dark:border-white/5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-[#bbc9ca]">
            <span className="text-xs font-semibold">متابعات مجانية مستحقة</span>
            <span className="material-symbols-outlined text-base text-purple-600 dark:text-[#d0bcff]">event_repeat</span>
          </div>
          <div className="my-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-purple-700 dark:text-[#d0bcff] font-mono">15</span>
            <span className="text-xs text-slate-500 dark:text-[#bbc9ca] mr-2">مريض</span>
          </div>
          <span className="text-[11px] text-slate-400 dark:text-[#859394]">خلال مهلة الـ 14 يوماً</span>
        </div>

        {/* KPI 4 */}
        <div className="bg-white dark:bg-[#18233C] p-4 rounded-2xl border border-purple-200 dark:border-[#8B5CF6]/30 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-purple-700 dark:text-[#d0bcff]">
            <span className="text-xs font-bold">الإيراد المتوقع عند الحضور</span>
            <span className="material-symbols-outlined text-base text-[#8B5CF6]">payments</span>
          </div>
          <div className="my-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-[#008f97] dark:text-[#45dee7] font-mono">4,200</span>
            <span className="text-xs text-slate-500 dark:text-[#bbc9ca] mr-1 font-bold">ج.م</span>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-[#bbc9ca]">
            محصل فعلياً: <strong className="text-emerald-600 dark:text-[#10B981]">1,200 ج.م</strong>
          </span>
        </div>
      </div>

      {/* Tabs Row */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-200 dark:border-white/5 pb-2">
        <button
          onClick={() => setActiveTab('today')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'today'
              ? 'bg-[#00c2cb] text-[#08101C] shadow-sm'
              : 'bg-white dark:bg-[#111A2E] text-slate-600 dark:text-[#bbc9ca] hover:bg-slate-50 dark:hover:bg-[#18233C] border border-slate-200 dark:border-white/5'
          }`}
        >
          <span className="material-symbols-outlined text-base">calendar_today</span>
          <span>المواعيد المجدولة والحجوزات</span>
          <span className="bg-[#08101C]/15 px-2 py-0.5 rounded-full font-mono text-[10px]">19</span>
        </button>

        <button
          onClick={() => setActiveTab('followups')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'followups'
              ? 'bg-[#00c2cb] text-[#08101C] shadow-sm'
              : 'bg-white dark:bg-[#111A2E] text-slate-600 dark:text-[#bbc9ca] hover:bg-slate-50 dark:hover:bg-[#18233C] border border-slate-200 dark:border-white/5'
          }`}
        >
          <span className="material-symbols-outlined text-base">event_repeat</span>
          <span>المتابعات القادمة (خلال 14 يوم)</span>
          <span className="bg-slate-100 dark:bg-[#18233C] px-2 py-0.5 rounded-full font-mono text-[10px]">15</span>
        </button>

        <button
          onClick={() => setActiveTab('late')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'late'
              ? 'bg-[#00c2cb] text-[#08101C] shadow-sm'
              : 'bg-white dark:bg-[#111A2E] text-slate-600 dark:text-[#bbc9ca] hover:bg-slate-50 dark:hover:bg-[#18233C] border border-slate-200 dark:border-white/5'
          }`}
        >
          <span className="material-symbols-outlined text-base">hourglass_bottom</span>
          <span>المتأخرون عن الحضور</span>
          <span className="bg-red-50 dark:bg-[#ef4444]/20 text-red-600 dark:text-[#ef4444] px-2 py-0.5 rounded-full font-mono text-[10px]">2</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-[#111A2E] p-3 rounded-xl border border-slate-200 dark:border-white/5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#859394] text-base">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث باسم المريض، رقم الهاتف، أو كود الملف الطبي..."
            className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] placeholder:text-slate-400 dark:placeholder:text-[#859394] pr-9 pl-4 py-2 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#00c2cb] border border-slate-200 dark:border-white/5"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-white/5 focus:outline-none cursor-pointer"
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
      <div className="bg-white dark:bg-[#111A2E] rounded-2xl border border-slate-200 dark:border-white/5 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse min-w-[650px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-[#18233C] text-slate-600 dark:text-[#bbc9ca] text-xs font-bold border-b border-slate-200 dark:border-white/5">
                <th className="p-3.5">المريض وبيانات الاتصال</th>
                <th className="p-3.5">توقيت الحجز</th>
                <th className="p-3.5">الفرع / الطبيب</th>
                <th className="p-3.5">نوع الحجز والرسوم</th>
                <th className="p-3.5">حالة الموعد</th>
                <th className="p-3.5 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-slate-100 dark:divide-white/5">
              {filteredAppointments.map((app) => (
                <tr key={app.id} className="hover:bg-slate-50 dark:hover:bg-[#18233C]/60 transition-colors">
                  <td className="p-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-[#00c2cb]/15 text-[#008f97] dark:text-[#45dee7] flex items-center justify-center font-bold shrink-0">
                        {(app.patientName || 'مريض').slice(0, 2)}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-slate-900 dark:text-[#dde2f5]">{app.patientName || 'مريض غير مسجل'}</div>
                        <div className="text-slate-400 dark:text-[#859394] font-mono text-[11px] mt-0.5">
                          <span dir="ltr">{app.phone || 'بدون هاتف'}</span> • #{app.medicalCode || 'EG-NEW'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3.5 font-mono text-[#008f97] dark:text-[#45dee7] font-bold text-sm">
                    {app.timeSlot || app.time || '17:00'}
                  </td>
                  <td className="p-3.5 text-slate-600 dark:text-[#bbc9ca]">
                    <div>{app.branch || 'الفرع الرئيسي'}</div>
                    <div className="text-[11px] text-slate-400 dark:text-[#859394]">د. حازم القاضي (باطنة)</div>
                  </td>
                  <td className="p-3.5">
                    <div className="text-slate-800 dark:text-[#dde2f5] font-medium">{app.visitType || 'كشف'}</div>
                    <div className="text-sky-600 dark:text-[#38BDF8] font-mono font-bold">
                      {(app.expectedFee || 0) > 0 ? `${app.expectedFee} ج.م متوقعة` : '0 ج.م (ضمن الـ 14 يوم)'}
                    </div>
                  </td>
                  <td className="p-3.5">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        app.status === 'حضر وسدد'
                          ? 'bg-emerald-50 dark:bg-[#10B981]/20 text-emerald-700 dark:text-[#10B981]'
                          : app.status === 'في الانتظار'
                          ? 'bg-teal-50 dark:bg-[#00c2cb]/20 text-[#008f97] dark:text-[#45dee7]'
                          : app.status === 'لم يحضر'
                          ? 'bg-red-50 dark:bg-[#ef4444]/20 text-red-700 dark:text-[#ef4444]'
                          : 'bg-slate-100 dark:bg-[#18233C] text-slate-600 dark:text-[#bbc9ca]'
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
                          className="flex items-center gap-1 bg-[#00c2cb] hover:bg-[#45dee7] text-[#08101C] font-bold text-xs px-3 py-1.5 rounded-xl shadow-xs transition-all cursor-pointer active:scale-95"
                        >
                          <span className="material-symbols-outlined text-base">login</span>
                          <span>حضر المريض</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleSendWhatsappReminder(app.phone || '', app.patientName || 'المريض')}
                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-[#080e1b] hover:bg-slate-200 dark:hover:bg-[#242a38] text-emerald-600 dark:text-[#10B981] transition-colors cursor-pointer"
                        title="إرسال تذكير واتساب"
                      >
                        <span className="material-symbols-outlined text-base">chat</span>
                      </button>
                      {canAccess('patient-records') && (
                        <button
                          onClick={() => onNavigate('patient-records')}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-[#080e1b] hover:bg-slate-200 dark:hover:bg-[#242a38] text-sky-600 dark:text-[#38BDF8] transition-colors cursor-pointer"
                          title="الملف الطبي"
                        >
                          <span className="material-symbols-outlined text-base">folder_shared</span>
                        </button>
                      )}
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

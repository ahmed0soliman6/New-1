import React, { useState } from 'react';
import { CLINIC_INFO } from '../../data/mockClinicData';

interface ClinicalReportsScreenProps {
  onExportReport?: (type: 'pdf' | 'excel') => void;
}

export const ClinicalReportsScreen: React.FC<ClinicalReportsScreenProps> = () => {
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'quarter'>('month');
  const [toast, setToast] = useState<string | null>(null);

  const handleExport = (format: 'PDF' | 'Excel') => {
    setToast(`جاري استخراج تقرير العيادة الشامل بصيغة (${format})... سيتم التنزيل فوراً.`);
    setTimeout(() => setToast(null), 3500);
  };

  return (
    <div className="flex flex-col w-full pb-16 space-y-6 text-slate-800 dark:text-[#dde2f5]">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-[#18233C] border border-[#00c2cb] text-slate-900 dark:text-[#45dee7] px-6 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in">
          <span className="material-symbols-outlined text-2xl text-[#00c2cb]">download_done</span>
          <span className="text-sm font-bold">{toast}</span>
        </div>
      )}

      {/* Header & Range Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-[#859394] mb-1">
            <span>الرئيسية</span>
            <span>&gt;</span>
            <span className="text-[#008f97] dark:text-[#00c2cb]">التقارير والإحصائيات الإكلينيكية</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-[#dde2f5] flex items-center gap-3">
            <span>لوحة المؤشرات والذكاء الإكلينيكي</span>
            <span className="bg-[#00c2cb]/15 text-[#008f97] dark:text-[#45dee7] px-3 py-0.5 rounded-full text-xs font-bold border border-[#00c2cb]/20">
              تحديث دوري لحظي
            </span>
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Time range pill */}
          <div className="flex items-center bg-slate-100 dark:bg-[#111A2E] p-1 rounded-xl border border-slate-200 dark:border-white/5">
            {[
              { id: 'today', label: 'اليوم' },
              { id: 'week', label: 'هذا الأسبوع' },
              { id: 'month', label: 'هذا الشهر' },
              { id: 'quarter', label: 'الربع الحالي' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setTimeRange(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  timeRange === tab.id
                    ? 'bg-[#00c2cb] text-[#08101C] shadow-sm'
                    : 'text-slate-600 dark:text-[#bbc9ca] hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Export buttons */}
          <button
            onClick={() => handleExport('PDF')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-[#18233C] hover:bg-slate-50 dark:hover:bg-[#242a38] text-slate-700 dark:text-[#dde2f5] text-xs font-bold border border-slate-200 dark:border-white/10 shadow-xs cursor-pointer"
          >
            <span className="material-symbols-outlined text-base text-rose-500">picture_as_pdf</span>
            <span>تصدير PDF</span>
          </button>
          <button
            onClick={() => handleExport('Excel')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#00c2cb] hover:bg-[#45dee7] text-[#08101C] text-xs font-bold shadow-md shadow-[#00c2cb]/20 cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">table_view</span>
            <span>تصدير Excel</span>
          </button>
        </div>
      </div>

      {/* 4 Essential Clinical & Operational KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#111A2E] p-5 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-[#859394]">إجمالي كشوفات الشهر</span>
            <span className="w-8 h-8 rounded-lg bg-[#00c2cb]/15 text-[#008f97] dark:text-[#00c2cb] flex items-center justify-center">
              <span className="material-symbols-outlined text-base">groups</span>
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-[#dde2f5] font-mono">184</span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">↑ +14% مقارنة بالشهر السابق</span>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-[#bbc9ca]">منها 138 كشف جديد و 46 استشارة ومتابعة</span>
        </div>

        <div className="bg-white dark:bg-[#111A2E] p-5 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-[#859394]">إجمالي الإيرادات المحصلة</span>
            <span className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950/40 text-purple-600 dark:text-[#d0bcff] flex items-center justify-center">
              <span className="material-symbols-outlined text-base">monetization_on</span>
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-purple-700 dark:text-[#d0bcff] font-mono">55,200</span>
            <span className="text-xs font-bold text-slate-500 dark:text-[#859394]">ج.م</span>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-[#bbc9ca]">متوسط قيمة الإيراد لكل كشف: 300 ج.م</span>
        </div>

        <div className="bg-white dark:bg-[#111A2E] p-5 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-[#859394]">متوسط مدة الكشف الطبي</span>
            <span className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-base">timer</span>
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-emerald-600 dark:text-[#10B981] font-mono">16.4</span>
            <span className="text-xs font-bold text-slate-500 dark:text-[#859394]">دقيقة / مريض</span>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-[#bbc9ca]">وقت فحص إكلينيكي وتوجيه علاجي مثالي</span>
        </div>

        <div className="bg-white dark:bg-[#111A2E] p-5 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-[#859394]">متوسط انتظار صالة الانتظار</span>
            <span className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-base">hourglass_top</span>
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 font-mono">14.2</span>
            <span className="text-xs font-bold text-slate-500 dark:text-[#859394]">دقيقة فقط</span>
          </div>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">أقل بنسبة 28% عن المعيار العام</span>
        </div>
      </div>

      {/* Main Analytical Grid: Most Frequent Diagnoses & Peak Attendance Hours */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Most Frequent Diagnoses (ICD-10 Distribution) - 7 Cols */}
        <div className="lg:col-span-7 bg-white dark:bg-[#111A2E] p-6 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm flex flex-col gap-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#008f97] dark:text-[#00c2cb] text-xl">bar_chart</span>
              <h2 className="text-sm font-bold text-slate-900 dark:text-[#dde2f5]">أكثر التشخيصات والأمراض تردداً على العيادة</h2>
            </div>
            <span className="text-xs text-slate-500 dark:text-[#859394]">تصنيف د. حازم القاضي</span>
          </div>

          <div className="space-y-4">
            {[
              { name: 'جرثومة المعدة وقرحة الاثنى عشر (H. Pylori)', count: 52, percent: 28, color: 'bg-[#00c2cb]' },
              { name: 'ارتفاع ضغط الدم الشرياني (Essential HTN)', count: 44, percent: 24, color: 'bg-purple-500' },
              { name: 'السكري من النوع الثاني واعتلال الأعصاب (T2D)', count: 38, percent: 21, color: 'bg-indigo-500' },
              { name: 'القولون العصبي وعسر الهضم الوظيفي (IBS)', count: 26, percent: 14, color: 'bg-teal-500' },
              { name: 'التهاب الشعب الهوائية وحساسية الصدر', count: 14, percent: 8, color: 'bg-amber-500' },
              { name: 'أخرى (فحوصات دورية ومتابعة تحاليل عامة)', count: 10, percent: 5, color: 'bg-slate-400' },
            ].map((item, idx) => (
              <div key={idx} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-800 dark:text-[#dde2f5]">{item.name}</span>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-slate-500 dark:text-[#859394]">{item.count} حالة</span>
                    <span className="text-[#008f97] dark:text-[#00c2cb] font-bold">{item.percent}%</span>
                  </div>
                </div>
                <div className="h-2 w-full bg-slate-100 dark:bg-[#080e1b] rounded-full overflow-hidden border border-slate-200 dark:border-white/5">
                  <div
                    className={`h-full ${item.color} rounded-full transition-all duration-500`}
                    style={{ width: `${item.percent}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Peak Hours & Patient Traffic Breakdown - 5 Cols */}
        <div className="lg:col-span-5 bg-white dark:bg-[#111A2E] p-6 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-purple-600 dark:text-[#d0bcff] text-xl">schedule</span>
              <h2 className="text-sm font-bold text-slate-900 dark:text-[#dde2f5]">ساعات ذروة الحضور والازدحام</h2>
            </div>
            <span className="text-xs text-slate-500 dark:text-[#859394]">توزيع المواعيد</span>
          </div>

          <p className="text-xs text-slate-500 dark:text-[#bbc9ca]">
            لتنظيم تدفق صالة الانتظار وتقليل مدة التكدس في الفترات المسائية:
          </p>

          <div className="space-y-3">
            {[
              { slot: '05:00 م - 06:30 م (بداية الفترة المسائية)', load: '78%', level: 'عالية جداً', color: 'text-rose-500 bg-rose-50 dark:bg-rose-950/30' },
              { slot: '06:30 م - 08:30 م (ذروة الكشوفات)', load: '94%', level: 'أقصى ضغط', color: 'text-rose-600 bg-rose-100 dark:bg-rose-950/50' },
              { slot: '08:30 م - 10:00 م (المتابعات المتأخرة)', load: '52%', level: 'متوسطة', color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30' },
              { slot: '10:00 م - 11:00 م (حالات الطوارئ والختام)', load: '25%', level: 'منخفضة', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30' },
            ].map((hour, i) => (
              <div
                key={i}
                className="p-3 bg-slate-50 dark:bg-[#080e1b] rounded-xl flex items-center justify-between border border-slate-200 dark:border-white/5"
              >
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-800 dark:text-[#dde2f5]">{hour.slot}</span>
                  <span className="text-[11px] text-slate-500 dark:text-[#859394]">معدل إشغال العيادة: {hour.load}</span>
                </div>
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg ${hour.color}`}>
                  {hour.level}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-auto p-3.5 rounded-xl bg-purple-50 dark:bg-[#18233C] border border-purple-200 dark:border-purple-800/30 flex items-center gap-3">
            <span className="material-symbols-outlined text-purple-600 dark:text-[#d0bcff] text-xl">lightbulb</span>
            <p className="text-xs text-purple-900 dark:text-[#d0bcff] leading-relaxed">
              <strong>توصية ذكية:</strong> يُنصح بتوجيه الاستشارات الخفيفة إلى الفترة بين 05:00 و 06:00 م لتفريغ الذروة.
            </p>
          </div>
        </div>
      </div>

      {/* Free Followup & Patient Loyalty Analytics */}
      <div className="bg-white dark:bg-[#111A2E] p-6 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-600 text-xl">health_and_safety</span>
            <h2 className="text-sm font-bold text-slate-900 dark:text-[#dde2f5]">حوكمة الاستشارات والمتابعات المجانية (14 يوماً)</h2>
          </div>
          <span className="text-xs text-slate-500 dark:text-[#859394]">لائحة عيادة د. حازم القاضي</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-50 dark:bg-[#080e1b] rounded-xl border border-slate-200 dark:border-white/5 flex flex-col gap-1">
            <span className="text-xs text-slate-500 dark:text-[#859394]">معدل التزام المرضى بالمتابعة:</span>
            <span className="text-xl font-bold text-slate-900 dark:text-[#dde2f5] font-mono">73%</span>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400">معدل شفاء ومتابعة ممتاز</span>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-[#080e1b] rounded-xl border border-slate-200 dark:border-white/5 flex flex-col gap-1">
            <span className="text-xs text-slate-500 dark:text-[#859394]">استشارات مجانية ضمن الـ 14 يوم:</span>
            <span className="text-xl font-bold text-slate-900 dark:text-[#dde2f5] font-mono">46 استشارة</span>
            <span className="text-[11px] text-slate-500 dark:text-[#bbc9ca]">بدون تحصيل رسوم طبقاً للائحة</span>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-[#080e1b] rounded-xl border border-slate-200 dark:border-white/5 flex flex-col gap-1">
            <span className="text-xs text-slate-500 dark:text-[#859394]">حالات تجاوزت فترة الاستشارة:</span>
            <span className="text-xl font-bold text-purple-600 dark:text-[#d0bcff] font-mono">8 حالات</span>
            <span className="text-[11px] text-purple-700 dark:text-[#d0bcff]">تم تحويلها لكشف متابعة بنصف القيمة (150 ج.م)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

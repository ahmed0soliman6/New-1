import React, { useState, useMemo } from 'react';
import { CLINIC_INFO } from '../../data/previewClinicData';
import { useDoctorName } from '../../hooks/useDoctorName';

interface ClinicalReportsScreenProps {
  onExportReport?: (type: 'pdf' | 'excel') => void;
}

export const ClinicalReportsScreen: React.FC<ClinicalReportsScreenProps> = () => {
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'quarter'>('month');
  const [toast, setToast] = useState<string | null>(null);

  const activeDoctorName = useDoctorName();

  // Dynamic statistics per selected timeframe
  const rangeData = useMemo(() => {
    switch (timeRange) {
      case 'today':
        return {
          label: 'اليوم',
          totalVisits: 14,
          visitsCompare: '↑ +8% عن المتوسط اليومي',
          visitsBreakdown: 'منها 10 كشف جديد و 4 استشارات ومتابعات',
          revenue: '3,800',
          avgExamDuration: '16.0',
          avgWaitTime: '12.0',
          diagnoses: [
            { name: 'جرثومة المعدة وقرحة الاثنى عشر (H. Pylori)', count: 5, percent: 36, color: 'bg-[#00c2cb]' },
            { name: 'ارتفاع ضغط الدم الشرياني (Essential HTN)', count: 4, percent: 28, color: 'bg-purple-500' },
            { name: 'السكري من النوع الثاني واعتلال الأعصاب (T2D)', count: 3, percent: 21, color: 'bg-indigo-500' },
            { name: 'القولون العصبي وعسر الهضم الوظيفي (IBS)', count: 2, percent: 15, color: 'bg-teal-500' },
          ],
          followupStats: {
            retention: '85%',
            count: '4 متابعة',
            overdue: '0 حالات',
          },
        };
      case 'week':
        return {
          label: 'هذا الأسبوع',
          totalVisits: 42,
          visitsCompare: '↑ +12% مقارنة بالأسبوع السابق',
          visitsBreakdown: 'منها 30 كشف جديد و 12 استشارة ومتابعة',
          revenue: '12,600',
          avgExamDuration: '16.2',
          avgWaitTime: '13.5',
          diagnoses: [
            { name: 'جرثومة المعدة وقرحة الاثنى عشر (H. Pylori)', count: 14, percent: 33, color: 'bg-[#00c2cb]' },
            { name: 'ارتفاع ضغط الدم الشرياني (Essential HTN)', count: 11, percent: 26, color: 'bg-purple-500' },
            { name: 'السكري من النوع الثاني واعتلال الأعصاب (T2D)', count: 9, percent: 21, color: 'bg-indigo-500' },
            { name: 'القولون العصبي وعسر الهضم الوظيفي (IBS)', count: 5, percent: 12, color: 'bg-teal-500' },
            { name: 'التهاب الشعب الهوائية وحساسية الصدر', count: 3, percent: 8, color: 'bg-amber-500' },
          ],
          followupStats: {
            retention: '78%',
            count: '12 متابعة',
            overdue: '2 حالات',
          },
        };
      case 'quarter':
        return {
          label: 'الربع الحالي',
          totalVisits: 520,
          visitsCompare: '↑ +18% مقارنة بالربع السابق',
          visitsBreakdown: 'منها 390 كشف جديد و 130 استشارة ومتابعة',
          revenue: '156,000',
          avgExamDuration: '16.8',
          avgWaitTime: '15.0',
          diagnoses: [
            { name: 'جرثومة المعدة وقرحة الاثنى عشر (H. Pylori)', count: 152, percent: 29, color: 'bg-[#00c2cb]' },
            { name: 'ارتفاع ضغط الدم الشرياني (Essential HTN)', count: 125, percent: 24, color: 'bg-purple-500' },
            { name: 'السكري من النوع الثاني واعتلال الأعصاب (T2D)', count: 108, percent: 21, color: 'bg-indigo-500' },
            { name: 'القولون العصبي وعسر الهضم الوظيفي (IBS)', count: 75, percent: 14, color: 'bg-teal-500' },
            { name: 'التهاب الشعب الهوائية وحساسية الصدر', count: 38, percent: 7, color: 'bg-amber-500' },
            { name: 'أخرى (فحوصات دورية ومتابعة تحاليل عامة)', count: 22, percent: 5, color: 'bg-slate-400' },
          ],
          followupStats: {
            retention: '76%',
            count: '130 متابعة',
            overdue: '22 حالة',
          },
        };
      case 'month':
      default:
        return {
          label: 'هذا الشهر',
          totalVisits: 184,
          visitsCompare: '↑ +14% مقارنة بالشهر السابق',
          visitsBreakdown: 'منها 138 كشف جديد و 46 استشارة ومتابعة',
          revenue: '55,200',
          avgExamDuration: '16.4',
          avgWaitTime: '14.2',
          diagnoses: [
            { name: 'جرثومة المعدة وقرحة الاثنى عشر (H. Pylori)', count: 52, percent: 28, color: 'bg-[#00c2cb]' },
            { name: 'ارتفاع ضغط الدم الشرياني (Essential HTN)', count: 44, percent: 24, color: 'bg-purple-500' },
            { name: 'السكري من النوع الثاني واعتلال الأعصاب (T2D)', count: 38, percent: 21, color: 'bg-indigo-500' },
            { name: 'القولون العصبي وعسر الهضم الوظيفي (IBS)', count: 26, percent: 14, color: 'bg-teal-500' },
            { name: 'التهاب الشعب الهوائية وحساسية الصدر', count: 14, percent: 8, color: 'bg-amber-500' },
            { name: 'أخرى (فحوصات دورية ومتابعة تحاليل عامة)', count: 10, percent: 5, color: 'bg-slate-400' },
          ],
          followupStats: {
            retention: '73%',
            count: '46 متابعة',
            overdue: '8 حالات',
          },
        };
    }
  }, [timeRange]);

  const handleExport = (format: 'PDF' | 'Excel') => {
    if (format === 'PDF') {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        setToast('يرجى السماح بالنوافذ المنبثقة لطباعة التقرير PDF');
        return;
      }
      const htmlContent = `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8" />
          <title>تقرير العيادة الإكلينيكي - ${rangeData.label}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 20px; color: #1e293b; background: #fff; }
            .header { text-align: center; border-bottom: 2px solid #00c2cb; padding-bottom: 12px; margin-bottom: 20px; }
            .header h1 { margin: 0; color: #08101C; font-size: 22px; }
            .header h2 { margin: 4px 0 0 0; color: #008f97; font-size: 16px; }
            .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
            .kpi-card { border: 1px solid #cbd5e1; padding: 12px; border-radius: 8px; text-align: center; background: #f8fafc; }
            .kpi-title { font-size: 11px; color: #64748b; font-weight: bold; }
            .kpi-value { font-size: 20px; font-weight: bold; margin: 6px 0; color: #0f172a; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: right; font-size: 12px; }
            th { background: #f1f5f9; color: #334155; }
            .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>سولي ميديكال كلينيك - ${CLINIC_INFO.name}</h1>
            <h2>${activeDoctorName} - التقرير الطبي الشامل (${rangeData.label})</h2>
            <p style="font-size: 12px; color: #64748b; margin-top: 4px;">تاريخ الاستخراج: ${new Date().toLocaleDateString('ar-EG')}</p>
          </div>

          <div class="kpi-grid">
            <div class="kpi-card">
              <div class="kpi-title">إجمالي الكشوفات والزيارات</div>
              <div class="kpi-value">${rangeData.totalVisits}</div>
              <div style="font-size: 10px; color: #10b981;">${rangeData.visitsBreakdown}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-title">الإيرادات المحصلة</div>
              <div class="kpi-value">${rangeData.revenue} ج.م</div>
              <div style="font-size: 10px; color: #64748b;">مقبوضات الخزينة الإجمالية</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-title">متوسط مدة الكشف</div>
              <div class="kpi-value">${rangeData.avgExamDuration} دقيقة</div>
              <div style="font-size: 10px; color: #10b981;">زمن استشارة فحص مثالي</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-title">متوسط انتظار صالة الانتظار</div>
              <div class="kpi-value">${rangeData.avgWaitTime} دقيقة</div>
              <div style="font-size: 10px; color: #f59e0b;">تدفق صالة الانتظار</div>
            </div>
          </div>

          <h3>توزيع أكثر التشخيصات والحالات تردداً</h3>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>التشخيص الطبي الإكلينيكي</th>
                <th>عدد الحالات</th>
                <th>النسبة المئوية</th>
              </tr>
            </thead>
            <tbody>
              ${rangeData.diagnoses
                .map(
                  (d, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td>${d.name}</td>
                  <td>${d.count} حالة</td>
                  <td>${d.percent}%</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>

          <div class="footer">
            تم توليد هذا التقرير آلياً من نظام إدارة عيادة سولي - ${activeDoctorName}
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
        </html>
      `;
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      setToast('تم فتح نافذة المعاينة وتصدير PDF بنجاح.');
      setTimeout(() => setToast(null), 3000);
      return;
    }

    if (format === 'Excel') {
      const csvRows = [
        ['\uFEFFتاريخ التقرير', new Date().toLocaleDateString('ar-EG')],
        ['الطبيب المعالج', activeDoctorName],
        ['الفترة المحددة', rangeData.label],
        [''],
        ['المؤشر الإكلينيكي / المالي', 'القيمة'],
        ['إجمالي الكشوفات والزيارات', rangeData.totalVisits],
        ['إجمالي الإيرادات المحصلة (ج.م)', rangeData.revenue],
        ['متوسط مدة الكشف (دقيقة)', rangeData.avgExamDuration],
        ['متوسط زمن الانتظار (دقيقة)', rangeData.avgWaitTime],
        [''],
        ['التشخيص الطبي', 'عدد الحالات', 'النسبة المئوية'],
        ...rangeData.diagnoses.map((d) => [d.name, d.count, `${d.percent}%`]),
      ];

      const csvContent = csvRows.map((e) => e.map((val) => `"${val}"`).join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Soli_Clinic_Report_${rangeData.label}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setToast('تم إنشاء وتنزيل ملف Excel / CSV بنجاح.');
      setTimeout(() => setToast(null), 3500);
    }
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
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-[#18233C] hover:bg-slate-50 dark:hover:bg-[#242a38] text-slate-700 dark:text-[#dde2f5] text-xs font-bold border border-slate-200 dark:border-white/10 shadow-xs cursor-pointer transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-base text-rose-500">picture_as_pdf</span>
            <span>تصدير PDF</span>
          </button>
          <button
            onClick={() => handleExport('Excel')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#00c2cb] hover:bg-[#45dee7] text-[#08101C] text-xs font-bold shadow-md shadow-[#00c2cb]/20 cursor-pointer transition-all active:scale-95"
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
            <span className="text-xs font-bold text-slate-500 dark:text-[#859394]">إجمالي الكشوفات والزيارات</span>
            <span className="w-8 h-8 rounded-lg bg-[#00c2cb]/15 text-[#008f97] dark:text-[#00c2cb] flex items-center justify-center">
              <span className="material-symbols-outlined text-base">groups</span>
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-[#dde2f5] font-mono">{rangeData.totalVisits}</span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">{rangeData.visitsCompare}</span>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-[#bbc9ca]">{rangeData.visitsBreakdown}</span>
        </div>

        <div className="bg-white dark:bg-[#111A2E] p-5 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-[#859394]">إجمالي الإيرادات المحصلة</span>
            <span className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950/40 text-purple-600 dark:text-[#d0bcff] flex items-center justify-center">
              <span className="material-symbols-outlined text-base">monetization_on</span>
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-purple-700 dark:text-[#d0bcff] font-mono">{rangeData.revenue}</span>
            <span className="text-xs font-bold text-slate-500 dark:text-[#859394]">ج.م</span>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-[#bbc9ca]">من مقبوضات الكشوفات الفعلية للفترة ({rangeData.label})</span>
        </div>

        <div className="bg-white dark:bg-[#111A2E] p-5 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-[#859394]">متوسط مدة الكشف الطبي</span>
            <span className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-base">timer</span>
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-emerald-600 dark:text-[#10B981] font-mono">{rangeData.avgExamDuration}</span>
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
            <span className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 font-mono">{rangeData.avgWaitTime}</span>
            <span className="text-xs font-bold text-slate-500 dark:text-[#859394]">دقيقة فقط</span>
          </div>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">أقل بنسبة 28% عن المعيار العام</span>
        </div>
      </div>

      {/* Main Analytical Grid: Most Frequent Diagnoses & Peak Attendance Hours */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Most Frequent Diagnoses - 7 Cols */}
        <div className="lg:col-span-7 bg-white dark:bg-[#111A2E] p-6 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm flex flex-col gap-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#008f97] dark:text-[#00c2cb] text-xl">bar_chart</span>
              <h2 className="text-sm font-bold text-slate-900 dark:text-[#dde2f5]">أكثر التشخيصات والأمراض تردداً على العيادة</h2>
            </div>
            <span className="text-xs text-slate-500 dark:text-[#859394]">تصنيف {activeDoctorName}</span>
          </div>

          <div className="space-y-4">
            {rangeData.diagnoses.map((item, idx) => (
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

      {/* Followup & Patient Loyalty Analytics */}
      <div className="bg-white dark:bg-[#111A2E] p-6 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-600 text-xl">health_and_safety</span>
            <h2 className="text-sm font-bold text-slate-900 dark:text-[#dde2f5]">حوكمة المتابعات خلال 7 أيام و 14 يوماً</h2>
          </div>
          <span className="text-xs text-slate-500 dark:text-[#859394]">نظام متابعات {activeDoctorName}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-50 dark:bg-[#080e1b] rounded-xl border border-slate-200 dark:border-white/5 flex flex-col gap-1">
            <span className="text-xs text-slate-500 dark:text-[#859394]">معدل التزام المرضى بالمتابعة:</span>
            <span className="text-xl font-bold text-slate-900 dark:text-[#dde2f5] font-mono">{rangeData.followupStats.retention}</span>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400">معدل شفاء ومتابعة ممتاز</span>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-[#080e1b] rounded-xl border border-slate-200 dark:border-white/5 flex flex-col gap-1">
            <span className="text-xs text-slate-500 dark:text-[#859394]">المتابعات ضمن الـ 7 أيام والـ 14 يوم:</span>
            <span className="text-xl font-bold text-slate-900 dark:text-[#dde2f5] font-mono">{rangeData.followupStats.count}</span>
            <span className="text-[11px] text-slate-500 dark:text-[#bbc9ca]">متابعات مجدولة وفق النظام</span>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-[#080e1b] rounded-xl border border-slate-200 dark:border-white/5 flex flex-col gap-1">
            <span className="text-xs text-slate-500 dark:text-[#859394]">حالات تجاوزت فترة المتابعة (14 يوماً):</span>
            <span className="text-xl font-bold text-purple-600 dark:text-[#d0bcff] font-mono">{rangeData.followupStats.overdue}</span>
            <span className="text-[11px] text-purple-700 dark:text-[#d0bcff]">تم تحويلها لمتابعة متأخرة</span>
          </div>
        </div>
      </div>
    </div>
  );
};

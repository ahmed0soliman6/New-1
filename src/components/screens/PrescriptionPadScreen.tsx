import React, { useState } from 'react';
import { PrescriptionItem, PatientListItem } from '../../types';
import { INITIAL_PRESCRIPTIONS, CLINIC_INFO } from '../../data/previewClinicData';

interface PrescriptionPadScreenProps {
  patient?: PatientListItem;
  items?: PrescriptionItem[];
  onChangeItems?: (items: PrescriptionItem[]) => void;
}

export const PrescriptionPadScreen: React.FC<PrescriptionPadScreenProps> = ({
  patient,
  items: externalItems,
  onChangeItems,
}) => {
  const [internalItems, setInternalItems] = useState<PrescriptionItem[]>(INITIAL_PRESCRIPTIONS);
  const items = externalItems || internalItems;
  const setItems = (newItems: PrescriptionItem[]) => {
    if (onChangeItems) {
      onChangeItems(newItems);
    } else {
      setInternalItems(newItems);
    }
  };
  const [newDrug, setNewDrug] = useState('');
  const [newDosage, setNewDosage] = useState('');
  const [newDuration, setNewDuration] = useState('');
  const [instructions, setInstructions] = useState(
    'تجنب تماماً الأطعمة الدسمة، الحارة، المقليات، والمشروبات الغازية. الامتناع عن التدخين وعدم الاستلقاء مباشرة بعد الوجبات لمدة ساعتين على الأقل.'
  );
  const [nextFollowup, setNextFollowup] = useState('29 أكتوبر 2024 (استشارة مجانية ضمن الـ 14 يوماً)');
  const [selectedBranchId, setSelectedBranchId] = useState(CLINIC_INFO.branches[0]?.id || 'main');
  const [showToast, setShowToast] = useState(false);

  const currentBranch = CLINIC_INFO.branches.find((b) => b.id === selectedBranchId) || CLINIC_INFO.branches[0];

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDrug.trim()) return;
    const item: PrescriptionItem = {
      id: `p-${Date.now()}`,
      drugName: newDrug,
      dosage: newDosage || 'قرص واحد يومياً',
      timing: 'قبل الإفطار',
      duration: newDuration || 'لمدة 30 يوماً',
    };
    setItems([...items, item]);
    setNewDrug('');
    setNewDosage('');
    setNewDuration('');
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter((it) => it.id !== id));
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsapp = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3500);
  };

  return (
    <div className="flex flex-col w-full pb-16 space-y-6 text-slate-800 dark:text-[#dde2f5]">
      {/* Toast */}
      {showToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-[#18233C] border border-[#10B981] text-emerald-600 dark:text-[#10B981] px-6 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in">
          <span className="material-symbols-outlined text-xl">chat</span>
          <span className="text-xs font-bold">تم توليد رابط الروشتة وإرسالها إلكترونياً لواتساب المريض</span>
        </div>
      )}

      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-[#dde2f5] flex items-center gap-2">
            <span className="material-symbols-outlined text-[#008f97] dark:text-[#00c2cb] text-2xl">prescriptions</span>
            <span>الروشتة الطبية الإلكترونية المعتمدة (Rx)</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-[#bbc9ca] mt-0.5">
            نسق الطباعة القياسي A5 المعتمد لنقابة الأطباء المصرية والصيدليات
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleShareWhatsapp}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-[#10B981]/20 hover:bg-emerald-100 dark:hover:bg-[#10B981]/30 text-emerald-700 dark:text-[#10B981] text-xs font-bold transition-all cursor-pointer border border-emerald-200 dark:border-[#10B981]/30"
          >
            <span className="material-symbols-outlined text-base">share</span>
            <span>إرسال واتساب</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00c2cb] hover:bg-[#45dee7] text-[#08101C] text-xs font-bold shadow-md shadow-[#00c2cb]/20 transition-all cursor-pointer active:scale-95"
          >
            <span className="material-symbols-outlined text-base">print</span>
            <span>طباعة الروشتة (A5)</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Prescription A5 Paper Canvas Preview (8 Cols) */}
        <div className="lg:col-span-8 bg-white text-[#0f172a] rounded-2xl shadow-2xl p-6 sm:p-8 border border-slate-200 min-h-[720px] flex flex-col justify-between print:m-0 print:p-6 print:border-none print:shadow-none">
          {/* Clinic Header Banner */}
          <div className="border-b-2 border-[#00c2cb] pb-4">
            <div className="flex items-start justify-between gap-2">
              {/* Arabic Info */}
              <div className="text-right">
                <h2 className="text-xl font-bold text-[#0f172a] leading-tight">عيادات سولي التخصصية</h2>
                <div className="text-sm font-bold text-[#008f97] mt-0.5">د. حازم القاضي</div>
                <div className="text-xs text-slate-600 mt-0.5">
                  استشاري الباطنة العامة وأمراض القلب والسكر
                </div>
                <div className="text-[11px] text-slate-500">
                  دكتوراه الطب الباطني - جامعة القاهرة • زميل الكلية الملكية للأطباء
                </div>
              </div>

              {/* Logo Badge */}
              <div className="flex flex-col items-center shrink-0">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#080e1b] flex items-center justify-center text-[#00c2cb] shadow-md">
                  <span className="material-symbols-outlined text-2xl sm:text-3xl font-bold">medical_services</span>
                </div>
                <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">
                  SOLI CLINIC
                </span>
              </div>

              {/* English Info */}
              <div className="text-left hidden sm:block" dir="ltr">
                <h2 className="text-lg font-bold text-[#0f172a] leading-tight">Soli Medical Clinics</h2>
                <div className="text-sm font-bold text-[#008f97] mt-0.5">Dr. Hazem El-Kady</div>
                <div className="text-xs text-slate-600 mt-0.5">Consultant of Internal Medicine & Cardiology</div>
                <div className="text-[11px] text-slate-500">M.D., MRCP (UK) • Cairo University</div>
              </div>
            </div>
          </div>

          {/* Patient Meta Strip */}
          <div className="bg-slate-100/90 rounded-xl p-3 my-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs border border-slate-200">
            <div>
              <span className="text-slate-500 block text-[11px]">اسم المريض:</span>
              <strong className="text-slate-900 text-sm">
                {patient ? patient.name : 'أحمد محمد إبراهيم الشناوي'}
              </strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">السن / الجنس:</span>
              <strong className="text-slate-800">
                {patient ? `${patient.age} سنة` : '38 سنة'} • ذكر
              </strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">التاريخ:</span>
              <strong className="text-slate-800 font-mono">15 أكتوبر 2024</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">رقم الملف الطبي:</span>
              <strong className="text-[#008f97] font-mono">
                ملف رقم: {patient?.fileNumber || 1}
              </strong>
            </div>
          </div>

          {/* Rx Body */}
          <div className="flex-1 my-2">
            <div className="text-3xl font-serif font-black text-[#008f97] mb-3 select-none flex items-center gap-2">
              <span>℞</span>
              <span className="text-xs font-sans text-slate-400 font-normal">الوصفة العلاجية الدوائية</span>
            </div>

            {/* Drugs List */}
            <div className="space-y-4 pr-3 border-r-2 border-[#00c2cb]/30">
              {items.map((item, index) => (
                <div key={item.id} className="group relative">
                  <div className="flex items-baseline justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center font-mono">
                        {index + 1}
                      </span>
                      <span className="text-base font-bold text-slate-900 font-mono" dir="ltr">
                        {item.drugName}
                      </span>
                    </div>
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      className="opacity-0 group-hover:opacity-100 text-red-500 text-xs hover:underline cursor-pointer print:hidden transition-opacity"
                    >
                      حذف
                    </button>
                  </div>
                  <div className="text-xs text-slate-700 font-medium mr-7 mt-0.5">
                    الجرعة: {item.dosage} — {item.timing} ({item.duration})
                  </div>
                </div>
              ))}
            </div>

            {/* Medical Instructions & Advice */}
            <div className="mt-8 pt-4 border-t border-slate-200">
              <div className="text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-[#008f97]">tips_and_updates</span>
                <span>تعليمات وإرشادات الطبيب للمريض:</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                {instructions}
              </p>
            </div>
          </div>

          {/* Prescription Footer: Stamp, Signature & Verification QR */}
          <div className="border-t-2 border-slate-200 pt-4 mt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
              {/* Branch address & Contact */}
              <div className="text-[11px] text-slate-600 space-y-0.5">
                <div className="font-bold text-slate-800 flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs text-[#008f97]">location_on</span>
                  <span>{currentBranch?.name || 'الفرع الرئيسي'}: {currentBranch?.address || '14 شارع جامعة الدول العربية - المهندسين - الجيزة'}</span>
                </div>
                <div dir="ltr" className="text-right sm:text-left font-mono text-slate-500">
                  Tel: {currentBranch?.phone || '+20 2 3762 9481'} | WhatsApp: +20 10 9283 7465
                </div>
                <div className="text-[#008f97] font-semibold mt-1">
                  موعد الاستشارة: {nextFollowup}
                </div>
              </div>

              {/* Official Stamp & QR Code */}
              <div className="flex items-center gap-4 self-end sm:self-auto">
                <div className="w-16 h-16 border-2 border-slate-300 rounded-lg flex flex-col items-center justify-center p-1 text-center bg-slate-50">
                  <span className="material-symbols-outlined text-3xl text-slate-700">qr_code_2</span>
                  <span className="text-[8px] text-slate-400 font-mono">تحقق بالصيدلية</span>
                </div>

                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-2 border-dashed border-[#008f97]/60 flex flex-col items-center justify-center text-center p-1 text-[#008f97] rotate-6">
                  <span className="text-[10px] font-bold">ختم العيادة المعتمد</span>
                  <span className="text-[9px] font-bold">د. حازم القاضي</span>
                  <span className="text-[8px] font-mono">ترخيص: 48201</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Prescription Editor Tools (4 Cols) */}
        <div className="lg:col-span-4 flex flex-col gap-5 print:hidden">
          {/* Clinic Branch & Location Card (Moved from Header to Prescription) */}
          <div className="bg-white dark:bg-[#111A2E] p-5 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-slate-900 dark:text-[#dde2f5] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[#008f97] dark:text-[#00c2cb] text-base">apartment</span>
              <span>بيانات وعنوان فرع العيادة</span>
            </h3>
            <div>
              <label className="text-[11px] text-slate-500 dark:text-[#859394] block mb-1">اختر فرع العيادة المطبوع على الروشتة:</label>
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/5 font-semibold focus:outline-none focus:ring-1 focus:ring-[#00c2cb]"
              >
                {CLINIC_INFO.branches.map((b) => (
                  <option key={b.id} value={b.id} className="bg-white dark:bg-[#111A2E] text-slate-900 dark:text-[#dde2f5]">
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-[#080e1b] rounded-xl border border-slate-200 dark:border-white/5 text-xs space-y-1">
              <div className="flex items-start gap-1.5 text-slate-700 dark:text-[#dde2f5]">
                <span className="material-symbols-outlined text-sm text-[#008f97] dark:text-[#00c2cb] shrink-0 mt-0.5">location_on</span>
                <span>{currentBranch?.address}</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-[#859394]">
                <span className="material-symbols-outlined text-sm shrink-0">call</span>
                <span dir="ltr">{currentBranch?.phone}</span>
              </div>
            </div>
          </div>

          {/* Quick Drug Add Form */}
          <form onSubmit={handleAddItem} className="bg-white dark:bg-[#111A2E] p-5 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-900 dark:text-[#dde2f5] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[#008f97] dark:text-[#00c2cb] text-base">add_circle</span>
              <span>إضافة صنف دوائي للروشتة</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-slate-500 dark:text-[#859394] block mb-1">اسم الدواء والتركيز (باللاتينية):</label>
                <input
                  type="text"
                  required
                  dir="ltr"
                  value={newDrug}
                  onChange={(e) => setNewDrug(e.target.value)}
                  placeholder="e.g. Nexium 40mg Tab"
                  className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-white/5 font-mono focus:outline-none focus:ring-1 focus:ring-[#00c2cb]"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-500 dark:text-[#859394] block mb-1">الجرعة وطريقة الاستخدام:</label>
                <input
                  type="text"
                  value={newDosage}
                  onChange={(e) => setNewDosage(e.target.value)}
                  placeholder="قرص واحد قبل الإفطار"
                  className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-white/5 focus:outline-none focus:ring-1 focus:ring-[#00c2cb]"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-500 dark:text-[#859394] block mb-1">مدة العلاج:</label>
                <input
                  type="text"
                  value={newDuration}
                  onChange={(e) => setNewDuration(e.target.value)}
                  placeholder="لمدة 14 يوماً"
                  className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-white/5 focus:outline-none focus:ring-1 focus:ring-[#00c2cb]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#00c2cb] hover:bg-[#45dee7] text-[#08101C] font-bold text-xs shadow-md shadow-[#00c2cb]/20 transition-all cursor-pointer"
              >
                + إدراج الدواء في الروشتة
              </button>
            </div>
          </form>

          {/* Doctor Instructions Editor */}
          <div className="bg-white dark:bg-[#111A2E] p-5 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-slate-900 dark:text-[#dde2f5] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[#008f97] dark:text-[#00c2cb] text-base">edit_note</span>
              <span>تعديل الإرشادات والنصائح</span>
            </h3>
            <textarea
              rows={3}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs p-3 rounded-xl border border-slate-200 dark:border-white/5 focus:outline-none focus:ring-1 focus:ring-[#00c2cb]"
            />
          </div>

          {/* Followup Rule Reminder */}
          <div className="bg-white dark:bg-[#111A2E] p-5 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm space-y-2">
            <h3 className="text-xs font-bold text-slate-900 dark:text-[#dde2f5] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-emerald-600 text-base">event_repeat</span>
              <span>ميعاد الاستشارة المجانية</span>
            </h3>
            <input
              type="text"
              value={nextFollowup}
              onChange={(e) => setNextFollowup(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/5 focus:outline-none"
            />
            <span className="text-[10px] text-slate-500 dark:text-[#859394] block">
              طبقاً للائحة النقابة: يحق للمريض استشارة مجانية واحدة خلال 14 يوماً من تاريخ الكشف.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

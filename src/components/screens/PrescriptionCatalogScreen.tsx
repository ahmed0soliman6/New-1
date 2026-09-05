import React, { useState } from 'react';
import { CLINICAL_PROTOCOLS, ClinicProtocol } from '../../data/previewClinicData';
import { ScreenType } from '../../types';

interface PrescriptionCatalogScreenProps {
  onNavigate?: (screen: ScreenType) => void;
  onApplyProtocolToPrescription?: (protocol: ClinicProtocol) => void;
}

export const PrescriptionCatalogScreen: React.FC<PrescriptionCatalogScreenProps> = ({
  onNavigate,
  onApplyProtocolToPrescription,
}) => {
  const [protocols, setProtocols] = useState<ClinicProtocol[]>(CLINICAL_PROTOCOLS);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string>(protocols[0]?.id || '');
  const [showAddModal, setShowAddModal] = useState(false);

  // New protocol form state
  const [newProtName, setNewProtName] = useState('');
  const [newProtCategory, setNewProtCategory] = useState('الجهاز الهضمي');
  const [newProtIndication, setNewProtIndication] = useState('');
  const [newProtDrugName, setNewProtDrugName] = useState('');
  const [newProtDosage, setNewProtDosage] = useState('');

  const categories = ['all', 'الجهاز الهضمي', 'القلب والأوعية الدموية', 'الغدد الصماء والسكر'];

  const filtered = protocols.filter((p) => {
    const matchCategory = selectedCategory === 'all' || p.category === selectedCategory;
    const matchSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.indication.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.drugs.some((d) => d.drugName.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchCategory && matchSearch;
  });

  const handleApply = (prot: ClinicProtocol) => {
    if (onApplyProtocolToPrescription) {
      onApplyProtocolToPrescription(prot);
    }
    setToast(`تم تحميل بروتوكول "${prot.name}" في مسودة الروشتة بنجاح!`);
    setTimeout(() => {
      setToast(null);
      if (onNavigate) {
        onNavigate('prescription-pad');
      }
    }, 1200);
  };

  const handleAddProtocol = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProtName.trim()) return;

    const newP: ClinicProtocol = {
      id: `prot-${Date.now()}`,
      name: newProtName,
      category: newProtCategory,
      indication: newProtIndication || 'بروتوكول علاجي مخصص للعيادة',
      drugs: newProtDrugName
        ? [
            {
              drugName: newProtDrugName,
              scientificName: 'مركب علاجي',
              dosage: newProtDosage || 'قرص يومياً',
              duration: '14 يوماً',
              timing: 'بعد الأكل',
            },
          ]
        : [],
      lifestyleAdvice: ['اتباع تعليمات الطبيب وتناول الأدوية في مواعيدها المحددة بدقة.'],
    };

    setProtocols([newP, ...protocols]);
    setShowAddModal(false);
    setNewProtName('');
    setNewProtIndication('');
    setNewProtDrugName('');
    setNewProtDosage('');
    setToast(`تمت إضافة البروتوكول الطبي الجديد "${newP.name}"`);
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="flex flex-col w-full pb-16 space-y-6 text-slate-800 dark:text-[#dde2f5]">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-[#18233C] border border-[#00c2cb] text-slate-900 dark:text-[#45dee7] px-6 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in">
          <span className="material-symbols-outlined text-2xl text-[#00c2cb]">task_alt</span>
          <span className="text-sm font-bold">{toast}</span>
        </div>
      )}

      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-[#859394] mb-1">
            <span>الرئيسية</span>
            <span>&gt;</span>
            <span className="text-[#008f97] dark:text-[#00c2cb]">الأدلة والبروتوكولات السريرية</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-[#dde2f5] flex items-center gap-3">
            <span>دليل البروتوكولات العلاجية المعتمدة (Clinical Protocols)</span>
            <span className="bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-[#d0bcff] px-3 py-0.5 rounded-full text-xs font-bold border border-purple-200 dark:border-purple-800/30">
              د. حازم سمير القاضي
            </span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#00c2cb] hover:bg-[#45dee7] text-[#08101C] text-xs font-bold shadow-md shadow-[#00c2cb]/20 transition-all cursor-pointer active:scale-95"
          >
            <span className="material-symbols-outlined text-base">add_circle</span>
            <span>+ إضافة بروتوكول جديد</span>
          </button>
        </div>
      </div>

      {/* Search and Category Filter Bar */}
      <div className="bg-white dark:bg-[#111A2E] p-4 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                selectedCategory === cat
                  ? 'bg-[#00c2cb] text-[#08101C] shadow-sm'
                  : 'bg-slate-100 dark:bg-[#080e1b] text-slate-600 dark:text-[#bbc9ca] hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/5'
              }`}
            >
              {cat === 'all' ? 'جميع التخصصات' : cat}
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-md">
          <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث باسم البروتوكول أو الدواء أو الشكوى..."
            className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] placeholder:text-slate-400 text-xs pr-10 pl-4 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#00c2cb] border border-slate-200 dark:border-white/5"
          />
        </div>
      </div>

      {/* Protocols List */}
      <div className="space-y-4">
        {filtered.map((prot) => {
          const isExpanded = expandedId === prot.id;
          return (
            <div
              key={prot.id}
              className="bg-white dark:bg-[#111A2E] rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden transition-all"
            >
              {/* Card Header */}
              <div
                onClick={() => setExpandedId(isExpanded ? '' : prot.id)}
                className="p-5 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-white/[0.02]"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#00c2cb]/15 text-[#008f97] dark:text-[#00c2cb] flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-xl">pill</span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-[#dde2f5] truncate">{prot.name}</h3>
                      <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-[#080e1b] text-slate-600 dark:text-[#bbc9ca] border border-slate-200 dark:border-white/5">
                        {prot.category}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 dark:text-[#859394] mt-0.5 truncate">{prot.indication}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleApply(prot);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#00c2cb] hover:bg-[#45dee7] text-[#08101C] text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
                  >
                    <span className="material-symbols-outlined text-sm">prescriptions</span>
                    <span>تحميل في الروشتة</span>
                  </button>
                  <span className="material-symbols-outlined text-slate-400 transition-transform duration-200">
                    {isExpanded ? 'expand_less' : 'expand_more'}
                  </span>
                </div>
              </div>

              {/* Collapsible Details */}
              {isExpanded && (
                <div className="p-5 pt-0 border-t border-slate-100 dark:border-white/5 flex flex-col gap-4">
                  {/* Drugs Table */}
                  <div className="mt-4">
                    <h4 className="text-xs font-bold text-slate-700 dark:text-[#bbc9ca] mb-2.5 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-[#008f97] dark:text-[#00c2cb]">medication</span>
                      <span>الأدوية المقررة بالبروتوكول ({prot.drugs.length} مستحضرات):</span>
                    </h4>

                    <div className="overflow-x-auto">
                      <table className="w-full text-right text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-white/10 text-slate-500 dark:text-[#859394]">
                            <th className="pb-2 font-bold pr-2">اسم الدواء التجاري</th>
                            <th className="pb-2 font-bold">الاسم العلمي والتركيز</th>
                            <th className="pb-2 font-bold">الجرعة والتوقيت</th>
                            <th className="pb-2 font-bold">مدة العلاج</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                          {prot.drugs.map((drug, i) => (
                            <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                              <td className="py-2.5 pr-2 font-bold text-slate-900 dark:text-[#dde2f5] font-mono">
                                {drug.drugName}
                              </td>
                              <td className="py-2.5 text-slate-600 dark:text-[#bbc9ca]">{drug.scientificName}</td>
                              <td className="py-2.5 text-[#008f97] dark:text-[#45dee7] font-semibold">{drug.dosage}</td>
                              <td className="py-2.5 text-slate-500 dark:text-[#859394]">{drug.duration}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Lifestyle Advice */}
                  {prot.lifestyleAdvice && prot.lifestyleAdvice.length > 0 && (
                    <div className="bg-slate-50 dark:bg-[#080e1b] p-3.5 rounded-xl border border-slate-200 dark:border-white/5 flex flex-col gap-2">
                      <span className="text-xs font-bold text-purple-700 dark:text-[#d0bcff] flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm">health_and_safety</span>
                        <span>إرشادات ونظام غذائي مرافق للمريض:</span>
                      </span>
                      <ul className="space-y-1 pr-4 list-disc text-xs text-slate-600 dark:text-[#bbc9ca]">
                        {prot.lifestyleAdvice.map((adv, idx) => (
                          <li key={idx}>{adv}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Protocol Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111A2E] w-full max-w-lg rounded-2xl border border-slate-200 dark:border-white/10 shadow-2xl p-6 flex flex-col gap-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-[#dde2f5]">إضافة بروتوكول علاجي جديد</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-[#080e1b] flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddProtocol} className="flex flex-col gap-3 text-xs">
              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-700 dark:text-[#dde2f5]">اسم البروتوكول الطبي *</label>
                <input
                  type="text"
                  required
                  value={newProtName}
                  onChange={(e) => setNewProtName(e.target.value)}
                  placeholder="مثال: بروتوكول علاج التهاب الحلق واللوزتين الحاد"
                  className="bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] p-2.5 rounded-xl border border-slate-200 dark:border-white/5 focus:outline-none focus:ring-1 focus:ring-[#00c2cb]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-700 dark:text-[#dde2f5]">التخصص الطبي</label>
                <select
                  value={newProtCategory}
                  onChange={(e) => setNewProtCategory(e.target.value)}
                  className="bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] p-2.5 rounded-xl border border-slate-200 dark:border-white/5 focus:outline-none"
                >
                  <option value="الجهاز الهضمي">الجهاز الهضمي</option>
                  <option value="القلب والأوعية الدموية">القلب والأوعية الدموية</option>
                  <option value="الغدد الصماء والسكر">الغدد الصماء والسكر</option>
                  <option value="الباطنة العامة">الباطنة العامة</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-700 dark:text-[#dde2f5]">دواعي الاستعمال السريرية</label>
                <textarea
                  rows={2}
                  value={newProtIndication}
                  onChange={(e) => setNewProtIndication(e.target.value)}
                  placeholder="وصف الحالات المرضية الموجه لها هذا البروتوكول..."
                  className="bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] p-2.5 rounded-xl border border-slate-200 dark:border-white/5 focus:outline-none focus:ring-1 focus:ring-[#00c2cb]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-slate-700 dark:text-[#dde2f5]">الدواء الأولي</label>
                  <input
                    type="text"
                    value={newProtDrugName}
                    onChange={(e) => setNewProtDrugName(e.target.value)}
                    placeholder="مثال: Augmentin 1 gm"
                    className="bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] p-2 rounded-xl border border-slate-200 dark:border-white/5 focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-slate-700 dark:text-[#dde2f5]">الجرعة والتوقيت</label>
                  <input
                    type="text"
                    value={newProtDosage}
                    onChange={(e) => setNewProtDosage(e.target.value)}
                    placeholder="مثال: قرص كل 12 ساعة بعد الأكل"
                    className="bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] p-2 rounded-xl border border-slate-200 dark:border-white/5 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-[#080e1b] text-slate-600 dark:text-[#bbc9ca] font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#00c2cb] hover:bg-[#45dee7] text-[#08101C] font-bold shadow-md shadow-[#00c2cb]/20 cursor-pointer"
                >
                  حفظ البروتوكول
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

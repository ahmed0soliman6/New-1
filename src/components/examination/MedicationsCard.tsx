import React, { useState } from 'react';
import { DrugCatalogItem, PrescriptionItem } from '../../types';

interface MedicationsCardProps {
  prescriptionItems: PrescriptionItem[];
  onChangePrescription: (items: PrescriptionItem[]) => void;
  drugCatalog: DrugCatalogItem[];
  onAddDrugToCatalog: (item: DrugCatalogItem) => void;
  onOpenPrescriptionPad?: () => void;
}

export const MedicationsCard: React.FC<MedicationsCardProps> = ({
  prescriptionItems,
  onChangePrescription,
  drugCatalog,
  onAddDrugToCatalog,
  onOpenPrescriptionPad,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchiveSearch, setShowArchiveSearch] = useState(false);
  const [showAddCustomModal, setShowAddCustomModal] = useState(false);

  // Form for custom unlisted drug
  const [newBrandName, setNewBrandName] = useState('');
  const [newGenericName, setNewGenericName] = useState('');
  const [newStrength, setNewStrength] = useState('');
  const [newForm, setNewForm] = useState('أقراص (Tablets)');
  const [newDosage, setNewDosage] = useState('');
  const [newTiming, setNewTiming] = useState('بعد الأكل');
  const [newDuration, setNewDuration] = useState('لمدة 30 يوماً');
  const [newNotes, setNewNotes] = useState('');
  const [saveToFavorites, setSaveToFavorites] = useState(true);

  // Level 1: Favorites
  const favoriteDrugs = drugCatalog.filter((d) => d.isFavorite);

  // Level 2: Search Egyptian Drug Archive
  const searchResults = searchQuery.trim()
    ? drugCatalog.filter(
        (d) =>
          d.brandName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          d.genericName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          d.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  // Add drug from catalog creating a decoupled SNAPSHOT into PrescriptionItem
  const handleAddFromCatalog = (drug: DrugCatalogItem) => {
    // Architectural Snapshot Rule: Creates decoupled snapshot preserving current moment values
    const snapshotItem: PrescriptionItem = {
      id: `rx-snap-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      drugName: `${drug.brandName}`,
      scientificName: drug.genericName,
      strength: drug.strength,
      dosageForm: drug.form,
      dosage: drug.defaultDosage,
      timing: drug.defaultTiming,
      duration: drug.defaultDuration,
      notes: drug.notes || '',
    };

    onChangePrescription([...prescriptionItems, snapshotItem]);
    setSearchQuery('');
    setShowArchiveSearch(false);
  };

  // Add custom unlisted drug
  const handleAddCustomDrug = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedBrand = newBrandName.trim();
    if (!trimmedBrand) return;

    // If doctor opted to save to catalog / favorites:
    if (saveToFavorites) {
      onAddDrugToCatalog({
        id: `med-cat-${Date.now()}`,
        brandName: `${trimmedBrand} ${newStrength}`.trim(),
        genericName: newGenericName.trim(),
        strength: newStrength.trim(),
        form: newForm,
        category: 'أدوية مخصصة',
        defaultDosage: newDosage.trim() || 'قرص واحد يومياً',
        defaultDuration: newDuration.trim() || 'لمدة شهر',
        defaultTiming: newTiming.trim() || 'بعد الأكل',
        isFavorite: true,
        notes: newNotes.trim() || undefined,
      });
    }

    // Create decoupled prescription snapshot
    const snapshotItem: PrescriptionItem = {
      id: `rx-snap-${Date.now()}`,
      drugName: `${trimmedBrand} ${newStrength}`.trim(),
      scientificName: newGenericName.trim() || undefined,
      strength: newStrength.trim() || undefined,
      dosageForm: newForm,
      dosage: newDosage.trim() || 'قرص واحد يومياً',
      timing: newTiming.trim() || 'بعد الأكل',
      duration: newDuration.trim() || 'لمدة 30 يوماً',
      notes: newNotes.trim() || undefined,
    };

    onChangePrescription([...prescriptionItems, snapshotItem]);

    // Reset
    setNewBrandName('');
    setNewGenericName('');
    setNewStrength('');
    setNewDosage('');
    setNewNotes('');
    setShowAddCustomModal(false);
  };

  const handleUpdateSnapshotField = (
    id: string,
    field: keyof PrescriptionItem,
    value: string
  ) => {
    onChangePrescription(
      prescriptionItems.map((it) => (it.id === id ? { ...it, [field]: value } : it))
    );
  };

  const handleRemove = (id: string) => {
    onChangePrescription(prescriptionItems.filter((it) => it.id !== id));
  };

  return (
    <div className="bg-white dark:bg-[#111A2E] p-5 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-white/5 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-[#00c2cb]/15 text-[#008f97] dark:text-[#00c2cb] flex items-center justify-center">
            <span className="material-symbols-outlined text-lg">medication</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-[#dde2f5]">
                العلاج والروشتة الإلكترونية (Rx Snapshot)
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 dark:bg-[#00c2cb]/20 text-[#008f97] dark:text-[#45dee7]">
                {prescriptionItems.length} أدوية موصوفة
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-[#859394]">
              فصل دليل الأدوية عن بنود الروشتة اللحظية لضمان سلامة الأرشيف التاريخي
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenPrescriptionPad && (
            <button
              type="button"
              onClick={onOpenPrescriptionPad}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#18233C] text-slate-700 dark:text-[#dde2f5] hover:bg-slate-200 text-xs font-bold transition-all cursor-pointer"
              title="معاينة الروشتة بحجم A5"
            >
              <span className="material-symbols-outlined text-base">print</span>
              <span>معاينة A5</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowArchiveSearch(!showArchiveSearch)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-[#00c2cb]/15 text-[#008f97] dark:text-[#00c2cb] hover:bg-teal-100 text-xs font-bold transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">search</span>
            <span>أرشيف الأدوية المصري</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddCustomModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#00c2cb] hover:bg-[#45dee7] text-[#08101C] text-xs font-bold transition-all cursor-pointer shadow-xs"
          >
            <span className="material-symbols-outlined text-base">add</span>
            <span>+ إضافة دواء غير مدرج</span>
          </button>
        </div>
      </div>

      {/* LEVEL 1: Doctor's Favorite Medications Strip */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-500 dark:text-[#859394] flex items-center gap-1">
            <span>⭐ المستوى الأول: أدوية الطبيب المفضلة (انقر للإضافة الفورية مع الجرعة):</span>
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            {favoriteDrugs.length} دواء مفضل
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {favoriteDrugs.map((drug) => {
            const isPrescribed = prescriptionItems.some((p) => p.drugName.includes(drug.brandName));
            return (
              <button
                key={drug.id}
                type="button"
                onClick={() => handleAddFromCatalog(drug)}
                className={`p-2.5 rounded-xl text-right transition-all border flex flex-col justify-between cursor-pointer group ${
                  isPrescribed
                    ? 'bg-teal-50/70 dark:bg-[#00c2cb]/10 border-[#00c2cb]/40 text-slate-900 dark:text-[#45dee7]'
                    : 'bg-slate-50 dark:bg-[#080e1b] hover:border-[#00c2cb] border-slate-200 dark:border-white/5 text-slate-800 dark:text-[#dde2f5]'
                }`}
              >
                <div>
                  <div className="text-xs font-bold truncate group-hover:text-[#008f97] dark:group-hover:text-[#00c2cb]">
                    {drug.brandName}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5 font-mono" dir="ltr">
                    {drug.genericName}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-200/60 dark:border-white/5 text-[10px]">
                  <span className="text-slate-500 dark:text-[#859394] truncate">{drug.defaultDosage.slice(0, 18)}...</span>
                  {isPrescribed ? (
                    <span className="text-[#008f97] dark:text-[#00c2cb] font-bold">مضاف ✓</span>
                  ) : (
                    <span className="text-teal-600 font-bold opacity-0 group-hover:opacity-100">+ إضافة</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* LEVEL 2: Egyptian Drug Archive Search Dropdown */}
      {showArchiveSearch && (
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#080e1b] border border-slate-200 dark:border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-teal-600 text-lg">manage_search</span>
              <span className="text-xs font-bold text-slate-800 dark:text-[#dde2f5]">
                المستوى الثاني: البحث في أرشيف الأدوية المصري المحلي
              </span>
            </div>
            <input
              type="text"
              autoFocus
              placeholder="اكتب اسم الدواء التجاري أو العلمي (Concor, Nexium, Amoxicillin)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs bg-white dark:bg-[#111A2E] text-slate-900 dark:text-[#dde2f5] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/10 w-80 focus:outline-none focus:ring-1 focus:ring-[#00c2cb]"
            />
          </div>

          {searchQuery.trim() ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
              {searchResults.length === 0 ? (
                <div className="col-span-3 py-4 text-center text-xs text-slate-500">
                  لا توجد نتائج في الأرشيف المحلي تطابق "{searchQuery}".
                  <button
                    type="button"
                    onClick={() => {
                      setNewBrandName(searchQuery);
                      setShowAddCustomModal(true);
                      setShowArchiveSearch(false);
                    }}
                    className="text-[#008f97] dark:text-[#00c2cb] font-bold mr-2 underline cursor-pointer"
                  >
                    اضغط هنا لإضافته كدواء غير مدرج فوراً
                  </button>
                </div>
              ) : (
                searchResults.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleAddFromCatalog(item)}
                    className="p-2.5 rounded-xl text-right text-xs bg-white dark:bg-[#111A2E] hover:border-[#00c2cb] border border-slate-200 dark:border-white/5 text-slate-800 dark:text-[#dde2f5] flex items-start justify-between cursor-pointer"
                  >
                    <div className="space-y-0.5">
                      <div className="font-bold flex items-center gap-1">
                        {item.isFavorite && <span className="text-amber-500 text-[10px]">⭐</span>}
                        <span>{item.brandName}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono block" dir="ltr">
                        {item.genericName}
                      </span>
                      <span className="text-[10px] text-slate-500 block">{item.defaultDosage}</span>
                    </div>
                    <span className="material-symbols-outlined text-[#00c2cb] text-sm">add_circle</span>
                  </button>
                ))
              )}
            </div>
          ) : (
            <p className="text-[11px] text-slate-400">
              اكتب في حقل البحث أعلاه لاستعراض أدوية السوق المصري المسجلة بالجرعات والأشكال الدوائية.
            </p>
          )}
        </div>
      )}

      {/* Active Prescription Table (Snapshots) */}
      {prescriptionItems.length === 0 ? (
        <div className="py-8 text-center bg-slate-50/50 dark:bg-[#080e1b]/40 rounded-xl border border-dashed border-slate-200 dark:border-white/5">
          <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 text-3xl mb-1">
            prescriptions
          </span>
          <p className="text-xs text-slate-500 dark:text-[#859394]">
            لم يتم إضافة أدوية إلى الروشتة الحالية بعد.
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            اختر من أدوية الطبيب المفضلة بنقرة واحدة، أو ابحث في الأرشيف، أو اضغط "+ إضافة دواء غير مدرج".
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-[#859394] px-1">
            <span>قائمة الأدوية المعتمدة في هذه الاستشارة (قابلة للتعديل والطباعة):</span>
            <span className="text-teal-600 font-mono">Prescription Items Snapshot</span>
          </div>

          {prescriptionItems.map((item, idx) => (
            <div
              key={item.id}
              className="bg-slate-50 dark:bg-[#080e1b] rounded-xl border border-slate-200 dark:border-white/5 p-3.5 space-y-2.5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-teal-100 dark:bg-[#00c2cb]/20 text-[#008f97] dark:text-[#00c2cb] font-mono text-xs font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-[#dde2f5]">{item.drugName}</span>
                    {item.scientificName && (
                      <span className="text-[10px] text-slate-400 mr-2 font-mono" dir="ltr">
                        ({item.scientificName})
                      </span>
                    )}
                    {item.dosageForm && (
                      <span className="text-[10px] text-teal-700 dark:text-[#45dee7] mr-1 px-1.5 py-0.5 rounded bg-teal-50 dark:bg-[#00c2cb]/10">
                        {item.dosageForm}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemove(item.id)}
                  className="p-1 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer self-end sm:self-center"
                  title="حذف من الروشتة"
                >
                  <span className="material-symbols-outlined text-base">delete</span>
                </button>
              </div>

              {/* Editable Dosage & Duration Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-1 border-t border-slate-200 dark:border-white/5">
                <div className="sm:col-span-7 flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-500 dark:text-[#859394] whitespace-nowrap">الجرعة:</span>
                  <input
                    type="text"
                    value={item.dosage || ''}
                    onChange={(e) => handleUpdateSnapshotField(item.id, 'dosage', e.target.value)}
                    placeholder="طريقة الاستخدام وتوقيت الجرعة..."
                    className="w-full bg-white dark:bg-[#111A2E] text-slate-900 dark:text-[#dde2f5] text-xs p-1.5 rounded-lg border border-slate-200 dark:border-white/5 focus:outline-none focus:ring-1 focus:ring-[#00c2cb]"
                  />
                </div>

                <div className="sm:col-span-5 flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-500 dark:text-[#859394] whitespace-nowrap">المدة:</span>
                  <input
                    type="text"
                    value={item.duration || ''}
                    onChange={(e) => handleUpdateSnapshotField(item.id, 'duration', e.target.value)}
                    placeholder="مثال: لمدة شهر، أسبوعين..."
                    className="w-full bg-white dark:bg-[#111A2E] text-slate-900 dark:text-[#dde2f5] text-xs p-1.5 rounded-lg border border-slate-200 dark:border-white/5 focus:outline-none focus:ring-1 focus:ring-[#00c2cb]"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* LEVEL 3: Modal: Add Unlisted Drug */}
      {showAddCustomModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleAddCustomDrug}
            className="bg-white dark:bg-[#18233C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 animate-in zoom-in-95"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-[#dde2f5] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#008f97] dark:text-[#00c2cb]">add_circle</span>
                <span>المستوى الثالث: إضافة دواء غير مدرج في الدليل</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddCustomModal(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-600 dark:text-[#859394] block mb-1">
                  اسم الدواء التجاري (Brand Name):
                </label>
                <input
                  type="text"
                  required
                  value={newBrandName}
                  onChange={(e) => setNewBrandName(e.target.value)}
                  placeholder="مثال: Telfast, Cipralex, Daflon..."
                  className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/5 focus:outline-none focus:ring-1 focus:ring-[#00c2cb]"
                />
              </div>

              <div>
                <label className="text-xs text-slate-600 dark:text-[#859394] block mb-1">التركيز (Strength):</label>
                <input
                  type="text"
                  value={newStrength}
                  onChange={(e) => setNewStrength(e.target.value)}
                  placeholder="مثال: 500 mg, 10 mg, 20 ml..."
                  className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/5 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-600 dark:text-[#859394] block mb-1">
                  المادة الفعالة / الاسم العلمي:
                </label>
                <input
                  type="text"
                  value={newGenericName}
                  onChange={(e) => setNewGenericName(e.target.value)}
                  placeholder="e.g. Fexofenadine, Escitalopram..."
                  className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/5 focus:outline-none font-mono"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="text-xs text-slate-600 dark:text-[#859394] block mb-1">الشكل الدوائي:</label>
                <select
                  value={newForm}
                  onChange={(e) => setNewForm(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/5 focus:outline-none"
                >
                  <option value="أقراص (Tablets)">أقراص (Tablets)</option>
                  <option value="كبسولات (Capsules)">كبسولات (Capsules)</option>
                  <option value="شراب معلق (Suspension)">شراب معلق (Suspension)</option>
                  <option value="أمبولات حقن عضل/وريد (Ampoules)">أمبولات حقن عضل/وريد</option>
                  <option value="فوار (Effervescent)">فوار (Effervescent)</option>
                  <option value="نقط بالفم أو العين (Drops)">نقط بالفم أو العين</option>
                  <option value="مرهم / كريم موضعي (Ointment)">مرهم / كريم موضعي</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-600 dark:text-[#859394] block mb-1">الجرعة وطريقة الاستخدام:</label>
                <input
                  type="text"
                  value={newDosage}
                  onChange={(e) => setNewDosage(e.target.value)}
                  placeholder="مثال: قرص واحد قبل الأكل بنصف ساعة مرتين يومياً..."
                  className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/5 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-slate-600 dark:text-[#859394] block mb-1">المدة:</label>
                <input
                  type="text"
                  value={newDuration}
                  onChange={(e) => setNewDuration(e.target.value)}
                  placeholder="مثال: لمدة شهر، لمدة أسبوع..."
                  className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/5 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 bg-teal-50/60 dark:bg-[#00c2cb]/10 rounded-xl border border-teal-200 dark:border-[#00c2cb]/20">
              <input
                type="checkbox"
                id="saveToFavoritesCheck"
                checked={saveToFavorites}
                onChange={(e) => setSaveToFavorites(e.target.checked)}
                className="w-4 h-4 rounded text-[#00c2cb] accent-[#00c2cb]"
              />
              <label htmlFor="saveToFavoritesCheck" className="text-xs text-slate-700 dark:text-[#dde2f5] cursor-pointer">
                ☑ إضافة إلى قائمة أدوية الطبيب المفضلة (ليظهر في شريط الأدوية المفضلة مستقبلاً)
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddCustomModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-[#111A2E] text-xs text-slate-600 dark:text-[#bbc9ca] hover:bg-slate-200 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#00c2cb] hover:bg-[#45dee7] text-slate-900 font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                إضافة إلى الروشتة Rx
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import {
  RadiologyCatalogItem,
  LabCatalogItem,
  DrugCatalogItem,
  DiagnosisCatalogItem,
  SymptomCatalogItem,
} from '../../types';

interface MedicalCatalogsManagerProps {
  radiologyCatalog: RadiologyCatalogItem[];
  onAddRadiology: (item: RadiologyCatalogItem) => void;
  onRemoveRadiology: (id: string) => void;
  onToggleRadiologyFavorite: (id: string) => void;

  labCatalog: LabCatalogItem[];
  onAddLab: (item: LabCatalogItem) => void;
  onRemoveLab: (id: string) => void;
  onToggleLabFavorite: (id: string) => void;

  drugCatalog: DrugCatalogItem[];
  onAddDrug: (item: DrugCatalogItem) => void;
  onRemoveDrug: (id: string) => void;
  onToggleDrugFavorite: (id: string) => void;

  diagnosesCatalog: DiagnosisCatalogItem[];
  onAddDiagnosis: (item: DiagnosisCatalogItem) => void;
  onRemoveDiagnosis: (id: string) => void;
  onToggleDiagnosisFavorite: (id: string) => void;

  symptomsCatalog: SymptomCatalogItem[];
  onAddSymptom: (item: SymptomCatalogItem) => void;
  onRemoveSymptom: (id: string) => void;
}

export const MedicalCatalogsManager: React.FC<MedicalCatalogsManagerProps> = ({
  radiologyCatalog,
  onAddRadiology,
  onRemoveRadiology,
  onToggleRadiologyFavorite,

  labCatalog,
  onAddLab,
  onRemoveLab,
  onToggleLabFavorite,

  drugCatalog,
  onAddDrug,
  onRemoveDrug,
  onToggleDrugFavorite,

  diagnosesCatalog,
  onAddDiagnosis,
  onRemoveDiagnosis,
  onToggleDiagnosisFavorite,

  symptomsCatalog,
  onAddSymptom,
  onRemoveSymptom,
}) => {
  const [activeCatalogTab, setActiveCatalogTab] = useState<'rad' | 'lab' | 'drugs' | 'diag' | 'sym'>('rad');
  const [searchFilter, setSearchFilter] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states for adding items
  const [radName, setRadName] = useState('');
  const [radCat, setRadCat] = useState('موجات صوتية (Ultrasound)');
  const [radFav, setRadFav] = useState(true);

  const [labName, setLabName] = useState('');
  const [labCat, setLabCat] = useState('كيمياء حيوية');
  const [labSample, setLabSample] = useState('عينة دم وريدي');
  const [labRange, setLabRange] = useState('');
  const [labUnit, setLabUnit] = useState('');
  const [labFasting, setLabFasting] = useState(false);
  const [labFav, setLabFav] = useState(true);

  const [drugBrand, setDrugBrand] = useState('');
  const [drugGeneric, setDrugGeneric] = useState('');
  const [drugStrength, setDrugStrength] = useState('');
  const [drugForm, setDrugForm] = useState('أقراص (Tablets)');
  const [drugDosage, setDrugDosage] = useState('');
  const [drugTiming, setDrugTiming] = useState('بعد الأكل');
  const [drugFav, setDrugFav] = useState(true);

  const [diagNameAr, setDiagNameAr] = useState('');
  const [diagNameEn, setDiagNameEn] = useState('');
  const [diagCode, setDiagCode] = useState('');
  const [diagCat, setDiagCat] = useState('الجهاز الهضمي');
  const [diagFav, setDiagFav] = useState(true);

  const [symName, setSymName] = useState('');
  const [symCat, setSymCat] = useState('الجهاز الهضمي');

  const handleCreateItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeCatalogTab === 'rad') {
      if (!radName.trim()) return;
      onAddRadiology({
        id: `rad-${Date.now()}`,
        name: radName.trim(),
        category: radCat,
        isFavorite: radFav,
        active: true,
      });
      setRadName('');
    } else if (activeCatalogTab === 'lab') {
      if (!labName.trim()) return;
      onAddLab({
        id: `lab-${Date.now()}`,
        name: labName.trim(),
        category: labCat,
        sampleType: labSample.trim() || undefined,
        referenceRange: labRange.trim() || undefined,
        unit: labUnit.trim() || undefined,
        fastingRequired: labFasting,
        isFavorite: labFav,
        active: true,
      });
      setLabName('');
      setLabRange('');
      setLabUnit('');
    } else if (activeCatalogTab === 'drugs') {
      if (!drugBrand.trim()) return;
      onAddDrug({
        id: `med-${Date.now()}`,
        brandName: `${drugBrand} ${drugStrength}`.trim(),
        genericName: drugGeneric.trim(),
        strength: drugStrength.trim(),
        form: drugForm,
        category: 'أدوية العيادة',
        defaultDosage: drugDosage.trim() || 'قرص واحد يومياً',
        defaultDuration: 'لمدة شهر',
        defaultTiming: drugTiming.trim() || 'بعد الأكل',
        isFavorite: drugFav,
        active: true,
      });
      setDrugBrand('');
      setDrugGeneric('');
      setDrugStrength('');
      setDrugDosage('');
    } else if (activeCatalogTab === 'diag') {
      if (!diagNameAr.trim()) return;
      onAddDiagnosis({
        id: `diag-${Date.now()}`,
        code: diagCode.trim() || 'ICD-10',
        nameAr: diagNameAr.trim(),
        nameEn: diagNameEn.trim(),
        category: diagCat,
        isFavorite: diagFav,
        active: true,
      });
      setDiagNameAr('');
      setDiagNameEn('');
      setDiagCode('');
    } else if (activeCatalogTab === 'sym') {
      if (!symName.trim()) return;
      onAddSymptom({
        id: `sym-${Date.now()}`,
        name: symName.trim(),
        category: symCat,
        isFavorite: true,
        active: true,
      });
      setSymName('');
    }
    setShowAddModal(false);
  };

  return (
    <div className="bg-white dark:bg-[#111A2E] p-6 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm space-y-5">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-white/5 pb-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-[#dde2f5] flex items-center gap-2">
            <span className="material-symbols-outlined text-[#008f97] dark:text-[#00c2cb] text-xl">menu_book</span>
            <span>إدارة الأدلة الطبية الشاملة (Clinical Catalogs & Favorites)</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-[#859394] mt-0.5">
            تخصيص وإدارة الفحوصات والتحاليل والأدوية التي تظهر في شاشة الكشف الطبي بنقرة واحدة
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00c2cb] hover:bg-[#45dee7] text-[#08101C] text-xs font-bold transition-all cursor-pointer shadow-xs"
        >
          <span className="material-symbols-outlined text-base">add</span>
          <span>
            {activeCatalogTab === 'rad' && 'إضافة فحص أشعة'}
            {activeCatalogTab === 'lab' && 'إضافة تحليل معمل'}
            {activeCatalogTab === 'drugs' && 'إضافة دواء جديد'}
            {activeCatalogTab === 'diag' && 'إضافة تشخيص جديد'}
            {activeCatalogTab === 'sym' && 'إضافة عرض سريري'}
          </span>
        </button>
      </div>

      {/* Catalog Selector Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-3">
        <button
          type="button"
          onClick={() => { setActiveCatalogTab('rad'); setSearchFilter(''); }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeCatalogTab === 'rad'
              ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-[#38BDF8] border border-sky-200 dark:border-sky-800/40'
              : 'bg-slate-50 dark:bg-[#080e1b] text-slate-600 dark:text-[#bbc9ca] hover:bg-slate-100'
          }`}
        >
          <span className="material-symbols-outlined text-base">radiology</span>
          <span>دليل الأشعة والتصوير ({radiologyCatalog.length})</span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveCatalogTab('lab'); setSearchFilter(''); }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeCatalogTab === 'lab'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-[#10B981] border border-emerald-200 dark:border-emerald-800/40'
              : 'bg-slate-50 dark:bg-[#080e1b] text-slate-600 dark:text-[#bbc9ca] hover:bg-slate-100'
          }`}
        >
          <span className="material-symbols-outlined text-base">science</span>
          <span>دليل المعمل والتحاليل ({labCatalog.length})</span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveCatalogTab('drugs'); setSearchFilter(''); }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeCatalogTab === 'drugs'
              ? 'bg-teal-50 dark:bg-[#00c2cb]/15 text-[#008f97] dark:text-[#00c2cb] border border-teal-200 dark:border-[#00c2cb]/30'
              : 'bg-slate-50 dark:bg-[#080e1b] text-slate-600 dark:text-[#bbc9ca] hover:bg-slate-100'
          }`}
        >
          <span className="material-symbols-outlined text-base">medication</span>
          <span>دليل الأدوية والمفضلة ({drugCatalog.length})</span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveCatalogTab('diag'); setSearchFilter(''); }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeCatalogTab === 'diag'
              ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40'
              : 'bg-slate-50 dark:bg-[#080e1b] text-slate-600 dark:text-[#bbc9ca] hover:bg-slate-100'
          }`}
        >
          <span className="material-symbols-outlined text-base">diagnosis</span>
          <span>دليل التشخيصات ({diagnosesCatalog.length})</span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveCatalogTab('sym'); setSearchFilter(''); }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeCatalogTab === 'sym'
              ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-[#d0bcff] border border-purple-200 dark:border-purple-800/40'
              : 'bg-slate-50 dark:bg-[#080e1b] text-slate-600 dark:text-[#bbc9ca] hover:bg-slate-100'
          }`}
        >
          <span className="material-symbols-outlined text-base">clinical_notes</span>
          <span>دليل الأعراض ({symptomsCatalog.length})</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
            search
          </span>
          <input
            type="text"
            placeholder="بحث في عناصر الدليل النشط..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs pr-9 pl-3 py-2 rounded-xl border border-slate-200 dark:border-white/5 focus:outline-none focus:ring-1 focus:ring-[#00c2cb]"
          />
        </div>
        <span className="text-xs text-slate-400 font-mono">
          انقر ⭐ لتبديل الحالة المفضلة
        </span>
      </div>

      {/* TAB 1: Radiology Catalog View */}
      {activeCatalogTab === 'rad' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
          {radiologyCatalog
            .filter((r) => r.name.toLowerCase().includes(searchFilter.toLowerCase()) || r.category.includes(searchFilter))
            .map((item) => (
              <div
                key={item.id}
                className="bg-slate-50 dark:bg-[#080e1b] p-3 rounded-xl border border-slate-200 dark:border-white/5 flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => onToggleRadiologyFavorite(item.id)}
                    className="cursor-pointer text-base"
                    title={item.isFavorite ? 'في المفضلة' : 'غير مفضل'}
                  >
                    {item.isFavorite ? '⭐' : '☆'}
                  </button>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-[#dde2f5] block">
                      {item.name}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-[#859394]">
                      {item.category} {item.notes ? `• ${item.notes}` : ''}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onRemoveRadiology(item.id)}
                  className="p-1 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                  title="حذف من الدليل"
                >
                  <span className="material-symbols-outlined text-base">delete</span>
                </button>
              </div>
            ))}
        </div>
      )}

      {/* TAB 2: Lab Catalog View */}
      {activeCatalogTab === 'lab' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
          {labCatalog
            .filter((l) => l.name.toLowerCase().includes(searchFilter.toLowerCase()) || l.category.includes(searchFilter))
            .map((item) => (
              <div
                key={item.id}
                className="bg-slate-50 dark:bg-[#080e1b] p-3 rounded-xl border border-slate-200 dark:border-white/5 flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => onToggleLabFavorite(item.id)}
                    className="cursor-pointer text-base"
                    title={item.isFavorite ? 'في المفضلة' : 'غير مفضل'}
                  >
                    {item.isFavorite ? '⭐' : '☆'}
                  </button>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900 dark:text-[#dde2f5]">
                        {item.name}
                      </span>
                      {item.fastingRequired && (
                        <span className="text-[9px] font-bold text-amber-600 bg-amber-100 dark:bg-amber-950/40 px-1 py-0.5 rounded">
                          صائم
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-[#859394]">
                      {item.category} {item.sampleType ? `• ${item.sampleType}` : ''}{' '}
                      {item.referenceRange ? `[${item.referenceRange}]` : ''}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onRemoveLab(item.id)}
                  className="p-1 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                  title="حذف من الدليل"
                >
                  <span className="material-symbols-outlined text-base">delete</span>
                </button>
              </div>
            ))}
        </div>
      )}

      {/* TAB 3: Drug Catalog View */}
      {activeCatalogTab === 'drugs' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
          {drugCatalog
            .filter((d) => d.brandName.toLowerCase().includes(searchFilter.toLowerCase()) || d.genericName.toLowerCase().includes(searchFilter.toLowerCase()))
            .map((item) => (
              <div
                key={item.id}
                className="bg-slate-50 dark:bg-[#080e1b] p-3 rounded-xl border border-slate-200 dark:border-white/5 flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => onToggleDrugFavorite(item.id)}
                    className="cursor-pointer text-base"
                    title={item.isFavorite ? 'في المفضلة' : 'غير مفضل'}
                  >
                    {item.isFavorite ? '⭐' : '☆'}
                  </button>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-[#dde2f5] block">
                      {item.brandName}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono" dir="ltr">
                      {item.genericName} • {item.form}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      {item.defaultDosage}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onRemoveDrug(item.id)}
                  className="p-1 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                  title="حذف من الدليل"
                >
                  <span className="material-symbols-outlined text-base">delete</span>
                </button>
              </div>
            ))}
        </div>
      )}

      {/* TAB 4: Diagnoses Catalog View */}
      {activeCatalogTab === 'diag' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
          {diagnosesCatalog
            .filter((d) => d.nameAr.toLowerCase().includes(searchFilter.toLowerCase()) || d.code.toLowerCase().includes(searchFilter.toLowerCase()))
            .map((item) => (
              <div
                key={item.id}
                className="bg-slate-50 dark:bg-[#080e1b] p-3 rounded-xl border border-slate-200 dark:border-white/5 flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => onToggleDiagnosisFavorite(item.id)}
                    className="cursor-pointer text-base"
                    title={item.isFavorite ? 'في المفضلة' : 'غير مفضل'}
                  >
                    {item.isFavorite ? '⭐' : '☆'}
                  </button>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] font-bold text-amber-700 bg-amber-100 dark:bg-amber-900/40 px-1.5 py-0.5 rounded">
                        {item.code}
                      </span>
                      <span className="text-xs font-bold text-slate-900 dark:text-[#dde2f5]">
                        {item.nameAr}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono" dir="ltr">
                      {item.nameEn}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onRemoveDiagnosis(item.id)}
                  className="p-1 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                  title="حذف من الدليل"
                >
                  <span className="material-symbols-outlined text-base">delete</span>
                </button>
              </div>
            ))}
        </div>
      )}

      {/* TAB 5: Symptoms Catalog View */}
      {activeCatalogTab === 'sym' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
          {symptomsCatalog
            .filter((s) => s.name.toLowerCase().includes(searchFilter.toLowerCase()))
            .map((item) => (
              <div
                key={item.id}
                className="bg-slate-50 dark:bg-[#080e1b] p-3 rounded-xl border border-slate-200 dark:border-white/5 flex items-center justify-between gap-2"
              >
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-[#dde2f5] block">
                    {item.name}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-[#859394]">
                    {item.category}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => onRemoveSymptom(item.id)}
                  className="p-1 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                  title="حذف العرض"
                >
                  <span className="material-symbols-outlined text-base">delete</span>
                </button>
              </div>
            ))}
        </div>
      )}

      {/* Modal: Add item to current catalog */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateItem}
            className="bg-white dark:bg-[#18233C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-[#dde2f5] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#008f97] dark:text-[#00c2cb]">add_circle</span>
                <span>
                  {activeCatalogTab === 'rad' && 'إضافة فحص أشعة جديد للدليل'}
                  {activeCatalogTab === 'lab' && 'إضافة تحليل معمل جديد للدليل'}
                  {activeCatalogTab === 'drugs' && 'إضافة دواء جديد للدليل والمفضلة'}
                  {activeCatalogTab === 'diag' && 'إضافة تشخيص جديد للدليل'}
                  {activeCatalogTab === 'sym' && 'إضافة عرض سريري جديد للدليل'}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Rad Form */}
            {activeCatalogTab === 'rad' && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-600 dark:text-[#859394] block mb-1">اسم فحص الأشعة:</label>
                  <input
                    type="text"
                    required
                    value={radName}
                    onChange={(e) => setRadName(e.target.value)}
                    placeholder="مثال: دوبلر أوردة، أشعة مقطعية على الصدر..."
                    className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/5 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-600 dark:text-[#859394] block mb-1">التصنيف:</label>
                  <select
                    value={radCat}
                    onChange={(e) => setRadCat(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/5 focus:outline-none"
                  >
                    <option value="موجات صوتية (Ultrasound)">موجات صوتية (Ultrasound)</option>
                    <option value="أشعة سينية (X-Ray)">أشعة سينية (X-Ray)</option>
                    <option value="دوبلر ملون (Doppler)">دوبلر ملون (Doppler)</option>
                    <option value="أشعة مقطعية (CT)">أشعة مقطعية (CT)</option>
                    <option value="رنين مغناطيسي (MRI)">رنين مغناطيسي (MRI)</option>
                    <option value="فسيولوجيا القلب">فسيولوجيا القلب</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="radFavCheck"
                    checked={radFav}
                    onChange={(e) => setRadFav(e.target.checked)}
                    className="w-4 h-4 rounded text-[#00c2cb] accent-[#00c2cb]"
                  />
                  <label htmlFor="radFavCheck" className="text-xs text-slate-700 dark:text-[#dde2f5] cursor-pointer">
                    تعيين كفحص مفضل ⭐
                  </label>
                </div>
              </div>
            )}

            {/* Lab Form */}
            {activeCatalogTab === 'lab' && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-600 dark:text-[#859394] block mb-1">اسم التحليل:</label>
                  <input
                    type="text"
                    required
                    value={labName}
                    onChange={(e) => setLabName(e.target.value)}
                    placeholder="مثال: وظائف كبد ALT, سكر صائم FBS..."
                    className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/5 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-600 dark:text-[#859394] block mb-1">التصنيف:</label>
                    <select
                      value={labCat}
                      onChange={(e) => setLabCat(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/5 focus:outline-none"
                    >
                      <option value="كيمياء حيوية">كيمياء حيوية</option>
                      <option value="أمراض الدم">أمراض الدم</option>
                      <option value="الغدد الصماء والسكر">الغدد الصماء والسكر</option>
                      <option value="مناعة وفيروسات">مناعة وفيروسات</option>
                      <option value="فحوصات مجهرية">فحوصات مجهرية</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-600 dark:text-[#859394] block mb-1">نوع العينة:</label>
                    <input
                      type="text"
                      value={labSample}
                      onChange={(e) => setLabSample(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/5 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="labFavCheck"
                    checked={labFav}
                    onChange={(e) => setLabFav(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 accent-emerald-600"
                  />
                  <label htmlFor="labFavCheck" className="text-xs text-slate-700 dark:text-[#dde2f5] cursor-pointer">
                    تعيين كتحليل مفضل ⭐
                  </label>
                </div>
              </div>
            )}

            {/* Drugs Form */}
            {activeCatalogTab === 'drugs' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-600 dark:text-[#859394] block mb-1">اسم الدواء التجاري:</label>
                    <input
                      type="text"
                      required
                      value={drugBrand}
                      onChange={(e) => setDrugBrand(e.target.value)}
                      placeholder="e.g. Concor, Nexium..."
                      className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/5 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-600 dark:text-[#859394] block mb-1">التركيز:</label>
                    <input
                      type="text"
                      value={drugStrength}
                      onChange={(e) => setDrugStrength(e.target.value)}
                      placeholder="e.g. 5 mg, 500 mg..."
                      className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/5 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-600 dark:text-[#859394] block mb-1">الجرعة الافتراضية:</label>
                  <input
                    type="text"
                    value={drugDosage}
                    onChange={(e) => setDrugDosage(e.target.value)}
                    placeholder="قرص واحد صباحاً بعد الإفطار..."
                    className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/5 focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="drugFavCheck"
                    checked={drugFav}
                    onChange={(e) => setDrugFav(e.target.checked)}
                    className="w-4 h-4 rounded text-[#00c2cb] accent-[#00c2cb]"
                  />
                  <label htmlFor="drugFavCheck" className="text-xs text-slate-700 dark:text-[#dde2f5] cursor-pointer">
                    تعيين كدواء مفضل ⭐ (يظهر في المستوى الأول بالكشف)
                  </label>
                </div>
              </div>
            )}

            {/* Diagnosis Form */}
            {activeCatalogTab === 'diag' && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-600 dark:text-[#859394] block mb-1">اسم التشخيص بالعربية:</label>
                  <input
                    type="text"
                    required
                    value={diagNameAr}
                    onChange={(e) => setDiagNameAr(e.target.value)}
                    placeholder="e.g. داء السكري، التهاب المعدة..."
                    className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/5 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-600 dark:text-[#859394] block mb-1">كود ICD-10:</label>
                    <input
                      type="text"
                      value={diagCode}
                      onChange={(e) => setDiagCode(e.target.value)}
                      placeholder="e.g. K21.9"
                      className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/5 focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-600 dark:text-[#859394] block mb-1">التصنيف:</label>
                    <select
                      value={diagCat}
                      onChange={(e) => setDiagCat(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/5 focus:outline-none"
                    >
                      <option value="الجهاز الهضمي">الجهاز الهضمي</option>
                      <option value="القلب والأوعية">القلب والأوعية</option>
                      <option value="الغدد والسكري">الغدد والسكري</option>
                      <option value="الجهاز التنفسي">الجهاز التنفسي</option>
                      <option value="الكلى والمسالك">الكلى والمسالك</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Symptoms Form */}
            {activeCatalogTab === 'sym' && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-600 dark:text-[#859394] block mb-1">اسم العرض السريري:</label>
                  <input
                    type="text"
                    required
                    value={symName}
                    onChange={(e) => setSymName(e.target.value)}
                    placeholder="مثال: غثيان صباحي، حكة جلدية..."
                    className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/5 focus:outline-none"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-white/10">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-[#111A2E] text-xs text-slate-600 dark:text-[#bbc9ca] hover:bg-slate-200 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-[#00c2cb] hover:bg-[#45dee7] text-slate-900 font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                إضافة للدليل
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

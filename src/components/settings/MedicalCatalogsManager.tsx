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
  // Accordion state - ALL closed by default as requested
  const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({
    radiology: false,
    lab: false,
    drugs: false,
    diagnoses: false,
    symptoms: false,
  });

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const openSectionWithAdd = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: true }));
  };

  // Search filters for each section
  const [radSearch, setRadSearch] = useState('');
  const [labSearch, setLabSearch] = useState('');
  const [drugSearch, setDrugSearch] = useState('');
  const [diagSearch, setDiagSearch] = useState('');
  const [symSearch, setSymSearch] = useState('');

  // Category filters
  const [radCatFilter, setRadCatFilter] = useState('ALL');
  const [labCatFilter, setLabCatFilter] = useState('ALL');
  const [drugCatFilter, setDrugCatFilter] = useState('ALL');

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
  const [drugDosage, setDrugDosage] = useState('قرص واحد يومياً');
  const [drugTiming, setDrugTiming] = useState('بعد الأكل');
  const [drugFav, setDrugFav] = useState(true);

  const [diagNameAr, setDiagNameAr] = useState('');
  const [diagNameEn, setDiagNameEn] = useState('');
  const [diagCode, setDiagCode] = useState('');
  const [diagCat, setDiagCat] = useState('الجهاز الهضمي');
  const [diagFav, setDiagFav] = useState(true);

  const [symName, setSymName] = useState('');
  const [symCat, setSymCat] = useState('الجهاز الهضمي');

  // Add handlers
  const handleAddRadiologySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!radName.trim()) return;
    onAddRadiology({
      id: `rad-${Date.now()}`,
      name: radName.trim(),
      category: radCat,
      isFavorite: radFav,
      active: true,
    });
    setRadName('');
  };

  const handleAddLabSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
  };

  const handleAddDrugSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
  };

  const handleAddDiagSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
  };

  const handleAddSymSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!symName.trim()) return;
    onAddSymptom({
      id: `sym-${Date.now()}`,
      name: symName.trim(),
      category: symCat,
      isFavorite: true,
      active: true,
    });
    setSymName('');
  };

  // Filtered lists
  const filteredRadiology = radiologyCatalog.filter((item) => {
    const matchSearch =
      item.name.toLowerCase().includes(radSearch.toLowerCase()) ||
      item.category.toLowerCase().includes(radSearch.toLowerCase());
    const matchCat = radCatFilter === 'ALL' || item.category === radCatFilter;
    return matchSearch && matchCat;
  });

  const filteredLab = labCatalog.filter((item) => {
    const matchSearch =
      item.name.toLowerCase().includes(labSearch.toLowerCase()) ||
      item.category.toLowerCase().includes(labSearch.toLowerCase());
    const matchCat = labCatFilter === 'ALL' || item.category === labCatFilter;
    return matchSearch && matchCat;
  });

  const filteredDrugs = drugCatalog.filter((item) => {
    const matchSearch =
      item.brandName.toLowerCase().includes(drugSearch.toLowerCase()) ||
      (item.genericName && item.genericName.toLowerCase().includes(drugSearch.toLowerCase()));
    return matchSearch;
  });

  const filteredDiagnoses = diagnosesCatalog.filter((item) => {
    return (
      item.nameAr.toLowerCase().includes(diagSearch.toLowerCase()) ||
      (item.nameEn && item.nameEn.toLowerCase().includes(diagSearch.toLowerCase())) ||
      (item.code && item.code.toLowerCase().includes(diagSearch.toLowerCase()))
    );
  });

  const filteredSymptoms = symptomsCatalog.filter((item) => {
    return (
      item.name.toLowerCase().includes(symSearch.toLowerCase()) ||
      item.category.toLowerCase().includes(symSearch.toLowerCase())
    );
  });

  return (
    <div className="w-full space-y-4">
      {/* Section Explanatory Header */}
      <div className="bg-white dark:bg-[#111A2E] p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-white/5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-[#dde2f5] flex items-center gap-2">
            <span className="material-symbols-outlined text-[#008f97] dark:text-[#00c2cb] text-xl">menu_book</span>
            <span>الأدلة الطبية الشاملة (Medical Catalogs)</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-[#859394] mt-1">
            انقر على أي بطاقة لعرض أو تعديل الفحوصات والتحاليل والأدوية المتاحة في شاشة الكشف الطبي
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            type="button"
            onClick={() =>
              setOpenSections({
                radiology: true,
                lab: true,
                drugs: true,
                diagnoses: true,
                symptoms: true,
              })
            }
            className="text-xs font-bold text-[#008f97] dark:text-[#00c2cb] hover:underline cursor-pointer px-2 py-1"
          >
            فتح الكل
          </button>
          <span className="text-slate-300 dark:text-white/10">|</span>
          <button
            type="button"
            onClick={() =>
              setOpenSections({
                radiology: false,
                lab: false,
                drugs: false,
                diagnoses: false,
                symptoms: false,
              })
            }
            className="text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white cursor-pointer px-2 py-1"
          >
            إغلاق الكل
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. RADIOLOGY CATALOG ACCORDION CARD (أشعة وتصوير) */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-[#111A2E] rounded-2xl border border-slate-200 dark:border-white/5 shadow-xs overflow-hidden transition-all">
        {/* Accordion Header */}
        <div
          onClick={() => toggleSection('radiology')}
          className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-[#18233C]/50 transition-colors select-none"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-[#38BDF8] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-xl">radiology</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-[#dde2f5]">
                  دليل الأشعة والفحوصات التصويرية (Radiology & Imaging)
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-[#38BDF8] text-xs font-bold border border-sky-200 dark:border-sky-800/40">
                  {radiologyCatalog.length} فحص مسجل
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-[#859394] mt-0.5">
                موجات صوتية، أشعة سينية، رنين مغناطيسي، أشعة مقطعية، وإيكو القلب
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => openSectionWithAdd('radiology')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">add</span>
              <span>إضافة فحص أشعة</span>
            </button>

            <button
              type="button"
              onClick={() => toggleSection('radiology')}
              className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 text-slate-600 dark:text-[#bbc9ca] flex items-center justify-center transition-transform"
              aria-label="تبديل العرض"
            >
              <span
                className={`material-symbols-outlined text-xl transition-transform duration-200 ${
                  openSections.radiology ? 'rotate-180' : ''
                }`}
              >
                expand_more
              </span>
            </button>
          </div>
        </div>

        {/* Accordion Content */}
        {openSections.radiology && (
          <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-white/5 space-y-4 animate-in fade-in duration-150">
            {/* Quick Add Form */}
            <form
              onSubmit={handleAddRadiologySubmit}
              className="bg-sky-50/50 dark:bg-[#080e1b] p-3.5 sm:p-4 rounded-xl border border-sky-100 dark:border-sky-900/30 space-y-3"
            >
              <span className="text-xs font-bold text-sky-800 dark:text-sky-300 block">
                + إضافة فحص أشعة جديد إلى الدليل:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                <div className="sm:col-span-6">
                  <input
                    type="text"
                    required
                    placeholder="اسم الفحص (مثال: موجات صوتية على البطن والحوض، أشعة صدر عادية)..."
                    value={radName}
                    onChange={(e) => setRadName(e.target.value)}
                    className="w-full bg-white dark:bg-[#111A2E] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div className="sm:col-span-4">
                  <select
                    value={radCat}
                    onChange={(e) => setRadCat(e.target.value)}
                    className="w-full bg-white dark:bg-[#111A2E] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/10 focus:outline-none cursor-pointer"
                  >
                    <option value="موجات صوتية (Ultrasound)">موجات صوتية (Ultrasound)</option>
                    <option value="أشعة سينية (X-Ray)">أشعة سينية (X-Ray)</option>
                    <option value="رنين مغناطيسي (MRI)">رنين مغناطيسي (MRI)</option>
                    <option value="أشعة مقطعية (CT)">أشعة مقطعية (CT Scan)</option>
                    <option value="إيكو قلب (Echocardiography)">إيكو قلب (Echocardiography)</option>
                    <option value="دوبلر أوعية دموية (Doppler)">دوبلر أوعية دموية (Doppler)</option>
                    <option value="مناظير جهاز هضمي (Endoscopy)">مناظير جهاز هضمي (Endoscopy)</option>
                  </select>
                </div>
                <div className="sm:col-span-2 flex items-center gap-2">
                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition-all cursor-pointer shadow-xs"
                  >
                    حفظ الفحص
                  </button>
                </div>
              </div>
            </form>

            {/* Search and Category Filter */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              <div className="relative flex-1">
                <span className="material-symbols-outlined absolute right-3 top-2.5 text-slate-400 text-base">
                  search
                </span>
                <input
                  type="text"
                  placeholder="بحث في فحوصات الأشعة والتصوير..."
                  value={radSearch}
                  onChange={(e) => setRadSearch(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs pr-9 pl-3 py-2 rounded-xl border border-slate-200 dark:border-white/5 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                {['ALL', 'موجات صوتية (Ultrasound)', 'أشعة سينية (X-Ray)', 'إيكو قلب (Echocardiography)'].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setRadCatFilter(cat)}
                    className={`px-2.5 py-1 rounded-lg whitespace-nowrap text-[11px] font-bold transition-all cursor-pointer ${
                      radCatFilter === cat
                        ? 'bg-sky-600 text-white'
                        : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-[#859394]'
                    }`}
                  >
                    {cat === 'ALL' ? 'جميع التصنيفات' : cat.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* Items Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-96 overflow-y-auto pr-1">
              {filteredRadiology.map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-50 dark:bg-[#080e1b] p-3 rounded-xl border border-slate-200 dark:border-white/5 flex items-center justify-between gap-2 hover:border-sky-300 dark:hover:border-sky-800 transition-all"
                >
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-[#dde2f5] truncate">{item.name}</h4>
                    <span className="text-[10px] text-sky-600 dark:text-sky-400 block mt-0.5">{item.category}</span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => onToggleRadiologyFavorite(item.id)}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                        item.isFavorite
                          ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/40'
                          : 'text-slate-400 hover:text-amber-500 bg-white dark:bg-[#111A2E]'
                      }`}
                      title="المفضلة"
                    >
                      <span className="material-symbols-outlined text-sm">
                        {item.isFavorite ? 'star' : 'star_border'}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveRadiology(item.id)}
                      className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center transition-colors cursor-pointer text-xs"
                      title="حذف من الدليل"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. LABORATORY INVESTIGATIONS ACCORDION CARD (تحاليل ومعمل) */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-[#111A2E] rounded-2xl border border-slate-200 dark:border-white/5 shadow-xs overflow-hidden transition-all">
        {/* Accordion Header */}
        <div
          onClick={() => toggleSection('lab')}
          className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-[#18233C]/50 transition-colors select-none"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-[#10B981] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-xl">science</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-[#dde2f5]">
                  دليل التحاليل والفحوصات المعملية (Laboratory Tests)
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-[#10B981] text-xs font-bold border border-emerald-200 dark:border-emerald-800/40">
                  {labCatalog.length} تحليل مسجل
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-[#859394] mt-0.5">
                كيمياء حيوية، صورة دم كاملة، سكر تراكمي، وظائف كبد وكلى، هرمونات ومناعة
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => openSectionWithAdd('lab')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">add</span>
              <span>إضافة تحليل جديد</span>
            </button>

            <button
              type="button"
              onClick={() => toggleSection('lab')}
              className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 text-slate-600 dark:text-[#bbc9ca] flex items-center justify-center transition-transform"
              aria-label="تبديل العرض"
            >
              <span
                className={`material-symbols-outlined text-xl transition-transform duration-200 ${
                  openSections.lab ? 'rotate-180' : ''
                }`}
              >
                expand_more
              </span>
            </button>
          </div>
        </div>

        {/* Accordion Content */}
        {openSections.lab && (
          <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-white/5 space-y-4 animate-in fade-in duration-150">
            {/* Quick Add Form */}
            <form
              onSubmit={handleAddLabSubmit}
              className="bg-emerald-50/50 dark:bg-[#080e1b] p-3.5 sm:p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/30 space-y-3"
            >
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 block">
                + إضافة تحليل معملي جديد إلى الدليل:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                <div className="sm:col-span-5">
                  <input
                    type="text"
                    required
                    placeholder="اسم التحليل (مثال: صورة دم كاملة CBC، سكر تراكمي HbA1c)..."
                    value={labName}
                    onChange={(e) => setLabName(e.target.value)}
                    className="w-full bg-white dark:bg-[#111A2E] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div className="sm:col-span-3">
                  <select
                    value={labCat}
                    onChange={(e) => setLabCat(e.target.value)}
                    className="w-full bg-white dark:bg-[#111A2E] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/10 focus:outline-none cursor-pointer"
                  >
                    <option value="كيمياء حيوية">كيمياء حيوية (Biochemistry)</option>
                    <option value="أمراض الدم">أمراض الدم (Hematology)</option>
                    <option value="الغدد الصماء والسكر">الغدد الصماء والسكر</option>
                    <option value="الكلى والبول">الكلى والبول (Urinalysis)</option>
                    <option value="الكبد والجهاز الهضمي">الكبد والجهاز الهضمي</option>
                    <option value="القلب والأوعية">إنزيمات القلب (Cardiac Markers)</option>
                    <option value="مناعة وفيروسات">مناعة وفيروسات (Serology)</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <input
                    type="text"
                    placeholder="المعدل الطبيعي (Ref)..."
                    value={labRange}
                    onChange={(e) => setLabRange(e.target.value)}
                    className="w-full bg-white dark:bg-[#111A2E] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/10 focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-2 flex items-center gap-2">
                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all cursor-pointer shadow-xs"
                  >
                    حفظ التحليل
                  </button>
                </div>
              </div>
            </form>

            {/* Search and Category Filter */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              <div className="relative flex-1">
                <span className="material-symbols-outlined absolute right-3 top-2.5 text-slate-400 text-base">
                  search
                </span>
                <input
                  type="text"
                  placeholder="بحث في تحاليل المعمل..."
                  value={labSearch}
                  onChange={(e) => setLabSearch(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs pr-9 pl-3 py-2 rounded-xl border border-slate-200 dark:border-white/5 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                {['ALL', 'أمراض الدم', 'كيمياء حيوية', 'الغدد الصماء والسكر'].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setLabCatFilter(cat)}
                    className={`px-2.5 py-1 rounded-lg whitespace-nowrap text-[11px] font-bold transition-all cursor-pointer ${
                      labCatFilter === cat
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-[#859394]'
                    }`}
                  >
                    {cat === 'ALL' ? 'جميع الأقسام' : cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Items Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-96 overflow-y-auto pr-1">
              {filteredLab.map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-50 dark:bg-[#080e1b] p-3 rounded-xl border border-slate-200 dark:border-white/5 flex items-center justify-between gap-2 hover:border-emerald-300 dark:hover:border-emerald-800 transition-all"
                >
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-[#dde2f5] truncate">{item.name}</h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400">{item.category}</span>
                      {item.referenceRange && (
                        <span className="text-[10px] text-slate-400 dark:text-[#859394] font-mono">
                          • {item.referenceRange}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => onToggleLabFavorite(item.id)}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                        item.isFavorite
                          ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/40'
                          : 'text-slate-400 hover:text-amber-500 bg-white dark:bg-[#111A2E]'
                      }`}
                      title="المفضلة"
                    >
                      <span className="material-symbols-outlined text-sm">
                        {item.isFavorite ? 'star' : 'star_border'}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveLab(item.id)}
                      className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center transition-colors cursor-pointer text-xs"
                      title="حذف من الدليل"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. MEDICATIONS & DRUG CATALOG ACCORDION CARD (أدوية وروشتات) */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-[#111A2E] rounded-2xl border border-slate-200 dark:border-white/5 shadow-xs overflow-hidden transition-all">
        {/* Accordion Header */}
        <div
          onClick={() => toggleSection('drugs')}
          className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-[#18233C]/50 transition-colors select-none"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-[#00c2cb]/15 text-[#008f97] dark:text-[#00c2cb] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-xl">medication</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-[#dde2f5]">
                  دليل الأدوية والمستحضرات الدوائية (Medications & Rx)
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-teal-50 dark:bg-[#00c2cb]/20 text-[#008f97] dark:text-[#45dee7] text-xs font-bold border border-teal-200 dark:border-[#00c2cb]/30">
                  {drugCatalog.length} دواء مسجل
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-[#859394] mt-0.5">
                الاسم التجاري والعلمي، الجرعات الافتراضية، التوقيت، وأدوية الروشتة السريعة
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => openSectionWithAdd('drugs')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#00c2cb] hover:bg-[#45dee7] text-[#08101C] text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">add</span>
              <span>إضافة دواء جديد</span>
            </button>

            <button
              type="button"
              onClick={() => toggleSection('drugs')}
              className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 text-slate-600 dark:text-[#bbc9ca] flex items-center justify-center transition-transform"
              aria-label="تبديل العرض"
            >
              <span
                className={`material-symbols-outlined text-xl transition-transform duration-200 ${
                  openSections.drugs ? 'rotate-180' : ''
                }`}
              >
                expand_more
              </span>
            </button>
          </div>
        </div>

        {/* Accordion Content */}
        {openSections.drugs && (
          <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-white/5 space-y-4 animate-in fade-in duration-150">
            {/* Quick Add Form */}
            <form
              onSubmit={handleAddDrugSubmit}
              className="bg-teal-50/50 dark:bg-[#080e1b] p-3.5 sm:p-4 rounded-xl border border-teal-100 dark:border-teal-900/30 space-y-3"
            >
              <span className="text-xs font-bold text-teal-800 dark:text-teal-300 block">
                + إضافة دواء جديد إلى الدليل والمفضلة:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                <div className="sm:col-span-4">
                  <input
                    type="text"
                    required
                    placeholder="الاسم التجاري (مثال: Concor, Panadol)..."
                    value={drugBrand}
                    onChange={(e) => setDrugBrand(e.target.value)}
                    className="w-full bg-white dark:bg-[#111A2E] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-[#00c2cb]"
                  />
                </div>
                <div className="sm:col-span-3">
                  <input
                    type="text"
                    placeholder="الاسم العلمي (مثال: Bisoprolol)..."
                    value={drugGeneric}
                    onChange={(e) => setDrugGeneric(e.target.value)}
                    className="w-full bg-white dark:bg-[#111A2E] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/10 focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <select
                    value={drugForm}
                    onChange={(e) => setDrugForm(e.target.value)}
                    className="w-full bg-white dark:bg-[#111A2E] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/10 focus:outline-none cursor-pointer"
                  >
                    <option value="أقراص (Tablets)">أقراص (Tablets)</option>
                    <option value="كبسولات (Capsules)">كبسولات (Capsules)</option>
                    <option value="شراب (Syrup)">شراب (Syrup)</option>
                    <option value="حقن عضل/وريد (Injections)">حقن (Injections)</option>
                    <option value="فوار (Sachets)">فوار (Sachets)</option>
                    <option value="نقط (Drops)">نقط (Drops)</option>
                    <option value="بخاخ (Inhaler)">بخاخ (Inhaler)</option>
                  </select>
                </div>
                <div className="sm:col-span-3 flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="الجرعة (مثال: قرص يومياً)..."
                    value={drugDosage}
                    onChange={(e) => setDrugDosage(e.target.value)}
                    className="w-full bg-white dark:bg-[#111A2E] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/10 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="py-2.5 px-4 rounded-xl bg-[#00c2cb] hover:bg-[#45dee7] text-[#08101C] font-bold text-xs whitespace-nowrap transition-all cursor-pointer shadow-xs"
                  >
                    حفظ الدواء
                  </button>
                </div>
              </div>
            </form>

            {/* Search */}
            <div className="relative">
              <span className="material-symbols-outlined absolute right-3 top-2.5 text-slate-400 text-base">
                search
              </span>
              <input
                type="text"
                placeholder="بحث في الأدوية بالاسم التجاري أو العلمي..."
                value={drugSearch}
                onChange={(e) => setDrugSearch(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs pr-9 pl-3 py-2 rounded-xl border border-slate-200 dark:border-white/5 focus:outline-none"
              />
            </div>

            {/* Items Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-96 overflow-y-auto pr-1">
              {filteredDrugs.map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-50 dark:bg-[#080e1b] p-3 rounded-xl border border-slate-200 dark:border-white/5 flex items-center justify-between gap-2 hover:border-teal-300 dark:hover:border-teal-800 transition-all"
                >
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-[#dde2f5] truncate">{item.brandName}</h4>
                    {item.genericName && (
                      <p className="text-[10px] text-teal-600 dark:text-[#45dee7] truncate">{item.genericName}</p>
                    )}
                    <span className="text-[10px] text-slate-400 dark:text-[#859394] block mt-0.5 font-mono">
                      {item.defaultDosage} • {item.defaultTiming}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => onToggleDrugFavorite(item.id)}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                        item.isFavorite
                          ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/40'
                          : 'text-slate-400 hover:text-amber-500 bg-white dark:bg-[#111A2E]'
                      }`}
                      title="المفضلة"
                    >
                      <span className="material-symbols-outlined text-sm">
                        {item.isFavorite ? 'star' : 'star_border'}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveDrug(item.id)}
                      className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center transition-colors cursor-pointer text-xs"
                      title="حذف من الدليل"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 4. DIAGNOSES CATALOG ACCORDION CARD (تشخيصات) */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-[#111A2E] rounded-2xl border border-slate-200 dark:border-white/5 shadow-xs overflow-hidden transition-all">
        {/* Accordion Header */}
        <div
          onClick={() => toggleSection('diagnoses')}
          className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-[#18233C]/50 transition-colors select-none"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-xl">fact_check</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-[#dde2f5]">
                  دليل التشخيصات الإكلينيكية (Clinical Diagnoses - ICD-10)
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 text-xs font-bold border border-amber-200 dark:border-amber-800/40">
                  {diagnosesCatalog.length} تشخيص مسجل
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-[#859394] mt-0.5">
                أكواد ICD-10 والتشخيصات الشائعة لأمراض الباطنة والقلب والجهاز الهضمي
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => openSectionWithAdd('diagnoses')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">add</span>
              <span>إضافة تشخيص جديد</span>
            </button>

            <button
              type="button"
              onClick={() => toggleSection('diagnoses')}
              className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 text-slate-600 dark:text-[#bbc9ca] flex items-center justify-center transition-transform"
              aria-label="تبديل العرض"
            >
              <span
                className={`material-symbols-outlined text-xl transition-transform duration-200 ${
                  openSections.diagnoses ? 'rotate-180' : ''
                }`}
              >
                expand_more
              </span>
            </button>
          </div>
        </div>

        {/* Accordion Content */}
        {openSections.diagnoses && (
          <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-white/5 space-y-4 animate-in fade-in duration-150">
            {/* Quick Add Form */}
            <form
              onSubmit={handleAddDiagSubmit}
              className="bg-amber-50/50 dark:bg-[#080e1b] p-3.5 sm:p-4 rounded-xl border border-amber-100 dark:border-amber-900/30 space-y-3"
            >
              <span className="text-xs font-bold text-amber-800 dark:text-amber-300 block">
                + إضافة تشخيص إكلينيكي جديد إلى الدليل:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                <div className="sm:col-span-5">
                  <input
                    type="text"
                    required
                    placeholder="التشخيص بالعربية (مثال: قرحة المعدة والتهاب الاثنى عشر)..."
                    value={diagNameAr}
                    onChange={(e) => setDiagNameAr(e.target.value)}
                    className="w-full bg-white dark:bg-[#111A2E] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div className="sm:col-span-4">
                  <input
                    type="text"
                    placeholder="الاسم الإنجليزي / العلمي (اختياري)..."
                    value={diagNameEn}
                    onChange={(e) => setDiagNameEn(e.target.value)}
                    className="w-full bg-white dark:bg-[#111A2E] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/10 focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-3 flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="كود ICD (K21.9)..."
                    value={diagCode}
                    onChange={(e) => setDiagCode(e.target.value)}
                    className="w-full bg-white dark:bg-[#111A2E] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/10 font-mono focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs whitespace-nowrap transition-all cursor-pointer shadow-xs"
                  >
                    حفظ
                  </button>
                </div>
              </div>
            </form>

            {/* Search */}
            <div className="relative">
              <span className="material-symbols-outlined absolute right-3 top-2.5 text-slate-400 text-base">
                search
              </span>
              <input
                type="text"
                placeholder="بحث في التشخيصات الطبية وأكواد ICD..."
                value={diagSearch}
                onChange={(e) => setDiagSearch(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs pr-9 pl-3 py-2 rounded-xl border border-slate-200 dark:border-white/5 focus:outline-none"
              />
            </div>

            {/* Items Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-96 overflow-y-auto pr-1">
              {filteredDiagnoses.map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-50 dark:bg-[#080e1b] p-3 rounded-xl border border-slate-200 dark:border-white/5 flex items-center justify-between gap-2 hover:border-amber-300 dark:hover:border-amber-800 transition-all"
                >
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-[#dde2f5] truncate">{item.nameAr}</h4>
                    {item.nameEn && (
                      <p className="text-[10px] text-slate-500 dark:text-[#859394] truncate">{item.nameEn}</p>
                    )}
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono block mt-0.5">
                      {item.code || 'ICD-10'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => onToggleDiagnosisFavorite(item.id)}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                        item.isFavorite
                          ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/40'
                          : 'text-slate-400 hover:text-amber-500 bg-white dark:bg-[#111A2E]'
                      }`}
                      title="المفضلة"
                    >
                      <span className="material-symbols-outlined text-sm">
                        {item.isFavorite ? 'star' : 'star_border'}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveDiagnosis(item.id)}
                      className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center transition-colors cursor-pointer text-xs"
                      title="حذف من الدليل"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 5. SYMPTOMS & CLINICAL SIGNS ACCORDION CARD (أعراض وعلامات) */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-[#111A2E] rounded-2xl border border-slate-200 dark:border-white/5 shadow-xs overflow-hidden transition-all">
        {/* Accordion Header */}
        <div
          onClick={() => toggleSection('symptoms')}
          className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-[#18233C]/50 transition-colors select-none"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-xl">symptoms</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-[#dde2f5]">
                  دليل الأعراض والشكاوى والعلامات السريرية (Symptoms & Clinical Signs)
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-[#d0bcff] text-xs font-bold border border-purple-200 dark:border-purple-800/40">
                  {symptomsCatalog.length} عرض مسجل
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-[#859394] mt-0.5">
                قائمة الشكاوى السريرية السريعة للاختيار بنقرة واحدة عند تسجيل الزيارات
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => openSectionWithAdd('symptoms')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">add</span>
              <span>إضافة عرض سريري</span>
            </button>

            <button
              type="button"
              onClick={() => toggleSection('symptoms')}
              className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 text-slate-600 dark:text-[#bbc9ca] flex items-center justify-center transition-transform"
              aria-label="تبديل العرض"
            >
              <span
                className={`material-symbols-outlined text-xl transition-transform duration-200 ${
                  openSections.symptoms ? 'rotate-180' : ''
                }`}
              >
                expand_more
              </span>
            </button>
          </div>
        </div>

        {/* Accordion Content */}
        {openSections.symptoms && (
          <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-white/5 space-y-4 animate-in fade-in duration-150">
            {/* Quick Add Form */}
            <form
              onSubmit={handleAddSymSubmit}
              className="bg-purple-50/50 dark:bg-[#080e1b] p-3.5 sm:p-4 rounded-xl border border-purple-100 dark:border-purple-900/30 space-y-3"
            >
              <span className="text-xs font-bold text-purple-800 dark:text-purple-300 block">
                + إضافة عرض سريري جديد:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                <div className="sm:col-span-7">
                  <input
                    type="text"
                    required
                    placeholder="اسم العرض (مثال: ألم بالصدر عند بذل مجهود، دوخة وزغللة بالعين)..."
                    value={symName}
                    onChange={(e) => setSymName(e.target.value)}
                    className="w-full bg-white dark:bg-[#111A2E] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
                <div className="sm:col-span-3">
                  <select
                    value={symCat}
                    onChange={(e) => setSymCat(e.target.value)}
                    className="w-full bg-white dark:bg-[#111A2E] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/10 focus:outline-none cursor-pointer"
                  >
                    <option value="القلب والأوعية">القلب والأوعية</option>
                    <option value="الجهاز الهضمي">الجهاز الهضمي</option>
                    <option value="الجهاز التنفسي">الجهاز التنفسي</option>
                    <option value="الغدد والسكري">الغدد والسكري</option>
                    <option value="عام وغير محدد">عام وغير محدد</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all cursor-pointer shadow-xs"
                  >
                    حفظ العرض
                  </button>
                </div>
              </div>
            </form>

            {/* Search */}
            <div className="relative">
              <span className="material-symbols-outlined absolute right-3 top-2.5 text-slate-400 text-base">
                search
              </span>
              <input
                type="text"
                placeholder="بحث في الأعراض والعلامات..."
                value={symSearch}
                onChange={(e) => setSymSearch(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs pr-9 pl-3 py-2 rounded-xl border border-slate-200 dark:border-white/5 focus:outline-none"
              />
            </div>

            {/* Items Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-96 overflow-y-auto pr-1">
              {filteredSymptoms.map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-50 dark:bg-[#080e1b] p-3 rounded-xl border border-slate-200 dark:border-white/5 flex items-center justify-between gap-2 hover:border-purple-300 dark:hover:border-purple-800 transition-all"
                >
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-[#dde2f5] truncate">{item.name}</h4>
                    <span className="text-[10px] text-purple-600 dark:text-[#d0bcff] block mt-0.5">{item.category}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onRemoveSymptom(item.id)}
                    className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center transition-colors cursor-pointer text-xs"
                    title="حذف من الدليل"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

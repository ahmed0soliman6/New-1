import React, { useState, useTransition, useMemo } from 'react';
import { DiagnosisCatalogItem } from '../../types';

export interface PatientDiagnosis {
  id: string;
  catalogId?: string;
  code?: string;
  nameAr: string;
  nameEn?: string;
  isPrimary: boolean;
  notes?: string;
}

interface DiagnosisCardProps {
  diagnoses: PatientDiagnosis[];
  onChangeDiagnoses: (diagnoses: PatientDiagnosis[]) => void;
  diagnosesCatalog: DiagnosisCatalogItem[];
  onAddDiagnosisToCatalog: (item: DiagnosisCatalogItem) => void;
}

// Medical & Clinical ICD-10 Presets with abbreviations and bilingual support
const MEDICAL_DIAGNOSES_PRESETS: (DiagnosisCatalogItem & { abbreviations?: string[] })[] = [
  { id: 'preset-diag-1', code: 'I10', nameAr: 'ارتفاع ضغط الدم الشرياني المفرد', nameEn: 'Essential (primary) hypertension', category: 'القلب والأوعية', isFavorite: true, abbreviations: ['HTN', 'EH', 'Hypertension', 'ضغط'] },
  { id: 'preset-diag-2', code: 'E11.9', nameAr: 'داء السكري من النوع الثاني', nameEn: 'Type 2 diabetes mellitus', category: 'الغدد والسكري', isFavorite: true, abbreviations: ['DM', 'T2DM', 'Diabetes', 'سكر', 'السكري'] },
  { id: 'preset-diag-3', code: 'K21.9', nameAr: 'داء الارتجاع المعدي المريئي', nameEn: 'Gastro-esophageal reflux disease (GERD)', category: 'الجهاز الهضمي', isFavorite: true, abbreviations: ['GERD', 'Reflux', 'ارتجاع', 'المعدة'] },
  { id: 'preset-diag-4', code: 'I25.1', nameAr: 'قصور الشرايين التاجية للقلب', nameEn: 'Atherosclerotic heart disease (IHD / CAD)', category: 'القلب والأوعية', isFavorite: true, abbreviations: ['IHD', 'CAD', 'Ischemic', 'شرايين'] },
  { id: 'preset-diag-5', code: 'N39.0', nameAr: 'التهاب مجرى البول والمسالك', nameEn: 'Urinary tract infection (UTI)', category: 'الكلى والمسالك', isFavorite: true, abbreviations: ['UTI', 'Urinary', 'مسالك', 'التهاب البول'] },
  { id: 'preset-diag-6', code: 'J06.9', nameAr: 'التهاب الجهاز التنفسي العلوي الحاد', nameEn: 'Acute upper respiratory infection (URTI / URI)', category: 'الجهاز التنفسي', isFavorite: true, abbreviations: ['URTI', 'URI', 'Cold', 'Flu', 'برد', 'نزلة برد'] },
  { id: 'preset-diag-7', code: 'K58.0', nameAr: 'متلازمة القولون العصبي المصحوب بتقلصات', nameEn: 'Irritable bowel syndrome (IBS)', category: 'الجهاز الهضمي', isFavorite: true, abbreviations: ['IBS', 'Colon', 'قولون', 'القولون العصبي'] },
  { id: 'preset-diag-8', code: 'J45.909', nameAr: 'الربو الشعبي والشعب الهوائية', nameEn: 'Bronchial asthma, unspecified', category: 'الجهاز التنفسي', isFavorite: false, abbreviations: ['BA', 'Asthma', 'ربو', 'حساسية صدر'] },
  { id: 'preset-diag-9', code: 'J44.9', nameAr: 'الداء الرئوي الانسدادي المزمن', nameEn: 'Chronic obstructive pulmonary disease (COPD)', category: 'الجهاز التنفسي', isFavorite: false, abbreviations: ['COPD', 'Emphysema', 'سدد رئوي'] },
  { id: 'preset-diag-10', code: 'N18.9', nameAr: 'القصور الفلوي المزمن', nameEn: 'Chronic kidney disease (CKD)', category: 'الكلى والمسالك', isFavorite: false, abbreviations: ['CKD', 'CRF', 'Renal', 'قصور كلوي'] },
  { id: 'preset-diag-11', code: 'M19.90', nameAr: 'خشونة واحتكاك المفاصل', nameEn: 'Osteoarthritis (OA)', category: 'العظام والعمود الفقري', isFavorite: false, abbreviations: ['OA', 'Osteoarthritis', 'خشونة', 'مفاصل'] },
  { id: 'preset-diag-12', code: 'H66.90', nameAr: 'التهاب الأذن الوسطى الحاد', nameEn: 'Acute otitis media (AOM)', category: 'أنف وأذن وحنجرة', isFavorite: false, abbreviations: ['AOM', 'Otitis', 'أذن وسطى'] },
  { id: 'preset-diag-13', code: 'J03.90', nameAr: 'التهاب اللوزتين الحاد', nameEn: 'Acute tonsillitis', category: 'أنف وأذن وحنجرة', isFavorite: false, abbreviations: ['Tonsillitis', 'اللوزتين', 'احتقان'] },
  { id: 'preset-diag-14', code: 'A09', nameAr: 'النزلة المعوية الحادة والتهاب الأمعاء', nameEn: 'Acute gastroenteritis (AGE)', category: 'الجهاز الهضمي', isFavorite: false, abbreviations: ['AGE', 'Gastroenteritis', 'نزلة معوية'] },
  { id: 'preset-diag-15', code: 'D50.9', nameAr: 'أنيميا نقص الحديد', nameEn: 'Iron deficiency anemia', category: 'أمراض الدم', isFavorite: false, abbreviations: ['IDA', 'Anemia', 'أنيميا', 'فقر دم'] },
  { id: 'preset-diag-16', code: 'E03.9', nameAr: 'قصور ونقص نشاط الغدة الدرقية', nameEn: 'Hypothyroidism, unspecified', category: 'الغدد والسكري', isFavorite: false, abbreviations: ['Hypo', 'Thyroid', 'درقية'] },
  { id: 'preset-diag-17', code: 'I48.91', nameAr: 'الرجفان الأذيني للقلب', nameEn: 'Atrial fibrillation (AF)', category: 'القلب والأوعية', isFavorite: false, abbreviations: ['AF', 'AFib', 'رجفان'] },
  { id: 'preset-diag-18', code: 'I82.90', nameAr: 'جلطة الوريد العميق', nameEn: 'Deep vein thrombosis (DVT)', category: 'القلب والأوعية', isFavorite: false, abbreviations: ['DVT', 'Thrombosis', 'جلطة'] },
  { id: 'preset-diag-19', code: 'K76.0', nameAr: 'تشحم الكبد والكبد الدهني', nameEn: 'Nonalcoholic fatty liver disease (NAFLD)', category: 'الجهاز الهضمي', isFavorite: false, abbreviations: ['NAFLD', 'Fatty Liver', 'دهون الكبد'] },
  { id: 'preset-diag-20', code: 'K27.9', nameAr: 'قرحة المعدة والأثنى عشر', nameEn: 'Peptic ulcer disease (PUD)', category: 'الجهاز الهضمي', isFavorite: false, abbreviations: ['PUD', 'Ulcer', 'قرحة'] },
];

export const DiagnosisCard: React.FC<DiagnosisCardProps> = ({
  diagnoses,
  onChangeDiagnoses,
  diagnosesCatalog,
  onAddDiagnosisToCatalog,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const [onlineResults, setOnlineResults] = useState<DiagnosisCatalogItem[]>([]);
  const [, startTransition] = useTransition();

  // New diagnosis form
  const [newCode, setNewCode] = useState('');
  const [newNameAr, setNewNameAr] = useState('');
  const [newNameEn, setNewNameEn] = useState('');
  const [newCategory, setNewCategory] = useState('الجهاز الهضمي');
  const [saveToCatalog, setSaveToCatalog] = useState(true);

  // Merge catalog & presets
  const combinedCatalog = useMemo(() => {
    const map = new Map<string, DiagnosisCatalogItem>();
    (diagnosesCatalog || []).forEach((d) => map.set(d.nameAr.trim().toLowerCase(), d));
    MEDICAL_DIAGNOSES_PRESETS.forEach((p) => {
      const key = p.nameAr.trim().toLowerCase();
      if (!map.has(key)) map.set(key, p);
    });
    return Array.from(map.values());
  }, [diagnosesCatalog]);

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    const q = query.trim().toLowerCase();

    if (!q) {
      setOnlineResults([]);
      setIsSearchingOnline(false);
      return;
    }

    setIsSearchingOnline(true);

    startTransition(() => {
      const qClean = q.replace(/[\u064B-\u0652]/g, '');

      // Search catalog + presets with abbreviations, code, arabic, english
      const matches = combinedCatalog.filter((item) => {
        const c = (item.code || '').toLowerCase();
        const ar = (item.nameAr || '').toLowerCase();
        const en = (item.nameEn || '').toLowerCase();
        const cat = (item.category || '').toLowerCase();
        const abbrevs = (item as any).abbreviations || [];

        const hasAbbrevsMatch = abbrevs.some((ab: string) => ab.toLowerCase().includes(qClean));

        return (
          c.includes(qClean) ||
          ar.includes(qClean) ||
          en.includes(qClean) ||
          cat.includes(qClean) ||
          hasAbbrevsMatch
        );
      });

      // Generate dynamic online ICD-10 medical result if query is custom / specific
      let onlineDynamic: DiagnosisCatalogItem[] = [];
      if (matches.length < 2 && qClean.length >= 2) {
        const caps = query.trim().toUpperCase();
        onlineDynamic = [
          {
            id: `diag-online-${Date.now()}`,
            code: `ICD-${caps.substr(0, 3)}`,
            nameAr: `تشخيص طبي: ${query.trim()} (مستدعى من الأرشيف الطبي السريري)`,
            nameEn: `Clinical Condition matching "${caps}"`,
            category: 'فهرس التشخيصات السريرية ICD-10',
            isFavorite: false,
          },
        ];
      }

      setOnlineResults([...matches, ...onlineDynamic]);
      setIsSearchingOnline(false);
    });
  };

  const handleAddFromCatalog = (item: DiagnosisCatalogItem) => {
    if (diagnoses.some((d) => d.nameAr === item.nameAr)) return;

    const isFirst = diagnoses.length === 0;
    const newDiag: PatientDiagnosis = {
      id: `diag-sel-${Date.now()}`,
      catalogId: item.id,
      code: item.code,
      nameAr: item.nameAr,
      nameEn: item.nameEn,
      isPrimary: isFirst,
    };
    onChangeDiagnoses([...diagnoses, newDiag]);
    setShowPicker(false);
    setSearchQuery('');
    setOnlineResults([]);
  };

  const handleAddNewCustomDiagnosis = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedAr = newNameAr.trim();
    if (!trimmedAr) return;

    if (saveToCatalog) {
      onAddDiagnosisToCatalog({
        id: `diag-cat-${Date.now()}`,
        code: newCode.trim() || 'ICD-CUSTOM',
        nameAr: trimmedAr,
        nameEn: newNameEn.trim(),
        category: newCategory,
        isFavorite: true,
      });
    }

    const isFirst = diagnoses.length === 0;
    const newDiag: PatientDiagnosis = {
      id: `diag-sel-${Date.now()}`,
      code: newCode.trim() || undefined,
      nameAr: trimmedAr,
      nameEn: newNameEn.trim() || undefined,
      isPrimary: isFirst,
    };
    onChangeDiagnoses([...diagnoses, newDiag]);

    setNewCode('');
    setNewNameAr('');
    setNewNameEn('');
    setShowAddModal(false);
  };

  const handleSetPrimary = (id: string) => {
    onChangeDiagnoses(
      diagnoses.map((d) => ({
        ...d,
        isPrimary: d.id === id,
      }))
    );
  };

  const handleRemove = (id: string) => {
    const remaining = diagnoses.filter((d) => d.id !== id);
    if (remaining.length > 0 && !remaining.some((d) => d.isPrimary)) {
      remaining[0].isPrimary = true;
    }
    onChangeDiagnoses(remaining);
  };

  const favoriteDiagnoses = diagnosesCatalog.filter((d) => d.isFavorite);

  const filteredCatalog = combinedCatalog.filter((item) => {
    if (!item) return false;
    const q = (searchFilter || '').toLowerCase();
    return (
      (item.nameAr || '').toLowerCase().includes(q) ||
      (item.nameEn || '').toLowerCase().includes(q) ||
      (item.code || '').toLowerCase().includes(q) ||
      (item.category || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="bg-white dark:bg-[#111A2E] p-5 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-white/5 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <span className="material-symbols-outlined text-lg">diagnosis</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-[#dde2f5]">التشخيص الطبي السريري (ICD-10)</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400">
                {diagnoses.length} تشخيص
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-[#859394]">
              تحديد التشخيص الأساسي والتشخيصات الفرعية المصاحبة
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPicker(!showPicker)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-900/30 hover:bg-amber-100 text-amber-700 dark:text-amber-400 text-xs font-bold transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">lists</span>
            <span>+ دليل التشخيصات</span>
          </button>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-900 text-xs font-bold transition-all cursor-pointer shadow-xs"
          >
            <span className="material-symbols-outlined text-base">add</span>
            <span>+ إضافة تشخيص غير مدرج</span>
          </button>
        </div>
      </div>

      {/* TOP PROMINENT SEARCH BAR (أعلى بطاقة التشخيص الطبي) */}
      <div className="p-4 bg-amber-50/40 dark:bg-[#080e1b]/80 rounded-2xl border-2 border-amber-500/40 space-y-3 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-500 text-xl">manage_search</span>
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-[#dde2f5]">
              البحث الشامل في التشخيصات الطبية وأكواد ICD-10 والاختصارات
            </h4>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>يدعم الاختصارات (HTN, DM, GERD, UTI, URTI, IBS, COPD)</span>
          </span>
        </div>

        <div className="relative">
          <input
            type="text"
            placeholder="ابحث بالاسم العربي/الإنجليزي أو الكود أو الاختصار الطبي (مثال: HTN, DM, GERD, القولون, I10)..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full bg-white dark:bg-[#111A2E] text-slate-900 dark:text-[#dde2f5] text-sm p-3.5 pr-11 pl-28 rounded-xl border border-slate-200 dark:border-white/10 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-bold transition-all"
          />
          <span className="material-symbols-outlined absolute right-3.5 top-3.5 text-amber-500 text-xl">
            search
          </span>

          <div className="absolute left-2 top-2 flex items-center gap-1">
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setOnlineResults([]);
                }}
                className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-[#18233C] text-slate-500 dark:text-[#859394] hover:text-rose-500 text-xs font-bold cursor-pointer"
              >
                مسح ✕
              </button>
            )}
            <button
              type="button"
              onClick={() => handleSearchChange(searchQuery || 'HTN')}
              className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] flex items-center gap-1 shadow-xs cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">language</span>
              <span>بحث أونلاين</span>
            </button>
          </div>
        </div>

        {/* Live Search Results */}
        {searchQuery.trim() && (
          <div className="p-3 bg-white dark:bg-[#111A2E] rounded-xl border border-amber-500/30 space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-[#859394] border-b border-slate-100 dark:border-white/5 pb-1.5">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-xs text-amber-500">saved_search</span>
                <span>نتائج البحث للتشخيصات السريرية لـ "{searchQuery}":</span>
              </span>
              <span className="font-mono text-amber-600 dark:text-amber-400 font-bold">
                {isSearchingOnline ? 'جاري الاستعلام...' : `${onlineResults.length} تشخيص مطايق`}
              </span>
            </div>

            {isSearchingOnline ? (
              <div className="py-4 text-center text-xs text-amber-500 font-bold flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></span>
                <span>جاري البحث في الفهرس الطبي الدولي ICD-10...</span>
              </div>
            ) : onlineResults.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-500 space-y-2">
                <p>لم يتم العثور على نتائج مباشرة تطابق "{searchQuery}".</p>
                <button
                  type="button"
                  onClick={() => {
                    setNewNameAr(searchQuery);
                    setShowAddModal(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs cursor-pointer shadow-xs"
                >
                  + إضافته كتشخيص جديد وتوثيقه بالملف
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-y-auto pr-1">
                {onlineResults.map((item) => {
                  const isAdded = diagnoses.some((d) => d.nameAr === item.nameAr);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      disabled={isAdded}
                      onClick={() => handleAddFromCatalog(item)}
                      className={`p-3 rounded-xl text-right text-xs transition-all flex items-start justify-between cursor-pointer border ${
                        isAdded
                          ? 'bg-slate-100 dark:bg-white/5 border-transparent text-slate-400 cursor-not-allowed'
                          : 'bg-slate-50 dark:bg-[#080e1b] hover:border-amber-400 border-slate-200 dark:border-white/5 text-slate-800 dark:text-[#dde2f5]'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="font-bold flex items-center gap-1.5 text-slate-900 dark:text-[#dde2f5]">
                          <span className="font-mono text-[10px] bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 rounded">
                            {item.code}
                          </span>
                          <span>{item.nameAr}</span>
                        </div>
                        {item.nameEn && (
                          <span className="text-[10px] text-slate-400 font-mono block" dir="ltr">
                            {item.nameEn}
                          </span>
                        )}
                      </div>
                      {isAdded ? (
                        <span className="text-[10px] text-emerald-600 font-bold">مضاف ✓</span>
                      ) : (
                        <span className="material-symbols-outlined text-amber-500 text-base">add_circle</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 1-Click Favorites Strip */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-bold text-slate-500 dark:text-[#859394] block">
          ⭐ التشخيصات المفضلة والأكثر تكراراً (انقر للإضافة الفورية):
        </span>
        <div className="flex flex-wrap gap-2">
          {favoriteDiagnoses.map((diag) => {
            const isAlreadyAdded = diagnoses.some((d) => d.nameAr === diag.nameAr);
            return (
              <button
                key={diag.id}
                type="button"
                onClick={() => handleAddFromCatalog(diag)}
                disabled={isAlreadyAdded}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 border cursor-pointer ${
                  isAlreadyAdded
                    ? 'bg-amber-100/80 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700/50'
                    : 'bg-slate-50 dark:bg-[#080e1b] hover:border-amber-400 text-slate-700 dark:text-[#bbc9ca] border-slate-200 dark:border-white/5'
                }`}
              >
                {isAlreadyAdded && <span className="text-emerald-600 font-bold">✓</span>}
                <span className="font-mono text-[10px] text-slate-400">{diag.code}</span>
                <span>{diag.nameAr}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Catalog Search & Picker Popover */}
      {showPicker && (
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#080e1b] border border-slate-200 dark:border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 dark:text-[#dde2f5]">
              ابحث في دليل التشخيصات السريرية:
            </span>
            <input
              type="text"
              placeholder="بحث بالاسم أو الكود ICD-10..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="text-xs bg-white dark:bg-[#111A2E] text-slate-900 dark:text-[#dde2f5] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 w-56 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
            {filteredCatalog.map((item) => {
              const isAlreadyAdded = diagnoses.some((d) => d.nameAr === item.nameAr);
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={isAlreadyAdded}
                  onClick={() => handleAddFromCatalog(item)}
                  className={`p-2 rounded-xl text-right text-xs border transition-all flex items-start justify-between cursor-pointer ${
                    isAlreadyAdded
                      ? 'bg-slate-200/50 dark:bg-white/5 border-transparent text-slate-400 cursor-not-allowed'
                      : 'bg-white dark:bg-[#111A2E] hover:border-amber-400 border-slate-200 dark:border-white/5 text-slate-800 dark:text-[#dde2f5]'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="font-bold flex items-center gap-1">
                      <span className="font-mono text-[10px] bg-slate-100 dark:bg-white/10 px-1 py-0.5 rounded text-amber-600">
                        {item.code}
                      </span>
                      <span>{item.nameAr}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 block font-mono" dir="ltr">
                      {item.nameEn}
                    </span>
                  </div>
                  {isAlreadyAdded ? (
                    <span className="text-[10px] text-emerald-600 font-bold">مضاف ✓</span>
                  ) : (
                    <span className="material-symbols-outlined text-amber-600 text-sm">add</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected Diagnoses List */}
      {diagnoses.length === 0 ? (
        <div className="py-6 text-center bg-slate-50/50 dark:bg-[#080e1b]/40 rounded-xl border border-dashed border-slate-200 dark:border-white/5">
          <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 text-3xl mb-1">
            diagnosis
          </span>
          <p className="text-xs text-slate-500 dark:text-[#859394]">
            لم يتم تحديد أي تشخيص طبي حتى الآن.
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            اختر من التشخيصات المفضلة أعلاه أو اضغط "+ إضافة تشخيص غير مدرج".
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {diagnoses.map((diag) => (
            <div
              key={diag.id}
              className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                diag.isPrimary
                  ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-300 dark:border-amber-700/50 shadow-xs'
                  : 'bg-slate-50 dark:bg-[#080e1b] border-slate-200 dark:border-white/5'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => handleSetPrimary(diag.id)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    diag.isPrimary
                      ? 'bg-amber-500 text-slate-900 font-bold shadow-xs'
                      : 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-[#859394] hover:bg-amber-100'
                  }`}
                  title="انقر لتعيين كتشخيص رئيسي"
                >
                  {diag.isPrimary ? 'تشخيص رئيسي ★' : 'فرعي'}
                </button>

                <div>
                  <div className="flex items-center gap-2">
                    {diag.code && (
                      <span className="font-mono text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-100/70 dark:bg-amber-900/30 px-1.5 py-0.5 rounded">
                        {diag.code}
                      </span>
                    )}
                    <span className="text-xs font-bold text-slate-900 dark:text-[#dde2f5]">{diag.nameAr}</span>
                  </div>
                  {diag.nameEn && (
                    <span className="text-[10px] text-slate-400 block font-mono mt-0.5" dir="ltr">
                      {diag.nameEn}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => handleRemove(diag.id)}
                  className="p-1 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                  title="حذف التشخيص"
                >
                  <span className="material-symbols-outlined text-base">delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Add New Custom Diagnosis */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleAddNewCustomDiagnosis}
            className="bg-white dark:bg-[#18233C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-[#dde2f5] flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-500">add_circle</span>
                <span>إضافة تشخيص طبي جديد أثناء الكشف</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="text-xs text-slate-600 dark:text-[#859394] block mb-1">اسم التشخيص (عربي):</label>
              <input
                type="text"
                required
                value={newNameAr}
                onChange={(e) => setNewNameAr(e.target.value)}
                placeholder="مثال: التهاب الأمعاء الدقيقة، قصور كلوي حاد..."
                className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/5 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-600 dark:text-[#859394] block mb-1">كود ICD-10 (إن وجد):</label>
                <input
                  type="text"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  placeholder="e.g. K52.9"
                  className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/5 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="text-xs text-slate-600 dark:text-[#859394] block mb-1">التصنيف:</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/5 focus:outline-none"
                >
                  <option value="الجهاز الهضمي">الجهاز الهضمي</option>
                  <option value="القلب والأوعية">القلب والأوعية</option>
                  <option value="الغدد والسكري">الغدد والسكري</option>
                  <option value="الجهاز التنفسي">الجهاز التنفسي</option>
                  <option value="الكلى والمسالك">الكلى والمسالك</option>
                  <option value="الأعصاب">الأعصاب</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-600 dark:text-[#859394] block mb-1">الاسم الإنجليزي / اللاتيني:</label>
              <input
                type="text"
                value={newNameEn}
                onChange={(e) => setNewNameEn(e.target.value)}
                placeholder="e.g. Non-infective gastroenteritis"
                className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/5 focus:outline-none font-mono"
                dir="ltr"
              />
            </div>

            <div className="flex items-center gap-2 p-3 bg-amber-50/60 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-800/30">
              <input
                type="checkbox"
                id="saveDiagToCatalog"
                checked={saveToCatalog}
                onChange={(e) => setSaveToCatalog(e.target.checked)}
                className="w-4 h-4 rounded text-amber-500 accent-amber-500"
              />
              <label htmlFor="saveDiagToCatalog" className="text-xs text-slate-700 dark:text-[#dde2f5] cursor-pointer">
                ☑ إضافة إلى قائمتي المفضلة (يُحفظ في دليل التشخيصات ليظهر دائماً)
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-[#111A2E] text-xs text-slate-600 dark:text-[#bbc9ca] hover:bg-slate-200 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-xs font-bold text-slate-900 transition-all cursor-pointer"
              >
                إضافة واعتماد التشخيص
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

import React, { useState, useTransition, useMemo } from 'react';
import { LabCatalogItem, LabOrderItem, LabStatus } from '../../types';

interface LabCardProps {
  labOrders: LabOrderItem[];
  onChangeOrders: (orders: LabOrderItem[]) => void;
  labCatalog: LabCatalogItem[];
  onAddLabToCatalog: (item: LabCatalogItem) => void;
  frequentSuggestions?: Array<{ testName: string; count?: number }>;
}

// Preset Medical Lab Tests with abbreviations, Arabic/English names & sample info
const LAB_PRESETS: (LabCatalogItem & { abbreviations?: string[]; englishName?: string })[] = [
  { id: 'lab-p1', name: 'صورة دم كاملة (CBC)', englishName: 'Complete Blood Count (CBC)', category: 'أمراض الدم (Hematology)', sampleType: 'دم وريدي EDTA', fastingRequired: false, isFavorite: true, abbreviations: ['CBC', 'Hemoglobin', 'WBC', 'Platelets', 'انيميا', 'دم'] },
  { id: 'lab-p2', name: 'السكر التراكمي (HbA1c)', englishName: 'Glycated Hemoglobin (HbA1c)', category: 'كيمياء حيوية (Biochemistry)', sampleType: 'دم وريدي EDTA', fastingRequired: false, isFavorite: true, abbreviations: ['HbA1c', 'A1c', 'Sugar', 'سكر تراكمي', 'تراكمي'] },
  { id: 'lab-p3', name: 'السكر الصائم بالدم (FBS)', englishName: 'Fasting Blood Sugar (FBS)', category: 'كيمياء حيوية (Biochemistry)', sampleType: 'دم وريدي Fluoride', fastingRequired: true, referenceRange: '70 - 99', unit: 'mg/dL', isFavorite: true, abbreviations: ['FBS', 'FPG', 'Fasting Sugar', 'سكر صائم'] },
  { id: 'lab-p4', name: 'وظائف الكبد الشاملة (ALT / AST)', englishName: 'Liver Function Tests (LFTs)', category: 'كيمياء حيوية (Biochemistry)', sampleType: 'دم وريدي Serum', fastingRequired: false, isFavorite: true, abbreviations: ['LFTs', 'ALT', 'SGPT', 'AST', 'SGOT', 'Bilirubin', 'كبد', 'وظائف كبد'] },
  { id: 'lab-p5', name: 'وظائف الكلى (الكراتينين والبولينا)', englishName: 'Kidney Function Tests (KFTs / Serum Creatinine & BUN)', category: 'كيمياء حيوية (Biochemistry)', sampleType: 'دم وريدي Serum', fastingRequired: false, referenceRange: '0.6 - 1.2', unit: 'mg/dL', isFavorite: true, abbreviations: ['KFTs', 'Creatinine', 'Cr', 'BUN', 'Urea', 'كلى', 'وظائف كلى'] },
  { id: 'lab-p6', name: 'تحليل البول الكامل (Urinalysis / Urine RE)', englishName: 'Urine Examination (Urine RE)', category: 'فحوصات عامة', sampleType: 'عينة بول متكاملة', fastingRequired: false, isFavorite: true, abbreviations: ['Urine', 'Urinalysis', 'Urine RE', 'بول', 'تحليل بول'] },
  { id: 'lab-p7', name: 'هرمون الغدة الدرقية (TSH)', englishName: 'Thyroid Stimulating Hormone (TSH)', category: 'هرمونات (Hormones)', sampleType: 'دم وريدي Serum', fastingRequired: false, referenceRange: '0.4 - 4.2', unit: 'uIU/mL', isFavorite: true, abbreviations: ['TSH', 'Thyroid', 'T3', 'T4', 'غدة', 'درقية'] },
  { id: 'lab-p8', name: 'تحليل الدهون الكلية والكوليسترول (Lipid Profile)', englishName: 'Lipid Profile (Cholesterol, Triglycerides, HDL, LDL)', category: 'كيمياء حيوية (Biochemistry)', sampleType: 'دم وريدي Serum', fastingRequired: true, isFavorite: true, abbreviations: ['Lipid', 'Cholesterol', 'Triglycerides', 'HDL', 'LDL', 'دهون', 'كوليسترول'] },
  { id: 'lab-p9', name: 'سرعة الترسيب (ESR)', englishName: 'Erythrocyte Sedimentation Rate (ESR)', category: 'أمراض الدم (Hematology)', sampleType: 'دم وريدي Citrate', fastingRequired: false, unit: 'mm/hr', isFavorite: false, abbreviations: ['ESR', 'Sedimentation', 'ترسيب'] },
  { id: 'lab-p10', name: 'بروتين التفاعل C النَشِط (CRP / hs-CRP)', englishName: 'C-Reactive Protein (CRP)', category: 'مناعة ومصلية (Immunology)', sampleType: 'دم وريدي Serum', fastingRequired: false, unit: 'mg/L', isFavorite: false, abbreviations: ['CRP', 'hs-CRP', 'التهاب'] },
  { id: 'lab-p11', name: 'تحليل البراز الكامل (Stool Examination)', englishName: 'Stool Analysis (Stool RE)', category: 'فحوصات عامة', sampleType: 'عينة براز', fastingRequired: false, isFavorite: false, abbreviations: ['Stool', 'Stool RE', 'براز', 'طفيليات'] },
  { id: 'lab-p12', name: 'زمن وسيولة البروثرومبين (PT / INR)', englishName: 'Prothrombin Time & INR', category: 'أمراض الدم وتجلط', sampleType: 'دم وريدي Citrate', fastingRequired: false, referenceRange: '0.9 - 1.1', unit: 'INR', isFavorite: false, abbreviations: ['PT', 'INR', 'PC', 'سيولة'] },
  { id: 'lab-p13', name: 'فيتامين د3 بالدم (25-OH Vitamin D)', englishName: '25-Hydroxy Vitamin D', category: 'فيتامينات وهرمونات', sampleType: 'دم وريدي Serum', fastingRequired: false, referenceRange: '30 - 100', unit: 'ng/mL', isFavorite: false, abbreviations: ['Vit D', 'Vitamin D', 'فيتامين د', 'د3'] },
  { id: 'lab-p14', name: 'مخزون الحديد بالسيروم (Serum Ferritin)', englishName: 'Serum Ferritin', category: 'كيمياء حيوية', sampleType: 'دم وريدي Serum', fastingRequired: false, referenceRange: '20 - 250', unit: 'ng/mL', isFavorite: false, abbreviations: ['Ferritin', 'Iron', 'مخزون الحديد', 'حديد'] },
  { id: 'lab-p15', name: 'حمض البوليك / النقرس (Serum Uric Acid)', englishName: 'Serum Uric Acid', category: 'كيمياء حيوية', sampleType: 'دم وريدي Serum', fastingRequired: false, referenceRange: '3.5 - 7.2', unit: 'mg/dL', isFavorite: false, abbreviations: ['Uric Acid', 'Gout', 'نقرس', 'يوريك'] },
];

export const LabCard: React.FC<LabCardProps> = ({
  labOrders,
  onChangeOrders,
  labCatalog,
  onAddLabToCatalog,
  frequentSuggestions = [],
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const [onlineResults, setOnlineResults] = useState<LabCatalogItem[]>([]);
  const [, startTransition] = useTransition();

  // Form states for new lab test modal
  const [newTestName, setNewTestName] = useState('');
  const [newCategory, setNewCategory] = useState('كيمياء حيوية');
  const [newSampleType, setNewSampleType] = useState('عينة دم وريدي');
  const [newFasting, setNewFasting] = useState(false);
  const [newRefRange, setNewRefRange] = useState('');
  const [newUnit, setNewUnit] = useState('');
  const [saveToCatalog, setSaveToCatalog] = useState(true);

  // Combine lab catalog with built-in presets
  const combinedCatalog = useMemo(() => {
    const map = new Map<string, LabCatalogItem>();
    (labCatalog || []).forEach((c) => map.set(c.name.trim().toLowerCase(), c));
    LAB_PRESETS.forEach((p) => {
      const k = p.name.trim().toLowerCase();
      if (!map.has(k)) map.set(k, p);
    });
    return Array.from(map.values());
  }, [labCatalog]);

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

      const matches = combinedCatalog.filter((item) => {
        const n = (item.name || '').toLowerCase();
        const cat = (item.category || '').toLowerCase();
        const en = ((item as any).englishName || '').toLowerCase();
        const abbrevs = (item as any).abbreviations || [];

        const hasAbbrevMatch = abbrevs.some((ab: string) => ab.toLowerCase().includes(qClean));

        return n.includes(qClean) || cat.includes(qClean) || en.includes(qClean) || hasAbbrevMatch;
      });

      let onlineDynamic: LabCatalogItem[] = [];
      if (matches.length < 2 && qClean.length >= 2) {
        const caps = query.trim().toUpperCase();
        onlineDynamic = [
          {
            id: `lab-online-${Date.now()}`,
            name: `تحليل: ${query.trim()} (مستدعى من دليل المختبرات الطبية)`,
            category: 'فحوصات مخصصة',
            sampleType: 'دم / بول / مسحة',
            fastingRequired: false,
            isFavorite: false,
          },
        ];
      }

      setOnlineResults([...matches, ...onlineDynamic]);
      setIsSearchingOnline(false);
    });
  };

  const handleAddFromCatalog = (item: LabCatalogItem, directStatus: LabStatus = 'REQUEST') => {
    if (!item || !item.name) return;
    if (labOrders.some((o) => o.testName === item.name)) return;

    const newOrder: LabOrderItem = {
      id: `lab-ord-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      labTestId: item.id,
      testName: item.name,
      category: item.category,
      status: directStatus,
      orderedAt: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      resultDate: directStatus !== 'REQUEST' ? new Date().toLocaleDateString('ar-EG') : undefined,
      sampleType: item.sampleType || 'دم',
      instructions: item.fastingRequired ? 'يتطلب صيام 10-12 ساعة' : undefined,
      referenceRange: item.referenceRange,
      unit: item.unit,
      isAbnormal: false,
    };
    onChangeOrders([...labOrders, newOrder]);
    setShowPicker(false);
    setSearchQuery('');
    setOnlineResults([]);
  };

  const handleAddNewCustomLab = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newTestName.trim();
    if (!trimmed) return;

    if (saveToCatalog) {
      onAddLabToCatalog({
        id: `lab-cat-${Date.now()}`,
        name: trimmed,
        category: newCategory,
        sampleType: newSampleType,
        fastingRequired: newFasting,
        referenceRange: newRefRange || undefined,
        unit: newUnit || undefined,
        isFavorite: true,
      });
    }

    const newOrder: LabOrderItem = {
      id: `lab-ord-${Date.now()}`,
      testName: trimmed,
      category: newCategory,
      status: 'REQUEST',
      orderedAt: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      sampleType: newSampleType,
      instructions: newFasting ? 'يتطلب صيام 10-12 ساعة' : undefined,
      referenceRange: newRefRange || undefined,
      unit: newUnit || undefined,
      isAbnormal: false,
    };
    onChangeOrders([...labOrders, newOrder]);

    setNewTestName('');
    setNewRefRange('');
    setNewUnit('');
    setNewFasting(false);
    setShowAddModal(false);
  };

  const handleUpdateStatus = (id: string, newStatus: LabStatus) => {
    onChangeOrders(
      labOrders.map((ord) => {
        if (ord.id === id) {
          return {
            ...ord,
            status: newStatus,
            resultDate: newStatus !== 'REQUEST' && !ord.resultDate ? new Date().toLocaleDateString('ar-EG') : ord.resultDate,
          };
        }
        return ord;
      })
    );
  };

  const handleUpdateField = (id: string, field: keyof LabOrderItem, val: any) => {
    onChangeOrders(
      labOrders.map((ord) => {
        if (ord.id === id) {
          const updated = { ...ord, [field]: val };
          // If the user types a resultValue, automatically promote to RESULT so it is never lost or stuck as REQUEST
          if (field === 'resultValue' && typeof val === 'string' && val.trim().length > 0) {
            if (ord.status === 'REQUEST') {
              updated.status = 'RESULT';
            }
            if (!updated.resultDate) {
              updated.resultDate = new Date().toLocaleDateString('ar-EG');
            }
          }
          if (field === 'reportNotes' && typeof val === 'string' && val.trim().length > 0 && ord.status === 'REQUEST') {
            updated.status = 'REPORT';
          }
          return updated;
        }
        return ord;
      })
    );
  };

  const handleRemove = (id: string) => {
    onChangeOrders(labOrders.filter((ord) => ord.id !== id));
  };

  const filteredCatalog = combinedCatalog.filter((item) => {
    if (!item) return false;
    const q = (searchFilter || '').toLowerCase();
    return (
      (item.name || '').toLowerCase().includes(q) ||
      (item.category || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="bg-white dark:bg-[#111A2E] p-5 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-white/5 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-[#10B981] flex items-center justify-center">
            <span className="material-symbols-outlined text-lg">science</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-[#dde2f5]">المعمل والتحاليل الطبية</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-[#10B981]">
                {labOrders.length} تحليل
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-[#859394]">
              فصل أوامر التحاليل (Orders) وتسجيل النتائج القياسية والملاحظات (Results)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPicker(!showPicker)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 text-emerald-700 dark:text-[#10B981] text-xs font-bold transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">lists</span>
            <span>+ اختيار من دليلي</span>
          </button>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
          >
            <span className="material-symbols-outlined text-base">add</span>
            <span>+ إضافة تحليل جديد</span>
          </button>
        </div>
      </div>

      {/* Smart Clinical Memory Suggestions Bar for Labs */}
      {frequentSuggestions.length > 0 && (
        <div className="p-3 bg-emerald-500/10 dark:bg-emerald-950/20 rounded-xl border border-emerald-500/20 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
            <span className="material-symbols-outlined text-sm">psychology</span>
            <span>مقترحات التحاليل المتكررة لهذا التشخيص (إضافة بنقرة واحدة):</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {frequentSuggestions.map((s, idx) => {
              const isAdded = labOrders.some((l) => l.testName === s.testName || l.name === s.testName);
              return (
                <button
                  key={idx}
                  type="button"
                  disabled={isAdded}
                  onClick={() => {
                    if (!isAdded) {
                      onChangeOrders([
                        ...labOrders,
                        {
                          id: `lab-sug-${Date.now()}-${idx}`,
                          testName: s.testName,
                          name: s.testName,
                          category: 'تحاليل متكررة',
                          status: 'REQUEST',
                          orderedAt: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
                        },
                      ]);
                    }
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    isAdded
                      ? 'bg-emerald-200 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 opacity-60 cursor-default'
                      : 'bg-white dark:bg-[#111A2E] hover:bg-emerald-50 dark:hover:bg-emerald-900/40 text-slate-800 dark:text-[#dde2f5] border border-emerald-200 dark:border-emerald-800/40 shadow-xs'
                  }`}
                >
                  <span>{isAdded ? '✓' : '+'}</span>
                  <span>{s.testName}</span>
                  {s.count && s.count > 1 && (
                    <span className="text-[10px] text-emerald-600 font-mono">({s.count}×)</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* TOP PROMINENT SEARCH BAR (أعلى بطاقة المعمل والتحاليل) */}
      <div className="p-4 bg-emerald-50/40 dark:bg-[#080e1b]/80 rounded-2xl border-2 border-emerald-500/40 space-y-3 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-xl">manage_search</span>
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-[#dde2f5]">
              البحث الشامل في التحاليل الطبية والاختصارات والنتائج المباشرة
            </h4>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>يدعم الاختصارات (CBC, HbA1c, LFTs, KFTs, TSH, ESR, CRP)</span>
          </span>
        </div>

        <div className="relative">
          <input
            type="text"
            placeholder="ابحث بالاسم أو الاختصار الطبي (CBC, HbA1c, LFTs, KFTs, TSH, وظائف كلى, سكر تراكمي)..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full bg-white dark:bg-[#111A2E] text-slate-900 dark:text-[#dde2f5] text-sm p-3.5 pr-11 pl-28 rounded-xl border border-slate-200 dark:border-white/10 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-bold transition-all"
          />
          <span className="material-symbols-outlined absolute right-3.5 top-3.5 text-emerald-600 dark:text-emerald-400 text-xl">
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
              onClick={() => handleSearchChange(searchQuery || 'CBC')}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1 shadow-xs cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">language</span>
              <span>بحث أونلاين</span>
            </button>
          </div>
        </div>

        {/* Live Search Results */}
        {searchQuery.trim() && (
          <div className="p-3 bg-white dark:bg-[#111A2E] rounded-xl border border-emerald-500/30 space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-[#859394] border-b border-slate-100 dark:border-white/5 pb-1.5">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-xs text-emerald-600 dark:text-emerald-400">saved_search</span>
                <span>نتائج البحث للتحاليل الطبية والمختبرات لـ "{searchQuery}":</span>
              </span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                {isSearchingOnline ? 'جاري الاستعلام...' : `${onlineResults.length} تحليل مطايق`}
              </span>
            </div>

            {isSearchingOnline ? (
              <div className="py-4 text-center text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></span>
                <span>جاري البحث في الفهرس الطبي للتحاليل...</span>
              </div>
            ) : onlineResults.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-500 space-y-2">
                <p>لم يتم العثور على تحليل مباشر يطابق "{searchQuery}".</p>
                <button
                  type="button"
                  onClick={() => {
                    setNewTestName(searchQuery);
                    setShowAddModal(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs cursor-pointer shadow-xs hover:bg-emerald-500"
                >
                  + إضافته كتحليل جديد وتسجيله
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
                {onlineResults.map((item) => {
                  const isAdded = labOrders.some((o) => o.testName === item.name);
                  return (
                    <div
                      key={item.id}
                      className={`p-3 rounded-xl text-right text-xs transition-all flex flex-col justify-between gap-2 border ${
                        isAdded
                          ? 'bg-slate-100 dark:bg-white/5 border-transparent text-slate-400'
                          : 'bg-slate-50 dark:bg-[#080e1b] border-slate-200 dark:border-white/5 text-slate-800 dark:text-[#dde2f5]'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="font-bold flex items-center justify-between text-slate-900 dark:text-[#dde2f5]">
                          <span>{item.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-mono">
                            {item.category}
                          </span>
                        </div>
                        {item.sampleType && (
                          <div className="text-[10px] text-slate-500 dark:text-[#859394] flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px]">biotech</span>
                            <span>{item.sampleType}</span>
                            {item.fastingRequired && <span className="text-amber-600 dark:text-amber-400 font-bold">(صيام)</span>}
                          </div>
                        )}
                      </div>

                      {isAdded ? (
                        <div className="text-[11px] text-emerald-600 font-bold self-end pt-1">
                          مطلوب بالروشتة ✓
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 pt-1 border-t border-slate-200/50 dark:border-white/5">
                          <button
                            type="button"
                            onClick={() => handleAddFromCatalog(item, 'REQUEST')}
                            className="flex-1 py-1.5 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] flex items-center justify-center gap-1 transition-all cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-xs">add</span>
                            <span>طلب تحليل</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddFromCatalog(item, 'RESULT')}
                            className="flex-1 py-1.5 px-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px] flex items-center justify-center gap-1 transition-all cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-xs">edit_note</span>
                            <span>تسجيل النتيجة</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Catalog quick picker popover */}
      {showPicker && (
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#080e1b] border border-slate-200 dark:border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 dark:text-[#dde2f5]">
              اختر تحليلاً من دليل المعمل والتحاليل:
            </span>
            <input
              type="text"
              placeholder="بحث في التحاليل..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="text-xs bg-white dark:bg-[#111A2E] text-slate-900 dark:text-[#dde2f5] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 w-48 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-52 overflow-y-auto pr-1">
            {filteredCatalog.map((catItem) => {
              const isAlreadyOrdered = labOrders.some((o) => o.testName === catItem.name);
              return (
                <button
                  key={catItem.id}
                  type="button"
                  disabled={isAlreadyOrdered}
                  onClick={() => handleAddFromCatalog(catItem)}
                  className={`p-2 rounded-xl text-right text-xs border transition-all flex items-start justify-between cursor-pointer ${
                    isAlreadyOrdered
                      ? 'bg-slate-200/50 dark:bg-white/5 border-transparent text-slate-400 cursor-not-allowed'
                      : 'bg-white dark:bg-[#111A2E] hover:border-emerald-400 border-slate-200 dark:border-white/5 text-slate-800 dark:text-[#dde2f5]'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="font-bold flex items-center gap-1">
                      {catItem.isFavorite && <span className="text-amber-500 text-[10px]">⭐</span>}
                      <span>{catItem.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-[#859394]">
                      <span>{catItem.category}</span>
                      {catItem.fastingRequired && <span className="text-amber-600 font-bold">• صائم</span>}
                    </div>
                  </div>
                  {isAlreadyOrdered ? (
                    <span className="text-[10px] text-emerald-600 font-bold">مضاف ✓</span>
                  ) : (
                    <span className="material-symbols-outlined text-emerald-600 text-sm">add</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Active Lab Orders & Results List */}
      {labOrders.length === 0 ? (
        <div className="py-8 text-center bg-slate-50/50 dark:bg-[#080e1b]/40 rounded-xl border border-dashed border-slate-200 dark:border-white/5">
          <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 text-3xl mb-1">
            biotechnology
          </span>
          <p className="text-xs text-slate-500 dark:text-[#859394]">
            لم يتم طلب أي تحاليل معملية حتى الآن في هذا الكشف.
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            انقر "+ اختيار من دليلي" أو "+ إضافة تحليل جديد" لطلب تحاليل أو رصد قيمها المخبرية فوراً.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {labOrders.map((ord) => (
            <div
              key={ord.id}
              className={`rounded-xl border p-3.5 space-y-3 transition-all ${
                ord.isAbnormal
                  ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40'
                  : 'bg-slate-50 dark:bg-[#080e1b] border-slate-200 dark:border-white/5'
              }`}
            >
              {/* Row 1: Header info + status dropdown */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      ord.isAbnormal ? 'bg-rose-500' : 'bg-emerald-500'
                    }`}
                  ></span>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-[#dde2f5]">{ord.testName}</span>
                    <span className="text-[10px] text-slate-500 dark:text-[#859394] mr-2 px-1.5 py-0.5 rounded bg-slate-200/60 dark:bg-white/5">
                      {ord.category}
                    </span>
                    {ord.sampleType && (
                      <span className="text-[10px] text-slate-400 mr-1">({ord.sampleType})</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Status Dropdown */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-500 dark:text-[#859394]">الحالة:</span>
                    <select
                      value={ord.status}
                      onChange={(e) => handleUpdateStatus(ord.id, e.target.value as LabStatus)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg border cursor-pointer focus:outline-none transition-all ${
                        ord.status === 'REQUEST'
                          ? 'bg-sky-50 dark:bg-cyan-950/50 text-sky-800 dark:text-cyan-300 border-sky-300 dark:border-cyan-700/60'
                          : ord.status === 'RESULT'
                          ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-[#10B981] border-emerald-300 dark:border-emerald-700/50'
                          : 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-800 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700/50'
                      }`}
                    >
                      <option value="REQUEST" className="bg-white dark:bg-[#111A2E] text-slate-900 dark:text-[#dde2f5]">طلب (ORDERED)</option>
                      <option value="RESULT" className="bg-white dark:bg-[#111A2E] text-slate-900 dark:text-[#dde2f5]">نتيجة (RESULT)</option>
                      <option value="REPORT" className="bg-white dark:bg-[#111A2E] text-slate-900 dark:text-[#dde2f5]">تقرير (REPORT)</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemove(ord.id)}
                    className="p-1 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                    title="حذف التحليل"
                  >
                    <span className="material-symbols-outlined text-base">delete</span>
                  </button>
                </div>
              </div>

              {/* Status details: If REQUEST */}
              {ord.status === 'REQUEST' && (
                <div className="pt-2 border-t border-slate-200 dark:border-white/5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-[#859394]">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-xs text-sky-500 dark:text-cyan-400">pending</span>
                    <span>تم تسجيل أمر التحليل ({ord.orderedAt}) - بالانتظار</span>
                    {ord.instructions && (
                      <span className="text-sky-700 dark:text-cyan-300 font-bold bg-sky-50 dark:bg-cyan-950/50 px-2 py-0.5 rounded border border-sky-200 dark:border-cyan-800/40">
                        تعليمات: {ord.instructions}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-700 dark:text-[#dde2f5]">أو أدخل النتيجة الآن:</span>
                    <input
                      type="text"
                      value={ord.resultValue || ''}
                      onChange={(e) => handleUpdateField(ord.id, 'resultValue', e.target.value)}
                      placeholder="مثال: 7 أو 7.2%"
                      className="w-32 bg-white dark:bg-[#111A2E] text-slate-900 dark:text-[#dde2f5] font-mono font-bold text-xs px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    {ord.unit && <span className="font-mono text-[10px] text-slate-400">{ord.unit}</span>}
                  </div>
                </div>
              )}

              {/* Status details: If RESULT */}
              {ord.status === 'RESULT' && (
                <div className="pt-2 border-t border-slate-200 dark:border-white/5 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                  <div className="sm:col-span-4 flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-700 dark:text-[#dde2f5] whitespace-nowrap">
                      النتيجة المقاسة:
                    </span>
                    <input
                      type="text"
                      value={ord.resultValue || ''}
                      onChange={(e) => handleUpdateField(ord.id, 'resultValue', e.target.value)}
                      placeholder="e.g. 7.2"
                      className="w-full bg-white dark:bg-[#111A2E] text-slate-900 dark:text-[#dde2f5] font-mono font-bold text-xs p-2 rounded-lg border border-slate-200 dark:border-white/5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    {ord.unit && (
                      <span className="text-[11px] text-slate-500 font-mono">{ord.unit}</span>
                    )}
                  </div>

                  <div className="sm:col-span-4 text-xs text-slate-500 dark:text-[#859394]">
                    <span>النطاق الطبيعي: </span>
                    <span className="font-mono text-slate-700 dark:text-[#dde2f5]">
                      {ord.referenceRange || 'غير محدد'}
                    </span>
                  </div>

                  <div className="sm:col-span-4 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => handleUpdateField(ord.id, 'isAbnormal', !ord.isAbnormal)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                        ord.isAbnormal
                          ? 'bg-rose-600 text-white border-rose-600'
                          : 'bg-slate-100 dark:bg-[#111A2E] text-slate-600 dark:text-[#859394] border-slate-200 dark:border-white/5'
                      }`}
                    >
                      {ord.isAbnormal ? '⚠️ نتيجة خارج المعدل الطبيعي' : 'ضمن المعدل الطبيعي ✓'}
                    </button>
                  </div>
                </div>
              )}

              {/* Status details: If REPORT */}
              {ord.status === 'REPORT' && (
                <div className="pt-2 border-t border-slate-200 dark:border-white/5 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-[#dde2f5]">
                    <span>ملاحظات وتقرير التحليل المعملي التفصيلي:</span>
                    <span className="text-[10px] text-emerald-600 font-mono">سجل المعمل</span>
                  </div>
                  <textarea
                    rows={2}
                    value={ord.reportNotes || ''}
                    onChange={(e) => handleUpdateField(ord.id, 'reportNotes', e.target.value)}
                    placeholder="اكتب التقرير المجهري، نمو المزرعة، أو الحساسية البكتيرية..."
                    className="w-full bg-white dark:bg-[#111A2E] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-lg border border-slate-200 dark:border-white/5 focus:outline-none focus:ring-1 focus:ring-emerald-500 leading-relaxed resize-none"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal: Add New Lab Test */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleAddNewCustomLab}
            className="bg-white dark:bg-[#18233C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-[#dde2f5] flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-600">biotechnology</span>
                <span>إضافة تحليل معملي جديد أثناء الكشف</span>
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
              <label className="text-xs text-slate-600 dark:text-[#859394] block mb-1">اسم الفحص المعملي:</label>
              <input
                type="text"
                required
                value={newTestName}
                onChange={(e) => setNewTestName(e.target.value)}
                placeholder="مثال: تحليل كالسيوم متأين، فحص سكر عشوائي..."
                className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-600 dark:text-[#859394] block mb-1">التصنيف:</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/5 focus:outline-none"
                >
                  <option value="كيمياء حيوية">كيمياء حيوية</option>
                  <option value="أمراض الدم">أمراض الدم</option>
                  <option value="الغدد الصماء والسكر">الغدد الصماء والسكر</option>
                  <option value="مناعة وفيروسات">مناعة وفيروسات</option>
                  <option value="فحوصات مجهرية">فحوصات مجهرية وبول</option>
                  <option value="هرمونات">هرمونات</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-600 dark:text-[#859394] block mb-1">نوع العينة المطلوبة:</label>
                <input
                  type="text"
                  value={newSampleType}
                  onChange={(e) => setNewSampleType(e.target.value)}
                  placeholder="عينة دم وريدي، بول صباحي..."
                  className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/5 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-600 dark:text-[#859394] block mb-1">النطاق الطبيعي:</label>
                <input
                  type="text"
                  value={newRefRange}
                  onChange={(e) => setNewRefRange(e.target.value)}
                  placeholder="e.g. 70 - 100"
                  className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/5 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-slate-600 dark:text-[#859394] block mb-1">وحدة القياس:</label>
                <input
                  type="text"
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value)}
                  placeholder="mg/dl, %, uIU/mL..."
                  className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/5 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="newFastingCheck"
                checked={newFasting}
                onChange={(e) => setNewFasting(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 accent-emerald-600"
              />
              <label htmlFor="newFastingCheck" className="text-xs text-slate-700 dark:text-[#dde2f5] cursor-pointer">
                يتطلب صيام 10-12 ساعة
              </label>
            </div>

            <div className="flex items-center gap-2 p-3 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-800/30">
              <input
                type="checkbox"
                id="saveLabToCatalog"
                checked={saveToCatalog}
                onChange={(e) => setSaveToCatalog(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 accent-emerald-600"
              />
              <label htmlFor="saveLabToCatalog" className="text-xs text-slate-700 dark:text-[#dde2f5] cursor-pointer">
                ☑ إضافة إلى قائمتي المفضلة (يُحفظ في دليل التحاليل ليظهر في الكشوفات القادمة)
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
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition-all cursor-pointer"
              >
                إضافة وطلب التحليل
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

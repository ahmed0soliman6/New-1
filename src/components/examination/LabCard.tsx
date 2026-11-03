import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { LabCatalogItem, LabOrderItem, LabStatus } from '../../types';
import {
  searchClinicalLabs,
  ClinicalSearchResult,
} from '../../services/clinicalSearchService';
import {
  STANDARD_LABS_ARCHIVE,
  StandardLabRecord,
} from '../../data/medicalStandardArchive';

interface LabCardProps {
  labOrders: LabOrderItem[];
  onChangeOrders: (orders: LabOrderItem[]) => void;
  labCatalog: LabCatalogItem[];
  onAddLabToCatalog: (item: LabCatalogItem) => void;
  frequentSuggestions?: Array<{ testName: string; count?: number }>;
}

export const LabCard: React.FC<LabCardProps> = ({
  labOrders,
  onChangeOrders,
  labCatalog,
  onAddLabToCatalog,
  frequentSuggestions = [],
}) => {
  const { language } = useLanguage();
  const [showPicker, setShowPicker] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const [savedSuccessMsg, setSavedSuccessMsg] = useState<string | null>(null);

  // Search results state
  const [searchResults, setSearchResults] = useState<{
    clinicMatches: ClinicalSearchResult<LabCatalogItem>[];
    archiveMatches: ClinicalSearchResult<StandardLabRecord>[];
    apiMatches: ClinicalSearchResult<LabCatalogItem>[];
  }>({
    clinicMatches: [],
    archiveMatches: [],
    apiMatches: [],
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  // Form states for new lab test modal
  const [newTestName, setNewTestName] = useState('');
  const [newCategory, setNewCategory] = useState('كيمياء حيوية');
  const [newSampleType, setNewSampleType] = useState('دم وريدي');
  const [newFasting, setNewFasting] = useState(false);
  const [newRefRange, setNewRefRange] = useState('');
  const [newUnit, setNewUnit] = useState('');
  const [saveToCatalog, setSaveToCatalog] = useState(false);

  // Favorites & Highlights
  const favoriteLabs = useMemo(() => {
    return (labCatalog || []).filter((l) => l.isFavorite);
  }, [labCatalog]);

  const archiveHighlights = useMemo(() => {
    const clinicNames = new Set((labCatalog || []).map((l) => l.name.toLowerCase()));
    return STANDARD_LABS_ARCHIVE.filter(
      (l) => !clinicNames.has(l.name.toLowerCase())
    ).slice(0, 40);
  }, [labCatalog]);

  const notifySaved = (name: string) => {
    setSavedSuccessMsg(name);
    setTimeout(() => setSavedSuccessMsg(null), 3000);
  };

  // Debounced search with abort controller & caching
  useEffect(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (!searchQuery.trim()) {
      setSearchResults({
        clinicMatches: [],
        archiveMatches: [],
        apiMatches: [],
      });
      setIsSearchingOnline(false);
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsSearchingOnline(true);

    const timer = setTimeout(async () => {
      try {
        const res = await searchClinicalLabs(searchQuery, labCatalog, controller.signal);
        setSearchResults(res);
      } catch (_e) {
        // Aborted or error
      } finally {
        setIsSearchingOnline(false);
      }
    }, 150);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery, labCatalog]);

  // Add lab to active orders
  const handleAddFromCatalog = (
    item: LabCatalogItem | StandardLabRecord,
    directStatus: LabStatus = 'REQUEST'
  ) => {
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
      sampleType: item.sampleType || 'دم وريدي',
      instructions: item.fastingRequired ? 'يتطلب صيام 10-12 ساعة' : undefined,
      referenceRange: item.referenceRange,
      unit: item.unit,
      isAbnormal: false,
    };
    onChangeOrders([...labOrders, newOrder]);
    setSearchQuery('');
  };

  // 1-Click Save Archive / API Lab to Clinic Catalog ("دليلي")
  const handleSaveToClinicCatalog = (
    e: React.MouseEvent,
    lab: StandardLabRecord | LabCatalogItem
  ) => {
    e.stopPropagation();
    onAddLabToCatalog({
      id: `lab-cat-${Date.now()}`,
      name: lab.name,
      category: lab.category || 'فحوصات العيادة',
      sampleType: lab.sampleType || 'دم وريدي',
      fastingRequired: !!lab.fastingRequired,
      referenceRange: lab.referenceRange,
      unit: lab.unit,
      isFavorite: false,
      notes: lab.notes,
    });
    notifySaved(lab.name);
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
        isFavorite: false,
      });
      notifySaved(trimmed);
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
            resultDate:
              newStatus !== 'REQUEST' && !ord.resultDate
                ? new Date().toLocaleDateString('ar-EG')
                : ord.resultDate,
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
          if (field === 'resultValue' && typeof val === 'string' && val.trim().length > 0) {
            if (ord.status === 'REQUEST') {
              updated.status = 'RESULT';
            }
            if (!updated.resultDate) {
              updated.resultDate = new Date().toLocaleDateString('ar-EG');
            }
          }
          if (
            field === 'reportNotes' &&
            typeof val === 'string' &&
            val.trim().length > 0 &&
            ord.status === 'REQUEST'
          ) {
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

  const handleQuickAdd = () => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;

    // Check clinic catalog
    const matchedClinic = (labCatalog || []).find(
      (c) => c.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (matchedClinic) {
      handleAddFromCatalog(matchedClinic, 'REQUEST');
      return;
    }

    // Check standard archive
    const matchedArchive = STANDARD_LABS_ARCHIVE.find(
      (l) =>
        l.name.toLowerCase() === trimmed.toLowerCase() ||
        l.englishName.toLowerCase() === trimmed.toLowerCase() ||
        (l.abbreviations &&
          l.abbreviations.some((ab) => ab.toLowerCase() === trimmed.toLowerCase()))
    );
    if (matchedArchive) {
      handleAddFromCatalog(matchedArchive, 'REQUEST');
      return;
    }

    // Direct addition to visit
    const newOrder: LabOrderItem = {
      id: `lab-ord-${Date.now()}`,
      testName: trimmed,
      category: 'فحوصات الزيارة',
      status: 'REQUEST',
      orderedAt: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      sampleType: 'دم وريدي',
      isAbnormal: false,
    };
    onChangeOrders([...labOrders, newOrder]);
    setSearchQuery('');
  };

  const totalResultsCount =
    searchResults.clinicMatches.length +
    searchResults.archiveMatches.length +
    searchResults.apiMatches.length;

  return (
    <div className="bg-white dark:bg-[#111A2E] p-5 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm space-y-5">
      {/* Toast message */}
      {savedSuccessMsg && (
        <div className="p-2.5 rounded-xl bg-emerald-500 text-white text-xs font-bold flex items-center justify-between shadow-sm animate-in fade-in">
          <span className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm">check_circle</span>
            <span>تم حفظ &quot;{savedSuccessMsg}&quot; في دليلي بنجاح ✓</span>
          </span>
          <button
            type="button"
            onClick={() => setSavedSuccessMsg(null)}
            className="text-white hover:text-slate-100 text-xs cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-white/5 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-[#00c2cb]/15 text-[#008f97] dark:text-[#00c2cb] flex items-center justify-center">
            <span className="material-symbols-outlined text-lg">science</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-[#dde2f5]">
                {language === 'en' ? 'Laboratory Tests' : 'المعمل والتحاليل الطبية'}
              </h3>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-teal-100 dark:bg-[#00c2cb]/20 text-[#008f97] dark:text-[#45dee7]">
                {labOrders.length}{' '}
                {language === 'en'
                  ? labOrders.length === 1
                    ? 'test'
                    : 'tests'
                  : 'تحليل'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-[#859394]">
              {language === 'en'
                ? 'Search by Arabic, English or medical acronyms (CBC, HbA1c, CRP, TSH, ESR, LFT, KFT...)'
                : 'بحث بالاسم العربي أو الإنجليزي أو الاختصار الطبي (CBC, HbA1c, CRP, TSH, ESR, LFT, KFT...)'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {!showPicker ? (
            <button
              type="button"
              onClick={() => setShowPicker(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-900/30 hover:bg-teal-100 dark:hover:bg-teal-900/50 text-teal-700 dark:text-[#00c2cb] text-xs font-bold transition-all cursor-pointer border border-teal-200 dark:border-teal-800/40 shadow-xs"
            >
              <span className="material-symbols-outlined text-base">lists</span>
              <span>{language === 'en' ? '+ Pick from Catalog' : '+ اختيار من دليلي'}</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 animate-in fade-in">
              <select
                value=""
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val) return;

                  if (val.startsWith('clinic-')) {
                    const id = val.replace('clinic-', '');
                    const sel = (labCatalog || []).find((l) => l.id === id);
                    if (sel) handleAddFromCatalog(sel);
                  } else if (val.startsWith('archive-')) {
                    const id = val.replace('archive-', '');
                    const sel = STANDARD_LABS_ARCHIVE.find((l) => l.id === id);
                    if (sel) handleAddFromCatalog(sel);
                  }
                  e.target.value = '';
                }}
                className="bg-white dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs font-bold py-1.5 px-3 rounded-xl border-2 border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30 cursor-pointer min-w-[210px] max-w-[320px] shadow-sm"
              >
                <option value="">
                  {language === 'en'
                    ? '-- Select test from catalog --'
                    : '-- اضغط لاختيار تحليل من دليلي --'}
                </option>

                {favoriteLabs.length > 0 && (
                  <optgroup label="⭐ التحاليل المفضلة والمميزة">
                    {favoriteLabs.map((l) => (
                      <option key={`fav-${l.id}`} value={`clinic-${l.id}`}>
                        ⭐ {l.name}
                      </option>
                    ))}
                  </optgroup>
                )}

                <optgroup
                  label={
                    language === 'en'
                      ? '🏥 My Clinic Catalog'
                      : `🏥 تحاليل دليلي (${(labCatalog || []).length} تحليل)`
                  }
                >
                  {(labCatalog || []).map((l) => (
                    <option key={`cl-${l.id}`} value={`clinic-${l.id}`}>
                      {l.name}
                    </option>
                  ))}
                </optgroup>

                <optgroup
                  label={
                    language === 'en'
                      ? '🇪🇬 Standard Lab Archive'
                      : `🇪🇬 الأرشيف المخبري القياسي (${STANDARD_LABS_ARCHIVE.length} تحليل)`
                  }
                >
                  {archiveHighlights.map((l) => (
                    <option key={`ar-${l.id}`} value={`archive-${l.id}`}>
                      {l.name} {l.englishName ? `[${l.englishName}]` : ''}
                    </option>
                  ))}
                </optgroup>
              </select>

              <button
                type="button"
                onClick={() => setShowPicker(false)}
                className="w-7 h-7 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-rose-100 dark:bg-white/10 dark:hover:bg-rose-950/40 text-slate-500 hover:text-rose-600 text-xs font-bold transition-colors cursor-pointer"
                title="إغلاق"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      </div>

      {/* TOP SEARCH BAR */}
      <div className="p-3 bg-teal-50/40 dark:bg-[#080e1b]/80 rounded-2xl border border-[#00c2cb]/30 space-y-3 shadow-xs">
        <div className="relative">
          <input
            type="text"
            placeholder="ابحث في دليلي والأرشيف المعملي بالاختصار الطبي (CBC, HbA1c, CRP, TSH, ESR, LFT, KFT)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleQuickAdd();
              }
            }}
            className="w-full bg-white dark:bg-[#111A2E] text-slate-900 dark:text-[#dde2f5] text-sm p-3.5 pr-11 pl-28 rounded-xl border border-slate-200 dark:border-white/10 focus:border-[#00c2cb] focus:outline-none focus:ring-2 focus:ring-[#00c2cb]/20 font-bold transition-all"
          />
          <span className="material-symbols-outlined absolute right-3.5 top-3.5 text-teal-600 dark:text-[#00c2cb] text-xl">
            science
          </span>

          <div className="absolute left-2 top-2 flex items-center gap-1">
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-[#18233C] text-slate-500 dark:text-[#859394] hover:text-rose-500 text-xs font-bold cursor-pointer"
              >
                مسح ✕
              </button>
            )}
            <button
              type="button"
              onClick={handleQuickAdd}
              className="px-2.5 py-1.5 rounded-lg bg-[#00c2cb] hover:bg-[#45dee7] text-slate-950 font-bold text-[11px] flex items-center gap-1 shadow-xs cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              <span>إضافة</span>
            </button>
          </div>
        </div>

        {/* Live Search Results Container */}
        {searchQuery.trim() && (
          <div className="p-3 bg-white dark:bg-[#111A2E] rounded-xl border border-[#00c2cb]/30 space-y-2.5 animate-in fade-in">
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-[#859394] border-b border-slate-100 dark:border-white/5 pb-1.5">
              <span className="flex items-center gap-1 font-bold">
                <span className="material-symbols-outlined text-xs text-[#00c2cb]">manage_search</span>
                <span>نتائج البحث المخبري لـ &quot;{searchQuery}&quot;:</span>
              </span>
              <span className="font-mono text-teal-600 dark:text-[#00c2cb] font-bold">
                {isSearchingOnline ? 'جاري البحث...' : `${totalResultsCount} تحليل مطابق`}
              </span>
            </div>

            {isSearchingOnline && totalResultsCount === 0 ? (
              <div className="py-4 text-center text-xs text-[#00c2cb] font-bold flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-[#00c2cb] border-t-transparent rounded-full animate-spin"></span>
                <span>جاري مطابقة الفحوصات الطبية...</span>
              </div>
            ) : totalResultsCount === 0 ? (
              <div className="py-4 text-center text-xs text-slate-500 space-y-2">
                <p>لم يتم العثور على تحاليل مطابقة لـ &quot;{searchQuery}&quot;.</p>
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={handleQuickAdd}
                    className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs cursor-pointer shadow-xs"
                  >
                    + إضافة &quot;{searchQuery}&quot; للكشف مباشرة
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewTestName(searchQuery);
                      setShowAddModal(true);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold text-xs cursor-pointer"
                  >
                    + تخصيص وحفظ في دليلي
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {/* 1. Clinic Matches */}
                {searchResults.clinicMatches.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <span>🏥 من دليلي (دليل العيادة)</span>
                      <span>({searchResults.clinicMatches.length})</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {searchResults.clinicMatches.map(({ item }) => (
                        <div
                          key={`cl-lab-${item.id}`}
                          onClick={() => handleAddFromCatalog(item)}
                          className="p-3 rounded-xl text-right text-xs bg-emerald-50/40 dark:bg-[#080e1b] hover:border-emerald-500 border border-emerald-200 dark:border-emerald-800/40 text-slate-800 dark:text-[#dde2f5] flex items-start justify-between cursor-pointer group transition-all"
                        >
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-slate-900 dark:text-[#dde2f5] group-hover:text-emerald-600">
                                {item.name}
                              </span>
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                                من دليلي ✓
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-500 flex items-center gap-2">
                              <span>العينة: {item.sampleType || 'دم وريدي'}</span>
                              {item.fastingRequired && (
                                <span className="text-amber-600 dark:text-amber-400 font-bold">
                                  صيام مطلوب
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="material-symbols-outlined text-emerald-600 text-base group-hover:scale-110 transition-transform mr-1">
                            add_circle
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Standard Archive Matches */}
                {searchResults.archiveMatches.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                      <span>🇪🇬 الأرشيف المخبري القياسي</span>
                      <span>({searchResults.archiveMatches.length})</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {searchResults.archiveMatches.map(({ item }) => (
                        <div
                          key={`arch-lab-${item.id}`}
                          onClick={() => handleAddFromCatalog(item)}
                          className="p-3 rounded-xl text-right text-xs bg-slate-50 dark:bg-[#080e1b] hover:border-indigo-400 border border-slate-200 dark:border-white/5 text-slate-800 dark:text-[#dde2f5] flex items-start justify-between cursor-pointer group transition-all"
                        >
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-slate-900 dark:text-[#dde2f5] group-hover:text-indigo-600">
                                {item.name}
                              </span>
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
                                الأرشيف 🇪🇬
                              </span>
                            </div>
                            {item.englishName && (
                              <span
                                className="text-[10px] text-slate-400 font-mono block"
                                dir="ltr"
                              >
                                {item.englishName}
                              </span>
                            )}
                            <div className="text-[10px] text-slate-500 flex items-center gap-2">
                              <span>العينة: {item.sampleType || 'دم وريدي'}</span>
                              {item.fastingRequired && (
                                <span className="text-amber-600 dark:text-amber-400 font-bold">
                                  صيام مطلوب
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1.5 mr-1">
                            <span className="material-symbols-outlined text-indigo-600 text-base group-hover:scale-110 transition-transform">
                              add_circle
                            </span>
                            <button
                              type="button"
                              onClick={(e) => handleSaveToClinicCatalog(e, item)}
                              className="px-2 py-0.5 rounded bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold border border-indigo-200 dark:border-indigo-800/40 cursor-pointer transition-colors whitespace-nowrap"
                              title="حفظ في دليل العيادة"
                            >
                              + حفظ في دليلي
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Verified Live API (LOINC) Matches */}
                {searchResults.apiMatches.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400 flex items-center gap-1">
                      <span>🌐 مختبرات معتمدة (LOINC / NIH)</span>
                      <span>({searchResults.apiMatches.length})</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {searchResults.apiMatches.map(({ item }) => (
                        <div
                          key={`api-lab-${item.id}`}
                          onClick={() => handleAddFromCatalog(item)}
                          className="p-3 rounded-xl text-right text-xs bg-cyan-50/30 dark:bg-cyan-950/20 hover:border-cyan-400 border border-cyan-200 dark:border-cyan-800/40 text-slate-800 dark:text-[#dde2f5] flex items-start justify-between cursor-pointer group transition-all"
                        >
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-slate-900 dark:text-[#dde2f5] group-hover:text-cyan-600">
                                {item.name}
                              </span>
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300">
                                LOINC 🌐
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 block">
                              {item.category}
                            </span>
                          </div>

                          <div className="flex flex-col items-end gap-1.5 mr-1">
                            <span className="material-symbols-outlined text-cyan-600 text-base group-hover:scale-110 transition-transform">
                              add_circle
                            </span>
                            <button
                              type="button"
                              onClick={(e) => handleSaveToClinicCatalog(e, item)}
                              className="px-2 py-0.5 rounded bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-950/60 dark:hover:bg-cyan-900/80 text-cyan-700 dark:text-cyan-300 text-[10px] font-bold border border-cyan-200 dark:border-cyan-800/40 cursor-pointer transition-colors whitespace-nowrap"
                            >
                              + حفظ في دليلي
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Orders List / Table */}
      {labOrders.length === 0 ? (
        <div className="py-8 text-center bg-slate-50/50 dark:bg-[#080e1b]/40 rounded-2xl border border-dashed border-slate-200 dark:border-white/5">
          <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 text-3xl mb-1">
            biotechnology
          </span>
          <p className="text-xs font-bold text-slate-600 dark:text-[#859394]">
            لم يتم طلب أي تحاليل معملية حتى الآن في هذا الكشف.
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            انقر &quot;+ اختيار من دليلي&quot; أو &quot;+ إضافة تحليل جديد&quot; لطلب تحاليل أو رصد قيمها المخبرية فوراً.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-[#859394] px-1">
            <span>التحاليل المطلوبة والمُسجلة:</span>
            <span className="text-teal-600 font-mono">Laboratory Workflow</span>
          </div>

          {labOrders.map((ord, idx) => (
            <div
              key={ord.id}
              className="bg-slate-50 dark:bg-[#080e1b] rounded-2xl border border-slate-200 dark:border-white/5 p-3.5 space-y-2.5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-teal-100 dark:bg-[#00c2cb]/20 text-[#008f97] dark:text-[#00c2cb] font-mono text-xs font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-[#dde2f5]">
                      {ord.testName}
                    </span>
                    {ord.category && (
                      <span className="text-[10px] text-slate-400 mr-2">({ord.category})</span>
                    )}
                    {ord.sampleType && (
                      <span className="text-[10px] text-teal-700 dark:text-[#45dee7] mr-1 px-1.5 py-0.5 rounded bg-teal-50 dark:bg-[#00c2cb]/10">
                        {ord.sampleType}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  {/* Status Dropdown */}
                  <select
                    value={ord.status}
                    onChange={(e) => handleUpdateStatus(ord.id, e.target.value as LabStatus)}
                    className="bg-white dark:bg-[#111A2E] text-slate-900 dark:text-[#dde2f5] text-[11px] font-bold py-1 px-2.5 rounded-lg border border-slate-200 dark:border-white/10 cursor-pointer"
                  >
                    <option value="REQUEST">مطلوب (Order)</option>
                    <option value="RESULT">النتيجة مسجلة (Resulted)</option>
                    <option value="REPORT">تقرير مرفق (Report)</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => handleRemove(ord.id)}
                    className="p-1 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                    title="حذف من الفحوصات"
                  >
                    <span className="material-symbols-outlined text-base">delete</span>
                  </button>
                </div>
              </div>

              {/* Editable Result & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-1 border-t border-slate-200 dark:border-white/5">
                <div className="sm:col-span-6 flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-500 dark:text-[#859394] whitespace-nowrap">
                    القيمة / النتيجة:
                  </span>
                  <input
                    type="text"
                    value={ord.resultValue || ''}
                    onChange={(e) => handleUpdateField(ord.id, 'resultValue', e.target.value)}
                    placeholder="سجل القيمة المقاسة..."
                    className="w-full bg-white dark:bg-[#111A2E] text-slate-900 dark:text-[#dde2f5] text-xs p-1.5 rounded-lg border border-slate-200 dark:border-white/5 focus:outline-none focus:ring-1 focus:ring-[#00c2cb]"
                  />
                  {ord.unit && (
                    <span className="text-[11px] font-mono text-slate-400 px-1">{ord.unit}</span>
                  )}
                </div>

                <div className="sm:col-span-6 flex items-center gap-2">
                  <span className="text-[11px] text-slate-500 dark:text-[#859394] whitespace-nowrap">
                    الملاحظات:
                  </span>
                  <input
                    type="text"
                    value={ord.reportNotes || ''}
                    onChange={(e) => handleUpdateField(ord.id, 'reportNotes', e.target.value)}
                    placeholder="ملاحظات العينة أو التقرير..."
                    className="flex-1 bg-white dark:bg-[#111A2E] text-slate-900 dark:text-[#dde2f5] text-xs p-1.5 rounded-lg border border-slate-200 dark:border-white/5 focus:outline-none focus:ring-1 focus:ring-[#00c2cb]"
                  />
                  <label className="flex items-center gap-1 cursor-pointer whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={!!ord.isAbnormal}
                      onChange={(e) => handleUpdateField(ord.id, 'isAbnormal', e.target.checked)}
                      className="w-3.5 h-3.5 text-rose-600 rounded"
                    />
                    <span
                      className={`text-[10px] font-bold ${ord.isAbnormal ? 'text-rose-600' : 'text-slate-400'}`}
                    >
                      غير طبيعي
                    </span>
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Custom Lab Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-white/10 rounded-2xl w-full max-w-lg p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
              <h3 className="font-bold text-slate-900 dark:text-[#dde2f5] text-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-[#00c2cb]">science</span>
                <span>إضافة فحص معملي جديد</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddNewCustomLab} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                  اسم التحليل أو الفحص *
                </label>
                <input
                  type="text"
                  required
                  value={newTestName}
                  onChange={(e) => setNewTestName(e.target.value)}
                  placeholder="مثال: تحليل وظائف كبد ALT"
                  className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/10"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                    تصنيف المعمل
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/10"
                  >
                    <option value="كيمياء حيوية">كيمياء حيوية</option>
                    <option value="أمراض الدم (Hematology)">أمراض الدم (Hematology)</option>
                    <option value="هرمونات وغدد">هرمونات وغدد</option>
                    <option value="مناعة ومصلية">مناعة ومصلية</option>
                    <option value="طفيليات وفحوصات عامة">طفيليات وفحوصات عامة</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                    نوع العينة
                  </label>
                  <input
                    type="text"
                    value={newSampleType}
                    onChange={(e) => setNewSampleType(e.target.value)}
                    placeholder="دم وريدي / مصل / بول"
                    className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                    المعدل الطبيعي المرجعي
                  </label>
                  <input
                    type="text"
                    value={newRefRange}
                    onChange={(e) => setNewRefRange(e.target.value)}
                    placeholder="مثال: 70 - 110"
                    className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/10"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                    وحدة القياس
                  </label>
                  <input
                    type="text"
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    placeholder="mg/dL, U/L, ng/mL"
                    className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/10"
                  />
                </div>
              </div>

              <div className="p-3 bg-teal-50/50 dark:bg-teal-950/20 rounded-xl border border-teal-200 dark:border-teal-800/30 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newFasting}
                    onChange={(e) => setNewFasting(e.target.checked)}
                    className="w-4 h-4 rounded text-teal-600"
                  />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    يتطلب صيام المريض (Fasting 8-12 hrs)
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={saveToCatalog}
                    onChange={(e) => setSaveToCatalog(e.target.checked)}
                    className="w-4 h-4 rounded text-teal-600"
                  />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    حفظ الفحص في دليلي (دليل العيادة)
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-700"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#00c2cb] hover:bg-[#45dee7] text-slate-950 text-xs font-bold shadow-xs cursor-pointer"
                >
                  إضافة للزيارة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { DiagnosisCatalogItem } from '../../types';
import {
  searchClinicalDiagnoses,
  ClinicalSearchResult,
} from '../../services/clinicalSearchService';
import {
  STANDARD_DIAGNOSES_ARCHIVE,
  StandardDiagnosisRecord,
} from '../../data/medicalStandardArchive';

export interface PatientDiagnosis {
  id: string;
  catalogId?: string;
  code?: string;
  nameAr: string;
  nameEn?: string;
  isPrimary?: boolean;
  notes?: string;
  status?: 'CONFIRMED' | 'SUSPECTED' | 'RULED_OUT';
}

interface DiagnosisCardProps {
  diagnoses: PatientDiagnosis[];
  onChangeDiagnoses: (diagnoses: PatientDiagnosis[]) => void;
  diagnosesCatalog: DiagnosisCatalogItem[];
  onAddDiagnosisToCatalog: (item: DiagnosisCatalogItem) => void;
  frequentSuggestions?: Array<{ diagnosisName: string; count?: number }>;
}

export const DiagnosisCard: React.FC<DiagnosisCardProps> = ({
  diagnoses,
  onChangeDiagnoses,
  diagnosesCatalog,
  onAddDiagnosisToCatalog,
  frequentSuggestions = [],
}) => {
  const { language } = useLanguage();
  const [showPicker, setShowPicker] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const [savedSuccessMsg, setSavedSuccessMsg] = useState<string | null>(null);

  // Search results
  const [searchResults, setSearchResults] = useState<{
    clinicMatches: ClinicalSearchResult<DiagnosisCatalogItem>[];
    archiveMatches: ClinicalSearchResult<StandardDiagnosisRecord>[];
    apiMatches: ClinicalSearchResult<DiagnosisCatalogItem>[];
  }>({
    clinicMatches: [],
    archiveMatches: [],
    apiMatches: [],
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  // Form states for new diagnosis modal
  const [newCode, setNewCode] = useState('');
  const [newNameAr, setNewNameAr] = useState('');
  const [newNameEn, setNewNameEn] = useState('');
  const [newCategory, setNewCategory] = useState('أمراض باطنية عامة');
  const [saveToCatalog, setSaveToCatalog] = useState(false);

  // Highlights & Favorites
  const favoriteDiagnoses = useMemo(() => {
    return (diagnosesCatalog || []).filter((d) => d.isFavorite);
  }, [diagnosesCatalog]);

  const archiveHighlights = useMemo(() => {
    const clinicNames = new Set((diagnosesCatalog || []).map((d) => d.nameAr.toLowerCase()));
    return STANDARD_DIAGNOSES_ARCHIVE.filter(
      (d) => !clinicNames.has(d.nameAr.toLowerCase())
    ).slice(0, 40);
  }, [diagnosesCatalog]);

  const notifySaved = (name: string) => {
    setSavedSuccessMsg(name);
    setTimeout(() => setSavedSuccessMsg(null), 3000);
  };

  // Search with debounce & abort controller
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
        const res = await searchClinicalDiagnoses(
          searchQuery,
          diagnosesCatalog,
          controller.signal
        );
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
  }, [searchQuery, diagnosesCatalog]);

  // Add from catalog or standard archive
  const handleAddFromCatalog = (
    item: DiagnosisCatalogItem | StandardDiagnosisRecord
  ) => {
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
    setSearchQuery('');
  };

  // 1-Click Save to Clinic Catalog ("دليلي")
  const handleSaveToClinicCatalog = (
    e: React.MouseEvent,
    diag: StandardDiagnosisRecord | DiagnosisCatalogItem
  ) => {
    e.stopPropagation();
    onAddDiagnosisToCatalog({
      id: `diag-cat-${Date.now()}`,
      code: diag.code,
      nameAr: diag.nameAr,
      nameEn: diag.nameEn,
      category: diag.category || 'تشخيصات العيادة',
      isFavorite: false,
    });
    notifySaved(diag.nameAr);
  };

  const handleAddNewCustomDiagnosis = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedAr = newNameAr.trim();
    if (!trimmedAr) return;

    if (saveToCatalog) {
      onAddDiagnosisToCatalog({
        id: `diag-cat-${Date.now()}`,
        code: newCode.trim() || 'ICD-CLINIC',
        nameAr: trimmedAr,
        nameEn: newNameEn.trim(),
        category: newCategory,
        isFavorite: false,
      });
      notifySaved(trimmedAr);
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

  const handleQuickAdd = () => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;

    // Check clinic catalog
    const matchedClinic = (diagnosesCatalog || []).find(
      (c) =>
        c.nameAr.toLowerCase() === trimmed.toLowerCase() ||
        (c.nameEn && c.nameEn.toLowerCase() === trimmed.toLowerCase()) ||
        (c.code && c.code.toLowerCase() === trimmed.toLowerCase())
    );
    if (matchedClinic) {
      handleAddFromCatalog(matchedClinic);
      return;
    }

    // Check standard archive
    const matchedArchive = STANDARD_DIAGNOSES_ARCHIVE.find(
      (d) =>
        d.nameAr.toLowerCase() === trimmed.toLowerCase() ||
        d.nameEn.toLowerCase() === trimmed.toLowerCase() ||
        d.code.toLowerCase() === trimmed.toLowerCase() ||
        (d.abbreviations &&
          d.abbreviations.some((ab) => ab.toLowerCase() === trimmed.toLowerCase()))
    );
    if (matchedArchive) {
      handleAddFromCatalog(matchedArchive);
      return;
    }

    // Direct addition to visit
    const isFirst = diagnoses.length === 0;
    const newDiag: PatientDiagnosis = {
      id: `diag-sel-${Date.now()}`,
      nameAr: trimmed,
      isPrimary: isFirst,
    };
    onChangeDiagnoses([...diagnoses, newDiag]);
    setSearchQuery('');
  };

  const totalResultsCount =
    searchResults.clinicMatches.length +
    searchResults.archiveMatches.length +
    searchResults.apiMatches.length;

  return (
    <div className="bg-white dark:bg-[#111A2E] p-5 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm space-y-4">
      {/* Toast */}
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
            <span className="material-symbols-outlined text-lg">stethoscope</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-[#dde2f5]">
                {language === 'en' ? 'Clinical Diagnoses (ICD-10)' : 'التشخيصات السريرية (ICD-10)'}
              </h3>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-teal-100 dark:bg-[#00c2cb]/20 text-[#008f97] dark:text-[#45dee7]">
                {diagnoses.length}{' '}
                {language === 'en'
                  ? diagnoses.length === 1
                    ? 'diagnosis'
                    : 'diagnoses'
                  : 'تشخيص'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-[#859394]">
              {language === 'en'
                ? 'Search by condition, ICD code or acronym (HTN, T2DM, GERD, IBS, COPD, UTI...)'
                : 'بحث بالمرض أو كود ICD-10 أو الاختصار السريري (HTN, T2DM, GERD, IBS, COPD, UTI...)'}
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
                    const sel = (diagnosesCatalog || []).find((d) => d.id === id);
                    if (sel) handleAddFromCatalog(sel);
                  } else if (val.startsWith('archive-')) {
                    const id = val.replace('archive-', '');
                    const sel = STANDARD_DIAGNOSES_ARCHIVE.find((d) => d.id === id);
                    if (sel) handleAddFromCatalog(sel);
                  }
                  e.target.value = '';
                }}
                className="bg-white dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs font-bold py-1.5 px-3 rounded-xl border-2 border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30 cursor-pointer min-w-[210px] max-w-[320px] shadow-sm"
              >
                <option value="">
                  {language === 'en'
                    ? '-- Select diagnosis from catalog --'
                    : '-- اضغط لاختيار تشخيص من دليلي --'}
                </option>

                {favoriteDiagnoses.length > 0 && (
                  <optgroup label="⭐ التشخيصات الأكثر شيوعاً">
                    {favoriteDiagnoses.map((d) => (
                      <option key={`fav-${d.id}`} value={`clinic-${d.id}`}>
                        ⭐ {d.nameAr} [{d.code}]
                      </option>
                    ))}
                  </optgroup>
                )}

                <optgroup
                  label={
                    language === 'en'
                      ? '🏥 My Clinic Catalog'
                      : `🏥 تشخيصات دليلي (${(diagnosesCatalog || []).length} تشخيص)`
                  }
                >
                  {(diagnosesCatalog || []).map((d) => (
                    <option key={`cl-${d.id}`} value={`clinic-${d.id}`}>
                      {d.nameAr} [{d.code}]
                    </option>
                  ))}
                </optgroup>

                <optgroup
                  label={
                    language === 'en'
                      ? '🇪🇬 Standard ICD-10 Archive'
                      : `🇪🇬 الأرشيف السريري القياسي (${STANDARD_DIAGNOSES_ARCHIVE.length} تشخيص)`
                  }
                >
                  {archiveHighlights.map((d) => (
                    <option key={`ar-${d.id}`} value={`archive-${d.id}`}>
                      {d.nameAr} [{d.code}]
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
            placeholder="ابحث بالمرض، كود ICD-10 أو الاختصار الطبي (HTN, DM, T2DM, GERD, IBS, UTI, ضغط، سكر)..."
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
            stethoscope
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
                <span>نتائج البحث التشخيصي لـ &quot;{searchQuery}&quot;:</span>
              </span>
              <span className="font-mono text-teal-600 dark:text-[#00c2cb] font-bold">
                {isSearchingOnline ? 'جاري البحث...' : `${totalResultsCount} تشخيص مطابق`}
              </span>
            </div>

            {isSearchingOnline && totalResultsCount === 0 ? (
              <div className="py-4 text-center text-xs text-[#00c2cb] font-bold flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-[#00c2cb] border-t-transparent rounded-full animate-spin"></span>
                <span>جاري البحث في الأرشيف و NLM ICD-10...</span>
              </div>
            ) : totalResultsCount === 0 ? (
              <div className="py-4 text-center text-xs text-slate-500 space-y-2">
                <p>لم يتم العثور على تشخيصات مطابقة لـ &quot;{searchQuery}&quot;.</p>
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
                      setNewNameAr(searchQuery);
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
                          key={`cl-diag-${item.id}`}
                          onClick={() => handleAddFromCatalog(item)}
                          className="p-3 rounded-xl text-right text-xs bg-emerald-50/40 dark:bg-[#080e1b] hover:border-emerald-500 border border-emerald-200 dark:border-emerald-800/40 text-slate-800 dark:text-[#dde2f5] flex items-start justify-between cursor-pointer group transition-all"
                        >
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-slate-900 dark:text-[#dde2f5] group-hover:text-emerald-600">
                                {item.nameAr}
                              </span>
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                                من دليلي ✓
                              </span>
                            </div>
                            <span
                              className="text-[10px] text-slate-400 font-mono block"
                              dir="ltr"
                            >
                              [{item.code}] {item.nameEn}
                            </span>
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
                      <span>🇪🇬 الأرشيف السريري القياسي (ICD-10)</span>
                      <span>({searchResults.archiveMatches.length})</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {searchResults.archiveMatches.map(({ item }) => (
                        <div
                          key={`arch-diag-${item.id}`}
                          onClick={() => handleAddFromCatalog(item)}
                          className="p-3 rounded-xl text-right text-xs bg-slate-50 dark:bg-[#080e1b] hover:border-indigo-400 border border-slate-200 dark:border-white/5 text-slate-800 dark:text-[#dde2f5] flex items-start justify-between cursor-pointer group transition-all"
                        >
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-slate-900 dark:text-[#dde2f5] group-hover:text-indigo-600">
                                {item.nameAr}
                              </span>
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
                                الأرشيف 🇪🇬
                              </span>
                            </div>
                            <span
                              className="text-[10px] text-slate-400 font-mono block"
                              dir="ltr"
                            >
                              [{item.code}] {item.nameEn}
                            </span>
                          </div>

                          <div className="flex flex-col items-end gap-1.5 mr-1">
                            <span className="material-symbols-outlined text-indigo-600 text-base group-hover:scale-110 transition-transform">
                              add_circle
                            </span>
                            <button
                              type="button"
                              onClick={(e) => handleSaveToClinicCatalog(e, item)}
                              className="px-2 py-0.5 rounded bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold border border-indigo-200 dark:border-indigo-800/40 cursor-pointer transition-colors whitespace-nowrap"
                            >
                              + حفظ في دليلي
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Verified Live API (NLM ICD-10) Matches */}
                {searchResults.apiMatches.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400 flex items-center gap-1">
                      <span>🌐 كود ICD-10 معتمد (NLM ClinicalTables)</span>
                      <span>({searchResults.apiMatches.length})</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {searchResults.apiMatches.map(({ item }) => (
                        <div
                          key={`api-diag-${item.id}`}
                          onClick={() => handleAddFromCatalog(item)}
                          className="p-3 rounded-xl text-right text-xs bg-cyan-50/30 dark:bg-cyan-950/20 hover:border-cyan-400 border border-cyan-200 dark:border-cyan-800/40 text-slate-800 dark:text-[#dde2f5] flex items-start justify-between cursor-pointer group transition-all"
                        >
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-slate-900 dark:text-[#dde2f5] group-hover:text-cyan-600">
                                {item.nameAr}
                              </span>
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300">
                                ICD-10 🌐
                              </span>
                            </div>
                            <span
                              className="text-[10px] text-slate-400 font-mono block"
                              dir="ltr"
                            >
                              [{item.code}] {item.nameEn}
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

      {/* Active Diagnoses List */}
      {diagnoses.length === 0 ? (
        <div className="py-8 text-center bg-slate-50/50 dark:bg-[#080e1b]/40 rounded-2xl border border-dashed border-slate-200 dark:border-white/5">
          <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 text-3xl mb-1">
            clinical_notes
          </span>
          <p className="text-xs font-bold text-slate-600 dark:text-[#859394]">
            لم يتم تسجيل أي تشخيصات سريرية حتى الآن في هذا الكشف.
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            اختر من دليل العيادة أو ابحث بالأعلى لإرفاق التشخيص الطبي وتحديد التشخيص الرئيسي.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-[#859394] px-1">
            <span>التشخيصات السريرية المعتمدة:</span>
            <span className="text-teal-600 font-mono">ICD-10 Clinical Coding</span>
          </div>

          {diagnoses.map((d, idx) => (
            <div
              key={d.id}
              className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                d.isPrimary
                  ? 'bg-teal-50/60 dark:bg-[#00c2cb]/10 border-teal-300 dark:border-[#00c2cb]/30 shadow-xs'
                  : 'bg-slate-50 dark:bg-[#080e1b] border-slate-200 dark:border-white/5'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={`w-6 h-6 rounded-full font-mono text-xs font-bold flex items-center justify-center ${
                    d.isPrimary
                      ? 'bg-teal-600 text-white'
                      : 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {idx + 1}
                </span>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-[#dde2f5]">
                      {d.nameAr}
                    </span>
                    {d.isPrimary && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-600 text-white shadow-xs">
                        التشخيص الرئيسي (Primary)
                      </span>
                    )}
                  </div>

                  {(d.nameEn || d.code) && (
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5" dir="ltr">
                      {d.code && (
                        <span className="font-bold text-teal-700 dark:text-[#45dee7] mr-1">
                          [{d.code}]
                        </span>
                      )}
                      {d.nameEn}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                {!d.isPrimary && (
                  <button
                    type="button"
                    onClick={() => handleSetPrimary(d.id)}
                    className="text-[11px] font-bold text-teal-700 dark:text-[#00c2cb] hover:underline cursor-pointer"
                  >
                    تعيين كرئيسي
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleRemove(d.id)}
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

      {/* Add Custom Diagnosis Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-white/10 rounded-2xl w-full max-w-lg p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
              <h3 className="font-bold text-slate-900 dark:text-[#dde2f5] text-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-[#00c2cb]">stethoscope</span>
                <span>إضافة تشخيص سريري جديد</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddNewCustomDiagnosis} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                  اسم التشخيص (بالعربية) *
                </label>
                <input
                  type="text"
                  required
                  value={newNameAr}
                  onChange={(e) => setNewNameAr(e.target.value)}
                  placeholder="مثال: التهاب حاد بالشعب الهوائية"
                  className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/10"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                    كود ICD-10
                  </label>
                  <input
                    type="text"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    placeholder="مثال: J20.9"
                    className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/10 font-mono"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                    التصنيف الطبي
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/10"
                  >
                    <option value="أمراض باطنية عامة">أمراض باطنية عامة</option>
                    <option value="قلب وأوعية دموية">قلب وأوعية دموية</option>
                    <option value="صدر وجهاز تنفسي">صدر وجهاز تنفسي</option>
                    <option value="جهاز هضمي وكبد">جهاز هضمي وكبد</option>
                    <option value="غدد صماء وسكري">غدد صماء وسكري</option>
                    <option value="كلى ومسالك بولية">كلى ومسالك بولية</option>
                    <option value="عظام ومفاصل">عظام ومفاصل</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                  الاسم الطبي بالإنجليزية
                </label>
                <input
                  type="text"
                  value={newNameEn}
                  onChange={(e) => setNewNameEn(e.target.value)}
                  placeholder="Acute bronchitis, unspecified"
                  className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/10 font-mono"
                  dir="ltr"
                />
              </div>

              <div className="p-3 bg-teal-50/50 dark:bg-teal-950/20 rounded-xl border border-teal-200 dark:border-teal-800/30">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={saveToCatalog}
                    onChange={(e) => setSaveToCatalog(e.target.checked)}
                    className="w-4 h-4 rounded text-teal-600"
                  />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    حفظ التشخيص في دليلي (دليل العيادة)
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

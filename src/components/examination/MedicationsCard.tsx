import React, { useState, useTransition, useMemo, useEffect, useRef } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { DrugCatalogItem, PrescriptionItem } from '../../types';
import {
  searchClinicalDrugs,
  ClinicalSearchResult,
} from '../../services/clinicalSearchService';
import {
  STANDARD_DRUGS_ARCHIVE,
  StandardDrugRecord,
} from '../../data/medicalStandardArchive';

interface MedicationsCardProps {
  prescriptionItems: PrescriptionItem[];
  onChangePrescription: (items: PrescriptionItem[]) => void;
  drugCatalog: DrugCatalogItem[];
  onAddDrugToCatalog: (item: DrugCatalogItem) => void;
  onOpenPrescriptionPad?: () => void;
  onPrintPrescription?: () => void;
  frequentSuggestions?: Array<{
    drugName: string;
    strength?: string;
    dosageForm?: string;
    scientificName?: string;
    instructions?: string;
    count?: number;
  }>;
}

export const MedicationsCard: React.FC<MedicationsCardProps> = ({
  prescriptionItems,
  onChangePrescription,
  drugCatalog,
  onAddDrugToCatalog,
  onOpenPrescriptionPad,
  onPrintPrescription,
  frequentSuggestions = [],
}) => {
  const { language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [showPicker, setShowPicker] = useState(true);
  const [showAddCustomModal, setShowAddCustomModal] = useState(false);
  const [savedSuccessMsg, setSavedSuccessMsg] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Form for custom unlisted drug
  const [newBrandName, setNewBrandName] = useState('');
  const [newGenericName, setNewGenericName] = useState('');
  const [newStrength, setNewStrength] = useState('');
  const [newForm, setNewForm] = useState('أقراص (Tablets)');
  const [newDosage, setNewDosage] = useState('');
  const [newTiming, setNewTiming] = useState('بعد الأكل');
  const [newDuration, setNewDuration] = useState('لمدة 30 يوماً');
  const [newNotes, setNewNotes] = useState('');
  const [saveToFavorites, setSaveToFavorites] = useState(false);

  // Search results with live online API support
  const [searchResults, setSearchResults] = useState<{
    clinicMatches: ClinicalSearchResult<DrugCatalogItem>[];
    archiveMatches: ClinicalSearchResult<StandardDrugRecord>[];
    apiMatches: ClinicalSearchResult<StandardDrugRecord>[];
  }>({
    clinicMatches: [],
    archiveMatches: [],
    apiMatches: [],
  });
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

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
        const res = await searchClinicalDrugs(searchQuery, drugCatalog, controller.signal);
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
  }, [searchQuery, drugCatalog]);

  const favoriteDrugs = useMemo(() => {
    return drugCatalog.filter((d) => d.isFavorite);
  }, [drugCatalog]);

  const archiveHighlights = useMemo(() => {
    const clinicNames = new Set(drugCatalog.map((d) => d.brandName.toLowerCase()));
    return STANDARD_DRUGS_ARCHIVE.filter(
      (d) => !clinicNames.has(d.brandName.toLowerCase())
    ).slice(0, 40);
  }, [drugCatalog]);

  const notifySaved = (name: string) => {
    setSavedSuccessMsg(name);
    setTimeout(() => setSavedSuccessMsg(null), 3000);
  };

  // Add drug from catalog creating a decoupled SNAPSHOT into PrescriptionItem
  const handleAddFromCatalog = (drug: DrugCatalogItem | StandardDrugRecord) => {
    const snapshotItem: PrescriptionItem = {
      id: `rx-snap-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      drugName: drug.brandName,
      scientificName: drug.genericName,
      strength: drug.strength,
      dosageForm: drug.form,
      dosage: drug.defaultDosage || 'قرص واحد يومياً',
      timing: drug.defaultTiming || 'بعد الأكل',
      duration: drug.defaultDuration || 'لمدة شهر',
      notes: drug.notes || '',
    };

    onChangePrescription([...prescriptionItems, snapshotItem]);
    setSearchQuery('');
  };

  // 1-Click Save Archive Drug to Clinic Catalog ("دليلي")
  const handleSaveToClinicCatalog = (e: React.MouseEvent, drug: StandardDrugRecord) => {
    e.stopPropagation();
    onAddDrugToCatalog({
      id: `med-cat-${Date.now()}`,
      brandName: drug.brandName,
      genericName: drug.genericName,
      strength: drug.strength,
      form: drug.form,
      category: drug.category || 'أدوية العيادة',
      defaultDosage: drug.defaultDosage,
      defaultDuration: drug.defaultDuration,
      defaultTiming: drug.defaultTiming,
      isFavorite: false,
      notes: drug.notes,
    });
    notifySaved(drug.brandName);
  };

  // Add custom unlisted drug
  const handleAddCustomDrug = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedBrand = newBrandName.trim();
    if (!trimmedBrand) return;

    const fullBrandName = newStrength ? `${trimmedBrand} ${newStrength}`.trim() : trimmedBrand;

    if (saveToFavorites) {
      onAddDrugToCatalog({
        id: `med-cat-${Date.now()}`,
        brandName: fullBrandName,
        genericName: newGenericName.trim(),
        strength: newStrength.trim(),
        form: newForm,
        category: 'أدوية العيادة',
        defaultDosage: newDosage.trim() || 'قرص واحد يومياً',
        defaultDuration: newDuration.trim() || 'لمدة شهر',
        defaultTiming: newTiming.trim() || 'بعد الأكل',
        isFavorite: false,
        notes: newNotes.trim() || undefined,
      });
      notifySaved(fullBrandName);
    }

    const snapshotItem: PrescriptionItem = {
      id: `rx-snap-${Date.now()}`,
      drugName: fullBrandName,
      scientificName: newGenericName.trim() || undefined,
      strength: newStrength.trim() || undefined,
      dosageForm: newForm,
      dosage: newDosage.trim() || 'قرص واحد يومياً',
      timing: newTiming.trim() || 'بعد الأكل',
      duration: newDuration.trim() || 'لمدة 30 يوماً',
      notes: newNotes.trim() || undefined,
    };

    onChangePrescription([...prescriptionItems, snapshotItem]);

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

  // Quick Add via Enter or Add button
  const handleQuickAdd = () => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;

    // Check if query exactly matches any clinic or archive drug
    const matchedClinic = drugCatalog.find(
      (d) =>
        d.brandName.toLowerCase() === trimmed.toLowerCase() ||
        (d.genericName && d.genericName.toLowerCase() === trimmed.toLowerCase())
    );
    if (matchedClinic) {
      handleAddFromCatalog(matchedClinic);
      return;
    }

    const matchedArchive = STANDARD_DRUGS_ARCHIVE.find(
      (d) =>
        d.brandName.toLowerCase() === trimmed.toLowerCase() ||
        (d.arabicBrand && d.arabicBrand === trimmed) ||
        (d.genericName && d.genericName.toLowerCase() === trimmed.toLowerCase())
    );
    if (matchedArchive) {
      handleAddFromCatalog(matchedArchive);
      return;
    }

    // Direct addition to visit with option to save
    const snapshotItem: PrescriptionItem = {
      id: `rx-snap-${Date.now()}`,
      drugName: trimmed,
      dosage: 'قرص واحد يومياً أو حسب الإرشاد الطبي',
      timing: 'بعد الأكل',
      duration: 'لمدة شهر',
      notes: '',
    };
    onChangePrescription([...prescriptionItems, snapshotItem]);
    setSearchQuery('');
  };

  const totalResultsCount =
    searchResults.clinicMatches.length +
    searchResults.archiveMatches.length +
    (searchResults.apiMatches?.length || 0);

  return (
    <div className="bg-white dark:bg-[#111A2E] p-5 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm space-y-5">
      {/* Toast confirmation for saving to clinic catalog */}
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
            <span className="material-symbols-outlined text-lg">medication</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-[#dde2f5]">
                {language === 'en' ? 'Electronic Prescription (Rx)' : 'الروشتة الإلكترونية (Rx)'}
              </h3>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-teal-100 dark:bg-[#00c2cb]/20 text-[#008f97] dark:text-[#45dee7]">
                {prescriptionItems.length}{' '}
                {language === 'en'
                  ? prescriptionItems.length === 1
                    ? 'medication'
                    : 'medications'
                  : 'أدوية بالروشتة'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-[#859394]">
              {language === 'en'
                ? 'Specify trade name, strength, dosage and duration linked to examination file'
                : 'توصيف الدواء بالاسم التجاري والجرعة والمدة المرتبطة بملف الكشف'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onPrintPrescription && (
            <button
              type="button"
              onClick={onPrintPrescription}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
              title={language === 'en' ? 'Print prescription directly' : 'طباعة الروشتة مباشرة'}
            >
              <span className="material-symbols-outlined text-base">print</span>
              <span>{language === 'en' ? 'Print Prescription' : 'طباعة الروشتة'}</span>
            </button>
          )}

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
                    const sel = drugCatalog.find((d) => d.id === id);
                    if (sel) handleAddFromCatalog(sel);
                  } else if (val.startsWith('archive-')) {
                    const id = val.replace('archive-', '');
                    const sel = STANDARD_DRUGS_ARCHIVE.find((d) => d.id === id);
                    if (sel) handleAddFromCatalog(sel);
                  }
                  e.target.value = '';
                }}
                className="bg-white dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs font-bold py-1.5 px-3 rounded-xl border-2 border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30 cursor-pointer min-w-[220px] max-w-[340px] shadow-sm"
              >
                <option value="">
                  {language === 'en'
                    ? '-- Select medication from catalog --'
                    : '-- اضغط لاختيار دواء من دليلي --'}
                </option>

                {favoriteDrugs.length > 0 && (
                  <optgroup label={language === 'en' ? '⭐ Favorites' : '⭐ الأدوية المفضلة والمميزة'}>
                    {favoriteDrugs.map((d) => (
                      <option key={`fav-${d.id}`} value={`clinic-${d.id}`}>
                        ⭐ {d.brandName} {d.strength ? `(${d.strength})` : ''}
                      </option>
                    ))}
                  </optgroup>
                )}

                <optgroup
                  label={
                    language === 'en'
                      ? '🏥 My Clinic Catalog'
                      : `🏥 أدوية دليلي (${drugCatalog.length} دواء)`
                  }
                >
                  {drugCatalog.map((drug) => (
                    <option key={`cl-${drug.id}`} value={`clinic-${drug.id}`}>
                      {drug.brandName} {drug.strength ? `(${drug.strength})` : ''}
                    </option>
                  ))}
                </optgroup>

                <optgroup
                  label={
                    language === 'en'
                      ? '🇪🇬 Egyptian Drug Authority Archive'
                      : `🇪🇬 الأرشيف المصري القياسي (${STANDARD_DRUGS_ARCHIVE.length} دواء)`
                  }
                >
                  {archiveHighlights.map((drug) => (
                    <option key={`ar-${drug.id}`} value={`archive-${drug.id}`}>
                      {drug.brandName} {drug.arabicBrand ? `[${drug.arabicBrand}]` : ''}
                    </option>
                  ))}
                </optgroup>
              </select>

              <button
                type="button"
                onClick={() => setShowPicker(false)}
                className="w-7 h-7 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-rose-100 dark:bg-white/10 dark:hover:bg-rose-950/40 text-slate-500 hover:text-rose-600 text-xs font-bold transition-colors cursor-pointer"
                title={language === 'en' ? 'Close' : 'إغلاق'}
              >
                ✕
              </button>
            </div>
          )}
        </div>
      </div>

      {/* TOP SEARCH BAR */}
      <div className="p-3 bg-teal-50/40 dark:bg-[#080e1b]/80 rounded-2xl border border-[#00c2cb]/30 space-y-3 shadow-xs">
        <div className="relative flex items-center">
          <input
            type="text"
            placeholder={
              language === 'en'
                ? 'Search by trade or generic name (e.g. Concor, Panadol, Augmentin, Cataflam, Betaserc)...'
                : 'ابحث بالاسم التجاري أو العلمي أو بالعربية (مثل كونكور، بنادول، أوجمنتين، كتافلام، بيتاسيرك)...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleQuickAdd();
              }
            }}
            className={`w-full bg-white dark:bg-[#111A2E] text-slate-900 dark:text-[#dde2f5] text-sm p-3.5 rounded-xl border border-slate-200 dark:border-white/10 focus:border-[#00c2cb] focus:outline-none focus:ring-2 focus:ring-[#00c2cb]/20 font-bold transition-all ${
              language === 'en' ? 'pl-11 pr-28' : 'pr-11 pl-28'
            }`}
          />
          <span
            className={`material-symbols-outlined absolute ${
              language === 'en' ? 'left-3.5' : 'right-3.5'
            } text-teal-600 dark:text-[#00c2cb] text-xl pointer-events-none`}
          >
            medication
          </span>

          <div
            className={`absolute ${
              language === 'en' ? 'right-2' : 'left-2'
            } top-2 flex items-center gap-1`}
          >
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-[#18233C] text-slate-500 dark:text-[#859394] hover:text-rose-500 text-xs font-bold cursor-pointer"
              >
                {language === 'en' ? 'Clear ✕' : 'مسح ✕'}
              </button>
            )}
            <button
              type="button"
              onClick={handleQuickAdd}
              className="px-2.5 py-1.5 rounded-lg bg-[#00c2cb] hover:bg-[#45dee7] text-slate-950 font-bold text-[11px] flex items-center gap-1 shadow-xs cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              <span>{language === 'en' ? 'Add' : 'إضافة'}</span>
            </button>
          </div>
        </div>

        {/* Live Search Results Container */}
        {searchQuery.trim() && (
          <div className="p-3 bg-white dark:bg-[#111A2E] rounded-xl border border-[#00c2cb]/30 space-y-2.5 animate-in fade-in">
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-[#859394] border-b border-slate-100 dark:border-white/5 pb-1.5">
              <span className="flex items-center gap-1 font-bold">
                <span className="material-symbols-outlined text-xs text-[#00c2cb]">manage_search</span>
                <span>
                  {language === 'en'
                    ? `Results for "${searchQuery}":`
                    : `نتائج البحث في دليلي والأرشيف المصري لـ "${searchQuery}":`}
                </span>
              </span>
              <span className="font-mono text-teal-600 dark:text-[#00c2cb] font-bold">
                {isSearchingOnline
                  ? language === 'en'
                    ? 'Searching Egyptian Drug Archive...'
                    : 'جاري البحث في أرشيف الدواء...'
                  : `${totalResultsCount} ${
                      language === 'en'
                        ? totalResultsCount === 1
                          ? 'matching drug'
                          : 'matching drugs'
                        : 'دواء مطابق'
                    }`}
              </span>
            </div>

            {isSearchingOnline && totalResultsCount === 0 ? (
              <div className="py-4 text-center text-xs text-[#00c2cb] font-bold flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-[#00c2cb] border-t-transparent rounded-full animate-spin"></span>
                <span>
                  {language === 'en'
                    ? 'Searching Egyptian Drug Authority database...'
                    : 'جاري البحث في قاعدة بيانات الدواء المصري...'}
                </span>
              </div>
            ) : totalResultsCount === 0 ? (
              <div className="py-4 text-center text-xs text-slate-500 space-y-2">
                <p>
                  {language === 'en'
                    ? `No medications found matching "${searchQuery}".`
                    : `لم يتم العثور على أدوية مطابقة لـ "${searchQuery}".`}
                </p>
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={handleQuickAdd}
                    className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs cursor-pointer shadow-xs"
                  >
                    {language === 'en'
                      ? `+ Add "${searchQuery}" to prescription directly`
                      : `+ إضافة "${searchQuery}" للروشتة مباشرة`}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewBrandName(searchQuery);
                      setShowAddCustomModal(true);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold text-xs cursor-pointer"
                  >
                    {language === 'en'
                      ? '+ Customize & Save to Catalog'
                      : '+ تخصيص وحفظ في دليلي'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {/* 1. Clinic Matches */}
                {searchResults.clinicMatches.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <span>
                        {language === 'en'
                          ? '🏥 From My Catalog (Clinic)'
                          : '🏥 من دليلي (دليل العيادة)'}
                      </span>
                      <span>({searchResults.clinicMatches.length})</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {searchResults.clinicMatches.map(({ item }) => (
                        <div
                          key={`cl-res-${item.id}`}
                          onClick={() => handleAddFromCatalog(item)}
                          className="p-3 rounded-xl text-start text-xs bg-emerald-50/40 dark:bg-[#080e1b] hover:border-emerald-500 border border-emerald-200 dark:border-emerald-800/40 text-slate-800 dark:text-[#dde2f5] flex items-start justify-between cursor-pointer group transition-all"
                        >
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-slate-900 dark:text-[#dde2f5] group-hover:text-emerald-600">
                                {item.brandName}
                              </span>
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                                {language === 'en' ? 'In My Catalog ✓' : 'من دليلي ✓'}
                              </span>
                            </div>
                            {item.genericName && (
                              <span
                                className="text-[10px] text-slate-400 font-mono block"
                                dir="ltr"
                              >
                                {item.genericName}
                              </span>
                            )}
                            <span className="text-[10px] text-teal-600 dark:text-[#45dee7] block font-bold">
                              {item.defaultDosage || (language === 'en' ? '1 tablet daily' : 'قرص واحد يومياً')}
                            </span>
                          </div>
                          <span className="material-symbols-outlined text-emerald-600 text-base group-hover:scale-110 transition-transform ms-1">
                            add_circle
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Standard Egyptian Archive Matches */}
                {searchResults.archiveMatches.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                      <span>
                        {language === 'en'
                          ? '🇪🇬 Egyptian Drug Archive (EDA)'
                          : '🇪🇬 الأرشيف الطبي القياسي (هيئة الدواء المصرية)'}
                      </span>
                      <span>({searchResults.archiveMatches.length})</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {searchResults.archiveMatches.map(({ item }) => (
                        <div
                          key={`arch-res-${item.id}`}
                          onClick={() => handleAddFromCatalog(item)}
                          className="p-3 rounded-xl text-start text-xs bg-slate-50 dark:bg-[#080e1b] hover:border-indigo-400 border border-slate-200 dark:border-white/5 text-slate-800 dark:text-[#dde2f5] flex items-start justify-between cursor-pointer group transition-all"
                        >
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-slate-900 dark:text-[#dde2f5] group-hover:text-indigo-600">
                                {item.brandName}
                              </span>
                              {item.arabicBrand && (
                                <span className="text-[10px] text-slate-500 font-bold">
                                  ({item.arabicBrand})
                                </span>
                              )}
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
                                {language === 'en' ? 'Egyptian Archive 🇪🇬' : 'الأرشيف 🇪🇬'}
                              </span>
                            </div>
                            <span
                              className="text-[10px] text-slate-400 font-mono block"
                              dir="ltr"
                            >
                              {item.genericName}
                            </span>
                            <span className="text-[10px] text-teal-600 dark:text-[#45dee7] block font-bold">
                              {item.defaultDosage} • {item.form}
                            </span>
                          </div>

                          <div className="flex flex-col items-end gap-1.5 ms-1">
                            <span className="material-symbols-outlined text-indigo-600 text-base group-hover:scale-110 transition-transform">
                              add_circle
                            </span>
                            <button
                              type="button"
                              onClick={(e) => handleSaveToClinicCatalog(e, item)}
                              className="px-2 py-0.5 rounded bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold border border-indigo-200 dark:border-indigo-800/40 cursor-pointer transition-colors whitespace-nowrap"
                              title={language === 'en' ? 'Save to Clinic Catalog' : 'حفظ في دليل العيادة للاستدعاء الدائم السريع'}
                            >
                              {language === 'en' ? '+ Save to Catalog' : '+ حفظ في دليلي'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Verified Online API / RxNorm Matches */}
                {searchResults.apiMatches.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400 flex items-center gap-1">
                      <span>
                        {language === 'en'
                          ? '🌐 Standard Drug Database (RxNorm / NIH)'
                          : '🌐 الدليل الدوائي المعتمد (RxNorm)'}
                      </span>
                      <span>({searchResults.apiMatches.length})</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {searchResults.apiMatches.map(({ item }) => (
                        <div
                          key={`api-res-${item.id}`}
                          onClick={() => handleAddFromCatalog(item)}
                          className="p-3 rounded-xl text-start text-xs bg-cyan-50/30 dark:bg-cyan-950/20 hover:border-cyan-400 border border-cyan-200 dark:border-cyan-800/40 text-slate-800 dark:text-[#dde2f5] flex items-start justify-between cursor-pointer group transition-all"
                        >
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-slate-900 dark:text-[#dde2f5] group-hover:text-cyan-600">
                                {item.brandName}
                              </span>
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300">
                                RxNorm 🌐
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono block" dir="ltr">
                              {item.genericName}
                            </span>
                            <span className="text-[10px] text-teal-600 dark:text-[#45dee7] block font-bold">
                              {item.defaultDosage}
                            </span>
                          </div>

                          <div className="flex flex-col items-end gap-1.5 ms-1">
                            <span className="material-symbols-outlined text-cyan-600 text-base group-hover:scale-110 transition-transform">
                              add_circle
                            </span>
                            <button
                              type="button"
                              onClick={(e) => handleSaveToClinicCatalog(e, item)}
                              className="px-2 py-0.5 rounded bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-950/60 dark:hover:bg-cyan-900/80 text-cyan-700 dark:text-cyan-300 text-[10px] font-bold border border-cyan-200 dark:border-cyan-800/40 cursor-pointer transition-colors whitespace-nowrap"
                            >
                              {language === 'en' ? '+ Save to Catalog' : '+ حفظ في دليلي'}
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

      {/* Active Prescription Table (Snapshots) */}
      {prescriptionItems.length === 0 ? (
        <div className="py-8 text-center bg-slate-50/50 dark:bg-[#080e1b]/40 rounded-2xl border border-dashed border-slate-200 dark:border-white/5">
          <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 text-3xl mb-1">
            prescriptions
          </span>
          <p className="text-xs font-bold text-slate-600 dark:text-[#859394]">
            {language === 'en'
              ? 'No medications added to the prescription yet.'
              : 'لم يتم إضافة أدوية إلى قائمة الروشتة بعد.'}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {language === 'en'
              ? 'Use the comprehensive search box above to search clinic drugs and the Egyptian Drug Index.'
              : 'استخدم صندوق البحث الشامل بأعلى البطاقة للبحث في أدوية العيادة وأرشيف الدواء المصري.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3" data-no-translate="true">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-[#859394] px-1">
            <span>
              {language === 'en'
                ? 'Approved Prescription Medications:'
                : 'قائمة الأدوية المعتمدة بالروشتة:'}
            </span>
            <span className="text-teal-600 font-mono">Prescription Snapshot</span>
          </div>

          {prescriptionItems.map((item, idx) => (
            <div
              key={item.id}
              className="bg-slate-50 dark:bg-[#080e1b] rounded-2xl border border-slate-200 dark:border-white/5 p-3.5 space-y-2.5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-teal-100 dark:bg-[#00c2cb]/20 text-[#008f97] dark:text-[#00c2cb] font-mono text-xs font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <div className="clinical-data" data-no-translate="true">
                    <span
                      data-no-translate="true"
                      className="text-xs font-bold text-slate-900 dark:text-[#dde2f5] no-translate clinical-data"
                    >
                      {item.drugName}
                    </span>
                    {item.scientificName && (
                      <span
                        data-no-translate="true"
                        className="text-[10px] text-slate-400 mr-2 font-mono no-translate clinical-data"
                        dir="ltr"
                      >
                        ({item.scientificName})
                      </span>
                    )}
                    {item.dosageForm && (
                      <span
                        data-no-translate="true"
                        className="text-[10px] text-teal-700 dark:text-[#45dee7] mr-1 px-1.5 py-0.5 rounded bg-teal-50 dark:bg-[#00c2cb]/10 no-translate clinical-data"
                      >
                        {item.dosageForm}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemove(item.id)}
                  className="p-1 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer self-end sm:self-center"
                  title={language === 'en' ? 'Remove from prescription' : 'حذف من الروشتة'}
                >
                  <span className="material-symbols-outlined text-base">delete</span>
                </button>
              </div>

              {/* Editable Dosage & Duration Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-1 border-t border-slate-200 dark:border-white/5">
                <div className="sm:col-span-7 flex flex-col sm:flex-row items-start sm:items-center gap-1.5">
                  <span className="text-[11px] text-slate-500 dark:text-[#859394] whitespace-nowrap">
                    {language === 'en' ? 'Dosage:' : 'الجرعة:'}
                  </span>
                  <div className="flex-1 flex items-center gap-1 w-full">
                    <input
                      type="text"
                      value={item.dosage || ''}
                      onChange={(e) => handleUpdateSnapshotField(item.id, 'dosage', e.target.value)}
                      placeholder={
                        language === 'en'
                          ? 'Directions and timing...'
                          : 'طريقة الاستخدام وتوقيت الجرعة...'
                      }
                      className="w-full bg-white dark:bg-[#111A2E] text-slate-900 dark:text-[#dde2f5] text-xs p-1.5 rounded-lg border border-slate-200 dark:border-white/5 focus:outline-none focus:ring-1 focus:ring-[#00c2cb]"
                    />
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          handleUpdateSnapshotField(item.id, 'dosage', e.target.value);
                          e.target.value = '';
                        }
                      }}
                      defaultValue=""
                      className="bg-slate-100 dark:bg-[#18233C] text-slate-700 dark:text-[#dde2f5] text-[11px] p-1.5 rounded-lg border border-slate-200 dark:border-white/10 focus:outline-none cursor-pointer max-w-[130px]"
                    >
                      <option value="" disabled>
                        {language === 'en' ? 'Quick timing...' : 'اختر التوقيت...'}
                      </option>
                      <option value="كل 6 ساعات (4 مرات يومياً)">كل 6 ساعات</option>
                      <option value="كل 8 ساعات (3 مرات يومياً)">كل 8 ساعات</option>
                      <option value="كل 12 ساعة (مرتين يومياً)">كل 12 ساعة</option>
                      <option value="كل 24 ساعة (مرة يومياً)">مرة يومياً</option>
                      <option value="قبل الأكل">قبل الأكل</option>
                      <option value="بعد الأكل">بعد الأكل</option>
                      <option value="صباحاً ومساءً">صباحاً ومساءً</option>
                      <option value="عند اللزوم">عند اللزوم</option>
                      <option value="عند النوم">عند النوم</option>
                    </select>
                  </div>
                </div>

                <div className="sm:col-span-5 flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-500 dark:text-[#859394] whitespace-nowrap">
                    {language === 'en' ? 'Duration:' : 'المدة:'}
                  </span>
                  <input
                    type="text"
                    value={item.duration || ''}
                    onChange={(e) => handleUpdateSnapshotField(item.id, 'duration', e.target.value)}
                    placeholder="لمدة شهر..."
                    className="flex-1 bg-white dark:bg-[#111A2E] text-slate-900 dark:text-[#dde2f5] text-xs p-1.5 rounded-lg border border-slate-200 dark:border-white/5 focus:outline-none focus:ring-1 focus:ring-[#00c2cb]"
                  />
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleUpdateSnapshotField(item.id, 'duration', e.target.value);
                        e.target.value = '';
                      }
                    }}
                    defaultValue=""
                    className="bg-slate-100 dark:bg-[#18233C] text-slate-700 dark:text-[#dde2f5] text-[11px] p-1.5 rounded-lg border border-slate-200 dark:border-white/10 focus:outline-none cursor-pointer max-w-[100px]"
                  >
                    <option value="" disabled>
                      مدة سريعة
                    </option>
                    <option value="لمدة 3 أيام">3 أيام</option>
                    <option value="لمدة 5 أيام">5 أيام</option>
                    <option value="لمدة أسبوع">أسبوع</option>
                    <option value="لمدة أسبوعين">أسبوعين</option>
                    <option value="لمدة شهر">شهر</option>
                    <option value="عند اللزوم">عند اللزوم</option>
                    <option value="مستمر">مستمر</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal for adding custom drug to catalog or prescription */}
      {showAddCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-white/10 rounded-2xl w-full max-w-lg p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
              <h3 className="font-bold text-slate-900 dark:text-[#dde2f5] text-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-[#00c2cb]">add_circle</span>
                <span>
                  {language === 'en'
                    ? 'Add Custom Medication & Customize Dosage'
                    : 'إضافة دواء جديد وتخصيص الجرعة'}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddCustomModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddCustomDrug} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                    {language === 'en' ? 'Brand Name *' : 'الاسم التجاري للدواء *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={newBrandName}
                    onChange={(e) => setNewBrandName(e.target.value)}
                    placeholder={language === 'en' ? 'e.g. Concor' : 'مثال: كونكور'}
                    className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/10"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                    {language === 'en' ? 'Strength' : 'التركيز'}
                  </label>
                  <input
                    type="text"
                    value={newStrength}
                    onChange={(e) => setNewStrength(e.target.value)}
                    placeholder={language === 'en' ? 'e.g. 5 mg' : 'مثال: 5 ملجم'}
                    className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/10"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                  {language === 'en'
                    ? 'Generic Name (Active Ingredient)'
                    : 'الاسم العلمي (المادة الفعالة)'}
                </label>
                <input
                  type="text"
                  value={newGenericName}
                  onChange={(e) => setNewGenericName(e.target.value)}
                  placeholder="Bisoprolol fumarate"
                  className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/10 font-mono"
                  dir="ltr"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                    {language === 'en' ? 'Dosage Form' : 'الشكل الصيدلي'}
                  </label>
                  <select
                    value={newForm}
                    onChange={(e) => setNewForm(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/10"
                  >
                    <option value="أقراص (Tablets)">
                      {language === 'en' ? 'Tablets' : 'أقراص (Tablets)'}
                    </option>
                    <option value="كبسولات (Capsules)">
                      {language === 'en' ? 'Capsules' : 'كبسولات (Capsules)'}
                    </option>
                    <option value="شراب (Syrup)">
                      {language === 'en' ? 'Syrup' : 'شراب (Syrup)'}
                    </option>
                    <option value="أمبول حقن (Ampoules)">
                      {language === 'en' ? 'Ampoules' : 'أمبول حقن (Ampoules)'}
                    </option>
                    <option value="نقط (Drops)">
                      {language === 'en' ? 'Oral Drops' : 'نقط (Drops)'}
                    </option>
                    <option value="مرهم / كريم (Ointment/Cream)">
                      {language === 'en' ? 'Cream / Ointment' : 'مرهم / كريم (Cream)'}
                    </option>
                    <option value="بخاخ (Inhaler/Spray)">
                      {language === 'en' ? 'Inhaler / Spray' : 'بخاخ (Spray)'}
                    </option>
                    <option value="فوار (Effervescent)">
                      {language === 'en' ? 'Effervescent Sachets' : 'فوار (Effervescent)'}
                    </option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                    {language === 'en' ? 'Default Dosage' : 'الجرعة الافتراضية'}
                  </label>
                  <input
                    type="text"
                    value={newDosage}
                    onChange={(e) => setNewDosage(e.target.value)}
                    placeholder={language === 'en' ? '1 tablet daily' : 'قرص واحد يومياً'}
                    className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/10"
                  />
                </div>
              </div>

              <div className="p-3 bg-teal-50/50 dark:bg-teal-950/20 rounded-xl border border-teal-200 dark:border-teal-800/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="saveToFavMed"
                    checked={saveToFavorites}
                    onChange={(e) => setSaveToFavorites(e.target.checked)}
                    className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
                  />
                  <label
                    htmlFor="saveToFavMed"
                    className="text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
                  >
                    {language === 'en'
                      ? 'Save medication to My Clinic Catalog for 1-click future orders'
                      : 'حفظ الدواء في دليلي (دليل العيادة) لاستدعائه مستقبلاً بنقرة واحدة'}
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setShowAddCustomModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-700"
                >
                  {language === 'en' ? 'Cancel' : 'إلغاء'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#00c2cb] hover:bg-[#45dee7] text-slate-950 text-xs font-bold shadow-xs cursor-pointer"
                >
                  {language === 'en' ? 'Add to Prescription' : 'إضافة للروشتة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

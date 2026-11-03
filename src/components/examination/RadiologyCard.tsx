import React, { useState, useMemo } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { RadiologyCatalogItem, RadiologyOrderItem, RadiologyStatus } from '../../types';
import {
  searchClinicalRadiology,
  ClinicalSearchResult,
} from '../../services/clinicalSearchService';
import {
  STANDARD_RADIOLOGY_ARCHIVE,
  StandardRadiologyRecord,
} from '../../data/medicalStandardArchive';

interface RadiologyCardProps {
  radiologyOrders: RadiologyOrderItem[];
  onChangeOrders: (orders: RadiologyOrderItem[]) => void;
  radiologyCatalog: RadiologyCatalogItem[];
  onAddRadiologyToCatalog: (item: RadiologyCatalogItem) => void;
  frequentSuggestions?: Array<{ scanName: string; count?: number }>;
}

export const RadiologyCard: React.FC<RadiologyCardProps> = ({
  radiologyOrders,
  onChangeOrders,
  radiologyCatalog,
  onAddRadiologyToCatalog,
  frequentSuggestions = [],
}) => {
  const { language } = useLanguage();
  const [showPicker, setShowPicker] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [savedSuccessMsg, setSavedSuccessMsg] = useState<string | null>(null);

  // Form states for new radiology scan modal
  const [newScanName, setNewScanName] = useState('');
  const [newScanCategory, setNewScanCategory] = useState('أشعة سينية (X-Ray)');
  const [saveToCatalog, setSaveToCatalog] = useState(false);

  // Search results
  const searchResults = useMemo(() => {
    return searchClinicalRadiology(searchQuery, radiologyCatalog || []);
  }, [searchQuery, radiologyCatalog]);

  const favoriteScans = useMemo(() => {
    return (radiologyCatalog || []).filter((r) => r.isFavorite);
  }, [radiologyCatalog]);

  const archiveHighlights = useMemo(() => {
    const clinicNames = new Set((radiologyCatalog || []).map((r) => r.name.toLowerCase()));
    return STANDARD_RADIOLOGY_ARCHIVE.filter(
      (r) => !clinicNames.has(r.name.toLowerCase())
    ).slice(0, 40);
  }, [radiologyCatalog]);

  const notifySaved = (name: string) => {
    setSavedSuccessMsg(name);
    setTimeout(() => setSavedSuccessMsg(null), 3000);
  };

  // Add existing item from catalog to active patient orders
  const handleAddFromCatalog = (
    item: RadiologyCatalogItem | StandardRadiologyRecord,
    directStatus: RadiologyStatus = 'REQUEST'
  ) => {
    if (!item || !item.name) return;
    if (radiologyOrders.some((o) => o.name === item.name)) return;

    const newOrder: RadiologyOrderItem = {
      id: `rad-ord-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      radiologyId: item.id,
      name: item.name,
      category: item.category,
      status: directStatus,
      orderedAt: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      resultAt: directStatus !== 'REQUEST' ? new Date().toLocaleDateString('ar-EG') : undefined,
      notes: '',
    };
    onChangeOrders([...radiologyOrders, newOrder]);
    setSearchQuery('');
  };

  // 1-Click Save Archive Scan to Clinic Catalog ("دليلي")
  const handleSaveToClinicCatalog = (e: React.MouseEvent, scan: StandardRadiologyRecord) => {
    e.stopPropagation();
    onAddRadiologyToCatalog({
      id: `rad-cat-${Date.now()}`,
      name: scan.name,
      category: scan.category || 'أشعة وتصوير العيادة',
      isFavorite: false,
      notes: scan.notes,
    });
    notifySaved(scan.name);
  };

  // Add completely new custom radiology scan during exam
  const handleAddNewCustomScan = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newScanName.trim();
    if (!trimmed) return;

    if (saveToCatalog) {
      onAddRadiologyToCatalog({
        id: `rad-cat-${Date.now()}`,
        name: trimmed,
        category: newScanCategory,
        isFavorite: false,
      });
      notifySaved(trimmed);
    }

    const newOrder: RadiologyOrderItem = {
      id: `rad-ord-${Date.now()}`,
      name: trimmed,
      category: newScanCategory,
      status: 'REQUEST',
      orderedAt: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      notes: '',
    };
    onChangeOrders([...radiologyOrders, newOrder]);

    setNewScanName('');
    setShowAddModal(false);
  };

  const handleUpdateOrderStatus = (id: string, newStatus: RadiologyStatus) => {
    onChangeOrders(
      radiologyOrders.map((ord) => {
        if (ord.id === id) {
          return {
            ...ord,
            status: newStatus,
            resultAt:
              newStatus !== 'REQUEST' && !ord.resultAt
                ? new Date().toLocaleDateString('ar-EG')
                : ord.resultAt,
          };
        }
        return ord;
      })
    );
  };

  const handleUpdateOrderField = (
    id: string,
    field: 'resultSummary' | 'reportDetails' | 'notes',
    val: string
  ) => {
    onChangeOrders(
      radiologyOrders.map((ord) => {
        if (ord.id === id) {
          const updated = { ...ord, [field]: val };
          if (field === 'reportDetails' && val.trim().length > 0) {
            if (ord.status === 'REQUEST') updated.status = 'REPORT';
            if (!updated.resultAt) updated.resultAt = new Date().toLocaleDateString('ar-EG');
          } else if (field === 'resultSummary' && val.trim().length > 0) {
            if (ord.status === 'REQUEST') updated.status = 'RESULT';
            if (!updated.resultAt) updated.resultAt = new Date().toLocaleDateString('ar-EG');
          }
          return updated;
        }
        return ord;
      })
    );
  };

  const handleRemoveOrder = (id: string) => {
    onChangeOrders(radiologyOrders.filter((ord) => ord.id !== id));
  };

  const handleQuickAdd = () => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;

    // Check clinic catalog
    const matchedClinic = (radiologyCatalog || []).find(
      (c) => c.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (matchedClinic) {
      handleAddFromCatalog(matchedClinic, 'REQUEST');
      return;
    }

    // Check standard archive
    const matchedArchive = STANDARD_RADIOLOGY_ARCHIVE.find(
      (r) =>
        r.name.toLowerCase() === trimmed.toLowerCase() ||
        r.englishName.toLowerCase() === trimmed.toLowerCase() ||
        (r.abbreviations &&
          r.abbreviations.some((ab) => ab.toLowerCase() === trimmed.toLowerCase()))
    );
    if (matchedArchive) {
      handleAddFromCatalog(matchedArchive, 'REQUEST');
      return;
    }

    // Direct addition to visit
    const newOrder: RadiologyOrderItem = {
      id: `rad-ord-${Date.now()}`,
      name: trimmed,
      category: 'أشعة وفحوصات عامة',
      status: 'REQUEST',
      orderedAt: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      notes: '',
    };
    onChangeOrders([...radiologyOrders, newOrder]);
    setSearchQuery('');
  };

  const totalResultsCount =
    searchResults.clinicMatches.length + searchResults.archiveMatches.length;

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
          <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-[#38BDF8] flex items-center justify-center">
            <span className="material-symbols-outlined text-lg">radiology</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-[#dde2f5]">
                {language === 'en' ? 'Radiology & Imaging' : 'الأشعة والتصوير الطبي'}
              </h3>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-[#38BDF8]">
                {radiologyOrders.length}{' '}
                {language === 'en'
                  ? radiologyOrders.length === 1
                    ? 'scan'
                    : 'scans'
                  : 'فحص'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-[#859394]">
              {language === 'en'
                ? 'Search by Arabic, English or acronyms (CXR, US, Echo, CT, MRI, Doppler, ECG...)'
                : 'بحث بالاسم العربي أو الإنجليزي أو الاختصار (CXR, US, Echo, CT, MRI, Doppler, ECG...)'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {!showPicker ? (
            <button
              type="button"
              onClick={() => setShowPicker(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/30 hover:bg-sky-100 dark:hover:bg-sky-950/50 text-sky-700 dark:text-[#38BDF8] text-xs font-bold transition-all cursor-pointer border border-sky-200 dark:border-sky-800/40 shadow-xs"
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
                    const sel = (radiologyCatalog || []).find((r) => r.id === id);
                    if (sel) handleAddFromCatalog(sel);
                  } else if (val.startsWith('archive-')) {
                    const id = val.replace('archive-', '');
                    const sel = STANDARD_RADIOLOGY_ARCHIVE.find((r) => r.id === id);
                    if (sel) handleAddFromCatalog(sel);
                  }
                  e.target.value = '';
                }}
                className="bg-white dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs font-bold py-1.5 px-3 rounded-xl border-2 border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 cursor-pointer min-w-[210px] max-w-[320px] shadow-sm"
              >
                <option value="">
                  {language === 'en'
                    ? '-- Select scan from catalog --'
                    : '-- اضغط لاختيار فحص من دليلي --'}
                </option>

                {favoriteScans.length > 0 && (
                  <optgroup label="⭐ الفحوصات المفضلة">
                    {favoriteScans.map((r) => (
                      <option key={`fav-${r.id}`} value={`clinic-${r.id}`}>
                        ⭐ {r.name}
                      </option>
                    ))}
                  </optgroup>
                )}

                <optgroup
                  label={
                    language === 'en'
                      ? '🏥 My Clinic Catalog'
                      : `🏥 فحوصات دليلي (${(radiologyCatalog || []).length} فحص)`
                  }
                >
                  {(radiologyCatalog || []).map((r) => (
                    <option key={`cl-${r.id}`} value={`clinic-${r.id}`}>
                      {r.name}
                    </option>
                  ))}
                </optgroup>

                <optgroup
                  label={
                    language === 'en'
                      ? '🇪🇬 Standard Radiology Archive'
                      : `🇪🇬 أرشيف الأشعة والتصوير القياسي (${STANDARD_RADIOLOGY_ARCHIVE.length} فحص)`
                  }
                >
                  {archiveHighlights.map((r) => (
                    <option key={`ar-${r.id}`} value={`archive-${r.id}`}>
                      {r.name} {r.englishName ? `[${r.englishName}]` : ''}
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
      <div className="p-3 bg-sky-50/40 dark:bg-[#080e1b]/80 rounded-2xl border border-sky-400/30 space-y-3 shadow-xs">
        <div className="relative flex items-center">
          <input
            type="text"
            placeholder={
              language === 'en'
                ? 'Search catalog & archive by acronym (CXR, US, CT, Echo, MRI, Doppler, ECG)...'
                : 'ابحث في دليلي والأرشيف بالاختصار (CXR, US, CT, Echo, MRI, Doppler, ECG, سونار، رنين)...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleQuickAdd();
              }
            }}
            className={`w-full bg-white dark:bg-[#111A2E] text-slate-900 dark:text-[#dde2f5] text-sm p-3.5 rounded-xl border border-slate-200 dark:border-white/10 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 font-bold transition-all ${
              language === 'en' ? 'pl-11 pr-28' : 'pr-11 pl-28'
            }`}
          />
          <span
            className={`material-symbols-outlined absolute ${
              language === 'en' ? 'left-3.5' : 'right-3.5'
            } text-sky-600 dark:text-[#38BDF8] text-xl pointer-events-none`}
          >
            radiology
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
              className="px-2.5 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-[11px] flex items-center gap-1 shadow-xs cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              <span>{language === 'en' ? 'Add' : 'إضافة'}</span>
            </button>
          </div>
        </div>

        {/* Live Search Results Container */}
        {searchQuery.trim() && (
          <div className="p-3 bg-white dark:bg-[#111A2E] rounded-xl border border-sky-400/30 space-y-2.5 animate-in fade-in">
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-[#859394] border-b border-slate-100 dark:border-white/5 pb-1.5">
              <span className="flex items-center gap-1 font-bold">
                <span className="material-symbols-outlined text-xs text-sky-500">manage_search</span>
                <span>
                  {language === 'en'
                    ? `Imaging search results for "${searchQuery}":`
                    : `نتائج البحث الإشعاعي لـ "${searchQuery}":`}
                </span>
              </span>
              <span className="font-mono text-sky-600 dark:text-[#38BDF8] font-bold">
                {totalResultsCount}{' '}
                {language === 'en'
                  ? totalResultsCount === 1
                    ? 'matching scan'
                    : 'matching scans'
                  : 'فحص مطابق'}
              </span>
            </div>

            {totalResultsCount === 0 ? (
              <div className="py-4 text-center text-xs text-slate-500 space-y-2">
                <p>
                  {language === 'en'
                    ? `No matching radiology/imaging scans found for "${searchQuery}".`
                    : `لم يتم العثور على فحوصات أشعة مطابقة لـ "${searchQuery}".`}
                </p>
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={handleQuickAdd}
                    className="px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs cursor-pointer shadow-xs"
                  >
                    {language === 'en'
                      ? `+ Add "${searchQuery}" directly to visit`
                      : `+ إضافة "${searchQuery}" للكشف مباشرة`}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewScanName(searchQuery);
                      setShowAddModal(true);
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
                          key={`cl-rad-${item.id}`}
                          onClick={() => handleAddFromCatalog(item)}
                          className="p-3 rounded-xl text-start text-xs bg-emerald-50/40 dark:bg-[#080e1b] hover:border-emerald-500 border border-emerald-200 dark:border-emerald-800/40 text-slate-800 dark:text-[#dde2f5] flex items-start justify-between cursor-pointer group transition-all"
                        >
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-slate-900 dark:text-[#dde2f5] group-hover:text-emerald-600">
                                {item.name}
                              </span>
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                                {language === 'en' ? 'In My Catalog ✓' : 'من دليلي ✓'}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 block">
                              {item.category}
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

                {/* 2. Standard Archive Matches */}
                {searchResults.archiveMatches.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                      <span>
                        {language === 'en'
                          ? '🇪🇬 Standard Radiology Archive'
                          : '🇪🇬 أرشيف الأشعة والتصوير القياسي'}
                      </span>
                      <span>({searchResults.archiveMatches.length})</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {searchResults.archiveMatches.map(({ item }) => (
                        <div
                          key={`arch-rad-${item.id}`}
                          onClick={() => handleAddFromCatalog(item)}
                          className="p-3 rounded-xl text-start text-xs bg-slate-50 dark:bg-[#080e1b] hover:border-indigo-400 border border-slate-200 dark:border-white/5 text-slate-800 dark:text-[#dde2f5] flex items-start justify-between cursor-pointer group transition-all"
                        >
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-slate-900 dark:text-[#dde2f5] group-hover:text-indigo-600">
                                {item.name}
                              </span>
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
                                {language === 'en' ? 'Standard 🇪🇬' : 'الأرشيف 🇪🇬'}
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
                            <span className="text-[10px] text-sky-600 dark:text-[#38BDF8] block font-bold">
                              {language === 'en' ? 'Modality: ' : 'التقنية: '}
                              {item.modality}
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

      {/* Orders List */}
      {radiologyOrders.length === 0 ? (
        <div className="py-8 text-center bg-slate-50/50 dark:bg-[#080e1b]/40 rounded-2xl border border-dashed border-slate-200 dark:border-white/5">
          <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 text-3xl mb-1">
            medical_information
          </span>
          <p className="text-xs font-bold text-slate-600 dark:text-[#859394]">
            {language === 'en'
              ? 'No radiology or imaging scans requested yet.'
              : 'لم يتم طلب أي فحوصات أشعة حتى الآن في هذا الكشف.'}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {language === 'en'
              ? 'Pick from catalog or search above to order scans and record medical reports.'
              : 'اختر من دليل العيادة أو ابحث في شريط البحث أعلاه لطلب فحص وتدوين تقريره الطبي فوراً.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-[#859394] px-1">
            <span>
              {language === 'en'
                ? 'Requested Imaging Scans & Reports:'
                : 'الفحوصات المطلوبة والتقارير:'}
            </span>
            <span className="text-sky-600 font-mono">Radiology Workflow</span>
          </div>

          {radiologyOrders.map((ord, idx) => (
            <div
              key={ord.id}
              className="bg-slate-50 dark:bg-[#080e1b] rounded-2xl border border-slate-200 dark:border-white/5 p-3.5 space-y-2.5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-[#38BDF8] font-mono text-xs font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-[#dde2f5]">
                      {ord.name}
                    </span>
                    {ord.category && (
                      <span className="text-[10px] text-slate-400 ms-2">({ord.category})</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <select
                    value={ord.status}
                    onChange={(e) =>
                      handleUpdateOrderStatus(ord.id, e.target.value as RadiologyStatus)
                    }
                    className="bg-white dark:bg-[#111A2E] text-slate-900 dark:text-[#dde2f5] text-[11px] font-bold py-1 px-2.5 rounded-lg border border-slate-200 dark:border-white/10 cursor-pointer"
                  >
                    <option value="REQUEST">
                      {language === 'en' ? 'Ordered (Request)' : 'مطلوب (Order)'}
                    </option>
                    <option value="REPORT">
                      {language === 'en' ? 'Report Ready' : 'تقرير مرفق (Reported)'}
                    </option>
                  </select>

                  <button
                    type="button"
                    onClick={() => handleRemoveOrder(ord.id)}
                    className="p-1 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                    title={language === 'en' ? 'Delete Scan' : 'حذف من الفحوصات'}
                  >
                    <span className="material-symbols-outlined text-base">delete</span>
                  </button>
                </div>
              </div>

              {/* Result Summary & Details */}
              <div className="space-y-2 pt-1 border-t border-slate-200 dark:border-white/5">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500 dark:text-[#859394] whitespace-nowrap">
                    {language === 'en' ? 'Quick Summary:' : 'الملخص / النتيجة السريعة:'}
                  </span>
                  <input
                    type="text"
                    value={ord.resultSummary || ''}
                    onChange={(e) =>
                      handleUpdateOrderField(ord.id, 'resultSummary', e.target.value)
                    }
                    placeholder={
                      language === 'en'
                        ? 'e.g. Normal chest X-ray, no infiltrates...'
                        : 'مثل: لا توجد ارتشاحات رئوية، سونار طبيعي...'
                    }
                    className="flex-1 bg-white dark:bg-[#111A2E] text-slate-900 dark:text-[#dde2f5] text-xs p-1.5 rounded-lg border border-slate-200 dark:border-white/5 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                <div className="flex items-start gap-2">
                  <span className="text-[11px] text-slate-500 dark:text-[#859394] whitespace-nowrap pt-1">
                    {language === 'en' ? 'Full Report:' : 'التقرير والتفاصيل:'}
                  </span>
                  <textarea
                    rows={2}
                    value={ord.reportDetails || ''}
                    onChange={(e) =>
                      handleUpdateOrderField(ord.id, 'reportDetails', e.target.value)
                    }
                    placeholder={
                      language === 'en'
                        ? 'Enter findings, measurements, radiologist impressions...'
                        : 'تدوين تفاصيل تقرير الأشعة، القياسات، وملاحظات الاستشاري...'
                    }
                    className="flex-1 bg-white dark:bg-[#111A2E] text-slate-900 dark:text-[#dde2f5] text-xs p-1.5 rounded-lg border border-slate-200 dark:border-white/5 focus:outline-none focus:ring-1 focus:ring-sky-500 resize-none"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Custom Scan Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-white/10 rounded-2xl w-full max-w-lg p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
              <h3 className="font-bold text-slate-900 dark:text-[#dde2f5] text-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-sky-500">radiology</span>
                <span>
                  {language === 'en' ? 'Add Custom Imaging Scan' : 'إضافة فحص أشعة جديد'}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddNewCustomScan} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                  {language === 'en' ? 'Scan Name *' : 'اسم الفحص الطبي *'}
                </label>
                <input
                  type="text"
                  required
                  value={newScanName}
                  onChange={(e) => setNewScanName(e.target.value)}
                  placeholder={
                    language === 'en'
                      ? 'e.g. Chest X-Ray (CXR) PA View'
                      : 'مثال: أشعة سينية على الصدر CXR'
                  }
                  className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/10"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                  {language === 'en' ? 'Modality & Type' : 'نوع الأشعة والتقنية'}
                </label>
                <select
                  value={newScanCategory}
                  onChange={(e) => setNewScanCategory(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/10"
                >
                  <option value="أشعة سينية (X-Ray)">
                    {language === 'en' ? 'X-Ray' : 'أشعة سينية (X-Ray)'}
                  </option>
                  <option value="موجات صوتية / سونار (Ultrasound)">
                    {language === 'en' ? 'Ultrasound / Sonar' : 'موجات صوتية / سونار (Ultrasound)'}
                  </option>
                  <option value="أشعة مقطعية (CT Scan)">
                    {language === 'en' ? 'Computed Tomography (CT Scan)' : 'أشعة مقطعية (CT Scan)'}
                  </option>
                  <option value="رنين مغناطيسي (MRI)">
                    {language === 'en' ? 'Magnetic Resonance (MRI)' : 'رنين مغناطيسي (MRI)'}
                  </option>
                  <option value="دوبلر ملون ودوبلكس (Doppler)">
                    {language === 'en' ? 'Doppler & Duplex' : 'دوبلر ملون ودوبلكس (Doppler)'}
                  </option>
                  <option value="رسم وتخطيط قلب (ECG/Echo)">
                    {language === 'en' ? 'Echocardiogram / ECG' : 'رسم وتخطيط قلب (ECG/Echo)'}
                  </option>
                  <option value="فحوصات أشعة أخرى">
                    {language === 'en' ? 'Other Radiology' : 'فحوصات أشعة أخرى'}
                  </option>
                </select>
              </div>

              <div className="p-3 bg-sky-50/50 dark:bg-sky-950/20 rounded-xl border border-sky-200 dark:border-sky-800/30">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={saveToCatalog}
                    onChange={(e) => setSaveToCatalog(e.target.checked)}
                    className="w-4 h-4 rounded text-sky-600"
                  />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {language === 'en'
                      ? 'Save scan to My Clinic Catalog'
                      : 'حفظ الفحص في دليلي (دليل العيادة)'}
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-700"
                >
                  {language === 'en' ? 'Cancel' : 'إلغاء'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold shadow-xs cursor-pointer"
                >
                  {language === 'en' ? 'Add to Visit' : 'إضافة للزيارة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

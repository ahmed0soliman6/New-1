import React, { useState, useMemo } from 'react';
import {
  STANDARD_DRUGS_ARCHIVE,
  STANDARD_LABS_ARCHIVE,
  STANDARD_RADIOLOGY_ARCHIVE,
  STANDARD_DIAGNOSES_ARCHIVE,
  StandardDrugRecord,
  StandardLabRecord,
  StandardRadiologyRecord,
  StandardDiagnosisRecord,
} from '../../data/medicalStandardArchive';
import { normalizeClinicalText } from '../../services/clinicalSearchService';

export type ArchiveType = 'drugs' | 'labs' | 'radiology' | 'diagnoses';

interface ArchiveImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: ArchiveType;
  existingIds: Set<string>;
  existingNames: Set<string>;
  onImportItem: (item: any) => void;
  onBatchImport: (items: any[]) => void;
}

export const ArchiveImportModal: React.FC<ArchiveImportModalProps> = ({
  isOpen,
  onClose,
  type,
  existingIds,
  existingNames,
  onImportItem,
  onBatchImport,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [importedIds, setImportedIds] = useState<Set<string>>(new Set());

  // Reset search when modal opens/changes type
  React.useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSelectedCategory('ALL');
      setImportedIds(new Set());
    }
  }, [isOpen, type]);

  if (!isOpen) return null;

  // Title and styling config based on type
  const config = {
    drugs: {
      title: 'استيراد الأدوية من أرشيف هيئة الدواء المصرية (EDA)',
      subtitle: 'أكثر من 70 دواء مصري متداول ومسجل بالاسم التجاري والعلمي والشكل الدوائي',
      badgeColor: 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-[#45dee7]',
      btnColor: 'bg-[#00c2cb] hover:bg-[#45dee7] text-slate-950',
      icon: 'medication',
    },
    labs: {
      title: 'استيراد الفحوصات من الأرشيف المعملي القياسي',
      subtitle: 'تحاليل الدم، وظائف الكبد والكلى، السكر التراكمي، الهرمونات والمناعة',
      badgeColor: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300',
      btnColor: 'bg-emerald-600 hover:bg-emerald-500 text-white',
      icon: 'science',
    },
    radiology: {
      title: 'استيراد الفحوصات من أرشيف الأشعة والتصوير الطبي',
      subtitle: 'السونار، الأشعة السينية، الرنين المغناطيسي، الأشعة المقطعية، وإيكو القلب',
      badgeColor: 'bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300',
      btnColor: 'bg-sky-600 hover:bg-sky-500 text-white',
      icon: 'radiology',
    },
    diagnoses: {
      title: 'استيراد التشخيصات من أرشيف ICD-10 السريري',
      subtitle: 'أشهر الأمراض الباطنية والمزمنة بأكواد التصنيف الدولي للأمراض ICD-10',
      badgeColor: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
      btnColor: 'bg-amber-500 hover:bg-amber-400 text-slate-950',
      icon: 'stethoscope',
    },
  }[type];

  // Base list
  const baseArchive =
    type === 'drugs'
      ? STANDARD_DRUGS_ARCHIVE
      : type === 'labs'
      ? STANDARD_LABS_ARCHIVE
      : type === 'radiology'
      ? STANDARD_RADIOLOGY_ARCHIVE
      : STANDARD_DIAGNOSES_ARCHIVE;

  // Filter categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    baseArchive.forEach((it: any) => {
      if (it.category) set.add(it.category);
    });
    return Array.from(set);
  }, [baseArchive]);

  // Filtered archive results
  const filteredItems = useMemo(() => {
    const qNorm = normalizeClinicalText(searchQuery);
    return baseArchive.filter((item: any) => {
      // Category filter
      if (selectedCategory !== 'ALL' && item.category !== selectedCategory) {
        return false;
      }

      if (!qNorm) return true;

      const searchable =
        type === 'drugs'
          ? `${item.brandName} ${item.arabicBrand || ''} ${item.genericName} ${item.arabicGeneric || ''} ${(item.aliases || []).join(' ')}`
          : type === 'labs'
          ? `${item.name} ${item.englishName} ${(item.abbreviations || []).join(' ')} ${(item.aliasesAr || []).join(' ')}`
          : type === 'radiology'
          ? `${item.name} ${item.englishName} ${item.modality} ${(item.abbreviations || []).join(' ')} ${(item.aliasesAr || []).join(' ')}`
          : `${item.code} ${item.nameAr} ${item.nameEn} ${(item.abbreviations || []).join(' ')} ${(item.aliasesAr || []).join(' ')}`;

      const normTarget = normalizeClinicalText(searchable);
      return normTarget.includes(qNorm);
    });
  }, [baseArchive, searchQuery, selectedCategory, type]);

  // Helper to check if already in catalog or newly imported
  const isItemInCatalog = (item: any) => {
    if (existingIds.has(item.id) || importedIds.has(item.id)) return true;
    const name = type === 'drugs' ? item.brandName : type === 'diagnoses' ? item.nameAr : item.name;
    return existingNames.has(normalizeClinicalText(name));
  };

  const handleImportSingle = (item: any) => {
    onImportItem(item);
    setImportedIds((prev) => new Set([...prev, item.id]));
  };

  const handleImportAllVisible = () => {
    const toImport = filteredItems.filter((it: any) => !isItemInCatalog(it));
    if (toImport.length === 0) return;
    onBatchImport(toImport);
    setImportedIds((prev) => {
      const next = new Set(prev);
      toImport.forEach((it: any) => next.add(it.id));
      return next;
    });
  };

  const pendingCount = filteredItems.filter((it: any) => !isItemInCatalog(it)).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-white/10 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-xl">{config.icon}</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-[#dde2f5]">
                  {config.title}
                </h3>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/40">
                  الأرشيف القياسي 🇪🇬
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-[#859394] mt-0.5">
                {config.subtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 text-slate-500 hover:text-slate-700 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Search and Category Filter Toolbar */}
        <div className="p-4 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#080e1b]/40 space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute right-3 top-2.5 text-slate-400 text-base">
                search
              </span>
              <input
                type="text"
                placeholder="ابحث بالاسم العربي، الإنجليزي، أو الاختصار الطبي..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white dark:bg-[#111A2E] text-slate-900 dark:text-[#dde2f5] text-xs pr-9 pl-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute left-2.5 top-2 text-xs text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              )}
            </div>

            {pendingCount > 0 && (
              <button
                type="button"
                onClick={handleImportAllVisible}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl ${config.btnColor} font-bold text-xs shadow-xs cursor-pointer whitespace-nowrap`}
              >
                <span className="material-symbols-outlined text-sm">download_done</span>
                <span>استيراد جميع المعروض ({pendingCount}) إلى دليلي</span>
              </button>
            )}
          </div>

          {/* Categories Pill Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <button
              type="button"
              onClick={() => setSelectedCategory('ALL')}
              className={`px-2.5 py-1 rounded-lg whitespace-nowrap text-[11px] font-bold cursor-pointer transition-all ${
                selectedCategory === 'ALL'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-white dark:bg-[#111A2E] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/5'
              }`}
            >
              جميع التصنيفات ({baseArchive.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg whitespace-nowrap text-[11px] font-bold cursor-pointer transition-all ${
                  selectedCategory === cat
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'bg-white dark:bg-[#111A2E] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/5'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Content List */}
        <div className="p-4 overflow-y-auto flex-1 space-y-2">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              لا توجد عناصر مطابقة لبحثك في الأرشيف الطبي القياسي.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {filteredItems.map((item: any) => {
                const added = isItemInCatalog(item);

                return (
                  <div
                    key={item.id}
                    className={`p-3 rounded-xl border flex items-start justify-between gap-2.5 transition-all ${
                      added
                        ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40 opacity-80'
                        : 'bg-white dark:bg-[#080e1b] border-slate-200 dark:border-white/5 hover:border-slate-300'
                    }`}
                  >
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-xs text-slate-900 dark:text-[#dde2f5] truncate">
                          {type === 'drugs'
                            ? item.brandName
                            : type === 'diagnoses'
                            ? item.nameAr
                            : item.name}
                        </span>
                        {type === 'drugs' && item.arabicBrand && (
                          <span className="text-[10px] text-slate-500 font-bold">
                            [{item.arabicBrand}]
                          </span>
                        )}
                        {type === 'diagnoses' && item.code && (
                          <span className="text-[10px] font-mono font-bold text-teal-600 dark:text-[#45dee7]">
                            [{item.code}]
                          </span>
                        )}
                      </div>

                      {/* Details row */}
                      {type === 'drugs' && (
                        <div className="text-[10px] text-slate-400 font-mono" dir="ltr">
                          {item.genericName} • {item.form}
                        </div>
                      )}
                      {type === 'labs' && item.englishName && (
                        <div className="text-[10px] text-slate-400 font-mono" dir="ltr">
                          {item.englishName}
                        </div>
                      )}
                      {type === 'radiology' && (
                        <div className="text-[10px] text-sky-600 dark:text-sky-400 font-bold">
                          {item.modality}
                        </div>
                      )}
                      {type === 'diagnoses' && item.nameEn && (
                        <div className="text-[10px] text-slate-400 font-mono" dir="ltr">
                          {item.nameEn}
                        </div>
                      )}

                      <span className="text-[10px] text-slate-400 block">
                        {item.category}
                      </span>
                    </div>

                    <div className="shrink-0 flex items-center">
                      {added ? (
                        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-1 rounded-lg">
                          <span>✓</span>
                          <span>في دليلي</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleImportSingle(item)}
                          className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold border border-indigo-200 dark:border-indigo-800/40 cursor-pointer transition-colors whitespace-nowrap flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-sm">add</span>
                          <span>استيراد لدليلي</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-[#080e1b] flex items-center justify-between text-xs">
          <span className="text-slate-500">
            إجمالي المعروض: {filteredItems.length} عنصر من الأرشيف الطبي
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 dark:bg-white/10 hover:bg-slate-300 text-slate-800 dark:text-slate-200 font-bold cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};

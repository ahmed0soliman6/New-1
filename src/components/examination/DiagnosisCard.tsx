import React, { useState } from 'react';
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

export const DiagnosisCard: React.FC<DiagnosisCardProps> = ({
  diagnoses,
  onChangeDiagnoses,
  diagnosesCatalog,
  onAddDiagnosisToCatalog,
}) => {
  const [searchFilter, setSearchFilter] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // New diagnosis form
  const [newCode, setNewCode] = useState('');
  const [newNameAr, setNewNameAr] = useState('');
  const [newNameEn, setNewNameEn] = useState('');
  const [newCategory, setNewCategory] = useState('الجهاز الهضمي');
  const [saveToCatalog, setSaveToCatalog] = useState(true);

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
    // If removed the primary, make first remaining primary
    if (remaining.length > 0 && !remaining.some((d) => d.isPrimary)) {
      remaining[0].isPrimary = true;
    }
    onChangeDiagnoses(remaining);
  };

  const filteredCatalog = diagnosesCatalog.filter((item) =>
    item.nameAr.toLowerCase().includes(searchFilter.toLowerCase()) ||
    item.nameEn.toLowerCase().includes(searchFilter.toLowerCase()) ||
    item.code.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const favoriteDiagnoses = diagnosesCatalog.filter((d) => d.isFavorite);

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

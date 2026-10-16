import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  loadLifestylePresets,
  subscribeToLifestylePresets,
  addLifestylePreset,
} from '../../utils/lifestyleManager';

interface FollowupCardProps {
  followupDate: string;
  onChangeFollowupDate: (date: string) => void;
  lifestyleAdvice: string;
  onChangeLifestyleAdvice: (advice: string) => void;
  frequentSuggestions?: Array<{ text: string; count?: number }>;
}

export const FollowupCard: React.FC<FollowupCardProps> = ({
  followupDate,
  onChangeFollowupDate,
  lifestyleAdvice,
  onChangeLifestyleAdvice,
  frequentSuggestions = [],
}) => {
  const { language } = useLanguage();
  const [advicePresets, setAdvicePresets] = useState<string[]>(loadLifestylePresets);
  const [customAdviceInput, setCustomAdviceInput] = useState('');
  const [selectedDropdownPreset, setSelectedDropdownPreset] = useState('');

  // Keep in sync with lifestyleManager across Settings, Storage & Firestore
  useEffect(() => {
    const unsubscribe = subscribeToLifestylePresets((presets) => {
      setAdvicePresets(presets);
    });
    return () => unsubscribe();
  }, []);

  // Helper to format date string YYYY-MM-DD for N days from today
  const getDateForDays = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  const date7 = getDateForDays(7);
  const date14 = getDateForDays(14);
  const date30 = getDateForDays(30);

  const isSelected7 = followupDate === date7;
  const isSelected14 = followupDate === date14;
  const isSelected30 = followupDate === date30;
  const isCustomDate = !!followupDate && !isSelected7 && !isSelected14 && !isSelected30;

  const setPresetDate = (days: number) => {
    onChangeFollowupDate(getDateForDays(days));
  };

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  const handleSelectFromDropdown = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (!val) return;

    // Check if the advice already contains this item
    const lines = lifestyleAdvice ? lifestyleAdvice.split('\n').map((l) => l.trim()).filter(Boolean) : [];
    const itemWithBullet = `• ${val}`;
    const exists = lines.some((l) => l === itemWithBullet || l === val || l.includes(val));

    if (exists) {
      // Remove it
      const updatedLines = lines.filter((l) => l !== itemWithBullet && l !== val && !l.includes(val));
      onChangeLifestyleAdvice(updatedLines.join('\n'));
    } else {
      // Add it
      const updatedLines = [...lines, itemWithBullet];
      onChangeLifestyleAdvice(updatedLines.join('\n'));
    }
    setSelectedDropdownPreset('');
  };

  const handleAddCustomAdvice = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customAdviceInput.trim();
    if (!trimmed) return;

    // Save to global presets so it's remembered in Settings and subsequent examinations
    addLifestylePreset(trimmed);

    // Add to current visit's lifestyle advice
    const lines = lifestyleAdvice ? lifestyleAdvice.split('\n').map((l) => l.trim()).filter(Boolean) : [];
    const itemWithBullet = `• ${trimmed}`;
    if (!lines.some((l) => l === itemWithBullet || l === trimmed)) {
      const updatedLines = [...lines, itemWithBullet];
      onChangeLifestyleAdvice(updatedLines.join('\n'));
    }
    setCustomAdviceInput('');
  };

  return (
    <div className="bg-white dark:bg-[#111A2E] p-5 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <span className="material-symbols-outlined text-lg">event_repeat</span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-[#dde2f5]">
              {language === 'en'
                ? 'Follow-up & Lifestyle Advice'
                : 'المتابعة والاستشارة والنظام الغذائي (Follow-up & Lifestyle)'}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-[#859394]">
              {language === 'en'
                ? 'Set follow-up consultation date, dietary rules, and lifestyle instructions'
                : 'تحديد موعد الاستشارة القادمة وقواعد النظام الغذائي ونمط المعيشة (تطابق تلقائي مع بنود الإعدادات)'}
            </p>
          </div>
        </div>
      </div>


      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Follow-up date & quick buttons */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800 dark:text-[#dde2f5] block">
              {language === 'en' ? 'Next Consultation Date:' : 'موعد الاستشارة القادمة:'}
            </label>
            {followupDate && (
              <button
                type="button"
                onClick={() => onChangeFollowupDate('')}
                className="text-[11px] text-rose-500 hover:text-rose-600 font-bold flex items-center gap-0.5 cursor-pointer"
              >
                <span>{language === 'en' ? 'No follow-up (clear)' : 'بدون متابعة (إلغاء)'}</span>
                <span className="material-symbols-outlined text-xs">close</span>
              </button>
            )}
          </div>

          {/* Quick preset buttons and custom indicator next to 30 days */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setPresetDate(7)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 border ${
                isSelected7
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-400/50'
                  : 'bg-slate-50 dark:bg-[#080e1b] hover:bg-slate-100 dark:hover:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-[#dde2f5]'
              }`}
            >
              {isSelected7 && <span className="material-symbols-outlined text-xs">check</span>}
              <span>{language === 'en' ? 'In 1 Week (7 days)' : 'بعد أسبوع (7 أيام)'}</span>
            </button>

            <button
              type="button"
              onClick={() => setPresetDate(14)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 border ${
                isSelected14
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-400/50'
                  : 'bg-slate-50 dark:bg-[#080e1b] hover:bg-slate-100 dark:hover:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-[#dde2f5]'
              }`}
            >
              {isSelected14 && <span className="material-symbols-outlined text-xs">check</span>}
              <span>{language === 'en' ? 'In 2 Weeks (14 days)' : 'بعد أسبوعين (14 يوماً)'}</span>
            </button>

            <button
              type="button"
              onClick={() => setPresetDate(30)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 border ${
                isSelected30
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-400/50'
                  : 'bg-slate-50 dark:bg-[#080e1b] hover:bg-slate-100 dark:hover:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-[#dde2f5]'
              }`}
            >
              {isSelected30 && <span className="material-symbols-outlined text-xs">check</span>}
              <span>{language === 'en' ? 'In 1 Month (30 days)' : 'بعد شهر (30 يوماً)'}</span>
            </button>

            {/* Custom chosen date from calendar appearing right beside 30 days */}
            {isCustomDate && (
              <div className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#00c2cb] text-slate-950 border border-[#00c2cb] shadow-md ring-2 ring-[#00c2cb]/50 flex items-center gap-1.5 animate-in fade-in">
                <span className="material-symbols-outlined text-xs">event</span>
                <span>
                  {language === 'en' ? 'Calendar Date: ' : 'موعد التقويم: '}
                  {formatDisplayDate(followupDate)}
                </span>
                <span className="material-symbols-outlined text-xs">check_circle</span>
              </div>
            )}
          </div>

          <div className="pt-1 space-y-1.5">
            <input
              type="date"
              value={followupDate}
              onChange={(e) => onChangeFollowupDate(e.target.value)}
              onClick={(e) => {
                try {
                  (e.currentTarget as any).showPicker?.();
                } catch {}
              }}
              className={`w-full text-xs p-2.5 rounded-xl border focus:outline-none cursor-pointer transition-all ${
                followupDate
                  ? 'bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-950 dark:text-indigo-200 border-indigo-300 dark:border-indigo-700 font-bold'
                  : 'bg-slate-50 dark:bg-[#080e1b] text-slate-500 dark:text-[#859394] border-slate-200 dark:border-white/10'
              }`}
              title={language === 'en' ? 'Click to choose follow-up date from calendar' : 'انقر لاختيار موعد الاستشارة من التقويم'}
            />
            {followupDate ? (
              <span className="text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">check_circle</span>
                <span>
                  {language === 'en' ? 'Selected date: ' : 'الموعد المختار: '}
                  {formatDisplayDate(followupDate)}
                </span>
              </span>
            ) : (
              <span className="text-slate-400 dark:text-[#859394] text-[11px] block">
                {language === 'en'
                  ? 'No follow-up date chosen yet. Select a quick option or pick from calendar.'
                  : 'لم يتم تحديد موعد متابعة بعد. يرجى اختيار موعد من الخيارات السريعة أو التقويم.'}
              </span>
            )}
          </div>
        </div>

        {/* Dietary and lifestyle advice presets */}
        <div className="space-y-3">
          <div className="space-y-1.5 p-3.5 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/40">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 dark:text-[#dde2f5] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-indigo-600 dark:text-indigo-400 text-sm">menu_book</span>
                <span>
                  {language === 'en'
                    ? 'Approved Lifestyle & Diet Instructions (from Settings):'
                    : 'اختر الإرشادات ونمط الحياة المعتمد (من الإعدادات):'}
                </span>
              </label>
              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-100 dark:bg-indigo-900/40 px-2 py-0.5 rounded-md">
                {advicePresets.length} {language === 'en' ? 'available' : 'إرشاد متاح'}
              </span>
            </div>

            {/* Dropdown menu for presets */}
            <select
              value={selectedDropdownPreset}
              onChange={handleSelectFromDropdown}
              className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-xl border border-indigo-300 dark:border-indigo-800/50 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer font-bold transition-all shadow-xs"
            >
              <option value="">
                {language === 'en'
                  ? '-- Click to pick an instruction preset from Settings --'
                  : '-- اضغط لاختيار إرشاد من بنود الإعدادات --'}
              </option>
              {advicePresets.map((preset, idx) => {
                const isSelected = lifestyleAdvice.includes(preset);
                return (
                  <option key={idx} value={preset}>
                    {isSelected ? '✓ ' : '+ '} {preset}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Lifestyle Advice Multiline Text Area */}
          <div className="space-y-1" data-no-translate="true">
            <label className="text-[11px] font-bold text-slate-600 dark:text-[#859394] block">
              {language === 'en'
                ? 'Patient Instructions & Diet Advice (printed on prescription):'
                : 'نص الإرشادات والتعليمات الطبية للمريض (تطبع في الروشتة):'}
            </label>
            <textarea
              rows={3}
              data-no-translate="true"
              value={lifestyleAdvice}
              onChange={(e) => onChangeLifestyleAdvice(e.target.value)}
              placeholder={
                language === 'en'
                  ? 'Enter medical advice or choose from presets above (e.g. • Avoid greasy foods...)'
                  : 'اكتب التعليمات الطبية أو اختر من القائمة أعلاه (مثال: • الامتناع عن الأطعمة الدسمة...)'
              }
              className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed font-sans no-translate clinical-data"
            />
          </div>

          {/* Form to add custom lifestyle advice */}
          <form onSubmit={handleAddCustomAdvice} className="flex items-center gap-1.5 pt-1">
            <input
              type="text"
              value={customAdviceInput}
              onChange={(e) => setCustomAdviceInput(e.target.value)}
              placeholder={
                language === 'en'
                  ? 'Add new advice & save to Settings presets...'
                  : 'إضافة إرشاد جديد وحفظه في الإعدادات...'
              }
              className="flex-1 bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <button
              type="submit"
              className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer transition-all shrink-0 shadow-xs"
            >
              {language === 'en' ? '+ Add & Save' : '+ إضافة وحفظ'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

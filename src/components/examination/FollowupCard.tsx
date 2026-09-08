import React, { useState, useEffect } from 'react';

interface FollowupCardProps {
  followupDate: string;
  onChangeFollowupDate: (date: string) => void;
  lifestyleAdvice: string;
  onChangeLifestyleAdvice: (advice: string) => void;
}

const DEFAULT_ADVICE_PRESETS = [
  'الامتناع التام عن الأطعمة الدسمة، الحارة، المقليات، والمشروبات الغازية.',
  'تقليل استهلاك ملح الطعام والمخللات إلى أقل من 2 جرام صوديوم يومياً.',
  'الامتناع عن السكريات والحلويات الصريحة والعصائر المحلاة والمخبوزات البيضاء.',
  'عدم الاستلقاء أو النوم مباشرة بعد تناول الطعام لمدة ساعتين على الأقل.',
  'شرب ما لا يقل عن 2.5 إلى 3 لترات ماء يومياً لحماية الكلى وتحسين التروية.',
  'ممارسة رياضة المشي المنتظم 30 دقيقة يومياً لمدة 5 أيام أسبوعياً.',
  'تجنب التوتر والضغط العصبي وأخذ قسط كافٍ من النوم (7-8 ساعات متواصلة).',
  'تناول وجبات صغيرة متكررة خفيفة بدلاً من الوجبات الكبيرة الثقيلة.',
];

export const FollowupCard: React.FC<FollowupCardProps> = ({
  followupDate,
  onChangeFollowupDate,
  lifestyleAdvice,
  onChangeLifestyleAdvice,
}) => {
  const [advicePresets, setAdvicePresets] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('soli_lifestyle_presets');
      return saved ? JSON.parse(saved) : DEFAULT_ADVICE_PRESETS;
    } catch {
      return DEFAULT_ADVICE_PRESETS;
    }
  });

  // Keep in sync with storage updates
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const saved = localStorage.getItem('soli_lifestyle_presets');
        if (saved) setAdvicePresets(JSON.parse(saved));
      } catch {
        // Fallback
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const [selectedPresets, setSelectedPresets] = useState<string[]>(() => {
    return [advicePresets[0] || DEFAULT_ADVICE_PRESETS[0], advicePresets[3] || DEFAULT_ADVICE_PRESETS[3]].filter(Boolean);
  });
  const [customAdviceInput, setCustomAdviceInput] = useState('');
  const [selectedDropdownPreset, setSelectedDropdownPreset] = useState('');

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
    let updated: string[];
    if (selectedPresets.includes(val)) {
      updated = selectedPresets.filter((p) => p !== val);
    } else {
      updated = [...selectedPresets, val];
    }
    setSelectedPresets(updated);
    onChangeLifestyleAdvice(updated.map((item) => `• ${item}`).join('\n'));
    setSelectedDropdownPreset('');
  };

  const handleAddCustomAdvice = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customAdviceInput.trim();
    if (!trimmed) return;
    if (!advicePresets.includes(trimmed)) {
      const updatedPresets = [trimmed, ...advicePresets];
      setAdvicePresets(updatedPresets);
      try {
        localStorage.setItem('soli_lifestyle_presets', JSON.stringify(updatedPresets));
      } catch (err) {
        console.warn('Failed to save lifestyle preset', err);
      }
    }
    if (!selectedPresets.includes(trimmed)) {
      const updated = [...selectedPresets, trimmed];
      setSelectedPresets(updated);
      onChangeLifestyleAdvice(updated.map((item) => `• ${item}`).join('\n'));
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
              المتابعة والاستشارة والنظام الغذائي (Follow-up & Lifestyle)
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-[#859394]">
              تحديد موعد الاستشارة القادمة وقواعد النظام الغذائي ونمط المعيشة
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Follow-up date & quick buttons */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800 dark:text-[#dde2f5] block">
              موعد الاستشارة القادمة:
            </label>
            {followupDate && (
              <button
                type="button"
                onClick={() => onChangeFollowupDate('')}
                className="text-[11px] text-rose-500 hover:text-rose-600 font-bold flex items-center gap-0.5 cursor-pointer"
              >
                <span>بدون متابعة (إلغاء)</span>
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
              <span>بعد أسبوع (7 أيام)</span>
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
              <span>بعد أسبوعين (14 يوماً)</span>
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
              <span>بعد شهر (30 يوماً)</span>
            </button>

            {/* Custom chosen date from calendar appearing right beside 30 days */}
            {isCustomDate && (
              <div className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#00c2cb] text-slate-950 border border-[#00c2cb] shadow-md ring-2 ring-[#00c2cb]/50 flex items-center gap-1.5 animate-in fade-in">
                <span className="material-symbols-outlined text-xs">event</span>
                <span>موعد التقويم: {formatDisplayDate(followupDate)}</span>
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
              title="انقر لاختيار موعد الاستشارة من التقويم"
            />
            {followupDate ? (
              <span className="text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">check_circle</span>
                <span>الموعد المختار: {formatDisplayDate(followupDate)}</span>
              </span>
            ) : (
              <span className="text-slate-400 dark:text-[#859394] text-[11px] block">
                لم يتم تحديد موعد متابعة بعد. يرجى اختيار موعد من الخيارات السريعة أو التقويم.
              </span>
            )}
          </div>
        </div>

        {/* Dietary and lifestyle advice presets */}
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-800 dark:text-[#dde2f5] block">
              اختر الإرشادات المجهزة مسبقاً من القائمة المنسدلة:
            </label>

            {/* Dropdown menu for presets */}
            <select
              value={selectedDropdownPreset}
              onChange={handleSelectFromDropdown}
              className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-xl border border-indigo-200 dark:border-indigo-900/40 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer font-bold"
            >
              <option value="">-- اضغط لاختيار نمط حياة أو إرشاد طبي مجهز --</option>
              {advicePresets.map((preset, idx) => (
                <option key={idx} value={preset}>
                  {selectedPresets.includes(preset) ? '✓ ' : '+ '} {preset}
                </option>
              ))}
            </select>
          </div>

          {/* Selected presets tags */}
          {selectedPresets.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1 max-h-32 overflow-y-auto pr-1">
              {selectedPresets.map((preset, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-950 dark:text-[#dde2f5] font-bold text-[11px] border border-indigo-200 dark:border-indigo-800 flex items-center gap-1.5 transition-all"
                >
                  <span>{preset}</span>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = selectedPresets.filter((p) => p !== preset);
                      setSelectedPresets(updated);
                      onChangeLifestyleAdvice(updated.map((item) => `• ${item}`).join('\n'));
                    }}
                    className="text-rose-500 hover:text-rose-700 font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Form to add custom lifestyle advice */}
          <form onSubmit={handleAddCustomAdvice} className="flex items-center gap-1.5 pt-1">
            <input
              type="text"
              value={customAdviceInput}
              onChange={(e) => setCustomAdviceInput(e.target.value)}
              placeholder="إضافة نمط / تعليمات غير مدرجة..."
              className="flex-1 bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <button
              type="submit"
              className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer transition-all shrink-0"
            >
              + إضافة نمط
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

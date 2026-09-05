import React, { useState } from 'react';

interface FollowupCardProps {
  freeFollowupDays?: number;
  followupDate: string;
  onChangeFollowupDate: (date: string) => void;
  lifestyleAdvice: string;
  onChangeLifestyleAdvice: (advice: string) => void;
}

const ADVICE_PRESETS = [
  'الامتناع التام عن الأطعمة الدسمة، الحارة، المقليات، والمشروبات الغازية.',
  'تقليل استهلاك ملح الطعام والمخللات إلى أقل من 2 جرام صوديوم يومياً.',
  'الامتناع عن السكريات والحلويات الصريحة والعصائر المحلاة والمخبوزات البيضاء.',
  'عدم الاستلقاء أو النوم مباشرة بعد تناول الطعام لمدة ساعتين على الأقل.',
  'شرب ما لا يقل عن 2.5 إلى 3 لترات ماء يومياً لحماية الكلى وتحسين التروية.',
  'ممارسة رياضة المشي المنتظم 30 دقيقة يومياً لمدة 5 أيام أسبوعياً.',
];

export const FollowupCard: React.FC<FollowupCardProps> = ({
  freeFollowupDays = 14,
  followupDate,
  onChangeFollowupDate,
  lifestyleAdvice,
  onChangeLifestyleAdvice,
}) => {
  const [selectedPresets, setSelectedPresets] = useState<string[]>([ADVICE_PRESETS[0], ADVICE_PRESETS[3]]);

  const setPresetDate = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    const dateString = d.toISOString().split('T')[0];
    onChangeFollowupDate(dateString);
  };

  const toggleAdvicePreset = (advice: string) => {
    let updated: string[];
    if (selectedPresets.includes(advice)) {
      updated = selectedPresets.filter((a) => a !== advice);
    } else {
      updated = [...selectedPresets, advice];
    }
    setSelectedPresets(updated);
    onChangeLifestyleAdvice(updated.join('\n• '));
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
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-800 dark:text-[#dde2f5] block">
            موعد الاستشارة القادمة:
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPresetDate(7)}
              className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-[#080e1b] hover:bg-slate-100 border border-slate-200 dark:border-white/5 text-xs text-slate-700 dark:text-[#dde2f5] font-medium transition-colors cursor-pointer"
            >
              بعد أسبوع (7 أيام)
            </button>
            <button
              type="button"
              onClick={() => setPresetDate(freeFollowupDays)}
              className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-800/40 text-xs text-indigo-700 dark:text-indigo-300 font-bold transition-colors cursor-pointer"
            >
              بعد {freeFollowupDays} يوماً (استشارة مجانية)
            </button>
            <button
              type="button"
              onClick={() => setPresetDate(30)}
              className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-[#080e1b] hover:bg-slate-100 border border-slate-200 dark:border-white/5 text-xs text-slate-700 dark:text-[#dde2f5] font-medium transition-colors cursor-pointer"
            >
              بعد شهر (30 يوماً)
            </button>
          </div>

          <div className="pt-2">
            <input
              type="date"
              value={followupDate}
              onChange={(e) => onChangeFollowupDate(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/5 focus:outline-none"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              طبقاً للائحة العيادة، الاستشارة خلال {freeFollowupDays} يوماً تكون مجانية بقيمة 0 ج.م.
            </span>
          </div>
        </div>

        {/* Dietary and lifestyle advice presets */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-800 dark:text-[#dde2f5] block">
            إرشادات ونمط حياة المريض (انقر لاختيار التعليمات):
          </label>
          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
            {ADVICE_PRESETS.map((advice, i) => {
              const isSelected = selectedPresets.includes(advice);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleAdvicePreset(advice)}
                  className={`w-full text-right p-2 rounded-xl text-xs transition-all flex items-start gap-2 border cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800/40 text-indigo-900 dark:text-[#dde2f5]'
                      : 'bg-slate-50 dark:bg-[#080e1b] border-slate-200 dark:border-white/5 text-slate-600 dark:text-[#bbc9ca] hover:bg-slate-100'
                  }`}
                >
                  <span className={`material-symbols-outlined text-sm shrink-0 ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`}>
                    {isSelected ? 'check_box' : 'check_box_outline_blank'}
                  </span>
                  <span className="leading-tight">{advice}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';

interface VitalsData {
  bp: string;
  pulse: string;
  temp: string;
  rbs: string;
  weight: string;
  height: string;
  spo2: string;
}

interface VitalsCardProps {
  initialVitals?: Partial<VitalsData>;
  onSave?: (vitals: VitalsData) => void;
}

export const VitalsCard: React.FC<VitalsCardProps> = ({ initialVitals, onSave }) => {
  const [vitals, setVitals] = useState<VitalsData>({
    bp: initialVitals?.bp || '135/85',
    pulse: initialVitals?.pulse || '78',
    temp: initialVitals?.temp || '37.1',
    rbs: initialVitals?.rbs || '142',
    weight: initialVitals?.weight || '84.5',
    height: initialVitals?.height || '175',
    spo2: initialVitals?.spo2 || '98',
  });
  const [savedFeedback, setSavedFeedback] = useState(false);

  const weightNum = parseFloat(vitals.weight) || 0;
  const heightM = (parseFloat(vitals.height) || 0) / 100;
  const bmi = heightM > 0 && weightNum > 0 ? (weightNum / (heightM * heightM)).toFixed(1) : null;

  const handleUpdate = (field: keyof VitalsData, val: string) => {
    setVitals((prev) => ({ ...prev, [field]: val }));
  };

  const handleSave = () => {
    if (onSave) onSave(vitals);
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2500);
  };

  return (
    <div className="bg-white dark:bg-[#111A2E] p-5 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-[#00c2cb]/15 text-[#008f97] dark:text-[#00c2cb] flex items-center justify-center">
            <span className="material-symbols-outlined text-lg">monitoring</span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-[#dde2f5]">
              العلامات الحيوية والقياسات البدنية (Vital Signs & BMI)
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-[#859394]">
              تسجيل ومتابعة المؤشرات الحيوية اللحظية للمريض
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {savedFeedback && (
            <span className="text-[11px] font-bold text-emerald-600 dark:text-[#10B981] flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">check</span>
              <span>تم الحفظ</span>
            </span>
          )}
          <button
            type="button"
            onClick={handleSave}
            className="px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-[#00c2cb]/15 text-[#008f97] dark:text-[#00c2cb] hover:bg-teal-100 text-xs font-bold transition-all cursor-pointer"
          >
            تثبيت القياسات
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* Blood Pressure */}
        <div className="bg-slate-50 dark:bg-[#080e1b] p-3 rounded-xl border border-slate-200 dark:border-white/5 flex flex-col gap-1">
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-[#859394]">
            <span>الضغط (BP)</span>
            <span className="w-2 h-2 rounded-full bg-amber-500" title="مرتفع طفيف"></span>
          </div>
          <div className="flex items-baseline gap-1">
            <input
              type="text"
              value={vitals.bp}
              onChange={(e) => handleUpdate('bp', e.target.value)}
              className="w-full bg-transparent text-slate-900 dark:text-[#45dee7] font-mono font-bold text-base focus:outline-none"
            />
            <span className="text-[10px] text-slate-400">mmHg</span>
          </div>
        </div>

        {/* Pulse */}
        <div className="bg-slate-50 dark:bg-[#080e1b] p-3 rounded-xl border border-slate-200 dark:border-white/5 flex flex-col gap-1">
          <span className="text-[11px] text-slate-500 dark:text-[#859394]">النبض (HR)</span>
          <div className="flex items-baseline gap-1">
            <input
              type="text"
              value={vitals.pulse}
              onChange={(e) => handleUpdate('pulse', e.target.value)}
              className="w-full bg-transparent text-slate-900 dark:text-[#45dee7] font-mono font-bold text-base focus:outline-none"
            />
            <span className="text-[10px] text-slate-400">bpm</span>
          </div>
        </div>

        {/* Temperature */}
        <div className="bg-slate-50 dark:bg-[#080e1b] p-3 rounded-xl border border-slate-200 dark:border-white/5 flex flex-col gap-1">
          <span className="text-[11px] text-slate-500 dark:text-[#859394]">الحرارة (Temp)</span>
          <div className="flex items-baseline gap-1">
            <input
              type="text"
              value={vitals.temp}
              onChange={(e) => handleUpdate('temp', e.target.value)}
              className="w-full bg-transparent text-slate-900 dark:text-[#45dee7] font-mono font-bold text-base focus:outline-none"
            />
            <span className="text-[10px] text-slate-400">°C</span>
          </div>
        </div>

        {/* Blood Sugar */}
        <div className="bg-slate-50 dark:bg-[#080e1b] p-3 rounded-xl border border-slate-200 dark:border-white/5 flex flex-col gap-1">
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-[#859394]">
            <span>السكر (RBS)</span>
            <span className="w-2 h-2 rounded-full bg-purple-500"></span>
          </div>
          <div className="flex items-baseline gap-1">
            <input
              type="text"
              value={vitals.rbs}
              onChange={(e) => handleUpdate('rbs', e.target.value)}
              className="w-full bg-transparent text-purple-700 dark:text-[#d0bcff] font-mono font-bold text-base focus:outline-none"
            />
            <span className="text-[10px] text-slate-400">mg/dl</span>
          </div>
        </div>

        {/* Weight */}
        <div className="bg-slate-50 dark:bg-[#080e1b] p-3 rounded-xl border border-slate-200 dark:border-white/5 flex flex-col gap-1">
          <span className="text-[11px] text-slate-500 dark:text-[#859394]">الوزن (Weight)</span>
          <div className="flex items-baseline gap-1">
            <input
              type="text"
              value={vitals.weight}
              onChange={(e) => handleUpdate('weight', e.target.value)}
              className="w-full bg-transparent text-sky-600 dark:text-[#38BDF8] font-mono font-bold text-base focus:outline-none"
            />
            <span className="text-[10px] text-slate-400">kg</span>
          </div>
        </div>

        {/* Height */}
        <div className="bg-slate-50 dark:bg-[#080e1b] p-3 rounded-xl border border-slate-200 dark:border-white/5 flex flex-col gap-1">
          <span className="text-[11px] text-slate-500 dark:text-[#859394]">الطول (Height)</span>
          <div className="flex items-baseline gap-1">
            <input
              type="text"
              value={vitals.height}
              onChange={(e) => handleUpdate('height', e.target.value)}
              className="w-full bg-transparent text-sky-600 dark:text-[#38BDF8] font-mono font-bold text-base focus:outline-none"
            />
            <span className="text-[10px] text-slate-400">cm</span>
          </div>
        </div>

        {/* SpO2 & BMI */}
        <div className="bg-slate-50 dark:bg-[#080e1b] p-3 rounded-xl border border-slate-200 dark:border-white/5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-[#859394]">
            <span>الأكسجين SpO2</span>
            <span className="font-mono font-bold text-emerald-600 dark:text-[#10B981]">{vitals.spo2}%</span>
          </div>
          <div className="text-[11px] font-semibold text-slate-700 dark:text-[#bbc9ca] flex items-center justify-between pt-1 border-t border-slate-200 dark:border-white/5">
            <span>كتلة الجسم BMI:</span>
            <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{bmi || '--'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

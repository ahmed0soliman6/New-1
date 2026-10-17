import React, { useState } from 'react';
import { READ_OPT } from '../../config/readOpt';

export function ReadOptCard() {
  const [sessionReads, setSessionReads] = useState<number | null>(() => {
    if (typeof window !== 'undefined' && typeof (window as any).__soliReads === 'function') {
      return (window as any).__soliReads();
    }
    return 0;
  });

  const isMeterActive = (() => {
    try {
      return localStorage.getItem('soli_read_meter') === '1';
    } catch {
      return false;
    }
  })();

  const handleToggleReadOpt = () => {
    try {
      localStorage.setItem('soli_read_opt', READ_OPT ? '0' : '1');
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
    window.location.reload();
  };

  const handleEnableMeter = () => {
    try {
      localStorage.setItem('soli_read_meter', '1');
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
    window.location.reload();
  };

  const handleFetchReads = () => {
    if (typeof window !== 'undefined' && typeof (window as any).__soliReads === 'function') {
      const count = (window as any).__soliReads();
      setSessionReads(count);
    } else {
      setSessionReads(0);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111A2E] p-5 space-y-5 shadow-sm" dir="rtl">
      {/* Top Title & Status Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 dark:text-[#00c2cb] flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-xl">speed</span>
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <span>وضع توفير القراءات وعداد الاستهلاك</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-[#859394] mt-0.5">
              عند التفعيل يحمّل النظام بيانات اليوم والأمس فقط ويجلب التاريخ القديم عند الطلب
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div className="self-start sm:self-auto">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
              READ_OPT
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                : 'bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-400 border-slate-200 dark:border-white/10'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                READ_OPT ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
              }`}
            />
            <span>وضع توفير القراءات: {READ_OPT ? 'مفعّل' : 'مطفأ'}</span>
          </span>
        </div>
      </div>

      {/* Reads Display Box */}
      <div className="bg-slate-50 dark:bg-[#080E1B] p-4 rounded-xl border border-slate-200/80 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs text-slate-500 dark:text-[#859394]">
            عدد القراءات المقدرة لهذه الجلسة:
          </div>
          <div className="text-3xl font-black text-teal-600 dark:text-[#00c2cb] font-mono tracking-tight">
            {sessionReads !== null ? sessionReads.toLocaleString('en-US') : '—'}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-[#859394] pt-0.5">
            الحد المجاني اليومي 50,000 قراءة. هذا الرقم تقدير للجلسة الحالية فقط
          </p>
        </div>

        <button
          type="button"
          onClick={handleFetchReads}
          className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-[#18233C] hover:bg-slate-300 dark:hover:bg-[#202E4C] text-slate-800 dark:text-[#dde2f5] font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-2 shrink-0 self-start sm:self-center"
        >
          <span className="material-symbols-outlined text-base">refresh</span>
          <span>تحديث العداد</span>
        </button>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-slate-100 dark:border-white/5">
        <button
          type="button"
          onClick={handleToggleReadOpt}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-colors cursor-pointer flex items-center gap-2 shadow-xs ${
            READ_OPT
              ? 'bg-rose-600 hover:bg-rose-700 text-white'
              : 'bg-[#00c2cb] hover:bg-[#45dee7] text-slate-950'
          }`}
        >
          <span className="material-symbols-outlined text-base">
            {READ_OPT ? 'power_settings_new' : 'bolt'}
          </span>
          <span>{READ_OPT ? 'إيقاف وضع التوفير' : 'تفعيل وضع التوفير'}</span>
        </button>

        <button
          type="button"
          onClick={handleEnableMeter}
          className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-[#18233C] hover:bg-slate-200 dark:hover:bg-[#202E4C] text-slate-700 dark:text-[#dde2f5] font-bold text-xs transition-colors cursor-pointer flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-base">analytics</span>
          <span>تشغيل عدّاد القراءات</span>
          {isMeterActive && (
            <span className="text-[10px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded font-mono">
              مفعّل
            </span>
          )}
        </button>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  className?: string;
  compact?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ className = '', compact = false }) => {
  const { isInstallable, isInstalled, isIOS, canInstallPrompt, installApp } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);

  // If already installed as standalone PWA app, hide button
  if (isInstalled) {
    return null;
  }

  // Handle Chrome / Edge / Android native prompt
  const handleInstallClick = async () => {
    if (canInstallPrompt) {
      await installApp();
    } else if (isIOS) {
      setShowIOSModal(true);
    } else {
      setShowIOSModal(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleInstallClick}
        title="تثبيت سولي ميديكال كتطبيق ويب سريع ومستقل على هاتفك أو حاسوبك"
        className={`group relative flex items-center gap-2 rounded-xl font-bold transition-all cursor-pointer select-none active:scale-95 shadow-sm ${
          compact
            ? 'px-2.5 py-1.5 text-xs bg-gradient-to-r from-teal-500 to-[#00c2cb] text-slate-950 hover:brightness-110'
            : 'w-full px-3 py-2 text-xs bg-gradient-to-r from-teal-500/20 via-[#00c2cb]/20 to-cyan-500/20 hover:from-teal-500/30 hover:to-cyan-500/30 text-teal-300 border border-[#00c2cb]/40'
        } ${className}`}
      >
        <div className="w-6 h-6 rounded-lg bg-teal-500/30 flex items-center justify-center shrink-0 text-teal-300 group-hover:scale-110 transition-transform">
          <span className="material-symbols-outlined text-base">install_mobile</span>
        </div>
        <div className="flex-1 text-right min-w-0">
          <span className="block truncate font-bold text-[12px] text-teal-200">
            {compact ? 'تثبيت التطبيق' : 'تثبيت كـ تطبيق ويب (PWA)'}
          </span>
          {!compact && (
            <span className="block text-[10px] text-slate-400 font-normal truncate">
              وصول مباشر وسريع من الشاشة الرئيسية
            </span>
          )}
        </div>
        <span className="material-symbols-outlined text-sm text-teal-400 opacity-80 group-hover:translate-x-[-2px] transition-transform">
          arrow_back
        </span>
      </button>

      {/* iOS / General Manual Installation Guide Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-white/10 p-6 shadow-2xl text-right text-slate-800 dark:text-[#dde2f5] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
              <div className="flex items-center gap-2.5 text-teal-600 dark:text-[#00c2cb]">
                <span className="material-symbols-outlined text-2xl">app_shortcut</span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  تثبيت سولي ميديكال على الشاشة الرئيسية
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSModal(false)}
                className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 flex items-center justify-center text-slate-400 cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="space-y-3 text-xs leading-relaxed">
              <div className="p-3.5 rounded-xl bg-teal-50 dark:bg-[#00c2cb]/10 border border-teal-200 dark:border-[#00c2cb]/20 text-slate-700 dark:text-[#dde2f5]">
                <p className="font-semibold mb-1 text-teal-700 dark:text-[#00c2cb]">
                  💡 كيفية تثبيت التطبيق على الهواتف والأجهزة:
                </p>
                <ul className="space-y-2 mt-2 list-disc list-inside">
                  <li>
                    <strong>على هواتف آيفون (Safari):</strong> انقر على زر المشاركة <span className="inline-block px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 rounded font-mono font-bold">Share ⎋</span> في شريط السفاري بالأسفل، ثم اختر <strong>"إضافة إلى الشاشة الرئيسية" (Add to Home Screen)</strong>.
                  </li>
                  <li>
                    <strong>على أندرويد (Chrome):</strong> انقر على قائمة الخيارات (الثلاث نقاط ⋮) بالأعلى واختر <strong>"تثبيت التطبيق" (Install App)</strong> أو "إضافة إلى الشاشة الرئيسية".
                  </li>
                  <li>
                    <strong>على الكمبيوتر (Chrome / Edge):</strong> انقر على أيقونة التثبيت <span className="font-bold text-teal-500">⊕</span> الموجودة في أقصى شريط العنوان (URL bar) بالأعلى.
                  </li>
                </ul>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#080e1b] border border-slate-200 dark:border-white/5 text-[11px] text-slate-500 dark:text-[#859394]">
                ✨ التطبيق يعمل بشكل فوري، ويدعم العمل دون اتصال بالإنترنت (Offline-Ready) مع التحديث اللحظي للبيانات.
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIOSModal(false)}
              className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs cursor-pointer shadow-sm transition-all"
            >
              فهمت، إغلاق النافذة
            </button>
          </div>
        </div>
      )}
    </>
  );
};

import React, { useState } from 'react';
import { usePermissions } from '../context/AuthContext';
import { PermissionGate } from './auth/PermissionGate';

interface HeaderProps {
  onOpenDatabaseInspector?: () => void;
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenDatabaseInspector,
  onToggleMobileMenu,
}) => {
  const { role } = usePermissions();
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <header className="fixed top-0 right-0 lg:right-72 left-0 h-16 bg-white/95 dark:bg-[#0d1320]/90 backdrop-blur-xl border-b border-slate-200 dark:border-white/5 z-40 flex items-center justify-between px-3 sm:px-6 transition-colors">
      {/* Right Side: Mobile Hamburger & Live Connected Status Badge */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mobile Menu Toggle Button */}
        <button
          type="button"
          onClick={onToggleMobileMenu}
          className="lg:hidden w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#161b29] dark:hover:bg-[#242a38] text-slate-700 dark:text-[#bbc9ca] flex items-center justify-center border border-slate-200 dark:border-white/5 cursor-pointer shrink-0"
          aria-label="فتح القائمة الجانبية"
        >
          <span className="material-symbols-outlined text-xl">menu</span>
        </button>

        {/* Live System Status Always Visible in Top Header */}
        <div className="flex items-center gap-2 bg-emerald-500/10 dark:bg-[#18233C] px-3 py-1.5 rounded-xl border border-emerald-500/20 dark:border-[#00c2cb]/20">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 dark:bg-[#00c2cb] animate-pulse"></span>
          <span className="text-xs text-emerald-700 dark:text-[#45dee7] font-bold">النظام متصل بالسحابة</span>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 text-slate-400 dark:text-[#bbc9ca] text-xs font-medium mr-2">
          <span className="material-symbols-outlined text-base">calendar_today</span>
          <span>اليوم، {new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
      </div>

      {/* Left Side: Database Inspector & Notifications */}
      <div className="flex items-center gap-2 sm:gap-3">
        {onOpenDatabaseInspector && (
          <PermissionGate permission="roles.manage">
            <button
              onClick={onOpenDatabaseInspector}
              title="استعراض هيكل قاعدة البيانات والمجموعات والمخطط الإكلينيكي"
              className="hidden sm:flex items-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-bold text-xs px-3 py-2 rounded-xl border border-emerald-500/30 transition-all cursor-pointer active:scale-95"
            >
              <span className="material-symbols-outlined text-base">database</span>
              <span>معمارية البيانات</span>
            </button>
          </PermissionGate>
        )}

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#161b29] dark:hover:bg-[#242a38] text-slate-700 hover:text-slate-900 dark:text-[#bbc9ca] dark:hover:text-[#dde2f5] flex items-center justify-center transition-colors relative border border-slate-200 dark:border-white/5 cursor-pointer"
            aria-label="التنبيهات"
          >
            <span className="material-symbols-outlined text-xl">notifications</span>
            <span className="absolute -top-1 -left-1 px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold animate-pulse">
              1
            </span>
          </button>

          {showNotifications && (
            <div className="absolute left-0 mt-2 w-72 sm:w-80 bg-white dark:bg-[#18233C] border border-slate-200 dark:border-[#00c2cb]/30 rounded-2xl shadow-2xl p-3 z-50 animate-in fade-in text-right">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/10">
                <span className="text-xs font-bold text-slate-900 dark:text-[#dde2f5]">تنبيهات العيادة الفورية</span>
                <span className="text-[10px] text-[#008f97] dark:text-[#00c2cb] font-mono">1 غير مقروء</span>
              </div>
              <div className="py-2.5 flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#00c2cb]/20 text-[#008f97] dark:text-[#00c2cb] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-base">biotech</span>
                </div>
                <div className="text-xs">
                  <p className="font-semibold text-slate-900 dark:text-[#dde2f5]">نتيجة تحليل إنزيمات قلب عاجلة</p>
                  <p className="text-[11px] text-slate-500 dark:text-[#bbc9ca] mt-0.5">
                    وصلت نتيجة المريض <strong>أحمد محمد إبراهيم</strong> (تذكرة #08) من معمل البرج.
                  </p>
                  <span className="text-[10px] text-slate-400 dark:text-[#859394] font-mono">منذ 4 دقائق</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

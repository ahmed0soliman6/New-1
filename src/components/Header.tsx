import React, { useState } from 'react';
import { CLINIC_INFO } from '../data/previewClinicData';
import { usePermissions } from '../context/AuthContext';
import { PermissionGate } from './auth/PermissionGate';
import { ROLE_LABELS } from '../permissions';

interface HeaderProps {
  onOpenNewVisit: () => void;
  onOpenNewAppointment: () => void;
  onOpenDatabaseInspector?: () => void;
  selectedBranch: string;
  onSelectBranch: (branchId: string) => void;
  isDark?: boolean;
  onToggleTheme?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenNewVisit,
  onOpenNewAppointment,
  onOpenDatabaseInspector,
  selectedBranch,
  onSelectBranch,
  isDark: externalIsDark,
  onToggleTheme: externalToggleTheme,
}) => {
  const { role, userProfile } = usePermissions();
  const [internalIsDark, setInternalIsDark] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const isDark = externalIsDark !== undefined ? externalIsDark : internalIsDark;
  const roleLabel = ROLE_LABELS[role] || role;

  const rolePillClass =
    role === 'admin'
      ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/20'
      : role === 'doctor'
      ? 'bg-[#00c2cb]/15 text-[#008f97] dark:text-[#45dee7] border border-[#00c2cb]/20'
      : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20';

  const toggleTheme = () => {
    if (externalToggleTheme) {
      externalToggleTheme();
    } else {
      const next = !internalIsDark;
      setInternalIsDark(next);
      if (next) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  };

  return (
    <header className="fixed top-0 right-72 left-0 h-16 bg-white/95 dark:bg-[#0d1320]/90 backdrop-blur-xl border-b border-slate-200 dark:border-white/5 z-40 flex items-center justify-between px-6 transition-colors">
      {/* Branch & Date */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-[#161b29] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/5">
          <span className="material-symbols-outlined text-[#008f97] dark:text-[#00c2cb] text-xl">location_on</span>
          <select
            value={selectedBranch}
            onChange={(e) => onSelectBranch(e.target.value)}
            className="bg-transparent text-slate-800 dark:text-[#dde2f5] text-xs font-semibold focus:outline-none cursor-pointer pr-1"
          >
            {CLINIC_INFO.branches.map((branch) => (
              <option key={branch.id} value={branch.id} className="bg-white dark:bg-[#161b29] text-slate-800 dark:text-[#dde2f5]">
                {branch.name}
              </option>
            ))}
          </select>
        </div>

        <div className="hidden xl:flex items-center gap-1.5 text-slate-500 dark:text-[#bbc9ca] text-xs font-medium">
          <span className="material-symbols-outlined text-base">calendar_today</span>
          <span>الأحد، 15 أكتوبر 2024</span>
        </div>
      </div>

      {/* Action Buttons & Profile */}
      <div className="flex items-center gap-3">
        {/* Fast Action Buttons */}
        <div className="flex items-center gap-2">
          {onOpenDatabaseInspector && (
            <PermissionGate permission="roles.manage">
              <button
                onClick={onOpenDatabaseInspector}
                title="استعراض هيكل قاعدة البيانات والمجموعات والمخطط الإكلينيكي"
                className="hidden lg:flex items-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-bold text-xs px-3 py-2 rounded-xl border border-emerald-500/30 transition-all cursor-pointer active:scale-95"
              >
                <span className="material-symbols-outlined text-base">database</span>
                <span>معمارية قاعدة البيانات</span>
              </button>
            </PermissionGate>
          )}

          <PermissionGate permission="visits.create">
            <button
              onClick={onOpenNewVisit}
              className="flex items-center gap-1.5 bg-[#00c2cb] hover:bg-[#45dee7] text-[#08101C] font-bold text-xs px-3.5 py-2 rounded-xl shadow-md shadow-[#00c2cb]/20 transition-all cursor-pointer active:scale-95"
            >
              <span className="material-symbols-outlined text-lg">person_add</span>
              <span>+ تسجيل زيارة جديدة</span>
            </button>
          </PermissionGate>

          <PermissionGate permission="appointments.create">
            <button
              onClick={onOpenNewAppointment}
              className="flex items-center gap-1.5 bg-purple-100 hover:bg-purple-200 dark:bg-[#571bc1]/60 dark:hover:bg-[#571bc1] text-purple-900 dark:text-[#e9ddff] font-bold text-xs px-3.5 py-2 rounded-xl border border-purple-200 dark:border-[#d0bcff]/20 transition-all cursor-pointer active:scale-95"
            >
              <span className="material-symbols-outlined text-lg">calendar_add_on</span>
              <span>+ إضافة موعد</span>
            </button>
          </PermissionGate>
        </div>

        {/* Dark/Light mode toggle */}
        <button
          onClick={toggleTheme}
          aria-label={isDark ? 'تفعيل الوضع النهاري' : 'تفعيل الوضع الليلي'}
          title={isDark ? 'تفعيل الوضع النهاري' : 'تفعيل الوضع الليلي'}
          className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#161b29] dark:hover:bg-[#242a38] text-slate-700 hover:text-[#008f97] dark:text-[#bbc9ca] dark:hover:text-[#00c2cb] flex items-center justify-center transition-all cursor-pointer border border-slate-200 dark:border-white/5"
        >
          <span className="material-symbols-outlined text-xl">
            {isDark ? 'light_mode' : 'dark_mode'}
          </span>
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#161b29] dark:hover:bg-[#242a38] text-slate-700 hover:text-slate-900 dark:text-[#bbc9ca] dark:hover:text-[#dde2f5] flex items-center justify-center transition-colors relative border border-slate-200 dark:border-white/5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-xl">notifications</span>
            <span className="absolute -top-1 -left-1 px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold animate-pulse">
              1
            </span>
          </button>

          {showNotifications && (
            <div className="absolute left-0 mt-2 w-80 bg-white dark:bg-[#18233C] border border-slate-200 dark:border-[#00c2cb]/30 rounded-2xl shadow-2xl p-3 z-50 animate-in fade-in text-right">
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

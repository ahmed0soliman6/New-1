import React from 'react';
import { ScreenType } from '../types';
import { CLINIC_INFO } from '../data/previewClinicData';
import { usePermissions } from '../context/AuthContext';
import { ROLE_LABELS } from '../permissions';

interface SidebarProps {
  activeScreen: ScreenType;
  onNavigate: (screen: ScreenType) => void;
  queueCount: number;
  onLogout: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeScreen,
  onNavigate,
  queueCount,
  onLogout,
  isOpenMobile = false,
  onCloseMobile,
  isDark,
  onToggleTheme,
}) => {
  const { role, userProfile, canAccess } = usePermissions();
  const [doctorStatus, setDoctorStatus] = React.useState<'available' | 'break'>('available');

  const allNavItems: { id: ScreenType; label: string; icon: string; badge?: number | string }[] = [
    { id: 'dashboard', label: 'لوحة التحكم', icon: 'space_dashboard' },
    { id: 'new-visit', label: 'تسجيل زيارة جديدة', icon: 'person_add' },
    { id: 'waiting-queue', label: 'المرضى في الانتظار', icon: 'hourglass_top', badge: queueCount },
    { id: 'clinical-exam', label: 'الكشف الطبي للغرفة', icon: 'stethoscope', badge: 'نشط' },
    { id: 'upcoming-followups', label: 'المتابعة القادمة والمواعيد', icon: 'event_repeat' },
    { id: 'patient-records', label: 'ملفات المرضى (EMR)', icon: 'folder_shared' },
    { id: 'billing-payments', label: 'الفواتير والمدفوعات', icon: 'receipt_long' },
    { id: 'clinical-reports', label: 'التقارير والإحصائيات', icon: 'analytics' },
    { id: 'prescriptions-catalog', label: 'الوصفات والبروتوكولات', icon: 'medication' },
    { id: 'prescription-pad', label: 'الروشتة الإلكترونية (A5)', icon: 'prescriptions' },
    { id: 'system-settings', label: 'إعدادات النظام والأدلة', icon: 'settings' },
  ];

  // Dynamically filter items according to the user's allowed screens configured in Firestore
  const navItems = allNavItems.filter((item) => canAccess(item.id));

  const roleLabel = ROLE_LABELS[role] || role;

  const roleBadgeStyle =
    role === 'admin'
      ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-500/40'
      : role === 'doctor'
      ? 'bg-teal-100 dark:bg-[#00c2cb]/20 text-teal-800 dark:text-[#45dee7] border-teal-300 dark:border-[#00c2cb]/40'
      : 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-500/40';

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 lg:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed right-0 top-0 h-full w-72 bg-white dark:bg-[#111A2E] text-slate-800 dark:text-[#dde2f5] border-l border-slate-200 dark:border-white/5 z-50 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpenMobile ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-4 flex items-center justify-between bg-slate-50 dark:bg-[#080e1b] border-b border-slate-200 dark:border-white/5">
          <div className="flex items-center gap-2.5">
            <img
              alt="Soli Medical Clinic"
              className="h-8 w-auto object-contain rounded"
              src={CLINIC_INFO.logoUrl}
            />
            <div className="flex flex-col">
              <span className="text-base text-teal-700 dark:text-[#45dee7] font-bold tracking-tight leading-tight">
                سولي ميديكال
              </span>
              <span className="text-[11px] text-slate-500 dark:text-[#bbc9ca] leading-none">
                Soli Medical Clinic
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Theme Toggle Button placed in Header of Sidebar */}
            <button
              type="button"
              onClick={onToggleTheme}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#18233C] hover:bg-slate-100 dark:hover:bg-[#242a38] text-slate-700 dark:text-[#45dee7] border border-slate-300 dark:border-[#00c2cb]/30 transition-all cursor-pointer text-xs font-semibold shadow-xs active:scale-95"
              title={isDark ? 'تفعيل الوضع النهاري' : 'تفعيل الوضع الليلي'}
            >
              <span className="material-symbols-outlined text-base text-amber-500 dark:text-[#00c2cb]">
                {isDark ? 'light_mode' : 'dark_mode'}
              </span>
              <span className="text-[11px] font-bold">
                {isDark ? 'نهاري' : 'ليلي'}
              </span>
            </button>

            {/* Mobile close button */}
            <button
              type="button"
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10"
              aria-label="إغلاق القائمة"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          {navItems.map((item) => {
            const isActive = activeScreen === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  if (onCloseMobile) onCloseMobile();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-right transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-teal-50 dark:bg-[#18233C] text-[#008f97] dark:text-[#45dee7] font-bold shadow-xs relative before:absolute before:right-0 before:top-1/2 before:-translate-y-1/2 before:w-1.5 before:h-6 before:bg-[#00c2cb] before:rounded-l-full'
                    : 'text-slate-600 dark:text-[#bbc9ca] hover:bg-slate-100 dark:hover:bg-[#161b29] hover:text-slate-900 dark:hover:text-[#dde2f5]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="material-symbols-outlined text-xl"
                    style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
                  >
                    {item.icon}
                  </span>
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-bold font-mono ${
                      isActive
                        ? 'bg-[#00c2cb] text-[#08101C]'
                        : typeof item.badge === 'string'
                        ? 'bg-purple-100 dark:bg-[#571bc1]/40 text-purple-700 dark:text-[#d0bcff]'
                        : 'bg-slate-200 dark:bg-[#18233C] text-slate-700 dark:text-[#45dee7]'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Doctor Availability, User Identity & Logout */}
        <div className="p-3 bg-slate-50 dark:bg-[#080e1b] border-t border-slate-200 dark:border-white/5 space-y-2.5">
          {role !== 'secretary' && (
            <div className="p-2 rounded-xl bg-white dark:bg-[#111A2E] flex items-center justify-between border border-slate-200 dark:border-white/5 shadow-xs">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ring-2 ${
                    doctorStatus === 'available'
                      ? 'bg-emerald-500 ring-emerald-500/30'
                      : 'bg-amber-400 ring-amber-400/30'
                  }`}
                ></span>
                <span className="text-xs font-semibold text-slate-800 dark:text-[#dde2f5]">
                  {doctorStatus === 'available' ? 'متاح للكشف' : 'في استراحة'}
                </span>
              </div>
              <button
                onClick={() =>
                  setDoctorStatus((prev) => (prev === 'available' ? 'break' : 'available'))
                }
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-[#18233C] dark:hover:bg-[#242a38] text-slate-600 dark:text-[#bbc9ca] hover:text-slate-900 dark:hover:text-[#dde2f5] rounded-lg text-xs font-medium transition-colors cursor-pointer"
              >
                {doctorStatus === 'available' ? 'استراحة' : 'تفعيل'}
              </button>
            </div>
          )}

          {/* User Identity (Clean, No Image) + Logout */}
          <div className="p-2.5 rounded-xl bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-white/5 shadow-xs flex items-center justify-between gap-2">
            <div className="min-w-0 text-right">
              <div className="text-xs font-bold text-slate-900 dark:text-[#dde2f5] truncate">
                {userProfile?.displayName || userProfile?.username || 'المستخدم'}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] text-slate-400 dark:text-[#859394] font-mono truncate" dir="ltr">
                  @{userProfile?.username || 'user'}
                </span>
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold border shrink-0 ${roleBadgeStyle}`}
                >
                  {roleLabel}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onLogout}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-200 dark:border-red-400/30 bg-red-50 dark:bg-red-400/10 text-xs font-bold text-red-600 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-400/20 transition-colors cursor-pointer shrink-0"
              title="تسجيل الخروج من الحساب"
            >
              <span className="material-symbols-outlined text-sm">logout</span>
              <span>خروج</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

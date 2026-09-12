import React, { useState } from 'react';
import { ScreenType } from '../types';
import { CLINIC_INFO } from '../data/previewClinicData';
import { usePermissions } from '../context/AuthContext';
import { ROLE_LABELS } from '../permissions';
import { SoliMedicalLogo } from './SoliMedicalLogo';

interface SidebarProps {
  activeScreen: ScreenType;
  onNavigate: (screen: ScreenType) => void;
  queueCount: number;
  onLogout: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  doctorStatus?: 'available' | 'break';
  onToggleDoctorStatus?: () => void;
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
  doctorStatus: externalDoctorStatus,
  onToggleDoctorStatus,
}) => {
  const { role, userProfile, canAccess } = usePermissions();
  const [internalDoctorStatus, setInternalDoctorStatus] = useState<'available' | 'break'>('available');
  
  const doctorStatus = externalDoctorStatus || internalDoctorStatus;
  const handleToggleDoctor = () => {
    if (onToggleDoctorStatus) {
      onToggleDoctorStatus();
    } else {
      setInternalDoctorStatus((prev) => (prev === 'available' ? 'break' : 'available'));
    }
  };

  const allNavItems: { id: ScreenType; label: string; icon: string; badge?: number | string }[] = [
    { id: 'dashboard', label: 'لوحة التحكم', icon: 'space_dashboard' },
    { id: 'new-visit', label: 'تسجيل زيارة جديدة', icon: 'person_add' },
    { id: 'waiting-queue', label: 'المرضى في الانتظار', icon: 'hourglass_top', badge: queueCount },
    { id: 'clinical-exam', label: 'الكشف الطبي للغرفة', icon: 'stethoscope', badge: 'نشط' },
    { id: 'upcoming-followups', label: 'المتابعة القادمة والمواعيد', icon: 'event_repeat' },
    { id: 'patient-records', label: 'ملفات المرضى (EMR)', icon: 'folder_shared' },
    { id: 'billing-payments', label: 'الفواتير والمدفوعات', icon: 'receipt_long' },
    { id: 'clinical-reports', label: 'التقارير والإحصائيات', icon: 'analytics' },
    { id: 'prescription-pad', label: 'إعدادات الروشتة والطباعة', icon: 'print' },
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
        className={`fixed right-0 top-0 h-full w-72 bg-[#111A2E] text-[#dde2f5] border-l border-white/10 z-50 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpenMobile ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-3.5 flex items-center justify-between bg-[#080e1b] border-b border-white/10 shrink-0">
          <SoliMedicalLogo size="md" showText={true} glow={true} />

          <div className="flex items-center gap-1.5">
            {/* Theme Toggle Button placed in Header of Sidebar */}
            <button
              type="button"
              onClick={onToggleTheme}
              className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-[#18233C] hover:bg-[#242a38] text-[#45dee7] border border-[#00c2cb]/30 transition-all cursor-pointer text-xs font-semibold shadow-xs active:scale-95"
              title={isDark ? 'تفعيل الوضع النهاري' : 'تفعيل الوضع الليلي'}
            >
              <span className="material-symbols-outlined text-base text-amber-400">
                {isDark ? 'light_mode' : 'dark_mode'}
              </span>
            </button>

            {/* Mobile close button */}
            <button
              type="button"
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              aria-label="إغلاق القائمة"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>
        </div>

        {/* Navigation List - Fixed consistent theme in both light & dark modes with enlarged fonts and breathable spacing */}
        <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-2 bg-[#111A2E]">
          {navItems.map((item) => {
            const isActive = activeScreen === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  if (onCloseMobile) onCloseMobile();
                }}
                className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-right transition-all duration-200 cursor-pointer group ${
                  isActive
                    ? 'bg-[#18233C] text-[#45dee7] font-bold shadow-md relative border-r-4 border-[#00c2cb] scale-[1.01]'
                    : 'text-[#cbd5e1] hover:bg-[#00c2cb]/15 hover:text-[#45dee7] hover:border-r-4 hover:border-[#00c2cb]/70 font-medium'
                }`}
              >
                <div className="flex items-center gap-4">
                  <span
                    className={`material-symbols-outlined text-[22px] transition-colors ${
                      isActive ? 'text-[#00c2cb]' : 'text-slate-400 group-hover:text-[#00c2cb]'
                    }`}
                    style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
                  >
                    {item.icon}
                  </span>
                  <span className="text-[15px] font-bold tracking-wide leading-relaxed">{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-bold font-mono ${
                      isActive
                        ? 'bg-[#00c2cb] text-[#08101C]'
                        : typeof item.badge === 'string'
                        ? 'bg-[#571bc1]/60 text-[#e9ddff]'
                        : 'bg-[#18233C] text-[#45dee7] border border-[#00c2cb]/30'
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
        <div className="p-3 bg-[#080e1b] border-t border-white/10 space-y-2">
          {/* Doctor Availability Indicator & Break Toggle */}
          <div className="p-2 rounded-xl bg-[#111A2E] flex items-center justify-between border border-white/10 shadow-xs">
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ring-2 ${
                  doctorStatus === 'available'
                    ? 'bg-emerald-500 ring-emerald-500/30'
                    : 'bg-amber-400 ring-amber-400/30 animate-pulse'
                }`}
              ></span>
              <span className="text-xs font-semibold text-[#f1f5f9]">
                {doctorStatus === 'available' ? 'الطبيب متاح' : 'الطبيب في استراحة ☕'}
              </span>
            </div>
            {role !== 'secretary' ? (
              <button
                type="button"
                onClick={handleToggleDoctor}
                className="px-2.5 py-1 bg-[#18233C] hover:bg-[#242a38] text-[#cbd5e1] hover:text-white rounded-lg text-xs font-medium transition-colors cursor-pointer border border-white/5"
              >
                {doctorStatus === 'available' ? 'استراحة' : 'تفعيل'}
              </button>
            ) : (
              <span className="text-[10px] text-slate-400 px-1.5 py-0.5 rounded bg-[#18233C]">
                مباشر
              </span>
            )}
          </div>

          {/* User Identity (Clean, No Image) + Logout */}
          <div className="p-2.5 rounded-xl bg-[#111A2E] border border-white/10 shadow-xs flex items-center justify-between gap-2">
            <div className="min-w-0 text-right">
              <div className="text-xs font-bold text-[#f1f5f9] truncate">
                {userProfile?.displayName || userProfile?.username || 'المستخدم'}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] text-slate-400 font-mono truncate" dir="ltr">
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
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-400/40 bg-red-500/15 text-xs font-bold text-red-300 hover:bg-red-500/25 transition-colors cursor-pointer shrink-0"
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

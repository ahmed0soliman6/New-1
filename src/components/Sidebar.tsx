import React from 'react';
import { ScreenType } from '../types';
import { CLINIC_INFO } from '../data/previewClinicData';

interface SidebarProps {
  activeScreen: ScreenType;
  onNavigate: (screen: ScreenType) => void;
  queueCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeScreen, onNavigate, queueCount }) => {
  const [doctorStatus, setDoctorStatus] = React.useState<'available' | 'break'>('available');

  const navItems: { id: ScreenType; label: string; icon: string; badge?: number | string }[] = [
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

  return (
    <aside className="fixed right-0 top-0 h-full w-72 bg-[#111A2E] border-l border-white/5 z-50 flex flex-col shadow-2xl">
      {/* Brand Header */}
      <div className="h-16 px-4 flex items-center justify-between bg-[#080e1b] border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <img
            alt="Soli Medical Clinic"
            className="h-8 w-auto object-contain rounded"
            src={CLINIC_INFO.logoUrl}
          />
          <div className="flex flex-col">
            <span className="text-base text-[#45dee7] font-bold tracking-tight leading-tight">
              سولي ميديكال
            </span>
            <span className="text-[11px] text-[#bbc9ca] leading-none">
              Soli Medical Clinic
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-[#18233C] px-2.5 py-1 rounded-full border border-[#00c2cb]/20">
          <span className="w-2 h-2 rounded-full bg-[#00c2cb] animate-pulse"></span>
          <span className="text-[11px] text-[#45dee7] font-medium">متصل</span>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5">
        {navItems.map((item) => {
          const isActive = activeScreen === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-right transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-[#18233C] text-[#45dee7] font-bold shadow-inner relative before:absolute before:right-0 before:top-1/2 before:-translate-y-1/2 before:w-1.5 before:h-6 before:bg-[#00c2cb] before:rounded-l-full'
                  : 'text-[#bbc9ca] hover:bg-[#161b29] hover:text-[#dde2f5]'
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
                      ? 'bg-[#571bc1]/40 text-[#d0bcff]'
                      : 'bg-[#18233C] text-[#45dee7]'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Doctor Availability & Footer */}
      <div className="p-3 bg-[#080e1b] border-t border-white/5 space-y-2">
        <div className="p-2 rounded-xl bg-[#111A2E] flex items-center justify-between border border-white/5">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ring-2 ${
                doctorStatus === 'available'
                  ? 'bg-[#00c2cb] ring-[#00c2cb]/30'
                  : 'bg-amber-400 ring-amber-400/30'
              }`}
            ></span>
            <span className="text-xs font-semibold text-[#dde2f5]">
              {doctorStatus === 'available' ? 'متاح للكشف' : 'في استراحة'}
            </span>
          </div>
          <button
            onClick={() =>
              setDoctorStatus((prev) => (prev === 'available' ? 'break' : 'available'))
            }
            className="px-2.5 py-1 bg-[#18233C] hover:bg-[#242a38] text-[#bbc9ca] hover:text-[#dde2f5] rounded-lg text-xs font-medium transition-colors cursor-pointer"
          >
            {doctorStatus === 'available' ? 'استراحة' : 'تفعيل'}
          </button>
        </div>

        <div className="flex items-center justify-between text-[#859394] text-[11px] px-2">
          <span>إصدار النظام</span>
          <span className="font-mono text-[#00c2cb] font-semibold">v2.4-solo-eg</span>
        </div>
      </div>
    </aside>
  );
};

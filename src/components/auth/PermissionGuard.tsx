import React, { useEffect, useState } from 'react';
import { ScreenType } from '../../types';
import { Role, ROLE_LABELS, canAccessRoute } from '../../permissions';
import { usePermissions } from '../../context/AuthContext';

interface PermissionGuardProps {
  screen: ScreenType;
  role?: Role | string;
  onNavigateToDashboard: () => void;
  children: React.ReactNode;
}

const SCREEN_NAMES: Record<string, string> = {
  dashboard: 'لوحة التحكم',
  'new-visit': 'تسجيل زيارة جديدة',
  'waiting-queue': 'المرضى في الانتظار',
  'clinical-exam': 'الكشف الطبي للغرفة',
  'upcoming-followups': 'المتابعة القادمة والمواعيد',
  appointments: 'المواعيد والمتابعة',
  'patient-records': 'ملفات المرضى (EMR)',
  'billing-payments': 'الفواتير والمدفوعات',
  finance: 'المالية والخزينة',
  'clinical-reports': 'التقارير والإحصائيات',
  'prescriptions-catalog': 'الوصفات والبروتوكولات',
  'prescription-pad': 'الروشتة الإلكترونية',
  'system-settings': 'إعدادات النظام والأدلة',
  settings: 'إعدادات النظام والأدلة',
};

/**
 * Centrally guards screens/routes against unauthorized role access.
 * Displays a dedicated Access Denied page and redirects to dashboard.
 */
export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  screen,
  role: overrideRole,
  onNavigateToDashboard,
  children,
}) => {
  const { role: contextRole } = usePermissions();
  const effectiveRole = overrideRole || contextRole;

  const isAllowed = canAccessRoute(effectiveRole, screen);
  const [countdown, setCountdown] = useState(6);

  useEffect(() => {
    if (isAllowed) return;

    setCountdown(6);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onNavigateToDashboard();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isAllowed, screen, onNavigateToDashboard]);

  if (isAllowed) {
    return <>{children}</>;
  }

  const roleLabel = ROLE_LABELS[effectiveRole as Role] || effectiveRole;
  const screenTitle = SCREEN_NAMES[screen] || screen;

  return (
    <div
      dir="rtl"
      className="min-h-[70vh] flex items-center justify-center p-6 animate-in fade-in duration-300"
    >
      <div className="w-full max-w-lg rounded-3xl border border-rose-500/30 bg-white dark:bg-[#111A2E] p-8 shadow-2xl text-center space-y-6">
        <div className="w-20 h-20 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 mx-auto flex items-center justify-center">
          <span className="material-symbols-outlined text-4xl">gpp_bad</span>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-[#dde2f5]">
            ليس لديك صلاحية للوصول لهذه الصفحة
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-[#859394] leading-relaxed max-w-md mx-auto">
            تم تقييد الوصول لهذه الصفحة وفق مصفوفة صلاحيات المنظومة الطبية المعتمدة لعيادات سولي.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-[#0c1322] p-4 rounded-2xl border border-slate-100 dark:border-white/5 text-right">
          <div>
            <div className="text-[11px] text-slate-400 font-bold mb-1">دورك الحالي في النظام:</div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#00c2cb]/15 text-[#008f97] dark:text-[#45dee7] text-xs font-black">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00c2cb]"></span>
              <span>{roleLabel}</span>
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-bold mb-1">الصفحة المطلوبة:</div>
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {screenTitle}
            </div>
          </div>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={onNavigateToDashboard}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#00c2cb] hover:bg-[#45dee7] text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-[#00c2cb]/20"
          >
            <span className="material-symbols-outlined text-base">dashboard</span>
            <span>العودة إلى لوحة التحكم الرئيسية ({countdown} ثوانٍ)</span>
          </button>
        </div>
      </div>
    </div>
  );
};

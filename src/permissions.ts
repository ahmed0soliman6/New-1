/**
 * SOLI MEDICAL — CENTRAL PERMISSION MATRIX & RBAC
 * Single source of truth for Roles, Permissions, and Access Control.
 */

export type Role = 'admin' | 'doctor' | 'secretary';

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'مدير',
  doctor: 'طبيب',
  secretary: 'سكرتير',
};

export type Permission =
  // Dashboard
  | 'dashboard.view'
  // Patients
  | 'patients.view'
  | 'patients.create'
  | 'patients.edit'
  // Visits
  | 'visits.create'
  | 'visits.view'
  | 'visits.edit'
  // Queue
  | 'queue.view'
  | 'queue.manage'
  // Clinical Examination
  | 'clinical.view'
  | 'clinical.edit'
  | 'clinical.complete'
  // Prescriptions
  | 'prescription.view'
  | 'prescription.create'
  | 'prescription.print'
  // Appointments & Follow-ups
  | 'appointments.view'
  | 'appointments.create'
  | 'appointments.edit'
  | 'appointments.checkin'
  // Billing & Finance
  | 'billing.view'
  | 'billing.create'
  | 'billing.edit'
  | 'billing.expenses'
  | 'billing.closeShift'
  // Reports & Analytics
  | 'reports.view'
  | 'reports.financial'
  | 'reports.clinical'
  // Settings
  | 'settings.view'
  | 'settings.edit'
  // Users & Roles Management
  | 'users.view'
  | 'users.create'
  | 'users.edit'
  | 'users.disable'
  | 'users.delete'
  | 'roles.manage';

/**
 * ALL_PERMISSIONS list for Admin super-user.
 */
export const ALL_PERMISSIONS: Permission[] = [
  'dashboard.view',
  'patients.view',
  'patients.create',
  'patients.edit',
  'visits.create',
  'visits.view',
  'visits.edit',
  'queue.view',
  'queue.manage',
  'clinical.view',
  'clinical.edit',
  'clinical.complete',
  'prescription.view',
  'prescription.create',
  'prescription.print',
  'appointments.view',
  'appointments.create',
  'appointments.edit',
  'appointments.checkin',
  'billing.view',
  'billing.create',
  'billing.edit',
  'billing.expenses',
  'billing.closeShift',
  'reports.view',
  'reports.financial',
  'reports.clinical',
  'settings.view',
  'settings.edit',
  'users.view',
  'users.create',
  'users.edit',
  'users.disable',
  'users.delete',
  'roles.manage',
];

/**
 * Centrally defined Role -> Permissions Matrix
 */
export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  // ADMIN: Full access to all screens, actions, settings, and user management.
  admin: ALL_PERMISSIONS,

  // DOCTOR: Clinical exam, prescriptions, patient files, appointments, queue, medical reports.
  // Viewing financial data only when needed (billing.view).
  // Strictly forbidden from: user management, role management, sensitive system/clinic settings, pricing, financial reports.
  doctor: [
    'dashboard.view',
    'patients.view',
    'patients.create',
    'patients.edit',
    'visits.view',
    'visits.edit',
    'queue.view',
    'queue.manage',
    'clinical.view',
    'clinical.edit',
    'clinical.complete',
    'prescription.view',
    'prescription.create',
    'prescription.print',
    'appointments.view',
    'appointments.create',
    'appointments.edit',
    'appointments.checkin',
    'billing.view',
    'reports.view',
    'reports.clinical',
    'settings.view', // Can view medical catalogs (drugs, labs, diagnoses, chronic diseases)
  ],

  // SECRETARY: New visit registration, queue management, appointments, patient files, billing/payments/expenses, printing receipts.
  // Strictly forbidden from: opening/editing clinical exam, diagnosis, treatment, writing prescriptions, medical editing post-visit, sensitive clinical reports, user management, doctor settings.
  secretary: [
    'dashboard.view',
    'patients.view',
    'patients.create',
    'patients.edit',
    'visits.create',
    'visits.view',
    'queue.view',
    'queue.manage',
    'appointments.view',
    'appointments.create',
    'appointments.edit',
    'appointments.checkin',
    'billing.view',
    'billing.create',
    'billing.edit',
    'billing.expenses',
    'billing.closeShift',
    'prescription.print',
    'reports.view',
  ],
};

/**
 * Route-to-Permission mapping
 */
export const ROUTE_PERMISSIONS: Record<string, Permission> = {
  dashboard: 'dashboard.view',
  'new-visit': 'visits.create',
  'waiting-queue': 'queue.view',
  'clinical-exam': 'clinical.view',
  'upcoming-followups': 'appointments.view',
  appointments: 'appointments.view',
  'patient-records': 'patients.view',
  'billing-payments': 'billing.view',
  finance: 'billing.view',
  'clinical-reports': 'reports.view',
  'prescriptions-catalog': 'prescription.view',
  'prescription-pad': 'prescription.view',
  'system-settings': 'settings.view',
  settings: 'settings.view',
};

/**
 * Normalizes any string or Firestore representation to 'admin' | 'doctor' | 'secretary'.
 */
export function normalizeRole(rawRole: unknown): Role {
  if (!rawRole) return 'secretary';
  const str = String(rawRole).toLowerCase().trim();
  if (str === 'admin') return 'admin';
  if (str === 'doctor') return 'doctor';
  if (str === 'secretary') return 'secretary';
  return 'secretary';
}

/**
 * Detailed specification of every system screen/page for admin customization.
 */
export interface SystemScreenDef {
  id: string;
  title: string;
  category: 'clinical' | 'reception' | 'finance' | 'admin';
  categoryLabel: string;
  icon: string;
  description: string;
}

export const ALL_SYSTEM_SCREENS: SystemScreenDef[] = [
  {
    id: 'dashboard',
    title: 'لوحة التحكم المركزية',
    category: 'reception',
    categoryLabel: 'استقبال وعام',
    icon: 'space_dashboard',
    description: 'المؤشرات العامة، إحصائيات اليوم، قائمة الانتظار، واستدعاء المرضى.',
  },
  {
    id: 'new-visit',
    title: 'تسجيل زيارة جديدة',
    category: 'reception',
    categoryLabel: 'استقبال وعام',
    icon: 'person_add',
    description: 'فتح تذكرة كشف، تسجيل بيانات المريض، وتوجيهه إلى طابور الانتظار.',
  },
  {
    id: 'waiting-queue',
    title: 'صالة الانتظار وطابور المرضى',
    category: 'reception',
    categoryLabel: 'استقبال وعام',
    icon: 'hourglass_top',
    description: 'إدارة طابور الحضور، ترتيب الأدوار، والنداء الصوتي للشاشة.',
  },
  {
    id: 'upcoming-followups',
    title: 'المتابعة القادمة والمواعيد',
    category: 'reception',
    categoryLabel: 'استقبال وعام',
    icon: 'event_repeat',
    description: 'جدول المواعيد المستقبلية، حجز الاستشارات، وتأكيد الحضور.',
  },
  {
    id: 'clinical-exam',
    title: 'الكشف الطبي للغرفة والروشتة',
    category: 'clinical',
    categoryLabel: 'عيادة وإكلينيكي',
    icon: 'stethoscope',
    description: 'فحص المريض، كتابة التشخيص، تسجيل القياسات الحيوية، صرف الأدوية، وإنهاء الكشف.',
  },
  {
    id: 'patient-records',
    title: 'ملفات المرضى (EMR)',
    category: 'clinical',
    categoryLabel: 'عيادة وإكلينيكي',
    icon: 'folder_shared',
    description: 'الأرشيف والسجل الطبي، التاريخ المرضي، والزيارات والروشتات السابقة.',
  },
  {
    id: 'prescriptions-catalog',
    title: 'دليل الوصفات والبروتوكولات',
    category: 'clinical',
    categoryLabel: 'عيادة وإكلينيكي',
    icon: 'medication',
    description: 'كتالوج الأدوية المعتمدة، الجرعات الموصى بها، والبروتوكولات الجاهزة.',
  },
  {
    id: 'prescription-pad',
    title: 'الروشتة الإلكترونية (طباعة A5)',
    category: 'clinical',
    categoryLabel: 'عيادة وإكلينيكي',
    icon: 'prescriptions',
    description: 'محرر الروشتات المستقل وطباعتها على ورق A5 مع التوقيع والباركود.',
  },
  {
    id: 'billing-payments',
    title: 'الفواتير والمدفوعات والخزينة',
    category: 'finance',
    categoryLabel: 'ماليات وخزينة',
    icon: 'receipt_long',
    description: 'تحصيل رسوم الكشوفات، سندات القبض، تسجيل المصروفات، وتقفيل الوردية اليومية.',
  },
  {
    id: 'clinical-reports',
    title: 'التقارير والإحصائيات',
    category: 'finance',
    categoryLabel: 'ماليات وخزينة',
    icon: 'analytics',
    description: 'تقارير الإيرادات، صافي الخزينة، تحليلات المرضى ومعدلات التردد.',
  },
  {
    id: 'system-settings',
    title: 'إعدادات النظام وإدارة الحسابات',
    category: 'admin',
    categoryLabel: 'إدارة وتحكم',
    icon: 'settings',
    description: 'إدارة المستخدمين، التحكم بصلاحيات الصفحات، أسعار الكشوفات، وأدلة النظام.',
  },
];

/**
 * Screen ID aliases mapping for seamless compatibility across routes.
 */
const SCREEN_ALIASES: Record<string, string[]> = {
  dashboard: ['dashboard'],
  'new-visit': ['new-visit'],
  'waiting-queue': ['waiting-queue'],
  'clinical-exam': ['clinical-exam'],
  'upcoming-followups': ['upcoming-followups', 'appointments'],
  appointments: ['upcoming-followups', 'appointments'],
  'patient-records': ['patient-records', 'patient-files'],
  'billing-payments': ['billing-payments', 'finance'],
  finance: ['billing-payments', 'finance'],
  'clinical-reports': ['clinical-reports', 'analytics'],
  'prescriptions-catalog': ['prescriptions-catalog'],
  'prescription-pad': ['prescription-pad'],
  'system-settings': ['system-settings', 'settings'],
  settings: ['system-settings', 'settings'],
};

/**
 * Returns default screens for a given role if no custom allowedScreens were specified.
 */
export function getDefaultAllowedScreens(role: Role | string | undefined | null): string[] {
  const norm = normalizeRole(role);
  if (norm === 'admin') {
    return ALL_SYSTEM_SCREENS.map((s) => s.id);
  }
  if (norm === 'doctor') {
    return [
      'dashboard',
      'waiting-queue',
      'clinical-exam',
      'upcoming-followups',
      'patient-records',
      'clinical-reports',
      'prescriptions-catalog',
      'prescription-pad',
    ];
  }
  // Secretary defaults: Strictly reception & billing (no clinical exams or admin settings)
  return [
    'dashboard',
    'new-visit',
    'waiting-queue',
    'upcoming-followups',
    'patient-records',
    'billing-payments',
  ];
}

/**
 * Checks whether a given role holds a specific permission.
 */
export function hasPermission(
  role: Role | string | undefined | null,
  permission: Permission
): boolean {
  const normRole = normalizeRole(role);
  const permissions = ROLE_PERMISSIONS[normRole];
  return permissions ? permissions.includes(permission) : false;
}

/**
 * Checks whether a screen is in the allowedScreens list, respecting aliases.
 */
export function isScreenAllowed(
  screenId: string,
  allowedScreens?: string[] | null
): boolean {
  if (!allowedScreens || !Array.isArray(allowedScreens) || allowedScreens.length === 0) {
    return false;
  }
  const aliases = SCREEN_ALIASES[screenId] || [screenId];
  return aliases.some((alias) => allowedScreens.includes(alias));
}

/**
 * Checks whether a role can navigate to a specific screen/route.
 * If userAllowedScreens is provided, it uses the user-specific screen list configured by the admin!
 */
export function canAccessRoute(
  role: Role | string | undefined | null,
  screenId: string,
  userAllowedScreens?: string[] | null
): boolean {
  const normRole = normalizeRole(role);

  // If custom allowedScreens are saved for this user, they are the primary source of truth!
  if (userAllowedScreens && Array.isArray(userAllowedScreens) && userAllowedScreens.length > 0) {
    // Admin always retains system-settings for safety
    if (normRole === 'admin' && (screenId === 'system-settings' || screenId === 'settings')) {
      return true;
    }
    return isScreenAllowed(screenId, userAllowedScreens);
  }

  // Fallback to role-based default screens
  const defaultScreens = getDefaultAllowedScreens(normRole);
  return isScreenAllowed(screenId, defaultScreens);
}

/**
 * Asserts that the role has the permission, otherwise throws an error.
 */
export function assertPermission(
  role: Role | string | undefined | null,
  permission: Permission,
  actionDescription?: string
): void {
  if (!hasPermission(role, permission)) {
    const norm = normalizeRole(role);
    const label = ROLE_LABELS[norm];
    const desc = actionDescription ? ` (${actionDescription})` : '';
    throw new Error(
      `غير مصرح: دورك الحالي (${label}) لا يملك صلاحية تنفيذ هذا الإجراء${desc} [${permission}].`
    );
  }
}

/**
 * Returns all permissions granted to a given role.
 */
export function getRolePermissions(role: Role | string | undefined | null): readonly Permission[] {
  const norm = normalizeRole(role);
  return ROLE_PERMISSIONS[norm] || [];
}

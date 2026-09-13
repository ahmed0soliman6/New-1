import { CLINIC_INFO } from '../data/previewClinicData';
import { safeStorage, StorageKeys } from '../services/storage';
import { getPrescriptionDoctorInfo } from './prescriptionDoctor';

export interface ClinicBranchItem {
  id: string;
  name: string;
  address: string;
  phone: string;
  mobile?: string;
  workingHours?: string;
}

/**
 * Returns all active branches configured in the clinic.
 * Prioritizes user settings saved in localStorage (`soli_clinic_branches` or `soli_prescription_settings`),
 * falling back to `CLINIC_INFO.branches`.
 */
export function getClinicBranches(): ClinicBranchItem[] {
  const customBranches = safeStorage.getJSON<any[] | null>(StorageKeys.CLINIC_BRANCHES, null);
  if (Array.isArray(customBranches) && customBranches.length > 0) {
    return customBranches.map((b: any, index: number) => ({
      id: b.id || `branch-${index}`,
      name: b.name || `فرع ${index + 1}`,
      address: b.address || '',
      phone: b.phone || b.mobile || '',
      mobile: b.mobile || b.phone || '',
      workingHours: b.workingHours || '',
    }));
  }

  const cached = safeStorage.getJSON<any | null>(StorageKeys.PRESCRIPTION_SETTINGS, null);
  if (cached && Array.isArray(cached.branches) && cached.branches.length > 0) {
    return cached.branches.map((b: any, index: number) => ({
      id: b.id || `branch-${index}`,
      name: b.name || `فرع ${index + 1}`,
      address: b.address || '',
      phone: b.phone || b.mobile || '',
      mobile: b.mobile || b.phone || '',
      workingHours: b.workingHours || '',
    }));
  }

  // Fallback to CLINIC_INFO.branches
  if (Array.isArray(CLINIC_INFO.branches) && CLINIC_INFO.branches.length > 0) {
    return CLINIC_INFO.branches.map((b) => ({
      id: b.id,
      name: b.name,
      address: b.address,
      phone: b.phone || b.mobile || '',
      mobile: b.mobile || b.phone || '',
      workingHours: b.hours ? `${b.days ? b.days + ' ' : ''}${b.hours}` : '',
    }));
  }

  return [
    {
      id: 'default-1',
      name: 'الفرع الرئيسي',
      address: 'العنوان الرئيسي للعيادة',
      phone: '01092847162',
      mobile: '01092847162',
      workingHours: 'يومياً ما عدا الجمعة',
    },
  ];
}

/**
 * Saves clinic branches to localStorage and syncs with prescription settings.
 * Dispatches an update event so all screens re-render instantaneously.
 */
export function saveClinicBranches(branches: ClinicBranchItem[]): void {
  safeStorage.setJSON(StorageKeys.CLINIC_BRANCHES, branches);

  // Also update branches in prescription settings if present
  const cachedRx = safeStorage.getJSON<any | null>(StorageKeys.PRESCRIPTION_SETTINGS, null);
  if (cachedRx) {
    cachedRx.branches = branches.map((b) => ({
      id: b.id,
      name: b.name,
      address: b.address,
      phone: b.phone || b.mobile || '',
      workingHours: b.workingHours || '',
    }));
    safeStorage.setJSON(StorageKeys.PRESCRIPTION_SETTINGS, cachedRx);
  }

  window.dispatchEvent(new CustomEvent('soli_branches_updated', { detail: branches }));
  window.dispatchEvent(new Event('soli_prescription_updated'));
  window.dispatchEvent(new Event('storage'));
}

/**
 * Finds the matching branch by ID or by partial name match.
 * If not found, returns the first branch.
 */
export function findBranch(identifier?: string): ClinicBranchItem {
  const branches = getClinicBranches();
  if (!branches.length) {
    return {
      id: 'default-1',
      name: 'الفرع الرئيسي',
      address: 'العنوان الرئيسي للعيادة',
      phone: '01092847162',
      mobile: '01092847162',
    };
  }

  if (!identifier || !identifier.trim()) {
    return branches[0];
  }

  const clean = identifier.trim().toLowerCase();

  // Match by exact id
  const byId = branches.find((b) => b.id.toLowerCase() === clean);
  if (byId) return byId;

  // Match by exact or partial name
  const byName = branches.find((b) => {
    const bName = b.name.toLowerCase();
    return bName.includes(clean) || clean.includes(bName);
  });
  if (byName) return byName;

  // Specific common keywords (e.g. مهندسين vs دقي)
  if (clean.includes('مهندس') || clean.includes('رئيسي')) {
    const found = branches.find((b) => b.name.includes('مهندس') || b.name.includes('رئيسي'));
    if (found) return found;
  }
  if (clean.includes('دقي')) {
    const found = branches.find((b) => b.name.includes('دقي'));
    if (found) return found;
  }

  return branches[0];
}

/**
 * Builds a dynamic, accurate WhatsApp reminder message for a scheduled appointment.
 */
export function buildAppointmentReminderMessage(params: {
  patientName: string;
  timeSlot?: string;
  visitType?: string;
  branch: ClinicBranchItem;
  date?: string;
  customNote?: string;
}): string {
  const doctor = getPrescriptionDoctorInfo();
  const doctorName = doctor.doctorName || CLINIC_INFO.doctorName;
  const time = params.timeSlot || '09:00 ص';
  const visitType = params.visitType || 'كشف';
  const branch = params.branch;
  const contactPhone = branch.phone || branch.mobile || doctor.phone || '01092847162';

  let dateLine = '';
  if (params.date) {
    dateLine = `🗓 موعد الحجز: *${params.date}* في تمام *${time}* (${visitType})`;
  } else {
    dateLine = `🗓 موعد الحجز: *${time}* (${visitType})`;
  }

  let addressLine = `📍 فرع العيادة: *${branch.name}*`;
  if (branch.address) {
    addressLine += `\nالعنوان: ${branch.address}`;
  }
  if (branch.workingHours) {
    addressLine += `\n⏰ مواعيد العمل: ${branch.workingHours}`;
  }

  const noteLine = params.customNote?.trim() ? `\n💡 تنبيه: ${params.customNote.trim()}` : '';

  return `مرحباً بحضرتك أستاذ/ة *${params.patientName}* 🌸
نود تذكيركم بموعدكم في *عيادة ${doctorName}* 🩺
${dateLine}
${addressLine}
📞 للتأكيد أو تعديل الموعد: ${contactPhone}${noteLine}
مع تمنياتنا لكم بدوام الصحة والعافية ✨`;
}

/**
 * Builds a dynamic, accurate WhatsApp reminder message for a follow-up consultation.
 */
export function buildFollowupReminderMessage(params: {
  patientName: string;
  dueDate: string;
  branch: ClinicBranchItem;
  diagnosis?: string;
  customNote?: string;
}): string {
  const doctor = getPrescriptionDoctorInfo();
  const doctorName = doctor.doctorName || CLINIC_INFO.doctorName;
  const branch = params.branch;
  const contactPhone = branch.phone || branch.mobile || doctor.phone || '01092847162';

  let addressLine = `📍 فرع العيادة: *${branch.name}*`;
  if (branch.address) {
    addressLine += `\nالعنوان: ${branch.address}`;
  }
  if (branch.workingHours) {
    addressLine += `\n⏰ مواعيد العمل: ${branch.workingHours}`;
  }

  const diagLine = params.diagnosis ? `\n🩺 بخصوص: ${params.diagnosis}` : '';
  const noteLine = params.customNote?.trim() ? `\n💡 تنبيه: ${params.customNote.trim()}` : '';

  return `مرحباً بحضرتك أستاذ/ة *${params.patientName}* 🌸
نود تذكيركم بموعد المتابعة والاستشارة الطبية المحدد لكم في *عيادة ${doctorName}* 🩺
🗓 موعد المتابعة: *${params.dueDate}*${diagLine}
${addressLine}
📞 للتأكيد أو الاستفسار: ${contactPhone}${noteLine}
مع تمنياتنا لكم بدوام الصحة والعافية ✨`;
}

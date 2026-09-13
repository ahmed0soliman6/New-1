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
  startTime?: string; // e.g., "16:00" or "04:00 م"
  endTime?: string;   // e.g., "22:00" or "10:00 م"
}

export function formatBranchTime(timeStr?: string): string {
  if (!timeStr) return '';
  if (timeStr.includes('ص') || timeStr.includes('م')) return timeStr;
  const parts = timeStr.split(':');
  const h = parseInt(parts[0], 10);
  const m = parts[1] !== undefined ? parseInt(parts[1], 10) : 0;
  if (isNaN(h)) return timeStr;
  const period = h >= 12 ? 'م' : 'ص';
  const hour12 = h % 12 || 12;
  const minFormatted = !isNaN(m) && m > 0 ? `:${m < 10 ? '0' + m : m}` : ':00';
  return `${hour12 < 10 ? '0' + hour12 : hour12}${minFormatted} ${period}`;
}

/**
 * Intelligent helper to extract start & end times from a working hours string if explicit times are not provided.
 * e.g., "الأحد، الثلاثاء، الخميس 06:00 م - 11:30 م" -> { startTime: "18:00", endTime: "23:30" }
 */
export function extractTimesFromWorkingHours(workingHours?: string): { startTime?: string; endTime?: string } | null {
  if (!workingHours) return null;

  // Regex to match patterns like "06:00 م - 11:30 م" or "04:00م - 10:00م" or "18:00 إلى 23:30"
  const matches = workingHours.match(/(\d{1,2}(?::\d{2})?\s*(?:ص|م|AM|PM|am|pm)?)\s*[-–إلى]\s*(\d{1,2}(?::\d{2})?\s*(?:ص|م|AM|PM|am|pm)?)/i);
  if (!matches || !matches[1] || !matches[2]) return null;

  const parseTo24h = (str: string): string | null => {
    const s = str.trim().toLowerCase();
    const isPM = s.includes('م') || s.includes('pm');
    const isAM = s.includes('ص') || s.includes('am');
    const digitsOnly = s.replace(/[^\d:]/g, '');
    const parts = digitsOnly.split(':');
    if (parts.length < 1) return null;
    let h = parseInt(parts[0], 10);
    let m = parts.length >= 2 ? parseInt(parts[1], 10) : 0;
    if (isNaN(h)) return null;
    if (isNaN(m)) m = 0;

    if (isPM && h < 12) h += 12;
    if (isAM && h === 12) h = 0;

    return `${h < 10 ? '0' + h : h}:${m < 10 ? '0' + m : m}`;
  };

  const start = parseTo24h(matches[1]);
  const end = parseTo24h(matches[2]);

  if (start && end) {
    return { startTime: start, endTime: end };
  }
  return null;
}

/**
 * Generates available 15-minute time slots between a branch's startTime and endTime.
 */
export function generateBranchTimeSlots(
  startTime?: string,
  endTime?: string,
  workingHours?: string
): { raw: string; label: string }[] {
  let effectiveStart = startTime;
  let effectiveEnd = endTime;

  // If start/end times seem unconfigured or default 16:00-22:00, check if workingHours has explicit custom times
  if ((!effectiveStart || !effectiveEnd || (effectiveStart === '16:00' && effectiveEnd === '22:00')) && workingHours) {
    const parsed = extractTimesFromWorkingHours(workingHours);
    if (parsed && parsed.startTime && parsed.endTime) {
      effectiveStart = parsed.startTime;
      effectiveEnd = parsed.endTime;
    }
  }

  const parseMins = (str?: string, fallbackMins: number = 0): number => {
    if (!str) return fallbackMins;
    const s = str.trim().toLowerCase();
    const isPM = s.includes('م') || s.includes('pm');
    const isAM = s.includes('ص') || s.includes('am');
    const digitsOnly = s.replace(/[^\d:]/g, '');
    const parts = digitsOnly.split(':');
    if (parts.length < 1) return fallbackMins;
    let h = parseInt(parts[0], 10);
    let m = parts.length >= 2 ? parseInt(parts[1], 10) : 0;
    if (isNaN(h)) return fallbackMins;
    if (isNaN(m)) m = 0;

    if (isPM && h < 12) h += 12;
    if (isAM && h === 12) h = 0;

    return h * 60 + m;
  };

  const startMins = parseMins(effectiveStart, 16 * 60); // Default 4:00 PM (16:00)
  let endMins = parseMins(effectiveEnd, 22 * 60);       // Default 10:00 PM (22:00)

  if (endMins <= startMins) {
    endMins += 24 * 60;
  }

  const slots: { raw: string; label: string }[] = [];
  const step = 15; // 15-minute slots as requested by user

  for (let mins = startMins; mins <= endMins; mins += step) {
    const norm = mins % (24 * 60);
    const h = Math.floor(norm / 60);
    const m = norm % 60;

    const rawStr = `${h < 10 ? '0' + h : h}:${m < 10 ? '0' + m : m}`;
    const period = h >= 12 ? 'م' : 'ص';
    const h12 = h % 12 || 12;
    const labelStr = `${h12 < 10 ? '0' + h12 : h12}:${m < 10 ? '0' + m : m} ${period}`;

    slots.push({ raw: rawStr, label: labelStr });
  }

  return slots;
}

/**
 * Returns all active branches configured in the clinic.
 * Prioritizes user settings saved in localStorage (`soli_clinic_branches` or `soli_prescription_settings`),
 * falling back to `CLINIC_INFO.branches`.
 */
export function getClinicBranches(): ClinicBranchItem[] {
  const customBranches = safeStorage.getJSON<any[] | null>(StorageKeys.CLINIC_BRANCHES, null);
  if (Array.isArray(customBranches) && customBranches.length > 0) {
    return customBranches.map((b: any, index: number) => {
      const parsed = extractTimesFromWorkingHours(b.workingHours);
      return {
        id: b.id || `branch-${index}`,
        name: b.name || `فرع ${index + 1}`,
        address: b.address || '',
        phone: b.phone || b.mobile || '',
        mobile: b.mobile || b.phone || '',
        workingHours: b.workingHours || '',
        startTime: b.startTime || parsed?.startTime || '16:00',
        endTime: b.endTime || parsed?.endTime || '22:00',
      };
    });
  }

  const cached = safeStorage.getJSON<any | null>(StorageKeys.PRESCRIPTION_SETTINGS, null);
  if (cached && Array.isArray(cached.branches) && cached.branches.length > 0) {
    return cached.branches.map((b: any, index: number) => {
      const parsed = extractTimesFromWorkingHours(b.workingHours);
      return {
        id: b.id || `branch-${index}`,
        name: b.name || `فرع ${index + 1}`,
        address: b.address || '',
        phone: b.phone || b.mobile || '',
        mobile: b.mobile || b.phone || '',
        workingHours: b.workingHours || '',
        startTime: b.startTime || parsed?.startTime || '16:00',
        endTime: b.endTime || parsed?.endTime || '22:00',
      };
    });
  }

  // Fallback to CLINIC_INFO.branches
  if (Array.isArray(CLINIC_INFO.branches) && CLINIC_INFO.branches.length > 0) {
    return CLINIC_INFO.branches.map((b) => {
      const workingHours = b.hours ? `${b.days ? b.days + ' ' : ''}${b.hours}` : '';
      const parsed = extractTimesFromWorkingHours(workingHours);
      return {
        id: b.id,
        name: b.name,
        address: b.address,
        phone: b.phone || b.mobile || '',
        mobile: b.mobile || b.phone || '',
        workingHours,
        startTime: parsed?.startTime || (b.id === 'dokki' ? '18:00' : '16:00'),
        endTime: parsed?.endTime || (b.id === 'dokki' ? '23:30' : '22:00'),
      };
    });
  }

  return [
    {
      id: 'default-1',
      name: 'الفرع الرئيسي',
      address: 'العنوان الرئيسي للعيادة',
      phone: '01092847162',
      mobile: '01092847162',
      workingHours: 'يومياً ما عدا الجمعة (04:00 م - 10:00 م)',
      startTime: '16:00',
      endTime: '22:00',
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
      startTime: b.startTime || '16:00',
      endTime: b.endTime || '22:00',
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

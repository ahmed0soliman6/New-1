export const BOOKING_LIMITS = {
  nameMin: 6,
  nameMax: 30,
  phoneMin: 7,
  phoneMax: 15,
  notesMax: 500,
  feeMax: 10000,
  windowPastDays: 2,
  windowFutureDays: 30,
} as const;

const AR_INDIC = '٠١٢٣٤٥٦٧٨٩';
const PERSIAN = '۰۱۲۳۴۵۶۷۸۹';

/** يحوّل الأرقام العربية والفارسية إلى 0-9 */
export function normalizeDigits(value: string): string {
  return value
    .replace(/[٠-٩]/g, (d) => String(AR_INDIC.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String(PERSIAN.indexOf(d)));
}

/** مسافات زائدة تُختصر إلى مسافة واحدة */
export function cleanName(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

/** أرقام فقط بعد إزالة الفواصل والمسافات */
export function cleanPhone(value: string): string {
  return normalizeDigits(value).replace(/[\s\-()+]/g, '');
}

import { toDayKey, addDaysToKey } from './dayKey';

/** دقائق وقت "HH:MM" أو "HH:MM ص/م" (أرقام عربية/إنجليزية) — null إن كان غير صالح */
export function parseBookingTimeToMinutes(value: string): number | null {
  if (!value) return null;
  const s = normalizeDigits(value.trim().toLowerCase());
  const isPM = s.includes('م') || s.includes('pm');
  const isAM = s.includes('ص') || s.includes('am');
  const digitsOnly = s.replace(/[^\d:]/g, '');
  const parts = digitsOnly.split(':');
  if (parts.length < 1 || parts[0] === '') return null;
  let h = parseInt(parts[0], 10);
  let m = parts.length >= 2 && parts[1] !== '' ? parseInt(parts[1], 10) : 0;
  if (isNaN(h) || isNaN(m)) return null;
  if (isPM && h < 12) h += 12;
  if (isAM && h === 12) h = 0;
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

/** دقائق الوقت الحالي بتوقيت القاهرة */
export function cairoNowMinutes(): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Cairo',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const h = Number(parts.find((p) => p.type === 'hour')?.value || 0);
  const m = Number(parts.find((p) => p.type === 'minute')?.value || 0);
  return h * 60 + m;
}
export type BookingField = 'name' | 'phone' | 'branch' | 'date' | 'time' | 'notes' | 'fee';

export type BookingErrors = Partial<Record<BookingField, string>>;

export interface BookingInput {
  name: string;
  phone: string;
  date: string;   // YYYY-MM-DD
  time: string;
  notes: string;
  fee: number;
}

export function validateBooking(input: BookingInput): BookingErrors {
  const errors: BookingErrors = {};

  const name = cleanName(input.name);
  if (name.length < BOOKING_LIMITS.nameMin) {
    errors.name = `الاسم يجب ألا يقل عن ${BOOKING_LIMITS.nameMin} أحرف`;
  } else if (name.length > BOOKING_LIMITS.nameMax) {
    errors.name = `الاسم يجب ألا يزيد عن ${BOOKING_LIMITS.nameMax} حرفًا`;
  } else if (!/\S+\s+\S+/.test(name)) {
    errors.name = 'يرجى كتابة الاسم ثنائيًا على الأقل (الاسم الأول واسم الأب أو العائلة)';
  }

  const phone = cleanPhone(input.phone);
  if (!/^\d{7,15}$/.test(phone)) {
    errors.phone = `رقم الهاتف يجب أن يكون من ${BOOKING_LIMITS.phoneMin} إلى ${BOOKING_LIMITS.phoneMax} رقمًا`;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    errors.date = 'يرجى اختيار تاريخ صالح';
  } else {
    // المقارنة بتاريخ القاهرة (YYYY-MM-DD) لا بتوقيت UTC، حتى لا يظهر
    // "أمس" بين 00:00 و02:00 بتوقيت القاهرة.
    const today = toDayKey(new Date());
    const maxDate = addDaysToKey(today, BOOKING_LIMITS.windowFutureDays);
    if (input.date < today) {
      errors.date = 'لا يمكن حجز موعد في تاريخ مضى';
    } else if (input.date > maxDate) {
      errors.date = `التاريخ يجب أن يكون خلال ${BOOKING_LIMITS.windowFutureDays} يومًا قادمة`;
    } else if (input.date === today) {
      // حجز اليوم: امنع وقتًا مضى بالفعل بتوقيت القاهرة
      const timeMins = parseBookingTimeToMinutes(input.time);
      if (timeMins !== null && timeMins <= cairoNowMinutes()) {
        errors.time = 'وقت الموعد مضى بالفعل، يرجى اختيار وقت لاحق اليوم';
      }
    }
  }

  if (!input.time) errors.time = 'يرجى اختيار وقت الموعد';

  if (input.notes.length > BOOKING_LIMITS.notesMax) {
    errors.notes = `الملاحظات يجب ألا تزيد عن ${BOOKING_LIMITS.notesMax} حرف`;
  }

  if (!Number.isFinite(input.fee) || input.fee < 0 || input.fee > BOOKING_LIMITS.feeMax) {
    errors.fee = `الرسوم يجب أن تكون بين 0 و${BOOKING_LIMITS.feeMax}`;
  }

  return errors;
}

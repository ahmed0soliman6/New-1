const CAIRO_TZ = 'Africa/Cairo';
const fmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: CAIRO_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export type DateLike = Date | string | number | { toDate: () => Date } | null | undefined;

export function toDate(input: DateLike): Date | null {
  if (input == null) return null;
  if (input instanceof Date) return isNaN(input.getTime()) ? null : input;
  if (typeof input === 'object' && 'toDate' in input && typeof input.toDate === 'function') {
    return input.toDate();
  }
  const d = new Date(input as string | number);
  return isNaN(d.getTime()) ? null : d;
}

/** YYYY-MM-DD بتوقيت القاهرة */
export function toDayKey(input?: DateLike): string {
  return fmt.format(toDate(input) ?? new Date());
}

export const todayKey = () => toDayKey(new Date());

export function addDaysToKey(key: string, days: number): string {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/**
 * العمر الكامل بالسنوات من تاريخ الميلاد، بمقارنة شهر/يوم كاملة
 * (وليس فرق السنين فقط) — تاريخ "1990-01-01" في 2026-11-26 يعطي 36 لا 37.
 * يُفسَّر "YYYY-MM-DD" كتاريخ محلي لتجنّب إزاحة UTC.
 */
export function calculateAge(dateOfBirth: DateLike): number | undefined {
  let y: number, m: number, d: number;
  if (typeof dateOfBirth === 'string') {
    const parts = dateOfBirth.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!parts) return undefined;
    y = Number(parts[1]); m = Number(parts[2]); d = Number(parts[3]);
  } else {
    const dob = toDate(dateOfBirth);
    if (!dob) return undefined;
    y = dob.getFullYear(); m = dob.getMonth() + 1; d = dob.getDate();
  }
  const now = new Date();
  let age = now.getFullYear() - y;
  const monthDiff = now.getMonth() + 1 - m;
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < d)) age -= 1;
  return Math.max(0, age);
}

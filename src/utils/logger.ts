/**
 * Production-safe logger utility (Item 7).
 * - Suppresses detailed console output in production builds (import.meta.env.PROD).
 * - Never logs patient names, phone numbers, diagnoses, clinical notes, backup payloads,
 *   or raw UIDs/emails/IPs on the client.
 */

const SENSITIVE_KEYS = new Set([
  'fullName',
  'patientName',
  'name',
  'phone',
  'mobile',
  'nationalId',
  'address',
  'diagnosis',
  'chiefComplaint',
  'clinicalData',
  'receptionistData',
  'vitalSigns',
  'treatment',
  'history',
  'examination',
  'patients',
  'visits',
  'prescriptions',
  'invoices',
  'payments',
  'password',
  'newPassword',
  'currentPassword',
  'recoveryCode',
  'envelope',
]);

function isProdBuild(): boolean {
  try {
    return Boolean((import.meta as any)?.env?.PROD);
  } catch {
    return false;
  }
}

export function sanitizeErrorForLog(err: unknown): string {
  if (!err) return 'UNKNOWN_ERROR';
  if (typeof err === 'object' && err !== null && 'code' in err && typeof (err as any).code === 'string') {
    return String((err as any).code);
  }
  if (err instanceof Error) {
    // Strip any potential inline PII or long payloads
    const msg = err.message || 'ERROR';
    return msg.length > 120 ? `${msg.slice(0, 120)}...` : msg;
  }
  return 'OPERATION_ERROR';
}

export function redactSensitiveObject(input: unknown): unknown {
  if (input === null || input === undefined) return input;
  if (typeof input !== 'object') return input;
  if (Array.isArray(input)) {
    return `[Array(${input.length})]`;
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(k)) {
      out[k] = '[REDACTED]';
    } else if (typeof v === 'object' && v !== null) {
      out[k] = '[Object]';
    } else {
      out[k] = v;
    }
  }
  return out;
}

export const safeLogger = {
  info(context: string): void {
    if (isProdBuild()) return;
    console.info(`[SoliClinic] ${context}`);
  },
  warn(context: string, err?: unknown): void {
    if (isProdBuild()) return;
    const code = err !== undefined ? ` (${sanitizeErrorForLog(err)})` : '';
    console.warn(`[SoliClinic] ${context}${code}`);
  },
  error(context: string, err?: unknown): void {
    if (isProdBuild()) return;
    const code = err !== undefined ? ` (${sanitizeErrorForLog(err)})` : '';
    console.error(`[SoliClinic] ${context}${code}`);
  },
};

let guardInstalled = false;

/**
 * Installs a global production console guard that suppresses verbose
 * console.log / info / debug / warn in production builds and strips objects/PII
 * from console.error.
 */
export function installProductionConsoleGuard(): void {
  if (guardInstalled || !isProdBuild() || typeof console === 'undefined') return;
  guardInstalled = true;
  const noop = () => {};
  const origError = console.error.bind(console);
  console.log = noop;
  console.info = noop;
  console.debug = noop;
  console.warn = noop;
  console.error = (...args: unknown[]) => {
    const safeSummary = args
      .slice(0, 2)
      .map((a) => (typeof a === 'string' ? a.slice(0, 80) : sanitizeErrorForLog(a)))
      .join(' ');
    origError(`[ProdError] ${safeSummary}`);
  };
}


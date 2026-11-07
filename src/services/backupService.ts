/**
 * SOLI MEDICAL CLINIC — SECURE BACKUP & RESTORE SERVICE (Items 3 & 4)
 *
 * Features:
 * - Standard Manifest with appVersion, schemaVersion, createdAt, backupType, collectionCounts, and SHA-256 checksum.
 * - Optional AES-GCM (256-bit) + PBKDF2 (100,000 iterations) password encryption.
 * - Strict integrity & compatibility verification before any restore operation.
 * - Safe chunked Firestore restoration (<= 400 documents per writeBatch) with per-collection reporting.
 * - Zero console logging of patient or backup data.
 */

import { doc, writeBatch, type Firestore } from 'firebase/firestore';
import { APP_VERSION, APP_SCHEMA_VERSION } from '../constants/version';
import { safeLogger, sanitizeErrorForLog } from '../utils/logger';

export const BACKUP_FORMAT_ID = 'SOLI_CLINIC_BACKUP_V2';
export const SUPPORTED_SCHEMA_VERSIONS = [1, 2];
export const MAX_RESTORE_BATCH_SIZE = 400;

export type BackupType = 'FULL_ENCRYPTED' | 'FULL_PLAIN';

export interface BackupManifest {
  appName: string;
  appVersion: string;
  schemaVersion: number;
  createdAt: string;
  backupType: BackupType;
  collectionCounts: Record<string, number>;
  totalRecords: number;
  affectedCollections: string[];
  checksum: string;
}

export interface BackupPayloadData {
  patients?: any[];
  appointments?: any[];
  visits?: any[];
  invoices?: any[];
  payments?: any[];
  prescriptions?: any[];
  labOrders?: any[];
  radiologyOrders?: any[];
  followUps?: any[];
  visitTypes?: any[];
  freeFollowupDays?: number;
  medicalServices?: any[];
  expenseCategories?: any[];
  alertConfig?: any;
  examDisplayConfig?: any;
  recurringTemplates?: any[];
  radiologyCatalog?: any[];
  labCatalog?: any[];
  drugCatalog?: any[];
  diagnosesCatalog?: any[];
  symptomsCatalog?: any[];
  chronicConditions?: any[];
}

export interface BackupFileEnvelope {
  format: string;
  manifest: BackupManifest;
  encrypted: boolean;
  salt?: string;
  iv?: string;
  ciphertext?: string;
  data?: BackupPayloadData;
}

export interface BackupVerificationResult {
  valid: boolean;
  requiresPassword?: boolean;
  manifest: BackupManifest;
  data?: BackupPayloadData;
}

export interface BackupRestoreReport {
  success: boolean;
  totalRestored: number;
  totalFailed: number;
  restoredByCollection: Record<string, number>;
  failedByCollection: Record<string, number>;
  failedCollections: string[];
  summaryText: string;
}

const COLLECTION_LABELS_AR: Record<string, string> = {
  patients: 'ملفات المرضى (patients)',
  appointments: 'المواعيد والحجوزات (appointments)',
  visits: 'الزيارات السريرية (visits)',
  invoices: 'الفواتير المالية (invoices)',
  payments: 'المدفوعات والتحصيل (payments)',
  prescriptions: 'الروشتات الطبية (prescriptions)',
  labOrders: 'طلبات التحاليل (labOrders)',
  radiologyOrders: 'طلبات الأشعة (radiologyOrders)',
  followUps: 'المتابعات والاستشارات (followUps)',
  visitTypes: 'أنواع الكشف والزيارات',
  medicalServices: 'الخدمات الطبية والأسعار',
  expenseCategories: 'بنود المصروفات',
  recurringTemplates: 'قوالب الروشتات الجاهزة',
  radiologyCatalog: 'دليل الأشعة',
  labCatalog: 'دليل التحاليل',
  drugCatalog: 'دليل الأدوية',
  diagnosesCatalog: 'دليل التشخيصات',
  symptomsCatalog: 'دليل الأعراض',
  chronicConditions: 'دليل الأمراض المزمنة',
};

export function getCollectionArabicLabel(key: string): string {
  return COLLECTION_LABELS_AR[key] || key;
}

function buf2hex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)]
    .map((x) => x.toString(16).padStart(2, '0'))
    .join('');
}

function hex2buf(hex: string): Uint8Array {
  if (!hex || hex.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(hex)) {
    throw new Error('بيانات التشفير السداسية غير صالحة.');
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

function getSubtleCrypto(): SubtleCrypto {
  const c = globalThis.crypto;
  if (!c || !c.subtle) {
    throw new Error('محرك التشفير القياسي (Web Crypto API) غير متوفر في هذه البيئة.');
  }
  return c.subtle;
}

/**
 * Deterministic JSON serialization so checksum calculation is stable across environments.
 */
export function canonicalizeBackupData(data: BackupPayloadData): string {
  const ordered: BackupPayloadData = {
    patients: Array.isArray(data.patients) ? data.patients : [],
    appointments: Array.isArray(data.appointments) ? data.appointments : [],
    visits: Array.isArray(data.visits) ? data.visits : [],
    invoices: Array.isArray(data.invoices) ? data.invoices : [],
    payments: Array.isArray(data.payments) ? data.payments : [],
    prescriptions: Array.isArray(data.prescriptions) ? data.prescriptions : [],
    labOrders: Array.isArray(data.labOrders) ? data.labOrders : [],
    radiologyOrders: Array.isArray(data.radiologyOrders) ? data.radiologyOrders : [],
    followUps: Array.isArray(data.followUps) ? data.followUps : [],
    visitTypes: Array.isArray(data.visitTypes) ? data.visitTypes : [],
    freeFollowupDays: typeof data.freeFollowupDays === 'number' ? data.freeFollowupDays : 14,
    medicalServices: Array.isArray(data.medicalServices) ? data.medicalServices : [],
    expenseCategories: Array.isArray(data.expenseCategories) ? data.expenseCategories : [],
    alertConfig: data.alertConfig && typeof data.alertConfig === 'object' ? data.alertConfig : {},
    examDisplayConfig: data.examDisplayConfig && typeof data.examDisplayConfig === 'object' ? data.examDisplayConfig : {},
    recurringTemplates: Array.isArray(data.recurringTemplates) ? data.recurringTemplates : [],
    radiologyCatalog: Array.isArray(data.radiologyCatalog) ? data.radiologyCatalog : [],
    labCatalog: Array.isArray(data.labCatalog) ? data.labCatalog : [],
    drugCatalog: Array.isArray(data.drugCatalog) ? data.drugCatalog : [],
    diagnosesCatalog: Array.isArray(data.diagnosesCatalog) ? data.diagnosesCatalog : [],
    symptomsCatalog: Array.isArray(data.symptomsCatalog) ? data.symptomsCatalog : [],
    chronicConditions: Array.isArray(data.chronicConditions) ? data.chronicConditions : [],
  };
  return JSON.stringify(ordered);
}

/**
 * Computes SHA-256 hex digest of a string.
 */
export async function computeSha256Hex(content: string): Promise<string> {
  const subtle = getSubtleCrypto();
  const enc = new TextEncoder();
  const digest = await subtle.digest('SHA-256', enc.encode(content));
  return buf2hex(digest);
}

async function deriveBackupAesKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const subtle = getSubtleCrypto();
  const enc = new TextEncoder();
  const keyMaterial = await subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptPayloadWithPassword(
  plaintext: string,
  password: string
): Promise<{ salt: string; iv: string; ciphertext: string }> {
  const subtle = getSubtleCrypto();
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveBackupAesKey(password, salt);
  const enc = new TextEncoder();

  const encryptedBuf = await subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plaintext)
  );

  return {
    salt: buf2hex(salt.buffer),
    iv: buf2hex(iv.buffer),
    ciphertext: buf2hex(encryptedBuf),
  };
}

async function decryptPayloadWithPassword(
  ciphertextHex: string,
  saltHex: string,
  ivHex: string,
  password: string
): Promise<string> {
  const subtle = getSubtleCrypto();
  const salt = hex2buf(saltHex);
  const iv = hex2buf(ivHex);
  const ciphertext = hex2buf(ciphertextHex);
  const key = await deriveBackupAesKey(password, salt);

  try {
    const decryptedBuf = await subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );
    return new TextDecoder().decode(decryptedBuf);
  } catch {
    throw new Error('كلمة مرور فك تشفير النسخة الاحتياطية غير صحيحة أو أن الملف تالف.');
  }
}

export function calculateCollectionCounts(data: BackupPayloadData): {
  collectionCounts: Record<string, number>;
  totalRecords: number;
  affectedCollections: string[];
} {
  const keys: Array<keyof BackupPayloadData> = [
    'patients',
    'appointments',
    'visits',
    'invoices',
    'payments',
    'prescriptions',
    'labOrders',
    'radiologyOrders',
    'followUps',
    'visitTypes',
    'medicalServices',
    'expenseCategories',
    'recurringTemplates',
    'radiologyCatalog',
    'labCatalog',
    'drugCatalog',
    'diagnosesCatalog',
    'symptomsCatalog',
    'chronicConditions',
  ];

  const collectionCounts: Record<string, number> = {};
  const affectedCollections: string[] = [];
  let totalRecords = 0;

  for (const key of keys) {
    const arr = data[key];
    const count = Array.isArray(arr) ? arr.length : 0;
    collectionCounts[key] = count;
    totalRecords += count;
    if (count > 0) {
      affectedCollections.push(key);
    }
  }

  return { collectionCounts, totalRecords, affectedCollections };
}

/**
 * Creates a verified BackupFileEnvelope with Manifest, SHA-256 Checksum, and optional AES-GCM encryption.
 */
export async function createBackupEnvelope(
  rawData: BackupPayloadData,
  options?: { password?: string }
): Promise<BackupFileEnvelope> {
  const canonicalJson = canonicalizeBackupData(rawData);
  const normalizedData = JSON.parse(canonicalJson) as BackupPayloadData;
  const checksum = await computeSha256Hex(canonicalJson);
  const { collectionCounts, totalRecords, affectedCollections } =
    calculateCollectionCounts(normalizedData);

  const hasPassword = Boolean(options?.password && options.password.trim().length > 0);
  if (hasPassword && options!.password!.trim().length < 6) {
    throw new Error('كلمة مرور حماية النسخة الاحتياطية يجب ألا تقل عن 6 خانات.');
  }

  const manifest: BackupManifest = {
    appName: 'Soli Medical Clinic System',
    appVersion: APP_VERSION,
    schemaVersion: APP_SCHEMA_VERSION,
    createdAt: new Date().toISOString(),
    backupType: hasPassword ? 'FULL_ENCRYPTED' : 'FULL_PLAIN',
    collectionCounts,
    totalRecords,
    affectedCollections,
    checksum,
  };

  if (hasPassword) {
    const encrypted = await encryptPayloadWithPassword(canonicalJson, options!.password!.trim());
    return {
      format: BACKUP_FORMAT_ID,
      manifest,
      encrypted: true,
      salt: encrypted.salt,
      iv: encrypted.iv,
      ciphertext: encrypted.ciphertext,
    };
  }

  return {
    format: BACKUP_FORMAT_ID,
    manifest,
    encrypted: false,
    data: normalizedData,
  };
}

/**
 * Parses and validates a backup file string before any data is written to the system (Item 3 & 4).
 * Rejects corrupted JSON, unsupported schema versions, missing manifests, or mismatched SHA-256 checksums.
 */
export async function parseAndVerifyBackupFile(
  rawContent: string,
  password?: string
): Promise<BackupVerificationResult> {
  if (!rawContent || typeof rawContent !== 'string' || !rawContent.trim()) {
    throw new Error('ملف النسخة الاحتياطية فارغ أو غير صالح.');
  }

  let parsed: any;
  try {
    parsed = JSON.parse(rawContent);
  } catch {
    throw new Error('ملف النسخة الاحتياطية تالف: صيغة JSON غير صالحة.');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('بنية ملف النسخة الاحتياطية غير صالحة.');
  }

  if (parsed.format !== BACKUP_FORMAT_ID || !parsed.manifest || typeof parsed.manifest !== 'object') {
    throw new Error(
      'ملف النسخة الاحتياطية غير متوافق: يفتقر إلى بيانات التعريف (Manifest) أو البصمة الأمنية المعتمدة.'
    );
  }

  const manifest = parsed.manifest as BackupManifest;

  if (
    typeof manifest.schemaVersion !== 'number' ||
    !SUPPORTED_SCHEMA_VERSIONS.includes(manifest.schemaVersion)
  ) {
    throw new Error(
      `إصدار مخطط النسخة الاحتياطية (${manifest.schemaVersion ?? 'غير معروف'}) غير متوافق مع إصدار النظام الحالي (${APP_VERSION}).`
    );
  }

  if (
    typeof manifest.checksum !== 'string' ||
    !/^[0-9a-fA-F]{64}$/.test(manifest.checksum)
  ) {
    throw new Error('ملف النسخة الاحتياطية مرفوض: بصمة التحقق (SHA-256 Checksum) مفقودة أو غير صالحة.');
  }

  if (
    !manifest.createdAt ||
    !manifest.appVersion ||
    !manifest.collectionCounts ||
    typeof manifest.collectionCounts !== 'object'
  ) {
    throw new Error('ملف النسخة الاحتياطية غير مكتمل: بيانات الـ Manifest الأساسية مفقودة.');
  }

  // Handle Encrypted Backup Envelope
  if (parsed.encrypted === true) {
    if (!parsed.ciphertext || !parsed.salt || !parsed.iv) {
      throw new Error('ملف النسخة الاحتياطية المشفر تالف أو ناقص البيانات.');
    }
    if (!password || !password.trim()) {
      return {
        valid: true,
        requiresPassword: true,
        manifest,
      };
    }

    const decryptedJson = await decryptPayloadWithPassword(
      parsed.ciphertext,
      parsed.salt,
      parsed.iv,
      password.trim()
    );
    const decryptedData = JSON.parse(decryptedJson) as BackupPayloadData;
    const canonicalJson = canonicalizeBackupData(decryptedData);
    const actualChecksum = await computeSha256Hex(canonicalJson);

    if (actualChecksum.toLowerCase() !== manifest.checksum.toLowerCase()) {
      throw new Error(
        'فشل التحقق من سلامة النسخة الاحتياطية (Checksum Mismatch): البيانات المشفرة تالفة أو تم التلاعب بها.'
      );
    }

    return {
      valid: true,
      requiresPassword: false,
      manifest,
      data: JSON.parse(canonicalJson) as BackupPayloadData,
    };
  }

  // Handle Plain Backup Envelope
  if (!parsed.data || typeof parsed.data !== 'object') {
    throw new Error('ملف النسخة الاحتياطية لا يحتوي على قسم البيانات (data).');
  }

  const canonicalJson = canonicalizeBackupData(parsed.data as BackupPayloadData);
  const actualChecksum = await computeSha256Hex(canonicalJson);

  if (actualChecksum.toLowerCase() !== manifest.checksum.toLowerCase()) {
    throw new Error(
      'فشل التحقق من سلامة النسخة الاحتياطية (Checksum Mismatch): الملف تالف أو تم التعديل على محتواه.'
    );
  }

  // Also verify that actual array counts match manifest.collectionCounts
  const normalizedData = JSON.parse(canonicalJson) as BackupPayloadData;
  const { collectionCounts } = calculateCollectionCounts(normalizedData);
  for (const [colKey, count] of Object.entries(collectionCounts)) {
    const manifestCount = manifest.collectionCounts[colKey];
    if (typeof manifestCount === 'number' && manifestCount !== count) {
      throw new Error(
        `عدم تطابق في عدد سجلات مجموعة (${colKey}): المتوقع في الـ Manifest (${manifestCount}) والفعلي (${count}).`
      );
    }
  }

  return {
    valid: true,
    requiresPassword: false,
    manifest,
    data: normalizedData,
  };
}

const FIRESTORE_RESTORE_COLLECTIONS: Array<{
  key: keyof BackupPayloadData;
  colName: string;
  idField: string;
}> = [
  { key: 'patients', colName: 'patients', idField: 'patientId' },
  { key: 'appointments', colName: 'appointments', idField: 'appointmentId' },
  { key: 'visits', colName: 'visits', idField: 'visitId' },
  { key: 'invoices', colName: 'invoices', idField: 'invoiceId' },
  { key: 'payments', colName: 'payments', idField: 'paymentId' },
  { key: 'prescriptions', colName: 'prescriptions', idField: 'prescriptionId' },
  { key: 'labOrders', colName: 'labOrders', idField: 'labOrderId' },
  { key: 'radiologyOrders', colName: 'radiologyOrders', idField: 'radiologyOrderId' },
  { key: 'followUps', colName: 'followUps', idField: 'followUpId' },
];

/**
 * Restores verified backup collections to Firestore in safe chunks of <= 400 documents per batch,
 * producing an explicit per-collection success and failure report (Item 3).
 */
export async function restoreVerifiedBackupToFirestore(
  db: Firestore | null,
  data: BackupPayloadData
): Promise<BackupRestoreReport> {
  const report: BackupRestoreReport = {
    success: true,
    totalRestored: 0,
    totalFailed: 0,
    restoredByCollection: {},
    failedByCollection: {},
    failedCollections: [],
    summaryText: '',
  };

  if (!db) {
    report.summaryText = 'تم استعادة إعدادات وأدلة النظام محلياً بنجاح.';
    return report;
  }

  for (const { key, colName, idField } of FIRESTORE_RESTORE_COLLECTIONS) {
    const items = data[key];
    if (!Array.isArray(items) || items.length === 0) {
      continue;
    }

    report.restoredByCollection[colName] = 0;
    report.failedByCollection[colName] = 0;

    const validDocs: Array<{ id: string; payload: any }> = [];
    for (const item of items) {
      const docId = item?.[idField] || item?.id;
      if (item && typeof docId === 'string' && docId.trim().length > 0 && docId.length <= 128) {
        validDocs.push({ id: docId.trim(), payload: item });
      } else {
        report.failedByCollection[colName] += 1;
        report.totalFailed += 1;
        report.success = false;
        if (!report.failedCollections.includes(colName)) {
          report.failedCollections.push(colName);
        }
      }
    }

    for (let i = 0; i < validDocs.length; i += MAX_RESTORE_BATCH_SIZE) {
      const chunk = validDocs.slice(i, i + MAX_RESTORE_BATCH_SIZE);
      const batch = writeBatch(db);
      for (const entry of chunk) {
        batch.set(doc(db, colName, entry.id), entry.payload, { merge: true });
      }
      try {
        await batch.commit();
        report.restoredByCollection[colName] += chunk.length;
        report.totalRestored += chunk.length;
      } catch (err) {
        report.failedByCollection[colName] += chunk.length;
        report.totalFailed += chunk.length;
        report.success = false;
        if (!report.failedCollections.includes(colName)) {
          report.failedCollections.push(colName);
        }
        safeLogger.error(`Restore batch failed for collection ${colName}`, sanitizeErrorForLog(err));
      }
    }
  }

  const colSummary = Object.keys(report.restoredByCollection)
    .map((col) => {
      const ok = report.restoredByCollection[col] || 0;
      const fail = report.failedByCollection[col] || 0;
      return `${col}: ${ok} ناجح${fail > 0 ? ` / ${fail} فاشل` : ''}`;
    })
    .join(' | ');

  report.summaryText = report.success
    ? `تمت استعادة البيانات بنجاح (${report.totalRestored} سجل). ${colSummary ? `[${colSummary}]` : ''}`
    : `اكتملت الاستعادة جزئياً مع وجود أخطاء في (${report.failedCollections.join(', ')}): نجح ${report.totalRestored} وفشل ${report.totalFailed}.`;

  return report;
}

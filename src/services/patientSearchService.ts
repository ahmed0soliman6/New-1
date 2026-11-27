/**
 * البحث عند الطلب عن المرضى خارج نافذة الـ 90 يوماً (Hybrid search).
 *
 * لماذا هذه الخدمة موجودة؟ الاشتراك الحي للمرضى في App.tsx مقيّد الآن
 * بنافذة 90 يوماً (lastVisitDate أو createdAt) حتى لا يُحمَّل كل
 * السجل عند كل فتح — فمريض قديم (آخر كشف/تسجيل قبل أكثر من 90 يوماً)
 * لا يكون في القائمة الحية. هذه الخدمة تجلبه عند البحث فقط، وبدون
 * توسيع أي اشتراك حي: قراءات getDocs/getDoc فقط، ولا كتابة أبداً.
 *
 * المقايضات المقبولة (موثّقة هنا حتى لا تُفسَّر كأخطاء لاحقاً):
 *  (أ) البحث عن القدامى بادئة/كلمة كاملة فقط: نطاق بادئة على fullName
 *      (name >= q, name < q+\uf8ff) لا يجد تطابقاً في منتصف الاسم،
 *      بخلاف البحث المحلي الذي يطابق أي جزء (substring). مريض قديم
 *      يُبحث عنه بأول اسمه، لا باسمه الثاني وحده.
 *  (ب) تأخير طفيف: نتائج القدامى تأتي بعد مهلة 300ms عند مواضع
 *      الاستدعاء، مع مؤشر «جارٍ البحث في السجلات القديمة...».
 *  (ج) بضع قراءات لكل بحث (استعلام أو اثنان للاسم + استعلام لكل
 *      صيغة هاتف)، وتُحسب عبر meterQuery.
 *  (د) بحث الاسم على الخادم حسّاس لحالة الأحرف اللاتينية (case-sensitive)
 *      ولا يطبّع العربية: نجرب البادئة كما كُتبت وبعد تطبيع أشكال
 *      الألف/التاء المربوطة/الألف المقصورة كمحاولة ثانية، لكن صيغاً
 *      أخرى (تشكيل، همزات) قد تفوت.
 *  (هـ) الهواتف المخزنة غير موحّدة (صفر بادئ، +20، مسافات) والبحث
 *      المحلي يطبّع الأرقام أولاً — وهو ما لا يستطيع استعلام الخادم
 *      فعله. لذلك نجرب صيغاً عدة للهاتف (كما كُتب، أرقام فقط، بحذف
 *      الصفر البادئ أو بإضافته، وبتحويل 20 الدولية إلى 0)؛ رقم بصيغة
 *      غريبة قد يفوت مع ذلك، وعندها يبقى البحث برقم الملف أو بالاسم.
 *
 * فخّ createdAt المختلط (مهم): حقل createdAt مخزَّن كسلسلة ISO من
 * مسار التسجيل، لكن كـ Firestore Timestamp (serverTimestamp) من مسار
 * الحجز — والنوعان موجودان معاً في المجموعة. في ترتيب أنواع Firestore
 * تأتي الـ Timestamps قبل السلاسل، فاستعلام النطاق
 * where('createdAt','>=', <ISO string>) يفوّت المستندات ذات
 * الـ Timestamp مهما كانت حديثة. لذلك ذراع createdAt في النافذة الحية
 * يلتقط التسجيلات الحديثة ذات السلسلة فقط؛ والتسجيلات الحديثة ذات
 * الـ Timestamp التي تفوته تُجلب هنا عند الحاجة عبر getPatientById
 * (المواعيد والزيارات تحمل patientId) أو عبر بحث الاسم/الهاتف.
 *
 * الاستعلامات (كلها على حقل واحد — لا فهارس مركّبة مطلوبة):
 *  - الاسم: نطاق بادئة على fullName.
 *  - الهاتف: نطاق بادئة على phone لكل صيغة من صيغ الاستعلام.
 *  - بالمعرّف: getDoc واحد (قراءة واحدة).
 *  - ملفات المرضى: where('hasClinicalFile','==',true) مع limit و
 *    startAfter للترقيم — بلا orderBy عمداً، لأن المساواة + orderBy
 *    على حقل آخر كانا سيتطلبان فهرساً مركّباً جديداً.
 */
import {
  collection,
  doc,
  type DocumentSnapshot,
  getDoc,
  getDocs,
  limit,
  query,
  startAfter,
  where,
  type QueryConstraint,
} from 'firebase/firestore';
import { db } from './firebase';
import { mapDocs, normalize } from './repositories/common';
import { meterDoc, meterQuery } from './readMeter';
import { calculateAge } from '../utils/dayKey';
import { formatAppDate, formatAppTime } from '../utils/numberUtils';
import type { Patient } from '../types/database';
import type { PatientListItem } from '../types';

/** حد أقصى لمرضى النتائج في طلب بحث واحد. */
const PATIENT_SEARCH_LIMIT = 10;
/** حد أقصى لملفات المرضى في كل صفحة من ترقيم شاشة الملفات. */
const CLINICAL_FILES_PAGE_SIZE = 50;

export interface PatientSearchInput {
  /** نص البحث كما كتبه المستخدم (اسم أو هاتف). */
  query: string;
  /** المرضى المحليون (داخل النافذة) — تُستبعد معرّفاتهم من النتائج. */
  localPatients?: PatientListItem[];
}

function mapPatientDoc(d: { id: string; data: () => Record<string, unknown> }): Patient {
  const data = d.data();
  return normalize({ ...data, patientId: (data.patientId as string) || d.id }) as Patient;
}

/**
 * يحوّل مستند Patient إلى PatientListItem بنفس قواعد الاشتقاق في
 * App.tsx (الملخص أولاً، ثم النوافذ — وهنا الملخص فقط، لأن النتائج
 * عند الطلب بلا نوافذ محمّلة خلفها).
 */
export function toPatientListItem(p: Patient): PatientListItem {
  const created = p.createdAt ? new Date(p.createdAt) : new Date();
  const summaryDayKey = p.lastVisitDate || undefined;
  const summaryLast = summaryDayKey
    ? new Date(`${summaryDayKey}T12:00:00`)
    : p.lastVisitAt
      ? new Date(p.lastVisitAt)
      : undefined;
  return {
    id: p.patientId,
    medicalCode: p.medicalCode || `EG-${p.fileNumber || p.patientId.slice(0, 5)}`,
    fileNumber: p.fileNumber || 1,
    name: p.fullName,
    age: calculateAge(p.dateOfBirth) ?? 0,
    gender: p.gender === 'female' ? 'female' : 'male',
    phone: p.phone || '',
    governorate: p.governorate || '',
    address: p.address || p.governorate || '',
    allergies: p.allergies || [],
    chronicConditions: p.chronicDiseases || [],
    bloodType: p.bloodType || 'غير محدد',
    bloodGroup: p.bloodType || 'غير محدد',
    emergencyContact: p.emergencyContact,
    lastVisitDate: summaryLast ? formatAppDate(summaryLast) : undefined,
    lastVisitTime: summaryLast && !summaryDayKey ? formatAppTime(summaryLast) : undefined,
    registrationDate: formatAppDate(created),
    registrationTime: formatAppTime(created),
    visitsCount: typeof p.visitsCount === 'number' && p.visitsCount > 0 ? p.visitsCount : 1,
    totalPaid: 0,
    lastDiagnosis: p.lastDiagnosis || '',
  };
}

/** تطبيع أشكال الألف/التاء المربوطة/الألف المقصورة لمحاولة اسم ثانية. */
function normalizeArabicPrefix(q: string): string {
  return q
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي');
}

/** صيغ الهاتف المرشحة لنطاقات البادئة (انظر فقرة (هـ) أعلاه). */
function phonePrefixVariants(raw: string): string[] {
  const digits = raw.replace(/[^0-9]/g, '');
  if (digits.length < 3) return [];
  const variants = new Set<string>([raw.trim(), digits]);
  // 0020 / 20 الدولية ← 0 محلية، والعكس.
  if (digits.startsWith('0020')) variants.add(`0${digits.slice(4)}`);
  else if (digits.startsWith('20') && digits.length === 12) variants.add(`0${digits.slice(2)}`);
  // صفر بادئ: إضافته أو حذفه.
  if (digits.startsWith('0')) variants.add(digits.slice(1));
  else if (digits.length === 10 && digits.startsWith('1')) variants.add(`0${digits}`);
  return [...variants].filter((v) => v.length >= 3);
}

/**
 * يبحث في كل السجل (أي تاريخ) عن مرضى يطابقون الاسم (بادئة) أو الهاتف
 * (بادئة بأي صيغة)، ويعيد Patient[] جاهزة للدمج مع النتائج المحلية.
 * لا يغيّر أي اشتراك حي ولا يكتب أي بيانات — قراءات getDocs فقط.
 * الاستعلام الأقصر من حرفين يرجع [] فوراً بلا قراءات.
 */
export async function searchPatientsOnDemand({
  query: rawQuery,
  localPatients = [],
}: PatientSearchInput): Promise<Patient[]> {
  if (!db) return [];
  const q = rawQuery.trim();
  if (q.length < 2) return [];

  const localIds = new Set(localPatients.map((p) => p.id));
  const found = new Map<string, Patient>();
  const hasLetter = /[^\d\s+()-]/.test(q);
  const digits = q.replace(/[^0-9]/g, '');

  try {
    // ——— (أ) الاسم: نطاق بادئة على fullName ———
    // تُتخطى هذه الذراع للاستعلام الرقمي الصرف (أرقام الهاتف لا تبدأ
    // بها الأسماء) حتى لا تُهدر قراءة الحد الأدنى على استعلام فارغ.
    if (hasLetter) {
      const namePrefixes = [...new Set([q, normalizeArabicPrefix(q)])];
      await Promise.all(
        namePrefixes.map(async (prefix) => {
          const snap = await getDocs(
            query(
              collection(db, 'patients'),
              where('fullName', '>=', prefix),
              where('fullName', '<', `${prefix}\uf8ff`),
              limit(PATIENT_SEARCH_LIMIT)
            )
          );
          meterQuery('search:patients', snap);
          snap.docs.map(mapPatientDoc).forEach((p) => {
            if (!localIds.has(p.patientId)) found.set(p.patientId, p);
          });
        })
      );
    }

    // ——— (ب) الهاتف: نطاق بادئة على phone لكل صيغة ———
    const variants = phonePrefixVariants(q);
    if (digits.length >= 3 && variants.length > 0) {
      await Promise.all(
        variants.map(async (prefix) => {
          const snap = await getDocs(
            query(
              collection(db, 'patients'),
              where('phone', '>=', prefix),
              where('phone', '<', `${prefix}\uf8ff`),
              limit(PATIENT_SEARCH_LIMIT)
            )
          );
          meterQuery('search:patients', snap);
          snap.docs.map(mapPatientDoc).forEach((p) => {
            if (!localIds.has(p.patientId)) found.set(p.patientId, p);
          });
        })
      );
    }
  } catch (err) {
    // البحث عند الطلب تحسينٌ فوق البحث الحي — أي فشل هنا لا يجب أن
    // يكسر البحث: تبقى النتائج الحية كما هي.
    console.warn('[patientSearch] on-demand search failed', err);
    return [];
  }

  // الأحدث تسجيلاً أولاً، ثم الأعلى رقم ملف — نفس ترتيب القائمة الحية.
  return [...found.values()]
    .sort((a, b) => {
      const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (tB !== tA) return tB - tA;
      return (Number(b.fileNumber) || 0) - (Number(a.fileNumber) || 0);
    })
    .slice(0, PATIENT_SEARCH_LIMIT);
}

// ذاكرة صغيرة داخل الجلسة حتى لا تُعاد قراءة المريض نفسه من الخادم
// عند كل مسار احتياطي (تسجيل حضور، متابعات، طابور...).
const byIdCache = new Map<string, Patient | null>();

/** يجلب مريضاً واحداً بمعرّفه (قراءة واحدة) — لمسارات الاحتياط. */
export async function getPatientById(patientId: string): Promise<Patient | null> {
  if (!patientId) return null;
  if (byIdCache.has(patientId)) return byIdCache.get(patientId) ?? null;
  if (!db) return null;
  try {
    const snap = await getDoc(doc(db, 'patients', patientId));
    meterDoc('search:patient-by-id', snap);
    const patient = snap.exists() ? mapPatientDoc(snap) : null;
    byIdCache.set(patientId, patient);
    return patient;
  } catch (err) {
    console.warn('[patientSearch] getPatientById failed', err);
    return null;
  }
}

/** يزرع مريضاً معروفاً محلياً في ذاكرة getPatientById (بلا قراءة). */
export function primePatientCache(patient: Patient): void {
  if (patient?.patientId) byIdCache.set(patient.patientId, patient);
}

export interface ClinicalFilesPage {
  patients: Patient[];
  /** مؤشر الصفحة التالية (مستند Firestore) أو null إن انتهت النتائج. */
  nextCursor: DocumentSnapshot | null;
  hasMore: boolean;
}

/**
 * صفحة من كل المرضى ذوي الملفات السريرية (hasClinicalFile == true)،
 * بلا orderBy عمداً حتى لا يتطلب الاستعلام فهرساً مركّباً جديداً —
 * الترتيب يتم على العميل (الأعلى رقم ملف أولاً) في شاشة الملفات.
 * كل صفحة 50 مستنداً كحد أقصى.
 */
export async function fetchClinicalFilesPage(
  cursor?: DocumentSnapshot | null
): Promise<ClinicalFilesPage> {
  if (!db) return { patients: [], nextCursor: null, hasMore: false };
  try {
    const constraints: QueryConstraint[] = [
      where('hasClinicalFile', '==', true),
      limit(CLINICAL_FILES_PAGE_SIZE),
    ];
    const q = cursor
      ? query(collection(db, 'patients'), ...constraints, startAfter(cursor))
      : query(collection(db, 'patients'), ...constraints);
    const snap = await getDocs(q);
    meterQuery('search:clinical-files', snap);
    const patients = mapDocs<Patient>('patients', snap);
    const last = snap.docs[snap.docs.length - 1] ?? null;
    return {
      patients,
      nextCursor: patients.length === CLINICAL_FILES_PAGE_SIZE ? last : null,
      hasMore: patients.length === CLINICAL_FILES_PAGE_SIZE,
    };
  } catch (err) {
    console.warn('[patientSearch] clinical-files page failed', err);
    return { patients: [], nextCursor: null, hasMore: false };
  }
}

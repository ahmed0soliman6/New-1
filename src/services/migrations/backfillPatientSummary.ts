/**
 * ترحيل ملخص المريض (إصلاح 2 — مراجعة كلود لِـ W4).
 *
 * يعيد حساب حقول الملخص على مستند كل مريض من تاريخه الكامل:
 *   hasClinicalFile — true إن وُجدت زيارة مكتملة أو روشتة
 *   visitsCount     — عدد الزيارات المكتملة
 *   lastVisitDate   — يوم (dayKey بتوقيت القاهرة) أحدث زيارة مكتملة
 *   lastDiagnosis   — تشخيص تلك الزيارة (أول عنصر في قائمتها)
 *   lastVisitAt     — وقت إتمام تلك الزيارة (يُكتب مع الملخص فقط)
 *
 * الاستعلامات لكل مريض على حدة (patientId ==) مثل fetchPatientHistory،
 * لا من نافذة الـ 90 يوماً — حتى تُحسب زيارات المرضى القدامى كلها.
 *
 * آمن لإعادة التشغيل (idempotent): يُكتب المستند فقط إن اختلفت القيم
 * المحسوبة عن المخزّنة، فإعادة التشغيل تعيد نفس القيم وتُبلّغ أن الكل
 * صحيح. يُصلح أيضاً ملخصاً أعلى من الحقيقة بعد حذف زيارة مكتملة.
 *
 * لا يُشغَّل تلقائياً — أحمد يضغط الزر في الإعدادات بعد النشر.
 * يكتب مستندات patients الموجودة فقط عبر batch.update العادي؛ قاعدة
 * Firestore للمرضى تسمح بالتحديث للمدير/الطبيب وأصحاب صلاحية
 * patient-records:update — لا حاجة لقاعدة جديدة.
 *
 * إصلاح أرقام الملفات (2026-11-27): في نفس المسح يُجمَع أعلى رقم ملف،
 * وتُكتشَف الأرقام المكررة، وتُبذَر عدّاد counters/patientFile، وتُعاد
 * تسمية المكررات اللاحقة بأرقام حرة فوق الحد الأقصى. رقم الملف لا يُستخدم
 * مفتاحاً في أي مجموعة أخرى (الزيارات والفواتير والمدفوعات والمواعيد
 * ترتبط بـ patientId فقط؛ والـ medicalCode المخزّن رمز مستقل، ويُحدَّث
 * فقط إن كان مشتقاً من الرقم القديم EG-<رقم>)، لذا إعادة التسمية آمنة.
 * الإصلاح والبذر لا يتمّان إلا إن اكتمل المسح كاملاً (بلا توقف مبكر) حتى
 * لا يُبذَر العدّاد من حد أقصى ناقص أو تُعاد تسمية رقم يملكه مريض لم يُفحص
 * بعد — عند التوقف المبكر يُعاد التشغيل لإكمالهما.
 */
import {
  collection, doc, documentId, getDoc, getDocs, limit, orderBy, query, setDoc, startAfter,
  where, writeBatch, type Firestore, type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { toDate, toDayKey } from '../../utils/dayKey';

const PAGE = 200;
const WRITE_BUDGET = 8000; // حد أمان لكل تشغيلة (الحد اليومي المجاني 20,000 كتابة)

export interface PatientSummaryMigrationReport {
  patientsScanned: number;
  patientsUpdated: number;
  alreadyCorrect: number;
  completedVisitsScanned: number;
  prescriptionsScanned: number;
  stoppedEarly: boolean;
  stoppedEarlyReason: string;
  finishedAt: string;
  /** أعلى رقم ملف وُجد في المسح. */
  maxFileNumber: number;
  /** كم مريضاً أُعيدت تسمية رقم ملفه المكرر. */
  duplicatesRepaired: number;
  /** هل بُذَر عدّاد أرقام الملفات counters/patientFile؟ */
  fileCounterSeeded: boolean;
  /** قيمة lastNumber التي بُذَر بها العدّاد (null إن لم يُبذَر). */
  fileCounterSeededTo: number | null;
}

export async function backfillPatientSummary(
  db: Firestore,
  onProgress?: (msg: string) => void,
): Promise<PatientSummaryMigrationReport> {
  const report: PatientSummaryMigrationReport = {
    patientsScanned: 0,
    patientsUpdated: 0,
    alreadyCorrect: 0,
    completedVisitsScanned: 0,
    prescriptionsScanned: 0,
    stoppedEarly: false,
    stoppedEarlyReason: '',
    finishedAt: new Date().toISOString(),
    maxFileNumber: 0,
    duplicatesRepaired: 0,
    fileCounterSeeded: false,
    fileCounterSeededTo: null,
  };

  // أرقام الملفات المجمّعة أثناء المسح (للبذر وكشف التكرار بعد اكتماله).
  const fileNumbers: Array<{ pid: string; fileNumber: number; createdAt: string; medicalCode: string }> = [];
  let maxFileNumber = 0;

  let writes = 0;
  let cursor: QueryDocumentSnapshot | undefined;
  // تحديثات معلّقة تُرسل دفعات (400 كحد أقصى للدفعة) بدل التزام لكل مريض.
  let pending: Array<{ ref: ReturnType<typeof doc>; data: Record<string, unknown> }> = [];
  const flushPending = async () => {
    if (pending.length === 0) return;
    const batch = writeBatch(db);
    for (const u of pending) batch.update(u.ref, u.data);
    await batch.commit();
    pending = [];
  };

  for (;;) {
    const base = [orderBy(documentId()), ...(cursor ? [startAfter(cursor)] : []), limit(PAGE)];
    const patientsSnap = await getDocs(query(collection(db, 'patients'), ...base));
    if (patientsSnap.empty) break;

    for (const pDoc of patientsSnap.docs) {
      const pid = pDoc.id;
      const stored = pDoc.data() as {
        hasClinicalFile?: boolean;
        visitsCount?: number;
        lastVisitDate?: string;
        lastDiagnosis?: string;
        fileNumber?: number | string;
        medicalCode?: string;
        createdAt?: string;
      };
      report.patientsScanned++;

      // رقم الملف: يُجمَع قبل أي تخطٍّ، لأن مريضاً بلا تاريخ سريري
      // قد يحمل رقماً مكرراً أو يكون هو صاحب الحد الأقصى.
      const fileNum = typeof stored.fileNumber === 'number' ? stored.fileNumber : Number(stored.fileNumber) || 0;
      if (fileNum > 0) {
        fileNumbers.push({
          pid,
          fileNumber: fileNum,
          createdAt: typeof stored.createdAt === 'string' ? stored.createdAt : '',
          medicalCode: typeof stored.medicalCode === 'string' ? stored.medicalCode : '',
        });
        if (fileNum > maxFileNumber) maxFileNumber = fileNum;
      }

      // تاريخ المريض الكامل — استعلامان لكل مريض، بلا حدّ زمني.
      // أي فشل هنا يوقف الترحيل كاملاً (throw) حتى لا تُكتب ملخصات
      // خاطئة (مثلاً hasClinicalFile=false) من قراءة ناقصة.
      const [visitsSnap, rxSnap] = await Promise.all([
        getDocs(query(collection(db, 'visits'), where('patientId', '==', pid))),
        getDocs(query(collection(db, 'prescriptions'), where('patientId', '==', pid))),
      ]);

      const completed = visitsSnap.docs
        .map((d) => d.data())
        .filter((v) => v.status === 'COMPLETED');
      report.completedVisitsScanned += completed.length;
      report.prescriptionsScanned += rxSnap.size;

      // أحدث زيارة مكتملة: الأحدث dayKey، ثم الأحدث وقت إتمام/إنشاء.
      const latest = [...completed].sort((a, b) => {
        const ka = (a.dayKey as string) || toDayKey(a.completedAt ?? a.createdAt);
        const kb = (b.dayKey as string) || toDayKey(b.completedAt ?? b.createdAt);
        if (kb !== ka) return kb < ka ? -1 : 1;
        const ta = toDate(a.completedAt ?? a.createdAt)?.getTime() ?? 0;
        const tb = toDate(b.completedAt ?? b.createdAt)?.getTime() ?? 0;
        return tb - ta;
      })[0];

      const lastVisitDate = latest
        ? (latest.dayKey as string) || toDayKey(latest.completedAt ?? latest.createdAt)
        : '';
      const lastDiagnosis = latest
        ? (Array.isArray(latest.clinicalData?.diagnosis)
            ? latest.clinicalData.diagnosis[0]
            : latest.clinicalData?.diagnosis) || ''
        : '';
      const lastVisitAt = latest
        ? (toDate(latest.completedAt ?? latest.createdAt)?.toISOString() ?? '')
        : '';

      const computed = {
        hasClinicalFile: completed.length > 0 || rxSnap.size > 0,
        visitsCount: completed.length,
        lastVisitDate,
        lastDiagnosis,
      };

      // مريض بلا أي تاريخ سريري وبلا ملخص مخزّن: لا شيء يُصلح — يُتخطى
      // دون كتابة. أما إن كان مخزّناً له ملخص خاطئ (مثلاً بعد حذف
      // زياراته) فهو اختلاف يُصحَّح أدناه.
      const hasStoredSummary =
        stored.hasClinicalFile !== undefined ||
        stored.visitsCount !== undefined ||
        stored.lastVisitDate !== undefined ||
        stored.lastDiagnosis !== undefined;
      if (!computed.hasClinicalFile && !hasStoredSummary) {
        report.alreadyCorrect++;
        continue;
      }

      const differs =
        (stored.hasClinicalFile ?? false) !== computed.hasClinicalFile ||
        (stored.visitsCount ?? 0) !== computed.visitsCount ||
        (stored.lastVisitDate ?? '') !== computed.lastVisitDate ||
        (stored.lastDiagnosis ?? '') !== computed.lastDiagnosis;
      if (!differs) {
        report.alreadyCorrect++;
        continue;
      }

      if (writes + 1 > WRITE_BUDGET) {
        await flushPending();
        report.stoppedEarly = true;
        report.stoppedEarlyReason = 'توقف عند حد الكتابة (8000) — أعد التشغيل لإكمال الباقي، بما فيه إصلاح أرقام الملفات المكررة وبذر عدّاد أرقام الملفات.';
        report.finishedAt = new Date().toISOString();
        return report;
      }

      pending.push({
        ref: doc(db, 'patients', pid),
        data: {
          hasClinicalFile: computed.hasClinicalFile,
          visitsCount: computed.visitsCount,
          lastVisitDate: computed.lastVisitDate,
          lastDiagnosis: computed.lastDiagnosis,
          ...(lastVisitAt ? { lastVisitAt } : {}),
          updatedAt: new Date().toISOString(),
        },
      });
      writes++;
      report.patientsUpdated++;
      if (pending.length >= 400) await flushPending();
      onProgress?.(`فحص ${report.patientsScanned} مريض / حُدّث ${report.patientsUpdated} / صحيح ${report.alreadyCorrect}`);
    }

    await flushPending();
    onProgress?.(`فحص ${report.patientsScanned} مريض / حُدّث ${report.patientsUpdated} / صحيح ${report.alreadyCorrect}`);
    cursor = patientsSnap.docs[patientsSnap.docs.length - 1];
    if (patientsSnap.size < PAGE) break;
  }

  // --- إصلاح أرقام الملفات + بذر العدّاد (بعد اكتمال المسح فقط) ---
  report.maxFileNumber = maxFileNumber;
  const byNumber = new Map<number, typeof fileNumbers>();
  for (const entry of fileNumbers) {
    const group = byNumber.get(entry.fileNumber) || [];
    group.push(entry);
    byNumber.set(entry.fileNumber, group);
  }
  // الأقدم تسجيلاً يحتفظ بالرقم؛ اللاحقون يُعاد تسميتهم بأرقام حرة فوق
  // الحد الأقصى (تتصاعد مع كل إعادة تسمية فلا تتصادم مع بعضها).
  let nextFree = maxFileNumber;
  for (const group of byNumber.values()) {
    if (group.length < 2) continue;
    const ordered = [...group].sort((a, b) =>
      a.createdAt !== b.createdAt
        ? a.createdAt < b.createdAt
          ? -1
          : 1
        : a.pid < b.pid
          ? -1
          : 1,
    );
    for (const dup of ordered.slice(1)) {
      if (writes + 1 > WRITE_BUDGET) {
        report.stoppedEarly = true;
        report.stoppedEarlyReason =
          'توقف أثناء إصلاح أرقام الملفات المكررة عند حد الكتابة (8000) — أعد التشغيل لإكمال الإصلاح وبذر العدّاد.';
        report.finishedAt = new Date().toISOString();
        return report;
      }
      nextFree += 1;
      const newNumber = nextFree;
      pending.push({
        ref: doc(db, 'patients', dup.pid),
        data: {
          fileNumber: newNumber,
          // إن كان الرمز الطبي مشتقاً من الرقم القديم يُحدَّث معه؛
          // أما الرمز العشوائي المستقل فيُترك كما هو.
          ...(dup.medicalCode === `EG-${dup.fileNumber}` ? { medicalCode: `EG-${newNumber}` } : {}),
          updatedAt: new Date().toISOString(),
        },
      });
      writes++;
      report.duplicatesRepaired++;
      onProgress?.(`إصلاح رقم ملف مكرر #${dup.fileNumber} ← #${newNumber}`);
    }
  }
  await flushPending();

  // بذر العدّاد: أحادي الاتجاه أبداً — max(القيمة المخزّنة، أعلى رقم ملف).
  // التخصيص التالي = lastNumber + 1، أي أعلى رقم + 1 تماماً بلا فجوة.
  if (maxFileNumber > 0) {
    if (writes + 1 > WRITE_BUDGET) {
      report.stoppedEarly = true;
      report.stoppedEarlyReason =
        'توقف قبل بذر عدّاد أرقام الملفات عند حد الكتابة (8000) — أعد التشغيل لبذر العدّاد.';
      report.finishedAt = new Date().toISOString();
      return report;
    }
    const counterRef = doc(db, 'counters', 'patientFile');
    const counterSnap = await getDoc(counterRef);
    const existingLast = counterSnap.exists()
      ? Number((counterSnap.data() as { lastNumber?: unknown }).lastNumber) || 0
      : 0;
    const seedTo = Math.max(existingLast, maxFileNumber);
    await setDoc(counterRef, { lastNumber: seedTo }, { merge: true });
    writes++;
    report.fileCounterSeeded = true;
    report.fileCounterSeededTo = seedTo;
    onProgress?.(`بُذَر عدّاد أرقام الملفات (counters/patientFile) عند ${seedTo} — التخصيص التالي #${seedTo + 1}`);
  }

  report.finishedAt = new Date().toISOString();
  return report;
}

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
 */
import {
  collection, doc, documentId, getDocs, limit, orderBy, query, startAfter,
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
  };

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
      };
      report.patientsScanned++;

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
        report.stoppedEarlyReason = 'توقف عند حد الكتابة (8000) — أعد التشغيل لإكمال الباقي.';
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

  report.finishedAt = new Date().toISOString();
  return report;
}

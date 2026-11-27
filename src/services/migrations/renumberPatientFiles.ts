/**
 * إعادة ترقيم ملفات المرضى من 1 (2026-11-27).
 *
 * يعيد ترقيم كل ملفات المرضى الموجودة من 1 حسب تاريخ التسجيل
 * (الأقدم أولاً)، ثم يضبط عدّاد counters/patientFile على عدد المرضى
 * تماماً، فيكون التخصيص التالي #N+1 بلا فجوة.
 *
 * يختلف عن بذر العدّاد في ترحيل الملخص (backfillPatientSummary):
 * البذر أحادي الاتجاه أبداً (Math.max) فلا يُنقص العدّاد أبداً، أما هنا
 * فالعدّاد يُضبَط على N بالضبط — لأن الأرقام القديمة (التجريبية، من
 * 9001) تُلغى كلها وتُستبدل بـ 1..N.
 *
 * رقم الملف لا يُستخدم مفتاحاً في أي مجموعة أخرى (الزيارات والفواتير
 * والمدفوعات والمواعيد ترتبط بـ patientId فقط؛ والـ medicalCode المخزّن
 * رمز مستقل، ويُحدَّث فقط إن كان مشتقاً من الرقم القديم EG-<رقم>)،
 * لذا إعادة الترقيم آمنة — نفس قاعدة ترحيل الملخص لإصلاح المكررات.
 *
 * ترتيب التسجيل: createdAt مخزّن بصيغتين — نص ISO من مسار التسجيل،
 * وFirestore Timestamp (serverTimestamp) من مسار المواعيد — لذا
 * يُطبَّع عبر toDate قبل المقارنة؛ من لا تاريخ صالح له يُرتَّب آخراً،
 * وكسر التعادل بـ patientId حتى يكون الترتيب حتمياً.
 *
 * لا يُشغَّل تلقائياً — أحمد يضغط الزر في الإعدادات بعد النشر، بعد
 * حذف البيانات التجريبية. يكتب مستندات patients الموجودة فقط عبر
 * batch.update العادي؛ قاعدة Firestore للمرضى تسمح بالتحديث للمدير/
 * الطبيب وأصحاب صلاحية patient-records:update — لا حاجة لقاعدة جديدة.
 * قاعدة العدّادات تسمح بأي lastNumber بما فيه 0.
 *
 * عند الخطأ: يتوقف فوراً وتُرمى رسالة تذكر كم مريضاً كُتب فعلاً قبل
 * التوقف (حالة جزئية ممكنة عبر الدفعات — مع 6 مرضى هي دفعة واحدة).
 * لا يُضبَط العدّاد إلا بعد نجاح كل كتابات المرضى.
 */
import {
  collection, doc, documentId, getDocs, limit, orderBy, query, setDoc, startAfter,
  writeBatch, type Firestore, type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { PATIENT_FILE_COUNTER_ID } from '../firestoreWorkflows';
import { toDate, type DateLike } from '../../utils/dayKey';

const PAGE = 200;

export interface RenumberPatientFilesReport {
  patientsScanned: number;
  patientsRenumbered: number;
  counterSetTo: number;
  finishedAt: string;
}

export async function renumberPatientFiles(
  db: Firestore,
  onProgress?: (msg: string) => void,
): Promise<RenumberPatientFilesReport> {
  const report: RenumberPatientFilesReport = {
    patientsScanned: 0,
    patientsRenumbered: 0,
    counterSetTo: 0,
    finishedAt: new Date().toISOString(),
  };

  // كل المرضى أولاً، ثم الترتيب في الذاكرة بتاريخ التسجيل.
  const collected: Array<{ pid: string; fileNumber: number; medicalCode: string; createdAtMs: number }> = [];

  try {
    let cursor: QueryDocumentSnapshot | undefined;
    for (;;) {
      const base = [orderBy(documentId()), ...(cursor ? [startAfter(cursor)] : []), limit(PAGE)];
      const patientsSnap = await getDocs(query(collection(db, 'patients'), ...base));
      if (patientsSnap.empty) break;

      for (const pDoc of patientsSnap.docs) {
        const stored = pDoc.data() as {
          fileNumber?: number | string;
          medicalCode?: string;
          createdAt?: DateLike;
        };
        report.patientsScanned++;
        const fileNum = Number(stored.fileNumber);
        collected.push({
          pid: pDoc.id,
          fileNumber: Number.isFinite(fileNum) ? fileNum : 0,
          medicalCode: typeof stored.medicalCode === 'string' ? stored.medicalCode : '',
          // بلا تاريخ صالح يُرتَّب آخراً (Infinity).
          createdAtMs: toDate(stored.createdAt)?.getTime() ?? Infinity,
        });
      }

      onProgress?.(`فحص ${report.patientsScanned} مريض…`);
      cursor = patientsSnap.docs[patientsSnap.docs.length - 1];
      if (patientsSnap.size < PAGE) break;
    }

    // الأقدم تسجيلاً أولاً؛ كسر التعادل بـ patientId (حتمي).
    const ordered = [...collected].sort((a, b) =>
      a.createdAtMs !== b.createdAtMs
        ? a.createdAtMs - b.createdAtMs
        : a.pid < b.pid
          ? -1
          : a.pid > b.pid
            ? 1
            : 0,
    );

    // كتابات معلّقة تُرسل دفعات (400 كحد أقصى للدفعة).
    let pending: Array<{ ref: ReturnType<typeof doc>; data: Record<string, unknown> }> = [];
    const flushPending = async () => {
      if (pending.length === 0) return;
      const batch = writeBatch(db);
      for (const u of pending) batch.update(u.ref, u.data);
      await batch.commit();
      pending = [];
    };

    let newNumber = 0;
    for (const entry of ordered) {
      newNumber += 1;
      const oldNumber = entry.fileNumber;
      // الرمز الطبي يُحدَّث فقط إن كان مشتقاً من الرقم القديم؛
      // أما الرمز العشوائي المستقل فيُترك كما هو.
      const codeFollowsOldNumber =
        Number.isFinite(oldNumber) &&
        oldNumber > 0 &&
        entry.medicalCode === `EG-${oldNumber}`;
      const needsWrite =
        oldNumber !== newNumber ||
        (codeFollowsOldNumber && entry.medicalCode !== `EG-${newNumber}`);
      if (!needsWrite) continue;

      pending.push({
        ref: doc(db, 'patients', entry.pid),
        data: {
          fileNumber: newNumber,
          ...(codeFollowsOldNumber ? { medicalCode: `EG-${newNumber}` } : {}),
          updatedAt: new Date().toISOString(),
        },
      });
      report.patientsRenumbered++;
      onProgress?.(`إعادة ترقيم ملف #${oldNumber || '؟'} ← #${newNumber}`);
      if (pending.length >= 400) await flushPending();
    }
    await flushPending();

    // العدّاد يُضبَط على N بالضبط — بعد نجاح كل كتابات المرضى فقط.
    const counterRef = doc(db, 'counters', PATIENT_FILE_COUNTER_ID);
    await setDoc(counterRef, { lastNumber: ordered.length }, { merge: true });
    report.counterSetTo = ordered.length;
    onProgress?.(
      `ضُبط عدّاد أرقام الملفات (counters/patientFile) على ${ordered.length} — التخصيص التالي #${ordered.length + 1}`,
    );
  } catch (e) {
    // حالة جزئية ممكنة: بعض الدفعات السابقة قد تكون كُتبت فعلاً.
    throw new Error(
      `توقف إعادة الترقيم بعد كتابة ${report.patientsRenumbered} مريض (من ${report.patientsScanned} مفحوصاً) — أعد التشغيل لإكمال الباقي: ${(e as Error).message}`,
    );
  }

  report.finishedAt = new Date().toISOString();
  return report;
}

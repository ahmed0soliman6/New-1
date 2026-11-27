import type { Firestore } from 'firebase/firestore';
import { where } from 'firebase/firestore';
import type { Patient } from '../../types/database';
import { FirestoreCollections } from '../firebase/collections';
import { subscribeCollection } from './common';
import { subscribeMerged } from './windowed';

export const subscribeToPatients = (
  db: Firestore,
  next: (items: Patient[]) => void,
  error: (reason: Error) => void
) => subscribeCollection<Patient>(db, FirestoreCollections.PATIENTS, next, error);

/**
 * الاشتراك الحي للمرضى الحديثين فقط (نافذة 90 يوماً) — بديل الاشتراك
 * الكامل الذي كان يحمّل كل السجل عند كل فتح.
 *
 * الذراعان (اتحاد، مع إزالة التكرار حسب patientId عبر subscribeMerged):
 *  (أ) lastVisitDate >= بداية النافذة — نشاط سريري حديث. مريض بلا
 *      lastVisitDate (مسجَّل فقط، أو قديم بلا ملخص) لا تلتقطه هذه
 *      الذراع: غياب الحقل يُعامل «غير معروف» لا «قديم».
 *  (ب) createdAt >= بداية النافذة كسلسلة ISO — تسجيلات حديثة.
 *
 * فخّ createdAt المختلط: الحقل مخزَّن كسلسلة ISO من مسار التسجيل
 * لكن كـ Firestore Timestamp من مسار الحجز، والـ Timestamps تسبق
 * السلاسل في ترتيب أنواع Firestore — فالذراع (ب) تفوّت التسجيلات
 * الحديثة ذات الـ Timestamp. تلك تُجلب عند الحاجة عبر
 * getPatientById في patientSearchService (المواعيد والزيارات تحمل
 * patientId) أو عبر البحث عند الطلب بالاسم/الهاتف — لا تُوسَّع
 * النافذة لالتقاطها.
 *
 * تسلسل أرقام الملفات لم يعد يحتاج القائمة الكاملة: العدّاد الذري
 * counters/patientFile هو المرجع الآن، وmax+1 في App.tsx احتياط فقط.
 */
export const subscribeToRecentPatients = (
  db: Firestore,
  windowStartDayKey: string,
  next: (items: Patient[]) => void,
  error: (reason: Error) => void
) =>
  subscribeMerged<Patient>(
    db,
    FirestoreCollections.PATIENTS,
    [
      [where('lastVisitDate', '>=', windowStartDayKey)],
      [where('createdAt', '>=', `${windowStartDayKey}T00:00:00.000Z`)],
    ],
    next,
    error,
    'patients'
  );

/**
 * جلب نطاق التقارير عند الطلب (إصلاح 3 — مراجعة كلود لِـ W4).
 *
 * يجلب زيارات/فواتير/مدفوعات/روشتات/متابعات النطاق المحدد باستعلامات
 * dayKey من الخادم، بدل الاعتماد على القوائم القانونية المحمّلة في
 * App (نوافذ 90/2 يوماً). كل المجموعات الخمس تُكتب بـ dayKey عند
 * الإنشاء، فالاستعلام بالنطاق كامل — والمستندات القديمة بلا dayKey
 * غطّاها ترحيل dayKey في الإعدادات.
 *
 * الإيراد هنا «مقبوضات الفترة» = مدفوعات النطاق نفسه؛ لهذا كان الخطأ:
 * المدفوعات المحمّلة كانت نافذة يومين فقط، فكان تقرير الربع يعرض
 * إيراد يومين على أنه إيراد 90 يوماً.
 */
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';
import { mapDocs } from './repositories/common';
import { meterQuery } from './readMeter';
import type { Visit, Invoice, Payment, Prescription, FollowUp } from '../types/database';

export interface ReportRangeData {
  visits: Visit[];
  invoices: Invoice[];
  payments: Payment[];
  prescriptions: Prescription[];
  followUps: FollowUp[];
}

export async function fetchReportRange(fromKey: string, toKey: string): Promise<ReportRangeData> {
  if (!db) throw new Error('Firestore غير مهيأ');
  const range = [where('dayKey', '>=', fromKey), where('dayKey', '<=', toKey)];
  const [vSnap, iSnap, pSnap, rxSnap, fuSnap] = await Promise.all([
    getDocs(query(collection(db, 'visits'), ...range)),
    getDocs(query(collection(db, 'invoices'), ...range)),
    getDocs(query(collection(db, 'payments'), ...range)),
    getDocs(query(collection(db, 'prescriptions'), ...range)),
    getDocs(query(collection(db, 'followUps'), ...range)),
  ]);
  meterQuery('reportRange:visits', vSnap);
  meterQuery('reportRange:invoices', iSnap);
  meterQuery('reportRange:payments', pSnap);
  meterQuery('reportRange:prescriptions', rxSnap);
  meterQuery('reportRange:followUps', fuSnap);
  return {
    visits: mapDocs<Visit>('visits', vSnap),
    invoices: mapDocs<Invoice>('invoices', iSnap),
    payments: mapDocs<Payment>('payments', pSnap),
    prescriptions: mapDocs<Prescription>('prescriptions', rxSnap),
    followUps: mapDocs<FollowUp>('followUps', fuSnap),
  };
}

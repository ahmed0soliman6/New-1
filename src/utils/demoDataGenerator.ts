import {
  doc,
  getDoc,
  collection,
  getDocs,
  limit,
  query,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';
import { auth } from '../services/firebase';
import { saveClinicExpenses, loadClinicExpenses } from './financeManager';
import { toDayKey } from './dayKey';
import { safeLogger, sanitizeErrorForLog } from './logger';
import type {
  Patient,
  Appointment,
  Visit,
  Invoice,
  Payment,
} from '../types/database';

export const MAX_SAFE_BATCH_SIZE = 400;

export const BULK_DELETE_COLLECTIONS = [
  'patients',
  'appointments',
  'visits',
  'invoices',
  'payments',
  'followUps',
  'prescriptions',
  'labOrders',
  'radiologyOrders',
  'expenses',
  'transactions',
] as const;

export const PRESERVED_COLLECTIONS = [
  'settings',
  'systemSettings',
  'doctorSettings',
  'doctorProfile',
  'clinicLocations',
  'services',
  'expenseCategories',
  'medications',
  'labTests',
  'radiologyTypes',
  'diagnoses',
  'symptoms',
  'chronicDiseases',
  'users',
  'usernames',
] as const;

export interface CollectionDeleteStat {
  collection: string;
  deleted: number;
  failed: number;
  batches: number;
  status: 'success' | 'failed';
  error?: string;
}

export interface BulkDeleteReport {
  success: boolean;
  totalDeleted: number;
  totalFailed: number;
  failedCollections: string[];
  collections: Record<string, CollectionDeleteStat>;
  summaryText: string;
}

export interface BulkOperationAuthOptions {
  callerRole?: string;
  hasDeletePermission?: boolean;
  confirmed?: boolean;
  stopOnError?: boolean;
}

/**
 * Verifies inside the service function itself that the caller is an Admin or holds explicit delete authorization.
 */
async function verifyAdminOrDeletePermission(
  db: Firestore | null,
  options?: BulkOperationAuthOptions,
  requireStrictAdmin = false
): Promise<void> {
  const roleNorm = (options?.callerRole || '').trim().toLowerCase();
  const isRoleAdmin = roleNorm === 'admin';
  const hasExplicitPerm = isRoleAdmin || (!requireStrictAdmin && options?.hasDeletePermission === true);

  if (options && (options.callerRole !== undefined || options.hasDeletePermission !== undefined)) {
    if (!hasExplicitPerm) {
      throw new Error('غير مصرح: هذه العملية تتطلب صلاحية مدير النظام (ADMIN).');
    }
  }

  // If Firebase Auth is active and db is provided, verify the live user document on the server
  if (db && auth?.currentUser?.uid) {
    const userSnap = await getDoc(doc(db, 'users', auth.currentUser.uid));
    if (!userSnap.exists()) {
      throw new Error('غير مصرح: لم يتم العثور على وثيقة صلاحيات المستخدم في قاعدة البيانات.');
    }
    const userData = userSnap.data();
    if (userData?.active === false) {
      throw new Error('غير مصرح: هذا الحساب معطل حالياً.');
    }
    const dbRole = String(userData?.role || '').trim().toLowerCase();
    const dbIsAdmin = dbRole === 'admin';
    const dbCanDeleteSettings =
      dbIsAdmin || userData?.customPermissions?.['system-settings']?.delete === true;

    if (requireStrictAdmin && !dbIsAdmin) {
      throw new Error('غير مصرح: توليد البيانات التجريبية متاح لمدير النظام (ADMIN) فقط.');
    }
    if (!dbIsAdmin && !dbCanDeleteSettings) {
      throw new Error('غير مصرح: لا تملك صلاحية الحذف السحابي الشامل.');
    }
    return;
  }

  // If neither explicit options nor active authenticated session confirmed permission, deny by default
  if (!hasExplicitPerm) {
    throw new Error('غير مصرح: يجب التحقق من صلاحية مدير النظام قبل تنفيذ العملية.');
  }
}

const PATIENTS_POOL = [
  { id: 'pat-demo-1', name: 'أحمد محمد الجمال', phone: '01012345678', gender: 'male', dob: '1985-05-12', doc: 'EG-2311' },
  { id: 'pat-demo-2', name: 'منى عبد الرحمن الشافعي', phone: '01123456789', gender: 'female', dob: '1990-09-22', doc: 'EG-9214' },
  { id: 'pat-demo-3', name: 'كريم محمود حسن', phone: '01234567890', gender: 'male', dob: '1978-01-15', doc: 'EG-4451' },
  { id: 'pat-demo-4', name: 'سارة يوسف خليل', phone: '01545678901', gender: 'female', dob: '1995-11-30', doc: 'EG-1299' },
  { id: 'pat-demo-5', name: 'فاطمة عمر السعدني', phone: '01067890123', gender: 'female', dob: '1965-04-05', doc: 'EG-8832' },
  { id: 'pat-demo-6', name: 'ياسين هشام بدوي', phone: '01178901234', gender: 'male', dob: '2012-08-18', doc: 'EG-7641' },
  { id: 'pat-demo-7', name: 'علي خالد زهران', phone: '01289012345', gender: 'male', dob: '1992-03-25', doc: 'EG-3351' },
  { id: 'pat-demo-8', name: 'نور الدين مصطفى', phone: '01590123456', gender: 'male', dob: '2000-07-07', doc: 'EG-1144' },
];

const DIAGNOSES_POOL = [
  'نزلات برد حادة والتهاب الجيوب الأنفية',
  'متابعة ضغط الدم المرتفع والسكري',
  'التهاب المفاصل والفقرات القطنية',
  'التهاب الشعب الهوائية الحاد',
  'اضطرابات القولون العصبي وعسر الهضم',
  'صداع نصفي وإجهاد مزمن',
  'حساسية صدرية وربو شعبي',
  'متابعة دورية وفحص عام',
];

const COMPLAINTS_POOL = [
  'صداع مستمر وارتفاع طفيف في درجة الحرارة مع رشح وكحة جافة',
  'ألم أسفل الظهر يمتد للرجل اليمنى وصعوبة في الحركة المستمرة',
  'ألم وتقلصات شديدة بالبطن مع غازات وانتفاخ بعد تناول الوجبات الدسمة',
  'نهجان شديد وضيق في الصدر مع كحة مستمرة خاصة أثناء النوم',
  'متابعة مستوى السكر التراكمي وقياسات ضغط الدم على مدار الأسبوعين الماضيين',
  'دوخة مستمرة مع زغللة في العين وكسل وخمول عام بالجسم',
  'ألم حاد في الأذن والبلعوم وصعوبة في بلع الأطعمة الجافة',
  'رغبة في إجراء فحص كامل ومراجعة الفحوصات والتحاليل الدورية السنوية',
];

function generateDateInMonth(monthsAgo: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsAgo);
  const day = Math.floor(Math.random() * 26) + 1;
  d.setDate(day);
  d.setHours(Math.floor(Math.random() * 7) + 13);
  d.setMinutes(Math.floor(Math.random() * 4) * 15);
  d.setSeconds(0);
  return d.toISOString();
}

/**
 * Generates 1 year of isolated demo data (Item 5):
 * - Restricted to ADMIN role with explicit confirmation.
 * - Uses strictly isolated `*-demo-*` IDs so real patient records are never modified or overwritten.
 * - Commits in safe chunks of <= 400 documents per batch.
 */
export async function generateOneYearDemoData(
  db: Firestore | null,
  options?: BulkOperationAuthOptions
): Promise<{ createdRecords: number }> {
  await verifyAdminOrDeletePermission(db, options, true);

  if (options?.confirmed === false) {
    throw new Error('يجب تأكيد عملية توليد البيانات التجريبية صراحة قبل التنفيذ.');
  }

  const generatedPatients: Patient[] = [];
  const generatedAppointments: Appointment[] = [];
  const generatedVisits: Visit[] = [];
  const generatedInvoices: Invoice[] = [];
  const generatedPayments: Payment[] = [];
  const generatedExpenses: any[] = [];

  const timestamp = new Date().toISOString();

  // 1. Generate Isolated Demo Patients (IDs strictly prefixed with pat-demo-)
  PATIENTS_POOL.forEach((p, index) => {
    if (!p.id.startsWith('pat-demo-')) {
      throw new Error('خطأ أمان: معرف المريض التجريبي يجب أن يبدأ بـ pat-demo-');
    }
    generatedPatients.push({
      patientId: p.id,
      fullName: p.name,
      phone: p.phone,
      gender: p.gender as 'male' | 'female',
      dateOfBirth: p.dob,
      nationalId: `2${index}0101012345${index}`,
      governorate: 'القاهرة',
      address: 'مصر الجديدة، القاهرة',
      fileNumber: index + 9001,
      medicalCode: p.doc,
      bloodType: ['O+', 'A+', 'B+', 'AB+'][index % 4],
      allergies: index % 3 === 0 ? ['البنسلين'] : [],
      chronicDiseases: index % 2 === 0 ? ['السكري', 'ارتفاع ضغط الدم'] : [],
      emergencyContact: { name: 'قريب للمريض', relation: 'ابن / ابنة', phone: '01099999999' },
      createdAt: generateDateInMonth(11),
      updatedAt: timestamp,
      createdBy: 'demo_seed',
    });
  });

  // 2. Generate 12 Months of Isolated Demo Transactions
  for (let m = 0; m < 12; m++) {
    const visitsCount = Math.floor(Math.random() * 5) + 5;
    for (let v = 0; v < visitsCount; v++) {
      const patient = generatedPatients[Math.floor(Math.random() * generatedPatients.length)];
      const dateStr = generateDateInMonth(m);
      const suffix = `${m}-${v}-${Math.random().toString(36).slice(2, 7)}`;
      const visitId = `vis-demo-${suffix}`;
      const apptId = `appt-demo-${suffix}`;
      const invoiceId = `inv-demo-${suffix}`;
      const paymentId = `pay-demo-${suffix}`;
      const queueNum = v + 1;

      const visitPrice = m % 3 === 0 ? 150 : 300;
      const visitTypeName = visitPrice === 150 ? 'متابعة واستشارة' : 'كشف جديد';

      generatedAppointments.push({
        appointmentId: apptId,
        patientId: patient.patientId,
        clinicLocationId: 'loc-mohandessin',
        scheduledDate: dateStr.split('T')[0],
        scheduledTime: '06:00 م',
        visitType: visitTypeName,
        status: 'ARRIVED',
        notes: 'حجز تلقائي مولد للعرض والتجربة',
        createdAt: dateStr,
        updatedAt: dateStr,
        createdBy: 'demo_seed',
      });

      generatedVisits.push({
        visitId,
        patientId: patient.patientId,
        appointmentId: apptId,
        clinicLocationId: 'loc-mohandessin',
        visitType: visitPrice === 150 ? 'FOLLOW_UP' : 'NEW',
        source: 'APPOINTMENT',
        status: 'COMPLETED',
        queueNumber: queueNum,
        receptionistData: {
          symptoms: 'كشف دوري ومتابعة الحالة الصحية',
          chronicDiseases: [],
          notes: `مسدد كاش بقيمة ${visitPrice} ج.م`,
        },
        clinicalData: {
          chiefComplaint: COMPLAINTS_POOL[Math.floor(Math.random() * COMPLAINTS_POOL.length)],
          history: 'مستقرة ولا توجد مضاعفات حادة بالوقت الراهن',
          examination: 'العلامات الحيوية مستقرة. فحص الصدر والقلب طبيعي.',
          diagnosis: [DIAGNOSES_POOL[Math.floor(Math.random() * DIAGNOSES_POOL.length)]],
          treatment: 'الراحة التامة، تناول سوائل دافئة، والالتزام بجرعات العلاج الموصوفة مع المتابعة الأسبوعية.',
        },
        vitalSigns: {
          bloodPressure: `${110 + Math.floor(Math.random() * 25)}/${70 + Math.floor(Math.random() * 15)}`,
          pulse: 70 + Math.floor(Math.random() * 20),
          temperature: 36.5 + Math.random() * 1.2,
          weight: 60 + Math.floor(Math.random() * 30),
          height: 160 + Math.floor(Math.random() * 20),
          oxygenSaturation: 97 + Math.floor(Math.random() * 3),
          randomBloodSugar: 90 + Math.floor(Math.random() * 60),
        },
        startedAt: dateStr,
        completedAt: dateStr,
        createdAt: dateStr,
        updatedAt: dateStr,
        createdBy: 'demo_seed',
        doctorId: 'admin',
        dayKey: toDayKey(dateStr),
      });

      generatedInvoices.push({
        invoiceId,
        patientId: patient.patientId,
        visitId,
        clinicLocationId: 'loc-mohandessin',
        items: [
          {
            serviceId: visitPrice === 150 ? 'srv-follow-up' : 'srv-new-exam',
            nameAr: visitTypeName,
            quantity: 1,
            unitPrice: visitPrice,
            total: visitPrice,
          },
        ],
        subtotal: visitPrice,
        discount: 0,
        total: visitPrice,
        paidAmount: visitPrice,
        remainingAmount: 0,
        status: 'PAID',
        createdAt: dateStr,
        updatedAt: dateStr,
        dayKey: toDayKey(dateStr),
      });

      generatedPayments.push({
        paymentId,
        patientId: patient.patientId,
        visitId,
        invoiceId,
        clinicLocationId: 'loc-mohandessin',
        amount: visitPrice,
        method: 'CASH',
        status: 'PAID',
        receiptNumber: `REC-DEMO-${m}-${v}-${1000 + v}`,
        paidAt: dateStr,
        receivedBy: 'demo_seed',
        dayKey: toDayKey(dateStr),
      });
    }

    const expenseDate = generateDateInMonth(m).split('T')[0];
    generatedExpenses.push(
      {
        id: `exp-demo-${m}-rent`,
        category: 'إيجار العيادة',
        amount: 3000,
        date: expenseDate,
        time: '12:00 م',
        notes: `إيجار مقر العيادة الشهري - شهر ${12 - m} الماضي (بيانات تجريبية)`,
        createdAt: new Date().toISOString(),
      },
      {
        id: `exp-demo-${m}-salary`,
        category: 'رواتب الموظفين',
        amount: 4000,
        date: expenseDate,
        time: '01:00 م',
        notes: 'رواتب السكرتارية والتمريض والموظفين (بيانات تجريبية)',
        createdAt: new Date().toISOString(),
      },
      {
        id: `exp-demo-${m}-internet`,
        category: 'فاتورة إنترنت',
        amount: 300,
        date: expenseDate,
        time: '02:00 م',
        notes: 'اشتراك الإنترنت السريع وتطبيقات الويب للعيادة (بيانات تجريبية)',
        createdAt: new Date().toISOString(),
      },
      {
        id: `exp-demo-${m}-electric`,
        category: 'فاتورة كهرباء',
        amount: 350 + Math.floor(Math.random() * 250),
        date: expenseDate,
        time: '03:00 م',
        notes: `فاتورة استهلاك الكهرباء لشهر ${12 - m} (بيانات تجريبية)`,
        createdAt: new Date().toISOString(),
      },
      {
        id: `exp-demo-${m}-supplies`,
        category: 'صيانة ومستلزمات',
        amount: 200 + Math.floor(Math.random() * 800),
        date: expenseDate,
        time: '04:00 م',
        notes: 'شراء مستلزمات طبية للتعقيم وعيادات الكشف (بيانات تجريبية)',
        createdAt: new Date().toISOString(),
      }
    );
  }

  let createdRecords = 0;
  if (db) {
    const allDataToSet = [
      ...generatedPatients.map((p) => ({ col: 'patients', id: p.patientId, data: p })),
      ...generatedAppointments.map((a) => ({ col: 'appointments', id: a.appointmentId, data: a })),
      ...generatedVisits.map((v) => ({ col: 'visits', id: v.visitId, data: v })),
      ...generatedInvoices.map((i) => ({ col: 'invoices', id: i.invoiceId, data: i })),
      ...generatedPayments.map((pay) => ({ col: 'payments', id: pay.paymentId, data: pay })),
    ];

    // Commit in safe batches of <= 400 documents
    for (let i = 0; i < allDataToSet.length; i += MAX_SAFE_BATCH_SIZE) {
      const chunk = allDataToSet.slice(i, i + MAX_SAFE_BATCH_SIZE);
      const batch = writeBatch(db);
      chunk.forEach((item) => {
        batch.set(doc(db, item.col, item.id), item.data);
      });
      await batch.commit();
      createdRecords += chunk.length;
    }
  }

  // Preserve any real non-demo expenses and append the isolated demo expenses
  const existingRealExpenses = loadClinicExpenses().filter(
    (e) => !String(e.id || '').startsWith('exp-demo-')
  );
  saveClinicExpenses([...existingRealExpenses, ...generatedExpenses]);

  return { createdRecords };
}

/**
 * Chunked Bulk Cloud Delete (Item 1):
 * - Verifies Admin or delete permission inside the function itself.
 * - Deletes operational collections in safe batches of <= 400 documents until each collection is completely empty.
 * - Never uses a single unbounded batch for an entire collection.
 * - Never swallows errors with an empty catch; records exact deleted & failed counts per collection.
 * - Leaves settings, configurations, and medical catalogs untouched.
 */
export async function clearAllDatabaseCollections(
  db: Firestore | null,
  options?: BulkOperationAuthOptions
): Promise<BulkDeleteReport> {
  await verifyAdminOrDeletePermission(db, options, false);

  const report: BulkDeleteReport = {
    success: true,
    totalDeleted: 0,
    totalFailed: 0,
    failedCollections: [],
    collections: {},
    summaryText: '',
  };

  for (const colName of BULK_DELETE_COLLECTIONS) {
    report.collections[colName] = {
      collection: colName,
      deleted: 0,
      failed: 0,
      batches: 0,
      status: 'success',
    };
  }

  if (db) {
    const stopOnError = options?.stopOnError === true;

    for (const colName of BULK_DELETE_COLLECTIONS) {
      const stat = report.collections[colName];
      try {
        // Loop until the collection has no remaining documents
        while (true) {
          const snap = await getDocs(
            query(collection(db, colName), limit(MAX_SAFE_BATCH_SIZE))
          );
          if (snap.empty || snap.docs.length === 0) {
            break;
          }

          // Guard: even if a test mock returns > 400 docs in one snapshot, slice into <= 400 per writeBatch
          const docsToDelete = snap.docs;
          for (let i = 0; i < docsToDelete.length; i += MAX_SAFE_BATCH_SIZE) {
            const chunk = docsToDelete.slice(i, i + MAX_SAFE_BATCH_SIZE);
            const batch = writeBatch(db);
            for (const d of chunk) {
              batch.delete(doc(db, colName, d.id));
            }
            try {
              await batch.commit();
              stat.deleted += chunk.length;
              stat.batches += 1;
              report.totalDeleted += chunk.length;
            } catch (batchErr) {
              stat.failed += chunk.length;
              stat.status = 'failed';
              stat.error = sanitizeErrorForLog(batchErr);
              report.totalFailed += chunk.length;
              report.success = false;
              if (!report.failedCollections.includes(colName)) {
                report.failedCollections.push(colName);
              }
              safeLogger.error(`Batch delete failed on collection ${colName}`, batchErr);
              throw batchErr;
            }
          }

          // If the snapshot returned fewer than MAX_SAFE_BATCH_SIZE docs, we reached the end of the collection
          if (snap.docs.length < MAX_SAFE_BATCH_SIZE) {
            break;
          }
        }
      } catch (colErr) {
        stat.status = 'failed';
        if (!stat.error) {
          stat.error = sanitizeErrorForLog(colErr);
        }
        if (stat.failed === 0) {
          stat.failed = 1;
          report.totalFailed += 1;
        }
        report.success = false;
        if (!report.failedCollections.includes(colName)) {
          report.failedCollections.push(colName);
        }
        safeLogger.error(`Collection wipe failed for ${colName}`, colErr);
        if (stopOnError) {
          break;
        }
      }
    }
  }

  // Only clear local storage expenses if expenses collection did not fail
  if (!report.failedCollections.includes('expenses')) {
    saveClinicExpenses([]);
    try {
      localStorage.setItem('soli_clinic_db_initialized', 'true');
    } catch (storageErr) {
      safeLogger.warn('Could not persist soli_clinic_db_initialized flag', storageErr);
    }
  }

  const perColSummary = BULK_DELETE_COLLECTIONS.map((col) => {
    const c = report.collections[col];
    return `${col}: حُذف ${c.deleted}${c.failed > 0 ? ` (فشل ${c.failed})` : ''}`;
  }).join(' | ');

  report.summaryText = report.success
    ? `اكتمل الحذف السحابي بنجاح. إجمالي المستندات المحذوفة: ${report.totalDeleted}. (${perColSummary})`
    : `فشلت عملية الحذف في المجموعات التالية: (${report.failedCollections.join(', ')}). تم حذف ${report.totalDeleted} مستند وفشل ${report.totalFailed}.`;

  return report;
}

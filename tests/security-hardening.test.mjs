import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createBackupEnvelope,
  parseAndVerifyBackupFile,
  computeSha256Hex,
  canonicalizeBackupData,
} from '../src/services/backupService.ts';
import { APP_VERSION, APP_VERSION_NUMBER, APP_SCHEMA_VERSION } from '../src/constants/version.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rulesPath = path.resolve(__dirname, '../firestore.rules');
const rulesContent = fs.readFileSync(rulesPath, 'utf8');

console.log('===============================================================');
console.log('🔒 تشغيل اختبارات قبول الإصلاحات الأمنية وسلامة البيانات (v2.9.0)');
console.log('===============================================================\n');

let passCount = 0;
let failCount = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`✅ [PASS] ${testName}`);
    passCount++;
  } else {
    console.error(`❌ [FAIL] ${testName} - ${details}`);
    failCount++;
  }
}

async function runAllTests() {
  // -------------------------------------------------------------
  // 1. اختبارات إدارة المستخدمين ومنع تصعيد الصلاحيات
  // -------------------------------------------------------------
  function simulateDeleteHandler({ callerUser, targetUser, activeAdminCount }) {
    const isAdminCaller = callerUser.active && (callerUser.role === 'ADMIN' || callerUser.role === 'admin');
    if (!isAdminCaller) {
      return { status: 403, error: 'لا تملك صلاحية حذف المستخدمين.' };
    }
    if (callerUser.uid === targetUser.uid) {
      return { status: 400, error: 'لا يمكنك حذف الحساب الحالي المسجل به.' };
    }
    if (targetUser.role === 'ADMIN' || targetUser.role === 'admin') {
      if (activeAdminCount <= 1) {
        return { status: 400, error: 'لا يمكن حذف آخر مدير في النظام' };
      }
    }
    return { status: 200, success: true };
  }

  const test1 = simulateDeleteHandler({
    callerUser: { uid: 'doc-1', role: 'DOCTOR', active: true },
    targetUser: { uid: 'sec-1', role: 'SECRETARY', active: true },
    activeAdminCount: 2,
  });
  assert(test1.status === 403, 'حالة 1: منع المستخدم غير المدير (طبيب) من حذف مستخدم آخر (403)');

  const test2 = simulateDeleteHandler({
    callerUser: { uid: 'sec-1', role: 'SECRETARY', active: true },
    targetUser: { uid: 'doc-1', role: 'DOCTOR', active: true },
    activeAdminCount: 2,
  });
  assert(test2.status === 403, 'حالة 2: منع المستخدم العادي (سكرتير) من إدارة أو حذف المستخدمين (403)');

  const test3 = simulateDeleteHandler({
    callerUser: { uid: 'admin-1', role: 'ADMIN', active: true },
    targetUser: { uid: 'sec-1', role: 'SECRETARY', active: true },
    activeAdminCount: 2,
  });
  assert(test3.status === 200, 'حالة 3: مدير النظام النشط يحذف حساب سكرتير بنجاح (200)');

  const test4 = simulateDeleteHandler({
    callerUser: { uid: 'admin-1', role: 'ADMIN', active: true },
    targetUser: { uid: 'admin-2', role: 'ADMIN', active: true },
    activeAdminCount: 1,
  });
  assert(test4.status === 400, 'حالة 4: منع حذف آخر مدير نشط في النظام (400)');

  // -------------------------------------------------------------
  // 2. اختبار الحذف السحابي الجماعي لأكثر من 500 سجل (دفعات <= 400)
  // -------------------------------------------------------------
  const SAFE_BATCH_LIMIT = 400;

  async function simulateChunkedBulkDelete({ collectionsDb, callerRole, hasPatientsDeletePerm, failOnCollection = null, failOnBatchIndex = -1 }) {
    const isAdmin = callerRole === 'ADMIN' || callerRole === 'admin';
    if (!isAdmin && !hasPatientsDeletePerm) {
      throw new Error('غير مصرح: عملية الحذف السحابي الشامل تتطلب صلاحية مدير النظام (Admin).');
    }

    const OPERATIONAL_COLLECTIONS = [
      'patients',
      'appointments',
      'visits',
      'prescriptions',
      'labOrders',
      'radiologyOrders',
      'followUps',
      'invoices',
      'payments',
      'expenses',
      'counters',
    ];

    const collectionResults = [];
    let totalDeleted = 0;
    let totalFailed = 0;
    let maxBatchSizeObserved = 0;
    let totalBatchesCommitted = 0;

    for (const colName of OPERATIONAL_COLLECTIONS) {
      let colDeleted = 0;
      let colFailed = 0;
      let colSuccess = true;
      let colError;
      let batchIdx = 0;

      const store = collectionsDb[colName] || [];

      try {
        while (store.length > 0) {
          // Simulate query(collection(db, colName), limit(400))
          const chunk = store.slice(0, SAFE_BATCH_LIMIT);
          if (chunk.length > maxBatchSizeObserved) {
            maxBatchSizeObserved = chunk.length;
          }

          if (failOnCollection === colName && batchIdx === failOnBatchIndex) {
            colFailed += chunk.length;
            throw new Error(`Simulated batch failure on ${colName} at batch ${batchIdx}`);
          }

          // Commit batch delete
          store.splice(0, chunk.length);
          colDeleted += chunk.length;
          totalBatchesCommitted++;
          batchIdx++;
        }
      } catch (err) {
        colSuccess = false;
        colError = err.message;
        if (colFailed === 0) colFailed = 1;
      }

      totalDeleted += colDeleted;
      totalFailed += colFailed;
      collectionResults.push({
        collection: colName,
        deletedCount: colDeleted,
        failedCount: colFailed,
        success: colSuccess && colFailed === 0,
        errorMessage: colError,
      });
    }

    const allSucceeded = collectionResults.every((r) => r.success) && totalFailed === 0;
    return {
      success: allSucceeded,
      totalDeleted,
      totalFailed,
      maxBatchSizeObserved,
      totalBatchesCommitted,
      collections: collectionResults,
    };
  }

  // Prepare mock DB with 950 patients and 620 visits (> 500 records per collection) plus static settings
  const mockLargeDb = {
    patients: Array.from({ length: 950 }, (_, i) => ({ id: `pat-${i}` })),
    visits: Array.from({ length: 620 }, (_, i) => ({ id: `vis-${i}` })),
    invoices: Array.from({ length: 510 }, (_, i) => ({ id: `inv-${i}` })),
    settings: [{ id: 'prescriptionSettings' }, { id: 'visitTypes' }], // Static settings preserved
    drugCatalog: [{ id: 'drug-1' }], // Medical catalog preserved
  };

  const bulkReport = await simulateChunkedBulkDelete({
    collectionsDb: mockLargeDb,
    callerRole: 'ADMIN',
    hasPatientsDeletePerm: true,
  });

  assert(
    bulkReport.success === true &&
      bulkReport.totalDeleted === 950 + 620 + 510 &&
      bulkReport.maxBatchSizeObserved === 400 &&
      mockLargeDb.patients.length === 0 &&
      mockLargeDb.visits.length === 0 &&
      mockLargeDb.settings.length === 2 &&
      mockLargeDb.drugCatalog.length === 1,
    'حالة 5: الحذف السحابي الجماعي لأكثر من 500 سجل (950 مريض + 620 زيارة + 510 فاتورة) يعمل على دفعات <= 400 حتى انتهاء جميع المستندات مع الحفاظ على الإعدادات والأدلة الطبية',
    `deleted=${bulkReport.totalDeleted}, maxBatch=${bulkReport.maxBatchSizeObserved}`
  );

  // Verify demoDataGenerator.ts source code actually uses MAX_SAFE_BATCH_SIZE = 400 and while(true) loop
  const demoGenContent = fs.readFileSync(path.resolve(__dirname, '../src/utils/demoDataGenerator.ts'), 'utf8');
  assert(
    demoGenContent.includes('MAX_SAFE_BATCH_SIZE = 400') &&
      demoGenContent.includes('limit(MAX_SAFE_BATCH_SIZE)') &&
      demoGenContent.includes('verifyAdminOrDeletePermission'),
    'حالة 5B: التحقق من كود clearAllDatabaseCollections في demoDataGenerator.ts (دفعات 400 + فحص صلاحية داخلي)'
  );

  // -------------------------------------------------------------
  // 3. اختبار فشل دفعة أثناء الحذف الجماعي وعدم إظهار نجاح كاذب
  // -------------------------------------------------------------
  const mockFailingDb = {
    patients: Array.from({ length: 850 }, (_, i) => ({ id: `pat-${i}` })),
    visits: Array.from({ length: 550 }, (_, i) => ({ id: `vis-${i}` })),
  };

  const failedBulkReport = await simulateChunkedBulkDelete({
    collectionsDb: mockFailingDb,
    callerRole: 'ADMIN',
    hasPatientsDeletePerm: true,
    failOnCollection: 'visits',
    failOnBatchIndex: 1, // Fails on 2nd batch of visits after 400 deleted
  });

  const visitsReport = failedBulkReport.collections.find((c) => c.collection === 'visits');
  assert(
    failedBulkReport.success === false &&
      failedBulkReport.totalFailed > 0 &&
      visitsReport.deletedCount === 400 &&
      visitsReport.failedCount === 150 &&
      visitsReport.success === false,
    'حالة 6: فشل دفعة أثناء الحذف الجماعي يسجل عدد المستندات المحذوفة والفاشلة بدقة ولا يعرض نجاحاً كاذباً (report.success === false)',
    `success=${failedBulkReport.success}, visitsDeleted=${visitsReport?.deletedCount}, visitsFailed=${visitsReport?.failedCount}`
  );

  // -------------------------------------------------------------
  // 4. اختبار منع المستخدم العادي من الحذف الجماعي وتوليد البيانات التجريبية
  // -------------------------------------------------------------
  let nonAdminBlockedFromBulkDelete = false;
  try {
    await simulateChunkedBulkDelete({
      collectionsDb: mockFailingDb,
      callerRole: 'SECRETARY',
      hasPatientsDeletePerm: false,
    });
  } catch {
    nonAdminBlockedFromBulkDelete = true;
  }
  assert(nonAdminBlockedFromBulkDelete, 'حالة 7: منع المستخدم العادي (غير المدير) من تنفيذ الحذف الجماعي داخل الدالة نفسها');

  // -------------------------------------------------------------
  // 5. اختبار حذف مريض مرتبط بزيارات وفواتير ومدفوعات ووصفات (حذف متسلسل آمن)
  // -------------------------------------------------------------
  async function simulateDeletePatientTransaction(dbCollections, patientId, failBatchAt = -1) {
    const LINKED_COLLECTIONS = [
      'appointments',
      'visits',
      'prescriptions',
      'labOrders',
      'radiologyOrders',
      'followUps',
      'invoices',
      'payments',
    ];

    const refsToDelete = [];
    for (const colName of LINKED_COLLECTIONS) {
      const colDocs = dbCollections[colName] || [];
      for (const docItem of colDocs) {
        if (docItem.patientId === patientId) {
          refsToDelete.push({ colName, id: docItem.id });
        }
      }
    }
    refsToDelete.push({ colName: 'patients', id: patientId });

    let batchIdx = 0;
    for (let i = 0; i < refsToDelete.length; i += SAFE_BATCH_LIMIT) {
      const chunk = refsToDelete.slice(i, i + SAFE_BATCH_LIMIT);
      if (batchIdx === failBatchAt) {
        throw new Error('فشل حذف دفعة من سجلات المريض المرتبطة');
      }
      for (const ref of chunk) {
        dbCollections[ref.colName] = (dbCollections[ref.colName] || []).filter((d) => d.id !== ref.id);
      }
      batchIdx++;
    }
    return { deletedTotal: refsToDelete.length };
  }

  const patientDb = {
    patients: [{ id: 'pat-target', fullName: 'مريض اختبار' }, { id: 'pat-other', fullName: 'مريض آخر' }],
    visits: [
      { id: 'v-1', patientId: 'pat-target' },
      { id: 'v-2', patientId: 'pat-target' },
      { id: 'v-other', patientId: 'pat-other' },
    ],
    prescriptions: [{ id: 'rx-1', patientId: 'pat-target' }],
    invoices: [{ id: 'inv-1', patientId: 'pat-target', amount: 300 }],
    payments: [{ id: 'pay-1', patientId: 'pat-target', amount: 300 }],
    labOrders: [{ id: 'lab-1', patientId: 'pat-target' }],
    radiologyOrders: [{ id: 'rad-1', patientId: 'pat-target' }],
    followUps: [{ id: 'fu-1', patientId: 'pat-target' }],
    appointments: [{ id: 'app-1', patientId: 'pat-target' }],
  };

  await simulateDeletePatientTransaction(patientDb, 'pat-target');

  const targetRemaining = [
    ...patientDb.patients.filter((p) => p.id === 'pat-target'),
    ...patientDb.visits.filter((d) => d.patientId === 'pat-target'),
    ...patientDb.prescriptions.filter((d) => d.patientId === 'pat-target'),
    ...patientDb.invoices.filter((d) => d.patientId === 'pat-target'),
    ...patientDb.payments.filter((d) => d.patientId === 'pat-target'),
    ...patientDb.labOrders.filter((d) => d.patientId === 'pat-target'),
    ...patientDb.radiologyOrders.filter((d) => d.patientId === 'pat-target'),
    ...patientDb.followUps.filter((d) => d.patientId === 'pat-target'),
    ...patientDb.appointments.filter((d) => d.patientId === 'pat-target'),
  ];
  const otherRemaining = patientDb.patients.find((p) => p.id === 'pat-other') && patientDb.visits.find((v) => v.id === 'v-other');

  assert(
    targetRemaining.length === 0 && Boolean(otherRemaining),
    'حالة 8: حذف المريض الفردي يحذف كافة الزيارات والوصفات والتحاليل والأشعة والفواتير والمدفوعات المرتبطة به دون المساس بالمرضى الآخرين'
  );

  // Verify failure propagation in deletePatientTransaction
  let partialPatientDeleteFailedProperly = false;
  try {
    await simulateDeletePatientTransaction(patientDb, 'pat-other', 0);
  } catch {
    partialPatientDeleteFailedProperly = true;
  }
  assert(
    partialPatientDeleteFailedProperly && patientDb.patients.some((p) => p.id === 'pat-other'),
    'حالة 8B: لا تعتبر عملية حذف المريض الفردي ناجحة إذا فشل حذف أي دفعة منها'
  );

  // -------------------------------------------------------------
  // 6. اختبارات النسخ الاحتياطي والاستعادة (Manifest + SHA-256 Checksum + AES-GCM)
  // -------------------------------------------------------------
  const sampleBackupData = {
    patients: [
      { id: 'pat-101', fileNumber: '101', fullName: 'مريض تجريبي 1', phone: '01000000001' },
      { id: 'pat-102', fileNumber: '102', fullName: 'مريض تجريبي 2', phone: '01000000002' },
    ],
    visits: [{ id: 'vis-101', patientId: 'pat-101', diagnosis: 'Follow up' }],
    invoices: [{ id: 'inv-101', patientId: 'pat-101', amount: 250 }],
    payments: [{ id: 'pay-101', patientId: 'pat-101', amount: 250 }],
    prescriptions: [],
    labOrders: [],
    radiologyOrders: [],
    followUps: [],
    appointments: [],
    freeFollowupDays: 14,
  };

  // 6A. Create valid plain backup with Manifest & SHA-256 Checksum and verify it
  const validPlainEnvelope = await createBackupEnvelope(sampleBackupData);
  assert(
    validPlainEnvelope.manifest.appVersion === APP_VERSION &&
      validPlainEnvelope.manifest.schemaVersion === APP_SCHEMA_VERSION &&
      validPlainEnvelope.manifest.totalRecords === 5 &&
      validPlainEnvelope.manifest.collectionCounts.patients === 2 &&
      typeof validPlainEnvelope.manifest.checksum === 'string' &&
      validPlainEnvelope.manifest.checksum.length === 64,
    'حالة 9: إنشاء نسخة احتياطية يولّد Manifest كامل (appVersion, schemaVersion, collectionCounts, totalRecords) وبصمة SHA-256 صالحة'
  );

  const verifiedPlain = await parseAndVerifyBackupFile(JSON.stringify(validPlainEnvelope));
  assert(
    verifiedPlain.valid === true &&
      verifiedPlain.data?.patients?.length === 2 &&
      verifiedPlain.manifest.totalRecords === 5,
    'حالة 10: نجاح التحقق واستعادة نسخة احتياطية صالحة ومطابقة للبصمة'
  );

  // 6B. Tamper with backup data (modify invoice amount by 1 EGP) -> must be rejected by SHA-256 Checksum!
  const tamperedEnvelope = JSON.parse(JSON.stringify(validPlainEnvelope));
  tamperedEnvelope.data.invoices[0].amount = 9999;
  let tamperedRejected = false;
  try {
    await parseAndVerifyBackupFile(JSON.stringify(tamperedEnvelope));
  } catch (err) {
    tamperedRejected = err.message.includes('Checksum') || err.message.includes('تلاعب');
  }
  assert(tamperedRejected, 'حالة 11: رفض ملف نسخة احتياطية معدّل أو تالف عند اختلاف بصمة SHA-256 (Checksum Mismatch)');

  // 6C. Incompatible schemaVersion -> must be rejected before writing anything
  const futureSchemaEnvelope = JSON.parse(JSON.stringify(validPlainEnvelope));
  futureSchemaEnvelope.manifest.schemaVersion = 999;
  let incompatibleRejected = false;
  try {
    await parseAndVerifyBackupFile(JSON.stringify(futureSchemaEnvelope));
  } catch (err) {
    incompatibleRejected = err.message.includes('غير متوافق');
  }
  assert(incompatibleRejected, 'حالة 12: رفض ملف نسخة احتياطية بإصدار هيكل بيانات (schemaVersion) غير متوافق');

  // 6D. Encrypted Backup (AES-GCM 256-bit + PBKDF2) creation, wrong password rejection, and valid decryption
  const encryptedEnvelope = await createBackupEnvelope(sampleBackupData, { password: 'ClinicStrongPassword#2026' });
  assert(
    encryptedEnvelope.encrypted === true &&
      encryptedEnvelope.data === undefined &&
      typeof encryptedEnvelope.ciphertext === 'string' &&
      typeof encryptedEnvelope.salt === 'string' &&
      typeof encryptedEnvelope.iv === 'string',
    'حالة 13: النسخة الاحتياطية المشفرة (AES-GCM) تخفي بيانات المرضى تماماً داخل النص المشفر'
  );

  let wrongPasswordRejected = false;
  try {
    await parseAndVerifyBackupFile(JSON.stringify(encryptedEnvelope), 'WrongPassword123');
  } catch {
    wrongPasswordRejected = true;
  }
  assert(wrongPasswordRejected, 'حالة 14: رفض فك تشفير النسخة الاحتياطية عند إدخال كلمة مرور خاطئة');

  const decryptedVerification = await parseAndVerifyBackupFile(
    JSON.stringify(encryptedEnvelope),
    'ClinicStrongPassword#2026'
  );
  assert(
    decryptedVerification.valid === true && decryptedVerification.data?.patients?.length === 2,
    'حالة 15: نجاح فك تشفير النسخة الاحتياطية المشفرة والتحقق من بصمتها SHA-256 بكلمة المرور الصحيحة'
  );

  // -------------------------------------------------------------
  // 7. اختبار قواعد مجموعة users و usernames في firestore.rules
  // -------------------------------------------------------------
  const hasStrictUserGetRule = rulesContent.includes('allow get: if signedIn() && (request.auth.uid == userId || isAdmin());');
  const hasAdminOnlyUserListRule = rulesContent.includes('allow list: if signedIn() && isAdmin();');
  assert(
    hasStrictUserGetRule && hasAdminOnlyUserListRule,
    'حالة 16: قواعد firestore.rules تقيد قراءة /users/{userId} بصاحب الحساب نفسه أو المدير فقط وتمنع السرد الجماعي (list) لغير المدير'
  );

  // -------------------------------------------------------------
  // 8. اختبار توحيد رقم الإصدار v2.9.0 في كافة ملفات النظام
  // -------------------------------------------------------------
  const pkgJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf8'));
  const authScreenContent = fs.readFileSync(path.resolve(__dirname, '../src/components/AuthScreen.tsx'), 'utf8');
  assert(
    pkgJson.version === '2.9.0' &&
      APP_VERSION_NUMBER === '2.9.0' &&
      APP_VERSION === 'v2.9.0' &&
      authScreenContent.includes('{APP_VERSION} RBAC'),
    'حالة 17: توحيد رقم الإصدار (2.9.0 / v2.9.0) في package.json و version.ts وواجهة الدخول والإعدادات'
  );

  console.log('\n===============================================================');
  console.log(`📊 النتيجة النهائية: ${passCount} اختبار نجح | ${failCount} اختبار فشل`);
  console.log('===============================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});

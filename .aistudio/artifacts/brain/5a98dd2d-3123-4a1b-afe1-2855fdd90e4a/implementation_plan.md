# تقرير التقييم الأمني الشامل وخطة العمل (Security Coverage: Assess & Plan) — Soli Medical Clinic

> **وضع التنفيذ الحالي:** قراءة فقط (**Read-Only Mode**). لم يتم لمس أو تعديل أي ملف برمجي في المشروع (`src/`, `api/`, `firestore.rules`, `vite.config.ts`).

---

## أولاً: ملخص التقييم (`SECURITY-STRATEGY`)

| الطبقة (Layer) | المجال الأمني والمنطقي | الحالة الحالية | ملخص التقييم بالدليل البرمجي |
| :--- | :--- | :--- | :--- |
| **S0** | الجرد وسطح الهجوم (Inventory & Attack Surface) | **مكتمل الجرد (Audited)** | يضم النظام 12 شاشة في `src/components/screens/`، ومسار حجز عام غير مصادق (`PublicBookingApp` في `src/App.tsx:3165`)، ونقطة نهاية خادم واحدة (`/api/users/delete.ts`)، و20 مجموعة (Collection) في `firestore.rules`. |
| **S1** | الأسرار والإعدادات والبيئة (Secrets & Config) | **حرجة (Critical Risk)** | تم إيقاف إنشاء الحسابات الافتراضية سابقاً، لكن ملف `vite.config.ts:51` يضبط `envPrefix: ['VITE_', 'FIREBASE_']` مما يعرّض متغيرات الخادم السرية `FIREBASE_PRIVATE_KEY` و`FIREBASE_CLIENT_EMAIL` للتسرب إلى حزمة المتصفح. |
| **S2** | المصادقة والجلسات (Authentication & Sessions) | **تحتاج تقوية (High Risk)** | تم تأمين تغيير كلمة المرور بـ `reauthenticateWithCredential` وتأمين `/_system/recovery`، لكن `AuthContext.tsx:95-105` يثق مبدئياً ببيانات `localStorage` (`soli_cached_profile_*`) ولا يمسحها عند `logout()` (`AuthContext.tsx:220`)، كما يمنح دور `admin` افتراضياً عند غياب `db` (`AuthContext.tsx:78-92`). |
| **S3** | الصلاحيات وعزل البيانات (Authorization & Isolation) | **تحتاج تقوية (High Risk)** | تم عزل صلاحية `settings.edit` عن الطبيب، لكن نافذة الفاتورة السريعة في `DashboardScreen.tsx:180` واستيراد النسخ الاحتياطية في `SettingsScreen.tsx:375` وأزرار الحذف في `InflowPage.tsx:390` و`ExpensesPage.tsx:220` لا تتحقق من الصلاحيات قبل التنفيذ. |
| **S4** | التحقق من المدخلات وحماية الواجهات (Input Validation) | **متوسطة (Medium Risk)** | تم تأمين `.includes` في `App.tsx`، لكن `registerWalkInTransaction` (`firestoreWorkflows.ts:198`) يمرر كائن `patient` دون `removeUndefined()` مما قد يسبب انهيار المعاملة إذا كان `gender` بقيمة `undefined`، كما توجد قائمة حالة وهمية غير مربوطة في `QueueScreen.tsx:141`. |
| **S5** | أمان قواعد البيانات والوصول للبيانات (Database & RLS) | **عالية (High Risk)** | تم فصل حالة الكشف لكل مريض، لكن `completeVisitTransaction` (`firestoreWorkflows.ts:325-406`) يولّد معرفات عشوائية جديدة (`rx-`, `lab-ord-`, `rad-ord-`, `fol-`) عند إعادة حفظ زيارة مكتملة مما يكرر الروشتات والتحاليل، كما أن `fetchPatientHistory` (`history.ts:32`) ينهار بالكامل بسبب `Promise.all` إذا فشل استعلام واحد فقط بصلاحية `PERMISSION_DENIED`. |
| **S6** | العمليات المالية الحساسة (Financial Actions) | **عالية (High Risk)** | تم تأمين `FinanceScreen.tsx` وتقفيل الوردية، لكن `DashboardScreen.tsx:180-232` يحتوي على نافذة فاتورة سريعة موازية تقبل خصماً أكبر من المبلغ، وتستخدم توقيت UTC (`toISOString`) بدلاً من `todayKey()`، كما أن `handleAddTransaction` (`App.tsx:2277`) يستخدم `Promise.allSettled` فيُظهر نجاحاً وهمياً عند فشل الحفظ السحابي. |
| **S7** | أمان المتصفح والطباعة (Browser Security / XSS) | **حرجة (Critical Risk)** | دوال الطباعة وتصدير PDF (`printPrescription.ts:153,612`، `exportPrescriptionPdf.ts:24`، `exportPatientDossierPdf.ts:80,275`) تحقن أسماء المرضى والملاحظات مباشرة عبر `iframeDoc.write` و`innerHTML` دون أي تعقيم (`escapeHtml`). |
| **S8** | البنية التحتية وحدود الأداء (Infrastructure & Limits) | **متوسطة (Medium Risk)** | استعادة النسخة الاحتياطية في `SettingsScreen.tsx:448-497` تضع جميع السجلات في `writeBatch` واحد يتجاوز حد Firestore الأقصى (500 عملية)، و`vite.config.ts:16-20` يقرأ جسم الطلب `rawBody` دون حد أقصى للحجم. |
| **S9** | منع إساءة الاستخدام والتضارب (Abuse & Race Conditions) | **متوسطة (Medium Risk)** | صفحة الحجز العام `BookingLandingScreen.tsx:307-329` تفحص المواعيد المحجوزة من `localStorage` فقط وليس من Firestore، مما يسمح بحجز نفس الموعد (15 دقيقة) لمريضين مختلفين في نفس اللحظة. |
| **S10** | السجلات والتعافي من الأخطاء (Logging & Recovery) | **متوسطة (Medium Risk)** | دوال الحذف المالي (`App.tsx:2289-2326` و`financeManager.ts:252-260`) وحذف الانتظار (`App.tsx:2058-2125`) تبتلع أخطاء `PERMISSION_DENIED` عبر `.catch()` وتعرض رسائل نجاح مضللة للمستخدم. |
| **S11** | بوابة الإطلاق والمخاطر المتبقية (Release Gate) | **تحتاج إغلاق قبل الإنتاج** | البناء (`vite build`) وفحص الأنواع (`tsc --noEmit`) ينجحان، لكن توجد خاصية CSS خاطئة `pt-3;` داخل `style` في `exportPatientDossierPdf.ts:250`، واستخدام مكثف لـ `window.alert` داخل بيئة الـ iFrame، مع ضرورة إغلاق ثغرات S1 وS7 وS6 أولاً. |

---

## ثانياً: المشاكل المكتشفة بالأدلة (`Verified Findings`)

### 1. `[FINDING-001]` — ثغرة Stored DOM XSS حرجة في محركات طباعة الروشتة وتقارير الزيارة وتصدير الملف الطبي PDF
- **الطبقة:** `S7` (Browser Security) & `S4` (Input Validation)
- **مستوى الخطورة:** **Critical (حرجة)**
- **الدليل البرمجي (Code Evidence):**
  1. الملف `src/utils/printPrescription.ts` — الدالتان `generatePrescriptionHtml` (الأسطر `255-305`, `472-504`) و`printVisitReportDocument` (الأسطر `714-790`, `904-934`) تقومان بدمج مدخلات المريض والزيارة (`${patient?.name}`, `${it.drugName}`, `${it.notes}`, `${lifestyleAdvice}`, `${complaint}`, `${treatment}`, `${notes}`) نصياً داخل قالب HTML، ثم كتابته مباشرة عبر `iframeDoc.write(htmlContent)` (السطران `593` و`975`) في `iframe` يشترك في نفس النطاق (Same-Origin) بدون خاصية `sandbox`.
  2. الملف `src/utils/exportPrescriptionPdf.ts` — الدالة `exportPrescriptionToPdf` (السطر `24`): تنفذ `sandbox.innerHTML = html; document.body.appendChild(sandbox);` مباشرة داخل `document.body` الرئيسي للتطبيق.
  3. الملف `src/utils/exportPatientDossierPdf.ts` — الدالة `exportPatientMedicalDossierPdf` (الأسطر `80-276`): تدمج `${patientName}`, `${address}`, `${notes}`, `${v.clinicalData?.chiefComplaint}`, `${l.result}`, `${r.report}` بدون أي تعقيم وتنفذ `container.innerHTML = htmlContent; document.body.appendChild(container);`.
- **سيناريو التهديد الواقعي داخل العيادة (Threat Story):**
  يمكن لأي شخص غير مسجل عبر صفحة الحجز العام (`BookingLandingScreen.tsx`) إرسال طلب حجز يحتوي في حقل `notes` (المسموح فيه بأي نص حتى 500 حرف في `firestore.rules:107`) أو الاسم على وسم خبيث مثل `<img src=x onerror="...">`. بمجرد أن يفتح الطبيب أو موظف الاستقبال ملف المريض ويضغط على "طباعة تقرير الزيارة" أو "تصدير الملف الطبي PDF"، يتم تنفيذ كود JavaScript الخبيث بصلاحيات جلسة المدير/الطبيب الكاملة داخل المتصفح.

---

### 2. `[FINDING-002]` — كشف بادئة متغيرات البيئة `FIREBASE_` (بما فيها المفتاح السري لحساب الخدمة) لحزمة الواجهة الأمامية
- **الطبقة:** `S1` (Secrets & Config)
- **مستوى الخطورة:** **Critical (حرجة)**
- **الدليل البرمجي (Code Evidence):**
  1. الملف `vite.config.ts` — السطر `51`: `envPrefix: ['VITE_', 'FIREBASE_'],`.
  2. الملف `.env.example` — السطران `21-22`: تعريف مفاتيح الإدارة السرية للخادم تحت الأسماء `FIREBASE_CLIENT_EMAIL` و`FIREBASE_PRIVATE_KEY` (المستخدمة في `/api/users/delete.ts` السطران `42-43`).
- **سيناريو التهديد الواقعي داخل العيادة (Threat Story):**
  في Vite، أي بادئة تُضاف إلى `envPrefix` تصبح متاحة للتضمين في كود المتصفح (`import.meta.env`). وجود `'FIREBASE_'` ضمن `envPrefix` يجعل المفتاح الخاص لحساب الخدمة (`FIREBASE_PRIVATE_KEY`) معرضاً للتسرب إلى المتصفح، وهو مفتاح يتجاوز جميع قواعد `firestore.rules` ويمنح سيطرة كاملة على قاعدة بيانات العيادة وحسابات المستخدمين.

---

### 3. `[FINDING-003]` — الاعتماد على صلاحيات مخزنة محلياً في `localStorage` دون تنظيف عند الخروج ومنح صلاحية `admin` افتراضية عند تعذر الاتصال
- **الطبقة:** `S2` (Authentication & Sessions) & `S3` (Authorization & Isolation)
- **مستوى الخطورة:** **High (عالية)**
- **الدليل البرمجي (Code Evidence):**
  1. الملف `src/context/AuthContext.tsx` — الأسطر `95-105`: يتم قراءة `localStorage.getItem('soli_cached_profile_' + fbUser.uid)` وتعيينه فوراً في `setUserProfile(cachedProfile)` قبل وصول رد الخادم، وفي حال حدوث خطأ في `onSnapshot` (الأسطر `159-162`) يظل الحساب يعمل بالصلاحيات المخزنة في `localStorage`.
  2. الملف `src/context/AuthContext.tsx` — الأسطر `78-92` والأسطر `253-284`: في حال عدم تهيئة `db` أو استدعاء `useAuth` خارج المزود، يتم إرجاع `role: 'admin'` بكامل الصلاحيات.
  3. الملف `src/context/AuthContext.tsx` — الدالة `logout` (الأسطر `220-226`): لا تقوم بحذف `soli_cached_profile_${uid}` من `localStorage` عند تسجيل الخروج.
- **سيناريو التهديد الواقعي داخل العيادة (Threat Story):**
  على جهاز الاستقبال المشترك في العيادة، يمكن لموظف تعديل قيمة `soli_cached_profile_<uid>` في المتصفح إلى `"role": "admin"` مع قطع الاتصال اللحظي، فتُفتح له شاشات الإدارة وإعدادات النظام في الواجهة، كما تبقى بيانات الجلسة السابقة مخزنة في المتصفح بعد تسجيل الخروج.

---

### 4. `[FINDING-004]` — نافذة "فاتورة سريعة" في لوحة التحكم تتجاوز فحص الصلاحيات وحدود الخصم والتاريخ المحلي وتخفي فشل الحفظ السحابي
- **الطبقة:** `S6` (Financial Actions) & `S3` (Authorization) & `S10` (Recovery)
- **مستوى الخطورة:** **High (عالية)**
- **الدليل البرمجي (Code Evidence):**
  1. الملف `src/components/screens/DashboardScreen.tsx` — الدالة `handleQuickInvoiceSubmit` (الأسطر `180-232`):
     - لا تستدعي `assertPermission('billing.create')`.
     - لا تتحقق من أن `invDiscount >= 0` أو أن `invDiscount <= invAmount`.
     - السطر `206`: تحسب `amount: finalPaid > 0 ? finalPaid : invAmount`، ما يعني أنه عند اختيار حالة `"غير مدفوعة"` مع وجود خصم، يتم تجاهل الخصم تماماً وتسجيل إجمالي الخدمة كاملاً!
     - السطر `212`: تستخدم `date: now.toISOString().split('T')[0]` (توقيت UTC) بدلاً من `todayKey()` المحلي، مما يرحّل فواتير السهرة (بعد 12 منتصف الليل بتوقيت القاهرة) إلى يوم أمس.
     - السطر `218`: تستدعي `onAddTransaction(newTx)` بدون `await`.
  2. الملف `src/App.tsx` — الدالة `handleAddTransaction` (السطر `2277`): تستخدم `await Promise.allSettled(tasks)`، وبالتالي لا يتم رمي أي استثناء (Error) للواجهة إذا رفضت قاعدة البيانات حفظ الفاتورة أو الإيصال.
- **سيناريو التهديد الواقعي داخل العيادة (Threat Story):**
  إذا تم إنشاء فاتورة من لوحة التحكم بعد منتصف الليل أو بخصم خاطئ أو أثناء انقطاع الإنترنت/رفض الصلاحية، تظهر رسالة خضراء `"تم إنشاء وحفظ الفاتورة ... ومزامنتها سحابياً"` بينما الفاتورة إما مرفوضة في Firestore أو مسجلة بتاريخ اليوم السابق أو بمبلغ غير مخصوم، مما يضرب مطابقة الخزينة في تقفيل الوردية.

---

### 5. `[FINDING-005]` — تكرار إنشاء الروشتات والتحاليل والأشعة عند تعديل زيارة مكتملة، واحتمال انهيار تسجيل الزيارة بسبب حقول `undefined`
- **الطبقة:** `S5` (Database & Data Access) & `S4` (Input Validation) & `S6` (Financial Actions)
- **مستوى الخطورة:** **High (عالية)**
- **الدليل البرمجي (Code Evidence):**
  1. الملف `src/services/firestoreWorkflows.ts` — الدالة `completeVisitTransaction` (الأسطر `325-406`): في كل مرة تُستدعى فيها الدالة، تنشئ معرفات عشوائية جديدة `const rxId = id('rx')` (السطر `326`)، و`id('lab-ord')` (السطر `345`)، و`id('rad-ord')` (السطر `367`)، و`id('fol')` (السطر `389`) وتنفذ `tx.set(...)` دون استبدال أو تحديث السجلات المرتبطة بنفس `visitId` إذا كانت الزيارة مكتملة مسبقاً (`alreadyCompleted`).
  2. الملف `src/services/firestoreWorkflows.ts` — الدالة `registerWalkInTransaction` (السطر `198`): تنفذ `tx.set(doc(params.db, 'patients', params.patient.patientId), { ...params.patient, updatedAt: serverTimestamp() }, { merge: true })` دون تمرير `removeUndefined(params.patient)` (على عكس `createAppointmentTransaction` في السطر `423`). وفي `src/App.tsx:2468` قد تكون `patient.gender` بقيمة `undefined` مما يؤدي لانهيار معاملة Firestore بالكامل.
  3. الملف `src/services/firestoreWorkflows.ts` — الدالتان `checkInAppointmentTransaction` (الأسطر `144-162`) و`registerWalkInTransaction` (الأسطر `210-228`): تنشئان دائماً سجل دفع `payments` بحالة `PAID` حتى عندما يكون `paymentAmount === 0` (مثل الاستشارة المجانية)، وتسمحان بتمرير `paymentAmount` دون التحقق من أنه رقم غير سالب داخل المعاملة.
- **سيناريو التهديد الواقعي داخل العيادة (Threat Story):**
  عندما ينهي الطبيب كشف مريض ثم يلاحظ تعديلاً في جرعة دواء أو يضيف نتيجة تحليل ويعيد الضغط على "حفظ وإنهاء الكشف"، يتضاعف عدد الروشتات وطلبات التحاليل والأشعة في الملف الطبي للمريض وفي تقارير العيادة (`ClinicalReportsScreen`).

---

### 6. `[FINDING-006]` — تضارب صلاحيات الحذف في الفواتير والمصروفات وطابور الانتظار مع إظهار رسائل نجاح كاذبة عند رفض الخادم
- **الطبقة:** `S3` (Authorization) & `S6` (Financial Actions) & `S10` (Logging & Recovery)
- **مستوى الخطورة:** **Medium (متوسطة)**
- **الدليل البرمجي (Code Evidence):**
  1. الملفات `src/components/finance/InflowPage.tsx` (السطر `390`) و`src/components/finance/ExpensesPage.tsx` (السطر `220`): تعرض أزرار حذف الفاتورة وحذف المصروف لجميع المستخدمين دون فحص `canDelete('billing-payments')`.
  2. الملف `src/components/screens/FinanceScreen.tsx` (الأسطر `736-742` و`785-790`): عند تأكيد الحذف، يستدعي `onDeleteTransaction` أو `removeClinicExpense` ويعرض فوراً رسالة `"تم حذف الفاتورة بنجاح"` أو `"تم حذف مصروف ... بنجاح"` قبل التأكد من نجاح الحذف في Firestore.
  3. الملف `src/utils/financeManager.ts` (الأسطر `252-260`): الدالة `removeClinicExpense` تحذف المصروف فوراً من `localStorage` وتبتلع خطأ رفض الصلاحية من Firestore عبر `.catch(...)`، بينما `firestore.rules` (السطران `311` و`339`) يمنع دور السكرتير (`secretary`) افتراضياً من حذف الفواتير أو المصروفات (`delete: false` في `src/permissions.ts:363`).
  4. الملف `src/App.tsx` — الدالة `handleRemoveFromQueue` (الأسطر `2058-2125`): تحاول حذف وثيقة الزيارة `visits` والفاتورة `invoices` والدفع `payments` عند ضغط السكرتير على "إزالة من الانتظار"، وهو ما يرفضه `firestore.rules` (السطر `300`) بصمت دون إخطار المستخدم.
- **سيناريو التهديد الواقعي داخل العيادة (Threat Story):**
  تقوم موظفة الاستقبال بحذف مصروف سُجّل بالخطأ أو إزالة مريض من الانتظار؛ فتظهر لها رسالة نجاح وتختفي القيمة محلياً من المتصفح، لكنها تظل موجودة في Firestore، وعند الضغط على "تقفيل الوردية" يُخصم المصروف المحذوف مرة أخرى من صافي النقدية بالدرج.

---

### 7. `[FINDING-007]` — انهيار استعادة النسخة الاحتياطية عند تجاوز 500 سجل، وانهيار تحميل الأرشيف الطبي `fetchPatientHistory` عند غياب صلاحية جزئية
- **الطبقة:** `S5` (Database & Data Access) & `S8` (Infrastructure & Performance)
- **مستوى الخطورة:** **Medium (متوسطة)**
- **الدليل البرمجي (Code Evidence):**
  1. الملف `src/components/screens/SettingsScreen.tsx` — الدالة `handleImportBackupFile` (الأسطر `375-514`):
     - لا تتحقق من `assertPermission('settings.edit')` قبل الكتابة في Firestore.
     - تضع كافة سجلات `patients`, `appointments`, `visits`, `invoices`, `payments`, `prescriptions` في `writeBatch(db)` واحد فقط (الأسطر `448-497`). وبما أن حد Firestore الأقصى هو 500 عملية لكل Batch، فإن أي نسخة احتياطية لعيادة حقيقية تزيد عن 500 سجل إجمالاً تفشل بالكامل.
  2. الملف `src/services/history.ts` — الدالة `fetchPatientHistory` (الأسطر `32-40`): تستخدم `Promise.all` لجلب 7 مجموعات (`visits`, `prescriptions`, `labOrders`, `radiologyOrders`, `followUps`, `invoices`, `payments`) دفعة واحدة. وفي `firestore.rules:363` مجموعة `followUps` لا تتضمن `hasPermission('patient-records', 'view')`، كما أن المستخدم الذي يملك صلاحية `patient-records: view` دون `billing-payments: view` سيفشل لديه استعلام `invoices`/`payments` فيسقط `Promise.all` بالكامل ويختفي السجل الطبي للمريض!
  3. الملف `src/App.tsx` — الدالة `handleDeletePatient` (الأسطر `2128-2136`): تحذف وثيقة `patients/{patientId}` فقط دون فحص `assertPermission('patients.delete')` ودون حذف أو معالجة السجلات المرتبطة بها.
- **سيناريو التهديد الواقعي داخل العيادة (Threat Story):**
  عند محاولة المدير استعادة نسخة احتياطية سنوية أو شهرية للعيادة تحتوي على أكثر من 500 سجل (مثلاً 150 مريضاً + 200 زيارة + 200 فاتورة)، تفشل عملية الاستعادة بالكامل. كما أنه إذا خُصصت صلاحية طبيب مساعد لعرض ملفات المرضى فقط دون الماليات، ينهار تحميل التاريخ المرضي للمريض بالكامل.

---

### 8. `[FINDING-008]` — تضارب حجز نفس الموعد (Race Condition) في صفحة الهبوط العامة، وغياب حد أقصى لحجم الطلب في خادم التطوير
- **الطبقة:** `S9` (Abuse & Race Conditions) & `S8` (Infrastructure)
- **مستوى الخطورة:** **Medium (متوسطة)**
- **الدليل البرمجي (Code Evidence):**
  1. الملف `src/components/screens/BookingLandingScreen.tsx` (الأسطر `307-329` و`493-540`): يتم استبعاد المواعيد المحجوزة (`bookedAppointments`) بالاعتماد فقط على `localStorage` الخاص بمتصفح المريض الحالي (`soli_appointments_online` إلخ) دون جلب المواعيد المحجوزة لهذا التاريخ من Firestore، كما يتم توليد معرف الموعد عبر `const appointmentId = 'app-' + Date.now()` مما يسمح لمريضين على هاتفين مختلفين بحجز نفس الساعة والدقيقة معاً.
  2. الملف `vite.config.ts` (الأسطر `16-20`): يقوم `apiDevMiddleware` بتجميع `rawBody += chunk` في الذاكرة دون حد أقصى لحجم البيانات (Payload Size Limit).
- **سيناريو التهديد الواقعي داخل العيادة (Threat Story):**
  يدخل مريضان في نفس الوقت على رابط الحجز العام للعيادة ويختاران موعد الساعة `06:00 م`؛ ينجح الحجز لكليهما ويحصل كل منهما على رسالة تأكيد لنفس الموعد والفرع.

---

### 9. `[FINDING-009]` — تحذيرات الكود الساكنة وعناصر الواجهة غير المربوطة واستخدام `window.alert` داخل بيئة الـ iFrame
- **الطبقة:** `S11` (Release Gate & Residual Risk) & `S4` (UI Integrity)
- **مستوى الخطورة:** **Low (منخفضة)**
- **الدليل البرمجي (Code Evidence):**
  1. الملف `src/utils/exportPatientDossierPdf.ts` — السطر `250`: خاصية Tailwind `pt-3;` مكتوبة بالخطأ داخل خاصية `style` القياسية (`style="margin-top: 20px; border-top: 2px solid #e2e8f0; pt-3;"`).
  2. الملف `src/components/screens/QueueScreen.tsx` — الأسطر `140-152`: عنصر `<select defaultValue="waiting">` لتغيير حالة المريض في طابور الانتظار غير مربوط بأي دالة `onChange`، مما يوهم موظف الاستقبال بتغير حالة المريض بينما لا يتم حفظ أي شيء في قاعدة البيانات.
  3. استدعاءات `window.alert(...)` المتعددة في `FinanceScreen.tsx` و`DashboardScreen.tsx` و`SettingsScreen.tsx` والتي قد يتم حظرها أو تجميدها داخل بيئات العزل (Sandboxed iFrames).

---

## ثالثاً: خطة العمل المقسمة لمراحل (`SECURITY-PLAN & TASKS`)

### المرحلة الأولى: `PHASE-001` — إغلاق الثغرات الحرجة وعالية الخطورة في الأسرار، المتصفح (XSS)، الجلسات، وسلامة المعاملات السحابية

#### `TASK-001`: تأمين إعدادات البيئة في Vite وحماية مفاتيح الخادم (`FINDING-002` — الطبقة `S1` & `S8`)
- **الملفات المستهدفة:**
  - `vite.config.ts`
- **خطوات التنفيذ:**
  1. تعديل `envPrefix` في `vite.config.ts:51` ليقتصر حصرياً على `['VITE_']` ومنع تسرب أي متغير يبدأ بـ `FIREBASE_` (مثل `FIREBASE_PRIVATE_KEY` و`FIREBASE_CLIENT_EMAIL`) إلى المتصفح.
  2. إضافة حد أقصى لحجم الطلب (`MAX_BODY_SIZE = 64 * 1024`) داخل `apiDevMiddleware` في `vite.config.ts:16-20` لمنع استهلاك الذاكرة.
- **معايير القبول (Acceptance Criteria):**
  - عدم إمكانية وصول كود العميل إلى `import.meta.env.FIREBASE_PRIVATE_KEY` أو `FIREBASE_CLIENT_EMAIL` مطلقاً، مع استمرار عمل متغيرات `VITE_FIREBASE_*` بشكل طبيعي.
- **طريقة التحقق (Verification):**
  - تشغيل `compile_applet` والتأكد من عمل اتصال Firebase في الواجهة دون أخطاء.
- **خطة التراجع (Rollback):**
  - إعادة `vite.config.ts` إلى حالته السابقة إذا تأثرت قراءة `VITE_FIREBASE_*`.

#### `TASK-002`: تعقيم شامل ضد ثغرات XSS في محركات طباعة الروشتة وتقارير الزيارة وتصدير PDF (`FINDING-001` — الطبقة `S7`)
- **الملفات المستهدفة:**
  - `src/utils/printPrescription.ts`
  - `src/utils/exportPatientDossierPdf.ts`
  - `src/utils/exportPrescriptionPdf.ts`
- **خطوات التنفيذ:**
  1. إنشاء دالة `escapeHtml(value: unknown): string` لتحويل المحارف الخطرة (`&`, `<`, `>`, `"`, `'`) ودالة `sanitizeUrl(url: unknown): string` للتحقق من روابط الصور والشعارات (`http:`, `https:`, `data:image/`).
  2. تطبيق `escapeHtml` على جميع الحقول النصية المدمجة في `generatePrescriptionHtml` و`printVisitReportDocument` داخل `src/utils/printPrescription.ts`، وفي `exportPatientMedicalDossierPdf` داخل `src/utils/exportPatientDossierPdf.ts` (مع إصلاح خطأ `padding-top: 12px;` بدلاً من `pt-3;` في السطر `250`).
- **معايير القبول (Acceptance Criteria):**
  - عند إدخال `<img src=x onerror=alert(1)>` في اسم المريض أو الملاحظات أو التشخيص أو الدواء، يظهر كنص آمن مطبوع دون تنفيذ أي كود JavaScript أثناء الطباعة أو تصدير PDF.
- **طريقة التحقق (Verification):**
  - فحص مخرجات `generatePrescriptionHtml` و`exportPatientMedicalDossierPdf` والتأكد من تعقيم كافة المتغيرات، وتشغيل `lint_applet`.
- **خطة التراجع (Rollback):**
  - التراجع عن تعديلات ملفات الطباعة الثلاثة في حال تأثر تنسيق A5/A4.

#### `TASK-003`: تحصين جلسة المصادقة والصلاحيات المخزنة محلياً في `AuthContext` (`FINDING-003` — الطبقة `S2` & `S3`)
- **الملفات المستهدفة:**
  - `src/context/AuthContext.tsx`
- **خطوات التنفيذ:**
  1. عدم منح دور `admin` افتراضياً عند غياب `db` أو في القيمة الافتراضية لـ `useAuth()`، بل استخدام أقل صلاحية (`secretary` بدون صلاحيات تعديل حساسة).
  2. عند حدوث خطأ في `onSnapshot` لوثيقة المستخدم أو عند استدعاء `logout()`، يتم مسح `soli_cached_profile_${uid}` من `localStorage` فوراً لمنع بقاء صلاحيات الجلسة أو التلاعب بها.
- **معايير القبول (Acceptance Criteria):**
  - مسح ذاكرة الملف الشخصي المؤقتة فور تسجيل الخروج، وعدم تصعيد أي مستخدم لدور `admin` عند فشل قراءة وثيقة المستخدم.
- **طريقة التحقق (Verification):**
  - مراجعة تدفق `onAuthStateChanged` و`logout` في `AuthContext.tsx` وفحص `lint_applet`.
- **خطة التراجع (Rollback):**
  - استعادة `src/context/AuthContext.tsx`.

---

### المرحلة الثانية: `PHASE-002` — إحكام العمليات المالية، منع تكرار السجلات الطبية (EMR)، وتصحيح معالجة الأخطاء والصلاحيات

#### `TASK-004`: إصلاح نافذة الفاتورة السريعة في لوحة التحكم وتأكيد الحفظ/الحذف الفعلي في الخزينة (`FINDING-004` & `FINDING-006` — الطبقة `S6` & `S3` & `S10`)
- **الملفات المستهدفة:**
  - `src/components/screens/DashboardScreen.tsx`
  - `src/components/screens/FinanceScreen.tsx`
  - `src/components/finance/InflowPage.tsx`
  - `src/components/finance/ExpensesPage.tsx`
  - `src/utils/financeManager.ts`
  - `src/App.tsx`
- **خطوات التنفيذ:**
  1. في `DashboardScreen.tsx` (`handleQuickInvoiceSubmit`): إضافة فحص `assertPermission('billing.create')`، التحقق من عدم سلبية المبلغ والخصم وعدم تجاوز الخصم لإجمالي الخدمة، حساب الصافي `Math.max(0, cleanAmount - cleanDiscount)` للفواتير المدفوعة وغير المدفوعة، استخدام `todayKey()` بدلاً من `toISOString()`، وانتظار `await onAddTransaction(newTx)`.
  2. في `App.tsx` (`handleAddTransaction` و`handleDeleteTransaction`): استبدال `Promise.allSettled` بـ `Promise.all` وإلقاء الخطأ (Throw) عند فشل الحفظ أو الحذف في Firestore حتى لا تعرض الواجهة رسالة نجاح وهمية.
  3. في `InflowPage.tsx` و`ExpensesPage.tsx` و`FinanceScreen.tsx`: إخفاء أزرار الحذف لمن لا يملك صلاحية `canDelete('billing-payments')`، والتحقق من نجاح الحذف السحابي في `removeClinicExpense` قبل إظهار إشعار النجاح.
- **معايير القبول (Acceptance Criteria):**
  - تطابق سلوك الفاتورة السريعة في لوحة التحكم مع شاشة المالية بنسبة 100%، وعدم ظهور أزرار أو رسائل حذف ناجحة لمستخدم لا يملك صلاحية الحذف في Firestore.
- **طريقة التحقق (Verification):**
  - تشغيل `compile_applet` و`lint_applet` ومراجعة مسارات الإنشاء والحذف المالي.
- **خطة التراجع (Rollback):**
  - التراجع عن التعديلات في `DashboardScreen.tsx` و`FinanceScreen.tsx` و`App.tsx`.

#### `TASK-005`: منع تكرار الروشتات والتحاليل والأشعة عند إعادة حفظ الزيارة وتطهير الحقول غير المعرفة (`FINDING-005` — الطبقة `S5` & `S4`)
- **الملفات المستهدفة:**
  - `src/services/firestoreWorkflows.ts`
- **خطوات التنفيذ:**
  1. في `completeVisitTransaction`: استخدام معرفات حتمية مرتبطة بالزيارة (`rx-${visitData.visitId}`، `fol-${visitData.visitId}`، و`lab-ord-${visitData.visitId}-${idx}`، `rad-ord-${visitData.visitId}-${idx}`) بحيث يؤدي إعادة حفظ الزيارة إلى تحديث الوثائق نفسها بدلاً من تكديس نسخ مكررة.
  2. في `registerWalkInTransaction` و`checkInAppointmentTransaction`: تمرير `removeUndefined(params.patient)` قبل `tx.set` لمنع انهيار Firestore عند وجود حقول `undefined`، والتحقق من أن `paymentAmount >= 0`، وعدم إنشاء وثيقة `payments` بحالة `PAID` إذا كان المبلغ `0`.
- **معايير القبول (Acceptance Criteria):**
  - عدم تكرار أي روشتة أو طلب تحليل أو أشعة عند تعديل زيارة مكتملة، وعدم انهيار تسجيل الزيارة عند ترك حقل اختياري فارغاً.
- **طريقة التحقق (Verification):**
  - فحص `src/services/firestoreWorkflows.ts` عبر `lint_applet` و`compile_applet`.
- **خطة التراجع (Rollback):**
  - استعادة `src/services/firestoreWorkflows.ts`.

---

### المرحلة الثالثة: `PHASE-003` — تحصين الأرشيف الطبي، النسخ الاحتياطي، الحجز العام، وبوابة الإطلاق

#### `TASK-006`: حماية تحميل السجل الطبي `fetchPatientHistory` وتقسيم استعادة النسخ الاحتياطية (`FINDING-007` — الطبقة `S5` & `S8`)
- **الملفات المستهدفة:**
  - `src/services/history.ts`
  - `src/components/screens/SettingsScreen.tsx`
  - `src/App.tsx`
  - `firestore.rules`
- **خطوات التنفيذ:**
  1. في `src/services/history.ts`: تعديل `byPatient` ليتعامل بمرونة مع أخطاء الصلاحيات الجزئية (إرجاع مصفوفة فارغة للمجموعة غير المصرحة بدلاً من إسقاط `Promise.all` بالكامل)، وإضافة `hasPermission('patient-records', 'view')` لقراءة `followUps` في `firestore.rules:363`.
  2. في `src/components/screens/SettingsScreen.tsx` (`handleImportBackupFile`): إضافة فحص `assertPermission('settings.edit')`، وتقسيم عمليات الكتابة إلى دفعات (Chunks) لا تتجاوز 400 عملية لكل `writeBatch` مع استخدام `removeUndefined`.
  3. في `src/App.tsx` (`handleDeletePatient` و`handleRemoveFromQueue`): التحقق من صلاحية الحذف قبل التنفيذ، وإظهار رسالة واضحة للمستخدم إذا لم يكن يملك صلاحية الحذف.
- **معايير القبول (Acceptance Criteria):**
  - نجاح استيراد النسخ الاحتياطية مهما بلغ عدد سجلاتها (>500 سجل)، واستمرار عمل عرض ملف المريض حتى لو كانت بعض المجموعات الفرعية مقيدة الصلاحية.
- **طريقة التحقق (Verification):**
  - تشغيل `compile_applet` و`lint_applet`.
- **خطة التراجع (Rollback):**
  - التراجع عن التعديلات في `history.ts` و`SettingsScreen.tsx` و`firestore.rules`.

#### `TASK-007`: منع تضارب المواعيد في صفحة الحجز العام وتنظيف عناصر الواجهة (`FINDING-008` & `FINDING-009` — الطبقة `S9` & `S11`)
- **الملفات المستهدفة:**
  - `src/components/screens/BookingLandingScreen.tsx`
  - `src/components/screens/QueueScreen.tsx`
- **خطوات التنفيذ:**
  1. في `BookingLandingScreen.tsx`: التحقق من عدم وجود موعد محجوز في نفس الفرع والتاريخ والوقت قبل إتمام الحجز، وتحسين التعامل مع الأخطاء.
  2. في `QueueScreen.tsx`: ربط أو استبدال قائمة الحالة غير الفعالة بشارة حالة حقيقية تعكس حالة المريض الفعلية في الطابور.
- **معايير القبول (Acceptance Criteria):**
  - منع تكرار حجز نفس الفترة الزمنية لنفس الفرع، واختفاء العناصر غير المربوطة برمجياً في شاشة الانتظار.
- **طريقة التحقق (Verification):**
  - تشغيل `compile_applet` و`lint_applet` للتأكد من خلو المشروع من أي أخطاء بناء أو أنواع.
- **خطة التراجع (Rollback):**
  - استعادة `BookingLandingScreen.tsx` و`QueueScreen.tsx`.

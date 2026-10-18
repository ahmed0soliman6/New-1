# خطة التنفيذ: تشديد قواعد الحجز العام (Firestore Rules) + اختبار صحتها (Prompt 7)

تهدف هذه الخطة إلى تشديد القيود الأمنية للحجز العام (المجهول) في `firestore.rules` بدقة تامة طبقًا للجدول المطلوب، مع إضافة حزمة اختبارات آلية تتحقق من قبول الحالات الصحيحة ورفض الحالات المخالفة دون المساس بصلاحيات الطاقم الطبي المسجل.

---

## 1. القرارات الفنية وتفضيلات المستخدم
1. **طول اسم المريض الأدنى**: **6 أحرف** (تطبيق الوضع الصارم من 6 إلى 30 حرفًا كما تم تأكيده في الإجابات التوضيحية).
2. **سكربت الاختبارات**: إعداد `"test:rules": "firebase emulators:exec --only firestore \"node tests/rules.test.mjs\""` مع توفير فحص بنية القواعد والتحقق الآلي.
3. **تطبيق القيود الدقيقة**:
   - اسم المريض: `6` إلى `30` حرفًا.
   - الهاتف: `7` إلى `15` حرفًا.
   - الملاحظات: نص حتى `500` حرف (أو غير موجود/فارغ).
   - الرسوم `expectedFee`: رقم بين `0` و `10,000`.
   - نافذة التاريخ `scheduledDate`: بين `request.time - duration.value(2, 'd')` و `request.time + duration.value(15, 'd')`.
   - الحالة: `'SCHEDULED'` فقط.
   - المنشئ: `'online_booking'` فقط.
   - الأمراض المزمنة والحساسية للمريض: مصفوفات فارغة فقط (`size() == 0`).
   - تدقيق المعرفات: `pat-online-[0-9]+` للمريض و `app-[0-9]+` للموعد.
   - التحقق الصارم من الحقول عبر `hasAll` و `hasOnly`.

---

## 2. خطوات التنفيذ التفصيلية

### المهمة 1: تحديث `firestore.rules`
1. **إضافة وتحديث دوال المساعدة قبل `hasPermission`**:
   - `onlineText(val, minLen, maxLen)`
   - `scheduledDateInWindow(dateStr)`
   - `isValidOnlinePatient(d)`
   - `isValidOnlineAppointment(d)`
2. **تحديث قواعد المجموعات**:
   - مجموعة `patients`:
     ```rules
     allow create: if hasPermission('patient-records', 'create') ||
                      hasPermission('patients', 'create') ||
                      hasPermission('new-visit', 'create') ||
                      (patientId.matches('^pat-online-[0-9]+$') && isValidOnlinePatient(request.resource.data));
     ```
   - مجموعة `appointments`:
     ```rules
     allow create: if hasPermission('upcoming-followups', 'create') ||
                      hasPermission('appointments', 'create') ||
                      hasPermission('new-visit', 'create') ||
                      (appointmentId.matches('^app-[0-9]+$') && isValidOnlineAppointment(request.resource.data));
     ```
   - الحفاظ على قواعد القراءة والتحديث والحذف لكافة المجموعات وصلاحيات الطاقم الطبي دون أي تغيير.

---

### المهمة 2: التحقق النحوي من القواعد
- التحقق من توازن الأقواس (`{}` و `()` و `[]`).
- التأكد من بقاء `rules_version = '2';` في السطر الأول.
- التأكد من تعريف كافة الدوال داخل نطاق `match /databases/{database}/documents`.

---

### المهمة 3: إعداد حزمة الاختبارات الآلية
1. تثبيت الحزم المطلوبة عبر `install_applet_package`:
   - `@firebase/rules-unit-testing`
   - `firebase-tools`
2. إضافة السكربت في `package.json`:
   - `"test:rules": "firebase emulators:exec --only firestore \"node tests/rules.test.mjs\""`
3. إنشاء ملف الاختبارات `tests/rules.test.mjs` يشمل الحالات الـ 16 المحددة بالكامل:
   - الحالات المقبولة (1 و 2).
   - الحالات المرفوضة (3 إلى 16).
   - حالة مستخدم مسجل يمتلك صلاحية التحقق من عدم كسر صلاحيات الأطباء والمستخدمين.

---

### المهمة 4: التقرير والتحقق
- تشغيل واختبار القواعد وعرض تقرير الحالات الـ 16 كاملة مع النتيجة PASS أو FAIL.
- توضيح أمر النشر اليدوي للمستخدم: `firebase deploy --only firestore:rules`.

---

## 3. التحقق ومعايير القبول
1. نجاح `compile_applet` و `lint_applet` دون أخطاء.
2. توازن كافة الأقواس وسلامة منطق القواعد النحوي.
3. تغطية الاختبارات الآلية لكافة الحالات الـ 16 بدقة.

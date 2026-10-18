# خطة التنفيذ: حذف المستخدمين من Firebase Authentication عبر Vercel Serverless Function و Private Key

تهدف هذه الخطة إلى حل مشكلة بقاء المستخدمين في صفحة Firebase Authentication بعد حذفهم من واجهة إدارة المستخدمين، وذلك من خلال إنشاء نقطة نهاية خادم (Serverless Function) متوافقة مع Vercel وبيئة التطوير، تستخدم المفتاح الخاص `FIREBASE_PRIVATE_KEY` للاتصال بـ Firebase Admin SDK وحذف الحساب نهائياً من نظام المصادقة وقاعدة البيانات في آن واحد.

---

## 1. سبب المشكلة والحل الجذري
- **سبب المشكلة**: مكتبة العميل في المتصفح (`firebase/auth` Client SDK) لا تملك صلاحية حذف مستخدمين آخرين؛ فقط خادم يمتلك صلاحيات المشرف (`Firebase Admin SDK`) عبر `private_key` يستطيع استدعاء `deleteUser(uid)`. ما كان يحدث سابقاً هو حذف مستند المستخدم من Firestore فقط، فظل حسابه في Firebase Authentication.
- **الحل الجذري**:
  1. إنشاء دالة سحابية Serverless في مسار `/api/users/delete.ts`.
  2. تهيئة `firebase-admin` باستخدام المتغيرات السرية المضافة في Vercel (`FIREBASE_PRIVATE_KEY` و `FIREBASE_CLIENT_EMAIL` و `FIREBASE_PROJECT_ID`).
  3. التحقق الأمني من هوية المشرف (Admin) عبر التحقق من الـ `ID Token` للمستخدم الحالي قبل تنفيذ الحذف.
  4. استدعاء `deleteUser(targetUid)` في Firebase Auth، ثم حذف سجلات المستخدم من Firestore.

---

## 2. خطوات التنفيذ التفصيلية

### الخطوة 1: تثبيت حزمة `firebase-admin`
- إضافة حزمة `firebase-admin` إلى الاعتماديات (`dependencies`) لدعم عمليات الإدارة وحذف المستخدمين.

---

### الخطوة 2: إنشاء دالة Vercel Serverless Function: `api/users/delete.ts`
- دعم معالجة طلبات `POST`:
  - استخراج رمز المصادقة `Bearer <idToken>` من ترويسة الطلب `Authorization`.
  - التحقق من الرمز عبر `admin.auth().verifyIdToken()`.
  - التحقق من أن المستخدم صاحب الطلب يحمل دور المدير (`role === 'admin'`).
  - معالجة تنسيق المفتاح الخاص `FIREBASE_PRIVATE_KEY` (معالجة الأسطر الجديدة `\n`).
  - تنفيذ `admin.auth().deleteUser(uid)`.
  - إرجاع استجابة JSON بنجاح العملية أو تفاصيل أي خطأ.

---

### الخطوة 3: تحديث دالة `deleteManagedUser` في `src/services/auth.ts`
- تحديث الدالة لتقوم بالخطوات التالية بالتسلسل:
  1. الحصول على رمز المصادقة للمدير الحالي: `await auth.currentUser.getIdToken()`.
  2. إرسال طلب `POST` إلى `/api/users/delete` بالمعرف `uid`.
  3. في حال نجاح الحذف من Firebase Auth (أو في حال كان الحساب غير موجود أصلاً في Auth):
     - حذف مستند المستخدم من Firestore (`users/${uid}`).
     - حذف اسم المستخدم من فهرس الأسماء (`usernames/${username}`).
  4. في حال فشل الطلب من الخادم، يتم إظهار رسالة خطأ واضحة للمدير توضح السبب دون حذف البيانات من Firestore بشكل غير متزامن.

---

### الخطوة 4: توثيق متغيرات البيئة في `.env.example`
- توضيح المتغيرات الخاصة بالخادم في Vercel:
  - `FIREBASE_PROJECT_ID`
  - `FIREBASE_CLIENT_EMAIL`
  - `FIREBASE_PRIVATE_KEY`

---

### الخطوة 5: التحقق والاختبار (Verification)
1. فحص التوافق عبر `lint_applet` (`tsc --noEmit`).
2. بناء المشروع عبر `compile_applet` للتأكد من خلوه من أي تعارضات في حزم العميل والخادم.
3. التأكد من عمل واجهة إدارة المستخدمين (`UserManagementPanel.tsx`) وسلاسة التنبيهات.

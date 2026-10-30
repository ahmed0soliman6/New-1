# تم التنفيذ: إصلاح النشر على GitHub Pages، تسريع فتح النظام والأيقونات، وتعديل حقول شاشة تسجيل الدخول

## 1. إصلاح مشكلة فشل النشر على GitHub Pages (`ERESOLVE`)
- **الإصلاح المنفّذ**:
  1. إزالة حزمتي التطوير غير المستخدمتين `@firebase/rules-unit-testing` و`@firebase/eslint-plugin-security-rules` من `devDependencies` في `package.json` لأنهما تفرضان `peer firebase@"^13.0.0"` بينما المشروع يستخدم `firebase@^12.18.0`.
  2. تحديث خطوة التثبيت في `.github/workflows/deploy-pages.yml` إلى `npm install --legacy-peer-deps` لضمان عدم تعطل النشر مستقبلاً بسبب تعارضات peer dependencies.

---

## 2. تسريع فتح النظام لأول مرة وإصلاح تشوّه الأيقونات (`spa`, `per`, `stet`)
- **الإصلاح المنفّذ**:
  1. **تسريع خط الأيقونات ومنع النصوص المقطوعة (`index.html` و`src/index.css`)**:
     - استبدال رابط خط الأيقونات المتغير الضخم (~3.8 MB) برابط المحور الثابت السريع (`opsz,wght,FILL,GRAD@24,400,0,0&display=block`) مع إضافة `preload` له.
     - إزالة الخط البديل `sans-serif` من فئة `.material-symbols-outlined` حتى لا تظهر حروف اسم الأيقونة المقطوعة (`spa`, `per`, `stet`) أثناء التحميل.
  2. **إلغاء مسح الكاش الإجباري (`index.html`)**:
     - حذف السكربت الذي كان يمسح `caches` في المتصفح عند كل فتح للنظام، مما يسمح للمتصفح بحفظ الخطوط والملفات وتشتغل فوراً.
  3. **تقسيم الحزم وتأجيل الشاشات الثانوية (`vite.config.ts` و`src/App.tsx` و`src/context/AuthContext.tsx`)**:
     - تحويل الشاشات الثقيلة غير المطلوبة لحظة الفتح (`ExaminationScreen`, `PrescriptionPadScreen`, `PatientListItemsScreen`, `FinanceScreen`, `SettingsScreen`, `ClinicalReportsScreen`, `BookingLandingScreen`, `DatabaseInspectorModal`) إلى التحميل الكسول `React.lazy`.
     - تقسيم ملفات البناء عبر `manualChunks` في `vite.config.ts` لفصل مكتبات PDF (`jspdf`, `html2canvas`) وFirebase عن حزمة الواجهة الأساسية.
     - جدولة مستمعات القواميس الطبية الثانوية (`medications`, `labTests`, `radiologyTypes`, `diagnoses`, إلخ) بعد تحميل بيانات لوحة التحكم الأساسية، مع قراءة الملف الشخصي المخزن محلياً بشكل فوري ريثما تكتمل مزامنة Firestore.

---

## 3. إبعاد الأيقونة وزر إظهار كلمة السر عن صندوق الكتابة في شاشة تسجيل الدخول
- **الإصلاح المنفّذ (`src/components/AuthScreen.tsx`)**:
  - إخراج أيقونة المستخدم وزر إظهار/إخفاء كلمة المرور **خارج صندوق الكتابة (`<input>`) تماماً** ووضعهما في مربعات مستقلة بجانب الحقل (`flex items-center gap-2.5`) بحيث يبقى صندوق الكتابة نظيفاً تماماً للقراءة والكتابة دون أي تداخل مع الحروف الأولى أو الأخيرة.

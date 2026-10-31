# خطة تنفيذ برومبت 18: استكمال الإصلاحات المتبقية والتحقق الهندسي

تهدف هذه الخطة إلى تنفيذ المهام الست الواردة في **برومبت 18** بدقة كاملة، دون تعديل قواعد Firestore (`firestore.rules`) أو ملفات `api/` أو حذف أي مستمعة (`onSnapshot`) أو تغيير استعلام `patients`.

---

## 1. المهمة 1 — إصلاح خطأ TypeScript الوحيد مع الإبقاء على الجنس (ذكر وأنثى فقط) (`src/App.tsx`)
- **المتطلب:** الإبقاء على حقل الجنس محصورًا في ذكر وأنثى فقط (`'male' | 'female' | undefined`) دون إضافة `'other'`.
- **سبب الخطأ في `src/App.tsx` (السطر 2451):** المتغير `patientGender` من نوع `'male' | 'female' | undefined` بينما `basePat?.gender` في `src/types/database.ts` يحمل النوع `'male' | 'female' | 'other' | undefined`.
- **الإصلاح:** إبقاء النوع `'male' | 'female' | undefined` كما هو، وتصفية القيمة الاحتياطية `basePat?.gender` في `src/App.tsx` (السطور 2451–2455) لتقبل `'male'` أو `'female'` فقط:
  ```ts
  const patientGender: 'male' | 'female' | undefined = item.gender === 'female'
    ? 'female'
    : item.gender === 'male'
    ? 'male'
    : (basePat?.gender === 'female' || basePat?.gender === 'male' ? basePat.gender : undefined);
  ```
- **التحقق:** تشغيل `npx tsc --noEmit` للتأكد من نجاح الفحص بصفر أخطاء مع بقاء الجنس ذكر وأنثى فقط.

---

## 2. المهمة 2 — التحقق من إزالة النصوص الطبية الثابتة (H1)
- توثيق جميع مواضع عبارة `'كشف عيادة باطنة'` في `src/App.tsx` (السطر 937 داخل `queue: QueueItem[]` للعرض فقط في بطاقة الطابور، والسطر 1986 كاسم خدمة افتراضي عند غياب نوع الزيارة) والتأكد من أنها لا تُحفظ في `clinicalData` داخل مستندات الزيارات.
- توثيق كود `handleFinishExam` في `src/App.tsx` (السطور 2660–2669) لإثبات أن `chiefComplaint` و`history` و`examination` تُحفظ من مدخلات الطبيب كما هي مع بقاء القيمة الفارغة `''` دون أي نص ثابت.

---

## 3. المهمة 3 — التحقق من M2 وM3 (مطابقة المريض ومنع التكرار)
- إدراج الكود الفعلي لدوال `normalizeArabicName` و`normalizePhoneDigits` و`findMatchingPatient` من `src/App.tsx` (السطور 1151–1186).
- توثيق آلية الحماية `inFlightActionsRef` في `handleAddTransaction` (السطور 2170–2196) و`handleAddToQueue` (السطور 2441–2544) و`handleAddAppointment` (السطور 2555–2610)، وإثبات الحفاظ على معرّف الفاتورة `newTx.id`.

---

## 4. المهمة 4 — التحقق من المالية (`TRANSFER`) والمؤقتات
- توثيق معالجة `TRANSFER` (إنستاباي) في `src/App.tsx` (السطور 2205–2211 و2394 و2482)، و`src/utils/buildTransactions.ts` (السطور 36–37)، و`src/components/screens/FinanceScreen.tsx` (السطور 131 و172–173).
- توثيق تنظيف المؤقتات `bannerTimeoutRef` (السطور 1130–1149) و`isSubscriptionMounted` مع `clearTimeout(catalogTimer)` (السطور 770–796) عند تفكيك المكوّن.

---

## 5. المهمة 5 — قياس القراءات (`src/services/readMeter.ts`)
- إضافة سجل `initialByListener: Record<string, number>` داخل `src/services/readMeter.ts` يسجّل عدد المستندات المقروءة في التحميل الأول (`first`) لكل مستمعة حسب اسمها (`label`) في دالتي `meterQuery` و`meterDoc` دون المساس بأي استعلام.
- عرض هذا العدّاد التفصيلي عند استدعاء `window.__soliReads()` في المتصفح وإرجاعه ضمن الكائن المُعاد.
- إعداد جدول تفصيلي بجميع المستمعات الحالية مقسمًا إلى:
  1. **مقيّدة بنافذة زمنية أو حالة نشطة** (`appointments`, `visits`, `invoices`, `payments`, `prescriptions`, `followUps`, `labOrders`, `radiologyOrders`).
  2. **غير مقيّدة / كاملة** (`patients`, قوائم الكتالوج الطبي، ومستندات `settings/*`).

---

## 6. المهمة 6 — التقرير النهائي الموثق
- تقديم تقرير شامل يتضمن السطور المعدّلة، مخرجات `npx tsc --noEmit` الفعلية، الأدلة البرمجية للمهام 2–4 بأرقام السطور، وجدول المستمعات من المهمة 5.

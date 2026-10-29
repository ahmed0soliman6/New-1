# تقرير إنجاز برومبت 16: حفظ العلامات الحيوية الفعلية للطبيب عند إنهاء الكشف

## 1. الحالة والنتيجة
- **الحالة:** تم التنفيذ بنجاح واجتياز الفحص البرمجي والبناء بنسبة 100%.
- **النطاق المغلق:** 3 ملفات فقط:
  1. `src/utils/vitalsMapper.ts` (جديد)
  2. `src/components/screens/ExaminationScreen.tsx`
  3. `src/App.tsx` (معالج `handleFinishExam` والاستيراد فقط).

---

## 2. ما تم إنجازه بالتفصيل
1. **إنشاء `src/utils/vitalsMapper.ts`:**
   - دالة `toNum`: تحويل النصوص إلى أرقام بدقة مع دعم الفواصل العشرية، وإرجاع `null` للقيم الفارغة.
   - دالة `vitalsToVisit`: تحويل مدخلات بطاقة الطبيب إلى كائن `Visit.vitalSigns` لـ Firestore مع تحويل الحقول غير المدخلة إلى `null` دون أي قيم افتراضية.
   - دالة `hasAnyVital`: التحقق مما إذا كان هناك أي قياس مدخل بالفعل.
2. **تعديل `src/components/screens/ExaminationScreen.tsx`:**
   - إضافة حالة `examVitals` وتمريرها إلى `<VitalsCard initialVitals={examVitals} onSave={(v) => setExamVitals(v)} />`.
   - تمرير `vitals: hasAnyVital(examVitals) ? examVitals : null` في استدعاء `onFinishExam`.
   - توسيع واجهة `ExaminationScreenProps.onFinishExam` بالحقل الجديد.
3. **تعديل `src/App.tsx`:**
   - استيراد `vitalsToVisit` و `VitalsData`.
   - توسيع معامل `handleFinishExam` ليستقبل `vitals?: Partial<VitalsData> | null`.
   - تحديث إسناد `vitalSigns`:
     ```ts
     const vitalSigns = examData?.vitals
       ? vitalsToVisit(examData.vitals)
       : (activeWaiting.vitalSigns || {});
     ```

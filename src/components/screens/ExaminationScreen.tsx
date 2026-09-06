import React, { useState } from 'react';
import {
  ScreenType,
  PatientListItem,
  RadiologyCatalogItem,
  RadiologyOrderItem,
  LabCatalogItem,
  LabOrderItem,
  DrugCatalogItem,
  PrescriptionItem,
  DiagnosisCatalogItem,
  SymptomCatalogItem,
} from '../../types';
import { VitalsCard } from '../examination/VitalsCard';
import { SymptomsAndExamCard } from '../examination/SymptomsAndExamCard';
import { RadiologyCard } from '../examination/RadiologyCard';
import { LabCard } from '../examination/LabCard';
import { DiagnosisCard, PatientDiagnosis } from '../examination/DiagnosisCard';
import { MedicationsCard } from '../examination/MedicationsCard';
import { FollowupCard } from '../examination/FollowupCard';
import { usePermissions } from '../../context/AuthContext';
import { PermissionGate } from '../auth/PermissionGate';

interface ExaminationScreenProps {
  patient: PatientListItem;
  onNavigate: (screen: ScreenType) => void;
  onFinishExam: () => void;

  // Catalogs and handlers
  radiologyCatalog: RadiologyCatalogItem[];
  onAddRadiologyToCatalog: (item: RadiologyCatalogItem) => void;
  labCatalog: LabCatalogItem[];
  onAddLabToCatalog: (item: LabCatalogItem) => void;
  drugCatalog: DrugCatalogItem[];
  onAddDrugToCatalog: (item: DrugCatalogItem) => void;
  diagnosesCatalog: DiagnosisCatalogItem[];
  onAddDiagnosisToCatalog: (item: DiagnosisCatalogItem) => void;
  symptomsCatalog: SymptomCatalogItem[];
  onAddSymptomToCatalog: (item: SymptomCatalogItem) => void;

  // Prescription syncing
  activePrescription: PrescriptionItem[];
  onChangeActivePrescription: (items: PrescriptionItem[]) => void;
}

export const ExaminationScreen: React.FC<ExaminationScreenProps> = ({
  patient,
  onNavigate,
  onFinishExam,
  radiologyCatalog,
  onAddRadiologyToCatalog,
  labCatalog,
  onAddLabToCatalog,
  drugCatalog,
  onAddDrugToCatalog,
  diagnosesCatalog,
  onAddDiagnosisToCatalog,
  symptomsCatalog,
  onAddSymptomToCatalog,
  activePrescription,
  onChangeActivePrescription,
}) => {
  // Navigation tabs / quick filter
  const [activeTab, setActiveTab] = useState<'all' | 'vitals' | 'symptoms' | 'lab' | 'rad' | 'diag' | 'rx' | 'followup'>('all');

  // Consultation state
  const [complaint, setComplaint] = useState(
    'ألم حاد بمنتصف الصدر والشرسوف يزداد بعد تناول الأطعمة الدسمة، مع حموضة وارتجاع مريئي.'
  );
  const [physicalExam, setPhysicalExam] = useState(
    'فحص البطن: بطن لينة مع إيلام خفيف بالجس السطحي والعميق بمنطقة الشرسوف Epigastrium بدون تضخم كبدي أو طحالي. أصوات الأمعاء طبيعية. فحص القلب والرئتين سليم.'
  );

  // Dynamic Radiology Orders
  const [radiologyOrders, setRadiologyOrders] = useState<RadiologyOrderItem[]>([
    {
      id: 'rad-ord-init-1',
      name: 'أشعة الصدر العادية (Chest X-Ray PA/Lat)',
      category: 'أشعة سينية (X-Ray)',
      status: 'REQUEST',
      orderedAt: '10:15 ص',
      notes: 'استبعاد أي ارتجاع أو فتق حجاب حاجز',
    },
    {
      id: 'rad-ord-init-2',
      name: 'موجات صوتية على البطن والحوض (Abdominal & Pelvic US)',
      category: 'موجات صوتية (Ultrasound)',
      status: 'REPORT',
      orderedAt: '09:45 ص',
      resultSummary: 'فحص سليم للكبد والمرارة والكليتين بدون حصوات',
      reportDetails: 'Normal liver echogenicity. Gallbladder is clear of stones. Kidneys normal in size and corticomedullary differentiation.',
    },
  ]);

  // Dynamic Lab Orders
  const [labOrders, setLabOrders] = useState<LabOrderItem[]>([
    {
      id: 'lab-ord-init-1',
      testName: 'صورة دم كاملة (CBC with Differential)',
      category: 'أمراض الدم',
      status: 'REQUEST',
      orderedAt: '10:18 ص',
      sampleType: 'دم وريدي',
    },
    {
      id: 'lab-ord-init-2',
      testName: 'تحليل جرثومة المعدة في البراز (H. Pylori Stool Antigen)',
      category: 'مناعة وفيروسات',
      status: 'RESULT',
      orderedAt: '09:30 ص',
      resultValue: 'إيجابي (+ve)',
      referenceRange: 'Negative (سلبية)',
      isAbnormal: true,
    },
    {
      id: 'lab-ord-init-3',
      testName: 'السكر التراكمي في الدم (HbA1c)',
      category: 'الغدد الصماء والسكر',
      status: 'RESULT',
      orderedAt: '09:35 ص',
      resultValue: '7.2%',
      referenceRange: 'Normal < 5.7%',
      unit: '%',
      isAbnormal: true,
    },
  ]);

  // Dynamic Patient Diagnoses
  const [patientDiagnoses, setPatientDiagnoses] = useState<PatientDiagnosis[]>([
    {
      id: 'diag-init-1',
      code: 'K21.9',
      nameAr: 'ارتجاع المريء والتهاب المعدة المزمن (GERD)',
      nameEn: 'Gastro-esophageal reflux disease without esophagitis',
      isPrimary: true,
    },
    {
      id: 'diag-init-2',
      code: 'I10',
      nameAr: 'ارتفاع ضغط الدم الشرياني الأساسي (Essential Hypertension)',
      nameEn: 'Essential (primary) hypertension',
      isPrimary: false,
    },
  ]);

  // Follow-up
  const [followupDate, setFollowupDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });
  const [lifestyleAdvice, setLifestyleAdvice] = useState(
    '• الامتناع التام عن الأطعمة الدسمة، الحارة، المقليات، والمشروبات الغازية.\n• عدم الاستلقاء أو النوم مباشرة بعد تناول الطعام لمدة ساعتين على الأقل.'
  );

  const { assertPermission, canAccess, role, userProfile } = usePermissions();
  const isAllowed = canAccess('clinical-exam');
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const handleFinish = () => {
    if (!isAllowed) {
      alert('غير مصرح لك بإنهاء الكشف الطبي أو حفظ الزيارة.');
      return;
    }
    try {
      assertPermission('clinical.complete', 'إنهاء الكشف وحفظ الزيارة');
      setShowSuccessModal(true);
      setTimeout(() => {
        setShowSuccessModal(false);
        onFinishExam();
        onNavigate('waiting-queue');
      }, 2200);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'ليس لديك صلاحية لإنهاء الكشف.');
    }
  };

  if (!isAllowed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center max-w-xl mx-auto space-y-5">
        <div className="w-20 h-20 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shadow-lg">
          <span className="material-symbols-outlined text-4xl">gpp_bad</span>
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            غير مصرح بالوصول إلى غرفة الكشف الطبي
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            حسابك الحالي ({userProfile?.displayName || userProfile?.username || 'المستخدم'}) بدور ({role}) لا يمتلك صلاحية الوصول لشاشة الكشف الإكلينيكي أو تحرير السجلات الطبية. هذه الشاشة مخصصة للأطباء فقط.
          </p>
        </div>
        <button
          onClick={() => onNavigate('dashboard')}
          className="px-6 py-2.5 rounded-xl bg-[#00c2cb] hover:bg-[#45dee7] text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer"
        >
          العودة للوحة التحكم المسموحة
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full pb-20 space-y-6 text-slate-800 dark:text-[#dde2f5]">
      {/* Top Banner: Active Consultation Session & Patient Meta */}
      <div className="bg-white dark:bg-[#111A2E] p-5 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Patient Details */}
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-[#00c2cb]/15 text-[#008f97] dark:text-[#00c2cb] flex items-center justify-center font-bold text-lg shadow-sm">
              {patient.name.charAt(0)}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 dark:text-[#dde2f5]">{patient.name}</h1>
                <span className="px-2 py-0.5 rounded-full bg-teal-100 dark:bg-[#00c2cb]/20 text-[#008f97] dark:text-[#45dee7] text-[11px] font-bold">
                  ملف رقم: #{patient.fileNumber || 1}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-[#bbc9ca] text-[11px] font-mono">
                  {patient.medicalCode}
                </span>
                <span className="text-xs text-slate-500 dark:text-[#859394]">
                  {patient.age} سنة • {patient.gender === 'female' ? 'أنثى' : 'ذكر'}
                </span>
              </div>

              {/* Badges: Allergies & Chronic Diseases */}
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {patient.allergies && patient.allergies.length > 0 && (
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-400 text-[11px] font-bold">
                    <span className="material-symbols-outlined text-sm">warning</span>
                    <span>حساسية: {patient.allergies.join('، ')}</span>
                  </div>
                )}

                {patient.chronicConditions && patient.chronicConditions.length > 0 && (
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/40 text-purple-700 dark:text-[#d0bcff] text-[11px] font-medium">
                    <span className="material-symbols-outlined text-sm">monitor_heart</span>
                    <span>أمراض مزمنة: {patient.chronicConditions.join('، ')}</span>
                  </div>
                )}

                <div className="text-[11px] text-slate-500 dark:text-[#859394] flex items-center gap-1 mr-2">
                  <span className="material-symbols-outlined text-xs text-teal-600">call</span>
                  <span className="font-mono">{patient.phone}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2.5 self-end lg:self-center">
            <button
              type="button"
              onClick={() => onNavigate('prescription-pad')}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-[#18233C] text-slate-700 dark:text-[#dde2f5] hover:bg-slate-200 dark:hover:bg-[#242a38] text-xs font-bold transition-all cursor-pointer border border-slate-200 dark:border-white/5"
            >
              <span className="material-symbols-outlined text-base text-[#008f97] dark:text-[#00c2cb]">prescriptions</span>
              <span>عرض وطباعة الروشتة (Rx)</span>
            </button>

            <PermissionGate permission="clinical.complete">
              <button
                type="button"
                onClick={handleFinish}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#00c2cb] hover:bg-[#45dee7] text-[#08101C] text-xs font-bold shadow-md shadow-[#00c2cb]/20 transition-all cursor-pointer active:scale-95"
              >
                <span className="material-symbols-outlined text-base">task_alt</span>
                <span>إنهاء الكشف وحفظ الزيارة</span>
              </button>
            </PermissionGate>
          </div>
        </div>

        {/* Section Jump Tabs */}
        <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-white/5 overflow-x-auto pb-1 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-[#859394] hover:bg-slate-100 dark:hover:bg-white/5'
            }`}
          >
            عرض الكل (All Cards)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('vitals')}
            className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'vitals'
                ? 'bg-teal-600 text-white font-bold'
                : 'text-slate-600 dark:text-[#859394] hover:bg-slate-100 dark:hover:bg-white/5'
            }`}
          >
            العلامات الحيوية
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('symptoms')}
            className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'symptoms'
                ? 'bg-purple-600 text-white font-bold'
                : 'text-slate-600 dark:text-[#859394] hover:bg-slate-100 dark:hover:bg-white/5'
            }`}
          >
            الأعراض والفحص
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('lab')}
            className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'lab'
                ? 'bg-emerald-600 text-white font-bold'
                : 'text-slate-600 dark:text-[#859394] hover:bg-slate-100 dark:hover:bg-white/5'
            }`}
          >
            <span>المعمل والتحاليل</span>
            <span className="w-4 h-4 rounded-full bg-emerald-100 dark:bg-white/20 text-emerald-800 dark:text-white text-[10px] flex items-center justify-center font-bold">
              {labOrders.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('rad')}
            className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'rad'
                ? 'bg-sky-600 text-white font-bold'
                : 'text-slate-600 dark:text-[#859394] hover:bg-slate-100 dark:hover:bg-white/5'
            }`}
          >
            <span>الأشعة والتصوير</span>
            <span className="w-4 h-4 rounded-full bg-sky-100 dark:bg-white/20 text-sky-800 dark:text-white text-[10px] flex items-center justify-center font-bold">
              {radiologyOrders.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('diag')}
            className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'diag'
                ? 'bg-amber-500 text-slate-900 font-bold'
                : 'text-slate-600 dark:text-[#859394] hover:bg-slate-100 dark:hover:bg-white/5'
            }`}
          >
            <span>التشخيص</span>
            <span className="w-4 h-4 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 text-[10px] flex items-center justify-center font-bold">
              {patientDiagnoses.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('rx')}
            className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'rx'
                ? 'bg-[#00c2cb] text-slate-900 font-bold'
                : 'text-slate-600 dark:text-[#859394] hover:bg-slate-100 dark:hover:bg-white/5'
            }`}
          >
            <span>الأدوية والروشتة</span>
            <span className="w-4 h-4 rounded-full bg-teal-100 dark:bg-teal-900/40 text-teal-800 text-[10px] flex items-center justify-center font-bold">
              {activePrescription.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('followup')}
            className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'followup'
                ? 'bg-indigo-600 text-white font-bold'
                : 'text-slate-600 dark:text-[#859394] hover:bg-slate-100 dark:hover:bg-white/5'
            }`}
          >
            المتابعة والنظام الغذائي
          </button>
        </div>
      </div>

      {/* DYNAMIC EXAMINATION CARDS (Modular Architecture) */}
      <div className="space-y-6">
        {/* 1. Vital Signs Card */}
        {(activeTab === 'all' || activeTab === 'vitals') && (
          <VitalsCard />
        )}

        {/* 2. Symptoms & Physical Exam Card */}
        {(activeTab === 'all' || activeTab === 'symptoms') && (
          <SymptomsAndExamCard
            symptomsCatalog={symptomsCatalog}
            onAddSymptomToCatalog={onAddSymptomToCatalog}
            complaint={complaint}
            onChangeComplaint={setComplaint}
            physicalExam={physicalExam}
            onChangePhysicalExam={setPhysicalExam}
          />
        )}

        {/* 3. Laboratory Investigations Card (LabOrder vs LabResult with Request/Result/Report statuses) */}
        {(activeTab === 'all' || activeTab === 'lab') && (
          <LabCard
            labOrders={labOrders}
            onChangeOrders={setLabOrders}
            labCatalog={labCatalog}
            onAddLabToCatalog={onAddLabToCatalog}
          />
        )}

        {/* 4. Radiology & Imaging Card (Dynamic types, Request/Result/Report statuses, add on the fly) */}
        {(activeTab === 'all' || activeTab === 'rad') && (
          <RadiologyCard
            radiologyOrders={radiologyOrders}
            onChangeOrders={setRadiologyOrders}
            radiologyCatalog={radiologyCatalog}
            onAddRadiologyToCatalog={onAddRadiologyToCatalog}
          />
        )}

        {/* 5. Clinical Diagnoses Card (ICD-10, Primary/Secondary, Favorites, Unlisted) */}
        {(activeTab === 'all' || activeTab === 'diag') && (
          <DiagnosisCard
            diagnoses={patientDiagnoses}
            onChangeDiagnoses={setPatientDiagnoses}
            diagnosesCatalog={diagnosesCatalog}
            onAddDiagnosisToCatalog={onAddDiagnosisToCatalog}
          />
        )}

        {/* 6. Medications & Prescription Rx Card (Level 1, 2, 3 + Decoupled Snapshot) */}
        {(activeTab === 'all' || activeTab === 'rx') && (
          <MedicationsCard
            prescriptionItems={activePrescription}
            onChangePrescription={onChangeActivePrescription}
            drugCatalog={drugCatalog}
            onAddDrugToCatalog={onAddDrugToCatalog}
            onOpenPrescriptionPad={() => onNavigate('prescription-pad')}
          />
        )}

        {/* 7. Follow-up & Lifestyle Advice Card */}
        {(activeTab === 'all' || activeTab === 'followup') && (
          <FollowupCard
            followupDate={followupDate}
            onChangeFollowupDate={setFollowupDate}
            lifestyleAdvice={lifestyleAdvice}
            onChangeLifestyleAdvice={setLifestyleAdvice}
          />
        )}
      </div>

      {/* Floating Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#080e1b]/95 backdrop-blur-md border-t border-slate-200 dark:border-white/10 p-3.5 shadow-2xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-800 dark:text-[#dde2f5]">
              جلسة الكشف الطبي الحالية:
            </span>
            <span className="text-xs text-slate-500 dark:text-[#859394]">
              {patient.name} • {patientDiagnoses.find((d) => d.isPrimary)?.nameAr || 'في انتظار اعتماد التشخيص'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigate('prescription-pad')}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-[#18233C] text-slate-700 dark:text-[#dde2f5] hover:bg-slate-200 text-xs font-bold transition-all cursor-pointer"
            >
              معاينة الروشتة Rx ({activePrescription.length})
            </button>
            <button
              type="button"
              onClick={handleFinish}
              className="px-6 py-2 rounded-xl bg-[#00c2cb] hover:bg-[#45dee7] text-[#08101C] text-xs font-bold shadow-md shadow-[#00c2cb]/20 transition-all cursor-pointer active:scale-95"
            >
              إنهاء الكشف وحفظ الزيارة
            </button>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#18233C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl space-y-3 animate-in zoom-in-95">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-[#10B981] flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-3xl font-bold">check_circle</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-[#dde2f5]">
              تم اعتماد وإنهاء الكشف بنجاح
            </h3>
            <p className="text-xs text-slate-500 dark:text-[#859394] leading-relaxed">
              تم تحديث السجل الطبي للمريض، حفظ طلبات الأشعة والتحاليل، وتوثيق بنود الروشتة في أرشيف الزيارات.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

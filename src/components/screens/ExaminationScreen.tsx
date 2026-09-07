import React, { useState, useEffect } from 'react';
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
import {
  loadExamDisplaySettings,
  ExamDisplaySettings,
} from '../../utils/examDisplaySettings';

interface ChronicItem {
  id: string;
  name: string;
  category: string;
  color: string;
}

interface ExaminationScreenProps {
  patient?: PatientListItem | null;
  availablePatients?: PatientListItem[];
  onSelectPatient?: (patient: PatientListItem) => void;
  presetChronicConditions?: ChronicItem[];
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
  patient = null,
  availablePatients = [],
  onSelectPatient = (_patient: PatientListItem) => {},
  presetChronicConditions = [],
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
  // Navigation tabs / quick section jump
  const [activeTab, setActiveTab] = useState<'all' | 'vitals' | 'symptoms' | 'lab' | 'rad' | 'diag' | 'rx' | 'followup'>('all');

  // Display toggles from settings (Vitals, Labs, Radiology)
  const [displaySettings, setDisplaySettings] = useState<ExamDisplaySettings>(loadExamDisplaySettings);

  // Sync display settings on mount and tab focus
  useEffect(() => {
    setDisplaySettings(loadExamDisplaySettings());
  }, []);

  // Consultation state - only loads registered data from visit registration if present
  const [complaint, setComplaint] = useState(patient?.chiefComplaint || '');
  const [physicalExam, setPhysicalExam] = useState('');
  const [patientChronicConditions, setPatientChronicConditions] = useState<string[]>(patient?.chronicConditions || []);
  const [isAddingChronic, setIsAddingChronic] = useState(false);
  const [newChronicInput, setNewChronicInput] = useState('');

  // Keep in sync if patient prop changes
  useEffect(() => {
    setComplaint(patient?.chiefComplaint || '');
    setPatientChronicConditions(patient?.chronicConditions || []);
  }, [patient?.id, patient?.chiefComplaint, patient?.chronicConditions]);

  // Dynamic Radiology Orders - starts empty
  const [radiologyOrders, setRadiologyOrders] = useState<RadiologyOrderItem[]>([]);

  // Dynamic Lab Orders - starts empty
  const [labOrders, setLabOrders] = useState<LabOrderItem[]>([]);

  // Dynamic Patient Diagnoses - starts empty
  const [patientDiagnoses, setPatientDiagnoses] = useState<PatientDiagnosis[]>([]);

  // Follow-up
  const [followupDate, setFollowupDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });
  const [lifestyleAdvice, setLifestyleAdvice] = useState('');

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [copiedWhatsAppText, setCopiedWhatsAppText] = useState(false);

  // Add custom or preset chronic condition
  const handleToggleChronicCondition = (condition: string) => {
    if (patientChronicConditions.includes(condition)) {
      setPatientChronicConditions((prev) => prev.filter((c) => c !== condition));
    } else {
      setPatientChronicConditions((prev) => [...prev, condition]);
    }
  };

  const handleAddCustomChronic = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newChronicInput.trim();
    if (trimmed && !patientChronicConditions.includes(trimmed)) {
      setPatientChronicConditions((prev) => [...prev, trimmed]);
      setNewChronicInput('');
      setIsAddingChronic(false);
    }
  };

  // Generate WhatsApp formatted message
  const generateWhatsAppMessage = () => {
    const primaryDiag = patientDiagnoses.find((d) => d.isPrimary)?.nameAr || patientDiagnoses[0]?.nameAr || 'كشف واستشارة طبية';
    const lines: string[] = [];

    lines.push(`🏥 *عيادات د. حازم سولي التخصصية*`);
    lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`👤 *المريض:* ${patient?.name || 'مريض غير محدد'}`);
    lines.push(`📄 *ملف طبي رقم:* #${patient?.fileNumber || '-'}`);
    lines.push(`🩺 *التشخيص المعتمد:* ${primaryDiag}`);

    if (patientChronicConditions.length > 0) {
      lines.push(`⚠️ *أمراض مزمنة:* ${patientChronicConditions.join('، ')}`);
    }

    if (activePrescription.length > 0) {
      lines.push(`---------------------------------`);
      lines.push(`💊 *الروشتة والعلاج الدوائي:*`);
      activePrescription.forEach((item, index) => {
        lines.push(`${index + 1}. *${item.drugName}* (${item.dosageForm || 'علاج'})`);
        lines.push(`   ▫️ الجرعة: ${item.dosage}`);
        if (item.timing) lines.push(`   ▫️ التوقيت: ${item.timing}`);
        if (item.duration) lines.push(`   ▫️ المدة: ${item.duration}`);
        if (item.notes) lines.push(`   ▫️ ملاحظات: ${item.notes}`);
      });
    }

    if (labOrders.length > 0) {
      lines.push(`---------------------------------`);
      lines.push(`🧪 *التحاليل المطلوبة:*`);
      labOrders.forEach((l) => lines.push(`- ${l.testName} (${l.status === 'RESULT' ? 'تمت النتيجة' : 'مطلوب'})`));
    }

    if (radiologyOrders.length > 0) {
      lines.push(`---------------------------------`);
      lines.push(`🩻 *الفحوصات والأشعة المطلوبة:*`);
      radiologyOrders.forEach((r) => lines.push(`- ${r.name}`));
    }

    if (lifestyleAdvice) {
      lines.push(`---------------------------------`);
      lines.push(`🩺 *نصائح وتعليمات طبية:*`);
      lines.push(lifestyleAdvice);
    }

    if (followupDate) {
      lines.push(`---------------------------------`);
      lines.push(`🗓️ *موعد الاستشارة القادمة:* ${followupDate}`);
    }

    lines.push(`---------------------------------`);
    lines.push(`📞 للاستفسارات والطوارئ: 01092847162`);
    lines.push(`نتمنى لكم دوام الصحة والعافية.`);

    return lines.join('\n');
  };

  const getCleanPatientWhatsAppUrl = () => {
    const raw = patient?.phone || '';
    let digits = raw.replace(/\D/g, '');
    if (digits.startsWith('0')) {
      digits = '2' + digits;
    } else if (!digits.startsWith('20') && digits.length === 10) {
      digits = '20' + digits;
    }
    const msg = encodeURIComponent(generateWhatsAppMessage());
    return `https://wa.me/${digits}?text=${msg}`;
  };

  const handleCopyWhatsApp = () => {
    const text = generateWhatsAppMessage();
    navigator.clipboard.writeText(text);
    setCopiedWhatsAppText(true);
    setTimeout(() => setCopiedWhatsAppText(false), 3000);
  };

  const { assertPermission, canAccess, role, userProfile } = usePermissions();
  const isAllowed = canAccess('clinical-exam');
  const [isExamFinished, setIsExamFinished] = useState(false);

  const handleFinish = () => {
    if (!isAllowed) {
      alert('غير مصرح لك بإنهاء الكشف الطبي أو حفظ الزيارة.');
      return;
    }
    try {
      assertPermission('clinical.complete', 'إنهاء الكشف وحفظ الزيارة');
      setIsExamFinished(true);
      onFinishExam();
      setShowSuccessModal(true);
      setTimeout(() => {
        setShowSuccessModal(false);
        const el = document.getElementById('finished-exam-summary');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        }
      }, 1600);
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
            حسابك الحالي ({userProfile?.displayName || userProfile?.username || 'المستخدم'}) بدور ({role}) لا يمتلك صلاحية الوصول لشاشة الكشف الإكلينيكي أو تحرير السجلات الطبية.
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
    <div className="flex flex-col w-full max-w-full overflow-x-hidden pb-28 space-y-6 text-slate-800 dark:text-[#dde2f5]">
      {/* Top Banner: Active Consultation Session & Patient Meta */}
      <div className="bg-white dark:bg-[#111A2E] p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-white/5 shadow-xs space-y-4">
        {patient ? (
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Patient Details */}
            <div className="flex items-start gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-[#00c2cb]/15 text-[#008f97] dark:text-[#00c2cb] flex items-center justify-center font-bold text-lg shadow-xs shrink-0">
                {(patient.name || 'م').charAt(0)}
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-[#dde2f5] truncate">
                    {patient.name}
                  </h1>
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

                {/* Badges: Allergies & Chronic Diseases with Interactive Addition */}
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {patient.allergies && patient.allergies.length > 0 && (
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-400 text-[11px] font-bold">
                      <span className="material-symbols-outlined text-sm">warning</span>
                      <span>حساسية: {patient.allergies.join('، ')}</span>
                    </div>
                  )}

                  {patientChronicConditions.map((condition) => (
                    <div
                      key={condition}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/40 text-purple-700 dark:text-[#d0bcff] text-[11px] font-medium"
                    >
                      <span className="material-symbols-outlined text-sm">monitor_heart</span>
                      <span>{condition}</span>
                      <button
                        type="button"
                        onClick={() => handleToggleChronicCondition(condition)}
                        className="text-purple-400 hover:text-purple-600 ml-0.5 text-xs font-bold"
                        title="إزالة هذا المرض المزمن من الكشف"
                      >
                        ×
                      </button>
                    </div>
                  ))}

                  {/* Add chronic button */}
                  {!isAddingChronic ? (
                    <button
                      type="button"
                      onClick={() => setIsAddingChronic(true)}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-100/60 dark:bg-purple-900/30 text-purple-700 dark:text-[#d0bcff] text-[11px] font-bold hover:bg-purple-200/70 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-xs">add</span>
                      <span>+ مرض مزمن</span>
                    </button>
                  ) : (
                    <form onSubmit={handleAddCustomChronic} className="flex items-center gap-1">
                      <input
                        type="text"
                        value={newChronicInput}
                        onChange={(e) => setNewChronicInput(e.target.value)}
                        placeholder="اسم المرض المزمن..."
                        className="px-2 py-0.5 text-[11px] rounded-lg border border-purple-300 dark:border-purple-800 bg-white dark:bg-[#080e1b] focus:outline-none"
                        autoFocus
                      />
                      <button
                        type="submit"
                        className="px-2 py-0.5 rounded-lg bg-purple-600 text-white text-[11px] font-bold cursor-pointer"
                      >
                        إضافة
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsAddingChronic(false)}
                        className="px-1.5 py-0.5 rounded-lg bg-slate-200 text-slate-600 text-[11px] cursor-pointer"
                      >
                        إلغاء
                      </button>
                    </form>
                  )}

                  {patient.phone && (
                    <div className="text-[11px] text-slate-500 dark:text-[#859394] flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs text-teal-600">call</span>
                      <span className="font-mono">{patient.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-end lg:self-center">
              <button
                type="button"
                onClick={() => setShowWhatsAppModal(true)}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-xs font-bold transition-all cursor-pointer border border-emerald-200 dark:border-emerald-800/40"
                title="إرسال الروشتة وملخص الكشف للمريض عبر واتساب"
              >
                <span className="material-symbols-outlined text-base">chat</span>
                <span>واتساب</span>
              </button>

              <button
                type="button"
                onClick={() => setShowPrintModal(true)}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-[#18233C] text-slate-700 dark:text-[#dde2f5] hover:bg-slate-200 dark:hover:bg-[#242a38] text-xs font-bold transition-all cursor-pointer border border-slate-200 dark:border-white/5"
              >
                <span className="material-symbols-outlined text-base text-[#008f97] dark:text-[#00c2cb]">print</span>
                <span>طباعة الروشتة</span>
              </button>

              <PermissionGate permission="clinical.complete">
                <button
                  type="button"
                  onClick={handleFinish}
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#00c2cb] hover:bg-[#45dee7] text-slate-950 text-xs font-bold shadow-md shadow-[#00c2cb]/20 transition-all cursor-pointer active:scale-95"
                >
                  <span className="material-symbols-outlined text-base">task_alt</span>
                  <span>إنهاء الكشف وحفظ الزيارة</span>
                </button>
              </PermissionGate>
            </div>
          </div>
        ) : (
          /* Empty Patient State (Doctor opened exam screen without prior patient selection) */
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-2">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-2xl">stethoscope</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-[#dde2f5]">
                    جلسة كشف طبي جديدة
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-xs font-bold border border-amber-500/20">
                    كشف حر فارغ (بدون بيانات مسبقة)
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-[#859394] mt-0.5">
                  يمكنك تحرير التشخيص والروشتة والأعراض والفحوصات مباشرة، أو ربط الكشف بمريض مسجل:
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              {availablePatients.length > 0 && (
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-[#dde2f5] whitespace-nowrap">
                    اختيار مريض:
                  </label>
                  <select
                    onChange={(e) => {
                      const selected = availablePatients.find((p) => p.id === e.target.value);
                      if (selected) onSelectPatient(selected);
                    }}
                    defaultValue=""
                    className="bg-slate-50 dark:bg-[#080e1b] text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-800 dark:text-[#dde2f5] focus:outline-none cursor-pointer"
                  >
                    <option value="" disabled>-- اختر مريضاً من القائمة --</option>
                    {availablePatients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (#{p.fileNumber || p.medicalCode})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                type="button"
                onClick={() => onNavigate('new-visit')}
                className="px-3.5 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-[#45dee7] text-xs font-bold border border-teal-200 dark:border-teal-800/40 cursor-pointer"
              >
                + تسجيل زيارة مريض جديد
              </button>

              <PermissionGate permission="clinical.complete">
                <button
                  type="button"
                  onClick={handleFinish}
                  className="px-5 py-2 rounded-xl bg-[#00c2cb] hover:bg-[#45dee7] text-slate-950 text-xs font-bold shadow-md cursor-pointer"
                >
                  حفظ الكشف
                </button>
              </PermissionGate>
            </div>
          </div>
        )}

        {/* Responsive Section Jump Tabs (Dynamically respects displaySettings) */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-white/5 overflow-x-auto pb-1 text-xs no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-2 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-[#859394] hover:bg-slate-100 dark:hover:bg-white/5'
            }`}
          >
            عرض الكل (All Cards)
          </button>

          {/* Vitals Tab */}
          {displaySettings.showVitals && (
            <button
              type="button"
              onClick={() => setActiveTab('vitals')}
              className={`px-3.5 py-2 rounded-xl font-medium whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'vitals'
                  ? 'bg-teal-600 text-white font-bold'
                  : 'text-slate-600 dark:text-[#859394] hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
            >
              العلامات الحيوية
            </button>
          )}

          {/* Symptoms Tab */}
          <button
            type="button"
            onClick={() => setActiveTab('symptoms')}
            className={`px-3.5 py-2 rounded-xl font-medium whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'symptoms'
                ? 'bg-purple-600 text-white font-bold'
                : 'text-slate-600 dark:text-[#859394] hover:bg-slate-100 dark:hover:bg-white/5'
            }`}
          >
            الأعراض والفحص
          </button>

          {/* Labs Tab */}
          {displaySettings.showLabs && (
            <button
              type="button"
              onClick={() => setActiveTab('lab')}
              className={`px-3.5 py-2 rounded-xl font-medium whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
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
          )}

          {/* Radiology Tab */}
          {displaySettings.showRadiology && (
            <button
              type="button"
              onClick={() => setActiveTab('rad')}
              className={`px-3.5 py-2 rounded-xl font-medium whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
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
          )}

          {/* Diagnosis Tab */}
          <button
            type="button"
            onClick={() => setActiveTab('diag')}
            className={`px-3.5 py-2 rounded-xl font-medium whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
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

          {/* Rx Tab */}
          <button
            type="button"
            onClick={() => setActiveTab('rx')}
            className={`px-3.5 py-2 rounded-xl font-medium whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
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

          {/* Followup Tab */}
          <button
            type="button"
            onClick={() => setActiveTab('followup')}
            className={`px-3.5 py-2 rounded-xl font-medium whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'followup'
                ? 'bg-indigo-600 text-white font-bold'
                : 'text-slate-600 dark:text-[#859394] hover:bg-slate-100 dark:hover:bg-white/5'
            }`}
          >
            المتابعة والنظام الغذائي
          </button>
        </div>
      </div>

      {/* DYNAMIC EXAMINATION CARDS (Modular Responsive Architecture) */}
      <div className="space-y-6">
        {/* 1. Vital Signs Card (Conditional on displaySettings.showVitals) */}
        {displaySettings.showVitals && (activeTab === 'all' || activeTab === 'vitals') && (
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
            initialSelectedSymptoms={patient?.intakeSymptoms || (patient?.chiefComplaint ? [patient.chiefComplaint] : [])}
          />
        )}

        {/* 3. Laboratory Investigations Card (Conditional on displaySettings.showLabs) */}
        {displaySettings.showLabs && (activeTab === 'all' || activeTab === 'lab') && (
          <LabCard
            labOrders={labOrders}
            onChangeOrders={setLabOrders}
            labCatalog={labCatalog}
            onAddLabToCatalog={onAddLabToCatalog}
          />
        )}

        {/* 4. Radiology & Imaging Card (Conditional on displaySettings.showRadiology) */}
        {displaySettings.showRadiology && (activeTab === 'all' || activeTab === 'rad') && (
          <RadiologyCard
            radiologyOrders={radiologyOrders}
            onChangeOrders={setRadiologyOrders}
            radiologyCatalog={radiologyCatalog}
            onAddRadiologyToCatalog={onAddRadiologyToCatalog}
          />
        )}

        {/* 5. Clinical Diagnoses Card */}
        {(activeTab === 'all' || activeTab === 'diag') && (
          <DiagnosisCard
            diagnoses={patientDiagnoses}
            onChangeDiagnoses={setPatientDiagnoses}
            diagnosesCatalog={diagnosesCatalog}
            onAddDiagnosisToCatalog={onAddDiagnosisToCatalog}
          />
        )}

        {/* 6. Medications & Prescription Rx Card */}
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

        {/* 8. Completed Examination Summary & Action Card (At the Bottom) */}
        {isExamFinished && (
          <div
            id="finished-exam-summary"
            className="bg-white dark:bg-[#111A2E] p-5 sm:p-7 rounded-3xl border-2 border-emerald-500/50 shadow-xl space-y-6 animate-in fade-in slide-in-from-bottom-6"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-2xl">verified</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    تم اعتماد وإنهاء الكشف الطبي بنجاح
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-[#859394]">
                    المريض: {patient?.name || 'مريض غير محدد'} • #{patient?.fileNumber || '-'} • الطبيب المعالج: د. حازم سولي
                  </p>
                </div>
              </div>

              <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold text-xs border border-emerald-500/20">
                حالة الزيارة: مكتملة ✓
              </span>
            </div>

            {/* Quick Summary Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#080e1b] border border-slate-200 dark:border-white/5 space-y-1">
                <span className="text-[11px] font-bold text-slate-500 dark:text-[#859394] block">
                  التشخيص المعتمد:
                </span>
                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  {patientDiagnoses.find((d) => d.isPrimary)?.nameAr || patientDiagnoses[0]?.nameAr || 'كشف واستشارة'}
                </p>
                {complaint && (
                  <p className="text-[11px] text-slate-500 dark:text-[#859394] line-clamp-1">
                    الشكوى: {complaint}
                  </p>
                )}
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#080e1b] border border-slate-200 dark:border-white/5 space-y-1">
                <span className="text-[11px] font-bold text-slate-500 dark:text-[#859394] block">
                  الأدوية الموصوفة ({activePrescription.length}):
                </span>
                <p className="text-xs text-slate-900 dark:text-white truncate">
                  {activePrescription.length > 0
                    ? activePrescription.map((m) => m.drugName).join('، ')
                    : 'لم تُحرر أدوية'}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#080e1b] border border-slate-200 dark:border-white/5 space-y-1">
                <span className="text-[11px] font-bold text-slate-500 dark:text-[#859394] block">
                  الفحوصات والاستشارة القادمة:
                </span>
                <p className="text-xs text-slate-700 dark:text-[#dde2f5]">
                  التحاليل: {labOrders.length > 0 ? labOrders.map((l) => l.testName).join('، ') : 'لا يوجد'}
                </p>
                <p className="text-xs text-slate-700 dark:text-[#dde2f5]">
                  الأشعة: {radiologyOrders.length > 0 ? radiologyOrders.map((r) => r.name).join('، ') : 'لا يوجد'}
                </p>
                {followupDate && (
                  <p className="text-xs font-bold text-amber-600 dark:text-amber-400">
                    موعد الاستشارة القادمة: {followupDate}
                  </p>
                )}
              </div>
            </div>

            {/* Bottom buttons inside the completed card */}
            <div className="pt-4 border-t border-slate-100 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs text-slate-500 dark:text-[#859394]">
                تم حفظ بيانات الزيارة وتحديث رصيد العيادة وقائمة الانتظار بنجاح.
              </span>
              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setShowWhatsAppModal(true)}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
                >
                  <span className="material-symbols-outlined text-base">chat</span>
                  <span>واتساب الروشتة</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPrintModal(true)}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
                >
                  <span className="material-symbols-outlined text-base">print</span>
                  <span>طباعة الروشتة</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('waiting-queue')}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#00c2cb] hover:bg-[#45dee7] text-slate-950 text-xs font-bold transition-all cursor-pointer shadow-md"
                >
                  <span className="material-symbols-outlined text-base">arrow_forward</span>
                  <span>الانتقال للمريض التالي</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#080e1b]/95 backdrop-blur-md border-t border-slate-200 dark:border-white/10 p-3 sm:p-4 shadow-2xl">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-right w-full sm:w-auto">
            <span className="text-xs font-bold text-slate-800 dark:text-[#dde2f5] shrink-0">
              {isExamFinished ? '✅ الكشف مكتمل ومعتمد:' : 'جلسة الكشف الحالية:'}
            </span>
            <span className="text-xs text-slate-500 dark:text-[#859394] truncate">
              {patient?.name || 'كشف حر'} • {patientDiagnoses.find((d) => d.isPrimary)?.nameAr || 'في انتظار اختيار التشخيص'}
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap sm:flex-nowrap">
            {/* WhatsApp Button on bottom bar */}
            <button
              type="button"
              onClick={() => {
                if (!patient) {
                  alert('يرجى ربط الكشف ببيانات مريض أولاً لإرسال الروشتة عبر الواتساب.');
                  return;
                }
                setShowWhatsAppModal(true);
              }}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
              title="إرسال الروشتة للمريض عبر واتساب"
            >
              <span className="material-symbols-outlined text-base">chat</span>
              <span>واتساب الروشتة</span>
            </button>

            {/* Print Button on bottom bar */}
            <button
              type="button"
              onClick={() => setShowPrintModal(true)}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
              title="طباعة الروشتة المعتمدة"
            >
              <span className="material-symbols-outlined text-base">print</span>
              <span>طباعة الروشتة</span>
            </button>

            {/* Prescription Pad Button */}
            <button
              type="button"
              onClick={() => onNavigate('prescription-pad')}
              className="hidden md:flex items-center justify-center px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-[#18233C] text-slate-700 dark:text-[#dde2f5] hover:bg-slate-200 dark:hover:bg-[#242a38] text-xs font-bold transition-all cursor-pointer border border-slate-200 dark:border-white/5"
            >
              معاينة الروشتة
            </button>

            {/* Finish or Next Patient Button */}
            {isExamFinished ? (
              <button
                type="button"
                onClick={() => onNavigate('waiting-queue')}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#00c2cb] hover:bg-[#45dee7] text-slate-950 text-xs font-bold shadow-md shadow-[#00c2cb]/20 transition-all cursor-pointer active:scale-95"
              >
                <span className="material-symbols-outlined text-base">arrow_forward</span>
                <span>المريض التالي (الانتظار)</span>
              </button>
            ) : (
              <PermissionGate permission="clinical.complete">
                <button
                  type="button"
                  onClick={handleFinish}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#00c2cb] hover:bg-[#45dee7] text-slate-950 text-xs font-bold shadow-md shadow-[#00c2cb]/20 transition-all cursor-pointer active:scale-95"
                >
                  <span className="material-symbols-outlined text-base">task_alt</span>
                  <span>إنهاء الكشف وحفظ الزيارة</span>
                </button>
              </PermissionGate>
            )}
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111A2E] border border-emerald-500/30 rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-500 mx-auto flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl">check_circle</span>
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                تم حفظ الزيارة بكتالوج الملف الطبي!
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#859394]">
                تم إنهاء جلسة الكشف بنجاح، وتحديث ملف المريض ({patient?.name || 'كشف حر'}) وتحويل الحالة إلى مكتملة.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Modal */}
      {showWhatsAppModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-white/10 rounded-3xl p-5 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-500 text-xl">chat</span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">إرسال الروشتة عبر الواتساب</h3>
              </div>
              <button
                onClick={() => setShowWhatsAppModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-[#bbc9ca] leading-relaxed">
              سيتم فتح رابط واتساب مباشر لإرسال ملخص الروشتة والتعليمات والتحاليل المطلوبة للمريض <strong>{patient?.name || 'مريض'}</strong> على الرقم <strong>{patient?.phone || 'غير مسجل'}</strong>.
            </p>

            <div className="bg-slate-50 dark:bg-[#080e1b] p-3 rounded-xl border border-slate-200 dark:border-white/5 text-xs text-slate-700 dark:text-[#dde2f5] max-h-40 overflow-y-auto whitespace-pre-wrap font-mono">
              {generateWhatsAppMessage()}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleCopyWhatsApp}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-[#18233C] text-slate-700 dark:text-[#dde2f5] hover:bg-slate-200 text-xs font-bold transition-all cursor-pointer border border-slate-200 dark:border-white/5"
              >
                {copiedWhatsAppText ? 'تم النسخ!' : 'نسخ النص'}
              </button>

              <a
                href={getCleanPatientWhatsAppUrl()}
                target="_blank"
                rel="noreferrer"
                onClick={() => setShowWhatsAppModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-center text-xs font-bold shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>فتح الواتساب</span>
                <span className="material-symbols-outlined text-base">open_in_new</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Print Modal */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-white/10 rounded-3xl p-5 max-w-sm w-full text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-teal-50 dark:bg-[#00c2cb]/15 text-[#008f97] dark:text-[#00c2cb] mx-auto flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl">print</span>
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">طباعة الروشتة المعتمدة</h3>
              <p className="text-xs text-slate-500 dark:text-[#859394]">
                سيتم تحويلك لنموذج المعاينة والطباعة المباشرة مع الترويسة الطبية المسجلة.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPrintModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-[#18233C] text-slate-700 dark:text-[#dde2f5] text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowPrintModal(false);
                  onNavigate('prescription-pad');
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#00c2cb] hover:bg-[#45dee7] text-slate-950 text-xs font-bold shadow-md"
              >
                الانتقال للطباعة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

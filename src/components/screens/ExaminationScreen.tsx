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
  QueueItem,
} from '../../types';
import { VitalsCard } from '../examination/VitalsCard';
import { RadiologyCard } from '../examination/RadiologyCard';
import { LabCard } from '../examination/LabCard';
import { DiagnosisCard, PatientDiagnosis } from '../examination/DiagnosisCard';
import { MedicationsCard } from '../examination/MedicationsCard';
import { FollowupCard } from '../examination/FollowupCard';
import { PreviousVisitCard } from '../examination/PreviousVisitCard';
import {
  Visit,
  Prescription,
  LabOrder,
  RadiologyOrder,
} from '../../types/database';
import { usePermissions } from '../../context/AuthContext';
import { PermissionGate } from '../auth/PermissionGate';
import {
  loadExamDisplaySettings,
  ExamDisplaySettings,
} from '../../utils/examDisplaySettings';
import {
  RecurringRxTemplate,
  loadRecurringTemplates,
  addOrUpdateRecurringTemplate,
  INITIAL_CLINICAL_GUIDES_TEMPLATES,
} from '../../utils/recurringTemplatesManager';

interface ChronicItem {
  id: string;
  name: string;
  category: string;
  color: string;
}

interface ExaminationScreenProps {
  patient?: PatientListItem | null;
  availablePatients?: PatientListItem[];
  onSelectPatient?: (patient: PatientListItem | null) => void;
  queue?: QueueItem[];
  presetChronicConditions?: ChronicItem[];
  onNavigate: (screen: ScreenType) => void;
  onFinishExam: (data: {
    prescriptionItems: PrescriptionItem[];
    labOrders: LabOrderItem[];
    radiologyOrders: RadiologyOrderItem[];
    diagnoses: PatientDiagnosis[];
    followupDate: string;
    lifestyleAdvice: string;
  }) => void;

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

  // Visit history and records
  visits?: Visit[];
  prescriptions?: Prescription[];
  allLabOrders?: LabOrder[];
  allRadiologyOrders?: RadiologyOrder[];
  currentVisitId?: string;
}

export const ExaminationScreen: React.FC<ExaminationScreenProps> = ({
  patient = null,
  availablePatients = [],
  onSelectPatient = (_patient: PatientListItem | null) => {},
  queue = [],
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
  visits = [],
  prescriptions = [],
  allLabOrders = [],
  allRadiologyOrders = [],
  currentVisitId,
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
  const [isEditingIntakeCard, setIsEditingIntakeCard] = useState(false);
  const [doctorSymptomInput, setDoctorSymptomInput] = useState('');

  // Editable Patient Details
  const [editablePatientName, setEditablePatientName] = useState(patient?.name || '');
  const [editablePatientPhone, setEditablePatientPhone] = useState(patient?.phone || '');
  const [editablePatientAge, setEditablePatientAge] = useState(patient?.age ? String(patient.age) : '');
  const [editablePatientGender, setEditablePatientGender] = useState<'male' | 'female' | ''>(patient?.gender || 'male');
  const [editablePatientAddress, setEditablePatientAddress] = useState(patient?.address || '');
  const [editablePatientBloodType, setEditablePatientBloodType] = useState(patient?.bloodType || 'غير محدد');
  const [isEditingPatientInfo, setIsEditingPatientInfo] = useState(false);
  const [customSymptomInput, setCustomSymptomInput] = useState('');
  const [selectedPatientIdForOpen, setSelectedPatientIdForOpen] = useState<string>('');

  const handleOpenExamForQueuePatient = (item: QueueItem) => {
    const matched = availablePatients.find((p) => p.id === item.id || p.name === item.patientName);
    if (matched) {
      if (onSelectPatient) onSelectPatient(matched);
    } else {
      const fallback: PatientListItem = {
        id: item.id,
        name: item.patientName,
        medicalCode: item.medicalCode || 'EG-NEW',
        fileNumber: item.fileNumber || 1,
        phone: item.phone || '',
        age: item.age || 38,
        gender: 'male',
        governorate: 'القاهرة',
        allergies: [],
        chronicConditions: item.chronicConditions || [],
        bloodGroup: item.bloodType || 'O+',
        visitsCount: 1,
        chiefComplaint: item.complaint || '',
        intakeSymptoms: item.complaint ? [item.complaint] : [],
        lastDiagnosis: '',
      };
      if (onSelectPatient) onSelectPatient(fallback);
    }
  };

  // Keep in sync if patient prop changes
  useEffect(() => {
    setComplaint(patient?.chiefComplaint || '');
    setPatientChronicConditions(patient?.chronicConditions || []);
    setEditablePatientName(patient?.name || '');
    setEditablePatientPhone(patient?.phone || '');
    setEditablePatientAge(patient?.age ? String(patient.age) : '');
    setEditablePatientGender(patient?.gender || 'male');
    setEditablePatientAddress(patient?.address || '');
    setEditablePatientBloodType(patient?.bloodType || 'غير محدد');
  }, [patient?.id, patient?.chiefComplaint, patient?.chronicConditions, patient?.name, patient?.phone, patient?.age, patient?.gender, patient?.address, patient?.bloodType]);

  // Derive previous visit details for the current patient
  const {
    hasPreviousVisit,
    previousVisit,
    previousPrescription,
    previousLabOrders,
    previousRadiologyOrders,
    totalVisitsCount,
  } = React.useMemo(() => {
    if (!patient) {
      return {
        hasPreviousVisit: false,
        previousVisit: null,
        previousPrescription: null,
        previousLabOrders: [] as LabOrder[],
        previousRadiologyOrders: [] as RadiologyOrder[],
        totalVisitsCount: 0,
      };
    }

    const patientVisits = (visits || []).filter((v) => v.patientId === patient.id);

    // Past visits: COMPLETED visits, or visits with different ID than currentVisitId and not in-progress/waiting
    const pastVisits = patientVisits
      .filter((v) => {
        if (currentVisitId && v.visitId === currentVisitId) return false;
        return (
          v.status === 'COMPLETED' ||
          v.visitId.includes('prev') ||
          (v.status !== 'IN_PROGRESS' && v.status !== 'WAITING')
        );
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Find the latest past visit that ACTUALLY has a registered prescription
    let latestVisitWithRx: Visit | null = null;
    let registeredRx: Prescription | null = null;

    for (const v of pastVisits) {
      const rx = (prescriptions || []).find((p) => p.visitId === v.visitId);
      if (rx && rx.items && rx.items.length > 0) {
        latestVisitWithRx = v;
        registeredRx = rx;
        break;
      }
    }

    // Special check for mock pat-1 previous visit if present in canonical records
    if (!latestVisitWithRx && patient.id === 'pat-1') {
      const rx = (prescriptions || []).find((p) => p.visitId === 'vis-prev-101');
      if (rx && rx.items && rx.items.length > 0) {
        const mockPrev = (visits || []).find((v) => v.visitId === 'vis-prev-101');
        if (mockPrev) {
          latestVisitWithRx = mockPrev;
          registeredRx = rx;
        }
      }
    }

    // STRICT RULE: Only show the previous visit card if there is a previous visit AND a registered prescription
    if (!latestVisitWithRx || !registeredRx) {
      return {
        hasPreviousVisit: false,
        previousVisit: null,
        previousPrescription: null,
        previousLabOrders: [] as LabOrder[],
        previousRadiologyOrders: [] as RadiologyOrder[],
        totalVisitsCount: pastVisits.length,
      };
    }

    const labs = (allLabOrders || []).filter((l) => l.visitId === latestVisitWithRx!.visitId);
    const rads = (allRadiologyOrders || []).filter((r) => r.visitId === latestVisitWithRx!.visitId);

    const totalCount = Math.max(1, pastVisits.length > 0 ? pastVisits.length : patient.visitsCount || 1);

    return {
      hasPreviousVisit: true,
      previousVisit: latestVisitWithRx,
      previousPrescription: registeredRx,
      previousLabOrders: labs,
      previousRadiologyOrders: rads,
      totalVisitsCount: totalCount,
    };
  }, [patient, visits, prescriptions, allLabOrders, allRadiologyOrders, currentVisitId]);

  // Recurring Prescription Templates State
  const [recurringTemplates, setRecurringTemplates] = useState<RecurringRxTemplate[]>(loadRecurringTemplates);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Save as recurring template modal state
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [templateTitleInput, setTemplateTitleInput] = useState('');
  const [templateCategoryInput, setTemplateCategoryInput] = useState('باطنة عامة');
  const [showClinicalGuidesPicker, setShowClinicalGuidesPicker] = useState(false);

  // Sync templates list if updated elsewhere (e.g. settings screen template deletion)
  useEffect(() => {
    const handleSyncTemplates = () => {
      setRecurringTemplates(loadRecurringTemplates());
    };
    window.addEventListener('soli_templates_updated', handleSyncTemplates);
    return () => {
      window.removeEventListener('soli_templates_updated', handleSyncTemplates);
    };
  }, []);

  const handleApplyRecurringTemplate = (templateId: string) => {
    const tmpl = recurringTemplates.find((t) => t.id === templateId);
    if (!tmpl) return;
    if (tmpl.diagnoses && tmpl.diagnoses.length > 0) {
      setPatientDiagnoses(tmpl.diagnoses.map((d) => ({
        id: d.id || `diag-${Date.now()}`,
        code: d.code,
        nameAr: d.nameAr,
        nameEn: d.nameEn,
        isPrimary: d.isPrimary ?? true,
      })));
    }
    if (tmpl.prescription && tmpl.prescription.length > 0) {
      onChangeActivePrescription(tmpl.prescription);
    }
    if (tmpl.lifestyleAdvice) {
      setLifestyleAdvice(tmpl.lifestyleAdvice);
    }
    setSelectedTemplateId(templateId);
    setToastMessage(`تم استدعاء القالب "${tmpl.title}" وتعبئة الأدوية والتشخيص بنجاح ✓`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSaveCurrentAsRecurringTemplate = () => {
    if (patientDiagnoses.length === 0 && activePrescription.length === 0) {
      setToastMessage('يرجى إضافة تشخيص أو أدوية على الأقل قبل حفظ القائمة المتكررة.');
      setTimeout(() => setToastMessage(null), 3500);
      return;
    }
    const primaryDiag = patientDiagnoses.find((d) => d.isPrimary)?.nameAr || patientDiagnoses[0]?.nameAr;
    const defaultName = primaryDiag ? `روشتة ${primaryDiag}` : 'روشتة كشف واستشارة';
    setTemplateTitleInput(defaultName);
    setTemplateCategoryInput('باطنة عامة');
    setShowSaveTemplateModal(true);
  };

  const handleConfirmSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateTitleInput.trim()) return;

    const newTemplate: RecurringRxTemplate = {
      id: `tmpl-${Date.now()}`,
      title: templateTitleInput.trim(),
      category: templateCategoryInput.trim() || 'باطنة عامة',
      diagnoses: [...patientDiagnoses],
      prescription: [...activePrescription],
      lifestyleAdvice: lifestyleAdvice || '',
      isFavorite: true,
    };

    const updated = addOrUpdateRecurringTemplate(newTemplate);
    setRecurringTemplates(updated);
    setSelectedTemplateId(newTemplate.id);
    setShowSaveTemplateModal(false);
    setToastMessage(`تم حفظ القائمة المتكررة "${templateTitleInput.trim()}" بنجاح! يمكنك استدعاؤها في أي كشف قادم.`);
    setTimeout(() => setToastMessage(null), 4500);
  };

  const handleImportClinicalGuideDirectly = (guide: RecurringRxTemplate) => {
    if (guide.diagnoses && guide.diagnoses.length > 0) {
      setPatientDiagnoses(guide.diagnoses.map((d) => ({
        id: d.id || `diag-${Date.now()}`,
        code: d.code,
        nameAr: d.nameAr,
        nameEn: d.nameEn,
        isPrimary: d.isPrimary ?? true,
      })));
    }
    if (guide.prescription && guide.prescription.length > 0) {
      onChangeActivePrescription(guide.prescription);
    }
    if (guide.lifestyleAdvice) {
      setLifestyleAdvice(guide.lifestyleAdvice);
    }
    setShowClinicalGuidesPicker(false);
    setToastMessage(`تم استدعاء "${guide.title}" وتطبيقه على الروشتة الحالية بنجاح ✓`);
    setTimeout(() => setToastMessage(null), 4000);
  };

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
    const todayStr = new Date().toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const diagnosisList = patientDiagnoses.length > 0
      ? patientDiagnoses.map((d) => d.nameAr).join('، ')
      : 'فحص واستشارة باطنة';

    let medsSection = '';
    if (activePrescription.length > 0) {
      const medsList = activePrescription
        .map(
          (item, idx) =>
            `  ${idx + 1}. *${item.drugName}* ${item.dosageForm ? `(${item.dosageForm})` : ''}\n     • الجرعة والمدة: ${item.dosage || 'قرص'}${item.timing ? ` — ${item.timing}` : ''}${item.duration ? ` — ${item.duration}` : ''}${item.notes ? ` (${item.notes})` : ''}`
        )
        .join('\n');
      medsSection = `\n\n💊 *الأدوية الموصوفة:*\n${medsList}`;
    }

    let labsSection = '';
    if (labOrders.length > 0) {
      const labsListStr = labOrders
        .map((l, idx) => `  ${idx + 1}. *${l.testName}*`)
        .join('\n');
      labsSection = `\n\n🧪 *الفحوصات والتحاليل المعملية المطلوبة:*\n${labsListStr}`;
    }

    let radsSection = '';
    if (radiologyOrders.length > 0) {
      const radsListStr = radiologyOrders
        .map((r, idx) => `  ${idx + 1}. *${r.name}*`)
        .join('\n');
      radsSection = `\n\n🩻 *الأشعة والموجات الصوتية المطلوبة:*\n${radsListStr}`;
    }

    let adviceSection = '';
    if (lifestyleAdvice) {
      adviceSection = `\n\n📝 *تعليمات وإرشادات الطبيب:*\n${lifestyleAdvice}`;
    }

    let followUpSection = '';
    if (followupDate) {
      try {
        const formattedFollowUp = new Date(followupDate).toLocaleDateString('ar-EG', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
        followUpSection = `\n\n🗓 *موعد المتابعة الاستشارية القادمة:* ${formattedFollowUp}`;
      } catch {
        followUpSection = `\n\n🗓 *موعد المتابعة الاستشارية القادمة:* ${followupDate}`;
      }
    }

    return `مرحباً بك أستاذ/ة *${patient?.name || 'مريض'}* 🌸
إليك تفاصيل وتقارير زيارتكم الطبية لدى *عيادة د. حازم القاضي* 🩺

🗓 *تاريخ الزيارة:* ${todayStr}
📋 *التشخيص الإكلينيكي:* ${diagnosisList}${medsSection}${labsSection}${radsSection}${adviceSection}${followUpSection}

📍 *العنوان:* عيادة الباطنة التخصصية - المهندسين
📞 *للتأكيد والاستفسار:* 01092847162
مع تمنياتنا لكم بتمام الشفاء ودوام الصحة والعافية ✨`;
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

  const handleSavePatientInfo = async () => {
    if (!patient) return;
    try {
      const birthYear = new Date().getFullYear() - (parseInt(editablePatientAge, 10) || 30);
      const dob = `${birthYear}-01-01`;
      
      const updatedData = {
        fullName: editablePatientName.trim(),
        phone: editablePatientPhone.trim(),
        dateOfBirth: dob,
        gender: editablePatientGender === 'female' ? 'female' : 'male',
        address: editablePatientAddress.trim(),
        bloodType: editablePatientBloodType,
        updatedAt: new Date().toISOString(),
      };

      // 1. Update Firestore
      const { db } = await import('../../services/firebase');
      const { doc, updateDoc } = await import('firebase/firestore');
      if (db) {
        const patientRef = doc(db, 'patients', patient.id);
        await updateDoc(patientRef, updatedData);
        console.log('Patient basic details successfully updated in Firestore!');
      }

      // 2. Propagate to App state
      onSelectPatient({
        ...patient,
        name: editablePatientName.trim(),
        phone: editablePatientPhone.trim(),
        age: parseInt(editablePatientAge, 10) || 30,
        gender: editablePatientGender === 'female' ? 'female' : 'male',
        address: editablePatientAddress.trim(),
        bloodType: editablePatientBloodType,
        bloodGroup: editablePatientBloodType,
      });

      setIsEditingPatientInfo(false);
    } catch (err) {
      console.error('Error updating patient basic details:', err);
      alert('حدث خطأ أثناء حفظ التعديلات.');
    }
  };

  const handleSaveIntakeAndChronic = async () => {
    if (!patient) return;
    try {
      const updatedData = {
        chiefComplaint: complaint.trim(),
        chronicDiseases: patientChronicConditions,
        updatedAt: new Date().toISOString(),
      };

      // 1. Update Firestore
      const { db } = await import('../../services/firebase');
      const { doc, updateDoc } = await import('firebase/firestore');
      if (db) {
        const patientRef = doc(db, 'patients', patient.id);
        await updateDoc(patientRef, updatedData);
        console.log('Patient chief complaint and chronic conditions updated in Firestore!');
      }

      // 2. Propagate to App state
      onSelectPatient({
        ...patient,
        chiefComplaint: complaint.trim(),
        chronicConditions: patientChronicConditions,
      });

      setIsEditingIntakeCard(false);
    } catch (err) {
      console.error('Error updating patient intake/chronic:', err);
      alert('حدث خطأ أثناء حفظ التعديلات.');
    }
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
      onFinishExam({
        prescriptionItems: activePrescription,
        labOrders,
        radiologyOrders,
        diagnoses: patientDiagnoses,
        followupDate,
        lifestyleAdvice,
      });
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

  // 1. If no patient exam is opened yet, display the dedicated waiting / browse view
  if (!patient) {
    return (
      <div className="flex flex-col w-full max-w-full overflow-x-hidden pb-28 space-y-6 text-slate-800 dark:text-[#dde2f5]">
        {/* Top Header */}
        <div className="bg-white dark:bg-[#111A2E] p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-white/5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-teal-50 dark:bg-[#00c2cb]/15 text-[#008f97] dark:text-[#00c2cb] flex items-center justify-center shrink-0 shadow-xs">
              <span className="material-symbols-outlined text-3xl">stethoscope</span>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                  غرفة الكشف الطبي
                </h1>
                <span className="px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40 text-xs font-bold">
                  بانتظار فتح الكشف
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-[#859394] mt-1.5 leading-relaxed">
                لا تظهر بيانات المريض أو تفاصيل الزيارات السابقة إلا عند الضغط على «فتح الكشف». اختر مريضاً لبدء الجلسة.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => onNavigate('new-visit')}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 text-[#008f97] dark:text-[#45dee7] text-xs sm:text-sm font-bold border border-teal-200 dark:border-teal-800/40 cursor-pointer transition-all"
            >
              <span className="material-symbols-outlined text-lg">person_add</span>
              <span>+ تسجيل مريض جديد</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('waiting-queue')}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#00c2cb] hover:bg-[#45dee7] text-slate-950 text-xs sm:text-sm font-bold shadow-md cursor-pointer transition-all"
            >
              <span className="material-symbols-outlined text-lg">groups</span>
              <span>قائمة الانتظار ({queue?.length || 0})</span>
            </button>
          </div>
        </div>

        {/* Patients in Waiting Queue (Ready for Exam) */}
        {queue && queue.length > 0 && (
          <div className="bg-white dark:bg-[#111A2E] p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-white/5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#008f97] dark:text-[#00c2cb] text-xl">timer</span>
                <h2 className="text-base font-bold text-slate-900 dark:text-[#dde2f5]">
                  مرضى في صالة الانتظار (جاهزون للكشف)
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-teal-100 dark:bg-[#00c2cb]/20 text-[#008f97] dark:text-[#45dee7] text-xs font-bold font-mono">
                  {queue.length}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {queue.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-white/10 hover:border-[#00c2cb] dark:hover:border-[#00c2cb] bg-slate-50/60 dark:bg-white/5 transition-all flex flex-col justify-between gap-3 group"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-teal-50 dark:bg-[#00c2cb]/15 text-[#008f97] dark:text-[#45dee7]">
                        تذكرة #{item.ticketNumber}
                      </span>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                        {item.arrivalTime}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-2">
                      {item.patientName}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-[#859394] line-clamp-1 mt-1">
                      {item.complaint || 'كشف عيادة'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenExamForQueuePatient(item)}
                    className="w-full py-2.5 px-3 rounded-xl bg-[#00c2cb] hover:bg-[#45dee7] text-slate-950 font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95"
                  >
                    <span className="material-symbols-outlined text-base">stethoscope</span>
                    <span>فتح الكشف</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Select registered patient to open exam */}
        <div className="bg-white dark:bg-[#111A2E] p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-white/5 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#008f97] dark:text-[#00c2cb] text-xl">person_search</span>
            <h2 className="text-base font-bold text-slate-900 dark:text-[#dde2f5]">
              اختيار مريض من السجلات الطبية لفتح الكشف
            </h2>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <select
              value={selectedPatientIdForOpen}
              onChange={(e) => setSelectedPatientIdForOpen(e.target.value)}
              className="w-full sm:flex-1 bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs sm:text-sm px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-[#00c2cb] cursor-pointer"
            >
              <option value="">-- اختر مريضاً لفتح كشفه الطبي --</option>
              {availablePatients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.phone ? `${p.phone} • ` : ''}ملف #{p.fileNumber || p.medicalCode})
                </option>
              ))}
            </select>

            <button
              type="button"
              disabled={!selectedPatientIdForOpen}
              onClick={() => {
                const matched = availablePatients.find((p) => p.id === selectedPatientIdForOpen);
                if (matched && onSelectPatient) {
                  onSelectPatient(matched);
                }
              }}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#00c2cb] hover:bg-[#45dee7] disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold text-xs sm:text-sm shadow-md cursor-pointer transition-all flex items-center justify-center gap-2 shrink-0"
            >
              <span className="material-symbols-outlined text-lg">stethoscope</span>
              <span>فتح الكشف</span>
            </button>
          </div>
        </div>

        {/* Privacy Note */}
        <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-800 dark:text-teal-300 text-xs flex items-center gap-3">
          <span className="material-symbols-outlined text-lg shrink-0">info</span>
          <span>
            تنبيه خصوصية: لا يتم عرض بيانات المريض أو بطاقة الزيارة السابقة إلا بعد الضغط على «فتح الكشف» رسمياً.
          </span>
        </div>
      </div>
    );
  }

  // 2. Patient Exam is Open: Render Patient Details + Standalone Previous Visit Card + Clinical Examination
  return (
    <div className="flex flex-col w-full max-w-full overflow-x-hidden pb-28 space-y-6 text-slate-800 dark:text-[#dde2f5]">
      {/* 1. Basic Patient Details Card (Completely separate from previous visit) */}
      <div className="bg-white dark:bg-[#111A2E] p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-white/5 shadow-xs space-y-4">
        <div className="flex flex-col gap-4">
          {/* Patient Details Header */}
          <div className="flex items-start justify-between gap-3 min-w-0">
            <div className="flex items-start gap-3.5 min-w-0 flex-1">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-[#00c2cb]/15 text-[#008f97] dark:text-[#00c2cb] flex items-center justify-center font-bold text-lg shadow-xs shrink-0">
                {(editablePatientName || patient.name || 'م').charAt(0)}
              </div>

              <div className="min-w-0 flex-1">
                {!isEditingPatientInfo ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-[#dde2f5] truncate">
                      {editablePatientName}
                    </h1>
                    <span className="px-2 py-0.5 rounded-full bg-teal-100 dark:bg-[#00c2cb]/20 text-[#008f97] dark:text-[#45dee7] text-[11px] font-bold">
                      ملف رقم: #{patient.fileNumber || 1}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-[#bbc9ca] text-[11px] font-mono">
                      {patient.medicalCode}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-[#859394]">
                      {editablePatientAge} سنة • {patient.gender === 'female' ? 'أنثى' : 'ذكر'} • فصيلة الدم: <strong className="text-[#008f97] dark:text-[#00c2cb] font-mono font-bold">{patient.bloodType || 'غير محدد'}</strong> • العنوان: <strong className="text-slate-700 dark:text-[#dde2f5]">{patient.address || 'غير محدد'}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsEditingPatientInfo(true)}
                      className="text-[11px] text-[#008f97] dark:text-[#00c2cb] hover:underline font-bold px-1"
                      title="تعديل اسم أو سن أو هاتف المريض"
                    >
                      [تعديل البيانات الأساسية]
                    </button>
                  </div>
                ) : (
                  <div className="bg-white dark:bg-[#111A2E] p-4 sm:p-6 rounded-2xl shadow-md border-2 border-[#00c2cb] flex flex-col gap-4 w-full text-right mt-2 animate-in fade-in">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#008f97] dark:text-[#00c2cb] text-xl">badge</span>
                        <span className="text-sm font-bold text-slate-900 dark:text-[#dde2f5]">1. البيانات الشخصية والتعريفية</span>
                      </div>
                      <span className="text-xs bg-teal-50 dark:bg-[#00c2cb]/20 text-[#008f97] dark:text-[#45dee7] font-bold px-3 py-1 rounded-full border border-[#00c2cb]/30">
                        تعديل بيانات مريض مسجل
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Full Name */}
                      <div className="flex flex-col gap-1.5 sm:col-span-2">
                        <label className="text-xs font-bold text-slate-800 dark:text-[#dde2f5]">
                          اسم المريض <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={editablePatientName}
                          onChange={(e) => setEditablePatientName(e.target.value)}
                          placeholder="أدخل اسم المريض..."
                          className="bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] placeholder:text-slate-400 dark:placeholder:text-[#859394] text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-[#00c2cb]"
                        />
                      </div>

                      {/* Phone */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-800 dark:text-[#dde2f5]">رقم الهاتف / الواتساب</label>
                        <input
                          type="tel"
                          value={editablePatientPhone}
                          onChange={(e) => setEditablePatientPhone(e.target.value)}
                          placeholder="01xxxxxxxxx"
                          className="bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] placeholder:text-slate-400 dark:placeholder:text-[#859394] text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 font-mono focus:outline-none focus:ring-1 focus:ring-[#00c2cb]"
                        />
                      </div>

                      {/* Age */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-800 dark:text-[#dde2f5]">السن (بالسنوات)</label>
                        <input
                          type="number"
                          value={editablePatientAge}
                          onChange={(e) => setEditablePatientAge(e.target.value)}
                          placeholder="أدخل السن..."
                          className="bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] placeholder:text-slate-400 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 font-mono focus:outline-none focus:ring-1 focus:ring-[#00c2cb]"
                        />
                      </div>

                      {/* Gender */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-800 dark:text-[#dde2f5]">النوع / الجنس</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setEditablePatientGender('male')}
                            className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                              editablePatientGender === 'male'
                                ? 'bg-teal-50 dark:bg-[#00c2cb]/20 text-[#008f97] dark:text-[#45dee7] border-[#00c2cb] ring-1 ring-[#00c2cb]'
                                : 'bg-slate-50 dark:bg-[#080e1b] text-slate-600 dark:text-[#859394] border-slate-200 dark:border-white/5'
                            }`}
                          >
                            ذكر
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditablePatientGender('female')}
                            className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                              editablePatientGender === 'female'
                                ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-[#d0bcff] border-purple-500 ring-1 ring-purple-500'
                                : 'bg-slate-50 dark:bg-[#080e1b] text-slate-600 dark:text-[#859394] border-slate-200 dark:border-white/5'
                            }`}
                          >
                            أنثى
                          </button>
                        </div>
                      </div>

                      {/* Address */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-800 dark:text-[#dde2f5]">العنوان / محل الإقامة</label>
                        <input
                          type="text"
                          value={editablePatientAddress}
                          onChange={(e) => setEditablePatientAddress(e.target.value)}
                          placeholder="أدخل العنوان بالتفصيل..."
                          className="bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] placeholder:text-slate-400 dark:placeholder:text-[#859394] text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-[#00c2cb]"
                        />
                      </div>

                      {/* Blood Type */}
                      <div className="flex flex-col gap-1.5 sm:col-span-2">
                        <label className="text-xs font-bold text-slate-800 dark:text-[#dde2f5]">فصيلة الدم</label>
                        <select
                          value={editablePatientBloodType}
                          onChange={(e) => setEditablePatientBloodType(e.target.value)}
                          className="bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-[#00c2cb] cursor-pointer"
                        >
                          <option value="غير محدد">غير محدد</option>
                          <option value="O+">O+</option>
                          <option value="O-">O-</option>
                          <option value="A+">A+</option>
                          <option value="A-">A-</option>
                          <option value="B+">B+</option>
                          <option value="B-">B-</option>
                          <option value="AB+">AB+</option>
                          <option value="AB-">AB-</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 mt-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setIsEditingPatientInfo(false)}
                        className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#080e1b] dark:hover:bg-[#111A2E] text-slate-700 dark:text-[#dde2f5] font-bold text-xs cursor-pointer border border-slate-200 dark:border-white/5"
                      >
                        إلغاء
                      </button>
                      <button
                        type="button"
                        onClick={handleSavePatientInfo}
                        className="px-5 py-2.5 rounded-xl bg-[#00c2cb] hover:bg-[#45dee7] text-slate-950 font-bold text-xs cursor-pointer shadow-md"
                      >
                        حفظ التعديلات ✓
                      </button>
                    </div>
                  </div>
                )}

                {/* Badges: Allergies & Chronic Diseases */}
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  {patient.allergies && patient.allergies.length > 0 && (
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-400 text-[11px] font-bold">
                      <span className="material-symbols-outlined text-sm">warning</span>
                      <span>حساسية: {patient.allergies.join('، ')}</span>
                    </div>
                  )}

                  {editablePatientPhone && (
                    <div className="text-[11px] text-slate-500 dark:text-[#859394] flex items-center gap-1 bg-slate-100 dark:bg-white/5 px-2.5 py-1 rounded-lg">
                      <span className="material-symbols-outlined text-xs text-teal-600">call</span>
                      <span className="font-mono">{editablePatientPhone}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Close / Select Another Patient Button */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (onSelectPatient) {
                    onSelectPatient(null as any);
                  }
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                title="إغلاق هذا الكشف والعودة لاختيار مريض"
              >
                <span className="material-symbols-outlined text-sm">close</span>
                <span>إغلاق الكشف / مريض آخر</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Standalone Previous Visit Card (Separated from patient details, ONLY rendered if previous visit exists AND has prescription) */}
      {hasPreviousVisit && previousVisit && previousPrescription && (
        <div className="w-full">
          <PreviousVisitCard
            patient={patient}
            visit={previousVisit}
            totalVisitsCount={totalVisitsCount}
            prescription={previousPrescription}
            labOrders={previousLabOrders}
            radiologyOrders={previousRadiologyOrders}
            onCopyMedications={(meds) => {
              onChangeActivePrescription([...activePrescription, ...meds]);
            }}
          />
        </div>
      )}

      {/* 3. Responsive Section Jump Tabs & Examination Cards */}
      <div className="bg-white dark:bg-[#111A2E] p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-white/5 shadow-xs space-y-4">

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
            الشكوى والأمراض المزمنة
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
        {/* 8. Patient Intake, Complaints & Chronic Conditions Card (Moved to top as requested) */}
        {patient && (
          <div className="bg-white dark:bg-[#111A2E] p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-white/5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-white/5 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#008f97] dark:text-[#00c2cb] text-lg">medical_information</span>
                <span className="text-xs font-bold text-slate-900 dark:text-[#dde2f5]">
                  الشكوى والأعراض والأمراض المزمنة (Intake & Chronic Conditions)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingIntakeCard(!isEditingIntakeCard)}
                className="flex items-center gap-1 px-3 py-1 rounded-xl bg-[#00c2cb] hover:bg-[#45dee7] text-slate-950 text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                <span className="material-symbols-outlined text-sm">edit</span>
                <span>{isEditingIntakeCard ? 'إغلاق التعديل' : 'تعديل الشكوى والأمراض'}</span>
              </button>
            </div>

            {/* View Mode */}
            {!isEditingIntakeCard ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Symptoms & Complaint */}
                <div className="space-y-1.5">
                  <span className="font-bold text-slate-700 dark:text-[#859394] block text-[11px]">
                    الشكوى والأعراض المقدمة:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {complaint ? (
                      complaint.split('•').map((item, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-lg bg-teal-100/70 dark:bg-[#00c2cb]/20 text-[#008f97] dark:text-[#45dee7] font-bold text-[11px] border border-[#00c2cb]/30"
                        >
                          {item.trim()}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-400 italic text-[11px]">لا توجد أعراض مسجلة</span>
                    )}
                  </div>
                </div>

                {/* Chronic Diseases */}
                <div className="space-y-1.5">
                  <span className="font-bold text-slate-700 dark:text-[#859394] block text-[11px]">
                    الأمراض المزمنة للمريض:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {patientChronicConditions.length > 0 ? (
                      patientChronicConditions.map((cond) => (
                        <span
                          key={cond}
                          className="px-2.5 py-1 rounded-lg bg-rose-100/70 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-bold text-[11px] border border-rose-300 dark:border-rose-900/40"
                        >
                          {cond}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-400 italic text-[11px]">لا توجد أمراض مزمنة مسجلة</span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* Edit Mode: Doctor can edit/add using both preset catalogs and custom inputs */
              <div className="flex flex-col gap-6 w-full text-right mt-2 animate-in fade-in">
                {/* Card 2: Symptoms & Complaints */}
                <div className="bg-white dark:bg-[#111A2E] p-4 sm:p-6 rounded-2xl border-2 border-[#00c2cb] flex flex-col gap-4 shadow-sm">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3 gap-1">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#008f97] dark:text-[#00c2cb] text-xl">pulse_alert</span>
                      <span className="text-sm font-bold text-slate-900 dark:text-[#dde2f5]">2. الأعراض والشكوى الرئيسية للمريض</span>
                    </div>
                    <span className="text-xs text-slate-500 dark:text-[#859394]">تظهر شارات منفصلة للطبيب</span>
                  </div>

                  {/* Dropdown for Preconfigured Symptoms */}
                  <div className="flex flex-col gap-1.5 bg-teal-50/60 dark:bg-[#18233C]/60 p-3 rounded-xl border border-[#00c2cb]/20">
                    <label className="text-xs font-bold text-[#008f97] dark:text-[#45dee7]">
                      اختر عرضاً من قائمة الشكاوى المعدة مسبقاً لإضافته كشارة منفصلة:
                    </label>
                    <select
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!val) return;
                        const current = complaint.split('•').map(s => s.trim()).filter(Boolean);
                        if (!current.includes(val)) {
                          const newComplaint = [...current, val].join(' • ');
                          setComplaint(newComplaint);
                        }
                        e.target.value = '';
                      }}
                      className="w-full bg-white dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-[#00c2cb] cursor-pointer"
                    >
                      <option value="">-- اضغط لاختيار عرض/شكوى من القائمة --</option>
                      {(symptomsCatalog || []).filter((s) => Boolean(s && s.name)).map((s) => (
                        <option key={s.id || s.name} value={s.name}>
                          {s.name} ({s.category || 'عرض'})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Selected Symptoms Pills */}
                  {complaint.split('•').map((s) => s.trim()).filter(Boolean).length > 0 && (
                    <div className="flex flex-wrap gap-2 p-2 bg-slate-50 dark:bg-[#080e1b] rounded-xl border border-slate-200 dark:border-white/5">
                      {complaint.split('•').map((s) => s.trim()).filter(Boolean).map((sym, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1.5 rounded-xl bg-teal-100 dark:bg-[#00c2cb]/20 border border-[#00c2cb]/30 text-[#008f97] dark:text-[#45dee7] text-xs font-bold flex items-center gap-2 shadow-2xs"
                        >
                          <span>{sym}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const filtered = complaint
                                .split('•')
                                .map((s) => s.trim())
                                .filter((s, i) => i !== idx && Boolean(s));
                              setComplaint(filtered.join(' • '));
                            }}
                            className="hover:text-red-600 dark:hover:text-rose-400 font-extrabold cursor-pointer text-xs"
                            title="إزالة هذا العرض"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Custom Symptom or Detailed Text */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={doctorSymptomInput}
                      onChange={(e) => setDoctorSymptomInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const val = doctorSymptomInput.trim();
                          if (val) {
                            const current = complaint.split('•').map(s => s.trim()).filter(Boolean);
                            if (!current.includes(val)) {
                              setComplaint([...current, val].join(' • '));
                            }
                            setDoctorSymptomInput('');
                          }
                        }
                      }}
                      placeholder="أدخل عرض آخر غير موجود بالقائمة..."
                      className="flex-1 bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] placeholder:text-slate-400 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const val = doctorSymptomInput.trim();
                        if (val) {
                          const current = complaint.split('•').map(s => s.trim()).filter(Boolean);
                          if (!current.includes(val)) {
                            setComplaint([...current, val].join(' • '));
                          }
                          setDoctorSymptomInput('');
                        }
                      }}
                      className="px-3.5 py-2.5 rounded-xl bg-[#00c2cb] text-slate-950 font-bold text-xs hover:bg-[#45dee7] transition-all cursor-pointer shrink-0"
                    >
                      + إضافة عرض
                    </button>
                  </div>
                </div>

                {/* Card 3: Chronic Diseases */}
                <div className="bg-white dark:bg-[#111A2E] p-4 sm:p-6 rounded-2xl border-2 border-rose-500 flex flex-col gap-4 shadow-sm">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3 gap-2">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-rose-500 text-xl">medical_services</span>
                      <span className="text-sm font-bold text-slate-900 dark:text-[#dde2f5]">3. الأمراض المزمنة للمريض</span>
                    </div>
                  </div>

                  {/* Dropdown Selector for Chronic Diseases */}
                  <div className="flex flex-col gap-1.5 bg-rose-50/60 dark:bg-[#18233C]/60 p-3 rounded-xl border border-rose-500/20">
                    <label className="text-xs font-bold text-rose-700 dark:text-rose-300">
                      اختر مرضاً مزمن من القائمة المنسدلة:
                    </label>
                    <select
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!val) return;
                        if (!patientChronicConditions.includes(val)) {
                          setPatientChronicConditions([...patientChronicConditions, val]);
                        }
                        e.target.value = '';
                      }}
                      className="w-full bg-white dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-[#00c2cb] cursor-pointer"
                    >
                      <option value="">-- اضغط لاختيار مرض مزمن من قائمة الإعدادات --</option>
                      {(presetChronicConditions || []).filter((c) => Boolean(c && c.name)).map((c) => (
                        <option key={c.id || c.name} value={c.name}>
                          {c.name} ({c.category || 'مرض'})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Selected Chronic Chips */}
                  {patientChronicConditions.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {patientChronicConditions.map((item) => (
                        <span
                          key={item}
                          className="px-3 py-1.5 rounded-xl bg-rose-100 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2 shadow-2xs"
                        >
                          <span>{item}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setPatientChronicConditions(patientChronicConditions.filter(c => c !== item));
                            }}
                            className="hover:text-red-900 dark:hover:text-white cursor-pointer font-bold text-xs"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Box for Adding Custom Chronic Condition */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={newChronicInput}
                      onChange={(e) => setNewChronicInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const val = newChronicInput.trim();
                          if (val) {
                            if (!patientChronicConditions.includes(val)) {
                              setPatientChronicConditions([...patientChronicConditions, val]);
                            }
                            setNewChronicInput('');
                          }
                        }
                      }}
                      placeholder="إضافة مرض مزمن جديد غير موجود بالقائمة..."
                      className="flex-1 bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] placeholder:text-slate-400 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const val = newChronicInput.trim();
                        if (val) {
                          if (!patientChronicConditions.includes(val)) {
                            setPatientChronicConditions([...patientChronicConditions, val]);
                          }
                          setNewChronicInput('');
                        }
                      }}
                      className="px-3.5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-all cursor-pointer shrink-0"
                    >
                      + إضافة مرض مزمن
                    </button>
                  </div>
                </div>

                {/* Submit Actions */}
                <div className="flex items-center gap-3 mt-2 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setComplaint(patient?.chiefComplaint || '');
                      setPatientChronicConditions(patient?.chronicConditions || []);
                      setIsEditingIntakeCard(false);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#080e1b] dark:hover:bg-[#111A2E] text-slate-700 dark:text-[#dde2f5] font-bold text-xs cursor-pointer border border-slate-200 dark:border-white/5"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveIntakeAndChronic}
                    className="px-5 py-2.5 rounded-xl bg-[#00c2cb] hover:bg-[#45dee7] text-slate-950 font-bold text-xs cursor-pointer shadow-md"
                  >
                    حفظ التعديلات للشكوى والأمراض ✓
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 1. Vital Signs Card (Conditional on displaySettings.showVitals) */}
        {displaySettings.showVitals && (activeTab === 'all' || activeTab === 'vitals') && (
          <VitalsCard />
        )}

        {/* Quick Prescription Template Selector - Placed below Vital Signs */}
        {patient && (activeTab === 'all' || activeTab === 'vitals' || activeTab === 'rx') && (
          <div className="bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-[#00c2cb]/10 dark:to-[#00c2cb]/5 p-4 rounded-2xl border border-teal-200 dark:border-[#00c2cb]/20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[#008f97] dark:text-[#00c2cb] text-xl shrink-0">bookmark</span>
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-[#dde2f5] block">
                  استدعاء سريع من قوالب الروشتة والأدلة الطبية (Quick Template & Clinical Guides):
                </span>
                <p className="text-[11px] text-slate-500 dark:text-[#859394]">
                  اختر قالباً محفوظاً أو استدعِ بروتوكولاً إكلينيكياً معتمداً لتعبئة الروشتة فوراً
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedTemplateId}
                onChange={(e) => handleApplyRecurringTemplate(e.target.value)}
                className="w-full sm:w-64 bg-white dark:bg-[#111A2E] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/10 font-bold focus:outline-none focus:ring-1 focus:ring-[#00c2cb] cursor-pointer"
              >
                <option value="">-- اختر قالب روشتة متكررة لاستدعائه --</option>
                {recurringTemplates.map((tmpl) => (
                  <option key={tmpl.id} value={tmpl.id}>
                    📋 {tmpl.title} ({tmpl.prescription?.length || 0} أدوية)
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setShowClinicalGuidesPicker(true)}
                className="px-3 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs whitespace-nowrap"
                title="استدعاء مباشر من الأدلة والبروتوكولات الطبية القياسية"
              >
                <span className="material-symbols-outlined text-base">menu_book</span>
                <span>الأدلة الطبية</span>
              </button>
            </div>
          </div>
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

        {/* Save current Rx as Template Bar (حفظ الروشتة الحالية كقالب متكرر) */}
        <div className="bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-[#00c2cb]/10 dark:to-[#00c2cb]/5 p-4 rounded-2xl border border-teal-200 dark:border-[#00c2cb]/20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[#008f97] dark:text-[#00c2cb] text-xl shrink-0">bookmark_add</span>
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-[#dde2f5] block">
                حفظ كروشتة متكررة (Save as Recurring Template):
              </span>
              <p className="text-[11px] text-slate-500 dark:text-[#859394]">
                حفظ الأدوية والتشخيص الحالي كقالب جاهز للاستدعاء السريع لاحقاً
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={handleSaveCurrentAsRecurringTemplate}
              className="px-4 py-2.5 rounded-xl bg-[#00c2cb] hover:bg-[#45dee7] text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs shrink-0"
              title="حفظ التشخيص والأدوية والإرشادات الحالية كقائمة متكررة"
            >
              <span className="material-symbols-outlined text-base">save</span>
              <span>حفظ كقائمة متكررة</span>
            </button>
          </div>
        </div>

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
                  onClick={() => window.print()}
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
              onClick={() => window.print()}
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

      {/* MODAL: Save Recurring Template */}
      {showSaveTemplateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-white/10 rounded-2xl p-5 sm:p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-[#00c2cb] text-xl">bookmark_add</span>
                <span>حفظ كقائمة متكررة للروشتة</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowSaveTemplateModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmSaveTemplate} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 dark:text-[#dde2f5]">
                  اسم القائمة المتكررة *
                </label>
                <input
                  type="text"
                  required
                  value={templateTitleInput}
                  onChange={(e) => setTemplateTitleInput(e.target.value)}
                  placeholder="مثال: بروتوكول جرثومة المعدة، روشتة قولون عصبي..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#18233C] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-bold text-xs focus:outline-none focus:ring-1 focus:ring-[#00c2cb]"
                />
              </div>

              {/* Quick Presets */}
              <div className="space-y-1">
                <span className="text-[11px] text-slate-500 dark:text-[#859394]">اقتراحات سريعة للمسمى:</span>
                <div className="flex flex-wrap gap-1.5">
                  {['روشتة باطنة عامة', 'روشتة ضغط وسكر', 'بروتوكول جرثومة المعدة', 'روشتة قولون عصبي', 'روشتة نزلة معوية'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setTemplateTitleInput(preset)}
                      className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-[10px] font-bold cursor-pointer"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 dark:text-[#dde2f5]">
                  التصنيف الطبي
                </label>
                <select
                  value={templateCategoryInput}
                  onChange={(e) => setTemplateCategoryInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#18233C] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-bold text-xs focus:outline-none cursor-pointer"
                >
                  <option value="باطنة عامة">باطنة عامة</option>
                  <option value="الجهاز الهضمي والكبد">الجهاز الهضمي والكبد</option>
                  <option value="القلب والأوعية الدموية">القلب والأوعية الدموية</option>
                  <option value="الغدد الصماء والسكر">الغدد الصماء والسكر</option>
                  <option value="الجهاز التنفسي">الجهاز التنفسي</option>
                  <option value="المسالك البولية">المسالك البولية</option>
                </select>
              </div>

              {/* Summary of items being saved */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#080e1b] border border-slate-200 dark:border-white/5 space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 font-bold">
                  <span>العناصر التي سيتم حفظها:</span>
                </div>
                <div className="text-slate-500 dark:text-[#859394] space-y-0.5">
                  <p>• التشخيصات: {patientDiagnoses.length > 0 ? patientDiagnoses.map((d) => d.nameAr).join('، ') : 'بدون تشخيص'}</p>
                  <p>• الأدوية ({activePrescription.length}): {activePrescription.map((p) => p.drugName).join(' + ')}</p>
                  {lifestyleAdvice && <p>• الإرشادات: {lifestyleAdvice.slice(0, 60)}...</p>}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setShowSaveTemplateModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#00c2cb] hover:bg-[#45dee7] text-slate-950 font-bold shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-base">save</span>
                  <span>حفظ القائمة</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Direct Clinical Guides Picker in Examination */}
      {showClinicalGuidesPicker && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in overflow-y-auto">
          <div className="bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-white/10 rounded-2xl p-5 sm:p-6 max-w-2xl w-full shadow-2xl space-y-4 my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
              <div>
                <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-purple-600 dark:text-purple-400 text-xl">
                    menu_book
                  </span>
                  <span>الأدلة والبروتوكولات الإكلينيكية القياسية</span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-[#859394] mt-0.5">
                  اختر البروتوكول المطلوب لتطبيقه وتعبئة الروشتة الحالية فوراً
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowClinicalGuidesPicker(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              {INITIAL_CLINICAL_GUIDES_TEMPLATES.map((guide) => (
                <div
                  key={guide.id}
                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#080e1b] border border-slate-200 dark:border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-purple-500/40 transition-all text-xs"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm truncate">
                        {guide.title}
                      </h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-300">
                        {guide.category}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 dark:text-slate-300">
                      <strong>التشخيص:</strong>{' '}
                      {guide.diagnoses.map((d) => d.nameAr).join('، ')}
                    </p>

                    <p className="text-[11px] text-slate-500 dark:text-[#859394]">
                      <strong>الأدوية ({guide.prescription.length}):</strong>{' '}
                      {guide.prescription.map((p) => p.drugName).join(' + ')}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleImportClinicalGuideDirectly(guide)}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-xs"
                  >
                    <span className="material-symbols-outlined text-sm">assignment_turned_in</span>
                    <span>تطبيق على الروشتة</span>
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-white/5">
              <button
                type="button"
                onClick={() => setShowClinicalGuidesPicker(false)}
                className="px-5 py-2 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 cursor-pointer text-xs"
              >
                إغلاق
              </button>
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

      {toastMessage && (
        <div className="fixed bottom-6 right-6 left-6 sm:right-auto sm:left-6 z-50 bg-emerald-600 dark:bg-emerald-500 text-white px-5 py-4 rounded-2xl shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5 duration-300 max-w-md border border-emerald-500/20">
          <span className="material-symbols-outlined text-xl shrink-0">check_circle</span>
          <p className="text-xs font-bold leading-relaxed">{toastMessage}</p>
        </div>
      )}
    </div>
  );
};

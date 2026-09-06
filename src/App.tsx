import React, { useState, useEffect, useMemo } from 'react';
import {
  ScreenType,
  AppointmentListItem,
  QueueItem,
  TransactionRecord,
  PatientListItem,
  RadiologyCatalogItem,
  LabCatalogItem,
  DrugCatalogItem,
  DiagnosisCatalogItem,
  SymptomCatalogItem,
  PrescriptionItem,
} from './types';
import {
  DEFAULT_CHRONIC_CONDITIONS,
} from './data/previewClinicData';
import {
  DEFAULT_RADIOLOGY_CATALOG,
  DEFAULT_LAB_CATALOG,
  DEFAULT_DRUG_CATALOG,
  DEFAULT_DIAGNOSES_CATALOG,
  DEFAULT_SYMPTOMS_CATALOG,
} from './data/previewMedicalCatalogs';
import {
  INITIAL_USERS,
  INITIAL_DOCTOR_PROFILE,
  INITIAL_CLINIC_LOCATIONS,
  INITIAL_SERVICES,
  INITIAL_DOCTOR_SETTINGS as INITIAL_DOCTOR_SETTINGS_CANONICAL,
  INITIAL_SYSTEM_SETTINGS as INITIAL_SYSTEM_SETTINGS_CANONICAL,
} from './data/database';
import type {
  User,
  DoctorProfile,
  ClinicLocation,
  Patient,
  Appointment,
  Visit,
  Invoice,
  Payment,
  ServiceItem,
  FollowUp,
  Prescription,
  Medication,
  LabTest,
  LabOrder,
  RadiologyType,
  RadiologyOrder,
  Diagnosis,
  Symptom,
  ChronicDisease,
  DoctorSettings,
  SystemSettings,
  PrescriptionItemSnapshot,
} from './types/database';
import { DatabaseInspectorModal } from './components/database/DatabaseV1InspectorModal';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardScreen } from './components/screens/DashboardScreen';
import { PatientIntakeScreen } from './components/screens/PatientIntakeScreen';
import { QueueScreen } from './components/screens/QueueScreen';
import { AppointmentsScreen } from './components/screens/AppointmentsScreen';
import { ExaminationScreen } from './components/screens/ExaminationScreen';
import { PrescriptionPadScreen } from './components/screens/PrescriptionPadScreen';
import { PatientListItemsScreen } from './components/screens/PatientFilesScreen';
import { FinanceScreen } from './components/screens/FinanceScreen';
import { SettingsScreen } from './components/screens/SettingsScreen';
import { ClinicalReportsScreen } from './components/screens/ClinicalReportsScreen';
import { NewAppointmentModal } from './components/modals/NewAppointmentModal';
import { db } from './services/firebase';
import { logoutAccount } from './services/auth';
import { AuthScreen } from './components/AuthScreen';
import { AuthProvider, useAuth, usePermissions } from './context/AuthContext';
import {
  createAppointmentTransaction,
  checkInAppointmentTransaction,
  registerWalkInTransaction,
  startVisitTransaction,
  completeVisitTransaction,
} from './services/firestoreWorkflows';
import {
  subscribeToPatients,
  subscribeToAppointments,
  subscribeToVisits,
  subscribeToInvoices,
  subscribeToPayments,
  subscribeToPrescriptions,
  subscribeToFollowUps,
  subscribeToLabOrders,
  subscribeToRadiologyOrders,
  subscribeToMedications,
  subscribeToLabTests,
  subscribeToRadiologyTypes,
  subscribeToDiagnoses,
  subscribeToSymptoms,
  subscribeToChronicDiseases,
  saveCatalogItem,
  removeCatalogItem,
} from './services/repositories';

function ClinicApp() {
  const { canAccess, allowedScreens, userProfile } = usePermissions();

  const [activeScreen, setActiveScreen] = useState<ScreenType>(() => {
    if (allowedScreens && allowedScreens.length > 0 && !allowedScreens.includes('dashboard')) {
      return (allowedScreens[0] as ScreenType) || 'new-visit';
    }
    return 'dashboard';
  });

  // Strict synchronization: if user's permissions change or active screen is unauthorized, redirect immediately
  useEffect(() => {
    if (allowedScreens && allowedScreens.length > 0) {
      if (!canAccess(activeScreen)) {
        const firstPermitted =
          (allowedScreens.find((s) => canAccess(s)) as ScreenType) ||
          (allowedScreens[0] as ScreenType) ||
          'new-visit';
        setActiveScreen(firstPermitted);
      }
    }
  }, [allowedScreens, activeScreen, canAccess]);

  const handleNavigate = (screen: ScreenType) => {
    if (!canAccess(screen)) {
      console.warn(`[Permissions] Navigation to '${screen}' blocked by user permissions.`);
      const firstPermitted =
        (allowedScreens.find((s) => canAccess(s)) as ScreenType) ||
        (allowedScreens[0] as ScreenType) ||
        'new-visit';
      setActiveScreen(firstPermitted);
      return;
    }
    setActiveScreen(screen);
  };

  const [theme, setTheme] = useState<'light' | 'dark'>('light'); // Day/Light mode enabled by default
  const [activeExamPatient, setActiveExamPatient] = useState<PatientListItem | null>(null);

  // Active Prescription sync state
  const [activePrescription, setActivePrescription] = useState<PrescriptionItem[]>([
    {
      id: 'rx-init-1',
      drugName: 'Concor 5 Plus',
      scientificName: 'Bisoprolol + HCTZ',
      dosageForm: 'أقراص (Tablets)',
      dosage: 'قرص واحد صباحاً بعد الإفطار',
      duration: 'لمدة شهر (30 يوماً)',
    },
    {
      id: 'rx-init-2',
      drugName: 'Nexium 40 mg',
      scientificName: 'Esomeprazole',
      dosageForm: 'أقراص (Tablets)',
      dosage: 'قرص واحد قبل الإفطار بنصف ساعة',
      duration: 'لمدة 4 أسابيع',
    },
  ]);

  // =========================================================================
  // SOLI MEDICAL CANONICAL STATE (SINGLE SOURCE OF TRUTH: FIRESTORE)
  // =========================================================================
  const [users] = useState<User[]>(INITIAL_USERS);
  const [doctorProfile] = useState<DoctorProfile>(INITIAL_DOCTOR_PROFILE);
  const [clinicLocations] = useState<ClinicLocation[]>(INITIAL_CLINIC_LOCATIONS);
  const [services] = useState<ServiceItem[]>(INITIAL_SERVICES);

  const [patientsCanonical, setPatientsCanonical] = useState<Patient[]>([]);
  const [appointmentsCanonical, setAppointmentsCanonical] = useState<Appointment[]>([]);
  const [visitsCanonical, setVisitsCanonical] = useState<Visit[]>([]);
  const [invoicesCanonical, setInvoicesCanonical] = useState<Invoice[]>([]);
  const [paymentsCanonical, setPaymentsCanonical] = useState<Payment[]>([]);
  const [followUpsCanonical, setFollowUpsCanonical] = useState<FollowUp[]>([]);
  const [prescriptionsCanonical, setPrescriptionsCanonical] = useState<Prescription[]>([]);
  const [medicationsCanonical, setMedicationsCanonical] = useState<Medication[]>([]);
  const [labTestsCanonical, setLabTestsCanonical] = useState<LabTest[]>([]);
  const [labOrdersCanonical, setLabOrdersCanonical] = useState<LabOrder[]>([]);
  const [radiologyTypesCanonical, setRadiologyTypesCanonical] = useState<RadiologyType[]>([]);
  const [radiologyOrdersCanonical, setRadiologyOrdersCanonical] = useState<RadiologyOrder[]>([]);
  const [diagnosesCanonical, setDiagnosesCanonical] = useState<Diagnosis[]>([]);
  const [symptomsCanonical, setSymptomsCanonical] = useState<Symptom[]>([]);
  const [chronicDiseasesCanonical, setChronicDiseasesCanonical] = useState<ChronicDisease[]>([]);
  const [doctorSettingsCanonical] = useState<DoctorSettings>(INITIAL_DOCTOR_SETTINGS_CANONICAL);
  const [systemSettingsCanonical] = useState<SystemSettings>(INITIAL_SYSTEM_SETTINGS_CANONICAL);

  // Firestore Realtime Subscriptions (Firestore -> onSnapshot -> Canonical State)
  useEffect(() => {
    if (!db) return;
    const onError = (error: Error) => console.warn('[Firestore realtime notice]', error.message);
    const unsubscribers = [
      subscribeToPatients(db, setPatientsCanonical, onError),
      subscribeToAppointments(db, setAppointmentsCanonical, onError),
      subscribeToVisits(db, setVisitsCanonical, onError),
      subscribeToInvoices(db, setInvoicesCanonical, onError),
      subscribeToPayments(db, setPaymentsCanonical, onError),
      subscribeToPrescriptions(db, setPrescriptionsCanonical, onError),
      subscribeToFollowUps(db, setFollowUpsCanonical, onError),
      subscribeToLabOrders(db, setLabOrdersCanonical, onError),
      subscribeToRadiologyOrders(db, setRadiologyOrdersCanonical, onError),
      subscribeToMedications(db, setMedicationsCanonical, onError),
      subscribeToLabTests(db, setLabTestsCanonical, onError),
      subscribeToRadiologyTypes(db, setRadiologyTypesCanonical, onError),
      subscribeToDiagnoses(db, setDiagnosesCanonical, onError),
      subscribeToSymptoms(db, setSymptomsCanonical, onError),
      subscribeToChronicDiseases(db, setChronicDiseasesCanonical, onError),
    ];
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, []);

  // Database Architecture Inspector Modal
  const [isDatabaseInspectorOpen, setIsDatabaseInspectorOpen] = useState(false);

  // =========================================================================
  // DERIVED STATE (Canonical State -> Derived State -> UI)
  // =========================================================================
  const patients: PatientListItem[] = useMemo(() => {
    return patientsCanonical.map((p) => {
      const pVisits = visitsCanonical.filter((v) => v.patientId === p.patientId);
      const pPayments = paymentsCanonical.filter((pm) => pm.patientId === p.patientId);
      const totalPaid = pPayments.reduce((acc, pm) => acc + (pm.amount || 0), 0);
      const lastVisit = [...pVisits].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
      const lastDiag = lastVisit?.clinicalData?.diagnosis?.[0] || 'كشف عيادة باطنة';
      
      const birthYear = p.dateOfBirth ? new Date(p.dateOfBirth).getFullYear() : 1988;
      const calculatedAge = Math.max(1, new Date().getFullYear() - birthYear);

      return {
        id: p.patientId,
        medicalCode: p.medicalCode || `EG-${p.fileNumber || p.patientId.slice(0, 5)}`,
        fileNumber: p.fileNumber || 1,
        name: p.fullName,
        age: calculatedAge,
        gender: p.gender === 'female' ? 'female' : 'male',
        phone: p.phone || '',
        governorate: p.governorate || 'القاهرة',
        avatarUrl: p.avatarUrl,
        allergies: p.allergies || [],
        chronicConditions: p.chronicDiseases || [],
        bloodType: p.bloodType,
        bloodGroup: p.bloodType || 'O+',
        emergencyContact: p.emergencyContact,
        lastVisitDate: lastVisit ? new Date(lastVisit.createdAt).toLocaleDateString('ar-EG') : undefined,
        registrationDate: new Date(p.createdAt || Date.now()).toLocaleDateString('ar-EG'),
        visitsCount: pVisits.length,
        totalPaid,
        lastDiagnosis: lastDiag,
      };
    });
  }, [patientsCanonical, visitsCanonical, paymentsCanonical]);

  const queue: QueueItem[] = useMemo(() => {
    return visitsCanonical
      .filter((v) => v.status === 'WAITING')
      .sort((a, b) => (a.queueNumber || 0) - (b.queueNumber || 0))
      .map((v) => {
        const pat = patientsCanonical.find((p) => p.patientId === v.patientId);
        const invoice = invoicesCanonical.find((i) => i.visitId === v.visitId);
        const payment = paymentsCanonical.find((p) => p.visitId === v.visitId);
        return {
          id: v.visitId,
          ticketNumber: `#0${v.queueNumber || 1}`,
          patientName: pat?.fullName || 'مريض غير مسجل',
          medicalCode: pat?.medicalCode || `EG-${v.patientId.replace(/\D/g, '')}`,
          fileNumber: pat?.fileNumber || v.queueNumber || 1,
          phone: pat?.phone || '',
          age: 38,
          visitType: v.visitType === 'NEW' ? 'كشف جديد' : 'استشارة / متابعة',
          arrivalTime: new Date(v.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
          elapsedMinutes: Math.max(1, Math.floor((Date.now() - new Date(v.createdAt).getTime()) / 60000)),
          paidAmount: payment?.amount || invoice?.paidAmount || 0,
          paymentMethod: (payment?.method === 'CARD' ? 'فيزا / كارت' : 'نقدي') as any,
          complaint: v.receptionistData?.symptoms || 'كشف عيادة باطنة',
          status: 'waiting',
        };
      });
  }, [visitsCanonical, patientsCanonical, invoicesCanonical, paymentsCanonical]);

  const appointments: AppointmentListItem[] = useMemo(() => {
    return appointmentsCanonical.map((a) => {
      const pat = patientsCanonical.find((p) => p.patientId === a.patientId);
      return {
        id: a.appointmentId,
        patientName: pat?.fullName || 'مريض محجوز مسبقاً',
        medicalCode: pat?.medicalCode || 'EG-NEW',
        fileNumber: pat?.fileNumber,
        phone: pat?.phone || '',
        date: a.scheduledDate,
        time: a.scheduledTime,
        timeSlot: a.scheduledTime || '05:00 م',
        visitType: a.visitType,
        status: a.status === 'ARRIVED' ? 'حضر وسدد' : a.status === 'CANCELLED' ? 'ملغي' : 'مجدول',
        expectedFee: 350,
        notes: a.notes,
      };
    });
  }, [appointmentsCanonical, patientsCanonical]);

  const transactions: TransactionRecord[] = useMemo(() => {
    return paymentsCanonical.map((p) => {
      const pat = patientsCanonical.find((pt) => pt.patientId === p.patientId);
      return {
        id: p.paymentId,
        receiptNo: p.receiptNumber,
        patientName: pat?.fullName || 'مريض مجهول',
        description: `سداد كشف ومستحقات زيارة - إيصال ${p.receiptNumber}`,
        amount: p.amount,
        type: 'in',
        paymentMethod: (p.method === 'CARD' ? 'فيزا / كارت' : 'نقدي') as any,
        time: new Date(p.paidAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
        category: 'كشوفات',
      };
    });
  }, [paymentsCanonical, patientsCanonical]);

  // Catalogs derived
  const presetChronicConditions = useMemo(() => {
    if (chronicDiseasesCanonical.length > 0) {
      return chronicDiseasesCanonical.map((c) => ({
        id: c.diseaseId,
        name: c.nameAr,
        category: c.category || 'أمراض شائعة',
        color: 'bg-teal-500',
      }));
    }
    return DEFAULT_CHRONIC_CONDITIONS;
  }, [chronicDiseasesCanonical]);

  const drugCatalog: DrugCatalogItem[] = useMemo(() => {
    if (medicationsCanonical.length > 0) {
      return medicationsCanonical.map((m) => ({
        id: m.medicationId,
        brandName: m.nameAr,
        genericName: m.genericName,
        strength: m.strength,
        form: m.form,
        category: 'أدوية العيادة',
        active: m.active,
      }));
    }
    return DEFAULT_DRUG_CATALOG;
  }, [medicationsCanonical]);

  const labCatalog: LabCatalogItem[] = useMemo(() => {
    if (labTestsCanonical.length > 0) {
      return labTestsCanonical.map((l) => ({
        id: l.labTestId,
        name: l.nameAr,
        category: l.category,
        sampleType: l.sampleType,
        fastingRequired: l.fastingRequired,
        active: l.active,
      }));
    }
    return DEFAULT_LAB_CATALOG;
  }, [labTestsCanonical]);

  const radiologyCatalog: RadiologyCatalogItem[] = useMemo(() => {
    if (radiologyTypesCanonical.length > 0) {
      return radiologyTypesCanonical.map((r) => ({
        id: r.radiologyId,
        name: r.nameAr,
        category: r.category,
        active: r.active,
      }));
    }
    return DEFAULT_RADIOLOGY_CATALOG;
  }, [radiologyTypesCanonical]);

  const diagnosesCatalog: DiagnosisCatalogItem[] = useMemo(() => {
    if (diagnosesCanonical.length > 0) {
      return diagnosesCanonical.map((d) => ({
        id: d.diagnosisId,
        nameAr: d.nameAr,
        nameEn: d.nameEn,
        code: d.code,
        active: d.active,
      }));
    }
    return DEFAULT_DIAGNOSES_CATALOG;
  }, [diagnosesCanonical]);

  const symptomsCatalog: SymptomCatalogItem[] = useMemo(() => {
    if (symptomsCanonical.length > 0) {
      return symptomsCanonical.map((s) => ({
        id: s.symptomId,
        name: s.nameAr,
        category: s.category,
        active: s.active,
      }));
    }
    return DEFAULT_SYMPTOMS_CATALOG;
  }, [symptomsCanonical]);

  // Set default active patient for exam if not selected
  useEffect(() => {
    if (!activeExamPatient && patients.length > 0) {
      setActiveExamPatient(patients[0]);
    }
  }, [patients, activeExamPatient]);

  // Modals
  const [isNewAppointmentOpen, setIsNewAppointmentOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Sound/Announcement banner
  const [callingBanner, setCallingBanner] = useState<{ ticket: string; name: string } | null>(null);

  // Synchronize Theme class on HTML document root and localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('soli_clinic_theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('soli_clinic_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('soli_clinic_theme', 'light');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Sound Chime for Patient Queue & Status Updates
  const playQueueNotificationSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.15); // G5
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.45);
    } catch {
      // Ignored if sound blocked by browser policy
    }
  };

  // Next sequential file number
  const nextFileNumber =
    Math.max(
      ...patientsCanonical.map((p) => (typeof p.fileNumber === 'number' ? p.fileNumber : 0)),
      0
    ) + 1;

  // =========================================================================
  // CATALOG MUTATION HANDLERS (Direct Firestore Persistence & Live Sync)
  // =========================================================================
  const handleAddRadiologyToCatalog = async (item: RadiologyCatalogItem) => {
    if (!db) return;
    try {
      await saveCatalogItem(db, 'radiologyTypes', item.id, {
        radiologyId: item.id,
        nameAr: item.name,
        category: item.category,
        isFavorite: !!item.isFavorite,
        active: true,
      });
    } catch (err) {
      console.warn('Failed to save radiology to catalog', err);
    }
  };

  const handleRemoveRadiologyFromCatalog = async (id: string) => {
    if (!db) return;
    try {
      await removeCatalogItem(db, 'radiologyTypes', id);
    } catch (err) {
      console.warn('Failed to remove radiology', err);
    }
  };

  const handleToggleRadiologyFavorite = async (id: string) => {
    if (!db) return;
    const current = radiologyCatalog.find((r) => r.id === id);
    if (!current) return;
    try {
      await saveCatalogItem(db, 'radiologyTypes', id, {
        isFavorite: !current.isFavorite,
      });
    } catch (err) {
      console.warn('Failed to toggle radiology favorite', err);
    }
  };

  const handleAddLabToCatalog = async (item: LabCatalogItem) => {
    if (!db) return;
    try {
      await saveCatalogItem(db, 'labTests', item.id, {
        labTestId: item.id,
        nameAr: item.name,
        category: item.category,
        sampleType: item.sampleType || 'دم',
        fastingRequired: !!item.fastingRequired,
        referenceRange: item.referenceRange || '',
        unit: item.unit || '',
        isFavorite: !!item.isFavorite,
        active: true,
      });
    } catch (err) {
      console.warn('Failed to save lab to catalog', err);
    }
  };

  const handleRemoveLabFromCatalog = async (id: string) => {
    if (!db) return;
    try {
      await removeCatalogItem(db, 'labTests', id);
    } catch (err) {
      console.warn('Failed to remove lab', err);
    }
  };

  const handleToggleLabFavorite = async (id: string) => {
    if (!db) return;
    const current = labCatalog.find((l) => l.id === id);
    if (!current) return;
    try {
      await saveCatalogItem(db, 'labTests', id, {
        isFavorite: !current.isFavorite,
      });
    } catch (err) {
      console.warn('Failed to toggle lab favorite', err);
    }
  };

  const handleAddDrugToCatalog = async (item: DrugCatalogItem) => {
    if (!db) return;
    try {
      await saveCatalogItem(db, 'medications', item.id, {
        medicationId: item.id,
        tradeName: item.brandName,
        genericName: item.genericName,
        strength: item.strength,
        form: item.form,
        category: item.category,
        defaultDose: item.defaultDosage,
        defaultDuration: item.defaultDuration,
        defaultTiming: item.defaultTiming,
        isFavorite: !!item.isFavorite,
        notes: item.notes || '',
        active: true,
      });
    } catch (err) {
      console.warn('Failed to save drug to catalog', err);
    }
  };

  const handleRemoveDrugFromCatalog = async (id: string) => {
    if (!db) return;
    try {
      await removeCatalogItem(db, 'medications', id);
    } catch (err) {
      console.warn('Failed to remove drug', err);
    }
  };

  const handleToggleDrugFavorite = async (id: string) => {
    if (!db) return;
    const current = drugCatalog.find((d) => d.id === id);
    if (!current) return;
    try {
      await saveCatalogItem(db, 'medications', id, {
        isFavorite: !current.isFavorite,
      });
    } catch (err) {
      console.warn('Failed to toggle drug favorite', err);
    }
  };

  const handleAddDiagnosisToCatalog = async (item: DiagnosisCatalogItem) => {
    if (!db) return;
    try {
      await saveCatalogItem(db, 'diagnoses', item.id, {
        diagnosisId: item.id,
        code: item.code,
        nameAr: item.nameAr,
        nameEn: item.nameEn,
        category: item.category,
        isFavorite: !!item.isFavorite,
        active: true,
      });
    } catch (err) {
      console.warn('Failed to save diagnosis to catalog', err);
    }
  };

  const handleRemoveDiagnosisFromCatalog = async (id: string) => {
    if (!db) return;
    try {
      await removeCatalogItem(db, 'diagnoses', id);
    } catch (err) {
      console.warn('Failed to remove diagnosis', err);
    }
  };

  const handleToggleDiagnosisFavorite = async (id: string) => {
    if (!db) return;
    const current = diagnosesCatalog.find((d) => d.id === id);
    if (!current) return;
    try {
      await saveCatalogItem(db, 'diagnoses', id, {
        isFavorite: !current.isFavorite,
      });
    } catch (err) {
      console.warn('Failed to toggle diagnosis favorite', err);
    }
  };

  const handleAddSymptomToCatalog = async (item: SymptomCatalogItem) => {
    if (!db) return;
    try {
      await saveCatalogItem(db, 'symptoms', item.id, {
        symptomId: item.id,
        nameAr: item.name,
        category: item.category,
        active: true,
      });
    } catch (err) {
      console.warn('Failed to save symptom to catalog', err);
    }
  };

  const handleRemoveSymptomFromCatalog = async (id: string) => {
    if (!db) return;
    try {
      await removeCatalogItem(db, 'symptoms', id);
    } catch (err) {
      console.warn('Failed to remove symptom', err);
    }
  };

  const handleAddChronicCondition = async (condition: string) => {
    if (!db) return;
    const id = `chronic-${Date.now()}`;
    try {
      await saveCatalogItem(db, 'chronicDiseases', id, {
        diseaseId: id,
        nameAr: condition,
        category: 'عام',
        active: true,
      });
    } catch (err) {
      console.warn('Failed to save chronic disease', err);
    }
  };

  const handleRemoveChronicCondition = async (condition: string) => {
    if (!db) return;
    const found = chronicDiseasesCanonical.find((c) => c.nameAr === condition);
    if (found) {
      try {
        await removeCatalogItem(db, 'chronicDiseases', found.diseaseId);
      } catch (err) {
        console.warn('Failed to remove chronic disease', err);
      }
    }
  };

  // =========================================================================
  // WORKFLOW ACTIONS (UI Action -> Firestore Transaction -> onSnapshot -> UI)
  // NO DOUBLE MUTATION!
  // =========================================================================

  // Call Patient
  const handleCallPatient = async (ticket: string, name: string) => {
    playQueueNotificationSound();
    setCallingBanner({ ticket, name });
    setTimeout(() => setCallingBanner(null), 5000);

    const targetQueueNum = parseInt(ticket.replace(/\D/g, ''), 10);
    const targetVisit = visitsCanonical.find((v) => v.queueNumber === targetQueueNum);
    if (!targetVisit) return;

    const matchedPatient = patients.find((p) => p.id === targetVisit.patientId) || {
      id: targetVisit.patientId,
      medicalCode: `EG-${targetVisit.patientId.slice(0, 5)}`,
      fileNumber: targetVisit.queueNumber || 1,
      name,
      age: 38,
      gender: 'male' as const,
      phone: '',
      governorate: 'القاهرة',
      allergies: [],
      chronicConditions: [],
      bloodGroup: 'O+',
      lastDiagnosis: targetVisit.receptionistData?.symptoms || 'كشف عيادة باطنة',
    };
    setActiveExamPatient(matchedPatient);

    if (db) {
      try {
        await startVisitTransaction(db, targetVisit.visitId, userProfile?.username || 'usr-hazem-dr');
      } catch (error) {
        console.error('startVisit error:', error);
      }
    }
  };

  // Check in appointment: Firestore transaction atomically commits ARRIVED + Invoice + Payment + Visit
  const handleConfirmCheckIn = async (app: AppointmentListItem, fee: number, method: string = 'نقدي') => {
    const appt = appointmentsCanonical.find((a) => a.appointmentId === app.id);
    if (!appt || appt.status !== 'SCHEDULED') {
      alert('الموعد غير موجود أو تم تسجيل حضوره بالفعل');
      return;
    }
    const patient = patientsCanonical.find((p) => p.patientId === appt.patientId);
    if (!patient) {
      alert('لا يمكن تسجيل الحضور دون Patient مرتبط بالموعد');
      return;
    }
    const paymentMethodEnum = method.includes('فيزا') || method.includes('كارت') ? 'CARD' : method.includes('إنستا') ? 'TRANSFER' : 'CASH';

    if (db) {
      try {
        await checkInAppointmentTransaction({
          db,
          appointmentId: appt.appointmentId,
          paymentAmount: fee,
          paymentMethod: paymentMethodEnum,
          receivedBy: userProfile?.username || 'receptionist',
          receptionistData: { symptoms: app.visitType || 'كشف', chronicDiseases: patient.chronicDiseases || [], notes: '' },
        });
      } catch (error) {
        alert(error instanceof Error ? error.message : 'فشل تسجيل حضور المريض في قاعدة البيانات');
      }
    }
  };

  // Walk-in: Patient + Invoice + Payment + Visit are committed in one transaction
  const handleAddPatientToQueue = async (item: QueueItem) => {
    const timestamp = new Date().toISOString();
    const patient: Patient = patientsCanonical.find((p) => p.phone === item.phone || p.fullName === item.patientName) || {
      patientId: `pat-${Date.now()}`,
      fullName: item.patientName,
      phone: item.phone,
      gender: 'male' as const,
      fileNumber: typeof item.fileNumber === 'number' ? item.fileNumber : parseInt(String(item.fileNumber), 10) || nextFileNumber,
      medicalCode: item.medicalCode,
      chronicDiseases: item.chronicConditions || [],
      allergies: [],
      createdAt: timestamp,
      updatedAt: timestamp,
      createdBy: userProfile?.username || 'receptionist',
    };
    const paymentMethodEnum = item.paymentMethod.includes('فيزا') || item.paymentMethod.includes('كارت') ? 'CARD' : 'CASH';

    if (db) {
      try {
        await registerWalkInTransaction({
          db,
          patient,
          paymentAmount: item.paidAmount,
          paymentMethod: paymentMethodEnum,
          receivedBy: userProfile?.username || 'receptionist',
          clinicLocationId: 'loc-mohandessin',
          receptionistData: { symptoms: item.complaint || '', chronicDiseases: patient.chronicDiseases || [], notes: '' },
        });
      } catch (error) {
        alert(error instanceof Error ? error.message : 'فشل إضافة المريض للانتظار في قاعدة البيانات');
      }
    }
  };

  // Add scheduled appointment: Patient first, then Appointment in one Firestore transaction
  const handleAddAppointment = async (app: AppointmentListItem) => {
    const timestamp = new Date().toISOString();
    const existingPatient = patientsCanonical.find(
      (p) => p.fullName.trim() === app.patientName.trim() || (!!app.phone && p.phone === app.phone),
    );
    const patient: Patient = existingPatient || {
      patientId: `pat-${Date.now()}`,
      fullName: app.patientName.trim(),
      phone: app.phone || '',
      medicalCode: app.medicalCode || `EG-${nextFileNumber}`,
      fileNumber: app.fileNumber || nextFileNumber,
      createdAt: timestamp,
      updatedAt: timestamp,
      createdBy: userProfile?.username || 'receptionist',
    };
    const newApp: Appointment = {
      appointmentId: `app-${Date.now()}`,
      patientId: patient.patientId,
      clinicLocationId: 'loc-mohandessin',
      scheduledDate: new Date().toISOString().split('T')[0],
      scheduledTime: app.timeSlot || '07:30 م',
      visitType: app.visitType,
      status: 'SCHEDULED',
      notes: app.notes || 'حجز موعد كشف مسبق',
      createdAt: timestamp,
      updatedAt: timestamp,
      createdBy: userProfile?.username || 'receptionist',
    };
    if (db) {
      try {
        await createAppointmentTransaction({ db, patient, appointment: newApp });
      } catch (error) {
        alert(error instanceof Error ? error.message : 'تعذر حفظ الموعد في قاعدة البيانات');
      }
    }
  };

  // Finish examination: ATOMIC COMPLETE VISIT WORKFLOW
  const handleFinishExam = async () => {
    const activeWaiting = visitsCanonical.find((v) => v.status === 'IN_PROGRESS') ||
      visitsCanonical.find((v) => v.status === 'WAITING');

    if (activeWaiting && db) {
      const rxSnapshots: PrescriptionItemSnapshot[] = activePrescription.map((item) => ({
        name: item.drugName,
        strength: item.scientificName || '',
        form: item.dosageForm || 'أقراص',
        dose: item.dosage || 'قرص واحد',
        frequency: item.dosage || 'يومياً',
        duration: item.duration,
        instructions: 'تناول العلاج وفق الإرشادات الموضحة بالروشتة',
      }));

      const clinicalData = {
        chiefComplaint: activeWaiting.receptionistData?.symptoms || 'كشف عيادة باطنة',
        history: 'متابعة سريرية متكاملة',
        examination: 'العلامات الحيوية وفحص القلب والصدر مستقر',
        diagnosis: [activeExamPatient?.lastDiagnosis || 'كشف عيادة باطنة'],
        treatment: activePrescription.map((p) => p.drugName).join(' + '),
      };

      const vitalSigns = activeWaiting.vitalSigns || {
        bloodPressure: '120/80',
        pulse: 76,
        temperature: 37,
        weight: 80,
        height: 175,
        oxygenSaturation: 98,
        randomBloodSugar: 110,
      };

      try {
        await completeVisitTransaction({
          db,
          visitId: activeWaiting.visitId,
          doctorId: userProfile?.username || 'usr-hazem-dr',
          clinicalData,
          vitalSigns,
          prescriptionItems: rxSnapshots,
          prescriptionNotes: 'مع أطيب تمنياتنا بالشفاء العاجل',
          followUp: {
            scheduledDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
            fee: 0,
            isFree: true,
            notes: 'استشارة مجانية للمتابعة خلال 14 يوماً من تاريخ الكشف',
          },
        });
      } catch (error) {
        alert(error instanceof Error ? error.message : 'تعذر حفظ وإنهاء الزيارة');
      }
    }
  };

  return (
    <div
      className="min-h-screen bg-slate-100 dark:bg-[#080e1b] text-slate-800 dark:text-[#dde2f5] font-sans antialiased flex transition-colors"
      dir="rtl"
    >
      {/* Permanent Right Sidebar Navigation & Mobile Drawer */}
      <Sidebar
        activeScreen={activeScreen}
        onNavigate={handleNavigate}
        queueCount={queue.length}
        onLogout={() => { void logoutAccount(); }}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        isDark={theme === 'dark'}
        onToggleTheme={toggleTheme}
      />

      {/* Main Content Area */}
      <div className="flex-1 mr-0 lg:mr-72 flex flex-col min-h-screen min-w-0 w-full max-w-full overflow-x-hidden">
        {/* Top Header */}
        <Header
          onOpenDatabaseInspector={() => setIsDatabaseInspectorOpen(true)}
          onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
        />

        {/* Global Live Call Patient Alert (Simulating Speaker Broadcast) */}
        {callingBanner && (
          <div className="fixed top-18 right-4 lg:right-80 left-4 lg:left-8 z-50 bg-white dark:bg-[#18233C] border-2 border-[#00c2cb] rounded-2xl p-4 shadow-2xl flex items-center justify-between animate-in slide-in-from-top-4 max-w-full">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#00c2cb] text-[#08101C] flex items-center justify-center font-black shrink-0">
                <span className="material-symbols-outlined text-xl sm:text-2xl animate-pulse">campaign</span>
              </div>
              <div className="min-w-0">
                <span className="text-xs font-mono font-bold text-[#008f97] dark:text-[#45dee7] block">
                  نداء صوتي صادر عبر مكبر صالة الانتظار:
                </span>
                <h4 className="text-xs sm:text-base font-bold text-slate-900 dark:text-[#dde2f5] truncate">
                  تذكرة رقم ({callingBanner.ticket}) — المريض ({callingBanner.name}) يتفضل لغرفة الكشف
                </h4>
              </div>
            </div>
            <button
              onClick={() => setCallingBanner(null)}
              className="text-xs text-slate-500 dark:text-[#859394] hover:text-slate-900 dark:hover:text-white px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-[#080e1b] cursor-pointer shrink-0"
            >
              إغلاق
            </button>
          </div>
        )}

        {/* Main View Container */}
        <main className="flex-1 mt-16 p-2 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto min-w-0 overflow-x-hidden">
          {!canAccess(activeScreen) ? (
            <div className="p-8 rounded-2xl bg-white dark:bg-[#111A2E] border border-rose-500/30 text-center space-y-4 shadow-xl">
              <div className="w-14 h-14 rounded-2xl bg-rose-500/15 text-rose-500 mx-auto flex items-center justify-center">
                <span className="material-symbols-outlined text-3xl">lock</span>
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-[#dde2f5]">
                  هذه الصفحة غير مصرحة لحسابك
                </h3>
                <p className="text-xs text-slate-500 dark:text-[#859394]">
                  تم تقييد الوصول لهذه الصفحة من قِبل إدارة العيادة. تواصل مع المسؤول في حال الحاجة لتعديل الصلاحيات.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const firstPermitted =
                    (allowedScreens.find((s) => canAccess(s)) as ScreenType) ||
                    (allowedScreens[0] as ScreenType) ||
                    'new-visit';
                  setActiveScreen(firstPermitted);
                }}
                className="px-4 py-2 rounded-xl bg-[#00c2cb] hover:bg-[#45dee7] text-slate-950 font-bold text-xs transition-colors cursor-pointer"
              >
                الانتقال إلى أول صفحة مسموحة لك
              </button>
            </div>
          ) : (
            <>
              {activeScreen === 'dashboard' && (
                <DashboardScreen
                  onNavigate={handleNavigate}
                  appointments={appointments}
                  queue={queue}
                  onConfirmCheckIn={handleConfirmCheckIn}
                  onCallPatient={handleCallPatient}
                />
              )}

              {activeScreen === 'new-visit' && (
                <PatientIntakeScreen
                  onAddPatientToQueue={handleAddPatientToQueue}
                  patients={patients}
                  presetChronicConditions={presetChronicConditions}
                  onAddChronicCondition={() => {}}
                  onNavigate={handleNavigate}
                  nextFileNumber={nextFileNumber}
                  symptomsCatalog={symptomsCatalog}
                />
              )}

              {activeScreen === 'waiting-queue' && (
                <QueueScreen
                  queue={queue}
                  onCallPatient={handleCallPatient}
                  onNavigate={handleNavigate}
                />
              )}

              {(activeScreen === 'appointments' || activeScreen === 'upcoming-followups') && (
                <AppointmentsScreen
                  appointments={appointments}
                  onCheckInPatient={(app) => handleConfirmCheckIn(app, app.expectedFee, 'نقدي')}
                  onOpenNewAppointment={() => setIsNewAppointmentOpen(true)}
                  onNavigate={handleNavigate}
                />
              )}

              {activeScreen === 'clinical-exam' && (
                <ExaminationScreen
                  patient={activeExamPatient || patients[0]}
                  onNavigate={handleNavigate}
                  onFinishExam={handleFinishExam}
                  radiologyCatalog={radiologyCatalog}
                  onAddRadiologyToCatalog={handleAddRadiologyToCatalog}
                  labCatalog={labCatalog}
                  onAddLabToCatalog={handleAddLabToCatalog}
                  drugCatalog={drugCatalog}
                  onAddDrugToCatalog={handleAddDrugToCatalog}
                  diagnosesCatalog={diagnosesCatalog}
                  onAddDiagnosisToCatalog={handleAddDiagnosisToCatalog}
                  symptomsCatalog={symptomsCatalog}
                  onAddSymptomToCatalog={handleAddSymptomToCatalog}
                  activePrescription={activePrescription}
                  onChangeActivePrescription={setActivePrescription}
                />
              )}

              {activeScreen === 'prescription-pad' && (
                <PrescriptionPadScreen
                  patient={activeExamPatient || patients[0]}
                  items={activePrescription}
                  onChangeItems={setActivePrescription}
                />
              )}

              {activeScreen === 'patient-records' && (
                <PatientListItemsScreen
                  patients={patients}
                  onNavigate={handleNavigate}
                  onSelectPatientForExam={(p) => setActiveExamPatient(p)}
                  visits={visitsCanonical}
                  invoices={invoicesCanonical}
                  prescriptions={prescriptionsCanonical}
                  labOrders={labOrdersCanonical}
                  radiologyOrders={radiologyOrdersCanonical}
                  followUps={followUpsCanonical}
                />
              )}

              {(activeScreen === 'finance' || activeScreen === 'billing-payments') && (
                <FinanceScreen
                  transactions={transactions}
                  onAddTransaction={() => {}}
                />
              )}

              {activeScreen === 'clinical-reports' && (
                <ClinicalReportsScreen />
              )}

              {(activeScreen === 'settings' || activeScreen === 'system-settings') && (
                <SettingsScreen
                  presetChronicConditions={presetChronicConditions}
                  onAddChronicCondition={handleAddChronicCondition}
                  onRemoveChronicCondition={handleRemoveChronicCondition}
                  radiologyCatalog={radiologyCatalog}
                  onAddRadiology={handleAddRadiologyToCatalog}
                  onRemoveRadiology={handleRemoveRadiologyFromCatalog}
                  onToggleRadiologyFavorite={handleToggleRadiologyFavorite}
                  labCatalog={labCatalog}
                  onAddLab={handleAddLabToCatalog}
                  onRemoveLab={handleRemoveLabFromCatalog}
                  onToggleLabFavorite={handleToggleLabFavorite}
                  drugCatalog={drugCatalog}
                  onAddDrug={handleAddDrugToCatalog}
                  onRemoveDrug={handleRemoveDrugFromCatalog}
                  onToggleDrugFavorite={handleToggleDrugFavorite}
                  diagnosesCatalog={diagnosesCatalog}
                  onAddDiagnosis={handleAddDiagnosisToCatalog}
                  onRemoveDiagnosis={handleRemoveDiagnosisFromCatalog}
                  onToggleDiagnosisFavorite={handleToggleDiagnosisFavorite}
                  symptomsCatalog={symptomsCatalog}
                  onAddSymptom={handleAddSymptomToCatalog}
                  onRemoveSymptom={handleRemoveSymptomFromCatalog}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Booking Appointment Modal */}
      <NewAppointmentModal
        isOpen={isNewAppointmentOpen}
        onClose={() => setIsNewAppointmentOpen(false)}
        onAddAppointment={handleAddAppointment}
      />

      {/* Database Architecture Inspector Modal */}
      <DatabaseInspectorModal
        isOpen={isDatabaseInspectorOpen}
        onClose={() => setIsDatabaseInspectorOpen(false)}
        users={users}
        doctorProfile={doctorProfile}
        clinicLocations={clinicLocations}
        patients={patientsCanonical}
        appointments={appointmentsCanonical}
        visits={visitsCanonical}
        invoices={invoicesCanonical}
        payments={paymentsCanonical}
        services={services}
        followUps={followUpsCanonical}
        prescriptions={prescriptionsCanonical}
        medications={medicationsCanonical}
        labTests={labTestsCanonical}
        labOrders={labOrdersCanonical}
        radiologyTypes={radiologyTypesCanonical}
        radiologyOrders={radiologyOrdersCanonical}
        diagnoses={diagnosesCanonical}
        symptoms={symptomsCanonical}
        chronicDiseases={chronicDiseasesCanonical}
        doctorSettings={doctorSettingsCanonical}
        systemSettings={systemSettingsCanonical}
      />
    </div>
  );
}

function AuthenticatedApp() {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080e1b] flex items-center justify-center" dir="rtl">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-[#00c2cb] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-400 font-medium">جارٍ تحميل بيانات الجلسة...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthScreen />;
  }

  return <ClinicApp />;
}

export default function App() {
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  );
}

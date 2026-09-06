import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
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
  INITIAL_APPOINTMENTS as INITIAL_APPOINTMENTS_PREVIEW,
  INITIAL_QUEUE,
  INITIAL_TRANSACTIONS,
  INITIAL_PATIENTS as INITIAL_PATIENTS_PREVIEW,
  DEFAULT_CHRONIC_CONDITIONS,
  ClinicProtocol,
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
  INITIAL_PATIENTS as INITIAL_PATIENTS_CANONICAL,
  INITIAL_APPOINTMENTS as INITIAL_APPOINTMENTS_CANONICAL,
  INITIAL_VISITS as INITIAL_VISITS_CANONICAL,
  INITIAL_INVOICES as INITIAL_INVOICES_CANONICAL,
  INITIAL_PAYMENTS as INITIAL_PAYMENTS_CANONICAL,
  INITIAL_FOLLOWUPS as INITIAL_FOLLOWUPS_CANONICAL,
  INITIAL_PRESCRIPTIONS as INITIAL_PRESCRIPTIONS_CANONICAL,
  INITIAL_MEDICATIONS as INITIAL_MEDICATIONS_CANONICAL,
  INITIAL_LAB_TESTS as INITIAL_LAB_TESTS_CANONICAL,
  INITIAL_LAB_ORDERS as INITIAL_LAB_ORDERS_CANONICAL,
  INITIAL_RADIOLOGY_TYPES as INITIAL_RADIOLOGY_TYPES_CANONICAL,
  INITIAL_RADIOLOGY_ORDERS as INITIAL_RADIOLOGY_ORDERS_CANONICAL,
  INITIAL_DIAGNOSES as INITIAL_DIAGNOSES_CANONICAL,
  INITIAL_SYMPTOMS as INITIAL_SYMPTOMS_CANONICAL,
  INITIAL_CHRONIC_DISEASES as INITIAL_CHRONIC_DISEASES_CANONICAL,
  INITIAL_DOCTOR_SETTINGS as INITIAL_DOCTOR_SETTINGS_CANONICAL,
  INITIAL_SYSTEM_SETTINGS as INITIAL_SYSTEM_SETTINGS_CANONICAL,
  executeAtomicArrival,
  executeAtomicWalkIn,
  executeCompleteVisit,
} from './data/database';
import {
  User,
  DoctorProfile,
  ClinicLocation,
  Patient as Patient,
  Appointment as Appointment,
  Visit as Visit,
  Invoice as Invoice,
  Payment as Payment,
  ServiceItem as ServiceItem,
  FollowUp as FollowUp,
  Prescription as Prescription,
  Medication as Medication,
  LabTest as LabTest,
  LabOrder as LabOrder,
  RadiologyType as RadiologyType,
  RadiologyOrder as RadiologyOrder,
  Diagnosis as Diagnosis,
  Symptom as Symptom,
  ChronicDisease as ChronicDisease,
  DoctorSettings as DoctorSettings,
  SystemSettings as SystemSettings,
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
import { PrescriptionCatalogScreen } from './components/screens/PrescriptionCatalogScreen';
import { NewAppointmentModal } from './components/modals/NewAppointmentModal';
import { startVisit } from './services/workflows';
import { auth, db } from './services/firebase';
import { logoutAccount } from './services/auth';
import { AuthScreen } from './components/AuthScreen';
import { AuthProvider, useAuth, usePermissions } from './context/AuthContext';
import { createAppointmentTransaction, checkInAppointmentTransaction, registerWalkInTransaction, startVisitTransaction, completeVisitTransaction } from './services/firestoreWorkflows';
import { subscribeToPatients, subscribeToAppointments, subscribeToVisits, subscribeToInvoices, subscribeToPayments } from './services/repositories';

function ClinicApp() {
  const { canAccess, allowedScreens } = usePermissions();

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
  const [selectedBranch, setSelectedBranch] = useState<string>('mohandessin');
  const [theme, setTheme] = useState<'light' | 'dark'>('light'); // Day/Light mode enabled by default
  const [appointments, setAppointments] = useState<AppointmentListItem[]>(INITIAL_APPOINTMENTS_PREVIEW);
  const [queue, setQueue] = useState<QueueItem[]>(INITIAL_QUEUE);
  const [transactions, setTransactions] = useState<TransactionRecord[]>(INITIAL_TRANSACTIONS);
  const [patients, setPatients] = useState<PatientListItem[]>(INITIAL_PATIENTS_PREVIEW);
  const [activeExamPatient, setActiveExamPatient] = useState<PatientListItem>(INITIAL_PATIENTS_PREVIEW[0]);

  // Preset chronic conditions managed across the entire clinic
  const [presetChronicConditions, setPresetChronicConditions] = useState(DEFAULT_CHRONIC_CONDITIONS);

  // Clinic-wide Medical Catalogs State
  const [radiologyCatalog, setRadiologyCatalog] = useState<RadiologyCatalogItem[]>(DEFAULT_RADIOLOGY_CATALOG);
  const [labCatalog, setLabCatalog] = useState<LabCatalogItem[]>(DEFAULT_LAB_CATALOG);
  const [drugCatalog, setDrugCatalog] = useState<DrugCatalogItem[]>(DEFAULT_DRUG_CATALOG);
  const [diagnosesCatalog, setDiagnosesCatalog] = useState<DiagnosisCatalogItem[]>(DEFAULT_DIAGNOSES_CATALOG);
  const [symptomsCatalog, setSymptomsCatalog] = useState<SymptomCatalogItem[]>(DEFAULT_SYMPTOMS_CATALOG);

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
    {
      id: 'rx-init-3',
      drugName: 'Gastreg 200 mg',
      scientificName: 'Trimebutine maleate',
      dosageForm: 'أقراص (Tablets)',
      dosage: 'قرص واحد قبل الأكل بـ 20 دقيقة مرتين يومياً',
      duration: 'لمدة أسبوعين',
    },
  ]);

  // =========================================================================
  // SOLI MEDICAL DATABASE ARCHITECTURE STATE
  // =========================================================================
  const [users] = useState<User[]>(INITIAL_USERS);
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile>(INITIAL_DOCTOR_PROFILE);
  const [clinicLocations, setClinicLocations] = useState<ClinicLocation[]>(INITIAL_CLINIC_LOCATIONS);
  const [services, setServices] = useState<ServiceItem[]>(INITIAL_SERVICES);
  const [patientsCanonical, setPatientsCanonical] = useState<Patient[]>(INITIAL_PATIENTS_CANONICAL);
  const [appointmentsCanonical, setAppointmentsCanonical] = useState<Appointment[]>(INITIAL_APPOINTMENTS_CANONICAL);
  const [visitsCanonical, setVisitsCanonical] = useState<Visit[]>(INITIAL_VISITS_CANONICAL);
  const [invoicesCanonical, setInvoicesCanonical] = useState<Invoice[]>(INITIAL_INVOICES_CANONICAL);
  const [paymentsCanonical, setPaymentsCanonical] = useState<Payment[]>(INITIAL_PAYMENTS_CANONICAL);
  const [followUpsCanonical, setFollowUpsCanonical] = useState<FollowUp[]>(INITIAL_FOLLOWUPS_CANONICAL);
  const [prescriptionsCanonical, setPrescriptionsCanonical] = useState<Prescription[]>(INITIAL_PRESCRIPTIONS_CANONICAL);
  const [medicationsCanonical, setMedicationsCanonical] = useState<Medication[]>(INITIAL_MEDICATIONS_CANONICAL);
  const [labTestsCanonical, setLabTestsCanonical] = useState<LabTest[]>(INITIAL_LAB_TESTS_CANONICAL);
  const [labOrdersCanonical, setLabOrdersCanonical] = useState<LabOrder[]>(INITIAL_LAB_ORDERS_CANONICAL);
  const [radiologyTypesCanonical, setRadiologyTypesCanonical] = useState<RadiologyType[]>(INITIAL_RADIOLOGY_TYPES_CANONICAL);
  const [radiologyOrdersCanonical, setRadiologyOrdersCanonical] = useState<RadiologyOrder[]>(INITIAL_RADIOLOGY_ORDERS_CANONICAL);
  const [diagnosesCanonical, setDiagnosesCanonical] = useState<Diagnosis[]>(INITIAL_DIAGNOSES_CANONICAL);
  const [symptomsCanonical, setSymptomsCanonical] = useState<Symptom[]>(INITIAL_SYMPTOMS_CANONICAL);
  const [chronicDiseasesCanonical, setChronicDiseasesCanonical] = useState<ChronicDisease[]>(INITIAL_CHRONIC_DISEASES_CANONICAL);
  const [doctorSettingsCanonical, setDoctorSettingsCanonical] = useState<DoctorSettings>(INITIAL_DOCTOR_SETTINGS_CANONICAL);
  const [systemSettingsCanonical, setSystemSettingsCanonical] = useState<SystemSettings>(INITIAL_SYSTEM_SETTINGS_CANONICAL);

  // Firestore is the shared source of truth when configured. Each listener is cleaned up on unmount.
  useEffect(() => {
    if (!db) return;
    const onError = (error: Error) => console.error('[Firestore realtime]', error);
    const unsubscribers = [
      subscribeToPatients(db, setPatientsCanonical, onError),
      subscribeToAppointments(db, setAppointmentsCanonical, onError),
      subscribeToVisits(db, setVisitsCanonical, onError),
      subscribeToInvoices(db, setInvoicesCanonical, onError),
      subscribeToPayments(db, setPaymentsCanonical, onError),
    ];
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, []);

  // Database Architecture Inspector Modal
  const [isDatabaseInspectorOpen, setIsDatabaseInspectorOpen] = useState(false);

  // Synchronize Collections with UI representations
  useEffect(() => {
    // 1. Queue is a VIEW derived from visitsCanonical where status == "WAITING"
    const waitingVisits = visitsCanonical
      .filter((v) => v.status === 'WAITING')
      .sort((a, b) => (a.queueNumber || 0) - (b.queueNumber || 0));

    const mappedQueue: QueueItem[] = waitingVisits.map((v) => {
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
    setQueue(mappedQueue);
  }, [visitsCanonical, patientsCanonical, invoicesCanonical, paymentsCanonical]);

  // Synchronize Payments with Finance Ledger
  useEffect(() => {
    const mappedTransactions: TransactionRecord[] = paymentsCanonical.map((p) => {
      const pat = patientsCanonical.find((pt) => pt.patientId === p.patientId);
      return {
        id: p.paymentId,
        receiptNo: p.receiptNumber,
        patientName: pat?.fullName || 'مريض مجهول',
        description: `سداد كشف ومستحقات زيارة - إيصال ${p.receiptNumber}`,
        amount: p.amount,
        type: 'in',
        method: (p.method === 'CARD' ? 'فيزا / كارت' : 'نقدي') as any,
        time: new Date(p.paidAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
        category: 'كشوفات',
      };
    });
    setTransactions(mappedTransactions);
  }, [paymentsCanonical, patientsCanonical]);

  // Synchronize Appointments with Schedule
  useEffect(() => {
    if (appointmentsCanonical.length === 0) return;
    const mappedApps: AppointmentListItem[] = appointmentsCanonical.map((a) => {
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
      };
    });
    setAppointments(mappedApps);
  }, [appointmentsCanonical, patientsCanonical]);

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
      // Default to light mode
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

  // Chronic conditions handlers
  const handleAddChronicCondition = (condition: { id: string; name: string; category: string; color: string }) => {
    setPresetChronicConditions((prev) => [condition, ...prev]);
  };

  const handleRemoveChronicCondition = (id: string) => {
    setPresetChronicConditions((prev) => prev.filter((c) => c.id !== id));
  };

  // Catalog Handlers with Soft Delete (active: false)
  const handleAddRadiologyToCatalog = (item: RadiologyCatalogItem) => {
    setRadiologyCatalog((prev) => [{ ...item, active: true }, ...prev]);
    const newRadType: RadiologyType = {
      radiologyId: item.id,
      nameAr: item.name,
      nameEn: item.name,
      category: item.category,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setRadiologyTypesCanonical((prev) => [newRadType, ...prev]);
  };
  const handleRemoveRadiology = (id: string) => {
    // Soft delete: active = false
    setRadiologyCatalog((prev) =>
      prev.map((r) => (r.id === id ? { ...r, active: false } : r)).filter((r) => r.active !== false)
    );
    setRadiologyTypesCanonical((prev) =>
      prev.map((r) => (r.radiologyId === id ? { ...r, active: false, updatedAt: new Date().toISOString() } : r))
    );
  };
  const handleToggleRadiologyFavorite = (id: string) => {
    setRadiologyCatalog((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isFavorite: !r.isFavorite } : r))
    );
  };

  const handleAddLabToCatalog = (item: LabCatalogItem) => {
    setLabCatalog((prev) => [{ ...item, active: true }, ...prev]);
    const newLab: LabTest = {
      labTestId: item.id,
      nameAr: item.name,
      nameEn: item.name,
      category: item.category,
      sampleType: item.sampleType || 'عينة دم وريدي',
      fastingRequired: item.fastingRequired || false,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setLabTestsCanonical((prev) => [newLab, ...prev]);
  };
  const handleRemoveLab = (id: string) => {
    // Soft delete: active = false
    setLabCatalog((prev) =>
      prev.map((l) => (l.id === id ? { ...l, active: false } : l)).filter((l) => l.active !== false)
    );
    setLabTestsCanonical((prev) =>
      prev.map((l) => (l.labTestId === id ? { ...l, active: false, updatedAt: new Date().toISOString() } : l))
    );
  };
  const handleToggleLabFavorite = (id: string) => {
    setLabCatalog((prev) =>
      prev.map((l) => (l.id === id ? { ...l, isFavorite: !l.isFavorite } : l))
    );
  };

  const handleAddDrugToCatalog = (item: DrugCatalogItem) => {
    setDrugCatalog((prev) => [{ ...item, active: true }, ...prev]);
    const newMed: Medication = {
      medicationId: item.id,
      nameAr: item.brandName,
      nameEn: item.genericName,
      genericName: item.genericName,
      strength: item.strength,
      form: item.form,
      manufacturer: 'شركات الأدوية المعتمدة',
      active: true,
      source: 'CUSTOM',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setMedicationsCanonical((prev) => [newMed, ...prev]);
  };
  const handleRemoveDrug = (id: string) => {
    // Soft delete
    setDrugCatalog((prev) =>
      prev.map((d) => (d.id === id ? { ...d, active: false } : d)).filter((d) => d.active !== false)
    );
    setMedicationsCanonical((prev) =>
      prev.map((d) => (d.medicationId === id ? { ...d, active: false, updatedAt: new Date().toISOString() } : d))
    );
  };
  const handleToggleDrugFavorite = (id: string) => {
    setDrugCatalog((prev) =>
      prev.map((d) => (d.id === id ? { ...d, isFavorite: !d.isFavorite } : d))
    );
  };

  const handleAddDiagnosisToCatalog = (item: DiagnosisCatalogItem) => {
    setDiagnosesCatalog((prev) => [{ ...item, active: true }, ...prev]);
    const newDiag: Diagnosis = {
      diagnosisId: item.id,
      nameAr: item.nameAr,
      nameEn: item.nameEn,
      code: item.code,
      codeSystem: 'ICD10',
      active: true,
      createdAt: new Date().toISOString(),
    };
    setDiagnosesCanonical((prev) => [newDiag, ...prev]);
  };
  const handleRemoveDiagnosis = (id: string) => {
    // Soft delete
    setDiagnosesCatalog((prev) =>
      prev.map((d) => (d.id === id ? { ...d, active: false } : d)).filter((d) => d.active !== false)
    );
    setDiagnosesCanonical((prev) =>
      prev.map((d) => (d.diagnosisId === id ? { ...d, active: false } : d))
    );
  };
  const handleToggleDiagnosisFavorite = (id: string) => {
    setDiagnosesCatalog((prev) =>
      prev.map((d) => (d.id === id ? { ...d, isFavorite: !d.isFavorite } : d))
    );
  };

  const handleAddSymptomToCatalog = (item: SymptomCatalogItem) => {
    setSymptomsCatalog((prev) => [{ ...item, active: true }, ...prev]);
    const newSym: Symptom = {
      symptomId: item.id,
      nameAr: item.name,
      nameEn: item.name,
      category: item.category,
      active: true,
    };
    setSymptomsCanonical((prev) => [newSym, ...prev]);
  };
  const handleRemoveSymptom = (id: string) => {
    // Soft delete
    setSymptomsCatalog((prev) =>
      prev.map((s) => (s.id === id ? { ...s, active: false } : s)).filter((s) => s.active !== false)
    );
    setSymptomsCanonical((prev) =>
      prev.map((s) => (s.symptomId === id ? { ...s, active: false } : s))
    );
  };

  // Next sequential file number
  const nextFileNumber =
    Math.max(
      ...patientsCanonical.map((p) => (typeof p.fileNumber === 'number' ? p.fileNumber : 0)),
      ...patients.map((p) => (typeof p.fileNumber === 'number' ? p.fileNumber : 0)),
      0
    ) + 1;

  // Audio / Visual Call Patient Handler
  const handleCallPatient = async (ticket: string, name: string) => {
    setCallingBanner({ ticket, name });
    setTimeout(() => setCallingBanner(null), 5000);

    // Update matching visit in visitsCanonical to IN_PROGRESS
    const targetQueueNum = parseInt(ticket.replace(/\D/g, ''), 10);
    const targetVisit = visitsCanonical.find((v) => v.queueNumber === targetQueueNum);
    if (!targetVisit) return;
    if (db) {
      try {
        await startVisitTransaction(db, targetVisit.visitId, auth?.currentUser?.uid || 'doctor');
      } catch (error) {
        alert(error instanceof Error ? error.message : 'تعذر بدء الكشف');
        return;
      }
    }
    setVisitsCanonical((prev) => prev.map((v) => v.visitId === targetVisit.visitId ? startVisit(v, 'DOCTOR') : v));
  };

  // Check in appointment: Firestore transaction commits ARRIVED + Invoice + Payment + Visit
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
    const nextQueueNum = Math.max(...visitsCanonical.map((v) => v.queueNumber || 0), 0) + 1;
    if (db) {
      try {
        await checkInAppointmentTransaction({
          db, appointmentId: appt.appointmentId, paymentAmount: fee, paymentMethod: paymentMethodEnum,
          receivedBy: auth?.currentUser?.uid || 'receptionist', queueNumber: nextQueueNum,
          receptionistData: { symptoms: app.visitType, chronicDiseases: patient.chronicDiseases || [], notes: '' },
        });
        setAppointmentsCanonical((prev) => prev.map((item) => item.appointmentId === appt.appointmentId ? { ...item, status: 'ARRIVED' } : item));
        return;
      } catch (error) {
        alert(error instanceof Error ? error.message : 'فشل التحصيل الذري؛ لم يتم إنشاء زيارة انتظار');
        return;
      }
    }
    const matchedService = services.find((service) => service.price === fee) || services[0];
    const result = executeAtomicArrival({ appointment: appt, patient, service: matchedService, paymentMethod: paymentMethodEnum, receivedBy: 'reception', nextQueueNumber: nextQueueNum, receptionistData: { symptoms: app.visitType, chronicDiseases: patient.chronicDiseases || [], notes: '' } });
    setAppointmentsCanonical((prev) => prev.map((item) => item.appointmentId === appt.appointmentId ? result.updatedAppointment : item));
    setInvoicesCanonical((prev) => [result.newInvoice, ...prev]);
    setPaymentsCanonical((prev) => [result.newPayment, ...prev]);
    setVisitsCanonical((prev) => [result.newVisit, ...prev]);
  };

  // Walk-in: Patient + Invoice + Payment + Visit are committed in one transaction
  const handleAddPatientToQueue = async (item: QueueItem) => {
    const timestamp = new Date().toISOString();
    const patient = patientsCanonical.find((p) => p.phone === item.phone || p.fullName === item.patientName) || {
      patientId: `pat-${crypto.randomUUID()}`, fullName: item.patientName, phone: item.phone, gender: 'male' as const,
      fileNumber: item.fileNumber || nextFileNumber, medicalCode: item.medicalCode, chronicDiseases: item.chronicConditions || [],
      allergies: [], createdAt: timestamp, updatedAt: timestamp, createdBy: auth?.currentUser?.uid,
    };
    const paymentMethodEnum = item.paymentMethod.includes('فيزا') || item.paymentMethod.includes('كارت') ? 'CARD' : 'CASH';
    const nextQueueNum = Math.max(...visitsCanonical.map((v) => v.queueNumber || 0), 0) + 1;
    if (db) {
      try {
        const visit = await registerWalkInTransaction({ db, patient, paymentAmount: item.paidAmount, paymentMethod: paymentMethodEnum, receivedBy: auth?.currentUser?.uid || 'receptionist', clinicLocationId: 'loc-mohandessin', queueNumber: nextQueueNum, receptionistData: { symptoms: item.complaint || '', chronicDiseases: patient.chronicDiseases || [], notes: '' } });
        if (!patientsCanonical.some((p) => p.patientId === patient.patientId)) setPatientsCanonical((prev) => [patient, ...prev]);
        setVisitsCanonical((prev) => [visit, ...prev]);
        return;
      } catch (error) {
        alert(error instanceof Error ? error.message : 'فشل التحصيل؛ لم يتم إنشاء زيارة انتظار');
        return;
      }
    }
    const matchedService = services.find((service) => service.price === item.paidAmount) || services[0];
    const result = executeAtomicWalkIn({ patient, service: matchedService, clinicLocationId: 'loc-mohandessin', paymentMethod: paymentMethodEnum, receivedBy: 'reception', nextQueueNumber: nextQueueNum, receptionistData: { symptoms: item.complaint || '', chronicDiseases: patient.chronicDiseases || [], notes: '' } });
    if (!patientsCanonical.some((p) => p.patientId === patient.patientId)) setPatientsCanonical((prev) => [patient, ...prev]);
    setInvoicesCanonical((prev) => [result.newInvoice, ...prev]);
    setPaymentsCanonical((prev) => [result.newPayment, ...prev]);
    setVisitsCanonical((prev) => [result.newVisit, ...prev]);
  };

  // Add scheduled appointment: Patient first, then Appointment in one Firestore transaction
  const handleAddAppointment = async (app: AppointmentListItem) => {
    const timestamp = new Date().toISOString();
    const existingPatient = patientsCanonical.find(
      (p) => p.fullName.trim() === app.patientName.trim() || (!!app.phone && p.phone === app.phone),
    );
    const patient: Patient = existingPatient || {
      patientId: `pat-${crypto.randomUUID()}`,
      fullName: app.patientName.trim(),
      ...(app.phone ? { phone: app.phone } : {}),
      ...(app.medicalCode ? { medicalCode: app.medicalCode } : {}),
      ...(app.fileNumber ? { fileNumber: app.fileNumber } : {}),
      createdAt: timestamp,
      updatedAt: timestamp,
      createdBy: auth?.currentUser?.uid,
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
      createdBy: auth?.currentUser?.uid,
    };
    if (db) {
      try {
        await createAppointmentTransaction({ db, patient, appointment: newApp });
      } catch (error) {
        alert(error instanceof Error ? error.message : 'تعذر حفظ الموعد في قاعدة البيانات');
        return;
      }
    }
    if (!existingPatient) setPatientsCanonical((prev) => [patient, ...prev]);
    setAppointmentsCanonical((prev) => [newApp, ...prev]);
    setAppointments((prev) => [app, ...prev]);
  };

  // Finish examination: ATOMIC COMPLETE VISIT WORKFLOW 
  const handleFinishExam = async () => {
    // Find the currently active or first waiting visit
    const activeWaiting =
      visitsCanonical.find((v) => v.status === 'IN_PROGRESS');

    if (activeWaiting) {
      const rxSnapshots = activePrescription.map((item) => ({
        medicationId: null,
        name: item.drugName,
        strength: item.scientificName || '',
        form: item.dosageForm || 'أقراص',
        dose: item.dosage || 'قرص واحد',
        frequency: item.dosage || 'يومياً',
        duration: item.duration,
        instructions: 'تناول العلاج وفق الإرشادات الموضحة بالروشتة',
      }));

      const clinicalData = {
        chiefComplaint: activeWaiting.receptionistData?.symptoms || '',
        history: '',
        examination: '',
        diagnosis: [],
        treatment: '',
      };
      const vitalSigns = activeWaiting.vitalSigns;
      if (db) {
        try {
          await completeVisitTransaction({ db, visitId: activeWaiting.visitId, doctorId: auth?.currentUser?.uid || 'doctor', clinicalData, vitalSigns });
        } catch (error) {
          alert(error instanceof Error ? error.message : 'تعذر حفظ وإنهاء الزيارة');
          return;
        }
      }
      const { completedVisit, newPrescription, createdLabOrders, createdRadiologyOrders, createdFollowUp } =
        executeCompleteVisit({
          visit: activeWaiting,
          clinicalData: {
            chiefComplaint: activeWaiting.receptionistData?.symptoms || 'فحص باطنة شامل',
            history: 'متابعة سريرية متكاملة',
            examination: 'العلامات الحيوية وفحص القلب والصدر مستقر',
            diagnosis: [],
            treatment: '',
          },
          vitalSigns: activeWaiting.vitalSigns || {
            bloodPressure: '120/80',
            pulse: 76,
            temperature: 37,
            bloodSugar: 130,
            weightKg: 80,
            oxygenSaturation: 98,
          },
          prescriptionItems: rxSnapshots,
          prescriptionNotes: 'مع أطيب تمنياتنا بالشفاء العاجل',
          labOrders: [],
          radiologyOrders: [],
          followUp: {
            scheduledDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
            fee: 0,
            isFree: true, // Snapshot of 14-day free follow-up policy
            notes: 'استشارة مجانية للمتابعة خلال 14 يوماً من تاريخ الكشف',
          },
        });

      setVisitsCanonical((prev) =>
        prev.map((v) => (v.visitId === completedVisit.visitId ? completedVisit : v))
      );
      setPrescriptionsCanonical((prev) => [newPrescription, ...prev]);
      setLabOrdersCanonical((prev) => [...createdLabOrders, ...prev]);
      setRadiologyOrdersCanonical((prev) => [...createdRadiologyOrders, ...prev]);
      if (createdFollowUp) {
        setFollowUpsCanonical((prev) => [createdFollowUp, ...prev]);
      }
    }

    if (queue.length > 0) {
      setQueue((prev) => prev.slice(1));
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
      <div className="flex-1 mr-0 lg:mr-72 flex flex-col min-h-screen">
        {/* Top Header */}
        <Header
          onOpenDatabaseInspector={() => setIsDatabaseInspectorOpen(true)}
          onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
        />

        {/* Global Live Call Patient Alert (Simulating Speaker Broadcast) */}
        {callingBanner && (
          <div className="fixed top-18 right-4 lg:right-80 left-4 lg:left-8 z-50 bg-white dark:bg-[#18233C] border-2 border-[#00c2cb] rounded-2xl p-4 shadow-2xl flex items-center justify-between animate-in slide-in-from-top-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#00c2cb] text-[#08101C] flex items-center justify-center font-black shrink-0">
                <span className="material-symbols-outlined text-xl sm:text-2xl animate-pulse">campaign</span>
              </div>
              <div>
                <span className="text-xs font-mono font-bold text-[#008f97] dark:text-[#45dee7]">
                  نداء صوتي صادر عبر مكبر صالة الانتظار:
                </span>
                <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-[#dde2f5]">
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
        <main className="flex-1 mt-16 p-3 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto overflow-x-hidden">
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
                  onAddChronicCondition={handleAddChronicCondition}
                  onNavigate={handleNavigate}
                  nextFileNumber={nextFileNumber}
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
                  patient={activeExamPatient}
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
                  patient={activeExamPatient}
                  items={activePrescription}
                  onChangeItems={setActivePrescription}
                />
              )}

              {activeScreen === 'patient-records' && (
                <PatientListItemsScreen
                  patients={patients}
                  onNavigate={handleNavigate}
                  onSelectPatientForExam={(p) => setActiveExamPatient(p)}
                />
              )}

              {(activeScreen === 'finance' || activeScreen === 'billing-payments') && (
                <FinanceScreen
                  transactions={transactions}
                  onAddTransaction={(tx) => setTransactions((prev) => [tx, ...prev])}
                />
              )}

              {activeScreen === 'clinical-reports' && (
                <ClinicalReportsScreen />
              )}

              {activeScreen === 'prescriptions-catalog' && (
                <PrescriptionCatalogScreen
                  onNavigate={handleNavigate}
                  onApplyProtocolToPrescription={(_prot: ClinicProtocol) => {
                    // Pre-loads into prescription pad
                  }}
                />
              )}

              {(activeScreen === 'settings' || activeScreen === 'system-settings') && (
                <SettingsScreen
                  presetChronicConditions={presetChronicConditions}
                  onAddChronicCondition={handleAddChronicCondition}
                  onRemoveChronicCondition={handleRemoveChronicCondition}
                  radiologyCatalog={radiologyCatalog}
                  onAddRadiology={handleAddRadiologyToCatalog}
                  onRemoveRadiology={handleRemoveRadiology}
                  onToggleRadiologyFavorite={handleToggleRadiologyFavorite}
                  labCatalog={labCatalog}
                  onAddLab={handleAddLabToCatalog}
                  onRemoveLab={handleRemoveLab}
                  onToggleLabFavorite={handleToggleLabFavorite}
                  drugCatalog={drugCatalog}
                  onAddDrug={handleAddDrugToCatalog}
                  onRemoveDrug={handleRemoveDrug}
                  onToggleDrugFavorite={handleToggleDrugFavorite}
                  diagnosesCatalog={diagnosesCatalog}
                  onAddDiagnosis={handleAddDiagnosisToCatalog}
                  onRemoveDiagnosis={handleRemoveDiagnosis}
                  onToggleDiagnosisFavorite={handleToggleDiagnosisFavorite}
                  symptomsCatalog={symptomsCatalog}
                  onAddSymptom={handleAddSymptomToCatalog}
                  onRemoveSymptom={handleRemoveSymptom}
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

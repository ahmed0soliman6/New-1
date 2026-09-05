import React, { useState, useEffect } from 'react';
import {
  ScreenType,
  ScheduledAppointment,
  QueueItem,
  TransactionRecord,
  PatientRecord,
  RadiologyCatalogItem,
  LabCatalogItem,
  DrugCatalogItem,
  DiagnosisCatalogItem,
  SymptomCatalogItem,
  PrescriptionItem,
} from './types';
import {
  INITIAL_APPOINTMENTS,
  INITIAL_QUEUE,
  INITIAL_TRANSACTIONS,
  INITIAL_PATIENTS,
  DEFAULT_CHRONIC_CONDITIONS,
  ClinicProtocol,
} from './data/mockClinicData';
import {
  DEFAULT_RADIOLOGY_CATALOG,
  DEFAULT_LAB_CATALOG,
  DEFAULT_DRUG_CATALOG,
  DEFAULT_DIAGNOSES_CATALOG,
  DEFAULT_SYMPTOMS_CATALOG,
} from './data/mockMedicalCatalogs';
import {
  INITIAL_USERS,
  INITIAL_DOCTOR_PROFILE,
  INITIAL_CLINIC_LOCATIONS,
  INITIAL_SERVICES,
  INITIAL_PATIENTS_V1,
  INITIAL_APPOINTMENTS_V1,
  INITIAL_VISITS_V1,
  INITIAL_INVOICES_V1,
  INITIAL_PAYMENTS_V1,
  INITIAL_FOLLOWUPS_V1,
  INITIAL_PRESCRIPTIONS_V1,
  INITIAL_MEDICATIONS_V1,
  INITIAL_LAB_TESTS_V1,
  INITIAL_LAB_ORDERS_V1,
  INITIAL_RADIOLOGY_TYPES_V1,
  INITIAL_RADIOLOGY_ORDERS_V1,
  INITIAL_DIAGNOSES_V1,
  INITIAL_SYMPTOMS_V1,
  INITIAL_CHRONIC_DISEASES_V1,
  INITIAL_DOCTOR_SETTINGS_V1,
  INITIAL_SYSTEM_SETTINGS_V1,
  executeAtomicArrival,
  executeAtomicWalkIn,
  executeCompleteVisit,
} from './data/databaseV1';
import {
  User,
  DoctorProfile,
  ClinicLocation,
  Patient as PatientV1,
  Appointment as AppointmentV1,
  Visit as VisitV1,
  Invoice as InvoiceV1,
  Payment as PaymentV1,
  ServiceItem as ServiceItemV1,
  FollowUp as FollowUpV1,
  Prescription as PrescriptionV1,
  Medication as MedicationV1,
  LabTest as LabTestV1,
  LabOrder as LabOrderV1,
  RadiologyType as RadiologyTypeV1,
  RadiologyOrder as RadiologyOrderV1,
  Diagnosis as DiagnosisV1,
  Symptom as SymptomV1,
  ChronicDisease as ChronicDiseaseV1,
  DoctorSettings as DoctorSettingsV1,
  SystemSettings as SystemSettingsV1,
} from './types/database';
import { DatabaseV1InspectorModal } from './components/database/DatabaseV1InspectorModal';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardScreen } from './components/screens/DashboardScreen';
import { PatientIntakeScreen } from './components/screens/PatientIntakeScreen';
import { QueueScreen } from './components/screens/QueueScreen';
import { AppointmentsScreen } from './components/screens/AppointmentsScreen';
import { ExaminationScreen } from './components/screens/ExaminationScreen';
import { PrescriptionPadScreen } from './components/screens/PrescriptionPadScreen';
import { PatientRecordsScreen } from './components/screens/PatientRecordsScreen';
import { FinanceScreen } from './components/screens/FinanceScreen';
import { SettingsScreen } from './components/screens/SettingsScreen';
import { ClinicalReportsScreen } from './components/screens/ClinicalReportsScreen';
import { PrescriptionCatalogScreen } from './components/screens/PrescriptionCatalogScreen';
import { NewAppointmentModal } from './components/modals/NewAppointmentModal';

export default function App() {
  const [activeScreen, setActiveScreen] = useState<ScreenType>('dashboard');
  const [selectedBranch, setSelectedBranch] = useState<string>('mohandessin');
  const [theme, setTheme] = useState<'light' | 'dark'>('light'); // Day/Light mode enabled by default
  const [appointments, setAppointments] = useState<ScheduledAppointment[]>(INITIAL_APPOINTMENTS);
  const [queue, setQueue] = useState<QueueItem[]>(INITIAL_QUEUE);
  const [transactions, setTransactions] = useState<TransactionRecord[]>(INITIAL_TRANSACTIONS);
  const [patients, setPatients] = useState<PatientRecord[]>(INITIAL_PATIENTS);
  const [activeExamPatient, setActiveExamPatient] = useState<PatientRecord>(INITIAL_PATIENTS[0]);

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
  // SOLI MEDICAL DATABASE ARCHITECTURE V1 STATE
  // =========================================================================
  const [usersV1] = useState<User[]>(INITIAL_USERS);
  const [doctorProfileV1, setDoctorProfileV1] = useState<DoctorProfile>(INITIAL_DOCTOR_PROFILE);
  const [clinicLocationsV1, setClinicLocationsV1] = useState<ClinicLocation[]>(INITIAL_CLINIC_LOCATIONS);
  const [servicesV1, setServicesV1] = useState<ServiceItemV1[]>(INITIAL_SERVICES);
  const [patientsV1, setPatientsV1] = useState<PatientV1[]>(INITIAL_PATIENTS_V1);
  const [appointmentsV1, setAppointmentsV1] = useState<AppointmentV1[]>(INITIAL_APPOINTMENTS_V1);
  const [visitsV1, setVisitsV1] = useState<VisitV1[]>(INITIAL_VISITS_V1);
  const [invoicesV1, setInvoicesV1] = useState<InvoiceV1[]>(INITIAL_INVOICES_V1);
  const [paymentsV1, setPaymentsV1] = useState<PaymentV1[]>(INITIAL_PAYMENTS_V1);
  const [followUpsV1, setFollowUpsV1] = useState<FollowUpV1[]>(INITIAL_FOLLOWUPS_V1);
  const [prescriptionsV1, setPrescriptionsV1] = useState<PrescriptionV1[]>(INITIAL_PRESCRIPTIONS_V1);
  const [medicationsV1, setMedicationsV1] = useState<MedicationV1[]>(INITIAL_MEDICATIONS_V1);
  const [labTestsV1, setLabTestsV1] = useState<LabTestV1[]>(INITIAL_LAB_TESTS_V1);
  const [labOrdersV1, setLabOrdersV1] = useState<LabOrderV1[]>(INITIAL_LAB_ORDERS_V1);
  const [radiologyTypesV1, setRadiologyTypesV1] = useState<RadiologyTypeV1[]>(INITIAL_RADIOLOGY_TYPES_V1);
  const [radiologyOrdersV1, setRadiologyOrdersV1] = useState<RadiologyOrderV1[]>(INITIAL_RADIOLOGY_ORDERS_V1);
  const [diagnosesV1, setDiagnosesV1] = useState<DiagnosisV1[]>(INITIAL_DIAGNOSES_V1);
  const [symptomsV1, setSymptomsV1] = useState<SymptomV1[]>(INITIAL_SYMPTOMS_V1);
  const [chronicDiseasesV1, setChronicDiseasesV1] = useState<ChronicDiseaseV1[]>(INITIAL_CHRONIC_DISEASES_V1);
  const [doctorSettingsV1, setDoctorSettingsV1] = useState<DoctorSettingsV1>(INITIAL_DOCTOR_SETTINGS_V1);
  const [systemSettingsV1, setSystemSettingsV1] = useState<SystemSettingsV1>(INITIAL_SYSTEM_SETTINGS_V1);

  // Database V1 Architecture Inspector Modal
  const [isDatabaseInspectorOpen, setIsDatabaseInspectorOpen] = useState(false);

  // Synchronize V1 Collections with UI representations
  useEffect(() => {
    // 1. Queue is a VIEW derived from visitsV1 where status == "WAITING"
    const waitingVisits = visitsV1
      .filter((v) => v.status === 'WAITING')
      .sort((a, b) => (a.queueNumber || 0) - (b.queueNumber || 0));

    const mappedQueue: QueueItem[] = waitingVisits.map((v) => {
      const pat = patientsV1.find((p) => p.patientId === v.patientId);
      const invoice = invoicesV1.find((i) => i.visitId === v.visitId);
      const payment = paymentsV1.find((p) => p.visitId === v.visitId);
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
  }, [visitsV1, patientsV1, invoicesV1, paymentsV1]);

  // Synchronize Payments with Finance Ledger
  useEffect(() => {
    const mappedTransactions: TransactionRecord[] = paymentsV1.map((p) => {
      const pat = patientsV1.find((pt) => pt.patientId === p.patientId);
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
  }, [paymentsV1, patientsV1]);

  // Synchronize Appointments with Schedule
  useEffect(() => {
    const mappedApps: ScheduledAppointment[] = appointmentsV1.map((a) => {
      const pat = patientsV1.find((p) => p.patientId === a.patientId);
      return {
        id: a.appointmentId,
        patientName: pat?.fullName || 'مريض محجوز مسبقاً',
        medicalCode: pat?.medicalCode || 'EG-NEW',
        fileNumber: pat?.fileNumber,
        phone: pat?.phone || '',
        date: a.scheduledDate,
        time: a.scheduledTime,
        visitType: a.visitType,
        status: a.status === 'ARRIVED' ? 'حضر وسدد' : a.status === 'CANCELLED' ? 'ملغي' : 'مجدول',
        expectedFee: 350,
      };
    });
    setAppointments(mappedApps);
  }, [appointmentsV1, patientsV1]);

  // Modals
  const [isNewAppointmentOpen, setIsNewAppointmentOpen] = useState(false);

  // Sound/Announcement banner
  const [callingBanner, setCallingBanner] = useState<{ ticket: string; name: string } | null>(null);

  // Synchronize Theme class on HTML document root
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
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
    const newRadType: RadiologyTypeV1 = {
      radiologyId: item.id,
      nameAr: item.name,
      nameEn: item.name,
      category: item.category,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setRadiologyTypesV1((prev) => [newRadType, ...prev]);
  };
  const handleRemoveRadiology = (id: string) => {
    // Soft delete: active = false
    setRadiologyCatalog((prev) =>
      prev.map((r) => (r.id === id ? { ...r, active: false } : r)).filter((r) => r.active !== false)
    );
    setRadiologyTypesV1((prev) =>
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
    const newLab: LabTestV1 = {
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
    setLabTestsV1((prev) => [newLab, ...prev]);
  };
  const handleRemoveLab = (id: string) => {
    // Soft delete: active = false
    setLabCatalog((prev) =>
      prev.map((l) => (l.id === id ? { ...l, active: false } : l)).filter((l) => l.active !== false)
    );
    setLabTestsV1((prev) =>
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
    const newMed: MedicationV1 = {
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
    setMedicationsV1((prev) => [newMed, ...prev]);
  };
  const handleRemoveDrug = (id: string) => {
    // Soft delete
    setDrugCatalog((prev) =>
      prev.map((d) => (d.id === id ? { ...d, active: false } : d)).filter((d) => d.active !== false)
    );
    setMedicationsV1((prev) =>
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
    const newDiag: DiagnosisV1 = {
      diagnosisId: item.id,
      nameAr: item.nameAr,
      nameEn: item.nameEn,
      code: item.code,
      codeSystem: 'ICD10',
      active: true,
      createdAt: new Date().toISOString(),
    };
    setDiagnosesV1((prev) => [newDiag, ...prev]);
  };
  const handleRemoveDiagnosis = (id: string) => {
    // Soft delete
    setDiagnosesCatalog((prev) =>
      prev.map((d) => (d.id === id ? { ...d, active: false } : d)).filter((d) => d.active !== false)
    );
    setDiagnosesV1((prev) =>
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
    const newSym: SymptomV1 = {
      symptomId: item.id,
      nameAr: item.name,
      nameEn: item.name,
      category: item.category,
      active: true,
    };
    setSymptomsV1((prev) => [newSym, ...prev]);
  };
  const handleRemoveSymptom = (id: string) => {
    // Soft delete
    setSymptomsCatalog((prev) =>
      prev.map((s) => (s.id === id ? { ...s, active: false } : s)).filter((s) => s.active !== false)
    );
    setSymptomsV1((prev) =>
      prev.map((s) => (s.symptomId === id ? { ...s, active: false } : s))
    );
  };

  // Next sequential file number
  const nextFileNumber =
    Math.max(
      ...patientsV1.map((p) => (typeof p.fileNumber === 'number' ? p.fileNumber : 0)),
      ...patients.map((p) => (typeof p.fileNumber === 'number' ? p.fileNumber : 0)),
      0
    ) + 1;

  // Audio / Visual Call Patient Handler
  const handleCallPatient = (ticket: string, name: string) => {
    setCallingBanner({ ticket, name });
    setTimeout(() => setCallingBanner(null), 5000);

    // Update matching visit in visitsV1 to IN_PROGRESS
    const targetQueueNum = parseInt(ticket.replace(/\D/g, ''), 10);
    setVisitsV1((prev) =>
      prev.map((v) =>
        v.queueNumber === targetQueueNum
          ? { ...v, status: 'IN_PROGRESS', startedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
          : v
      )
    );
  };

  // Check in appointment: ATOMIC ARRIVAL WORKFLOW V1
  const handleConfirmCheckIn = (
    app: ScheduledAppointment,
    fee: number,
    method: string = 'نقدي'
  ) => {
    // 1. Locate appointment in V1
    const appt = appointmentsV1.find((a) => a.appointmentId === app.id) || {
      appointmentId: app.id,
      patientId: `pat-${Date.now()}`,
      clinicLocationId: 'loc-mohandessin',
      scheduledDate: new Date().toISOString().split('T')[0],
      scheduledTime: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      visitType: app.visitType,
      status: 'SCHEDULED' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    let pat = patientsV1.find((p) => p.patientId === appt.patientId || p.fullName === app.patientName);
    if (!pat) {
      pat = {
        patientId: appt.patientId,
        fullName: app.patientName, // REQUIRED
        phone: app.phone,
        medicalCode: app.medicalCode,
        fileNumber: app.fileNumber,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'user-rec-1',
      };
      setPatientsV1((prev) => [pat!, ...prev]);
    }

    const nextQueueNum = Math.max(...visitsV1.map((v) => v.queueNumber || 0), 0) + 1;
    const matchedService = servicesV1.find((s) => s.price === fee) || servicesV1[0];

    const paymentMethodEnum: 'CASH' | 'CARD' | 'TRANSFER' | 'OTHER' =
      method.includes('فيزا') || method.includes('كارت') ? 'CARD' : method.includes('إنستا') ? 'TRANSFER' : 'CASH';

    // Execute Atomic Arrival: Appointment (ARRIVED) + Invoice + Payment + Visit (WAITING)
    const { updatedAppointment, newInvoice, newPayment, newVisit } = executeAtomicArrival({
      appointment: appt,
      patient: pat,
      service: matchedService,
      paymentMethod: paymentMethodEnum,
      receivedBy: 'سارة عبد المنعم (الاستقبال)',
      nextQueueNumber: nextQueueNum,
      receptionistData: {
        symptoms: 'حضور موعد كشف باطنة وقائي مسجل',
        chronicDiseases: pat.chronicDiseases || [],
        notes: '',
      },
    });

    setAppointmentsV1((prev) =>
      prev.map((a) => (a.appointmentId === updatedAppointment.appointmentId ? updatedAppointment : a))
    );
    setInvoicesV1((prev) => [newInvoice, ...prev]);
    setPaymentsV1((prev) => [newPayment, ...prev]);
    setVisitsV1((prev) => [newVisit, ...prev]);
  };

  // Add walk-in patient from Intake screen: ATOMIC WALK-IN WORKFLOW V1
  const handleAddPatientToQueue = (item: QueueItem) => {
    let pat = patientsV1.find((p) => p.phone === item.phone || p.fullName === item.patientName);
    if (!pat) {
      pat = {
        patientId: `pat-${Date.now()}`,
        fullName: item.patientName, // REQUIRED
        phone: item.phone,
        gender: 'male',
        fileNumber: item.fileNumber || nextFileNumber,
        medicalCode: item.medicalCode,
        chronicDiseases: item.chronicConditions || [],
        allergies: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'user-rec-1',
      };
      setPatientsV1((prev) => [pat!, ...prev]);

      // Legacy patient sync
      const newP: PatientRecord = {
        id: pat.patientId,
        fileNumber: pat.fileNumber || nextFileNumber,
        medicalCode: pat.medicalCode,
        name: pat.fullName,
        phone: pat.phone,
        age: item.age,
        gender: 'male',
        bloodType: 'O+',
        governorate: item.address || 'القاهرة / الجيزة',
        chronicConditions: item.chronicConditions || [],
        allergies: [],
        lastVisitDate: new Date().toLocaleDateString('ar-EG'),
        accountBalance: 0,
        visitsCount: 1,
      };
      setPatients((prev) => [newP, ...prev]);
    }

    const nextQueueNum = Math.max(...visitsV1.map((v) => v.queueNumber || 0), 0) + 1;
    const matchedService = servicesV1.find((s) => s.price === item.paidAmount) || servicesV1[0];

    const paymentMethodEnum: 'CASH' | 'CARD' | 'TRANSFER' | 'OTHER' =
      item.paymentMethod.includes('فيزا') || item.paymentMethod.includes('كارت') ? 'CARD' : 'CASH';

    // Execute Atomic Walk-In: Patient + Invoice + Payment + Visit (WAITING)
    const { newInvoice, newPayment, newVisit } = executeAtomicWalkIn({
      patient: pat,
      service: matchedService,
      clinicLocationId: 'loc-mohandessin',
      paymentMethod: paymentMethodEnum,
      receivedBy: 'سارة عبد المنعم (الاستقبال)',
      nextQueueNumber: nextQueueNum,
      receptionistData: {
        symptoms: item.complaint || 'كشف فوري بعيادة الباطنة (Walk-in)',
        chronicDiseases: item.chronicConditions || [],
        notes: '',
      },
    });

    setInvoicesV1((prev) => [newInvoice, ...prev]);
    setPaymentsV1((prev) => [newPayment, ...prev]);
    setVisitsV1((prev) => [newVisit, ...prev]);
  };

  // Add scheduled appointment from Modal
  const handleAddAppointment = (app: ScheduledAppointment) => {
    setAppointments((prev) => [app, ...prev]);

    const newAppV1: AppointmentV1 = {
      appointmentId: `app-${Date.now()}`,
      patientId: `pat-${Date.now()}`,
      clinicLocationId: 'loc-mohandessin',
      scheduledDate: new Date().toISOString().split('T')[0],
      scheduledTime: app.timeSlot || '07:30 م',
      visitType: app.visitType,
      status: 'SCHEDULED',
      notes: app.notes || 'حجز موعد كشف مسبق',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setAppointmentsV1((prev) => [newAppV1, ...prev]);
  };

  // Finish examination: ATOMIC COMPLETE VISIT WORKFLOW V1
  const handleFinishExam = () => {
    // Find the currently active or first waiting visit
    const activeWaiting =
      visitsV1.find((v) => v.status === 'IN_PROGRESS') ||
      visitsV1.find((v) => v.status === 'WAITING');

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

      const { completedVisit, newPrescription, createdLabOrders, createdRadiologyOrders, createdFollowUp } =
        executeCompleteVisit({
          visit: activeWaiting,
          clinicalData: {
            chiefComplaint: activeWaiting.receptionistData?.symptoms || 'فحص باطنة شامل',
            history: 'متابعة سريرية متكاملة',
            examination: 'العلامات الحيوية وفحص القلب والصدر مستقر',
            diagnosis: ['داء السكري (النوع الثاني)', 'ارتفاع ضغط دم معتدل'],
            treatment: 'علاج دوائي ونظام حمية غذائية',
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
          labOrders: [
            { testId: 'lab-2', testName: 'السكر التراكمي HbA1c', status: 'ORDERED' },
          ],
          radiologyOrders: [],
          followUp: {
            scheduledDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
            fee: 0,
            isFree: true, // Snapshot of 14-day free follow-up policy
            notes: 'استشارة مجانية للمتابعة خلال 14 يوماً من تاريخ الكشف',
          },
        });

      setVisitsV1((prev) =>
        prev.map((v) => (v.visitId === completedVisit.visitId ? completedVisit : v))
      );
      setPrescriptionsV1((prev) => [newPrescription, ...prev]);
      setLabOrdersV1((prev) => [...createdLabOrders, ...prev]);
      setRadiologyOrdersV1((prev) => [...createdRadiologyOrders, ...prev]);
      if (createdFollowUp) {
        setFollowUpsV1((prev) => [createdFollowUp, ...prev]);
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
      {/* Permanent Right Sidebar Navigation */}
      <Sidebar
        activeScreen={activeScreen}
        onNavigate={setActiveScreen}
        queueCount={queue.length}
      />

      {/* Main Content Area */}
      <div className="flex-1 mr-72 flex flex-col min-h-screen">
        {/* Top Header */}
        <Header
          onOpenNewVisit={() => setActiveScreen('new-visit')}
          onOpenNewAppointment={() => setIsNewAppointmentOpen(true)}
          onOpenDatabaseInspector={() => setIsDatabaseInspectorOpen(true)}
          selectedBranch={selectedBranch}
          onSelectBranch={setSelectedBranch}
          isDark={theme === 'dark'}
          onToggleTheme={toggleTheme}
        />

        {/* Global Live Call Patient Alert (Simulating Speaker Broadcast) */}
        {callingBanner && (
          <div className="fixed top-18 right-80 left-8 z-50 bg-white dark:bg-[#18233C] border-2 border-[#00c2cb] rounded-2xl p-4 shadow-2xl flex items-center justify-between animate-in slide-in-from-top-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#00c2cb] text-[#08101C] flex items-center justify-center font-black">
                <span className="material-symbols-outlined text-2xl animate-pulse">campaign</span>
              </div>
              <div>
                <span className="text-xs font-mono font-bold text-[#008f97] dark:text-[#45dee7]">
                  نداء صوتي صادر عبر مكبر صالة الانتظار:
                </span>
                <h4 className="text-base font-bold text-slate-900 dark:text-[#dde2f5]">
                  تذكرة رقم ({callingBanner.ticket}) — المريض ({callingBanner.name}) يتفضل لغرفة الكشف
                </h4>
              </div>
            </div>
            <button
              onClick={() => setCallingBanner(null)}
              className="text-xs text-slate-500 dark:text-[#859394] hover:text-slate-900 dark:hover:text-white px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-[#080e1b] cursor-pointer"
            >
              إغلاق الإشعار
            </button>
          </div>
        )}

        {/* Main View Container */}
        <main className="flex-1 mt-16 p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {activeScreen === 'dashboard' && (
            <DashboardScreen
              onNavigate={setActiveScreen}
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
              onNavigate={setActiveScreen}
              nextFileNumber={nextFileNumber}
            />
          )}

          {activeScreen === 'waiting-queue' && (
            <QueueScreen
              queue={queue}
              onCallPatient={handleCallPatient}
              onNavigate={setActiveScreen}
            />
          )}

          {(activeScreen === 'appointments' || activeScreen === 'upcoming-followups') && (
            <AppointmentsScreen
              appointments={appointments}
              onCheckInPatient={(app) => handleConfirmCheckIn(app, app.expectedFee, 'نقدي')}
              onOpenNewAppointment={() => setIsNewAppointmentOpen(true)}
              onNavigate={setActiveScreen}
            />
          )}

          {activeScreen === 'clinical-exam' && (
            <ExaminationScreen
              patient={activeExamPatient}
              onNavigate={setActiveScreen}
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
            <PatientRecordsScreen
              patients={patients}
              onNavigate={setActiveScreen}
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
              onNavigate={setActiveScreen}
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
        </main>
      </div>

      {/* Booking Appointment Modal */}
      <NewAppointmentModal
        isOpen={isNewAppointmentOpen}
        onClose={() => setIsNewAppointmentOpen(false)}
        onAddAppointment={handleAddAppointment}
      />

      {/* Database V1 Architecture Inspector Modal */}
      <DatabaseV1InspectorModal
        isOpen={isDatabaseInspectorOpen}
        onClose={() => setIsDatabaseInspectorOpen(false)}
        users={usersV1}
        doctorProfile={doctorProfileV1}
        clinicLocations={clinicLocationsV1}
        patients={patientsV1}
        appointments={appointmentsV1}
        visits={visitsV1}
        invoices={invoicesV1}
        payments={paymentsV1}
        services={servicesV1}
        followUps={followUpsV1}
        prescriptions={prescriptionsV1}
        medications={medicationsV1}
        labTests={labTestsV1}
        labOrders={labOrdersV1}
        radiologyTypes={radiologyTypesV1}
        radiologyOrders={radiologyOrdersV1}
        diagnoses={diagnosesV1}
        symptoms={symptomsV1}
        chronicDiseases={chronicDiseasesV1}
        doctorSettings={doctorSettingsV1}
        systemSettings={systemSettingsV1}
      />
    </div>
  );
}

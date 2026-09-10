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
  LabOrderItem,
  RadiologyOrderItem,
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
  INITIAL_PATIENTS,
  INITIAL_APPOINTMENTS,
  INITIAL_VISITS,
  INITIAL_INVOICES,
  INITIAL_PAYMENTS,
  INITIAL_FOLLOWUPS,
  INITIAL_PRESCRIPTIONS,
  INITIAL_MEDICATIONS,
  INITIAL_LAB_TESTS,
  INITIAL_LAB_ORDERS,
  INITIAL_RADIOLOGY_TYPES,
  INITIAL_RADIOLOGY_ORDERS,
  INITIAL_DIAGNOSES,
  INITIAL_SYMPTOMS,
  INITIAL_CHRONIC_DISEASES,
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
  OrderStatus,
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
import { doc, deleteDoc, setDoc, collection, getDocs, writeBatch } from 'firebase/firestore';
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
  subscribeToDoctorProfile,
  subscribeToDoctorSettings,
  subscribeToPrescriptionSettings,
  saveCatalogItem,
  removeCatalogItem,
} from './services/repositories';
import {
  loadAlertSettings,
  playSingleAlertSound,
  ClinicAlertPayload,
} from './utils/alertManager';

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
  // Dynamic Visit Types Pricing State (Persistence in localStorage)
  const [visitTypesList, setVisitTypesList] = useState<{ id: string; name: string; fee: number }[]>(() => {
    const saved = localStorage.getItem('soli_visit_types');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {
        // ignore
      }
    }
    return [
      { id: 'vt-1', name: 'كشف جديد', fee: 300 },
      { id: 'vt-2', name: 'استشارة / متابعة', fee: 150 },
      { id: 'vt-3', name: 'كشف طوارئ', fee: 400 },
    ];
  });

  const handleAddVisitType = (newType: { id: string; name: string; fee: number }) => {
    setVisitTypesList((prev) => {
      const updated = [...prev, newType];
      localStorage.setItem('soli_visit_types', JSON.stringify(updated));
      return updated;
    });
  };

  const handleRemoveVisitType = (id: string) => {
    setVisitTypesList((prev) => {
      const updated = prev.filter((v) => v.id !== id);
      localStorage.setItem('soli_visit_types', JSON.stringify(updated));
      return updated;
    });
  };

  const handleUpdateVisitTypeFee = (id: string, fee: number) => {
    setVisitTypesList((prev) => {
      const updated = prev.map((v) => (v.id === id ? { ...v, fee } : v));
      localStorage.setItem('soli_visit_types', JSON.stringify(updated));
      return updated;
    });
  };

  const handleGenerateYearlyDemoData = async () => {
    try {
      const { generateOneYearDemoData } = await import('./utils/demoDataGenerator');
      await generateOneYearDemoData(db);
      setSyncRetryCounter((c) => c + 1);
      alert('تم توليد بيانات تجريبية متكاملة لمدى سنة كاملة بنجاح! تشمل سجلات المرضى والزيارات الموزعة، الحجوزات، الفواتير، المقبوضات ومصروفات العيادة المتنوعة لتظهر في التقارير والرسوم البيانية بشكل دقيق.');
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء توليد البيانات التجريبية.');
    }
  };

  const handleClearAllData = async () => {
    try {
      const { clearAllDatabaseCollections } = await import('./utils/demoDataGenerator');
      await clearAllDatabaseCollections(db);
      
      setPatientsCanonical([]);
      setAppointmentsCanonical([]);
      setVisitsCanonical([]);
      setInvoicesCanonical([]);
      setPaymentsCanonical([]);
      setFollowUpsCanonical([]);
      setPrescriptionsCanonical([]);
      setLabOrdersCanonical([]);
      setRadiologyOrdersCanonical([]);

      alert('تم مسح سجلات المرضى والزيارات والفواتير التجريبية والبدء من جديد مع بقاء الإعدادات والأدلة الطبية الثابتة ✓');
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء مسح البيانات.');
    }
  };

  const handleClearBrowserVisitsOnly = async () => {
    try {
      setPatientsCanonical([]);
      setVisitsCanonical([]);
      setInvoicesCanonical([]);
      setPaymentsCanonical([]);
      setAppointmentsCanonical([]);
      setFollowUpsCanonical([]);
      setPrescriptionsCanonical([]);
      setLabOrdersCanonical([]);
      setRadiologyOrdersCanonical([]);

      // Force-reload / Re-fetch the registered database records from Firestore cloud
      setSyncRetryCounter((c) => c + 1);

      alert('تم مسح المرضى، الزيارات والفواتير من ذاكرة المتصفح محلياً، وإعادة استدعاء وجلب البيانات المسجلة على السحابة (Firestore) بنجاح ✓');
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء مسح المتصفح وإعادة الاستدعاء.');
    }
  };

  const handleClearAllBrowserAndCloud = async () => {
    try {
      const { clearAllDatabaseCollections } = await import('./utils/demoDataGenerator');
      await clearAllDatabaseCollections(db);
      
      setPatientsCanonical([]);
      setAppointmentsCanonical([]);
      setVisitsCanonical([]);
      setInvoicesCanonical([]);
      setPaymentsCanonical([]);
      setFollowUpsCanonical([]);
      setPrescriptionsCanonical([]);
      setLabOrdersCanonical([]);
      setRadiologyOrdersCanonical([]);

      alert('تم حذف وتدمير سجلات المرضى والزيارات بالكامل من المتصفح ومن قاعدة بيانات السحابة (Firestore)، مع الاحتفاظ بالإعدادات والأدلة الطبية والروشتة دون تأثر ✓');
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء تدمير ومسح بيانات السحابة.');
    }
  };

  const [activeExamPatient, setActiveExamPatient] = useState<PatientListItem | null>(null);

  // Active Prescription sync state - starts clean
  const [activePrescription, setActivePrescription] = useState<PrescriptionItem[]>([]);

  // =========================================================================
  // SOLI MEDICAL CANONICAL STATE (SINGLE SOURCE OF TRUTH: FIRESTORE)
  // =========================================================================
  const [users] = useState<User[]>(INITIAL_USERS);
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile>(INITIAL_DOCTOR_PROFILE);
  const [clinicLocations] = useState<ClinicLocation[]>(INITIAL_CLINIC_LOCATIONS);
  const [services] = useState<ServiceItem[]>(INITIAL_SERVICES);

  const [patientsCanonical, setPatientsCanonical] = useState<Patient[]>(INITIAL_PATIENTS);
  const [appointmentsCanonical, setAppointmentsCanonical] = useState<Appointment[]>(INITIAL_APPOINTMENTS);
  const [visitsCanonical, setVisitsCanonical] = useState<Visit[]>(INITIAL_VISITS);
  const [invoicesCanonical, setInvoicesCanonical] = useState<Invoice[]>(INITIAL_INVOICES);
  const [paymentsCanonical, setPaymentsCanonical] = useState<Payment[]>(INITIAL_PAYMENTS);
  const [followUpsCanonical, setFollowUpsCanonical] = useState<FollowUp[]>(INITIAL_FOLLOWUPS);
  const [prescriptionsCanonical, setPrescriptionsCanonical] = useState<Prescription[]>(INITIAL_PRESCRIPTIONS);
  const [medicationsCanonical, setMedicationsCanonical] = useState<Medication[]>(INITIAL_MEDICATIONS);
  const [labTestsCanonical, setLabTestsCanonical] = useState<LabTest[]>(INITIAL_LAB_TESTS);
  const [labOrdersCanonical, setLabOrdersCanonical] = useState<LabOrder[]>(INITIAL_LAB_ORDERS);
  const [radiologyTypesCanonical, setRadiologyTypesCanonical] = useState<RadiologyType[]>(INITIAL_RADIOLOGY_TYPES);
  const [radiologyOrdersCanonical, setRadiologyOrdersCanonical] = useState<RadiologyOrder[]>(INITIAL_RADIOLOGY_ORDERS);
  const [diagnosesCanonical, setDiagnosesCanonical] = useState<Diagnosis[]>(INITIAL_DIAGNOSES);
  const [symptomsCanonical, setSymptomsCanonical] = useState<Symptom[]>(INITIAL_SYMPTOMS);
  const [chronicDiseasesCanonical, setChronicDiseasesCanonical] = useState<ChronicDisease[]>(INITIAL_CHRONIC_DISEASES);
  const [doctorSettingsCanonical, setDoctorSettingsCanonical] = useState<DoctorSettings>(INITIAL_DOCTOR_SETTINGS_CANONICAL);
  const [systemSettingsCanonical] = useState<SystemSettings>(INITIAL_SYSTEM_SETTINGS_CANONICAL);

  // Auto-seed Firestore if empty
  useEffect(() => {
    if (!db) return;
    const checkAndSeed = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'patients'));
        if (querySnapshot.empty) {
          console.log('Firestore is empty. Seeding initial collections...');
          const batch = writeBatch(db);
          INITIAL_PATIENTS.forEach((p) => {
            batch.set(doc(db, 'patients', p.patientId), p);
          });
          INITIAL_APPOINTMENTS.forEach((app) => {
            batch.set(doc(db, 'appointments', app.appointmentId), app);
          });
          INITIAL_VISITS.forEach((v) => {
            batch.set(doc(db, 'visits', v.visitId), v);
          });
          INITIAL_INVOICES.forEach((inv) => {
            batch.set(doc(db, 'invoices', inv.invoiceId), inv);
          });
          INITIAL_PAYMENTS.forEach((p) => {
            batch.set(doc(db, 'payments', p.paymentId), p);
          });
          INITIAL_PRESCRIPTIONS.forEach((pr) => {
            batch.set(doc(db, 'prescriptions', pr.prescriptionId), pr);
          });
          INITIAL_FOLLOWUPS.forEach((f) => {
            batch.set(doc(db, 'followUps', f.followUpId), f);
          });
          INITIAL_LAB_ORDERS.forEach((lo) => {
            batch.set(doc(db, 'labOrders', lo.labOrderId), lo);
          });
          INITIAL_RADIOLOGY_ORDERS.forEach((ro) => {
            batch.set(doc(db, 'radiologyOrders', ro.radiologyOrderId), ro);
          });
          INITIAL_MEDICATIONS.forEach((med) => {
            batch.set(doc(db, 'medications', med.medicationId), med);
          });
          INITIAL_LAB_TESTS.forEach((lt) => {
            batch.set(doc(db, 'labTests', lt.labTestId), lt);
          });
          INITIAL_RADIOLOGY_TYPES.forEach((rt) => {
            batch.set(doc(db, 'radiologyTypes', rt.radiologyId), rt);
          });
          INITIAL_DIAGNOSES.forEach((diag) => {
            batch.set(doc(db, 'diagnoses', diag.diagnosisId), diag);
          });
          INITIAL_SYMPTOMS.forEach((sym) => {
            batch.set(doc(db, 'symptoms', sym.symptomId), sym);
          });
          INITIAL_CHRONIC_DISEASES.forEach((cd) => {
            batch.set(doc(db, 'chronicDiseases', cd.diseaseId), cd);
          });
          await batch.commit();
          console.log('Database successfully seeded to Firestore!');
        }
      } catch (err) {
        console.warn('Error during Firestore seeding:', err);
      }
    };
    checkAndSeed();
  }, [db]);

  // Firestore Realtime Subscriptions (Firestore -> onSnapshot -> Canonical State)
  const [syncRetryCounter, setSyncRetryCounter] = useState(0);

  useEffect(() => {
    if (!db) {
      setSyncStatus('offline');
      return;
    }
    setSyncStatus('syncing');
    let hasLoadedAny = false;

    const onDataSuccess = () => {
      hasLoadedAny = true;
      setSyncStatus('connected');
      setSyncErrorDetails(null);
    };

    const onError = (error: Error) => {
      console.warn('[Firestore realtime notice]', error.message);
      if (!hasLoadedAny) {
        setSyncStatus('error');
        setSyncErrorDetails(error.message || 'تعذر الاتصال بـ Firestore أو هناك قيود صلاحيات.');
      }
    };

    const unsubscribers = [
      subscribeToPatients(db, (items) => { onDataSuccess(); setPatientsCanonical(items); }, onError),
      subscribeToAppointments(db, (items) => { onDataSuccess(); setAppointmentsCanonical(items); }, onError),
      subscribeToVisits(db, (items) => { onDataSuccess(); setVisitsCanonical(items); }, onError),
      subscribeToInvoices(db, (items) => { onDataSuccess(); setInvoicesCanonical(items); }, onError),
      subscribeToPayments(db, (items) => { onDataSuccess(); setPaymentsCanonical(items); }, onError),
      subscribeToPrescriptions(db, (items) => { onDataSuccess(); setPrescriptionsCanonical(items); }, onError),
      subscribeToFollowUps(db, (items) => { onDataSuccess(); setFollowUpsCanonical(items); }, onError),
      subscribeToLabOrders(db, (items) => { onDataSuccess(); setLabOrdersCanonical(items); }, onError),
      subscribeToRadiologyOrders(db, (items) => { onDataSuccess(); setRadiologyOrdersCanonical(items); }, onError),
      subscribeToMedications(db, (items) => { onDataSuccess(); setMedicationsCanonical(items); }, onError),
      subscribeToLabTests(db, (items) => { onDataSuccess(); setLabTestsCanonical(items); }, onError),
      subscribeToRadiologyTypes(db, (items) => { onDataSuccess(); setRadiologyTypesCanonical(items); }, onError),
      subscribeToDiagnoses(db, (items) => { onDataSuccess(); setDiagnosesCanonical(items); }, onError),
      subscribeToSymptoms(db, (items) => { onDataSuccess(); setSymptomsCanonical(items); }, onError),
      subscribeToChronicDiseases(db, (items) => { onDataSuccess(); setChronicDiseasesCanonical(items); }, onError),
      subscribeToDoctorProfile(db, (profile) => { if (profile) setDoctorProfile(profile); }, onError),
      subscribeToDoctorSettings(db, (settings) => { if (settings) setDoctorSettingsCanonical(settings); }, onError),
    ];
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [syncRetryCounter]);

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
        address: p.address || p.governorate || '',
        allergies: p.allergies || [],
        chronicConditions: p.chronicDiseases || [],
        bloodType: p.bloodType || 'غير محدد',
        bloodGroup: p.bloodType || 'غير محدد',
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
      const matchingVisitType = visitTypesList.find(
        (vt) => vt.name.trim().toLowerCase() === (a.visitType || '').trim().toLowerCase(),
      );
      const dynamicFee = matchingVisitType
        ? matchingVisitType.fee
        : a.visitType?.includes('استشارة') || a.visitType?.includes('متابعة')
        ? 150
        : 300;
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
        expectedFee: dynamicFee,
        notes: a.notes,
      };
    });
  }, [appointmentsCanonical, patientsCanonical, visitTypesList]);

  const transactions: TransactionRecord[] = useMemo(() => {
    const list: TransactionRecord[] = [];
    const seenPaymentIds = new Set<string>();

    paymentsCanonical.forEach((p) => {
      seenPaymentIds.add(p.paymentId);
      const pat = patientsCanonical.find((pt) => pt.patientId === p.patientId);
      const inv = invoicesCanonical.find((i) => i.invoiceId === p.invoiceId);
      const serviceName = inv?.items?.[0]?.description || 'كشف واستشارة طبية';
      const totalAmount = inv?.total || p.amount;
      const discountAmount = inv?.discount || 0;
      const paidAmount = p.amount;

      list.push({
        id: p.paymentId,
        receiptNo: p.receiptNumber || `REC-${p.paymentId.slice(-5)}`,
        receiptNumber: p.receiptNumber || `REC-${p.paymentId.slice(-5)}`,
        patientName: pat?.fullName || 'مريض مسجل',
        serviceName,
        description: serviceName,
        totalAmount,
        discountAmount,
        paidAmount,
        amount: paidAmount,
        type: 'in',
        paymentMethod: (p.method === 'CARD' ? 'فيزا / كارت' : 'نقدي'),
        method: (p.method === 'CARD' ? 'فيزا / كارت' : 'نقدي'),
        status: (inv?.status === 'PAID' || paidAmount >= totalAmount) ? 'مدفوعة' : 'غير مدفوعة',
        time: new Date(p.paidAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
        date: p.paidAt ? (p.paidAt.includes('T') ? p.paidAt.split('T')[0] : p.paidAt) : new Date().toISOString().split('T')[0],
        category: 'كشوفات وخدمات طبية',
      });
    });

    // Also include any unpaid invoices that don't have a payment entry yet
    invoicesCanonical.forEach((inv) => {
      const hasPayment = paymentsCanonical.some((p) => p.invoiceId === inv.invoiceId);
      if (!hasPayment) {
        const pat = patientsCanonical.find((pt) => pt.patientId === inv.patientId);
        const serviceName = inv.items?.[0]?.description || 'كشف واستشارة طبية';
        list.push({
          id: inv.invoiceId,
          receiptNo: `INV-${inv.invoiceId.slice(-5)}`,
          receiptNumber: `INV-${inv.invoiceId.slice(-5)}`,
          patientName: pat?.fullName || 'مريض مسجل',
          serviceName,
          description: serviceName,
          totalAmount: inv.total,
          discountAmount: inv.discount || 0,
          paidAmount: inv.paidAmount || 0,
          amount: inv.paidAmount || inv.total,
          type: 'in',
          paymentMethod: 'نقدي',
          method: 'نقدي',
          status: inv.status === 'PAID' ? 'مدفوعة' : 'غير مدفوعة',
          time: new Date(inv.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
          date: inv.createdAt ? (inv.createdAt.includes('T') ? inv.createdAt.split('T')[0] : inv.createdAt) : new Date().toISOString().split('T')[0],
          category: 'فواتير كشوفات',
        });
      }
    });

    return list;
  }, [paymentsCanonical, invoicesCanonical, patientsCanonical]);

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
        brandName: m.nameAr || m.nameEn || 'دواء',
        genericName: m.genericName || '',
        strength: m.strength || '',
        form: m.form || 'أقراص',
        category: (m as any).category || 'أدوية العيادة',
        defaultDosage: (m as any).defaultDosage || 'قرص واحد يومياً',
        defaultDuration: (m as any).defaultDuration || 'لمدة 7 أيام',
        defaultTiming: (m as any).defaultTiming || 'بعد الأكل',
        isFavorite: Boolean((m as any).isFavorite),
        active: m.active !== false,
      }));
    }
    return DEFAULT_DRUG_CATALOG;
  }, [medicationsCanonical]);

  const labCatalog: LabCatalogItem[] = useMemo(() => {
    if (labTestsCanonical.length > 0) {
      return labTestsCanonical.map((l) => ({
        id: l.labTestId,
        name: l.nameAr || l.nameEn || 'تحليل',
        category: l.category || 'تحاليل عامة',
        sampleType: l.sampleType || 'دم',
        fastingRequired: Boolean(l.fastingRequired),
        active: l.active !== false,
      }));
    }
    return DEFAULT_LAB_CATALOG;
  }, [labTestsCanonical]);

  const radiologyCatalog: RadiologyCatalogItem[] = useMemo(() => {
    if (radiologyTypesCanonical.length > 0) {
      return radiologyTypesCanonical.map((r) => ({
        id: r.radiologyId,
        name: r.nameAr || r.nameEn || 'أشعة',
        category: r.category || 'أشعة عامة',
        active: r.active !== false,
      }));
    }
    return DEFAULT_RADIOLOGY_CATALOG;
  }, [radiologyTypesCanonical]);

  const diagnosesCatalog: DiagnosisCatalogItem[] = useMemo(() => {
    if (diagnosesCanonical.length > 0) {
      return diagnosesCanonical.map((d) => ({
        id: d.diagnosisId,
        nameAr: d.nameAr || 'تشخيص',
        nameEn: d.nameEn || '',
        code: d.code || '',
        category: d.category || 'باطنة عامة',
        isFavorite: Boolean((d as any).isFavorite),
        active: d.active !== false,
      }));
    }
    return DEFAULT_DIAGNOSES_CATALOG;
  }, [diagnosesCanonical]);

  const symptomsCatalog: SymptomCatalogItem[] = useMemo(() => {
    if (symptomsCanonical.length > 0) {
      return symptomsCanonical.map((s) => ({
        id: s.symptomId,
        name: s.nameAr || 'عرض',
        category: s.category || 'شكوى عامة',
        active: s.active !== false,
      }));
    }
    return DEFAULT_SYMPTOMS_CATALOG;
  }, [symptomsCanonical]);

  // Modals
  const [isNewAppointmentOpen, setIsNewAppointmentOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Pre-filled intake data when transitioning from appointment «حضر المريض»
  const [intakeInitialData, setIntakeInitialData] = useState<{
    patientName?: string;
    phone?: string;
    visitType?: string;
    notes?: string;
    appointmentId?: string;
    fee?: number;
  } | null>(null);

  const handleStartIntakeFromAppointment = (app: AppointmentListItem) => {
    setIntakeInitialData({
      patientName: app.patientName,
      phone: app.phone,
      visitType: app.visitType,
      notes: app.notes,
      appointmentId: app.id,
      fee: app.expectedFee,
    });
    setAppointmentsCanonical((prev) =>
      prev.map((a) =>
        a.appointmentId === app.id || a.patientName === app.patientName
          ? { ...a, status: 'ARRIVED' }
          : a
      )
    );
    handleNavigate('new-visit');
  };

  // Sound/Announcement banner (Controlled by Settings)
  const [callingBanner, setCallingBanner] = useState<ClinicAlertPayload | null>(null);
  const [alertHistory, setAlertHistory] = useState<ClinicAlertPayload[]>([]);
  const [syncStatus, setSyncStatus] = useState<'connected' | 'offline' | 'syncing' | 'error'>(db ? 'connected' : 'offline');
  const [syncErrorDetails, setSyncErrorDetails] = useState<string | null>(null);

  const registerAlert = (alertItem: ClinicAlertPayload) => {
    setCallingBanner(alertItem);
    setAlertHistory((prev) => [alertItem, ...prev.filter((a) => a.id !== alertItem.id)].slice(0, 15));
  };

  // Doctor-determined Follow-ups only (from followUps collection & doctor examination schedules)
  const doctorFollowUpsList = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const list: Array<{
      id: string;
      patientName: string;
      phone: string;
      medicalCode: string;
      lastVisitDate: string;
      dueDate: string;
      daysRemaining: number;
      isFreeEligible: boolean;
      diagnosis: string;
      notes: string;
    }> = [];

    // 1. From Canonical FollowUps collection (recorded by doctor during exam)
    followUpsCanonical.forEach((fu) => {
      if (fu.status === 'CANCELLED' || fu.status === 'COMPLETED') return;
      const patient = patientsCanonical.find((p) => p.patientId === fu.patientId);
      if (!patient) return;
      
      const pVisits = visitsCanonical.filter((v) => v.patientId === fu.patientId);
      const lastVisit = [...pVisits].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
      const dueDateObj = new Date(fu.scheduledDate);
      dueDateObj.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((dueDateObj.getTime() - today.getTime()) / 86400000);

      list.push({
        id: fu.followUpId,
        patientName: patient.fullName,
        phone: patient.phone,
        medicalCode: patient.medicalCode || `EG-${patient.fileNumber || 101}`,
        lastVisitDate: lastVisit?.createdAt?.split('T')[0] || fu.createdAt?.split('T')[0] || '',
        dueDate: fu.scheduledDate,
        daysRemaining: diffDays,
        isFreeEligible: fu.isFree || false,
        diagnosis: lastVisit?.clinicalData?.diagnosis?.[0] || 'متابعة استشارة',
        notes: fu.notes || 'متابعة حددها الطبيب',
      });
    });

    // 2. Also include any doctor-scheduled follow-up appointments
    appointmentsCanonical.forEach((app) => {
      if (app.status !== 'SCHEDULED') return;
      if (!app.visitType.includes('متابعة') && !app.visitType.includes('استشارة')) return;
      if (list.some((item) => item.id === app.appointmentId || (item.patientName === patientsCanonical.find(p => p.patientId === app.patientId)?.fullName && item.dueDate === app.scheduledDate))) return;

      const patient = patientsCanonical.find((p) => p.patientId === app.patientId);
      if (!patient) return;

      const dueDateObj = new Date(app.scheduledDate);
      dueDateObj.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((dueDateObj.getTime() - today.getTime()) / 86400000);

      list.push({
        id: app.appointmentId,
        patientName: patient.fullName,
        phone: patient.phone,
        medicalCode: patient.medicalCode || `EG-${patient.fileNumber || 101}`,
        lastVisitDate: app.createdAt?.split('T')[0] || '',
        dueDate: app.scheduledDate,
        daysRemaining: diffDays,
        isFreeEligible: false,
        diagnosis: app.visitType,
        notes: app.notes || 'موعد متابعة محدد',
      });
    });

    return list.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [followUpsCanonical, appointmentsCanonical, patientsCanonical, visitsCanonical]);

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

  // Delete queue item / visit
  const handleRemoveFromQueue = async (ticket: string) => {
    const targetQueueNum = parseInt(ticket.replace(/\D/g, ''), 10);
    const targetVisit =
      visitsCanonical.find((v) => v.visitId === ticket) ||
      visitsCanonical.find((v) => v.queueNumber === targetQueueNum);
    if (targetVisit) {
      if (db) {
        try {
          await deleteDoc(doc(db, 'visits', targetVisit.visitId));
        } catch (err) {
          console.error('Error removing visit from Firestore:', err);
        }
      }
      setVisitsCanonical((prev) => prev.filter((v) => v.visitId !== targetVisit.visitId));
    }
  };

  // Delete patient record
  const handleDeletePatient = async (patientId: string) => {
    setPatientsCanonical((prev) => prev.filter((p) => p.patientId !== patientId));
    if (db) {
      try {
        await deleteDoc(doc(db, 'patients', patientId));
      } catch (err) {
        console.warn('Error deleting patient from Firestore:', err);
      }
    }
  };

  // Update patient record
  const handleUpdatePatient = async (updated: Partial<Patient> & { patientId: string }) => {
    const timestamp = new Date().toISOString();
    setPatientsCanonical((prev) =>
      prev.map((p) => {
        if (p.patientId === updated.patientId) {
          return {
            ...p,
            ...updated,
            updatedAt: timestamp,
          };
        }
        return p;
      })
    );

    if (db) {
      try {
        await setDoc(
          doc(db, 'patients', updated.patientId),
          {
            ...updated,
            updatedAt: timestamp,
          },
          { merge: true }
        );
      } catch (err) {
        console.warn('Error updating patient in Firestore:', err);
      }
    }
  };

  // Add invoice / transaction safely
  const handleAddTransaction = async (newTx: TransactionRecord) => {
    // 1. Find or resolve patient
    let targetPatientId = patientsCanonical.find(
      (p) => p.fullName.trim() === newTx.patientName.trim()
    )?.patientId;

    if (!targetPatientId && newTx.patientName.trim()) {
      targetPatientId = `pat-${Date.now()}`;
      const newPat: Patient = {
        patientId: targetPatientId,
        fileNumber: `F-${Math.floor(1000 + Math.random() * 9000)}`,
        fullName: newTx.patientName.trim(),
        phone: '',
        gender: 'male',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setPatientsCanonical((prev) => [newPat, ...prev]);
      if (db) {
        setDoc(doc(db, 'patients', targetPatientId), newPat).catch((e) => console.warn('Patient save fallback:', e));
      }
    }

    const invoiceId = `inv-${Date.now()}`;
    const paymentId = `pay-${Date.now()}`;
    const totalAmount = newTx.totalAmount ?? newTx.amount ?? 0;
    const discountAmount = newTx.discountAmount ?? 0;
    const finalTotal = Math.max(0, totalAmount - discountAmount);
    const paidAmount = newTx.paidAmount ?? (newTx.status === 'مدفوعة' ? finalTotal : (newTx.amount ?? 0));

    const newInvoice: Invoice = {
      invoiceId,
      patientId: targetPatientId || 'pat-general',
      visitId: '',
      clinicLocationId: 'loc-main',
      items: [
        {
          serviceId: `srv-${Date.now()}`,
          nameAr: newTx.serviceName || newTx.description || 'كشف واستشارة طبية',
          quantity: 1,
          unitPrice: totalAmount,
          total: totalAmount,
        },
      ],
      subtotal: totalAmount,
      discount: discountAmount,
      total: finalTotal,
      paidAmount: paidAmount > 0 ? paidAmount : (newTx.status === 'مدفوعة' ? finalTotal : 0),
      remainingAmount: Math.max(0, finalTotal - (paidAmount > 0 ? paidAmount : (newTx.status === 'مدفوعة' ? finalTotal : 0))),
      status: (newTx.status === 'مدفوعة' || paidAmount >= finalTotal) ? 'PAID' : 'UNPAID',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const newPayment: Payment = {
      paymentId,
      patientId: targetPatientId || 'pat-general',
      visitId: '',
      invoiceId,
      clinicLocationId: 'loc-main',
      amount: newInvoice.paidAmount > 0 ? newInvoice.paidAmount : finalTotal,
      method: (newTx.paymentMethod || newTx.method) === 'فيزا / كارت' ? 'CARD' : 'CASH',
      status: 'PAID',
      receiptNumber: newTx.receiptNo || `REC-${Math.floor(10000 + Math.random() * 90000)}`,
      paidAt: new Date().toISOString(),
      receivedBy: 'doc-1',
    };

    setInvoicesCanonical((prev) => [newInvoice, ...prev]);
    if (newInvoice.status === 'PAID' || newPayment.amount > 0) {
      setPaymentsCanonical((prev) => [newPayment, ...prev]);
    }

    if (db) {
      try {
        const tasks: Promise<unknown>[] = [
          setDoc(doc(db, 'invoices', invoiceId), newInvoice),
        ];
        if (newInvoice.status === 'PAID' || newPayment.amount > 0) {
          tasks.push(setDoc(doc(db, 'payments', paymentId), newPayment));
        }
        await Promise.allSettled(tasks);
      } catch (err) {
        console.warn('Error saving transaction to Firestore:', err);
      }
    }
  };

  // Delete invoice / transaction safely
  const handleDeleteTransaction = async (txId: string) => {
    // 1. Optimistic local state update
    const matchingPayment = paymentsCanonical.find((p) => p.paymentId === txId || p.invoiceId === txId || p.visitId === txId);
    const targetInvoiceId = matchingPayment?.invoiceId || txId;
    const targetPaymentId = matchingPayment?.paymentId || txId;
    const targetVisitId = matchingPayment?.visitId;

    setInvoicesCanonical((prev) => prev.filter((i) => i.invoiceId !== targetInvoiceId && i.invoiceId !== txId && (targetVisitId ? i.visitId !== targetVisitId : true)));
    setPaymentsCanonical((prev) => prev.filter((p) => p.paymentId !== targetPaymentId && p.paymentId !== txId && (targetVisitId ? p.visitId !== targetVisitId : true)));

    // 2. Cloud Firestore deletion
    if (db) {
      try {
        const deleteTasks: Promise<unknown>[] = [];
        if (targetPaymentId) {
          deleteTasks.push(deleteDoc(doc(db, 'payments', targetPaymentId)).catch((e) => console.warn('Payment delete fallback:', e)));
        }
        if (targetInvoiceId) {
          deleteTasks.push(deleteDoc(doc(db, 'invoices', targetInvoiceId)).catch((e) => console.warn('Invoice delete fallback:', e)));
        }
        // Also clean up any standalone transaction entry if registered
        deleteTasks.push(deleteDoc(doc(db, 'transactions', txId)).catch((e) => console.warn('Transaction delete fallback:', e)));

        await Promise.allSettled(deleteTasks);
      } catch (err) {
        console.warn('Error deleting transaction from Firestore:', err);
      }
    }
  };

  // Call Patient
  const handleCallPatient = async (ticket: string, name: string) => {
    const alertConfig = loadAlertSettings();
    if (alertConfig.audioEnabled && alertConfig.callPatientAudio) {
      playSingleAlertSound('call');
    }
    if (alertConfig.visualEnabled && alertConfig.callPatientVisual) {
      registerAlert({
        id: `call-${Date.now()}`,
        type: 'call',
        title: 'نداء دخول المريض لغرفة الكشف',
        message: `تذكرة (${ticket}) — المريض (${name}) يتفضل لغرفة الطبيب للكشف`,
        ticket,
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      });
      setTimeout(() => setCallingBanner(null), 5000);
    }

    const targetQueueNum = parseInt(ticket.replace(/\D/g, ''), 10);
    const targetVisit =
      visitsCanonical.find((v) => v.queueNumber === targetQueueNum) ||
      visitsCanonical.find((v) => v.visitId === ticket) ||
      visitsCanonical.find((v) => patientsCanonical.find((p) => p.patientId === v.patientId)?.fullName === name);
    if (!targetVisit) return;

    const basePatient = patients.find((p) => p.id === targetVisit.patientId);
    const registeredComplaint = targetVisit.receptionistData?.symptoms || basePatient?.chiefComplaint || '';
    const registeredSymptoms = targetVisit.receptionistData?.symptoms
      ? [targetVisit.receptionistData.symptoms]
      : basePatient?.intakeSymptoms || [];
    const registeredChronic =
      targetVisit.receptionistData?.chronicDiseases && targetVisit.receptionistData.chronicDiseases.length > 0
        ? targetVisit.receptionistData.chronicDiseases
        : basePatient?.chronicConditions || [];

    const matchedPatient: PatientListItem = {
      id: targetVisit.patientId,
      medicalCode: basePatient?.medicalCode || `EG-${targetVisit.patientId.slice(0, 5)}`,
      fileNumber: basePatient?.fileNumber || targetVisit.queueNumber || 1,
      name: basePatient?.name || name,
      age: basePatient?.age || 38,
      gender: basePatient?.gender || 'male',
      phone: basePatient?.phone || '',
      governorate: basePatient?.governorate || 'القاهرة',
      allergies: basePatient?.allergies || [],
      chronicConditions: registeredChronic,
      bloodGroup: basePatient?.bloodGroup || 'O+',
      visitsCount: basePatient?.visitsCount || 1,
      chiefComplaint: registeredComplaint,
      intakeSymptoms: registeredSymptoms,
      lastDiagnosis: targetVisit.receptionistData?.symptoms || basePatient?.lastDiagnosis || '',
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

        const alertConfig = loadAlertSettings();
        if (alertConfig.audioEnabled && alertConfig.newVisitAudio) {
          playSingleAlertSound('new_visit');
        }
        if (alertConfig.visualEnabled && alertConfig.newVisitVisual) {
          registerAlert({
            id: `new-${Date.now()}`,
            type: 'new_visit',
            title: 'تسجيل حضور موعد مسبق بالانتظار',
            message: `تم تأكيد حضور المريض (${patient.fullName}) وتحويله لصالة الانتظار.`,
            ticket: String(nextFileNumber),
            timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
          });
          setTimeout(() => setCallingBanner(null), 5000);
        }
      } catch (error) {
        alert(error instanceof Error ? error.message : 'فشل تسجيل حضور المريض في قاعدة البيانات');
      }
    }
  };

  // Walk-in: Patient + Invoice + Payment + Visit are committed in one transaction
  const handleAddPatientToQueue = async (item: QueueItem) => {
    const timestamp = new Date().toISOString();
    const cleanPhone = (item.phone || '').trim();
    const cleanName = (item.patientName || '').trim();

    // Look up existing patient strictly by valid non-empty phone or exact name match
    const basePat = patientsCanonical.find((p) => {
      const pPhone = (p.phone || '').trim();
      const pName = (p.fullName || '').trim().toLowerCase();
      const phoneMatches = cleanPhone !== '' && pPhone !== '' && pPhone === cleanPhone;
      const nameMatches = cleanName !== '' && pName !== '' && pName === cleanName.toLowerCase();
      return phoneMatches || nameMatches;
    });
    
    // Convert entered age to a valid dateOfBirth so the age calculation is perfectly synchronized and correct
    const calculatedDOB = new Date(new Date().getFullYear() - (Number(item.age) || 30), 0, 1).toISOString().split('T')[0];

    const patient: Patient = basePat
      ? {
          ...basePat,
          fullName: cleanName || basePat.fullName,
          phone: cleanPhone || basePat.phone,
          chronicDiseases: Array.from(new Set([...(basePat.chronicDiseases || []), ...(item.chronicConditions || [])])),
          address: item.address || basePat.address || basePat.governorate || '',
          bloodType: item.bloodType && item.bloodType !== 'غير محدد' ? item.bloodType : (basePat.bloodType || 'غير محدد'),
          dateOfBirth: basePat.dateOfBirth || calculatedDOB,
          updatedAt: timestamp,
        }
      : {
          patientId: `pat-${Date.now()}`,
          fullName: cleanName || 'مريض جديد',
          phone: cleanPhone,
          gender: item.gender === 'female' ? 'female' : 'male',
          fileNumber: typeof item.fileNumber === 'number' ? item.fileNumber : parseInt(String(item.fileNumber), 10) || nextFileNumber,
          medicalCode: item.medicalCode || `EG-${Math.floor(Math.random() * 90000) + 10000}`,
          chronicDiseases: item.chronicConditions || [],
          allergies: [],
          address: item.address || '',
          bloodType: item.bloodType || 'غير محدد',
          dateOfBirth: calculatedDOB,
          createdAt: timestamp,
          updatedAt: timestamp,
          createdBy: userProfile?.username || 'receptionist',
        };
    const paymentMethodEnum = item.paymentMethod.includes('فيزا') || item.paymentMethod.includes('كارت') ? 'CARD' : 'CASH';

    // Optimistic/Local state update to ensure instant UI rendering and robust offline support
    setPatientsCanonical((prev) => {
      const idx = prev.findIndex((p) => p.patientId === patient.patientId);
      if (idx > -1) {
        const copy = [...prev];
        copy[idx] = patient;
        return copy;
      }
      return [patient, ...prev];
    });

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

        const alertConfig = loadAlertSettings();
        if (alertConfig.audioEnabled && alertConfig.newVisitAudio) {
          playSingleAlertSound('new_visit');
        }
        if (alertConfig.visualEnabled && alertConfig.newVisitVisual) {
          registerAlert({
            id: `new-${Date.now()}`,
            type: 'new_visit',
            title: 'تسجيل كشف وزيارة جديدة',
            message: `تم تسجيل المريض (${item.patientName}) في قائمة الانتظار بنجاح.`,
            ticket: String(item.ticketNumber || nextFileNumber),
            timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
          });
          setTimeout(() => setCallingBanner(null), 5000);
        }
      } catch (error) {
        alert(error instanceof Error ? error.message : 'فشل إضافة المريض للانتظار في قاعدة البيانات');
      }
    }
  };

  // Add scheduled appointment: Patient first, then Appointment in one Firestore transaction
  const handleAddAppointment = async (app: AppointmentListItem) => {
    const timestamp = new Date().toISOString();
    const cleanPhone = (app.phone || '').trim();
    const cleanName = (app.patientName || '').trim();
    const existingPatient = patientsCanonical.find((p) => {
      const pPhone = (p.phone || '').trim();
      const pName = (p.fullName || '').trim().toLowerCase();
      const phoneMatch = cleanPhone !== '' && pPhone !== '' && pPhone === cleanPhone;
      const nameMatch = cleanName !== '' && pName !== '' && pName === cleanName.toLowerCase();
      return phoneMatch || nameMatch;
    });
    const patient: Patient = existingPatient
      ? {
          ...existingPatient,
          fullName: cleanName || existingPatient.fullName,
          phone: cleanPhone || existingPatient.phone,
          updatedAt: timestamp,
        }
      : {
          patientId: `pat-${Date.now()}`,
          fullName: cleanName || 'مريض محجوز',
          phone: cleanPhone,
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
  const handleFinishExam = async (examData?: {
    prescriptionItems: PrescriptionItem[];
    labOrders: LabOrderItem[];
    radiologyOrders: RadiologyOrderItem[];
    diagnoses: any[];
    followupDate: string;
    lifestyleAdvice: string;
  }) => {
    const activeWaiting =
      visitsCanonical.find((v) => v.patientId === activeExamPatient?.id && (v.status === 'IN_PROGRESS' || v.status === 'WAITING')) ||
      visitsCanonical.find((v) => v.status === 'IN_PROGRESS') ||
      visitsCanonical.find((v) => v.status === 'WAITING');

    const patientId = activeExamPatient?.id || activeWaiting?.patientId || `pat-${Date.now()}`;
    const timestamp = new Date().toISOString();

    const rxItems = examData ? examData.prescriptionItems : activePrescription;

    // 1. Create and persist Prescription entry
    if (rxItems.length > 0) {
      const newPrescription: Prescription = {
        prescriptionId: `rx-${Date.now()}`,
        patientId,
        doctorId: userProfile?.username || 'usr-hazem-dr',
        clinicLocationId: activeWaiting?.clinicLocationId || 'loc-mohandessin',
        visitId: activeWaiting?.visitId || `visit-${Date.now()}`,
        items: rxItems.map((p) => ({
          medicationId: p.id,
          name: p.drugName,
          strength: p.strength || '',
          form: p.dosageForm || 'أقراص',
          dose: p.dosage || '',
          frequency: p.timing || '',
          duration: p.duration,
          instructions: p.notes || p.timing || '',
        })),
        notes: examData?.lifestyleAdvice || '',
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      setPrescriptionsCanonical((prev) => [newPrescription, ...prev]);
    }

    // 2. Create and persist Lab Orders locally
    if (examData?.labOrders && examData.labOrders.length > 0) {
      const newLabs: LabOrder[] = examData.labOrders.map((l) => {
        const hasResult = !!(l.resultValue && l.resultValue.trim());
        const isReport = l.status === 'REPORT';
        const isResult = l.status === 'RESULT' || hasResult;
        const resolvedStatus: OrderStatus = isReport ? 'REPORT' : isResult ? 'RESULT' : 'ORDERED';
        return {
          labOrderId: l.id || `lab-ord-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          patientId,
          visitId: activeWaiting?.visitId || `visit-${Date.now()}`,
          testId: l.labTestId || null,
          testName: l.testName,
          status: resolvedStatus,
          result: l.resultValue || '',
          notes: l.instructions || l.reportNotes || '',
          orderedAt: timestamp,
          updatedAt: timestamp,
        };
      });
      setLabOrdersCanonical((prev) => [...newLabs, ...prev]);
    }

    // 3. Create and persist Radiology Orders locally
    if (examData?.radiologyOrders && examData.radiologyOrders.length > 0) {
      const newRads: RadiologyOrder[] = examData.radiologyOrders.map((r) => {
        const hasReport = !!(r.reportDetails && r.reportDetails.trim());
        const hasResult = !!(r.resultSummary && r.resultSummary.trim());
        const isReport = r.status === 'REPORT' || hasReport;
        const isResult = r.status === 'RESULT' || hasResult;
        const resolvedStatus: OrderStatus = isReport ? 'REPORT' : isResult ? 'RESULT' : 'ORDERED';
        return {
          radiologyOrderId: r.id || `rad-ord-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          patientId,
          visitId: activeWaiting?.visitId || `visit-${Date.now()}`,
          radiologyTypeId: r.radiologyId || null,
          radiologyName: r.name,
          status: resolvedStatus,
          result: r.resultSummary || r.reportDetails || '',
          report: r.reportDetails || '',
          notes: r.notes || '',
          orderedAt: timestamp,
          updatedAt: timestamp,
        };
      });
      setRadiologyOrdersCanonical((prev) => [...newRads, ...prev]);
    }

    // 4. Create and persist FollowUp entry locally
    if (examData?.followupDate) {
      const newFollowup: FollowUp = {
        followUpId: `fol-${Date.now()}`,
        patientId,
        sourceVisitId: activeWaiting?.visitId || `visit-${Date.now()}`,
        clinicLocationId: activeWaiting?.clinicLocationId || 'loc-mohandessin',
        scheduledDate: examData.followupDate,
        scheduledTime: null,
        status: 'UPCOMING',
        fee: 0,
        isFree: true,
        notes: examData.lifestyleAdvice || '',
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      setFollowUpsCanonical((prev) => [newFollowup, ...prev]);
    }

    // 5. Create and persist Visit entry
    const completedVisit: Visit = {
      visitId: activeWaiting?.visitId || `visit-${Date.now()}`,
      patientId,
      appointmentId: activeWaiting?.appointmentId || null,
      clinicLocationId: activeWaiting?.clinicLocationId || 'loc-mohandessin',
      visitType: activeWaiting?.visitType || 'NEW',
      source: activeWaiting?.source || 'WALK_IN',
      status: 'COMPLETED',
      queueNumber: activeWaiting?.queueNumber || null,
      receptionistData: {
        symptoms: activeWaiting?.receptionistData?.symptoms || activeExamPatient?.chiefComplaint || 'كشف عيادة باطنة',
        chronicDiseases: activeWaiting?.receptionistData?.chronicDiseases || activeExamPatient?.chronicConditions || [],
        notes: activeWaiting?.receptionistData?.notes || '',
      },
      clinicalData: {
        chiefComplaint: activeExamPatient?.chiefComplaint || activeWaiting?.clinicalData?.chiefComplaint || 'كشف عيادة باطنة',
        history: 'متابعة سريرية متكاملة',
        examination: 'العلامات الحيوية وفحص القلب والصدر مستقر',
        diagnosis: examData?.diagnoses?.map((d) => d.nameAr || d.nameEn) || [activeExamPatient?.lastDiagnosis || 'كشف عيادة باطنة'],
        treatment: rxItems.map((p) => p.drugName).join(' + '),
      },
      vitalSigns: activeWaiting?.vitalSigns || {
        bloodPressure: '120/80',
        pulse: 76,
        temperature: 37,
        weight: 80,
        height: 175,
        oxygenSaturation: 98,
        randomBloodSugar: 110,
      },
      startedAt: activeWaiting?.startedAt || timestamp,
      completedAt: timestamp,
      createdAt: activeWaiting?.createdAt || timestamp,
      updatedAt: timestamp,
      createdBy: activeWaiting?.createdBy || 'usr-hazem-dr',
      doctorId: userProfile?.username || 'usr-hazem-dr',
    };

    setVisitsCanonical((prev) => {
      const exists = prev.some((v) => v.visitId === completedVisit.visitId);
      if (exists) {
        return prev.map((v) => (v.visitId === completedVisit.visitId ? { ...v, status: 'COMPLETED', clinicalData: completedVisit.clinicalData } : v));
      }
      return [completedVisit, ...prev];
    });

    // 6. Sync to Firestore if db is available
    if (activeWaiting && db) {
      const rxSnapshots: PrescriptionItemSnapshot[] = rxItems.map((item) => ({
        name: item.drugName,
        strength: item.scientificName || '',
        form: item.dosageForm || 'أقراص',
        dose: item.dosage || 'قرص واحد',
        frequency: item.dosage || 'يومياً',
        duration: item.duration,
        instructions: 'تناول العلاج وفق الإرشادات الموضحة بالروشتة',
      }));

      const clinicalData = {
        chiefComplaint: activeWaiting.receptionistData?.symptoms || activeExamPatient?.chiefComplaint || 'كشف عيادة باطنة',
        history: 'متابعة سريرية متكاملة',
        examination: 'العلامات الحيوية وفحص القلب والصدر مستقر',
        diagnosis: examData?.diagnoses?.map((d) => d.nameAr || d.nameEn) || [activeExamPatient?.lastDiagnosis || 'كشف عيادة باطنة'],
        treatment: rxItems.map((p) => p.drugName).join(' + '),
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
          prescriptionNotes: examData?.lifestyleAdvice || 'مع أطيب تمنياتنا بالشفاء العاجل',
          labOrders: examData?.labOrders?.map((l) => {
            const hasResult = !!(l.resultValue && l.resultValue.trim());
            const isReport = l.status === 'REPORT';
            const isResult = l.status === 'RESULT' || hasResult;
            const resolvedStatus: OrderStatus = isReport ? 'REPORT' : isResult ? 'RESULT' : 'ORDERED';
            return {
              testId: l.labTestId || null,
              testName: l.testName,
              status: resolvedStatus,
              result: l.resultValue || '',
              notes: l.instructions || l.reportNotes || '',
            };
          }),
          radiologyOrders: examData?.radiologyOrders?.map((r) => {
            const hasReport = !!(r.reportDetails && r.reportDetails.trim());
            const hasResult = !!(r.resultSummary && r.resultSummary.trim());
            const isReport = r.status === 'REPORT' || hasReport;
            const isResult = r.status === 'RESULT' || hasResult;
            const resolvedStatus: OrderStatus = isReport ? 'REPORT' : isResult ? 'RESULT' : 'ORDERED';
            return {
              radiologyTypeId: r.radiologyId || null,
              radiologyName: r.name,
              status: resolvedStatus,
              result: r.resultSummary || r.reportDetails || '',
              report: r.reportDetails || '',
              notes: r.notes || '',
            };
          }),
          followUp: examData?.followupDate ? {
            scheduledDate: examData.followupDate,
            fee: 0,
            isFree: true,
            notes: examData.lifestyleAdvice || 'متابعة حددها الطبيب',
          } : undefined,
        });
      } catch (error) {
        console.warn('Firestore sync notice:', error);
      }
    }

    // Play chime & show alert notification
    const alertConfig = loadAlertSettings();
    if (alertConfig.audioEnabled && alertConfig.finishExamAudio) {
      playSingleAlertSound('finish');
    }
    if (alertConfig.visualEnabled && alertConfig.finishExamVisual) {
      registerAlert({
        id: `finish-${Date.now()}`,
        type: 'finish',
        title: 'إشعار السكرتارية: انتهاء الكشف الطبي',
        message: `تم الانتهاء من كشف المريض (${activeExamPatient?.name || 'المريض'}) واعتماد الروشتة. العيادة جاهزة لاستقبال المريض التالي.`,
        ticket: String(activeWaiting?.queueNumber || ''),
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      });
      setTimeout(() => setCallingBanner(null), 6000);
    }
  };

  return (
    <div
      className="min-h-screen bg-slate-100 dark:bg-black text-slate-900 dark:text-slate-100 font-sans antialiased flex transition-colors"
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
          syncStatus={syncStatus}
          syncErrorDetails={syncErrorDetails}
          waitingQueue={queue}
          recentAlerts={alertHistory}
          followUpsList={doctorFollowUpsList}
          onNavigate={handleNavigate}
          onCallPatient={handleCallPatient}
          onRetrySync={() => setSyncRetryCounter((c) => c + 1)}
          onOpenDatabaseInspector={() => setIsDatabaseInspectorOpen(true)}
          onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
        />

        {/* Global Live Clinic Notification Banner (Controlled by Settings: Audio & Visual) */}
        {callingBanner && (
          <div
            className={`fixed top-18 right-4 lg:right-80 left-4 lg:left-8 z-50 bg-white dark:bg-[#18233C] border-2 rounded-2xl p-4 shadow-2xl flex items-center justify-between animate-in slide-in-from-top-4 max-w-full transition-all ${
              callingBanner.type === 'finish'
                ? 'border-emerald-500 shadow-emerald-500/10'
                : callingBanner.type === 'call'
                ? 'border-amber-500 shadow-amber-500/10'
                : 'border-[#00c2cb] shadow-[#00c2cb]/10'
            }`}
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div
                className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center font-black shrink-0 ${
                  callingBanner.type === 'finish'
                    ? 'bg-emerald-500 text-slate-950'
                    : callingBanner.type === 'call'
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-[#00c2cb] text-slate-950'
                }`}
              >
                <span className="material-symbols-outlined text-xl sm:text-2xl animate-pulse">
                  {callingBanner.type === 'finish'
                    ? 'task_alt'
                    : callingBanner.type === 'call'
                    ? 'campaign'
                    : 'person_add'}
                </span>
              </div>
              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[11px] font-mono font-bold block ${
                      callingBanner.type === 'finish'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : callingBanner.type === 'call'
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-[#008f97] dark:text-[#45dee7]'
                    }`}
                  >
                    {callingBanner.title}
                  </span>
                  {callingBanner.timestamp && (
                    <span className="text-[10px] text-slate-400 font-mono">
                      • {callingBanner.timestamp}
                    </span>
                  )}
                </div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-[#dde2f5] truncate">
                  {callingBanner.message}
                </h4>
              </div>
            </div>
            <button
              onClick={() => setCallingBanner(null)}
              className="text-xs text-slate-500 dark:text-[#859394] hover:text-slate-900 dark:hover:text-white px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#080e1b] dark:hover:bg-[#111A2E] cursor-pointer shrink-0 font-bold transition-colors"
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
                  visitTypesList={visitTypesList}
                  initialData={intakeInitialData}
                  onClearInitialData={() => setIntakeInitialData(null)}
                />
              )}

              {activeScreen === 'waiting-queue' && (
                <QueueScreen
                  queue={queue}
                  onCallPatient={handleCallPatient}
                  onNavigate={handleNavigate}
                  onRemoveFromQueue={handleRemoveFromQueue}
                  onOpenNewVisit={() => handleNavigate('new-visit')}
                />
              )}

              {(activeScreen === 'appointments' || activeScreen === 'upcoming-followups') && (
                <AppointmentsScreen
                  appointments={appointments}
                  followUps={doctorFollowUpsList}
                  onCheckInPatient={(app) => handleConfirmCheckIn(app, app.expectedFee, 'نقدي')}
                  onOpenNewAppointment={() => setIsNewAppointmentOpen(true)}
                  onAddAppointment={handleAddAppointment}
                  onNavigate={handleNavigate}
                  onStartIntakeFromAppointment={handleStartIntakeFromAppointment}
                  patients={patients}
                  visitTypesList={visitTypesList}
                />
              )}

              {activeScreen === 'clinical-exam' && (
                <ExaminationScreen
                  patient={activeExamPatient}
                  availablePatients={patients}
                  onSelectPatient={setActiveExamPatient}
                  queue={queue}
                  presetChronicConditions={presetChronicConditions}
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
                  visits={visitsCanonical}
                  prescriptions={prescriptionsCanonical}
                  allLabOrders={labOrdersCanonical}
                  allRadiologyOrders={radiologyOrdersCanonical}
                  currentVisitId={
                    visitsCanonical.find(
                      (v) => v.patientId === activeExamPatient?.id && (v.status === 'IN_PROGRESS' || v.status === 'WAITING'),
                    )?.visitId
                  }
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
                  patientsCanonical={patientsCanonical}
                  onNavigate={handleNavigate}
                  onSelectPatientForExam={(p) => setActiveExamPatient(p)}
                  onDeletePatient={handleDeletePatient}
                  onUpdatePatient={handleUpdatePatient}
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
                  onDeleteTransaction={handleDeleteTransaction}
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
                  visitTypesList={visitTypesList}
                  onAddVisitType={handleAddVisitType}
                  onRemoveVisitType={handleRemoveVisitType}
                  onUpdateVisitTypeFee={handleUpdateVisitTypeFee}
                  onGenerateYearlyDemoData={handleGenerateYearlyDemoData}
                  onClearAllData={handleClearAllData}
                  onClearBrowserVisitsOnly={handleClearBrowserVisitsOnly}
                  onClearAllBrowserAndCloud={handleClearAllBrowserAndCloud}
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
        visitTypesList={visitTypesList}
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

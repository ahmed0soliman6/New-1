import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  getDocs,
  writeBatch,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore';
import { auth } from './firebase';
import type {
  Appointment,
  ChronicDisease,
  Diagnosis,
  FollowUp,
  Invoice,
  LabOrder,
  LabTest,
  Medication,
  Patient,
  Payment,
  Prescription,
  RadiologyOrder,
  RadiologyType,
  Symptom,
  Visit,
  DoctorSettings,
  SystemSettings,
  DoctorProfile,
} from '../types/database';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): Error {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
    },
    operationType,
    path,
  };
  const jsonString = JSON.stringify(errInfo);
  console.warn('[Firestore Sync Info]', jsonString);
  return new Error(jsonString);
}

function normalize(value: unknown): unknown {
  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as { toDate?: unknown }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, normalize(item)]));
  return value;
}

const ID_FIELD_MAP: Record<string, string> = {
  patients: 'patientId',
  appointments: 'appointmentId',
  visits: 'visitId',
  invoices: 'invoiceId',
  payments: 'paymentId',
  prescriptions: 'prescriptionId',
  followUps: 'followUpId',
  labOrders: 'labOrderId',
  radiologyOrders: 'radiologyOrderId',
  medications: 'medicationId',
  labTests: 'labTestId',
  radiologyTypes: 'radiologyId',
  diagnoses: 'diagnosisId',
  symptoms: 'symptomId',
  chronicDiseases: 'diseaseId',
};

function subscribeCollection<T>(
  db: Firestore,
  name: string,
  next: (items: T[]) => void,
  error: (reason: Error) => void
): Unsubscribe {
  const idField = ID_FIELD_MAP[name] || 'id';
  return onSnapshot(
    collection(db, name),
    (snapshot) => {
      const items = snapshot.docs.map((item) => {
        const data = item.data();
        return normalize({
          ...data,
          [idField]: data[idField] || item.id,
        }) as T;
      });
      next(items);
    },
    (reason) => {
      const formattedError = handleFirestoreError(reason, OperationType.LIST, name);
      error(formattedError);
    }
  );
}

export const subscribeToPatients = (db: Firestore, next: (items: Patient[]) => void, error: (reason: Error) => void) =>
  subscribeCollection<Patient>(db, 'patients', next, error);

export const subscribeToAppointments = (db: Firestore, next: (items: Appointment[]) => void, error: (reason: Error) => void) =>
  subscribeCollection<Appointment>(db, 'appointments', next, error);

export const subscribeToVisits = (db: Firestore, next: (items: Visit[]) => void, error: (reason: Error) => void) =>
  subscribeCollection<Visit>(db, 'visits', next, error);

export const subscribeToInvoices = (db: Firestore, next: (items: Invoice[]) => void, error: (reason: Error) => void) =>
  subscribeCollection<Invoice>(db, 'invoices', next, error);

export const subscribeToPayments = (db: Firestore, next: (items: Payment[]) => void, error: (reason: Error) => void) =>
  subscribeCollection<Payment>(db, 'payments', next, error);

export const subscribeToPrescriptions = (db: Firestore, next: (items: Prescription[]) => void, error: (reason: Error) => void) =>
  subscribeCollection<Prescription>(db, 'prescriptions', next, error);

export const subscribeToFollowUps = (db: Firestore, next: (items: FollowUp[]) => void, error: (reason: Error) => void) =>
  subscribeCollection<FollowUp>(db, 'followUps', next, error);

export const subscribeToLabOrders = (db: Firestore, next: (items: LabOrder[]) => void, error: (reason: Error) => void) =>
  subscribeCollection<LabOrder>(db, 'labOrders', next, error);

export const subscribeToRadiologyOrders = (db: Firestore, next: (items: RadiologyOrder[]) => void, error: (reason: Error) => void) =>
  subscribeCollection<RadiologyOrder>(db, 'radiologyOrders', next, error);

export const subscribeToMedications = (db: Firestore, next: (items: Medication[]) => void, error: (reason: Error) => void) =>
  subscribeCollection<Medication>(db, 'medications', next, error);

export const subscribeToLabTests = (db: Firestore, next: (items: LabTest[]) => void, error: (reason: Error) => void) =>
  subscribeCollection<LabTest>(db, 'labTests', next, error);

export const subscribeToRadiologyTypes = (db: Firestore, next: (items: RadiologyType[]) => void, error: (reason: Error) => void) =>
  subscribeCollection<RadiologyType>(db, 'radiologyTypes', next, error);

export const subscribeToDiagnoses = (db: Firestore, next: (items: Diagnosis[]) => void, error: (reason: Error) => void) =>
  subscribeCollection<Diagnosis>(db, 'diagnoses', next, error);

export const subscribeToSymptoms = (db: Firestore, next: (items: Symptom[]) => void, error: (reason: Error) => void) =>
  subscribeCollection<Symptom>(db, 'symptoms', next, error);

export const subscribeToChronicDiseases = (db: Firestore, next: (items: ChronicDisease[]) => void, error: (reason: Error) => void) =>
  subscribeCollection<ChronicDisease>(db, 'chronicDiseases', next, error);

export const subscribeToDoctorSettings = (
  db: Firestore,
  next: (settings: DoctorSettings | null) => void,
  error: (reason: Error) => void
): Unsubscribe => {
  return onSnapshot(
    doc(db, 'settings', 'doctorSettings'),
    (snap) => {
      if (snap.exists()) {
        next(normalize(snap.data()) as DoctorSettings);
      } else {
        next(null);
      }
    },
    (reason) => {
      error(handleFirestoreError(reason, OperationType.GET, 'settings/doctorSettings'));
    }
  );
};

export const subscribeToDoctorProfile = (
  db: Firestore,
  next: (profile: DoctorProfile | null) => void,
  error: (reason: Error) => void
): Unsubscribe => {
  return onSnapshot(
    doc(db, 'settings', 'doctorProfile'),
    (snap) => {
      if (snap.exists()) {
        next(normalize(snap.data()) as DoctorProfile);
      } else {
        next(null);
      }
    },
    (reason) => {
      error(handleFirestoreError(reason, OperationType.GET, 'settings/doctorProfile'));
    }
  );
};

export const subscribeToSystemSettings = (
  db: Firestore,
  next: (settings: SystemSettings | null) => void,
  error: (reason: Error) => void
): Unsubscribe => {
  return onSnapshot(
    doc(db, 'settings', 'systemSettings'),
    (snap) => {
      if (snap.exists()) {
        next(normalize(snap.data()) as SystemSettings);
      } else {
        next(null);
      }
    },
    (reason) => {
      error(handleFirestoreError(reason, OperationType.GET, 'settings/systemSettings'));
    }
  );
};

export async function saveCatalogItem<T extends Record<string, unknown>>(
  db: Firestore,
  collectionName: string,
  itemId: string,
  data: T
): Promise<void> {
  try {
    const docRef = doc(db, collectionName, itemId);
    await setDoc(docRef, data, { merge: true });
  } catch (err) {
    throw handleFirestoreError(err, OperationType.WRITE, `${collectionName}/${itemId}`);
  }
}

export async function removeCatalogItem(
  db: Firestore,
  collectionName: string,
  itemId: string
): Promise<void> {
  try {
    const docRef = doc(db, collectionName, itemId);
    await deleteDoc(docRef);
  } catch (err) {
    throw handleFirestoreError(err, OperationType.DELETE, `${collectionName}/${itemId}`);
  }
}

export async function saveSettingsDocument<T extends Record<string, unknown>>(
  db: Firestore,
  docName: string,
  data: T
): Promise<void> {
  try {
    const docRef = doc(db, 'settings', docName);
    await setDoc(docRef, data, { merge: true });
  } catch (err) {
    throw handleFirestoreError(err, OperationType.WRITE, `settings/${docName}`);
  }
}

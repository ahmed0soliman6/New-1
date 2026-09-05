import {
  collection,
  onSnapshot,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore';
import type { Appointment, Invoice, Patient, Payment, Visit } from '../types/database';

function normalize(value: unknown): unknown {
  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as { toDate?: unknown }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, normalize(item)]));
  return value;
}

function subscribeCollection<T>(db: Firestore, name: string, next: (items: T[]) => void, error: (reason: Error) => void): Unsubscribe {
  return onSnapshot(collection(db, name),
    (snapshot) => next(snapshot.docs.map((item) => normalize({ ...item.data(), [name === 'patients' ? 'patientId' : name === 'appointments' ? 'appointmentId' : name === 'visits' ? 'visitId' : name === 'invoices' ? 'invoiceId' : 'paymentId']: item.id }) as T)),
    (reason) => error(reason),
  );
}

export const subscribeToPatients = (db: Firestore, next: (items: Patient[]) => void, error: (reason: Error) => void) => subscribeCollection<Patient>(db, 'patients', next, error);
export const subscribeToAppointments = (db: Firestore, next: (items: Appointment[]) => void, error: (reason: Error) => void) => subscribeCollection<Appointment>(db, 'appointments', next, error);
export const subscribeToVisits = (db: Firestore, next: (items: Visit[]) => void, error: (reason: Error) => void) => subscribeCollection<Visit>(db, 'visits', next, error);
export const subscribeToInvoices = (db: Firestore, next: (items: Invoice[]) => void, error: (reason: Error) => void) => subscribeCollection<Invoice>(db, 'invoices', next, error);
export const subscribeToPayments = (db: Firestore, next: (items: Payment[]) => void, error: (reason: Error) => void) => subscribeCollection<Payment>(db, 'payments', next, error);

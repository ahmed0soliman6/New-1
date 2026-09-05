import {
  collection,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  Timestamp,
  type Firestore,
} from 'firebase/firestore';
import type { Appointment, Patient, PaymentMethod, Visit } from '../types/database';

const id = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
const now = () => new Date().toISOString();

const emptyClinicalData = {
  chiefComplaint: '',
  history: '',
  examination: '',
  diagnosis: [] as string[],
  treatment: '',
};
const emptyVitals = {
  bloodPressure: '',
  pulse: null,
  temperature: null,
  weight: null,
  height: null,
  oxygenSaturation: null,
  randomBloodSugar: null,
};

export async function checkInAppointmentTransaction(params: {
  db: Firestore;
  appointmentId: string;
  paymentAmount: number;
  paymentMethod: PaymentMethod;
  receivedBy: string;
  queueNumber: number;
  receptionistData: Visit['receptionistData'];
}): Promise<{ appointment: Appointment; visit: Visit }> {
  return runTransaction(params.db, async (tx) => {
    const appointmentRef = doc(params.db, 'appointments', params.appointmentId);
    const appointmentSnap = await tx.get(appointmentRef);
    if (!appointmentSnap.exists()) throw new Error('Appointment not found');
    const appointment = appointmentSnap.data() as Appointment;
    if (appointment.status !== 'SCHEDULED') throw new Error('Only scheduled appointments can be checked in');

    const visitId = id('vis');
    const invoiceId = id('inv');
    const paymentId = id('pay');
    const receiptNumber = id('REC');
    const timestamp = now();
    const visit: Visit = {
      visitId,
      patientId: appointment.patientId,
      appointmentId: appointment.appointmentId,
      clinicLocationId: appointment.clinicLocationId,
      visitType: params.paymentAmount === 0 ? 'FOLLOW_UP' : 'NEW',
      source: 'APPOINTMENT',
      status: 'WAITING',
      queueNumber: params.queueNumber,
      receptionistData: params.receptionistData,
      clinicalData: emptyClinicalData,
      vitalSigns: emptyVitals,
      startedAt: null,
      completedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
      createdBy: params.receivedBy,
      doctorId: '',
    };
    const invoiceRef = doc(params.db, 'invoices', invoiceId);
    const paymentRef = doc(params.db, 'payments', paymentId);
    tx.update(appointmentRef, { status: 'ARRIVED', updatedAt: serverTimestamp() });
    tx.set(invoiceRef, {
      invoiceId, patientId: appointment.patientId, visitId, clinicLocationId: appointment.clinicLocationId,
      items: [], subtotal: params.paymentAmount, discount: 0, total: params.paymentAmount,
      paidAmount: params.paymentAmount, remainingAmount: 0, status: 'PAID', createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
    tx.set(paymentRef, {
      paymentId, patientId: appointment.patientId, visitId, invoiceId, clinicLocationId: appointment.clinicLocationId,
      amount: params.paymentAmount, method: params.paymentMethod, status: 'PAID', receiptNumber,
      paidAt: serverTimestamp(), receivedBy: params.receivedBy,
    });
    tx.set(doc(params.db, 'visits', visitId), { ...visit, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    return { appointment: { ...appointment, status: 'ARRIVED', updatedAt: timestamp }, visit };
  });
}

export async function registerWalkInTransaction(params: {
  db: Firestore;
  patient: Patient;
  paymentAmount: number;
  paymentMethod: PaymentMethod;
  receivedBy: string;
  clinicLocationId: string;
  queueNumber: number;
  receptionistData: Visit['receptionistData'];
}): Promise<Visit> {
  return runTransaction(params.db, async (tx) => {
    const timestamp = now();
    const visitId = id('vis');
    const invoiceId = id('inv');
    const paymentId = id('pay');
    tx.set(doc(params.db, 'patients', params.patient.patientId), { ...params.patient, updatedAt: serverTimestamp() }, { merge: true });
    tx.set(doc(params.db, 'invoices', invoiceId), {
      invoiceId, patientId: params.patient.patientId, visitId, clinicLocationId: params.clinicLocationId,
      items: [], subtotal: params.paymentAmount, discount: 0, total: params.paymentAmount, paidAmount: params.paymentAmount,
      remainingAmount: 0, status: 'PAID', createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
    tx.set(doc(params.db, 'payments', paymentId), {
      paymentId, patientId: params.patient.patientId, visitId, invoiceId, clinicLocationId: params.clinicLocationId,
      amount: params.paymentAmount, method: params.paymentMethod, status: 'PAID', receiptNumber: id('REC'),
      paidAt: serverTimestamp(), receivedBy: params.receivedBy,
    });
    const visit: Visit = {
      visitId, patientId: params.patient.patientId, appointmentId: null, clinicLocationId: params.clinicLocationId,
      visitType: params.paymentAmount === 0 ? 'FOLLOW_UP' : 'NEW', source: 'WALK_IN', status: 'WAITING', queueNumber: params.queueNumber,
      receptionistData: params.receptionistData, clinicalData: emptyClinicalData, vitalSigns: emptyVitals,
      startedAt: null, completedAt: null, createdAt: timestamp, updatedAt: timestamp, createdBy: params.receivedBy, doctorId: '',
    };
    tx.set(doc(params.db, 'visits', visitId), { ...visit, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    return visit;
  });
}

export async function startVisitTransaction(db: Firestore, visitId: string, doctorId: string): Promise<void> {
  await runTransaction(db, async (tx) => {
    const ref = doc(db, 'visits', visitId);
    const snap = await tx.get(ref);
    if (!snap.exists() || snap.data().status !== 'WAITING') throw new Error('Only a waiting visit can start');
    tx.update(ref, { status: 'IN_PROGRESS', startedAt: serverTimestamp(), doctorId, updatedAt: serverTimestamp() });
  });
}

export async function completeVisitTransaction(params: {
  db: Firestore;
  visitId: string;
  doctorId: string;
  clinicalData: Visit['clinicalData'];
  vitalSigns: Visit['vitalSigns'];
}): Promise<void> {
  await runTransaction(params.db, async (tx) => {
    const visitRef = doc(params.db, 'visits', params.visitId);
    const snap = await tx.get(visitRef);
    if (!snap.exists() || snap.data().status !== 'IN_PROGRESS') throw new Error('Only an in-progress visit can complete');
    tx.update(visitRef, {
      status: 'COMPLETED', doctorId: params.doctorId, clinicalData: params.clinicalData,
      vitalSigns: params.vitalSigns, completedAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
  });
}

export async function createAppointmentTransaction(params: {
  db: Firestore;
  patient: Patient;
  appointment: Appointment;
}): Promise<void> {
  await runTransaction(params.db, async (tx) => {
    const patientRef = doc(params.db, 'patients', params.patient.patientId);
    const appointmentRef = doc(params.db, 'appointments', params.appointment.appointmentId);
    const patientSnap = await tx.get(patientRef);
    if (!patientSnap.exists()) tx.set(patientRef, { ...params.patient, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    tx.set(appointmentRef, { ...params.appointment, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  });
}

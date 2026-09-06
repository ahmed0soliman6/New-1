import {
  collection,
  doc,
  deleteDoc,
  getDoc,
  runTransaction,
  serverTimestamp,
  Timestamp,
  type Firestore,
} from 'firebase/firestore';
import type {
  Appointment,
  FollowUp,
  LabOrder,
  Patient,
  PaymentMethod,
  Prescription,
  PrescriptionItemSnapshot,
  RadiologyOrder,
  Visit,
} from '../types/database';

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
  queueNumber?: number;
  receptionistData: Visit['receptionistData'];
}): Promise<{ appointment: Appointment; visit: Visit }> {
  return runTransaction(params.db, async (tx) => {
    const today = new Date().toISOString().split('T')[0];
    const counterRef = doc(params.db, 'counters', `queue_${today}`);
    const appointmentRef = doc(params.db, 'appointments', params.appointmentId);

    const [appointmentSnap, counterSnap] = await Promise.all([
      tx.get(appointmentRef),
      tx.get(counterRef),
    ]);

    if (!appointmentSnap.exists()) throw new Error('Appointment not found');
    const appointment = appointmentSnap.data() as Appointment;
    if (appointment.status !== 'SCHEDULED') throw new Error('Only scheduled appointments can be checked in');

    let assignedQueueNumber: number;
    if (params.queueNumber && params.queueNumber > 0) {
      assignedQueueNumber = params.queueNumber;
    } else {
      assignedQueueNumber = counterSnap.exists() ? ((counterSnap.data()?.lastNumber || 0) + 1) : 1;
    }

    const visitId = id('vis');
    const invoiceId = id('inv');
    const paymentId = id('pay');
    const receiptNumber = id('REC');
    const timestamp = now();

    const visit: Visit = {
      visitId,
      patientId: appointment.patientId,
      appointmentId: appointment.appointmentId,
      clinicLocationId: appointment.clinicLocationId || 'loc-mohandessin',
      visitType: params.paymentAmount === 0 ? 'FOLLOW_UP' : 'NEW',
      source: 'APPOINTMENT',
      status: 'WAITING',
      queueNumber: assignedQueueNumber,
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
    const visitRef = doc(params.db, 'visits', visitId);

    tx.set(counterRef, { lastNumber: assignedQueueNumber, date: today }, { merge: true });
    tx.update(appointmentRef, { status: 'ARRIVED', updatedAt: serverTimestamp() });
    tx.set(invoiceRef, {
      invoiceId,
      patientId: appointment.patientId,
      visitId,
      clinicLocationId: appointment.clinicLocationId || 'loc-mohandessin',
      items: [],
      subtotal: params.paymentAmount,
      discount: 0,
      total: params.paymentAmount,
      paidAmount: params.paymentAmount,
      remainingAmount: 0,
      status: 'PAID',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    tx.set(paymentRef, {
      paymentId,
      patientId: appointment.patientId,
      visitId,
      invoiceId,
      clinicLocationId: appointment.clinicLocationId || 'loc-mohandessin',
      amount: params.paymentAmount,
      method: params.paymentMethod,
      status: 'PAID',
      receiptNumber,
      paidAt: serverTimestamp(),
      receivedBy: params.receivedBy,
    });
    tx.set(visitRef, { ...visit, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });

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
  queueNumber?: number;
  receptionistData: Visit['receptionistData'];
}): Promise<Visit> {
  return runTransaction(params.db, async (tx) => {
    const today = new Date().toISOString().split('T')[0];
    const counterRef = doc(params.db, 'counters', `queue_${today}`);
    const counterSnap = await tx.get(counterRef);

    let assignedQueueNumber: number;
    if (params.queueNumber && params.queueNumber > 0) {
      assignedQueueNumber = params.queueNumber;
    } else {
      assignedQueueNumber = counterSnap.exists() ? ((counterSnap.data()?.lastNumber || 0) + 1) : 1;
    }

    const timestamp = now();
    const visitId = id('vis');
    const invoiceId = id('inv');
    const paymentId = id('pay');

    tx.set(counterRef, { lastNumber: assignedQueueNumber, date: today }, { merge: true });
    tx.set(doc(params.db, 'patients', params.patient.patientId), { ...params.patient, updatedAt: serverTimestamp() }, { merge: true });
    tx.set(doc(params.db, 'invoices', invoiceId), {
      invoiceId,
      patientId: params.patient.patientId,
      visitId,
      clinicLocationId: params.clinicLocationId,
      items: [],
      subtotal: params.paymentAmount,
      discount: 0,
      total: params.paymentAmount,
      paidAmount: params.paymentAmount,
      remainingAmount: 0,
      status: 'PAID',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    tx.set(doc(params.db, 'payments', paymentId), {
      paymentId,
      patientId: params.patient.patientId,
      visitId,
      invoiceId,
      clinicLocationId: params.clinicLocationId,
      amount: params.paymentAmount,
      method: params.paymentMethod,
      status: 'PAID',
      receiptNumber: id('REC'),
      paidAt: serverTimestamp(),
      receivedBy: params.receivedBy,
    });

    const visit: Visit = {
      visitId,
      patientId: params.patient.patientId,
      appointmentId: null,
      clinicLocationId: params.clinicLocationId,
      visitType: params.paymentAmount === 0 ? 'FOLLOW_UP' : 'NEW',
      source: 'WALK_IN',
      status: 'WAITING',
      queueNumber: assignedQueueNumber,
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
  prescriptionItems?: PrescriptionItemSnapshot[];
  prescriptionNotes?: string;
  labOrders?: Array<{ testId?: string | null; testName: string; notes?: string }>;
  radiologyOrders?: Array<{ radiologyTypeId?: string | null; radiologyName: string; notes?: string }>;
  followUp?: { scheduledDate: string; fee: number; isFree: boolean; notes: string } | null;
}): Promise<void> {
  await runTransaction(params.db, async (tx) => {
    const visitRef = doc(params.db, 'visits', params.visitId);
    const snap = await tx.get(visitRef);
    if (!snap.exists()) throw new Error('Visit not found');
    const visitData = snap.data() as Visit;
    if (visitData.status !== 'IN_PROGRESS' && visitData.status !== 'WAITING') {
      throw new Error('Only an active visit can complete');
    }

    tx.update(visitRef, {
      status: 'COMPLETED',
      doctorId: params.doctorId,
      clinicalData: params.clinicalData,
      vitalSigns: params.vitalSigns,
      completedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Save Prescription document in prescriptions collection atomically
    if (params.prescriptionItems && params.prescriptionItems.length > 0) {
      const rxId = id('rx');
      const rxRef = doc(params.db, 'prescriptions', rxId);
      tx.set(rxRef, {
        prescriptionId: rxId,
        patientId: visitData.patientId,
        visitId: visitData.visitId,
        doctorId: params.doctorId,
        clinicLocationId: visitData.clinicLocationId || 'loc-mohandessin',
        items: params.prescriptionItems,
        notes: params.prescriptionNotes || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    // Save Lab Orders atomically
    if (params.labOrders && params.labOrders.length > 0) {
      for (const lab of params.labOrders) {
        const labOrderId = id('lab-ord');
        const labRef = doc(params.db, 'labOrders', labOrderId);
        tx.set(labRef, {
          labOrderId,
          patientId: visitData.patientId,
          visitId: visitData.visitId,
          testId: lab.testId || null,
          testName: lab.testName,
          status: 'ORDERED',
          result: '',
          notes: lab.notes || '',
          orderedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    }

    // Save Radiology Orders atomically
    if (params.radiologyOrders && params.radiologyOrders.length > 0) {
      for (const rad of params.radiologyOrders) {
        const radOrderId = id('rad-ord');
        const radRef = doc(params.db, 'radiologyOrders', radOrderId);
        tx.set(radRef, {
          radiologyOrderId: radOrderId,
          patientId: visitData.patientId,
          visitId: visitData.visitId,
          radiologyTypeId: rad.radiologyTypeId || null,
          radiologyName: rad.radiologyName,
          status: 'ORDERED',
          result: '',
          report: '',
          notes: rad.notes || '',
          orderedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    }

    // Save Follow-Up atomically
    if (params.followUp) {
      const followUpId = id('fol');
      const followUpRef = doc(params.db, 'followUps', followUpId);
      tx.set(followUpRef, {
        followUpId,
        patientId: visitData.patientId,
        sourceVisitId: visitData.visitId,
        clinicLocationId: visitData.clinicLocationId || 'loc-mohandessin',
        scheduledDate: params.followUp.scheduledDate,
        scheduledTime: null,
        status: 'UPCOMING',
        fee: params.followUp.fee,
        isFree: params.followUp.isFree,
        notes: params.followUp.notes || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
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
    if (!patientSnap.exists()) {
      tx.set(patientRef, { ...params.patient, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    }
    tx.set(appointmentRef, { ...params.appointment, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  });
}

export async function deleteAppointmentTransaction(db: Firestore, appointmentId: string): Promise<void> {
  await deleteDoc(doc(db, 'appointments', appointmentId));
}

export async function deletePatientTransaction(db: Firestore, patientId: string): Promise<void> {
  await deleteDoc(doc(db, 'patients', patientId));
}

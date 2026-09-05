import { Appointment, Patient, Visit, VisitStatus, UserRole } from '../types/database';

/** Domain transition guards. Firestore transactions should call these before committing. */
export function startVisit(visit: Visit, role: UserRole, now = new Date().toISOString()): Visit {
  if (role !== 'DOCTOR') throw new Error('Only a doctor can start a visit');
  if (visit.status !== 'WAITING') throw new Error('Only a waiting visit can be started');
  return { ...visit, status: 'IN_PROGRESS', startedAt: now, updatedAt: now };
}

export function completeVisit(visit: Visit, role: UserRole, now = new Date().toISOString()): Visit {
  if (role !== 'DOCTOR') throw new Error('Only a doctor can complete a visit');
  if (visit.status !== 'IN_PROGRESS') throw new Error('Only an in-progress visit can be completed');
  return { ...visit, status: 'COMPLETED', completedAt: now, updatedAt: now };
}

export function waitingQueue(visits: Visit[]): Visit[] {
  return visits.filter((visit) => visit.status === 'WAITING').sort((a, b) => (a.queueNumber ?? 0) - (b.queueNumber ?? 0));
}

export function resolvePatient(patients: Patient[], name: string, phone?: string): Patient | undefined {
  const normalized = name.trim().toLocaleLowerCase();
  return patients.find((patient) => patient.fullName.trim().toLocaleLowerCase() === normalized || (!!phone && patient.phone === phone));
}

export function canCheckIn(appointment: Appointment): boolean {
  return appointment.status === 'SCHEDULED';
}

export const WORKFLOW_ORDER = {
  checkInAppointment: ['SCHEDULED', 'ARRIVED', 'PAYMENT', 'WAITING'],
  registerWalkInVisit: ['PATIENT', 'PAYMENT', 'WAITING'],
  startVisit: ['WAITING', 'IN_PROGRESS'],
  completeVisit: ['IN_PROGRESS', 'COMPLETED'],
} as const;

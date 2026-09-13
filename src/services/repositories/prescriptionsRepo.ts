import type { Firestore } from 'firebase/firestore';
import type {
  Prescription,
  Medication,
  LabTest,
  RadiologyType,
  Diagnosis,
  Symptom,
  ChronicDisease,
} from '../../types/database';
import { subscribeCollection } from './common';

export const subscribeToPrescriptions = (
  db: Firestore,
  next: (items: Prescription[]) => void,
  error: (reason: Error) => void
) => subscribeCollection<Prescription>(db, 'prescriptions', next, error);

export const subscribeToMedications = (
  db: Firestore,
  next: (items: Medication[]) => void,
  error: (reason: Error) => void
) => subscribeCollection<Medication>(db, 'medications', next, error);

export const subscribeToLabTests = (
  db: Firestore,
  next: (items: LabTest[]) => void,
  error: (reason: Error) => void
) => subscribeCollection<LabTest>(db, 'labTests', next, error);

export const subscribeToRadiologyTypes = (
  db: Firestore,
  next: (items: RadiologyType[]) => void,
  error: (reason: Error) => void
) => subscribeCollection<RadiologyType>(db, 'radiologyTypes', next, error);

export const subscribeToDiagnoses = (
  db: Firestore,
  next: (items: Diagnosis[]) => void,
  error: (reason: Error) => void
) => subscribeCollection<Diagnosis>(db, 'diagnoses', next, error);

export const subscribeToSymptoms = (
  db: Firestore,
  next: (items: Symptom[]) => void,
  error: (reason: Error) => void
) => subscribeCollection<Symptom>(db, 'symptoms', next, error);

export const subscribeToChronicDiseases = (
  db: Firestore,
  next: (items: ChronicDisease[]) => void,
  error: (reason: Error) => void
) => subscribeCollection<ChronicDisease>(db, 'chronicDiseases', next, error);

import type { Firestore } from 'firebase/firestore';
import type { Patient } from '../../types/database';
import { subscribeCollection } from './common';

export const subscribeToPatients = (
  db: Firestore,
  next: (items: Patient[]) => void,
  error: (reason: Error) => void
) => subscribeCollection<Patient>(db, 'patients', next, error);

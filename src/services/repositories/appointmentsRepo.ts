import type { Firestore } from 'firebase/firestore';
import type { Appointment, FollowUp } from '../../types/database';
import { subscribeCollection } from './common';

export const subscribeToAppointments = (
  db: Firestore,
  next: (items: Appointment[]) => void,
  error: (reason: Error) => void
) => subscribeCollection<Appointment>(db, 'appointments', next, error);

export const subscribeToFollowUps = (
  db: Firestore,
  next: (items: FollowUp[]) => void,
  error: (reason: Error) => void
) => subscribeCollection<FollowUp>(db, 'followUps', next, error);

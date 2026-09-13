import type { Firestore } from 'firebase/firestore';
import type { Visit, LabOrder, RadiologyOrder } from '../../types/database';
import { subscribeCollection } from './common';

export const subscribeToVisits = (
  db: Firestore,
  next: (items: Visit[]) => void,
  error: (reason: Error) => void
) => subscribeCollection<Visit>(db, 'visits', next, error);

export const subscribeToLabOrders = (
  db: Firestore,
  next: (items: LabOrder[]) => void,
  error: (reason: Error) => void
) => subscribeCollection<LabOrder>(db, 'labOrders', next, error);

export const subscribeToRadiologyOrders = (
  db: Firestore,
  next: (items: RadiologyOrder[]) => void,
  error: (reason: Error) => void
) => subscribeCollection<RadiologyOrder>(db, 'radiologyOrders', next, error);

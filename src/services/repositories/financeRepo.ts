import type { Firestore } from 'firebase/firestore';
import type { Invoice, Payment } from '../../types/database';
import { subscribeCollection } from './common';

export const subscribeToInvoices = (
  db: Firestore,
  next: (items: Invoice[]) => void,
  error: (reason: Error) => void
) => subscribeCollection<Invoice>(db, 'invoices', next, error);

export const subscribeToPayments = (
  db: Firestore,
  next: (items: Payment[]) => void,
  error: (reason: Error) => void
) => subscribeCollection<Payment>(db, 'payments', next, error);

export const subscribeToServices = (
  db: Firestore,
  next: (items: any[]) => void,
  error: (reason: Error) => void
) => subscribeCollection<any>(db, 'services', next, error);

export const subscribeToExpenses = (
  db: Firestore,
  next: (items: any[]) => void,
  error: (reason: Error) => void
) => subscribeCollection<any>(db, 'expenses', next, error);

export const subscribeToExpenseCategories = (
  db: Firestore,
  next: (items: any[]) => void,
  error: (reason: Error) => void
) => subscribeCollection<any>(db, 'expenseCategories', next, error);

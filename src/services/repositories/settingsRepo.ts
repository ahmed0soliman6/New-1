import {
  doc,
  onSnapshot,
  setDoc,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore';
import type {
  DoctorSettings,
  SystemSettings,
  DoctorProfile,
} from '../../types/database';
import { handleFirestoreError, normalize, OperationType } from './common';

export interface ClinicStatusState {
  status: 'available' | 'break';
  updatedAt: string;
  updatedBy: string;
  message?: string;
}

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

export const subscribeToVisitTypes = (
  db: Firestore,
  next: (types: { id: string; name: string; fee: number }[] | null) => void,
  error: (reason: Error) => void
): Unsubscribe => {
  return onSnapshot(
    doc(db, 'settings', 'visitTypes'),
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        next(((data.items || data.types || []) as { id: string; name: string; fee: number }[]));
      } else {
        next(null);
      }
    },
    (reason) => {
      error(handleFirestoreError(reason, OperationType.GET, 'settings/visitTypes'));
    }
  );
};

export const subscribeToPrinterSettings = <T = Record<string, unknown>>(
  db: Firestore,
  next: (settings: T | null) => void,
  error: (reason: Error) => void
): Unsubscribe => {
  return onSnapshot(
    doc(db, 'settings', 'printerSettings'),
    (snap) => {
      if (snap.exists()) {
        next(normalize(snap.data()) as T);
      } else {
        next(null);
      }
    },
    (reason) => {
      error(handleFirestoreError(reason, OperationType.GET, 'settings/printerSettings'));
    }
  );
};

export const subscribeToLifestylePresets = (
  db: Firestore,
  next: (presets: string[] | null) => void,
  error: (reason: Error) => void
): Unsubscribe => {
  return onSnapshot(
    doc(db, 'settings', 'lifestylePresets'),
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        next((data.items as string[]) || []);
      } else {
        next(null);
      }
    },
    (reason) => {
      error(handleFirestoreError(reason, OperationType.GET, 'settings/lifestylePresets'));
    }
  );
};

export const subscribeToAlertSettings = (
  db: Firestore,
  next: (settings: any | null) => void,
  error: (reason: Error) => void
): Unsubscribe => {
  return onSnapshot(
    doc(db, 'settings', 'alertSettings'),
    (snap) => {
      if (snap.exists()) {
        next(normalize(snap.data()));
      } else {
        next(null);
      }
    },
    (reason) => {
      error(handleFirestoreError(reason, OperationType.GET, 'settings/alertSettings'));
    }
  );
};

export const subscribeToClinicStatus = (
  db: Firestore,
  next: (status: ClinicStatusState | null) => void,
  error: (reason: Error) => void
): Unsubscribe => {
  return onSnapshot(
    doc(db, 'settings', 'clinicStatus'),
    (snap) => {
      if (snap.exists()) {
        next(snap.data() as ClinicStatusState);
      } else {
        next(null);
      }
    },
    (reason) => {
      error(handleFirestoreError(reason, OperationType.GET, 'settings/clinicStatus'));
    }
  );
};

export const updateClinicStatusInFirestore = async (
  db: Firestore,
  status: 'available' | 'break',
  updatedBy: string
) => {
  const ref = doc(db, 'settings', 'clinicStatus');
  await setDoc(
    ref,
    {
      status,
      updatedAt: new Date().toISOString(),
      updatedBy,
      message: status === 'break' ? 'الطبيب في فترة استراحة ☕' : 'الطبيب متاح الآن للكشف 🟢',
    },
    { merge: true }
  );
};

export const subscribeToRecurringTemplates = (
  db: Firestore,
  next: (templates: any[] | null) => void,
  error: (reason: Error) => void
): Unsubscribe => {
  return onSnapshot(
    doc(db, 'settings', 'recurringTemplates'),
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        next((data.items as any[]) || []);
      } else {
        next(null);
      }
    },
    (reason) => {
      error(handleFirestoreError(reason, OperationType.GET, 'settings/recurringTemplates'));
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

export const subscribeToPrescriptionSettings = <T = Record<string, unknown>>(
  db: Firestore,
  next: (settings: T | null) => void,
  error: (reason: Error) => void
): Unsubscribe => {
  return onSnapshot(
    doc(db, 'settings', 'prescriptionSettings'),
    (snap) => {
      if (snap.exists()) {
        next(normalize(snap.data()) as T);
      } else {
        next(null);
      }
    },
    (reason) => {
      error(handleFirestoreError(reason, OperationType.GET, 'settings/prescriptionSettings'));
    }
  );
};

export const subscribeToLatestAlert = <T = Record<string, unknown>>(
  db: Firestore,
  next: (alert: T | null) => void,
  error: (reason: Error) => void
): Unsubscribe => {
  return onSnapshot(
    doc(db, 'settings', 'latestAlert'),
    (snap) => {
      if (snap.exists()) {
        next(normalize(snap.data()) as T);
      } else {
        next(null);
      }
    },
    (reason) => {
      error(handleFirestoreError(reason, OperationType.GET, 'settings/latestAlert'));
    }
  );
};

export async function publishAlert(
  db: Firestore,
  alert: {
    id: string;
    type: string;
    title: string;
    message: string;
    ticket?: string;
    timestamp: string;
    patientId?: string;
    visitId?: string;
    senderId?: string;
  }
): Promise<void> {
  const ref = doc(db, 'settings', 'latestAlert');
  await setDoc(ref, {
    ...alert,
    updatedAt: new Date().toISOString(),
  });
}

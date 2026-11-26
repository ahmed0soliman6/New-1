import {
  addDoc,
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore';
import type {
  DoctorSettings,
  SystemSettings,
  DoctorProfile,
} from '../../types/database';
import { FirestoreCollections, SettingsDocs } from '../firebase/collections';
import { handleFirestoreError, normalize, OperationType } from './common';
import { meterDoc, meterQuery } from '../readMeter';

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
    doc(db, FirestoreCollections.SETTINGS, SettingsDocs.DOCTOR_SETTINGS),
    (snap) => {
      meterDoc('settings/doctorSettings', snap);
      if (snap.exists()) {
        next(normalize(snap.data()) as DoctorSettings);
      } else {
        next(null);
      }
    },
    (reason) => {
      error(handleFirestoreError(reason, OperationType.GET, `${FirestoreCollections.SETTINGS}/${SettingsDocs.DOCTOR_SETTINGS}`));
    }
  );
};

export const subscribeToVisitTypes = (
  db: Firestore,
  next: (types: { id: string; name: string; fee: number }[] | null) => void,
  error: (reason: Error) => void
): Unsubscribe => {
  return onSnapshot(
    doc(db, FirestoreCollections.SETTINGS, SettingsDocs.VISIT_TYPES),
    (snap) => {
      meterDoc('settings/visitTypes', snap);
      if (snap.exists()) {
        const data = snap.data();
        next(((data.items || data.types || []) as { id: string; name: string; fee: number }[]));
      } else {
        next(null);
      }
    },
    (reason) => {
      error(handleFirestoreError(reason, OperationType.GET, `${FirestoreCollections.SETTINGS}/${SettingsDocs.VISIT_TYPES}`));
    }
  );
};

export const subscribeToPrinterSettings = <T = Record<string, unknown>>(
  db: Firestore,
  next: (settings: T | null) => void,
  error: (reason: Error) => void
): Unsubscribe => {
  return onSnapshot(
    doc(db, FirestoreCollections.SETTINGS, SettingsDocs.PRINTER_SETTINGS),
    (snap) => {
      meterDoc('settings/printerSettings', snap);
      if (snap.exists()) {
        next(normalize(snap.data()) as T);
      } else {
        next(null);
      }
    },
    (reason) => {
      error(handleFirestoreError(reason, OperationType.GET, `${FirestoreCollections.SETTINGS}/${SettingsDocs.PRINTER_SETTINGS}`));
    }
  );
};

export const subscribeToLifestylePresets = (
  db: Firestore,
  next: (presets: string[] | null) => void,
  error: (reason: Error) => void
): Unsubscribe => {
  return onSnapshot(
    doc(db, FirestoreCollections.SETTINGS, SettingsDocs.LIFESTYLE_PRESETS),
    (snap) => {
      meterDoc('settings/lifestylePresets', snap);
      if (snap.exists()) {
        const data = snap.data();
        next((data.items as string[]) || []);
      } else {
        next(null);
      }
    },
    (reason) => {
      error(handleFirestoreError(reason, OperationType.GET, `${FirestoreCollections.SETTINGS}/${SettingsDocs.LIFESTYLE_PRESETS}`));
    }
  );
};

export const subscribeToAlertSettings = (
  db: Firestore,
  next: (settings: any | null) => void,
  error: (reason: Error) => void
): Unsubscribe => {
  return onSnapshot(
    doc(db, FirestoreCollections.SETTINGS, SettingsDocs.ALERT_SETTINGS),
    (snap) => {
      meterDoc('settings/alertSettings', snap);
      if (snap.exists()) {
        next(normalize(snap.data()));
      } else {
        next(null);
      }
    },
    (reason) => {
      error(handleFirestoreError(reason, OperationType.GET, `${FirestoreCollections.SETTINGS}/${SettingsDocs.ALERT_SETTINGS}`));
    }
  );
};

export const subscribeToClinicStatus = (
  db: Firestore,
  next: (status: ClinicStatusState | null) => void,
  error: (reason: Error) => void
): Unsubscribe => {
  return onSnapshot(
    doc(db, FirestoreCollections.SETTINGS, SettingsDocs.CLINIC_STATUS),
    (snap) => {
      meterDoc('settings/clinicStatus', snap);
      if (snap.exists()) {
        next(snap.data() as ClinicStatusState);
      } else {
        next(null);
      }
    },
    (reason) => {
      error(handleFirestoreError(reason, OperationType.GET, `${FirestoreCollections.SETTINGS}/${SettingsDocs.CLINIC_STATUS}`));
    }
  );
};

export const updateClinicStatusInFirestore = async (
  db: Firestore,
  status: 'available' | 'break',
  updatedBy: string
) => {
  const ref = doc(db, FirestoreCollections.SETTINGS, SettingsDocs.CLINIC_STATUS);
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
    doc(db, FirestoreCollections.SETTINGS, SettingsDocs.RECURRING_TEMPLATES),
    (snap) => {
      meterDoc('settings/recurringTemplates', snap);
      if (snap.exists()) {
        const data = snap.data();
        next((data.items as any[]) || []);
      } else {
        next(null);
      }
    },
    (reason) => {
      error(handleFirestoreError(reason, OperationType.GET, `${FirestoreCollections.SETTINGS}/${SettingsDocs.RECURRING_TEMPLATES}`));
    }
  );
};

export const subscribeToDoctorProfile = (
  db: Firestore,
  next: (profile: DoctorProfile | null) => void,
  error: (reason: Error) => void
): Unsubscribe => {
  return onSnapshot(
    doc(db, FirestoreCollections.SETTINGS, SettingsDocs.DOCTOR_PROFILE),
    (snap) => {
      meterDoc('settings/doctorProfile', snap);
      if (snap.exists()) {
        next(normalize(snap.data()) as DoctorProfile);
      } else {
        next(null);
      }
    },
    (reason) => {
      error(handleFirestoreError(reason, OperationType.GET, `${FirestoreCollections.SETTINGS}/${SettingsDocs.DOCTOR_PROFILE}`));
    }
  );
};

export const subscribeToSystemSettings = (
  db: Firestore,
  next: (settings: SystemSettings | null) => void,
  error: (reason: Error) => void
): Unsubscribe => {
  return onSnapshot(
    doc(db, FirestoreCollections.SETTINGS, SettingsDocs.SYSTEM_SETTINGS),
    (snap) => {
      meterDoc('settings/systemSettings', snap);
      if (snap.exists()) {
        next(normalize(snap.data()) as SystemSettings);
      } else {
        next(null);
      }
    },
    (reason) => {
      error(handleFirestoreError(reason, OperationType.GET, `${FirestoreCollections.SETTINGS}/${SettingsDocs.SYSTEM_SETTINGS}`));
    }
  );
};

export const subscribeToPrescriptionSettings = <T = Record<string, unknown>>(
  db: Firestore,
  next: (settings: T | null) => void,
  error: (reason: Error) => void
): Unsubscribe => {
  return onSnapshot(
    doc(db, FirestoreCollections.SETTINGS, SettingsDocs.PRESCRIPTION_SETTINGS),
    (snap) => {
      meterDoc('settings/prescriptionSettings', snap);
      if (snap.exists()) {
        next(normalize(snap.data()) as T);
      } else {
        next(null);
      }
    },
    (reason) => {
      error(handleFirestoreError(reason, OperationType.GET, `${FirestoreCollections.SETTINGS}/${SettingsDocs.PRESCRIPTION_SETTINGS}`));
    }
  );
};

export const subscribeToLatestAlert = <T = Record<string, unknown>>(
  db: Firestore,
  next: (alert: T | null) => void,
  error: (reason: Error) => void
): Unsubscribe => {
  return onSnapshot(
    doc(db, FirestoreCollections.SETTINGS, SettingsDocs.LATEST_ALERT),
    (snap) => {
      meterDoc('settings/latestAlert', snap);
      if (snap.exists()) {
        next(normalize(snap.data()) as T);
      } else {
        next(null);
      }
    },
    (reason) => {
      error(handleFirestoreError(reason, OperationType.GET, `${FirestoreCollections.SETTINGS}/${SettingsDocs.LATEST_ALERT}`));
    }
  );
};

// د15: مجموعة تنبيهات (مستند لكل تنبيه) بدل مستند واحد يُستبدَل.
// ملاحظة: لا يوجد مفهوم deviceId في الكود إطلاقاً — لم يُخترع واحد؛ التمييز
// بين الأجهزة يتم بحقل senderId الموجود أصلاً (اسم المستخدم المُرسل).
export const ALERTS_COLLECTION = 'alerts';

/** نصوص العرض الافتراضية حسب نوع التنبيه — تُشتق عندما لا يأتي عنوان/رسالة. */
export function deriveAlertDisplayText(type: string): { title: string; message: string } {
  switch (type) {
    case 'new_visit':
      return { title: 'وصل مريض جديد', message: 'تم تسجيل زيارة جديدة في الاستقبال.' };
    case 'call':
      return { title: 'نداء مريض للكشف', message: 'يرجى توجه المريض إلى غرفة الكشف.' };
    case 'finish':
      return { title: 'انتهاء الكشف الطبي', message: 'تم إنهاء الكشف الطبي.' };
    default:
      return { title: 'تنبيه من العيادة', message: 'حدث جديد في العيادة.' };
  }
}

/**
 * د15: ينشر التنبيه كمستند مستقل في مجموعة `alerts` (مستند لكل تنبيه)،
 * فيحفظ تنبيهان متزامنان من جهازين معاً بدل أن يمحو أحدهما الآخر.
 * يحمل المستند العنوان والرسالة ورقم التذكرة التي يحتاجها ClinicAlertPayload.
 */
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
  const fallback = deriveAlertDisplayText(alert.type);
  await addDoc(collection(db, ALERTS_COLLECTION), {
    id: alert.id,
    type: alert.type,
    title: alert.title?.trim() ? alert.title : fallback.title,
    message: alert.message?.trim() ? alert.message : fallback.message,
    ticket: alert.ticket ?? null,
    timestamp: alert.timestamp,
    patientId: alert.patientId ?? null,
    visitId: alert.visitId ?? null,
    senderId: alert.senderId ?? null,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * د15: اشتراك في أحدث التنبيهات من مجموعة `alerts` (الأحدث أولاً).
 * تجاهل التنبيهات الأقدم من دقيقتين يبقى مسؤولية المستقبِل (كما كان مع
 * المستند الواحد) — انظر App.tsx.
 */
export const subscribeToAlerts = <T = Record<string, unknown>>(
  db: Firestore,
  next: (alerts: T[]) => void,
  error: (reason: Error) => void
): Unsubscribe => {
  return onSnapshot(
    query(collection(db, ALERTS_COLLECTION), orderBy('updatedAt', 'desc'), limit(20)),
    (snap) => {
      meterQuery('alerts', snap);
      next(snap.docs.map((d) => normalize({ id: d.id, ...d.data() }) as T));
    },
    (reason) => {
      error(handleFirestoreError(reason, OperationType.LIST, ALERTS_COLLECTION));
    }
  );
};


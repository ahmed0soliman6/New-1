import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFunctions, type Functions } from 'firebase/functions';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
};

export const firebaseConfigured = Object.values(firebaseConfig).every(Boolean);
export const firebaseConfigError = firebaseConfigured ? null : 'أضف إعدادات Firebase في متغيرات VITE_FIREBASE_* قبل تسجيل الدخول.';
export const firebaseApp: FirebaseApp | null = firebaseConfigured ? (getApps()[0] ?? initializeApp(firebaseConfig)) : null;
export const auth: Auth | null = firebaseApp ? getAuth(firebaseApp) : null;
export const cloudFunctions: Functions | null = firebaseApp ? getFunctions(firebaseApp) : null;
export const db: Firestore | null = firebaseApp ? initializeFirestore(firebaseApp, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) }) : null;

export function requireFirebase(): { auth: Auth; db: Firestore; functions: Functions } {
  if (!auth || !db || !cloudFunctions) throw new Error(firebaseConfigError ?? 'Firebase is not configured');
  return { auth, db, functions: cloudFunctions };
}

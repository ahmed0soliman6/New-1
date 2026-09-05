import { doc, getDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword, signOut, type User as FirebaseUser } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { requireFirebase } from './firebase';
import type { UserRole } from '../types/database';

const internalEmail = (username: string) => `${username.trim().toLowerCase()}@auth.solimedical.local`;

export async function loginWithUsername(username: string, password: string): Promise<FirebaseUser> {
  const { auth, functions } = requireFirebase();
  const resolve = httpsCallable<{ username: string }, { email: string }>(functions, 'resolveUsername');
  const result = await resolve({ username });
  const credential = await signInWithEmailAndPassword(auth, result.data.email || internalEmail(username), password);
  const profile = await getDoc(doc(requireFirebase().db, 'users', credential.user.uid));
  if (!profile.exists() || profile.data().active !== true) { await signOut(auth); throw new Error('هذا الحساب غير نشط أو لم يكتمل ملف المستخدم.'); }
  return credential.user;
}

export async function getCurrentUserProfile(uid: string): Promise<{ uid: string; username: string; displayName: string; role: UserRole; active: boolean } | null> {
  const { db } = requireFirebase();
  const snapshot = await getDoc(doc(db, 'users', uid));
  if (!snapshot.exists()) return null;
  return snapshot.data() as { uid: string; username: string; displayName: string; role: UserRole; active: boolean };
}

export async function getInitialAdminStatus(): Promise<{ ready: boolean; claimed: boolean }> {
  const { functions } = requireFirebase();
  const status = httpsCallable<void, { ready: boolean; claimed: boolean }>(functions, 'getBootstrapStatus');
  return (await status()).data;
}

export async function createInitialAdmin(params: { username: string; displayName: string; password: string }): Promise<{ username: string; recoveryCode: string }> {
  const { functions } = requireFirebase();
  const create = httpsCallable<typeof params, { username: string; recoveryCode: string }>(functions, 'createInitialAdmin');
  return (await create(params)).data;
}

export async function recoverPassword(params: { username: string; recoveryCode: string; password: string }): Promise<void> {
  const { functions } = requireFirebase();
  const recover = httpsCallable<typeof params, { ok: true }>(functions, 'recoverPassword');
  await recover(params);
}

export async function logoutAccount(): Promise<void> {
  const { auth } = requireFirebase();
  await signOut(auth);
}

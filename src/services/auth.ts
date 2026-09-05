import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, deleteUser, onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { requireFirebase } from './firebase';
import type { UserRole } from '../types/database';

const normalizeUsername = (username: string) => username.trim().toLowerCase();
const internalEmail = (username: string) => `${normalizeUsername(username)}@auth.solimedical.local`;

export async function loginWithUsername(username: string, password: string): Promise<FirebaseUser> {
  const { auth, db } = requireFirebase();
  const mapping = await getDoc(doc(db, 'usernames', normalizeUsername(username)));
  const credential = await signInWithEmailAndPassword(auth, mapping.exists() ? mapping.data().email : internalEmail(username), password);
  // Authentication is the source of truth on the Spark-only setup.
  // A Firestore profile may be created later and must not force a logout.
  return credential.user;
}

export async function getCurrentUserProfile(uid: string): Promise<{ uid: string; username: string; displayName: string; role: UserRole; active: boolean } | null> {
  const { db } = requireFirebase();
  const snapshot = await getDoc(doc(db, 'users', uid));
  return snapshot.exists() ? snapshot.data() as { uid: string; username: string; displayName: string; role: UserRole; active: boolean } : null;
}

export async function getInitialAdminStatus(): Promise<{ ready: boolean; claimed: boolean }> {
  const { db } = requireFirebase();
  const bootstrap = await getDoc(doc(db, '_system', 'bootstrap'));
  return { ready: bootstrap.data()?.status === 'COMPLETED', claimed: bootstrap.data()?.status === 'CLAIMED' };
}

export async function createInitialAdmin(params: { username: string; displayName: string; password: string }): Promise<{ username: string }> {
  const { auth } = requireFirebase();
  const usernameLower = normalizeUsername(params.username);
  if (!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(usernameLower) || !params.displayName.trim() || params.password.length < 8) throw new Error('بيانات المدير غير صحيحة.');
  const credential = await createUserWithEmailAndPassword(auth, internalEmail(usernameLower), params.password);
  await credential.user.getIdToken(true);
  await new Promise<void>((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      unsubscribe();
      if (currentUser?.uid === credential.user.uid) resolve(); else reject(new Error('لم تكتمل جلسة Firebase بعد.'));
    }, reject);
  });
  // Spark-compatible bootstrap: Authentication is the source of truth for the first admin.
  // Firestore records are optional and must not block first login when rules are being configured.
  return { username: usernameLower };
}
export async function logoutAccount(): Promise<void> { await signOut(requireFirebase().auth); }

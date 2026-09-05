import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, deleteUser, onAuthStateChanged, getAuth, type User as FirebaseUser } from 'firebase/auth';
import { initializeApp, deleteApp } from 'firebase/app';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { requireFirebase, firebaseConfig } from './firebase';
import type { UserRole } from '../types/database';

const normalizeUsername = (username: string) => username.trim().toLowerCase();
const internalEmail = (username: string) => `${normalizeUsername(username)}@auth.solimedical.local`;

export async function loginWithUsername(username: string, password: string): Promise<FirebaseUser> {
  const { auth, db } = requireFirebase();
  const mapping = await getDoc(doc(db, 'usernames', normalizeUsername(username)));
  const credential = await signInWithEmailAndPassword(auth, mapping.exists() ? mapping.data().email : internalEmail(username), password);
  const userRef = doc(db, 'users', credential.user.uid);
  const profile = await getDoc(userRef);
  if (!profile.exists()) {
    const now = serverTimestamp();
    await setDoc(userRef, { uid: credential.user.uid, username: normalizeUsername(username), displayName: normalizeUsername(username), email: credential.user.email || internalEmail(username), role: 'ADMIN', active: true, preferredLanguage: 'ar', createdAt: now, updatedAt: now, createdBy: null });
    await setDoc(doc(db, 'usernames', normalizeUsername(username)), { uid: credential.user.uid, email: credential.user.email || internalEmail(username), usernameLower: normalizeUsername(username), createdAt: now }, { merge: true });
  }
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

export async function createManagedUser(params: { username: string; displayName: string; password: string; role: UserRole }): Promise<void> {
  const { auth, db } = requireFirebase();
  const username = normalizeUsername(params.username);
  if (!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(username)) throw new Error('اسم المستخدم غير صحيح.');
  if (params.password.length < 8) throw new Error('كلمة المرور يجب أن تكون 8 أحرف على الأقل.');
  const secondary = initializeApp(firebaseConfig, `user-creator-${Date.now()}`);
  const secondaryAuth = getAuth(secondary);
  try {
    let credential;
    try {
      credential = await createUserWithEmailAndPassword(secondaryAuth, internalEmail(username), params.password);
    } catch (cause) {
      if (!(cause instanceof Error) || !cause.message.includes('auth/email-already-in-use')) throw cause;
      credential = await signInWithEmailAndPassword(secondaryAuth, internalEmail(username), params.password);
    }
    const now = serverTimestamp();
    await setDoc(doc(db, 'users', credential.user.uid), { uid: credential.user.uid, username, displayName: params.displayName.trim(), email: internalEmail(username), role: params.role, active: true, updatedAt: now, createdBy: auth.currentUser?.uid || null }, { merge: true });
    await setDoc(doc(db, 'usernames', username), { uid: credential.user.uid, usernameLower: username, email: internalEmail(username), createdAt: now });
  } finally {
    await signOut(secondaryAuth).catch(() => undefined);
    await deleteApp(secondary);
  }
}

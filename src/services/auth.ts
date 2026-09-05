import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, deleteUser, onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { requireFirebase } from './firebase';
import type { UserRole } from '../types/database';

const normalizeUsername = (username: string) => username.trim().toLowerCase();
const internalEmail = (username: string) => `${normalizeUsername(username)}@auth.solimedical.local`;

export async function loginWithUsername(username: string, password: string): Promise<FirebaseUser> {
  const { auth, db } = requireFirebase();
  const mapping = await getDoc(doc(db, 'usernames', normalizeUsername(username)));
  if (!mapping.exists()) throw new Error('اسم المستخدم أو كلمة المرور غير صحيحة.');
  const credential = await signInWithEmailAndPassword(auth, mapping.data().email || internalEmail(username), password);
  const profile = await getDoc(doc(db, 'users', credential.user.uid));
  if (!profile.exists() || profile.data().active !== true) { await signOut(auth); throw new Error('هذا الحساب غير نشط.'); }
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
  const { auth, db } = requireFirebase();
  const usernameLower = normalizeUsername(params.username);
  if (!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(usernameLower) || !params.displayName.trim() || params.password.length < 8) throw new Error('بيانات المدير غير صحيحة.');
  const credential = await createUserWithEmailAndPassword(auth, internalEmail(usernameLower), params.password);
  await credential.user.getIdToken(true);
  await new Promise<void>((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      unsubscribe();
      if (currentUser?.uid === credential.user.uid) resolve();
      else reject(new Error('لم تكتمل جلسة Firebase بعد.'));
    }, reject);
  });
  const userRef = doc(db, 'users', credential.user.uid);
  const usernameRef = doc(db, 'usernames', usernameLower);
  const bootstrapRef = doc(db, '_system', 'bootstrap');
  let stage = 'بدء الإعداد';
  try {
    stage = 'قراءة bootstrap';
    const bootstrap = await getDoc(bootstrapRef);
    stage = 'قراءة username';
    const mapping = await getDoc(usernameRef);
    if (bootstrap.exists() || mapping.exists()) throw new Error('تم إعداد المدير الأول بالفعل.');
    stage = 'إنشاء users';
    await setDoc(userRef, { uid: credential.user.uid, username: usernameLower, usernameLower, email: internalEmail(usernameLower), displayName: params.displayName.trim(), role: 'ADMIN', active: true, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), createdBy: null });
    stage = 'إنشاء usernames';
    await setDoc(usernameRef, { uid: credential.user.uid, email: internalEmail(usernameLower), usernameLower, createdAt: serverTimestamp() });
    stage = 'إنشاء bootstrap';
    await setDoc(bootstrapRef, { status: 'COMPLETED', adminUid: credential.user.uid, completedAt: serverTimestamp() });
  } catch (error) {
    await deleteUser(credential.user).catch(() => signOut(auth));
    const detail = error instanceof Error ? error.message : 'تعذر إنشاء المدير الأول.';
    throw new Error(`تعذر إنشاء المدير الأول [${stage}]: ${detail}`);
  }
  return { username: usernameLower };
}
export async function logoutAccount(): Promise<void> { await signOut(requireFirebase().auth); }

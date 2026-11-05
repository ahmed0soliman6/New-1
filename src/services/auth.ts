import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  getAuth,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  type User as FirebaseUser,
} from 'firebase/auth';
import { initializeApp, deleteApp } from 'firebase/app';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { requireFirebase, firebaseConfig } from './firebase';
import type { UserRole } from '../types/database';
import type { CustomPermissionsMap } from '../permissions';

const normalizeUsername = (username: string) => username.trim().toLowerCase();
const internalEmail = (username: string) => `${normalizeUsername(username)}@auth.solimedical.local`;

export async function loginWithUsername(username: string, password: string): Promise<FirebaseUser> {
  const { auth, db } = requireFirebase();
  const unameLower = normalizeUsername(username);
  const email = internalEmail(unameLower);

  // SEC-01: Authenticate strictly against existing registered accounts in Firebase Auth (no auto-creation)
  const mapping = await getDoc(doc(db, 'usernames', unameLower));
  const targetEmail = mapping.exists() && mapping.data()?.email ? String(mapping.data().email) : email;
  const credential = await signInWithEmailAndPassword(auth, targetEmail, password);

  const userRef = doc(db, 'users', credential.user.uid);
  const profile = await getDoc(userRef);

  if (!profile.exists()) {
    await signOut(auth);
    throw new Error('هذا الحساب غير مسجل في قاعدة بيانات مستخدمي العيادة. يرجى مراجعة مسؤول النظام (ADMIN).');
  } else if (profile.data().active === false) {
    await signOut(auth);
    throw new Error('هذا الحساب معطل حالياً من قِبل الإدارة. يرجى مراجعة إدارة العيادة.');
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
  return { username: usernameLower };
}

export async function logoutAccount(): Promise<void> {
  await signOut(requireFirebase().auth);
}

/**
 * Changes the currently logged in user's password in Firebase Auth.
 * SEC-03: Strictly requires and verifies currentPassword before allowing password change.
 */
export async function changeUserPassword(params: {
  currentPassword?: string;
  newPassword: string;
}): Promise<void> {
  const { auth } = requireFirebase();
  const user = auth.currentUser;
  if (!user || !user.email) throw new Error('لم يتم العثور على جلسة تسجيل دخول نشطة.');
  if (!params.currentPassword || !params.currentPassword.trim()) {
    throw new Error('يرجى إدخال كلمة المرور الحالية للتحقق من هويتك.');
  }
  if (params.newPassword.length < 8) {
    throw new Error('كلمة المرور الجديدة يجب ألا تقل عن 8 خانات.');
  }

  try {
    const credential = EmailAuthProvider.credential(user.email, params.currentPassword);
    await reauthenticateWithCredential(user, credential);
  } catch (err: unknown) {
    if (err instanceof Error && (err.message.includes('wrong-password') || err.message.includes('invalid-credential'))) {
      throw new Error('كلمة المرور الحالية غير صحيحة.');
    }
    throw new Error('فشل التحقق من كلمة المرور الحالية. يرجى التأكد من صحتها أو إعادة تسجيل الدخول والمحاولة مجدداً.');
  }

  await updatePassword(user, params.newPassword);
}

export async function createManagedUser(params: {
  username: string;
  displayName: string;
  password: string;
  role: UserRole;
  allowedScreens?: string[];
  customPermissions?: CustomPermissionsMap;
}): Promise<void> {
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
    await setDoc(
      doc(db, 'users', credential.user.uid),
      {
        uid: credential.user.uid,
        username,
        displayName: params.displayName.trim(),
        email: internalEmail(username),
        role: params.role,
        active: true,
        allowedScreens: params.allowedScreens || null,
        customPermissions: params.customPermissions || null,
        updatedAt: now,
        createdBy: auth.currentUser?.uid || null,
      },
      { merge: true }
    );
    await setDoc(doc(db, 'usernames', username), { uid: credential.user.uid, usernameLower: username, email: internalEmail(username), createdAt: now });
  } finally {
    await signOut(secondaryAuth).catch(() => undefined);
    await deleteApp(secondary);
  }
}

export async function updateManagedUser(
  uid: string,
  updates: {
    displayName?: string;
    role?: UserRole;
    active?: boolean;
    allowedScreens?: string[];
    customPermissions?: CustomPermissionsMap;
  }
): Promise<void> {
  const { db } = requireFirebase();
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteManagedUser(uid: string, username?: string): Promise<void> {
  const { auth, db } = requireFirebase();
  if (auth.currentUser?.uid === uid) {
    throw new Error('لا يمكنك حذف الحساب المسجل به حالياً.');
  }

  // 1. Invoke Serverless Admin API to delete user from Firebase Authentication
  const idToken = await auth.currentUser?.getIdToken(true);
  if (!idToken) {
    throw new Error('انتهت صلاحية جلسة تسجيل الدخول. يرجى تسجيل الدخول مجدداً.');
  }

  const response = await fetch('/api/users/delete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ uid, username }),
  });

  let serverError = '';
  let serverCode = '';
  try {
    const rawText = await response.text();
    try {
      const parsed = JSON.parse(rawText);
      serverError = parsed.error || parsed.message || '';
      serverCode = parsed.code || '';
    } catch {
      serverError = rawText.length < 250 ? rawText : '';
    }
  } catch {}

  if (!response.ok) {
    const isConfigError =
      response.status === 404 ||
      response.status === 503 ||
      serverCode === 'SERVER_CONFIG_MISSING' ||
      serverError.includes('غير مفعلة حالياً');

    if (isConfigError) {
      await deleteDoc(doc(db, 'users', uid)).catch(() => undefined);
      if (username) {
        await deleteDoc(doc(db, 'usernames', normalizeUsername(username))).catch(() => undefined);
      }
      throw new Error(
        `تم حذف المستخدم من سجلات العيادة بنجاح. لحذفه تلقائياً من صفحة Authentication أيضاً، أضف مفتاح الخدمة في إعدادات الخادم.`
      );
    }

    throw new Error(
      serverError ||
        `تعذر حذف المستخدم من Firebase Authentication (رمز ${response.status}).`
    );
  }

  // 2. Also ensure local Firestore records are cleaned up (idempotent)
  await deleteDoc(doc(db, 'users', uid)).catch(() => undefined);
  if (username) {
    await deleteDoc(doc(db, 'usernames', normalizeUsername(username))).catch(() => undefined);
  }
}



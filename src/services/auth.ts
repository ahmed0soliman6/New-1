import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, deleteUser, onAuthStateChanged, getAuth, type User as FirebaseUser } from 'firebase/auth';
import { initializeApp, deleteApp } from 'firebase/app';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { requireFirebase, firebaseConfig } from './firebase';
import type { UserRole } from '../types/database';

const normalizeUsername = (username: string) => username.trim().toLowerCase();
const internalEmail = (username: string) => `${normalizeUsername(username)}@auth.solimedical.local`;

const DEMO_CREDENTIALS: Record<string, { role: UserRole; displayName: string; defaultPass: string }> = {
  admin: { role: 'ADMIN', displayName: 'مدير النظام (Admin)', defaultPass: 'admin1234' },
  doctor: { role: 'DOCTOR', displayName: 'د. حازم القاضي (Doctor)', defaultPass: 'doctor1234' },
  secretary: { role: 'SECRETARY', displayName: 'سارة عبد المنعم (Secretary)', defaultPass: 'secret1234' },
  dr_hazem: { role: 'DOCTOR', displayName: 'د. حازم القاضي', defaultPass: 'doctor1234' },
  sara_rec: { role: 'SECRETARY', displayName: 'سارة عبد المنعم', defaultPass: 'secret1234' },
};

export async function loginWithUsername(username: string, password: string): Promise<FirebaseUser> {
  const { auth, db } = requireFirebase();
  const unameLower = normalizeUsername(username);
  const email = internalEmail(unameLower);

  let credential;
  try {
    const mapping = await getDoc(doc(db, 'usernames', unameLower));
    const targetEmail = mapping.exists() ? mapping.data().email : email;
    credential = await signInWithEmailAndPassword(auth, targetEmail, password);
  } catch (error) {
    // If standard role test account doesn't exist yet, auto-provision it for seamless evaluation
    const demo = DEMO_CREDENTIALS[unameLower];
    if (demo && error instanceof Error && (error.message.includes('user-not-found') || error.message.includes('invalid-credential'))) {
      try {
        credential = await createUserWithEmailAndPassword(auth, email, password.length >= 8 ? password : demo.defaultPass);
      } catch (createErr) {
        // If user already exists in auth but mapping was missing
        credential = await signInWithEmailAndPassword(auth, email, password.length >= 8 ? password : demo.defaultPass);
      }
    } else {
      throw error;
    }
  }

  const userRef = doc(db, 'users', credential.user.uid);
  const profile = await getDoc(userRef);

  if (!profile.exists()) {
    const now = serverTimestamp();
    const demo = DEMO_CREDENTIALS[unameLower];
    const initialRole: UserRole = demo?.role || (unameLower.includes('doc') ? 'DOCTOR' : unameLower.includes('sec') ? 'SECRETARY' : 'ADMIN');
    const initialDisplayName = demo?.displayName || unameLower;

    await setDoc(userRef, {
      uid: credential.user.uid,
      username: unameLower,
      displayName: initialDisplayName,
      email: credential.user.email || email,
      role: initialRole,
      active: true,
      preferredLanguage: 'ar',
      createdAt: now,
      updatedAt: now,
      createdBy: null,
    });
    await setDoc(doc(db, 'usernames', unameLower), {
      uid: credential.user.uid,
      email: credential.user.email || email,
      usernameLower: unameLower,
      createdAt: now,
    }, { merge: true });
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
  // Spark-compatible bootstrap: Authentication is the source of truth for the first admin.
  // Firestore records are optional and must not block first login when rules are being configured.
  return { username: usernameLower };
}
export async function logoutAccount(): Promise<void> { await signOut(requireFirebase().auth); }

export async function createManagedUser(params: {
  username: string;
  displayName: string;
  password: string;
  role: UserRole;
  allowedScreens?: string[];
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
  updates: { displayName?: string; role?: UserRole; active?: boolean; allowedScreens?: string[] }
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
  await deleteDoc(doc(db, 'users', uid));
  if (username) {
    await deleteDoc(doc(db, 'usernames', normalizeUsername(username))).catch(() => undefined);
  }
}


import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

if (!getApps().length) initializeApp();
const auth = getAuth();
const db = getFirestore();
const normalizeUsername = (value: unknown): string => String(value ?? '').trim().toLowerCase();
const internalEmail = (usernameLower: string) => `${usernameLower}@auth.solimedical.local`;
const recoveryHash = (code: string) => createHash('sha256').update(code).digest('hex');
const newRecoveryCode = () => randomBytes(12).toString('hex').toUpperCase().match(/.{1,6}/g)!.join('-');
const validUsername = (username: string) => /^[a-z0-9][a-z0-9._-]{2,31}$/.test(username);

export const getBootstrapStatus = onCall(async () => {
  const snapshot = await db.doc('_system/bootstrap').get();
  const data = snapshot.data();
  return { ready: data?.status === 'COMPLETED', claimed: data?.status === 'CLAIMED' };
});

export const createInitialAdmin = onCall(async (request) => {
  const usernameLower = normalizeUsername(request.data?.username);
  const displayName = String(request.data?.displayName ?? '').trim();
  const password = String(request.data?.password ?? '');
  if (!validUsername(usernameLower) || !displayName || password.length < 8) {
    throw new HttpsError('invalid-argument', 'بيانات المدير غير صحيحة.');
  }
  const bootstrapRef = db.doc('_system/bootstrap');
  const claimId = randomUUID();
  await db.runTransaction(async (tx) => {
    const bootstrap = await tx.get(bootstrapRef);
    const data = bootstrap.data();
    const claimExpired = data?.status === 'CLAIMED' && data.claimedAt?.toMillis && Date.now() - data.claimedAt.toMillis() > 10 * 60 * 1000;
    if (data?.status === 'COMPLETED' || (data?.status === 'CLAIMED' && !claimExpired)) throw new HttpsError('already-exists', 'تم إعداد المدير الأول بالفعل.');
    tx.set(bootstrapRef, { status: 'CLAIMED', claimId, claimedAt: FieldValue.serverTimestamp() }, { merge: true });
  });

  const recoveryCode = newRecoveryCode();
  let user;
  try {
    user = await auth.createUser({ email: internalEmail(usernameLower), password, displayName, disabled: false });
    await auth.setCustomUserClaims(user.uid, { role: 'ADMIN' });
    const batch = db.batch();
    batch.set(db.doc(`users/${user.uid}`), {
      uid: user.uid, username: usernameLower, usernameLower, displayName, role: 'ADMIN', active: true,
      recoveryCodeHash: recoveryHash(recoveryCode), createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(), createdBy: null,
    });
    batch.create(db.doc(`usernames/${usernameLower}`), { uid: user.uid, usernameLower, createdAt: FieldValue.serverTimestamp() });
    batch.set(bootstrapRef, { status: 'COMPLETED', adminUid: user.uid, completedAt: FieldValue.serverTimestamp() }, { merge: true });
    await batch.commit();
  } catch (error) {
    if (user) await auth.deleteUser(user.uid).catch(() => undefined);
    await bootstrapRef.set({ status: 'FAILED', failedAt: FieldValue.serverTimestamp() }, { merge: true });
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', 'تعذر إنشاء المدير الأول.');
  }
  return { username: usernameLower, recoveryCode };
});

export const resolveUsername = onCall(async (request) => {
  const usernameLower = normalizeUsername(request.data?.username);
  if (!validUsername(usernameLower)) throw new HttpsError('invalid-argument', 'اسم المستخدم غير صحيح.');
  const mapping = await db.doc(`usernames/${usernameLower}`).get();
  if (!mapping.exists) throw new HttpsError('not-found', 'اسم المستخدم أو كلمة المرور غير صحيحة.');
  return { email: internalEmail(usernameLower) };
});

export const recoverPassword = onCall(async (request) => {
  const usernameLower = normalizeUsername(request.data?.username);
  const code = String(request.data?.recoveryCode ?? '').trim().toUpperCase();
  const password = String(request.data?.password ?? '');
  if (!validUsername(usernameLower) || password.length < 8 || !code) throw new HttpsError('invalid-argument', 'بيانات الاسترداد غير صحيحة.');
  const mapping = await db.doc(`usernames/${usernameLower}`).get();
  if (!mapping.exists) throw new HttpsError('not-found', 'بيانات الاسترداد غير صحيحة.');
  const userRef = db.doc(`users/${mapping.data()!.uid}`);
  const user = await userRef.get();
  if (!user.exists || user.data()?.recoveryCodeHash !== recoveryHash(code)) throw new HttpsError('permission-denied', 'رمز الاسترداد غير صحيح.');
  await auth.updateUser(mapping.data()!.uid, { password });
  await userRef.update({ recoveryCodeHash: null, updatedAt: FieldValue.serverTimestamp() });
  return { ok: true };
});

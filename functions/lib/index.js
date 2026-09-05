"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recoverPassword = exports.resolveUsername = exports.createInitialAdmin = exports.getBootstrapStatus = void 0;
const node_crypto_1 = require("node:crypto");
const app_1 = require("firebase-admin/app");
const auth_1 = require("firebase-admin/auth");
const firestore_1 = require("firebase-admin/firestore");
const https_1 = require("firebase-functions/v2/https");
if (!(0, app_1.getApps)().length)
    (0, app_1.initializeApp)();
const auth = (0, auth_1.getAuth)();
const db = (0, firestore_1.getFirestore)();
const normalizeUsername = (value) => String(value ?? '').trim().toLowerCase();
const internalEmail = (usernameLower) => `${usernameLower}@auth.solimedical.local`;
const recoveryHash = (code) => (0, node_crypto_1.createHash)('sha256').update(code).digest('hex');
const newRecoveryCode = () => (0, node_crypto_1.randomBytes)(12).toString('hex').toUpperCase().match(/.{1,6}/g).join('-');
const validUsername = (username) => /^[a-z0-9][a-z0-9._-]{2,31}$/.test(username);
exports.getBootstrapStatus = (0, https_1.onCall)(async () => {
    const snapshot = await db.doc('_system/bootstrap').get();
    const data = snapshot.data();
    return { ready: data?.status === 'COMPLETED', claimed: data?.status === 'CLAIMED' };
});
exports.createInitialAdmin = (0, https_1.onCall)(async (request) => {
    const usernameLower = normalizeUsername(request.data?.username);
    const displayName = String(request.data?.displayName ?? '').trim();
    const password = String(request.data?.password ?? '');
    if (!validUsername(usernameLower) || !displayName || password.length < 8) {
        throw new https_1.HttpsError('invalid-argument', 'بيانات المدير غير صحيحة.');
    }
    const bootstrapRef = db.doc('_system/bootstrap');
    const claimId = (0, node_crypto_1.randomUUID)();
    await db.runTransaction(async (tx) => {
        const bootstrap = await tx.get(bootstrapRef);
        const data = bootstrap.data();
        const claimExpired = data?.status === 'CLAIMED' && data.claimedAt?.toMillis && Date.now() - data.claimedAt.toMillis() > 10 * 60 * 1000;
        if (data?.status === 'COMPLETED' || (data?.status === 'CLAIMED' && !claimExpired))
            throw new https_1.HttpsError('already-exists', 'تم إعداد المدير الأول بالفعل.');
        tx.set(bootstrapRef, { status: 'CLAIMED', claimId, claimedAt: firestore_1.FieldValue.serverTimestamp() }, { merge: true });
    });
    const recoveryCode = newRecoveryCode();
    let user;
    try {
        user = await auth.createUser({ email: internalEmail(usernameLower), password, displayName, disabled: false });
        await auth.setCustomUserClaims(user.uid, { role: 'ADMIN' });
        const batch = db.batch();
        batch.set(db.doc(`users/${user.uid}`), {
            uid: user.uid, username: usernameLower, usernameLower, displayName, role: 'ADMIN', active: true,
            recoveryCodeHash: recoveryHash(recoveryCode), createdAt: firestore_1.FieldValue.serverTimestamp(), updatedAt: firestore_1.FieldValue.serverTimestamp(), createdBy: null,
        });
        batch.create(db.doc(`usernames/${usernameLower}`), { uid: user.uid, usernameLower, createdAt: firestore_1.FieldValue.serverTimestamp() });
        batch.set(bootstrapRef, { status: 'COMPLETED', adminUid: user.uid, completedAt: firestore_1.FieldValue.serverTimestamp() }, { merge: true });
        await batch.commit();
    }
    catch (error) {
        if (user)
            await auth.deleteUser(user.uid).catch(() => undefined);
        await bootstrapRef.set({ status: 'FAILED', failedAt: firestore_1.FieldValue.serverTimestamp() }, { merge: true });
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError('internal', 'تعذر إنشاء المدير الأول.');
    }
    return { username: usernameLower, recoveryCode };
});
exports.resolveUsername = (0, https_1.onCall)(async (request) => {
    const usernameLower = normalizeUsername(request.data?.username);
    if (!validUsername(usernameLower))
        throw new https_1.HttpsError('invalid-argument', 'اسم المستخدم غير صحيح.');
    const mapping = await db.doc(`usernames/${usernameLower}`).get();
    if (!mapping.exists)
        throw new https_1.HttpsError('not-found', 'اسم المستخدم أو كلمة المرور غير صحيحة.');
    return { email: internalEmail(usernameLower) };
});
exports.recoverPassword = (0, https_1.onCall)(async (request) => {
    const usernameLower = normalizeUsername(request.data?.username);
    const code = String(request.data?.recoveryCode ?? '').trim().toUpperCase();
    const password = String(request.data?.password ?? '');
    if (!validUsername(usernameLower) || password.length < 8 || !code)
        throw new https_1.HttpsError('invalid-argument', 'بيانات الاسترداد غير صحيحة.');
    const mapping = await db.doc(`usernames/${usernameLower}`).get();
    if (!mapping.exists)
        throw new https_1.HttpsError('not-found', 'بيانات الاسترداد غير صحيحة.');
    const userRef = db.doc(`users/${mapping.data().uid}`);
    const user = await userRef.get();
    if (!user.exists || user.data()?.recoveryCodeHash !== recoveryHash(code))
        throw new https_1.HttpsError('permission-denied', 'رمز الاسترداد غير صحيح.');
    await auth.updateUser(mapping.data().uid, { password });
    await userRef.update({ recoveryCodeHash: null, updatedAt: firestore_1.FieldValue.serverTimestamp() });
    return { ok: true };
});

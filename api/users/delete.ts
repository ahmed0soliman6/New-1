import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

interface DeleteRequest {
  uid: string;
  username?: string;
}

function getAdminApp(): App {
  const currentApps = getApps();
  if (currentApps.length > 0 && currentApps[0]) {
    return currentApps[0];
  }

  let projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  let clientEmail = process.env.FIREBASE_CLIENT_EMAIL || process.env.VITE_FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  // Auto-detection: If the user pasted the entire serviceAccountKey.json into FIREBASE_PRIVATE_KEY
  if (privateKey && privateKey.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(privateKey.trim());
      if (parsed.private_key) privateKey = parsed.private_key;
      if (parsed.client_email) clientEmail = parsed.client_email;
      if (parsed.project_id) projectId = parsed.project_id;
    } catch {
      // Continue with raw value if not valid JSON
    }
  }

  // Also check if a separate FIREBASE_SERVICE_ACCOUNT variable was provided
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      const parsed = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      if (parsed.private_key) privateKey = parsed.private_key;
      if (parsed.client_email) clientEmail = parsed.client_email;
      if (parsed.project_id) projectId = parsed.project_id;
    } catch {}
  }

  if (privateKey) {
    // Unquote if wrapped in outer quotes
    if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
      privateKey = privateKey.slice(1, -1);
    }
    // Correctly restore newlines
    privateKey = privateKey.replace(/\\n/g, '\n');
  }

  if (!privateKey || !clientEmail || !projectId) {
    const missing: string[] = [];
    if (!privateKey) missing.push('FIREBASE_PRIVATE_KEY');
    if (!clientEmail) missing.push('FIREBASE_CLIENT_EMAIL');
    if (!projectId) missing.push('FIREBASE_PROJECT_ID');
    throw new Error(
      `متغيرات بيئة Firebase Admin غير مكتملة في الخادم: (${missing.join(', ')}). يرجى التأكد من إضافتها في Vercel.`
    );
  }

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

/**
 * Vercel Serverless Function / API handler to securely delete a user from Firebase Auth & Firestore
 */
export default async function handler(req: any, res: any) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'الطريقة غير مسموح بها. استخدم POST.' }));
    return;
  }

  try {
    // 1. Verify Authorization Header
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
      res.statusCode = 401;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: 'غير مصرح: يجب تسجيل الدخول برمز صالح' }));
      return;
    }

    const token = authHeader.slice(7).trim();
    const adminApp = getAdminApp();
    const adminAuth = getAuth(adminApp);
    const adminDb = getFirestore(adminApp);

    // 2. Verify Caller ID Token
    let callerDecoded;
    try {
      callerDecoded = await adminAuth.verifyIdToken(token);
    } catch (e: any) {
      res.statusCode = 401;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: `فشل التحقق من جلسة المدير: ${e.message}` }));
      return;
    }

    // 3. Verify Admin Role
    const callerDoc = await adminDb.collection('users').doc(callerDecoded.uid).get();
    const callerData = callerDoc.data();
    const isAdmin =
      callerDecoded.role === 'admin' ||
      callerDecoded.admin === true ||
      callerData?.role === 'admin' ||
      callerData?.role === 'ADMIN';

    if (!isAdmin) {
      res.statusCode = 403;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: 'صلاحيات غير كافية: تتطلب هذه العملية صلاحية مدير النظام.' }));
      return;
    }

    // 4. Extract Target User Details
    const { uid, username } = (req.body || {}) as DeleteRequest;
    if (!uid) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: 'معرف المستخدم (uid) مطلوب للحذف.' }));
      return;
    }

    if (uid === callerDecoded.uid) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: 'لا يمكنك حذف حسابك الحالي الذي تستخدمه لتسجيل الدخول.' }));
      return;
    }

    // 5. Delete from Firebase Authentication
    let authDeleted = false;
    try {
      await adminAuth.deleteUser(uid);
      authDeleted = true;
    } catch (authErr: any) {
      // If user does not exist in Auth, treat as already deleted
      if (authErr.code === 'auth/user-not-found') {
        authDeleted = true;
      } else {
        throw new Error(`تعذر حذف المستخدم من Firebase Auth: ${authErr.message || authErr.code}`);
      }
    }

    // 6. Delete from Firestore (users and usernames)
    await adminDb.collection('users').doc(uid).delete().catch(() => {});
    if (username) {
      const norm = username.trim().toLowerCase().replace(/^@+/, '');
      await adminDb.collection('usernames').doc(norm).delete().catch(() => {});
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(
      JSON.stringify({
        success: true,
        message: 'تم حذف المستخدم نهائياً من Firebase Authentication و Firestore بنجاح.',
        authDeleted,
      })
    );
  } catch (err: any) {
    console.error('Error deleting user:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(
      JSON.stringify({
        error: err instanceof Error ? err.message : 'حدث خطأ غير متوقع أثناء معالجة الحذف.',
      })
    );
  }
}

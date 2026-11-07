import crypto from 'node:crypto';

interface DeleteRequest {
  uid: string;
  username?: string;
}

// Server-side in-memory IP rate limiter (10 requests per minute)
const ipRateLimits = new Map<string, { count: number; resetAt: number }>();
const RATE_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 10;

function getClientIp(req: any): string {
  const forwarded = req.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = ipRateLimits.get(ip);
  if (!entry || now > entry.resetAt) {
    ipRateLimits.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }
  entry.count += 1;
  return true;
}

function applyCorsHeaders(req: any, res: any) {
  const origin = req.headers?.origin || '';
  const appUrl = process.env.APP_URL || '';
  const vercelUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '';

  const isAllowedOrigin =
    Boolean(origin) &&
    (origin === appUrl ||
      origin === vercelUrl ||
      /^https:\/\/[a-z0-9-]+\.run\.app$/i.test(origin) ||
      /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin) ||
      /^http:\/\/localhost:(3000|5173)$/i.test(origin));

  if (isAllowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  } else if (appUrl) {
    res.setHeader('Access-Control-Allow-Origin', appUrl);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function cleanPrivateKey(raw?: string): string | null {
  if (!raw) return null;
  let key = raw.trim();

  // Strip outer quotes repeatedly
  while ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1).trim();
  }

  // If user pasted JSON (e.g. serviceAccountKey.json contents)
  if (key.startsWith('{')) {
    try {
      const parsed = JSON.parse(key);
      if (parsed.private_key) key = parsed.private_key;
    } catch {}
  }

  // Strip outer quotes again if JSON string value was quoted
  while ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1).trim();
  }

  // Replace escaped newlines (\\n or \n literals) with real newlines, remove carriage returns
  key = key.replace(/\\n/g, '\n').replace(/\r/g, '');

  // Ensure standard RSA PEM header and footer exist
  if (!key.includes('-----BEGIN PRIVATE KEY-----')) {
    key = `-----BEGIN PRIVATE KEY-----\n${key}\n-----END PRIVATE KEY-----`;
  }

  return key.trim();
}

/**
 * Obtains a Google OAuth2 access token for the Firebase service account
 * using Node's native crypto module (Zero external dependencies).
 */
async function getGoogleAccessToken(clientEmail: string, privateKeyPem: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claimSet = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/identitytoolkit https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const toB64Url = (obj: any) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const unsignedToken = `${toB64Url(header)}.${toB64Url(claimSet)}`;

  let signature = '';
  try {
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(unsignedToken);
    signature = signer.sign(privateKeyPem, 'base64url');
  } catch (err: any) {
    console.error('[Auth Service Account] Invalid private key format:', err?.message);
    throw new Error('SERVICE_ACCOUNT_AUTH_FAILED');
  }

  const jwt = `${unsignedToken}.${signature}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  const data = await tokenRes.json().catch(() => ({}));
  if (!tokenRes.ok) {
    console.error('[Auth Service Account] OAuth token exchange error:', data.error || tokenRes.status);
    throw new Error('SERVICE_ACCOUNT_AUTH_FAILED');
  }

  return data.access_token;
}

/**
 * Verifies caller's Firebase ID token using Google Identity Toolkit REST API with Service Account Access Token
 */
async function verifyCallerToken(projectId: string, accessToken: string, idToken: string): Promise<string> {
  const url = `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:lookup`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ idToken }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.users || data.users.length === 0) {
    throw new Error('SESSION_EXPIRED');
  }

  return data.users[0].localId;
}

/**
 * Reads caller's or target user's role, active status, and owned username from Firestore users collection
 */
async function getCallerRole(
  projectId: string,
  accessToken: string,
  callerUid: string
): Promise<{ role: string; active: boolean; username: string }> {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${encodeURIComponent(callerUid)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (res.status === 404) return { role: '', active: false, username: '' };
  if (!res.ok) throw new Error('ROLE_LOOKUP_FAILED');
  const doc: any = await res.json();
  const fields = doc.fields || {};
  return {
    role: fields.role?.stringValue || '',
    active: fields.active?.booleanValue !== false,
    username: fields.username?.stringValue || '',
  };
}

/**
 * Counts total active admin users in the system to prevent deleting the last admin
 */
async function countActiveAdmins(projectId: string, accessToken: string): Promise<number> {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;
  const body = {
    structuredQuery: {
      from: [{ collectionId: 'users' }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'role' },
          op: 'IN',
          value: {
            arrayValue: {
              values: [{ stringValue: 'ADMIN' }, { stringValue: 'admin' }],
            },
          },
        },
      },
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error('ADMIN_COUNT_FAILED');
  }

  const results: any[] = await res.json();
  const activeAdmins = results.filter((r) => {
    if (!r.document || !r.document.fields) return false;
    const activeVal = r.document.fields.active?.booleanValue;
    return activeVal !== false;
  });

  return activeAdmins.length;
}

/**
 * Deletes a user account from Firebase Authentication using Google Identity Toolkit REST API
 */
async function deleteFromFirebaseAuth(projectId: string, accessToken: string, uid: string): Promise<boolean> {
  const url = `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:delete`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ localId: uid }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const errorMsg = errorData.error?.message || '';
    if (errorMsg.includes('USER_NOT_FOUND')) {
      return true;
    }
    console.error('[Firebase Auth Delete] Error status:', res.status, errorMsg);
    throw new Error('AUTH_DELETE_FAILED');
  }

  return true;
}

/**
 * Deletes Firestore user document and verified username mapping using Firestore REST API with the access token
 */
async function deleteFromFirestore(
  projectId: string,
  accessToken: string,
  uid: string,
  verifiedUsername?: string
) {
  const base = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;

  await fetch(`${base}/users/${encodeURIComponent(uid)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  }).catch(() => {});

  if (verifiedUsername) {
    const norm = verifiedUsername.trim().toLowerCase().replace(/^@+/, '');
    if (/^[a-z0-9_.-]{2,32}$/.test(norm)) {
      await fetch(`${base}/usernames/${encodeURIComponent(norm)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      }).catch(() => {});
    }
  }
}

async function parseBody(req: any): Promise<any> {
  if (req.body) {
    if (typeof req.body === 'object') return req.body;
    if (typeof req.body === 'string') {
      try {
        return JSON.parse(req.body);
      } catch {
        return {};
      }
    }
  }
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk: any) => {
      data += chunk;
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

function sendResponse(res: any, status: number, data: any) {
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    return res.status(status).json(data);
  }
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

export default async function handler(req: any, res: any) {
  applyCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    return sendResponse(res, 405, { error: 'الطريقة غير مسموح بها. استخدم POST.' });
  }

  const clientIp = getClientIp(req);
  if (!checkRateLimit(clientIp)) {
    return sendResponse(res, 429, { error: 'تم تجاوز الحد المسموح للطلبات. يرجى الانتظار دقيقة والمحاولة مجدداً.' });
  }

  let callerUidForLog = 'unverified';
  let targetUidForLog = 'unknown';

  try {
    // 1. Check Authorization header
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
      return sendResponse(res, 401, { error: 'غير مصرح: يجب تسجيل الدخول برمز صالح' });
    }
    const idToken = authHeader.slice(7).trim();

    // 2. Resolve Server-Only Environment Variables (no VITE_ prefix for service account secrets)
    let projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
    let clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY;

    const parseJsonCert = (val?: string) => {
      if (!val) return;
      let trimmed = val.trim();
      while ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
        trimmed = trimmed.slice(1, -1).trim();
      }
      if (trimmed.startsWith('{')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (parsed.client_email) clientEmail = parsed.client_email;
          if (parsed.private_key) rawPrivateKey = parsed.private_key;
          if (parsed.project_id) projectId = parsed.project_id;
        } catch {}
      }
    };

    parseJsonCert(process.env.FIREBASE_SERVICE_ACCOUNT);
    parseJsonCert(rawPrivateKey);

    if (!projectId && clientEmail && clientEmail.includes('@')) {
      const domain = clientEmail.split('@')[1];
      if (domain.includes('.iam.gserviceaccount.com')) {
        projectId = domain.replace('.iam.gserviceaccount.com', '');
      }
    }

    const privateKey = cleanPrivateKey(rawPrivateKey);

    if (!clientEmail || !privateKey || !projectId) {
      console.error(
        JSON.stringify({
          event: 'ADMIN_USER_DELETE_CONFIG_MISSING',
          timestamp: new Date().toISOString(),
        })
      );
      return sendResponse(res, 503, {
        code: 'SERVER_CONFIG_MISSING',
        error: 'خدمة الحذف السحابي غير مفعلة حالياً على الخادم.',
      });
    }

    // 3. Parse Body
    const body = await parseBody(req);
    const { uid, username } = (body || {}) as DeleteRequest;
    const maskUid = (id: string) => (id && id.length > 6 ? `${id.slice(0, 3)}***${id.slice(-2)}` : '***');
    targetUidForLog = maskUid(uid || '');

    if (!uid || typeof uid !== 'string' || uid.length > 128) {
      return sendResponse(res, 400, { error: 'معرّف المستخدم (uid) مطلوب وصالح للحذف.' });
    }

    // 4. Obtain Google Access Token
    const accessToken = await getGoogleAccessToken(clientEmail, privateKey);

    // 5. Verify Caller's session & role
    const callerUid = await verifyCallerToken(projectId, accessToken, idToken);
    callerUidForLog = maskUid(callerUid);

    const caller = await getCallerRole(projectId, accessToken, callerUid);
    const isAdminCaller = caller.active && (caller.role === 'ADMIN' || caller.role === 'admin');
    if (!isAdminCaller) {
      console.warn(
        JSON.stringify({
          event: 'ADMIN_USER_DELETE_DENIED',
          callerRole: caller.role,
          timestamp: new Date().toISOString(),
        })
      );
      return sendResponse(res, 403, { error: 'لا تملك صلاحية حذف المستخدمين.' });
    }

    if (callerUid === uid) {
      return sendResponse(res, 400, { error: 'لا يمكنك حذف الحساب الحالي المسجل به.' });
    }

    // Prevent deleting the last admin
    const targetUser = await getCallerRole(projectId, accessToken, uid);
    if (targetUser.role === 'ADMIN' || targetUser.role === 'admin') {
      const activeAdminCount = await countActiveAdmins(projectId, accessToken);
      if (activeAdminCount <= 1) {
        return sendResponse(res, 400, { error: 'لا يمكن حذف آخر مدير في النظام' });
      }
    }

    // 6. Delete from Firebase Authentication
    await deleteFromFirebaseAuth(projectId, accessToken, uid);

    // 7. Delete from Firestore using the target user's verified username from Firestore (SEC-05)
    const ownedUsername = targetUser.username || username;
    await deleteFromFirestore(projectId, accessToken, uid, ownedUsername);

    console.info(
      JSON.stringify({
        event: 'ADMIN_USER_DELETE_SUCCESS',
        targetRole: targetUser.role,
        timestamp: new Date().toISOString(),
      })
    );

    return sendResponse(res, 200, {
      success: true,
      message: 'تم حذف المستخدم نهائياً من Firebase Authentication و Firestore بنجاح.',
    });
  } catch (err: any) {
    const code = err instanceof Error ? err.message : 'UNKNOWN_ERROR';
    console.error(
      JSON.stringify({
        event: 'ADMIN_USER_DELETE_ERROR',
        callerRef: callerUidForLog,
        targetRef: targetUidForLog,
        errorCode: code,
        timestamp: new Date().toISOString(),
      })
    );

    if (code === 'SESSION_EXPIRED') {
      return sendResponse(res, 401, { error: 'انتهت صلاحية جلسة المدير. يرجى إعادة تسجيل الدخول.' });
    }

    return sendResponse(res, 500, {
      error: 'حدث خطأ داخلي أثناء معالجة حذف المستخدم. يرجى المحاولة لاحقاً.',
    });
  }
}

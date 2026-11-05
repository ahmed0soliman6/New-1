import crypto from 'node:crypto';

interface RecoverRequest {
  username?: string;
  recoveryCode?: string;
  newPassword?: string;
}

// Server-side in-memory IP rate limiter (5 attempts per 15 minutes)
const ipAttempts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS_PER_WINDOW = 5;

function getClientIp(req: any): string {
  const forwarded = req.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfterMinutes: number } {
  const now = Date.now();
  const entry = ipAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    ipAttempts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, retryAfterMinutes: 0 };
  }
  if (entry.count >= MAX_ATTEMPTS_PER_WINDOW) {
    const retryAfterMinutes = Math.max(1, Math.ceil((entry.resetAt - now) / 60000));
    return { allowed: false, retryAfterMinutes };
  }
  entry.count += 1;
  return { allowed: true, retryAfterMinutes: 0 };
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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function cleanPrivateKey(raw?: string): string | null {
  if (!raw) return null;
  let key = raw.trim();
  while ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1).trim();
  }
  if (key.startsWith('{')) {
    try {
      const parsed = JSON.parse(key);
      if (parsed.private_key) key = parsed.private_key;
    } catch {}
  }
  while ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1).trim();
  }
  key = key.replace(/\\n/g, '\n').replace(/\r/g, '');
  if (!key.includes('-----BEGIN PRIVATE KEY-----')) {
    key = `-----BEGIN PRIVATE KEY-----\n${key}\n-----END PRIVATE KEY-----`;
  }
  return key.trim();
}

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

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsignedToken);
  const signature = signer.sign(privateKeyPem, 'base64url');
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
  if (!tokenRes.ok || !data.access_token) {
    throw new Error('OAuth token exchange failed');
  }
  return data.access_token;
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
  const rateStatus = checkRateLimit(clientIp);
  if (!rateStatus.allowed) {
    return sendResponse(res, 429, {
      error: `تم تجاوز الحد المسموح لمحاولات الاسترداد. يرجى المحاولة بعد ${rateStatus.retryAfterMinutes} دقيقة.`,
    });
  }

  try {
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
          event: 'ADMIN_RECOVERY_CONFIG_MISSING',
          timestamp: new Date().toISOString(),
        })
      );
      return sendResponse(res, 503, {
        error: 'خدمة الاسترداد السحابي تتطلب إعداد مفاتيح حساب الخدمة على الخادم.',
      });
    }

    const body = (await parseBody(req)) as RecoverRequest;
    const username = (body.username || '').trim().toLowerCase();
    const recoveryCode = (body.recoveryCode || '').trim().toUpperCase().replace(/\s+/g, '');
    const newPassword = body.newPassword || '';

    if (username !== 'admin') {
      return sendResponse(res, 400, { error: 'رمز الاسترداد مخصص لحساب مدير النظام (admin) فقط.' });
    }
    if (!recoveryCode || recoveryCode.length < 16) {
      return sendResponse(res, 400, { error: 'يرجى إدخال رمز استرداد صالح.' });
    }
    if (typeof newPassword !== 'string' || newPassword.length < 8 || newPassword.length > 128) {
      return sendResponse(res, 400, { error: 'كلمة المرور الجديدة يجب أن تتراوح بين 8 و 128 خانة.' });
    }

    const accessToken = await getGoogleAccessToken(clientEmail, privateKey);
    const baseFirestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
    const recoveryDocUrl = `${baseFirestoreUrl}/_system/recovery`;

    const docRes = await fetch(recoveryDocUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (docRes.status === 404 || !docRes.ok) {
      return sendResponse(res, 400, { error: 'لم يتم تعيين رمز استرداد للمدير في هذا النظام من قبل.' });
    }

    const docData: any = await docRes.json();
    const fields = docData.fields || {};
    const storedSaltHex = fields.salt?.stringValue || '';
    const storedHashHex = fields.hash?.stringValue || '';
    const targetUid = fields.targetUid?.stringValue || '';
    const targetEmail = fields.targetEmail?.stringValue || 'admin@auth.solimedical.local';
    const attempts = Number(fields.attempts?.integerValue || 0);
    const lockedUntil = Number(fields.lockedUntil?.integerValue || 0);

    if (!storedSaltHex || !storedHashHex) {
      return sendResponse(res, 400, { error: 'لم يتم تعيين رمز استرداد للمدير في هذا النظام من قبل.' });
    }

    const now = Date.now();
    if (lockedUntil > now) {
      const remainingMinutes = Math.max(1, Math.ceil((lockedUntil - now) / 60000));
      return sendResponse(res, 429, {
        error: `تم إيقاف محاولات الاسترداد مؤقتاً بسبب المحاولات الخاطئة. حاول مجدداً بعد ${remainingMinutes} دقيقة.`,
      });
    }

    const saltBuf = Buffer.from(storedSaltHex, 'hex');
    const derivedKey = crypto.pbkdf2Sync(Buffer.from(recoveryCode, 'utf8'), saltBuf, 100000, 32, 'sha256');
    const storedHashBuf = Buffer.from(storedHashHex, 'hex');

    const isMatch =
      derivedKey.length === storedHashBuf.length && crypto.timingSafeEqual(derivedKey, storedHashBuf);

    if (!isMatch) {
      const nextAttempts = attempts + 1;
      const isLocked = nextAttempts >= 5;
      const nextLockedUntil = isLocked ? now + 15 * 60 * 1000 : 0;

      await fetch(
        `${recoveryDocUrl}?updateMask.fieldPaths=attempts&updateMask.fieldPaths=lockedUntil`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fields: {
              attempts: { integerValue: String(nextAttempts) },
              lockedUntil: { integerValue: String(nextLockedUntil) },
            },
          }),
        }
      ).catch(() => {});

      console.warn(
        JSON.stringify({
          event: 'ADMIN_PASSWORD_RECOVERY_FAILED',
          ip: clientIp,
          attempts: nextAttempts,
          locked: isLocked,
          timestamp: new Date().toISOString(),
        })
      );

      if (isLocked) {
        return sendResponse(res, 429, {
          error: 'رمز الاسترداد غير صحيح. تم إيقاف المحاولات لمدة 15 دقيقة لدواعي الأمان.',
        });
      }
      return sendResponse(res, 401, {
        error: `رمز الاسترداد غير صحيح. المتبقي لك ${5 - nextAttempts} محاولات قبل الإغلاق.`,
      });
    }

    // Resolve admin UID if not explicitly saved in recovery doc
    let resolvedUid = targetUid;
    if (!resolvedUid) {
      const lookupRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:lookup`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: [targetEmail] }),
        }
      );
      const lookupData: any = await lookupRes.json().catch(() => ({}));
      resolvedUid = lookupData.users?.[0]?.localId || '';
    }

    if (!resolvedUid) {
      return sendResponse(res, 404, { error: 'تعذر العثور على حساب المدير في خدمة المصادقة.' });
    }

    // Update password in Firebase Auth using Identity Toolkit REST API
    const updateRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:update`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          localId: resolvedUid,
          password: newPassword,
        }),
      }
    );

    if (!updateRes.ok) {
      throw new Error('Failed to update admin password in Identity Toolkit');
    }

    // Reset attempts and lock state
    await fetch(
      `${recoveryDocUrl}?updateMask.fieldPaths=attempts&updateMask.fieldPaths=lockedUntil`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: {
            attempts: { integerValue: '0' },
            lockedUntil: { integerValue: '0' },
          },
        }),
      }
    ).catch(() => {});

    ipAttempts.delete(clientIp);

    console.info(
      JSON.stringify({
        event: 'ADMIN_PASSWORD_RECOVERY_SUCCESS',
        targetUid: resolvedUid,
        ip: clientIp,
        timestamp: new Date().toISOString(),
      })
    );

    return sendResponse(res, 200, {
      success: true,
      message: 'تم استرداد حساب المدير وتحديث كلمة المرور بنجاح! يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.',
    });
  } catch (err: any) {
    console.error(
      JSON.stringify({
        event: 'ADMIN_PASSWORD_RECOVERY_ERROR',
        ip: clientIp,
        error: err instanceof Error ? err.message : String(err),
        timestamp: new Date().toISOString(),
      })
    );
    return sendResponse(res, 500, {
      error: 'حدث خطأ داخلي أثناء معالجة طلب استرداد الحساب.',
    });
  }
}

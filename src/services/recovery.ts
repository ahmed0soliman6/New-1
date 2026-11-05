/**
 * SOLI MEDICAL — CRYPTOGRAPHIC ADMIN RECOVERY SERVICE
 *
 * Secure PBKDF2 (SHA-256 with 100,000 iterations & 16-byte cryptographic salt)
 * for admin password recovery.
 *
 * SECURITY INVARIANT:
 * - Neither the plaintext recovery code nor any admin password (plaintext or encrypted)
 *   is ever stored in Firestore.
 * - Unauthenticated recovery verification is executed server-side via `/api/auth/recover`
 *   with strict rate limiting and timing-safe comparison.
 */

import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { requireFirebase } from './firebase';

// Helper: Convert ArrayBuffer to Hex String
function buf2hex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)]
    .map((x) => x.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Generates a clean 24-character recovery code in standard grouped format:
 * SOLI-XXXX-XXXX-XXXX-XXXX-XXXX
 */
export function generateAdminRecoveryCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const array = new Uint8Array(20);
  window.crypto.getRandomValues(array);
  let token = '';
  for (let i = 0; i < array.length; i++) {
    token += chars[array[i] % chars.length];
  }
  const chunks = token.match(/.{1,4}/g) || [];
  return `SOLI-${chunks.join('-')}`;
}

/**
 * Derives a PBKDF2 hash from a recovery code and salt.
 */
async function derivePbkdf2Hash(code: string, salt: Uint8Array): Promise<string> {
  const enc = new TextEncoder();
  const normalizedCode = code.trim().toUpperCase().replace(/\s+/g, '');

  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(normalizedCode),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await window.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );

  return buf2hex(derivedBits);
}

/**
 * Saves a new Admin Recovery Code into Firestore using PBKDF2 hash and salt ONLY.
 * Plaintext code and admin passwords are NEVER stored in Firestore.
 */
export async function setupAdminRecoveryCode(params: {
  recoveryCode: string;
  adminCurrentPassword?: string;
}): Promise<void> {
  const { db, auth } = requireFirebase();
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('يجب تسجيل الدخول كمدير لحفظ رمز الاسترداد.');

  // Generate 16-byte random cryptographic salt
  const salt = new Uint8Array(16);
  window.crypto.getRandomValues(salt);
  const saltHex = buf2hex(salt.buffer);

  // Compute PBKDF2 hash (100,000 iterations)
  const hashHex = await derivePbkdf2Hash(params.recoveryCode, salt);
  const adminEmail = currentUser.email || 'admin@auth.solimedical.local';

  await setDoc(
    doc(db, '_system', 'recovery'),
    {
      version: 3,
      salt: saltHex,
      hash: hashHex,
      targetUid: currentUser.uid,
      targetEmail: adminEmail,
      attempts: 0,
      lockedUntil: 0,
      updatedAt: serverTimestamp(),
    },
    { merge: false }
  );
}

/**
 * Checks if an admin recovery code has been configured in the system (Admin only).
 */
export async function hasAdminRecoveryConfigured(): Promise<boolean> {
  try {
    const { db } = requireFirebase();
    const snap = await getDoc(doc(db, '_system', 'recovery'));
    return snap.exists() && Boolean(snap.data()?.hash);
  } catch {
    return false;
  }
}

/**
 * Recovers the admin account using the recovery code and sets a new password
 * via the server-side rate-limited endpoint `/api/auth/recover`.
 */
export async function recoverAdminPasswordWithCode(params: {
  username: string;
  recoveryCode: string;
  newPassword: string;
}): Promise<{ success: boolean; message: string }> {
  const normalizedUsername = params.username.trim().toLowerCase();

  if (normalizedUsername !== 'admin') {
    throw new Error('رمز الاسترداد مخصص لحساب مدير النظام (admin) فقط.');
  }

  if (params.newPassword.length < 8) {
    throw new Error('كلمة المرور الجديدة يجب ألا تقل عن 8 خانات.');
  }

  const response = await fetch('/api/auth/recover', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: normalizedUsername,
      recoveryCode: params.recoveryCode,
      newPassword: params.newPassword,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'تعذر التحقق من رمز الاسترداد حالياً.');
  }

  return {
    success: true,
    message:
      data.message ||
      'تم استرداد حساب المدير وتحديث كلمة المرور بنجاح! يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.',
  };
}

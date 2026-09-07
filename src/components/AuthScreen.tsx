import React, { useState } from 'react';
import { firebaseConfigError } from '../services/firebase';
import { loginWithUsername } from '../services/auth';
import { AdminRecoveryDialog } from './auth/AdminRecoveryDialog';

export const AuthScreen: React.FC = () => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showRecoveryDialog, setShowRecoveryDialog] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccessMessage('');
    setBusy(true);
    try {
      await loginWithUsername(username, password);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'اسم المستخدم أو كلمة المرور غير صحيحة.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main dir="rtl" className="min-h-screen bg-[#080e1b] text-[#dde2f5] flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-4">
        <form onSubmit={submit} className="rounded-2xl bg-[#111A2E] border border-[#00c2cb]/30 p-7 shadow-2xl space-y-5">
          <div>
            <div className="flex items-center justify-between">
              <p className="text-[#00c2cb] text-xs font-bold tracking-widest">SOLI CLINIC</p>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-slate-400">
                v2.6 RBAC
              </span>
            </div>
            <h1 className="text-2xl font-bold mt-2">تسجيل الدخول</h1>
            <p className="text-sm text-[#9aa8b8] mt-1">
              أدخل اسم المستخدم وكلمة المرور للدخول إلى نظام إدارة العيادة.
            </p>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">اسم المستخدم</label>
            <input
              required
              pattern="[A-Za-z0-9._-]{3,32}"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              placeholder="admin"
              dir="ltr"
              className="w-full rounded-xl bg-[#080e1b] p-3 text-sm outline-none border border-white/10 focus:border-[#00c2cb] transition-colors"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-300">كلمة المرور</label>
              <button
                type="button"
                onClick={() => setShowRecoveryDialog(true)}
                className="text-[11px] text-[#00c2cb] hover:underline cursor-pointer"
              >
                استرداد حساب المدير بالرمز؟
              </button>
            </div>
            <input
              required
              minLength={8}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              dir="ltr"
              className="w-full rounded-xl bg-[#080e1b] p-3 text-sm outline-none border border-white/10 focus:border-[#00c2cb] transition-colors"
            />
          </div>

          {firebaseConfigError && (
            <p className="text-amber-300 text-xs leading-6 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
              {firebaseConfigError}
            </p>
          )}

          {error && (
            <p className="text-rose-300 text-xs leading-6 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
              {error}
            </p>
          )}

          {successMessage && (
            <p className="text-emerald-300 text-xs leading-6 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              {successMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={busy || !!firebaseConfigError}
            className="w-full rounded-xl bg-[#00c2cb] hover:bg-[#45dee7] text-[#08101C] font-bold p-3 transition-all cursor-pointer shadow-md shadow-[#00c2cb]/20 disabled:opacity-50"
          >
            {busy ? 'جارٍ تسجيل الدخول...' : 'تسجيل الدخول'}
          </button>
        </form>

        <div className="text-center text-[11px] text-slate-500">
          نظام محمي بتسجيل الدخول المشفّر والصلاحيات الدقيقة للمستخدمين
        </div>
      </div>

      {showRecoveryDialog && (
        <AdminRecoveryDialog
          onClose={() => setShowRecoveryDialog(false)}
          onSuccess={(msg) => {
            setSuccessMessage(msg);
            setShowRecoveryDialog(false);
          }}
        />
      )}
    </main>
  );
};

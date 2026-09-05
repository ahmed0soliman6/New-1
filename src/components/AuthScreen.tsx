import React, { useState } from 'react';
import { firebaseConfigError } from '../services/firebase';
import { loginWithUsername } from '../services/auth';

export const AuthScreen: React.FC = () => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setBusy(true);
    try { await loginWithUsername(username, password); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'اسم المستخدم أو كلمة المرور غير صحيحة.'); }
    finally { setBusy(false); }
  };

  return <main dir="rtl" className="min-h-screen bg-[#080e1b] text-[#dde2f5] flex items-center justify-center p-6">
    <form onSubmit={submit} className="w-full max-w-md rounded-2xl bg-[#111A2E] border border-[#00c2cb]/30 p-7 shadow-2xl space-y-5">
      <div><p className="text-[#00c2cb] text-xs font-bold">SOLI MEDICAL</p><h1 className="text-2xl font-bold mt-2">تسجيل الدخول</h1><p className="text-sm text-[#9aa8b8] mt-2">أدخل اسم المستخدم وكلمة المرور للدخول إلى النظام.</p></div>
      <input required pattern="[A-Za-z0-9._-]{3,32}" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} placeholder="اسم المستخدم" dir="ltr" className="w-full rounded-xl bg-[#080e1b] p-3 outline-none border border-white/10" />
      <input required minLength={8} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="كلمة المرور" dir="ltr" className="w-full rounded-xl bg-[#080e1b] p-3 outline-none border border-white/10" />
      {firebaseConfigError && <p className="text-amber-300 text-xs leading-6">{firebaseConfigError}</p>}
      {error && <p className="text-red-300 text-xs leading-6">{error}</p>}
      <button disabled={busy || !!firebaseConfigError} className="w-full rounded-xl bg-[#00c2cb] text-[#08101C] font-bold p-3 disabled:opacity-50">{busy ? 'جارٍ تسجيل الدخول...' : 'تسجيل الدخول'}</button>
    </form>
  </main>;
};

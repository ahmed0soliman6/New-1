import React, { useEffect, useState } from 'react';
import { firebaseConfigError } from '../services/firebase';
import { createInitialAdmin, getInitialAdminStatus, loginWithUsername } from '../services/auth';

type Mode = 'login' | 'setup';

export const AuthScreen: React.FC = () => {
  const [mode, setMode] = useState<Mode>('login');
  const [username, setUsername] = useState('admin');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (!firebaseConfigError) getInitialAdminStatus().then((status) => { if (!status.ready && !status.claimed) setMode('setup'); }).catch(() => setMode('setup')); }, []);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError('');
    if (mode === 'setup' && password !== confirmation) { setError('كلمتا المرور غير متطابقتين.'); return; }
    setBusy(true);
    try {
      if (mode === 'setup') { await createInitialAdmin({ username, displayName, password }); setMode('login'); setPassword(''); setConfirmation(''); alert('تم إنشاء المدير الأول بنجاح. يمكنك الآن تسجيل الدخول.'); }
      else await loginWithUsername(username, password);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'تعذر إتمام العملية.'); } finally { setBusy(false); }
  };
  return <main dir="rtl" className="min-h-screen bg-[#080e1b] text-[#dde2f5] flex items-center justify-center p-6"><form onSubmit={submit} className="w-full max-w-md rounded-2xl bg-[#111A2E] border border-[#00c2cb]/30 p-7 shadow-2xl space-y-5"><div><p className="text-[#00c2cb] text-xs font-bold">SOLI MEDICAL</p><h1 className="text-2xl font-bold mt-2">{mode === 'setup' ? 'إعداد النظام لأول مرة' : 'تسجيل الدخول'}</h1><p className="text-sm text-[#9aa8b8] mt-2">Firebase Authentication وFirestore فقط — بدون خدمات مدفوعة.</p></div>{mode === 'setup' && <><input required value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="اسم المدير" className="w-full rounded-xl bg-[#080e1b] p-3 outline-none border border-white/10" /><p className="text-xs text-[#9aa8b8]">يتم إنشاء أول حساب بصلاحية ADMIN مرة واحدة فقط.</p></>}<input required pattern="[A-Za-z0-9._-]{3,32}" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} placeholder="اسم المستخدم" dir="ltr" className="w-full rounded-xl bg-[#080e1b] p-3 outline-none border border-white/10" /><input required minLength={8} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="كلمة المرور — 8 أحرف على الأقل" dir="ltr" className="w-full rounded-xl bg-[#080e1b] p-3 outline-none border border-white/10" />{mode === 'setup' && <input required minLength={8} type="password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} placeholder="تأكيد كلمة المرور" dir="ltr" className="w-full rounded-xl bg-[#080e1b] p-3 outline-none border border-white/10" />}{firebaseConfigError && <p className="text-amber-300 text-xs leading-6">{firebaseConfigError}</p>}{error && <p className="text-red-300 text-xs leading-6">{error}</p>}<button disabled={busy || !!firebaseConfigError} className="w-full rounded-xl bg-[#00c2cb] text-[#08101C] font-bold p-3 disabled:opacity-50">{busy ? 'جارٍ التنفيذ...' : mode === 'setup' ? 'إنشاء حساب المدير' : 'تسجيل الدخول'}</button>{mode === 'setup' && <p className="text-xs text-amber-200/80 leading-6">احتفظ ببيانات المدير في مكان آمن. استرداد كلمة المرور بالبريد غير متاح لأن الحساب يستخدم بريدًا داخليًا ولا نستخدم خدمات مدفوعة.</p>}</form></main>;
};

import React, { useEffect, useState } from 'react';
import { firebaseConfigError } from '../services/firebase';
import { createInitialAdmin, getInitialAdminStatus, loginWithUsername, recoverPassword } from '../services/auth';

type Mode = 'login' | 'setup' | 'recovery';

export const AuthScreen: React.FC = () => {
  const [mode, setMode] = useState<Mode>('login');
  const [username, setUsername] = useState('admin');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (firebaseConfigError) return;
    getInitialAdminStatus().then((status) => {
      if (!status.ready && !status.claimed) setMode('setup');
    }).catch(() => setMode('setup'));
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (mode !== 'login' && password !== confirmation) { setError('كلمتا المرور غير متطابقتين.'); return; }
    setBusy(true);
    try {
      if (mode === 'setup') {
        const result = await createInitialAdmin({ username, displayName, password });
        setGeneratedCode(result.recoveryCode);
        setMode('login');
        setPassword('');
        alert(`تم إنشاء المدير الأول. رمز الاسترداد لمرة واحدة: ${result.recoveryCode}`);
      } else if (mode === 'recovery') {
        await recoverPassword({ username, recoveryCode, password });
        setMode('login'); setPassword(''); setConfirmation(''); setRecoveryCode('');
        alert('تم تغيير كلمة المرور بنجاح.');
      } else {
        await loginWithUsername(username, password);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر إتمام العملية.');
    } finally { setBusy(false); }
  };

  const title = mode === 'setup' ? 'إعداد النظام لأول مرة' : mode === 'recovery' ? 'استرداد كلمة المرور' : 'تسجيل الدخول';
  return (
    <main dir="rtl" className="min-h-screen bg-[#080e1b] text-[#dde2f5] flex items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl bg-[#111A2E] border border-[#00c2cb]/30 p-7 shadow-2xl space-y-5">
        <div><p className="text-[#00c2cb] text-xs font-bold">SOLI MEDICAL</p><h1 className="text-2xl font-bold mt-2">{title}</h1><p className="text-sm text-[#9aa8b8] mt-2">المصادقة تتم عبر Firebase ولا يظهر البريد الداخلي للمستخدم.</p></div>
        {mode === 'setup' && <><input required value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="اسم المدير" className="w-full rounded-xl bg-[#080e1b] p-3 outline-none border border-white/10" /><p className="text-xs text-[#9aa8b8]">سيتم إنشاء أول حساب بصلاحية ADMIN مرة واحدة فقط.</p></>}
        <input required pattern="[A-Za-z0-9._-]{3,32}" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} placeholder="اسم المستخدم" dir="ltr" className="w-full rounded-xl bg-[#080e1b] p-3 outline-none border border-white/10" />
        {mode === 'recovery' && <input required value={recoveryCode} onChange={(e) => setRecoveryCode(e.target.value)} placeholder="رمز الاسترداد" dir="ltr" className="w-full rounded-xl bg-[#080e1b] p-3 outline-none border border-white/10" />}
        <input required minLength={8} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="كلمة المرور — 8 أحرف على الأقل" dir="ltr" className="w-full rounded-xl bg-[#080e1b] p-3 outline-none border border-white/10" />
        {mode !== 'login' && <input required minLength={8} type="password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} placeholder="تأكيد كلمة المرور" dir="ltr" className="w-full rounded-xl bg-[#080e1b] p-3 outline-none border border-white/10" />}
        {generatedCode && <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 p-3 text-amber-200 text-sm">رمز الاسترداد: <b dir="ltr">{generatedCode}</b><br /><span className="text-xs">احتفظ به في مكان آمن ولن يتم عرضه مرة أخرى.</span></div>}
        {firebaseConfigError && <p className="text-amber-300 text-xs leading-6">{firebaseConfigError}</p>}
        {error && <p className="text-red-300 text-xs leading-6">{error}</p>}
        <button disabled={busy || !!firebaseConfigError} className="w-full rounded-xl bg-[#00c2cb] text-[#08101C] font-bold p-3 disabled:opacity-50">{busy ? 'جارٍ التنفيذ...' : mode === 'setup' ? 'إنشاء حساب المدير' : mode === 'recovery' ? 'تغيير كلمة المرور' : 'تسجيل الدخول'}</button>
        {mode === 'login' && <button type="button" onClick={() => { setMode('recovery'); setError(''); }} className="w-full text-sm text-[#45dee7]">نسيت كلمة المرور؟</button>}
        {mode === 'recovery' && <button type="button" onClick={() => { setMode('login'); setError(''); }} className="w-full text-sm text-[#45dee7]">العودة لتسجيل الدخول</button>}
      </form>
    </main>
  );
};

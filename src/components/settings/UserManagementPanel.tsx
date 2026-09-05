import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, type DocumentData } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { createManagedUser } from '../../services/auth';
import type { UserRole } from '../../types/database';

type ManagedUser = { uid: string; username: string; displayName: string; email: string; role: UserRole; active: boolean };

export const UserManagementPanel: React.FC = () => {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('SECRETARY');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!db) return;
    return onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsers(snapshot.docs.map((item) => ({ uid: item.id, ...(item.data() as DocumentData) })) as ManagedUser[]);
    }, (reason) => setError(reason.message));
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      await createManagedUser({ username, displayName, password, role });
      setUsername(''); setDisplayName(''); setPassword(''); setMessage('تم إنشاء المستخدم وربطه بالصلاحية بنجاح.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'تعذر إنشاء المستخدم.'); }
    finally { setBusy(false); }
  };

  return <section className="space-y-5 rounded-2xl border border-[#00c2cb]/20 bg-white dark:bg-[#111A2E] p-5 shadow-sm" dir="rtl">
    <div><h2 className="text-lg font-bold flex items-center gap-2"><span className="material-symbols-outlined text-[#00c2cb]">manage_accounts</span>إدارة المستخدمين والصلاحيات</h2><p className="text-xs text-slate-500 dark:text-[#859394] mt-1">إنشاء حساب فعلي في Firebase Authentication وربطه بدور Firestore.</p></div>
    <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3 items-end">
      <label className="text-xs font-bold">اسم المستخدم<input required pattern="[A-Za-z0-9._-]{3,32}" value={username} onChange={e => setUsername(e.target.value.toLowerCase())} className="mt-1 w-full rounded-xl border border-slate-200 dark:border-white/10 bg-transparent p-2.5" dir="ltr" /></label>
      <label className="text-xs font-bold">الاسم الظاهر<input required value={displayName} onChange={e => setDisplayName(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 dark:border-white/10 bg-transparent p-2.5" /></label>
      <label className="text-xs font-bold">كلمة المرور<input required minLength={8} type="password" value={password} onChange={e => setPassword(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 dark:border-white/10 bg-transparent p-2.5" dir="ltr" /></label>
      <label className="text-xs font-bold">الصلاحية<select value={role} onChange={e => setRole(e.target.value as UserRole)} className="mt-1 w-full rounded-xl border border-slate-200 dark:border-white/10 bg-transparent p-2.5"><option value="SECRETARY">سكرتير</option><option value="DOCTOR">طبيب</option><option value="ADMIN">مدير</option></select></label>
      <button disabled={busy} className="rounded-xl bg-[#00c2cb] px-4 py-3 font-bold text-slate-950 disabled:opacity-50">{busy ? 'جارٍ الإنشاء...' : 'إنشاء المستخدم'}</button>
    </form>
    {message && <p className="text-sm text-emerald-500">{message}</p>}{error && <p className="text-sm text-red-400">{error}</p>}
    <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-slate-200 dark:border-white/10 text-right"><th className="p-2">المستخدم</th><th className="p-2">البريد الداخلي</th><th className="p-2">الدور</th><th className="p-2">الحالة</th></tr></thead><tbody>{users.map(user => <tr key={user.uid} className="border-b border-slate-100 dark:border-white/5"><td className="p-2">{user.displayName || user.username}<div className="text-[10px] text-slate-400" dir="ltr">{user.uid}</div></td><td className="p-2" dir="ltr">{user.email}</td><td className="p-2">{user.role === 'ADMIN' ? 'مدير' : user.role === 'DOCTOR' ? 'طبيب' : 'سكرتير'}</td><td className="p-2">{user.active === false ? 'معطل' : 'نشط'}</td></tr>)}</tbody></table></div>
  </section>;
};

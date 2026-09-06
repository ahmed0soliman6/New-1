import React, { useState } from 'react';
import { TransactionRecord } from '../../types';
import { usePermissions } from '../../context/AuthContext';
import { PermissionGate } from '../auth/PermissionGate';

interface FinanceScreenProps {
  transactions: TransactionRecord[];
  onAddTransaction: (tx: TransactionRecord) => void;
}

export const FinanceScreen: React.FC<FinanceScreenProps> = ({ transactions, onAddTransaction }) => {
  const { assertPermission, userProfile } = usePermissions();
  const [filter, setFilter] = useState<string>('all');
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseAmount, setExpenseAmount] = useState(150);
  const [toast, setToast] = useState<string | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<TransactionRecord | null>(null);

  const totalIn = transactions.filter((t) => t.type === 'in').reduce((sum, t) => sum + t.amount, 0);
  const totalOut = transactions.filter((t) => t.type === 'out').reduce((sum, t) => sum + t.amount, 0);
  const netInDrawer = totalIn - totalOut;

  const cashIn = transactions
    .filter((t) => t.type === 'in' && t.method === 'نقدي')
    .reduce((sum, t) => sum + t.amount, 0);
  const posIn = transactions
    .filter((t) => t.type === 'in' && (t.method === 'فيزا / كارت' || t.method === 'إنستاباي'))
    .reduce((sum, t) => sum + t.amount, 0);

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseDesc.trim()) return;
    try {
      assertPermission('billing.expenses', 'تسجيل مصروف نثري');
      const newTx: TransactionRecord = {
        id: `tx-${Date.now()}`,
        receiptNo: `EXP-${Math.floor(Math.random() * 900) + 100}`,
        patientName: 'مصروفات نثرية',
        description: expenseDesc,
        amount: expenseAmount,
        type: 'out',
        method: 'نقدي',
        time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
        category: 'نثريات',
      };
      onAddTransaction(newTx);
      setShowExpenseModal(false);
      setExpenseDesc('');
      setToast(`تم خصم مصروف نثري قدره ${expenseAmount} ج.م من درج العيادة`);
      setTimeout(() => setToast(null), 3500);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'ليس لديك صلاحية لتسجيل المصروفات.');
    }
  };

  const handleCloseShift = () => {
    try {
      assertPermission('billing.closeShift', 'تقفيل الوردية وتسليم النقدية');
      setToast(`تم إغلاق وردية الاستقبال بنجاح! صافي النقدية الموردة للخزينة: ${netInDrawer} ج.م`);
      setTimeout(() => setToast(null), 4500);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'ليس لديك صلاحية لتقفيل الوردية.');
    }
  };

  const filteredTx = transactions.filter((t) => {
    if (filter === 'cash') return t.method === 'نقدي';
    if (filter === 'pos') return t.method === 'فيزا / كارت';
    if (filter === 'instapay') return t.method === 'إنستاباي';
    if (filter === 'expense') return t.type === 'out';
    return true;
  });

  return (
    <div className="flex flex-col w-full pb-16 space-y-6 text-slate-800 dark:text-[#dde2f5]">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-[#18233C] border border-[#00c2cb] text-slate-900 dark:text-[#45dee7] px-6 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in">
          <span className="material-symbols-outlined text-2xl text-[#00c2cb]">payments</span>
          <span className="text-sm font-bold">{toast}</span>
        </div>
      )}

      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-[#859394] mb-1">
            <span>الرئيسية</span>
            <span>&gt;</span>
            <span className="text-[#008f97] dark:text-[#00c2cb]">الخزينة والماليات اليومية</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-[#dde2f5] flex items-center gap-3">
            <span>إدارة خزينة العيادة والدرج النقدي</span>
            <span className="bg-emerald-100 dark:bg-[#10B981]/20 text-emerald-700 dark:text-[#10B981] px-3 py-0.5 rounded-full text-xs font-bold border border-emerald-200 dark:border-[#10B981]/30">
              وردية اليوم مفتوحة
            </span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <PermissionGate permission="billing.expenses">
            <button
              onClick={() => setShowExpenseModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 dark:bg-[#ef4444]/20 hover:bg-rose-100 dark:hover:bg-[#ef4444]/30 text-rose-600 dark:text-[#ef4444] text-xs font-bold border border-rose-200 dark:border-[#ef4444]/30 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">remove_circle</span>
              <span>- تسجيل مصروف نثري</span>
            </button>
          </PermissionGate>

          <PermissionGate permission="billing.closeShift">
            <button
              onClick={handleCloseShift}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00c2cb] hover:bg-[#45dee7] text-[#08101C] text-xs font-bold shadow-md shadow-[#00c2cb]/20 transition-all cursor-pointer active:scale-95"
            >
              <span className="material-symbols-outlined text-base">lock_clock</span>
              <span>تقفيل الوردية وتسليم النقدية</span>
            </button>
          </PermissionGate>
        </div>
      </div>

      {/* Strict Separation Principle Reminder */}
      <div className="bg-white dark:bg-[#111A2E] p-4 rounded-2xl border border-slate-200 dark:border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#00c2cb]/15 flex items-center justify-center text-[#008f97] dark:text-[#00c2cb] shrink-0">
            <span className="material-symbols-outlined text-xl">account_balance_wallet</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-[#bbc9ca] leading-relaxed">
            <strong className="text-slate-900 dark:text-[#dde2f5]">قاعدة الرقابة المالية الصارمة: </strong>
            الحسابات تسجل فقط المبالغ المحصلة فعلياً من المرضى بعد تأكيد حضورهم بالاستقبال. لا يتم احتساب أي مواعيد مستقبلية أو متوقعة ضمن أرقام الدرج الحالية.
          </p>
        </div>
        <span className="text-xs text-[#008f97] dark:text-[#45dee7] font-semibold bg-slate-100 dark:bg-[#18233C] px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-white/5 shrink-0">
          المستخدم الحالي: {userProfile?.displayName || 'الاستقبال'}
        </span>
      </div>

      {/* 4 Financial Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Tile 1: Net in Drawer */}
        <div className="bg-teal-50/70 dark:bg-[#18233C] p-5 rounded-2xl border-2 border-[#00c2cb] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-900 dark:text-[#dde2f5]">
            <span className="text-xs font-bold">صافي النقدية بالدرج الآن</span>
            <span className="material-symbols-outlined text-xl text-[#008f97] dark:text-[#00c2cb]">point_of_sale</span>
          </div>
          <div className="my-2">
            <span className="text-3xl font-extrabold text-[#008f97] dark:text-[#45dee7] font-mono">{netInDrawer.toLocaleString()}</span>
            <span className="text-xs text-slate-500 dark:text-[#bbc9ca] mr-1">ج.م</span>
          </div>
          <span className="text-[11px] text-[#008f97] dark:text-[#00c2cb] font-semibold">نقدية فعلية قابلة للعد والتسليم</span>
        </div>

        {/* Tile 2: Cash In */}
        <div className="bg-white dark:bg-[#111A2E] p-5 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-600 dark:text-[#bbc9ca]">
            <span className="text-xs font-semibold">إجمالي المحصل نقداً (كاش)</span>
            <span className="material-symbols-outlined text-xl text-emerald-600 dark:text-[#10B981]">payments</span>
          </div>
          <div className="my-2">
            <span className="text-3xl font-extrabold text-emerald-600 dark:text-[#10B981] font-mono">{cashIn.toLocaleString()}</span>
            <span className="text-xs text-slate-500 dark:text-[#bbc9ca] mr-1">ج.م</span>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-[#859394]">تحصيل شباك الاستقبال المباشر</span>
        </div>

        {/* Tile 3: Electronic / POS */}
        <div className="bg-white dark:bg-[#111A2E] p-5 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-600 dark:text-[#bbc9ca]">
            <span className="text-xs font-semibold">المحصل إلكترونياً (فيزا + إنستاباي)</span>
            <span className="material-symbols-outlined text-xl text-purple-600 dark:text-[#d0bcff]">credit_card</span>
          </div>
          <div className="my-2">
            <span className="text-3xl font-extrabold text-purple-700 dark:text-[#d0bcff] font-mono">{posIn.toLocaleString()}</span>
            <span className="text-xs text-slate-500 dark:text-[#bbc9ca] mr-1">ج.م</span>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-[#859394]">مباشرة إلى الحساب البنكي للعيادة</span>
        </div>

        {/* Tile 4: Expenses */}
        <div className="bg-white dark:bg-[#111A2E] p-5 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-600 dark:text-[#bbc9ca]">
            <span className="text-xs font-semibold">مصروفات نثرية منصرفة</span>
            <span className="material-symbols-outlined text-xl text-rose-500">shopping_bag</span>
          </div>
          <div className="my-2">
            <span className="text-3xl font-extrabold text-rose-600 dark:text-[#ef4444] font-mono">{totalOut.toLocaleString()}</span>
            <span className="text-xs text-slate-500 dark:text-[#bbc9ca] mr-1">ج.م</span>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-[#859394]">بموجب إيصالات معتمدة</span>
        </div>
      </div>

      {/* Filter Tabs & Transactions Table */}
      <div className="bg-white dark:bg-[#111A2E] rounded-2xl border border-slate-200 dark:border-white/5 overflow-hidden shadow-sm p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-base font-bold text-slate-900 dark:text-[#dde2f5] flex items-center gap-2">
            <span className="material-symbols-outlined text-[#008f97] dark:text-[#00c2cb] text-xl">receipt_long</span>
            <span>دفتر اليومية والمعاملات المالية المسجلة ({filteredTx.length})</span>
          </h2>

          <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#080e1b] p-1 rounded-xl border border-slate-200 dark:border-white/5 overflow-x-auto">
            {[
              { id: 'all', label: 'الكل' },
              { id: 'cash', label: 'نقدي (كاش)' },
              { id: 'pos', label: 'فيزا POS' },
              { id: 'instapay', label: 'إنستاباي' },
              { id: 'expense', label: 'مصروفات' },
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => setFilter(btn.id)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  filter === btn.id
                    ? 'bg-[#00c2cb] text-[#08101C] font-bold shadow-xs'
                    : 'text-slate-600 dark:text-[#bbc9ca] hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* Transactions Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-[#18233C] text-slate-600 dark:text-[#bbc9ca] border-b border-slate-200 dark:border-white/5 font-bold">
                <th className="p-3">رقم الإيصال</th>
                <th className="p-3">المريض / البند</th>
                <th className="p-3">البيان والتفاصيل</th>
                <th className="p-3">طريقة الدفع</th>
                <th className="p-3">التوقيت</th>
                <th className="p-3 text-left">المبلغ المسدد</th>
                <th className="p-3 text-center">الإجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {filteredTx.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-[#18233C]/60 transition-colors">
                  <td className="p-3 font-mono text-[#008f97] dark:text-[#00c2cb] font-bold">{tx.receiptNo}</td>
                  <td className="p-3 font-bold text-slate-900 dark:text-[#dde2f5]">{tx.patientName}</td>
                  <td className="p-3 text-slate-600 dark:text-[#bbc9ca]">{tx.description}</td>
                  <td className="p-3">
                    <span
                      className={`px-2.5 py-0.5 rounded-lg text-[11px] font-medium ${
                        tx.method === 'نقدي'
                          ? 'bg-emerald-50 dark:bg-[#10B981]/20 text-emerald-700 dark:text-[#10B981]'
                          : tx.method === 'فيزا / كارت'
                          ? 'bg-purple-50 dark:bg-[#571bc1]/30 text-purple-700 dark:text-[#d0bcff]'
                          : 'bg-teal-50 dark:bg-[#00c2cb]/20 text-teal-700 dark:text-[#45dee7]'
                      }`}
                    >
                      {tx.method}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-slate-500 dark:text-[#859394]">{tx.time}</td>
                  <td
                    className={`p-3 text-left font-mono font-bold text-sm ${
                      tx.type === 'in' ? 'text-emerald-600 dark:text-[#10B981]' : 'text-rose-600 dark:text-[#ef4444]'
                    }`}
                  >
                    {tx.type === 'in' ? `+${tx.amount}` : `-${tx.amount}`} ج.م
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => setSelectedReceipt(tx)}
                      className="p-1.5 rounded-lg bg-slate-100 dark:bg-[#080e1b] hover:bg-[#00c2cb]/20 text-slate-600 dark:text-[#bbc9ca] hover:text-[#008f97] dark:hover:text-[#00c2cb] transition-colors cursor-pointer"
                      title="عرض وطباعة إيصال السداد"
                    >
                      <span className="material-symbols-outlined text-base">print</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleAddExpense}
            className="bg-white dark:bg-[#18233C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-[#dde2f5] flex items-center gap-2">
                <span className="material-symbols-outlined text-rose-500">shopping_bag</span>
                <span>تسجيل مصروف نثري من الدرج</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowExpenseModal(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="text-xs text-slate-600 dark:text-[#859394] block mb-1">وصف المصروف:</label>
              <input
                type="text"
                required
                value={expenseDesc}
                onChange={(e) => setExpenseDesc(e.target.value)}
                placeholder="مثال: شراء شاش وسرنجات طوارئ من الصيدلية"
                className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/5 focus:outline-none focus:ring-1 focus:ring-[#00c2cb]"
              />
            </div>

            <div>
              <label className="text-xs text-slate-600 dark:text-[#859394] block mb-1">المبلغ المنصرف (ج.م):</label>
              <input
                type="number"
                required
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(Number(e.target.value))}
                className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/5 font-mono focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowExpenseModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-[#111A2E] text-xs text-slate-600 dark:text-[#bbc9ca] hover:bg-slate-200 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-rose-600 text-xs font-bold text-white hover:bg-rose-700 transition-all cursor-pointer"
              >
                خصم المصروف من الدرج
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Receipt Print Preview Modal (Thermal 80mm format) */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 border border-slate-300 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4 font-mono animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-2 text-xs font-sans">
              <span className="font-bold text-slate-700">معاينة إيصال سداد نقدي (Thermal 80mm)</span>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="text-slate-400 hover:text-slate-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-bold text-sm">عيادات سولي التخصصية</h3>
              <p className="text-[11px] text-slate-500">د. حازم سمير القاضي - باطنة وقلب</p>
              <p className="text-[10px] text-slate-400">14 شارع جامعة الدول العربية - المهندسين</p>
            </div>

            <div className="border-t border-b border-dashed border-slate-300 py-2.5 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">رقم الإيصال:</span>
                <span className="font-bold">{selectedReceipt.receiptNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">التاريخ والوقت:</span>
                <span>{selectedReceipt.time}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">المريض:</span>
                <span className="font-bold">{selectedReceipt.patientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">الخدمة:</span>
                <span>{selectedReceipt.description}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">طريقة الدفع:</span>
                <span>{selectedReceipt.method}</span>
              </div>
              <div className="flex justify-between text-sm font-bold pt-1 border-t border-slate-200">
                <span>المبلغ المسدد:</span>
                <span className="text-emerald-700">{selectedReceipt.amount} ج.م</span>
              </div>
            </div>

            <div className="text-center text-[10px] text-slate-400 space-y-1">
              <p>شكراً لزيارتكم - نتمنى لكم دوام الصحة والعافية</p>
              <p className="font-sans">للاستفسارات وحجز المتابعات: 01092847162</p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setSelectedReceipt(null)}
                className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold font-sans cursor-pointer hover:bg-slate-200"
              >
                إغلاق
              </button>
              <button
                onClick={() => {
                  window.print();
                }}
                className="flex-1 py-2 rounded-xl bg-[#00c2cb] text-[#08101C] text-xs font-bold font-sans cursor-pointer hover:bg-[#45dee7]"
              >
                طباعة الآن
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

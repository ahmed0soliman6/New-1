import React, { useState } from 'react';
import { AppointmentListItem } from '../../types';

interface NewAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddAppointment: (app: AppointmentListItem) => void;
}

export const NewAppointmentModal: React.FC<NewAppointmentModalProps> = ({
  isOpen,
  onClose,
  onAddAppointment,
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [timeSlot, setTimeSlot] = useState('02:30 م');
  const [branch, setBranch] = useState('المهندسين');
  const [visitType, setVisitType] = useState('كشف جديد');
  const [fee, setFee] = useState(300);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      alert('يرجى إدخال اسم المريض ورقم الهاتف');
      return;
    }

    const newApp: AppointmentListItem = {
      id: `app-${Date.now()}`,
      patientName: name,
      medicalCode: `EG-${Math.floor(Math.random() * 90000) + 10000}`,
      phone,
      timeSlot,
      visitType,
      expectedFee: fee,
      branch,
      status: 'مجدول',
    };

    onAddAppointment(newApp);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#18233C] border border-[#00c2cb]/40 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#00c2cb] text-xl">calendar_add_on</span>
            <h3 className="text-base font-bold text-[#dde2f5]">حجز موعد عيادة مسبق</h3>
          </div>
          <button onClick={onClose} className="text-[#859394] hover:text-white cursor-pointer">
            ✕
          </button>
        </div>

        <p className="text-xs text-[#bbc9ca]">
          هذا الحجز يدرج المريض في جدول مواعيد اليوم ولا يخصم أو يورد أي مبالغ حتى وصول المريض للاستقبال.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-[#859394] block mb-1">اسم المريض:</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: يوسف أحمد عبد الرحمن"
              className="w-full bg-[#080e1b] text-[#dde2f5] text-xs p-2.5 rounded-xl border border-white/5 focus:outline-none focus:ring-1 focus:ring-[#00c2cb]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[#859394] block mb-1">رقم الهاتف:</label>
              <input
                type="tel"
                required
                dir="ltr"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="010xxxxxxxx"
                className="w-full bg-[#080e1b] text-[#dde2f5] text-xs p-2.5 rounded-xl border border-white/5 font-mono focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs text-[#859394] block mb-1">وقت الموعد:</label>
              <input
                type="text"
                value={timeSlot}
                onChange={(e) => setTimeSlot(e.target.value)}
                placeholder="02:30 م"
                className="w-full bg-[#080e1b] text-[#dde2f5] text-xs p-2.5 rounded-xl border border-white/5 font-mono focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[#859394] block mb-1">الفرع:</label>
              <select
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="w-full bg-[#080e1b] text-[#dde2f5] text-xs p-2.5 rounded-xl border border-white/5 focus:outline-none cursor-pointer"
              >
                <option value="المهندسين">الفرع الرئيسي - المهندسين</option>
                <option value="الدقي">فرع الدقي التخصصي</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-[#859394] block mb-1">نوع الكشف والرسوم:</label>
              <select
                value={visitType}
                onChange={(e) => {
                  setVisitType(e.target.value);
                  setFee(e.target.value === 'كشف جديد' ? 300 : e.target.value === 'استشارة' ? 150 : 0);
                }}
                className="w-full bg-[#080e1b] text-[#dde2f5] text-xs p-2.5 rounded-xl border border-white/5 focus:outline-none cursor-pointer"
              >
                <option value="كشف جديد">كشف جديد (300 ج.م)</option>
                <option value="استشارة">استشارة عادية (150 ج.م)</option>
                <option value="متابعة مجانية">متابعة مجانية (0 ج.م)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#111A2E] text-xs text-[#bbc9ca] hover:bg-[#242a38] cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-[#00c2cb] hover:bg-[#45dee7] text-[#08101C] font-bold text-xs shadow-md shadow-[#00c2cb]/20 transition-all cursor-pointer"
            >
              تأكيد إضافة الموعد
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

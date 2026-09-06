import React, { useState } from 'react';
import { QueueItem, PatientListItem, ScreenType } from '../../types';

interface PatientIntakeScreenProps {
  onAddPatientToQueue: (item: QueueItem) => void;
  patients: PatientListItem[];
  presetChronicConditions: { id: string; name: string; category: string; color: string }[];
  onAddChronicCondition: (condition: { id: string; name: string; category: string; color: string }) => void;
  onNavigate?: (screen: ScreenType) => void;
  nextFileNumber?: number;
  symptomsCatalog?: { id: string; name: string; category: string }[];
}

export const PatientIntakeScreen: React.FC<PatientIntakeScreenProps> = ({
  onAddPatientToQueue,
  patients,
  presetChronicConditions,
  onAddChronicCondition,
  onNavigate,
  nextFileNumber = 1,
  symptomsCatalog = [
    { id: '1', name: 'ألم حاد بمنتصف الصدر أو الشرسوف', category: 'باطنة وجهاز هضمي' },
    { id: '2', name: 'انتفاخ وغازات وتقلصات بالبطن', category: 'باطنة وجهاز هضمي' },
    { id: '3', name: 'ارتجاع وحرقة شديدة في المريء', category: 'باطنة وجهاز هضمي' },
    { id: '4', name: 'صداع ضاغط خلفي أو نبضي', category: 'مخ وأعصاب' },
    { id: '5', name: 'حرقة أو صعوبة أثناء التبول', category: 'مسالك بولية' },
    { id: '6', name: 'غثيان مستمر وفقدان للشهية', category: 'باطنة وجهاز هضمي' },
    { id: '7', name: 'ارتفاع في درجة الحرارة وقشعريرة', category: 'عام' },
    { id: '8', name: 'سعال جاف ممتد مع ضيق تنفس', category: 'صدرية' },
  ],
}) => {
  const [mode, setMode] = useState<'new' | 'existing'>('new');
  const [name, setName] = useState('أحمد محمد إبراهيم حسن');
  const [phone, setPhone] = useState('01092837465');
  const [age, setAge] = useState(38);
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [address, setAddress] = useState('');
  const [fileNumber, setFileNumber] = useState<number | string>(nextFileNumber);
  const [visitType, setVisitType] = useState<'كشف جديد' | 'استشارة / متابعة'>('كشف جديد');
  const [tariff, setTariff] = useState(300);
  const [complaint, setComplaint] = useState('ألم حاد أعلى البطن مستمر منذ الصباح مصحوباً بغثيان وحرقة.');
  const [chronicSelected, setChronicSelected] = useState<string[]>(['ضغط دم مرتفع', 'داء السكري (النوع الثاني)']);
  const [newChronicInput, setNewChronicInput] = useState('');
  const [notes, setNotes] = useState('');
  const [payMethod, setPayMethod] = useState<'نقدي' | 'فيزا / كارت' | 'إنستاباي'>('نقدي');
  const [tendered, setTendered] = useState(300);
  const [printReceipt, setPrintReceipt] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const toggleChronic = (tag: string) => {
    if (chronicSelected.includes(tag)) {
      setChronicSelected(chronicSelected.filter((t) => t !== tag));
    } else {
      setChronicSelected([...chronicSelected, tag]);
    }
  };

  const handleAddNewChronic = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newChronicInput.trim();
    if (!trimmed) return;
    if (!chronicSelected.includes(trimmed)) {
      setChronicSelected([...chronicSelected, trimmed]);
    }
    const alreadyPreset = presetChronicConditions.some((c) => c.name.toLowerCase() === trimmed.toLowerCase());
    if (!alreadyPreset) {
      onAddChronicCondition({
        id: `cc-${Date.now()}`,
        name: trimmed,
        category: 'أمراض شائعة',
        color: 'bg-teal-500',
      });
    }
    setNewChronicInput('');
    setToastMessage(`تمت إضافة "${trimmed}" إلى الأمراض المزمنة`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSelectExisting = (p: PatientListItem) => {
    setName(p.name);
    setPhone(p.phone);
    setAge(p.age);
    setGender(p.gender);
    setAddress(p.governorate || '');
    setFileNumber(p.fileNumber || 1);
    setChronicSelected(p.chronicConditions || []);
    setToastMessage(`تم استرجاع ملف المريض: ${p.name} (ملف #${p.fileNumber || 1})`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('يرجى إدخال اسم المريض رباعياً');
      return;
    }

    const ticketNumber = `#${Math.floor(Math.random() * 20) + 20}`;
    const newQueueItem: QueueItem = {
      id: `q-${Date.now()}`,
      ticketNumber,
      fileNumber: fileNumber || 1,
      patientName: name,
      medicalCode: `EG-${Math.floor(Math.random() * 90000) + 10000}`,
      phone,
      age: Number(age) || 30,
      visitType,
      arrivalTime: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      elapsedMinutes: 1,
      paidAmount: tariff,
      paymentMethod: payMethod,
      complaint: complaint || 'كشف روتيني بالعيادة',
      status: 'waiting',
    };

    onAddPatientToQueue(newQueueItem);
    setToastMessage(`تم تسجيل الزيارة بنجاح! رقم الدور (${ticketNumber}) - ملف رقم (${fileNumber || 1})`);
    setTimeout(() => setToastMessage(null), 4500);

    if (printReceipt) {
      console.log('Printing thermal receipt for ticket', ticketNumber);
    }
  };

  const changeDue = tendered - tariff;

  return (
    <div className="flex flex-col w-full pb-16 space-y-6 text-slate-800 dark:text-[#dde2f5]">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-[#18233C] border border-[#00c2cb] text-slate-900 dark:text-[#45dee7] px-6 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in">
          <span className="material-symbols-outlined text-2xl text-[#00c2cb]">check_circle</span>
          <span className="text-sm font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Page Header & Triage Governance Banner */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#00c2cb]/15 border border-[#00c2cb]/30 flex items-center justify-center text-[#008f97] dark:text-[#00c2cb] shadow-sm">
              <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                person_add
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 dark:text-[#dde2f5]">تسجيل زيارة جديدة (Walk-in)</h1>
                <span className="bg-[#00c2cb]/15 text-[#008f97] dark:text-[#45dee7] text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 border border-[#00c2cb]/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00c2cb] animate-ping"></span>
                  فوري بدون موعد مسبق
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-[#bbc9ca]">إدخال مباشر لغرفة الانتظار وربط الدفع الفوري بخزينة الوردية</p>
            </div>
          </div>

          {/* Quick Desk Metrics Pill */}
          <div className="flex items-center gap-2 bg-white dark:bg-[#111A2E] p-1.5 rounded-xl border border-slate-200 dark:border-white/5 shadow-xs">
            <div className="px-3 py-1.5 bg-slate-50 dark:bg-[#18233C] rounded-lg flex items-center gap-2">
              <span className="text-xs text-slate-600 dark:text-[#bbc9ca]">في الانتظار حالياً:</span>
              <span className="text-base text-[#008f97] dark:text-[#45dee7] font-bold font-mono">5</span>
            </div>
            <div className="px-3 py-1.5 bg-slate-50 dark:bg-[#18233C] rounded-lg flex items-center gap-2">
              <span className="text-xs text-slate-600 dark:text-[#bbc9ca]">رقم الملف القادم:</span>
              <span className="text-base text-purple-600 dark:text-[#d0bcff] font-bold font-mono">#{fileNumber || 1}</span>
            </div>
          </div>
        </div>

        {/* Mandatory Role Guideline Notice */}
        <div className="bg-white dark:bg-[#111A2E] p-3.5 rounded-xl flex items-center justify-between gap-4 border border-slate-200 dark:border-white/5 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-[#18233C] flex items-center justify-center text-purple-600 dark:text-[#d0bcff]">
              <span className="material-symbols-outlined text-xl">shield</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-900 dark:text-[#dde2f5]">صلاحيات مكتب الاستقبال والتسجيل</span>
              <span className="text-[11px] text-slate-500 dark:text-[#bbc9ca]">
                السكرتيرة تسجل فقط البيانات الأولية والشكوى والتشخيص المبدئي للأمراض المزمنة — لا تدخل تشخيصاً طبياً نهائياً أو روشتة أدوية.
              </span>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-1 text-slate-500 dark:text-[#859394] text-[11px] bg-slate-50 dark:bg-[#18233C] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/5">
            <span className="material-symbols-outlined text-sm text-[#008f97] dark:text-[#00c2cb]">verified_user</span>
            <span>بروتوكول عيادات سولي v2.4</span>
          </div>
        </div>
      </div>

      {/* Intake Mode Selector & Smart Search */}
      <div className="bg-white dark:bg-[#111A2E] p-4 rounded-xl shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 border border-slate-200 dark:border-white/5">
        <div className="flex items-center bg-slate-100 dark:bg-[#080e1b] p-1 rounded-xl w-full md:w-auto self-center border border-slate-200 dark:border-white/5">
          <button
            onClick={() => setMode('new')}
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              mode === 'new'
                ? 'bg-[#00c2cb] text-[#08101C] shadow-sm'
                : 'text-slate-600 dark:text-[#bbc9ca] hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-base">person_add</span>
            <span>مريض جديد لأول مرة</span>
          </button>
          <button
            onClick={() => setMode('existing')}
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              mode === 'existing'
                ? 'bg-[#00c2cb] text-[#08101C] shadow-sm'
                : 'text-slate-600 dark:text-[#bbc9ca] hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-base">manage_search</span>
            <span>اختيار مريض مسجل مسبقاً</span>
          </button>
        </div>

        {/* Existing patients quick bar if in existing mode */}
        {mode === 'existing' ? (
          <div className="flex items-center gap-2 overflow-x-auto">
            {patients.map((p) => (
              <button
                key={p.id}
                onClick={() => handleSelectExisting(p)}
                className="bg-slate-50 dark:bg-[#18233C] hover:bg-slate-100 dark:hover:bg-[#242a38] text-xs px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/5 flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <span className="text-[#008f97] dark:text-[#00c2cb] font-bold">{p.name}</span>
                <span className="text-[10px] text-slate-500 dark:text-[#859394]">
                  (ملف #{p.fileNumber || 1} • {p.age} سنة)
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="relative flex-1 max-w-xl">
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#859394] text-lg">
              search
            </span>
            <input
              type="text"
              placeholder="ابحث بالاسم، رقم الموبايل (مثال: 010...)، أو رقم الملف..."
              className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] placeholder:text-slate-400 dark:placeholder:text-[#859394] text-xs pr-10 pl-4 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#00c2cb] border border-slate-200 dark:border-white/5"
            />
          </div>
        )}
      </div>

      {/* Main Grid: Form (8 Cols) & Billing Side Panel (4 Cols) */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Form Column (8 Cols) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Section 1: Patient Personal Data */}
          <div className="bg-white dark:bg-[#111A2E] p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-white/5 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#008f97] dark:text-[#00c2cb] text-xl">badge</span>
                <span className="text-sm font-bold text-slate-900 dark:text-[#dde2f5]">1. بيانات المريض الأساسية</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-600 dark:text-[#bbc9ca] bg-slate-100 dark:bg-[#18233C] px-3 py-1 rounded-lg border border-slate-200 dark:border-white/5 font-mono font-bold">
                  رقم الملف: {fileNumber || 1}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-800 dark:text-[#dde2f5] flex items-center justify-between">
                  <span>اسم المريض رباعي <span className="text-red-500">*</span></span>
                  <span className="text-[11px] text-slate-500 dark:text-[#859394] font-normal">كما هو مدون بالبطاقة الشخصية</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="أدخل الاسم الرباعي كاملاً"
                    className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/5 focus:outline-none focus:ring-1 focus:ring-[#00c2cb]"
                  />
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#008f97] dark:text-[#00c2cb] text-base">
                    check_circle
                  </span>
                </div>
              </div>

              {/* Phone */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-800 dark:text-[#dde2f5]">
                  رقم الهاتف (واتساب) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    required
                    dir="ltr"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="010xxxxxxxx"
                    className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs pr-3 pl-9 py-2.5 rounded-xl border border-slate-200 dark:border-white/5 font-mono text-left focus:outline-none focus:ring-1 focus:ring-[#00c2cb]"
                  />
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#008f97] dark:text-[#00c2cb] text-base">
                    phone_iphone
                  </span>
                </div>
              </div>

              {/* Age */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-800 dark:text-[#dde2f5]">
                  العمر / السن <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    required
                    value={age}
                    onChange={(e) => setAge(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/5 text-center font-mono focus:outline-none focus:ring-1 focus:ring-[#00c2cb]"
                  />
                  <select className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs px-2 py-2.5 rounded-xl border border-slate-200 dark:border-white/5 focus:outline-none">
                    <option>سنة</option>
                    <option>شهر (رضيع)</option>
                  </select>
                </div>
              </div>

              {/* Gender */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-800 dark:text-[#dde2f5]">
                  النوع / الجنس <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-[#080e1b] p-1 rounded-xl border border-slate-200 dark:border-white/5">
                  <button
                    type="button"
                    onClick={() => setGender('male')}
                    className={`flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      gender === 'male'
                        ? 'bg-white dark:bg-[#18233C] text-[#008f97] dark:text-[#00c2cb] shadow-sm border border-[#00c2cb]/30'
                        : 'text-slate-500 dark:text-[#859394] hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <span className="material-symbols-outlined text-base">male</span>
                    <span>ذكر</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGender('female')}
                    className={`flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      gender === 'female'
                        ? 'bg-white dark:bg-[#18233C] text-[#008f97] dark:text-[#00c2cb] shadow-sm border border-[#00c2cb]/30'
                        : 'text-slate-500 dark:text-[#859394] hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <span className="material-symbols-outlined text-base">female</span>
                    <span>أنثى</span>
                  </button>
                </div>
              </div>

              {/* Address (Empty Text Input without Predefined List) */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-800 dark:text-[#dde2f5]">العنوان</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="أدخل العنوان السكني بالتفصيل (مثل: الدقي - شارع مصدق)..."
                  className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/5 focus:outline-none focus:ring-1 focus:ring-[#00c2cb]"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Encounter Settings */}
          <div className="bg-white dark:bg-[#111A2E] p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-white/5 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#008f97] dark:text-[#00c2cb] text-xl">clinical_notes</span>
                <span className="text-sm font-bold text-slate-900 dark:text-[#dde2f5]">2. إعدادات كشف العيادة</span>
              </div>
              <span className="text-xs text-[#008f97] dark:text-[#00c2cb] bg-[#00c2cb]/10 px-3 py-0.5 rounded-full font-bold">
                دخول فوري
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-800 dark:text-[#dde2f5]">الفرع الحالي</label>
                <div className="p-2.5 bg-slate-50 dark:bg-[#080e1b] rounded-xl flex items-center gap-2 border border-slate-200 dark:border-white/5">
                  <span className="material-symbols-outlined text-[#008f97] dark:text-[#00c2cb] text-base">location_on</span>
                  <span className="text-xs text-slate-800 dark:text-[#dde2f5] font-semibold">المهندسين (الرئيسي)</span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-800 dark:text-[#dde2f5]">الطبيب المعالج</label>
                <div className="p-2.5 bg-slate-50 dark:bg-[#080e1b] rounded-xl flex items-center gap-2 border border-slate-200 dark:border-white/5">
                  <span className="material-symbols-outlined text-purple-600 dark:text-[#d0bcff] text-base">stethoscope</span>
                  <span className="text-xs text-slate-800 dark:text-[#dde2f5] font-semibold">د. حازم القاضي</span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-800 dark:text-[#dde2f5]">
                  نوع الزيارة <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-1.5 bg-slate-100 dark:bg-[#080e1b] p-1 rounded-xl border border-slate-200 dark:border-white/5">
                  <button
                    type="button"
                    onClick={() => {
                      setVisitType('كشف جديد');
                      setTariff(300);
                      setTendered(300);
                    }}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      visitType === 'كشف جديد'
                        ? 'bg-[#00c2cb] text-[#08101C] shadow-sm'
                        : 'text-slate-600 dark:text-[#859394] hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    كشف جديد (300)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setVisitType('استشارة / متابعة');
                      setTariff(150);
                      setTendered(150);
                    }}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      visitType === 'استشارة / متابعة'
                        ? 'bg-[#00c2cb] text-[#08101C] shadow-sm'
                        : 'text-slate-600 dark:text-[#859394] hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    استشارة (150)
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Preliminary Symptoms & Chief Complaint Card */}
          <div className="bg-white dark:bg-[#111A2E] p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-white/5 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3 gap-1">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#008f97] dark:text-[#00c2cb] text-xl">pulse_alert</span>
                <span className="text-sm font-bold text-slate-900 dark:text-[#dde2f5]">3. الأعراض والشكوى الرئيسية للمريض *</span>
              </div>
              <span className="text-xs text-slate-500 dark:text-[#859394]">لإرشاد الطبيب قبل النداء</span>
            </div>

            {/* Dropdown for Preconfigured Chief Complaints / Symptoms */}
            <div className="flex flex-col gap-1.5 bg-teal-50/60 dark:bg-[#18233C]/60 p-3 rounded-xl border border-[#00c2cb]/20">
              <label className="text-xs font-bold text-[#008f97] dark:text-[#45dee7] flex items-center justify-between">
                <span>اختر من قائمة الأعراض والشكاوى المعدة مسبقاً في الإعدادات:</span>
                {onNavigate && (
                  <button
                    type="button"
                    onClick={() => onNavigate('system-settings')}
                    className="text-[11px] text-[#008f97] dark:text-[#00c2cb] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-xs">settings</span>
                    <span>تعديل القائمة</span>
                  </button>
                )}
              </label>
              <select
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val) return;
                  setComplaint((prev) => (prev ? `${prev}، مع ${val}` : val));
                  e.target.value = '';
                }}
                className="w-full bg-white dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-[#00c2cb] cursor-pointer"
              >
                <option value="">-- اضغط لاختيار عرض/شكوى من قائمة الإعدادات المسبقة --</option>
                {symptomsCatalog.map((s) => (
                  <option key={s.id || s.name} value={s.name}>
                    {s.name} ({s.category})
                  </option>
                ))}
              </select>
            </div>

            {/* Chief Complaint */}
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <label className="text-xs font-bold text-slate-800 dark:text-[#dde2f5]">
                  الشكوى التفصيلية بلسان المريض <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-slate-500 dark:text-[#859394]">مقترحات:</span>
                  <button
                    type="button"
                    onClick={() => setComplaint((prev) => (prev ? `${prev}، مع ألم حاد بالمعدة` : 'ألم حاد بالمعدة'))}
                    className="text-[#008f97] dark:text-[#00c2cb] hover:underline cursor-pointer"
                  >
                    ألم معدة
                  </button>
                  <span className="text-slate-400 dark:text-[#859394]">·</span>
                  <button
                    type="button"
                    onClick={() => setComplaint((prev) => (prev ? `${prev}، وخفقان بالقلب` : 'خفقان وتسارع ضربات القلب'))}
                    className="text-[#008f97] dark:text-[#00c2cb] hover:underline cursor-pointer"
                  >
                    خفقان قلب
                  </button>
                  <span className="text-slate-400 dark:text-[#859394]">·</span>
                  <button
                    type="button"
                    onClick={() => setComplaint((prev) => (prev ? `${prev}، وصداع دوخة` : 'صداع مستمر ودوخة'))}
                    className="text-[#008f97] dark:text-[#00c2cb] hover:underline cursor-pointer"
                  >
                    صداع
                  </button>
                </div>
              </div>
              <textarea
                required
                rows={3}
                value={complaint}
                onChange={(e) => setComplaint(e.target.value)}
                placeholder="اكتب ما يعانيه المريض بدقة بكلماته الخاصة..."
                className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs p-3 rounded-xl border border-slate-200 dark:border-white/5 focus:outline-none focus:ring-1 focus:ring-[#00c2cb] leading-relaxed"
              />
            </div>

            {/* Notes */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-800 dark:text-[#dde2f5]">ملاحظات السكرتارية والمكتب (اختياري)</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="مثال: المريض غير قادر على الوقوف طويلاً / يطلب الكشف سريعاً"
                className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/5 focus:outline-none focus:ring-1 focus:ring-[#00c2cb]"
              />
            </div>
          </div>

          {/* Section 4: DEDICATED CARD FOR "الامراض المزمنه" (User Explicit Requirement) */}
          <div className="bg-white dark:bg-[#111A2E] p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-white/5 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3 gap-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-rose-500 text-xl">medical_services</span>
                <span className="text-sm font-bold text-slate-900 dark:text-[#dde2f5]">4. الأمراض المزمنة</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-600 dark:text-[#bbc9ca] bg-slate-100 dark:bg-[#18233C] px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-white/5 font-mono">
                  {chronicSelected.length} محددة
                </span>
                {onNavigate && (
                  <button
                    type="button"
                    onClick={() => onNavigate('system-settings')}
                    className="text-[11px] text-[#008f97] dark:text-[#45dee7] hover:underline flex items-center gap-1 cursor-pointer bg-[#00c2cb]/10 px-2 py-0.5 rounded-md"
                  >
                    <span className="material-symbols-outlined text-xs">settings</span>
                    <span>تعديل القائمة من الإعدادات</span>
                  </button>
                )}
              </div>
            </div>

            {/* Dropdown Selector for Chronic Diseases */}
            <div className="flex flex-col gap-1.5 bg-rose-50/60 dark:bg-[#18233C]/60 p-3 rounded-xl border border-rose-500/20">
              <label className="text-xs font-bold text-rose-700 dark:text-rose-300">
                اختر مرض مزمن من القائمة المنسدلة لإضافته للمريض:
              </label>
              <select
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val) return;
                  if (!chronicSelected.includes(val)) {
                    setChronicSelected([...chronicSelected, val]);
                  }
                  e.target.value = '';
                }}
                className="w-full bg-white dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-[#00c2cb] cursor-pointer"
              >
                <option value="">-- اضغط لاختيار مرض مزمن من قائمة الإعدادات --</option>
                {presetChronicConditions.map((c) => (
                  <option key={c.id || c.name} value={c.name}>
                    {c.name} ({c.category})
                  </option>
                ))}
              </select>
            </div>

            <p className="text-xs text-slate-500 dark:text-[#bbc9ca]">
              اختر الأمراض المزمنة التي يعاني منها المريض لإدراجها تلقائياً في الملف الطبي وتنبيه الطبيب المعالج:
            </p>

            {/* Chronic Conditions Tags from Settings */}
            <div className="flex flex-wrap gap-2">
              {presetChronicConditions.map((item) => {
                const isSelected = chronicSelected.includes(item.name);
                return (
                  <button
                    key={item.id || item.name}
                    type="button"
                    onClick={() => toggleChronic(item.name)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-2 transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-[#00c2cb]/15 text-[#008f97] dark:text-[#45dee7] border-[#00c2cb]/50 font-bold shadow-xs'
                        : 'bg-slate-50 dark:bg-[#080e1b] text-slate-700 dark:text-[#bbc9ca] hover:bg-slate-100 dark:hover:bg-[#18233C] border-slate-200 dark:border-white/5'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${item.color || 'bg-teal-500'}`}></span>
                    <span>{item.name}</span>
                    {isSelected && (
                      <span className="material-symbols-outlined text-xs text-[#008f97] dark:text-[#00c2cb]">check</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Quick Add Custom Chronic Condition directly in this card */}
            <div className="pt-2 border-t border-slate-100 dark:border-white/5">
              <label className="text-[11px] font-bold text-slate-600 dark:text-[#859394] block mb-1.5">
                + إضافة مرض مزمن مخصص (سيتم حفظه أيضاً في قائمة الإعدادات المسبقة):
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newChronicInput}
                  onChange={(e) => setNewChronicInput(e.target.value)}
                  placeholder="مثال: روماتويد مفصلي، حساسية ألبان..."
                  className="flex-1 bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-white/5 focus:outline-none focus:ring-1 focus:ring-[#00c2cb]"
                />
                <button
                  type="button"
                  onClick={handleAddNewChronic}
                  className="px-4 py-2 rounded-xl bg-slate-800 dark:bg-[#18233C] hover:bg-slate-900 dark:hover:bg-[#242a38] text-white text-xs font-bold border border-slate-700 dark:border-white/10 transition-colors cursor-pointer shrink-0"
                >
                  + إضافة للقائمة
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Financial & Instant Billing Column (4 Cols) */}
        <div className="lg:col-span-4 flex flex-col gap-6 sticky top-20">
          {/* Patient Card Preview (Updated without #EG-94820 and with File Number starting from 1) */}
          <div className="bg-white dark:bg-[#111A2E] p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-white/5 flex items-center gap-3.5">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#00c2cb]/20 to-purple-500/20 border border-slate-200 dark:border-white/10 flex items-center justify-center text-[#008f97] dark:text-[#00c2cb] shrink-0 font-bold text-xl font-mono">
              #{fileNumber || 1}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] text-[#008f97] dark:text-[#00c2cb] font-semibold">بطاقة التعريف المؤقتة</span>
              <span className="text-sm font-bold text-slate-900 dark:text-[#dde2f5] truncate">{name || 'اسم المريض'}</span>
              <span className="text-xs text-slate-500 dark:text-[#859394] font-mono">رقم الملف: {fileNumber || 1}</span>
            </div>
          </div>

          {/* Payment Card */}
          <div className="bg-white dark:bg-[#111A2E] p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-[#00c2cb]/30 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-purple-600 dark:text-[#d0bcff] text-xl">payments</span>
                <span className="text-sm font-bold text-slate-900 dark:text-[#dde2f5]">الحسابات والدفع الفوري</span>
              </div>
              <span className="text-xs text-purple-700 dark:text-[#d0bcff] bg-purple-50 dark:bg-[#571bc1]/30 px-2.5 py-0.5 rounded-full font-bold">
                الخزينة اليومية
              </span>
            </div>

            {/* Tariff Breakdown */}
            <div className="bg-slate-50 dark:bg-[#080e1b] p-4 rounded-xl flex flex-col gap-2 border border-slate-200 dark:border-white/5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-[#859394]">قيمة الكشف الأساسية:</span>
                <span className="text-slate-800 dark:text-[#dde2f5] font-semibold font-mono">{tariff} ج.م</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-[#859394]">كود خصم / إعفاء نقابي:</span>
                <span className="text-red-500 font-semibold font-mono">0 ج.م</span>
              </div>
              <div className="h-px bg-slate-200 dark:bg-white/5 my-1"></div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-[#dde2f5]">الإجمالي المطلوب سداده:</span>
                <span className="text-2xl font-extrabold text-[#008f97] dark:text-[#45dee7] font-mono">{tariff} ج.م</span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-800 dark:text-[#dde2f5]">طريقة التحصيل</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'نقدي', icon: 'payments', label: 'كاش' },
                  { id: 'فيزا / كارت', icon: 'credit_card', label: 'فيزا POS' },
                  { id: 'إنستاباي', icon: 'account_balance_wallet', label: 'إنستاباي' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setPayMethod(item.id as any)}
                    className={`p-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer border ${
                      payMethod === item.id
                        ? 'bg-[#00c2cb] text-[#08101C] font-bold border-[#00c2cb] shadow-sm'
                        : 'bg-slate-50 dark:bg-[#080e1b] text-slate-600 dark:text-[#bbc9ca] hover:bg-slate-100 dark:hover:text-white border-slate-200 dark:border-white/5'
                    }`}
                  >
                    <span className="material-symbols-outlined text-lg">{item.icon}</span>
                    <span className="text-[11px]">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Amount Tendered & Change */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-slate-500 dark:text-[#859394]">المبلغ المستلم</label>
                <div className="relative">
                  <input
                    type="number"
                    value={tendered}
                    onChange={(e) => setTendered(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] font-mono text-center font-bold text-sm p-2 rounded-xl border border-slate-200 dark:border-white/5 focus:outline-none"
                  />
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">ج.م</span>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-slate-500 dark:text-[#859394]">المتبقي (الباقي)</label>
                <div className="bg-slate-50 dark:bg-[#080e1b] p-2 rounded-xl flex items-center justify-center border border-slate-200 dark:border-white/5">
                  <span
                    className={`text-sm font-bold font-mono ${
                      changeDue >= 0 ? 'text-emerald-600 dark:text-[#10B981]' : 'text-red-500 dark:text-[#ef4444]'
                    }`}
                  >
                    {changeDue >= 0 ? `${changeDue} ج.م` : `عجز ${Math.abs(changeDue)} ج.م`}
                  </span>
                </div>
              </div>
            </div>

            {/* Print Receipt Toggle */}
            <label className="flex items-center gap-2 cursor-pointer bg-slate-50 dark:bg-[#080e1b] p-2.5 rounded-xl border border-slate-200 dark:border-white/5">
              <input
                type="checkbox"
                checked={printReceipt}
                onChange={(e) => setPrintReceipt(e.target.checked)}
                className="w-4 h-4 rounded text-[#00c2cb] focus:ring-0 accent-[#00c2cb]"
              />
              <span className="text-xs text-slate-800 dark:text-[#dde2f5]">طباعة إيصال استلام نقدية فوري (80mm)</span>
            </label>

            {/* Big Primary Action Button */}
            <button
              type="submit"
              className="w-full bg-[#00c2cb] hover:bg-[#45dee7] text-[#08101C] py-3.5 px-4 rounded-xl font-bold text-sm shadow-md shadow-[#00c2cb]/20 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
            >
              <span className="material-symbols-outlined text-xl">how_to_reg</span>
              <span>تسجيل الزيارة والدفع وإرسال للانتظار</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

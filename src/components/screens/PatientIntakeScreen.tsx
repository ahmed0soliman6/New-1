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
  // Form fields start CLEAN for new patients
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState<number | string>(30);
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [address, setAddress] = useState('');
  const [fileNumber, setFileNumber] = useState<number | string>(nextFileNumber);
  const [visitType, setVisitType] = useState<'كشف جديد' | 'استشارة / متابعة'>('كشف جديد');
  const [tariff, setTariff] = useState(300);
  const [complaint, setComplaint] = useState('');
  const [chronicSelected, setChronicSelected] = useState<string[]>([]);
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
    const alreadyPreset = presetChronicConditions.some((c) => (c?.name || '').toLowerCase() === trimmed.toLowerCase());
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
    if (!p) return;
    setName(p.name || '');
    setPhone(p.phone || '');
    setAge(p.age || 30);
    setGender(p.gender || 'male');
    setAddress(p.governorate || '');
    setFileNumber(p.fileNumber || 1);
    setChronicSelected(p.chronicConditions || []);
    setToastMessage(`تم استرجاع ملف المريض: ${p.name || ''} (ملف #${p.fileNumber || 1})`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const resetFormFields = () => {
    setName('');
    setPhone('');
    setAge(30);
    setComplaint('');
    setChronicSelected([]);
    setNotes('');
    setFileNumber((prev) => (typeof prev === 'number' ? prev + 1 : Number(prev) + 1));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('يرجى إدخال اسم المريض ثلاثياً أو رباعياً');
      return;
    }

    const ticketNumber = `#${Math.floor(Math.random() * 20) + 20}`;
    const newQueueItem: QueueItem = {
      id: `q-${Date.now()}`,
      ticketNumber,
      fileNumber: fileNumber || 1,
      patientName: name.trim(),
      medicalCode: `EG-${Math.floor(Math.random() * 90000) + 10000}`,
      phone: phone.trim(),
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

    // Reset form so old name doesn't repeat for next registration
    resetFormFields();
  };

  const changeDue = tendered - tariff;

  return (
    <div className="flex flex-col w-full pb-16 space-y-6 text-slate-800 dark:text-[#dde2f5] min-w-0 max-w-full overflow-x-hidden">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-[#18233C] border border-[#00c2cb] text-slate-900 dark:text-[#45dee7] px-6 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in">
          <span className="material-symbols-outlined text-2xl text-[#00c2cb]">check_circle</span>
          <span className="text-sm font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#00c2cb]/15 text-[#008f97] dark:text-[#00c2cb] border border-[#00c2cb]/30 flex items-center justify-center font-bold text-xl shadow-xs">
              <span className="material-symbols-outlined text-2xl">person_add</span>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-[#dde2f5]">
                تسجيل زيارة وتذكرة حضور جديدة
              </h1>
              <p className="text-xs text-slate-500 dark:text-[#859394]">
                إنشاء تذكرة انتظار وحجز للعيادات الخارجية مع توليد رقم الملف الطبي والحسابات المالية
              </p>
            </div>
          </div>

          {onNavigate && (
            <button
              onClick={() => onNavigate('waiting-queue')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-[#18233C] hover:bg-slate-200 dark:hover:bg-[#242a38] text-slate-700 dark:text-[#dde2f5] font-bold text-xs transition-all cursor-pointer border border-slate-200 dark:border-white/5"
            >
              <span className="material-symbols-outlined text-base text-[#008f97] dark:text-[#00c2cb]">format_list_bulleted</span>
              <span>عرض مرضى الانتظار</span>
            </button>
          )}
        </div>

        {/* Mode Selector Tabs (New vs Existing Patient) */}
        <div className="flex items-center gap-2 bg-white dark:bg-[#111A2E] p-1.5 rounded-2xl border border-slate-200 dark:border-white/5 w-fit shadow-2xs">
          <button
            type="button"
            onClick={() => {
              setMode('new');
              resetFormFields();
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              mode === 'new'
                ? 'bg-[#00c2cb] text-slate-950 shadow-xs'
                : 'text-slate-600 dark:text-[#859394] hover:bg-slate-100 dark:hover:bg-white/5'
            }`}
          >
            <span className="material-symbols-outlined text-base">person_add_alt_1</span>
            <span>مريض جديد (تسجيل لاول مرة)</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('existing')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              mode === 'existing'
                ? 'bg-[#00c2cb] text-slate-950 shadow-xs'
                : 'text-slate-600 dark:text-[#859394] hover:bg-slate-100 dark:hover:bg-white/5'
            }`}
          >
            <span className="material-symbols-outlined text-base">person_search</span>
            <span>مريض مسجل سابقاً (استرجاع ملف)</span>
          </button>
        </div>
      </div>

      {/* Main Intake Form */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left/Main Column: Patient Data (8 Cols) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Section 1: Patient Selection / Search (If Existing Mode) */}
          {mode === 'existing' && (
            <div className="bg-white dark:bg-[#111A2E] p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-white/5 space-y-3">
              <label className="text-xs font-bold text-slate-800 dark:text-[#dde2f5] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#008f97] dark:text-[#00c2cb] text-lg">search</span>
                <span>اختر المريض المسجل من السجلات السابقة:</span>
              </label>
              <select
                onChange={(e) => {
                  const found = patients.find((p) => p.id === e.target.value);
                  if (found) handleSelectExisting(found);
                }}
                className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-[#00c2cb] cursor-pointer"
              >
                <option value="">-- اضغط لاختيار مريض مسجل من قاعدة البيانات --</option>
                {patients.filter((p) => Boolean(p && p.id)).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name || 'مريض'} - {p.phone || ''} - (ملف #{p.fileNumber || 1})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Section 2: Demographic Information Card */}
          <div className="bg-white dark:bg-[#111A2E] p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-white/5 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#008f97] dark:text-[#00c2cb] text-xl">badge</span>
                <span className="text-sm font-bold text-slate-900 dark:text-[#dde2f5]">1. البيانات الشخصية والتعريفية</span>
              </div>
              <span className="text-xs text-slate-500 dark:text-[#859394]">الملف الطبي الإكلينيكي</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Name */}
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-slate-800 dark:text-[#dde2f5]">
                  اسم المريض <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="أدخل اسم المريض ثلاثياً أو رباعياً..."
                  className="bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] placeholder:text-slate-400 dark:placeholder:text-[#859394] text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-[#00c2cb]"
                />
              </div>

              {/* Phone */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-800 dark:text-[#dde2f5]">رقم الهاتف / الواتساب</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01xxxxxxxxx"
                  className="bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] placeholder:text-slate-400 dark:placeholder:text-[#859394] text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 font-mono focus:outline-none focus:ring-1 focus:ring-[#00c2cb]"
                />
              </div>

              {/* Age */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-800 dark:text-[#dde2f5]">السن (بالسنوات)</label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 font-mono focus:outline-none focus:ring-1 focus:ring-[#00c2cb]"
                />
              </div>

              {/* Gender */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-800 dark:text-[#dde2f5]">النوع / الجنس</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setGender('male')}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      gender === 'male'
                        ? 'bg-teal-50 dark:bg-[#00c2cb]/20 text-[#008f97] dark:text-[#45dee7] border-[#00c2cb]'
                        : 'bg-slate-50 dark:bg-[#080e1b] text-slate-600 dark:text-[#859394] border-slate-200 dark:border-white/5'
                    }`}
                  >
                    ذكر
                  </button>
                  <button
                    type="button"
                    onClick={() => setGender('female')}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      gender === 'female'
                        ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-[#d0bcff] border-purple-500'
                        : 'bg-slate-50 dark:bg-[#080e1b] text-slate-600 dark:text-[#859394] border-slate-200 dark:border-white/5'
                    }`}
                  >
                    أنثى
                  </button>
                </div>
              </div>

              {/* File Number */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-800 dark:text-[#dde2f5]">رقم الملف الطبي</label>
                <input
                  type="number"
                  value={fileNumber}
                  onChange={(e) => setFileNumber(e.target.value)}
                  className="bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 font-mono focus:outline-none focus:ring-1 focus:ring-[#00c2cb]"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Preliminary Symptoms & Chief Complaint Card */}
          <div className="bg-white dark:bg-[#111A2E] p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-white/5 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3 gap-1">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#008f97] dark:text-[#00c2cb] text-xl">pulse_alert</span>
                <span className="text-sm font-bold text-slate-900 dark:text-[#dde2f5]">2. الأعراض والشكوى الرئيسية للمريض</span>
              </div>
              <span className="text-xs text-slate-500 dark:text-[#859394]">لإرشاد الطبيب قبل النداء</span>
            </div>

            {/* Dropdown for Preconfigured Chief Complaints / Symptoms */}
            <div className="flex flex-col gap-1.5 bg-teal-50/60 dark:bg-[#18233C]/60 p-3 rounded-xl border border-[#00c2cb]/20">
              <label className="text-xs font-bold text-[#008f97] dark:text-[#45dee7] flex items-center justify-between">
                <span>اختر من قائمة الأعراض والشكاوى المعدة مسبقاً في الإعدادات:</span>
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
                {(symptomsCatalog || []).filter((s) => Boolean(s && s.name)).map((s) => (
                  <option key={s.id || s.name} value={s.name}>
                    {s.name} ({s.category || 'عرض'})
                  </option>
                ))}
              </select>
            </div>

            {/* Chief Complaint Textarea */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-800 dark:text-[#dde2f5]">
                الشكوى التفصيلية بلسان المريض
              </label>
              <textarea
                rows={3}
                value={complaint}
                onChange={(e) => setComplaint(e.target.value)}
                placeholder="اكتب تفاصيل الأعراض أو الشكوى التي يذكرها المريض..."
                className="bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] placeholder:text-slate-400 dark:placeholder:text-[#859394] text-xs p-3 rounded-xl border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-[#00c2cb]"
              />
            </div>
          </div>

          {/* Section 4: Chronic Diseases Card */}
          <div className="bg-white dark:bg-[#111A2E] p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-white/5 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3 gap-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-rose-500 text-xl">medical_services</span>
                <span className="text-sm font-bold text-slate-900 dark:text-[#dde2f5]">3. الأمراض المزمنة</span>
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
                {(presetChronicConditions || []).filter((c) => Boolean(c && c.name)).map((c) => (
                  <option key={c.id || c.name} value={c.name}>
                    {c.name} ({c.category || 'مرض'})
                  </option>
                ))}
              </select>
            </div>

            {/* Selected Chronic Chips */}
            {chronicSelected.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {chronicSelected.map((item) => (
                  <span
                    key={item}
                    className="px-3 py-1 rounded-xl bg-rose-100 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-1.5"
                  >
                    <span>{item}</span>
                    <button
                      type="button"
                      onClick={() => toggleChronic(item)}
                      className="hover:text-red-900 dark:hover:text-white cursor-pointer font-bold"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Billing & Actions (4 Cols) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-white dark:bg-[#111A2E] p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-white/5 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#008f97] dark:text-[#00c2cb] text-xl">payments</span>
                <span className="text-sm font-bold text-slate-900 dark:text-[#dde2f5]">تفاصيل الحجز والسداد</span>
              </div>
            </div>

            {/* Visit Type */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-800 dark:text-[#dde2f5]">نوع الزيارة / الخدمة</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setVisitType('كشف جديد');
                    setTariff(300);
                  }}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    visitType === 'كشف جديد'
                      ? 'bg-[#00c2cb] text-slate-950 border-[#00c2cb]'
                      : 'bg-slate-50 dark:bg-[#080e1b] text-slate-600 dark:text-[#859394] border-slate-200 dark:border-white/5'
                  }`}
                >
                  كشف جديد (300)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setVisitType('استشارة / متابعة');
                    setTariff(150);
                  }}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    visitType === 'استشارة / متابعة'
                      ? 'bg-[#00c2cb] text-slate-950 border-[#00c2cb]'
                      : 'bg-slate-50 dark:bg-[#080e1b] text-slate-600 dark:text-[#859394] border-slate-200 dark:border-white/5'
                  }`}
                >
                  استشارة (150)
                </button>
              </div>
            </div>

            {/* Payment Method */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-800 dark:text-[#dde2f5]">طريقة الدفع</label>
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value as any)}
                className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-[#00c2cb] cursor-pointer"
              >
                <option value="نقدي">نقدي (كاش بالدرج)</option>
                <option value="فيزا / كارت">فيزا / كارت POS</option>
                <option value="إنستاباي">إنستاباي InstaPay</option>
              </select>
            </div>

            {/* Total Price Display */}
            <div className="bg-teal-50 dark:bg-[#18233C] p-4 rounded-xl border border-[#00c2cb]/30 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-[#dde2f5]">إجمالي المبلغ المستحق:</span>
              <span className="text-2xl font-black text-[#008f97] dark:text-[#45dee7] font-mono">{tariff} ج.م</span>
            </div>

            {/* Submit Action Button */}
            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-[#00c2cb] hover:bg-[#45dee7] text-slate-950 font-extrabold text-sm shadow-md shadow-[#00c2cb]/20 transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2 mt-2"
            >
              <span className="material-symbols-outlined text-xl">confirmation_number</span>
              <span>تسجيل الزيارة وطباعة التذكرة</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

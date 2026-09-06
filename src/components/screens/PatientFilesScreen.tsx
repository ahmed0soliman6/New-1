import React, { useState } from 'react';
import { PatientListItem, ScreenType } from '../../types';
import { usePermissions } from '../../context/AuthContext';

interface PatientListItemsScreenProps {
  patients: PatientListItem[];
  onNavigate: (screen: ScreenType) => void;
  onSelectPatientForExam: (patient: PatientListItem) => void;
}

export const PatientListItemsScreen: React.FC<PatientListItemsScreenProps> = ({
  patients,
  onNavigate,
  onSelectPatientForExam,
}) => {
  const { canAccess } = usePermissions();
  const [selectedPatientId, setSelectedPatientId] = useState<string>(patients[0]?.id || 'p-1');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'visits' | 'labs' | 'chronic' | 'billing'>('visits');

  const selectedPatient = patients.find((p) => p.id === selectedPatientId) || patients[0];

  const filteredPatients = patients.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.phone.includes(q) || p.medicalCode.toLowerCase().includes(q);
  });

  return (
    <div className="flex flex-col w-full pb-16 space-y-6 text-[#dde2f5]">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#859394] mb-1">
            <span>الرئيسية</span>
            <span>&gt;</span>
            <span className="text-[#00c2cb]">السجلات والملفات الطبية الإلكترونية (EMR)</span>
          </div>
          <h1 className="text-2xl font-bold text-[#dde2f5] flex items-center gap-3">
            <span>ملفات المرضى والأرشيف الطبي</span>
            <span className="bg-[#18233C] text-[#00c2cb] px-2.5 py-0.5 rounded-full text-xs font-mono font-bold">
              {patients.length} ملف نشط
            </span>
          </h1>
        </div>

        <button
          onClick={() => onNavigate('new-visit')}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00c2cb] hover:bg-[#45dee7] text-[#08101C] text-xs font-bold shadow-md shadow-[#00c2cb]/20 transition-all cursor-pointer self-start sm:self-auto"
        >
          <span className="material-symbols-outlined text-base">person_add</span>
          <span>+ فتح ملف مريض جديد</span>
        </button>
      </div>

      {/* Main Grid: Patients List (4 Cols) + Dossier Detail (8 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Patient Selection Column (4 Cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="relative">
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[#859394] text-base">
              search
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث بالاسم، رقم الهاتف، أو كود الملف..."
              className="w-full bg-[#111A2E] text-[#dde2f5] placeholder:text-[#859394] pr-9 pl-4 py-2.5 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#00c2cb] border border-white/5"
            />
          </div>

          <div className="space-y-2 max-h-[650px] overflow-y-auto pr-1">
            {filteredPatients.map((p) => {
              const isSelected = p.id === selectedPatient?.id;
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedPatientId(p.id)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-[#18233C] border-[#00c2cb]/60 shadow-[0_0_20px_rgba(0,194,203,0.15)]'
                      : 'bg-[#111A2E] border-white/5 hover:bg-[#18233C]/50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                        isSelected
                          ? 'bg-[#00c2cb] text-[#08101C]'
                          : 'bg-[#080e1b] text-[#00c2cb] border border-white/5'
                      }`}
                    >
                      {p.gender === 'male' ? 'ذكر' : 'أنثى'}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-[#dde2f5] truncate">{p.name}</div>
                      <div className="text-[11px] text-[#859394] font-mono mt-0.5">
                        <span dir="ltr">{p.phone}</span> • #{p.medicalCode}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] text-[#45dee7] font-mono shrink-0 font-bold">
                    {p.age} سنة
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Patient Dossier (8 Cols) */}
        {selectedPatient && (
          <div className="lg:col-span-8 flex flex-col gap-5">
            {/* Patient Demographic Banner */}
            <div className="bg-[#111A2E] p-6 rounded-2xl border border-white/5 shadow-xl flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-[#00c2cb]/20 text-[#00c2cb] border border-[#00c2cb]/40 flex items-center justify-center text-2xl font-bold">
                    <span className="material-symbols-outlined text-3xl">account_circle</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-[#dde2f5]">{selectedPatient.name}</h2>
                      <span className="bg-[#00c2cb]/15 text-[#45dee7] text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border border-[#00c2cb]/20">
                        #{selectedPatient.medicalCode}
                      </span>
                    </div>
                    <p className="text-xs text-[#bbc9ca] mt-1">
                      {selectedPatient.age} سنة • {selectedPatient.gender === 'male' ? 'ذكر' : 'أنثى'} • فصيلة الدم:{' '}
                      <strong className="text-[#00c2cb] font-mono">{selectedPatient.bloodGroup}</strong> • {selectedPatient.governorate}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {canAccess('clinical-exam') && (
                    <button
                      onClick={() => {
                        onSelectPatientForExam(selectedPatient);
                        onNavigate('clinical-exam');
                      }}
                      className="px-3.5 py-2 rounded-xl bg-[#00c2cb] hover:bg-[#45dee7] text-[#08101C] text-xs font-bold shadow-md shadow-[#00c2cb]/20 transition-all cursor-pointer"
                    >
                      بدء كشف إكلينيكي
                    </button>
                  )}
                  {canAccess('prescription-pad') && (
                    <button
                      onClick={() => onNavigate('prescription-pad')}
                      className="px-3 py-2 rounded-xl bg-[#571bc1]/60 hover:bg-[#571bc1] text-[#e9ddff] text-xs font-bold transition-all cursor-pointer"
                    >
                      إصدار روشتة
                    </button>
                  )}
                </div>
              </div>

              {/* Patient Key Indicators */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-[#080e1b] rounded-xl border border-white/5">
                  <span className="text-[#859394] block text-[11px]">تاريخ التسجيل بالعيادة:</span>
                  <strong className="text-[#dde2f5] font-mono">{selectedPatient.registrationDate}</strong>
                </div>
                <div className="p-3 bg-[#080e1b] rounded-xl border border-white/5">
                  <span className="text-[#859394] block text-[11px]">عدد الزيارات المثبتة:</span>
                  <strong className="text-[#45dee7] font-mono">{selectedPatient.visitsCount} زيارات</strong>
                </div>
                <div className="p-3 bg-[#080e1b] rounded-xl border border-white/5">
                  <span className="text-[#859394] block text-[11px]">إجمالي المدفوعات:</span>
                  <strong className="text-[#10B981] font-mono">{selectedPatient.totalPaid} ج.م</strong>
                </div>
                <div className="p-3 bg-[#080e1b] rounded-xl border border-white/5">
                  <span className="text-[#859394] block text-[11px]">آخر تشخيص إكلينيكي:</span>
                  <strong className="text-[#d0bcff] truncate block">{selectedPatient.lastDiagnosis}</strong>
                </div>
              </div>

              {/* Allergy Banner if any */}
              {selectedPatient.allergies.length > 0 && (
                <div className="bg-[#ef4444]/15 border border-[#ef4444]/30 text-[#ef4444] p-3 rounded-xl flex items-center gap-2 text-xs font-bold">
                  <span className="material-symbols-outlined text-base">warning</span>
                  <span>تنبيه حساسية دوائية شديدة: {selectedPatient.allergies.join('، ')}</span>
                </div>
              )}
            </div>

            {/* Dossier Tabs */}
            <div className="flex items-center gap-2 border-b border-white/5 pb-1">
              {[
                { id: 'visits', label: 'الزيارات والكشوفات السابقة', icon: 'history' },
                { id: 'labs', label: 'التحاليل المعملية والأشعة', icon: 'science' },
                { id: 'chronic', label: 'الأمراض المزمنة والتاريخ الطبي', icon: 'healing' },
                { id: 'billing', label: 'سجل الفواتير والدفع', icon: 'receipt_long' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-[#00c2cb] text-[#08101C] shadow-md'
                      : 'bg-[#111A2E] text-[#bbc9ca] hover:bg-[#18233C]'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Tab Contents */}
            <div className="bg-[#111A2E] p-6 rounded-2xl border border-white/5 shadow-md">
              {activeTab === 'visits' && (
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-[#dde2f5] mb-2">تاريخ الزيارات بالعيادة</h3>
                  <div className="border-r-2 border-[#00c2cb]/40 pr-4 space-y-4">
                    <div className="relative">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#00c2cb] absolute -right-[21px] top-1.5"></span>
                      <div className="text-xs font-mono text-[#00c2cb]">15 أكتوبر 2024 (اليوم)</div>
                      <div className="font-bold text-sm text-[#dde2f5] mt-0.5">
                        كشف جديد - ارتجاع المريء والتهاب المعدة (GERD)
                      </div>
                      <p className="text-xs text-[#bbc9ca] mt-1">
                        الطبيب: د. حازم القاضي • الرسوم: 300 ج.م مسددة نقداً • وصفت له روشتة Nexium & Duspatalin
                      </p>
                    </div>

                    <div className="relative">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-600 absolute -right-[21px] top-1.5"></span>
                      <div className="text-xs font-mono text-[#859394]">02 أغسطس 2024</div>
                      <div className="font-bold text-sm text-[#dde2f5] mt-0.5">
                        استشارة متابعة سكر وضغط دورية
                      </div>
                      <p className="text-xs text-[#bbc9ca] mt-1">
                        سكر عشوائي: 135 mg/dl • الضغط 125/80 mmHg • تم تجديد العلاج الشهري
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'labs' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-[#dde2f5]">تقارير التحاليل والأشعة المرفقة</h3>
                    <span className="text-[11px] text-[#00c2cb] font-semibold cursor-pointer hover:underline">
                      + رفع تقرير معملي
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#080e1b] border border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-2xl text-[#00c2cb]">biotech</span>
                      <div>
                        <div className="text-xs font-bold text-[#dde2f5]">تحليل إنزيمات قلب عاجلة (Troponin I & CK-MB)</div>
                        <div className="text-[10px] text-[#859394]">معمل البرج - المهندسين • 15 أكتوبر 2024</div>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded bg-[#10B981]/20 text-[#10B981] text-xs font-bold">
                      طبيعي Negative
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#080e1b] border border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-2xl text-[#d0bcff]">monitor_heart</span>
                      <div>
                        <div className="text-xs font-bold text-[#dde2f5]">رسم قلب كهربائي 12-Lead ECG</div>
                        <div className="text-[10px] text-[#859394]">عيادة سولي • 15 أكتوبر 2024</div>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded bg-[#10B981]/20 text-[#10B981] text-xs font-bold">
                      Normal Sinus Rhythm
                    </span>
                  </div>
                </div>
              )}

              {activeTab === 'chronic' && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-[#dde2f5]">الأمراض المزمنة المثبتة</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedPatient.chronicConditions.map((cond) => (
                      <div key={cond} className="p-3 bg-[#080e1b] rounded-xl border border-white/5 flex items-center gap-3">
                        <span className="material-symbols-outlined text-xl text-[#00c2cb]">check_box</span>
                        <span className="text-xs font-bold text-[#dde2f5]">{cond}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'billing' && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-[#dde2f5]">سجل المعاملات والمدفوعات المالية</h3>
                  <div className="space-y-2">
                    <div className="p-3 bg-[#080e1b] rounded-xl border border-white/5 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-[#dde2f5]">كشف باطنة وقائي (العيادة)</span>
                        <span className="text-[11px] text-[#859394] block font-mono">15/10/2024 • إيصال #REC-8192</span>
                      </div>
                      <div className="text-left">
                        <span className="font-mono font-bold text-[#45dee7]">300 ج.م</span>
                        <span className="text-[10px] text-[#10B981] block">مسدد نقداً ✓</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

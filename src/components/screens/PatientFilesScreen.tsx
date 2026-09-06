import React, { useState } from 'react';
import { PatientListItem, ScreenType } from '../../types';
import { usePermissions } from '../../context/AuthContext';
import type {
  FollowUp,
  Invoice,
  LabOrder,
  Prescription,
  RadiologyOrder,
  Visit,
} from '../../types/database';

interface PatientListItemsScreenProps {
  patients: PatientListItem[];
  onNavigate: (screen: ScreenType) => void;
  onSelectPatientForExam: (patient: PatientListItem) => void;
  visits?: Visit[];
  invoices?: Invoice[];
  prescriptions?: Prescription[];
  labOrders?: LabOrder[];
  radiologyOrders?: RadiologyOrder[];
  followUps?: FollowUp[];
}

export const PatientListItemsScreen: React.FC<PatientListItemsScreenProps> = ({
  patients,
  onNavigate,
  onSelectPatientForExam,
  visits = [],
  invoices = [],
  prescriptions = [],
  labOrders = [],
  radiologyOrders = [],
  followUps = [],
}) => {
  const { canAccess } = usePermissions();
  const [selectedPatientId, setSelectedPatientId] = useState<string>(patients[0]?.id || '');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'visits' | 'labs' | 'chronic' | 'billing' | 'prescriptions'>('visits');

  const selectedPatient = patients.find((p) => p.id === selectedPatientId) || patients[0];

  const filteredPatients = patients.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.phone.includes(q) ||
      p.medicalCode.toLowerCase().includes(q)
    );
  });

  const patientVisits = selectedPatient
    ? visits
        .filter((v) => v.patientId === selectedPatient.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    : [];

  const patientInvoices = selectedPatient
    ? invoices
        .filter((i) => i.patientId === selectedPatient.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    : [];

  const patientPrescriptions = selectedPatient
    ? prescriptions
        .filter((pr) => pr.patientId === selectedPatient.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    : [];

  const patientLabOrders = selectedPatient
    ? labOrders
        .filter((l) => l.patientId === selectedPatient.id)
        .sort((a, b) => new Date(b.orderedAt).getTime() - new Date(a.orderedAt).getTime())
    : [];

  const patientRadiologyOrders = selectedPatient
    ? radiologyOrders
        .filter((r) => r.patientId === selectedPatient.id)
        .sort((a, b) => new Date(b.orderedAt).getTime() - new Date(a.orderedAt).getTime())
    : [];

  return (
    <div className="flex flex-col w-full pb-16 space-y-6 text-slate-800 dark:text-[#dde2f5]">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-[#859394] mb-1">
            <span>الرئيسية</span>
            <span>&gt;</span>
            <span className="text-[#008f97] dark:text-[#00c2cb]">السجلات والملفات الطبية الإلكترونية (EMR)</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-[#dde2f5] flex items-center gap-3">
            <span>ملفات المرضى والأرشيف الطبي</span>
            <span className="bg-teal-50 dark:bg-[#18233C] text-[#008f97] dark:text-[#00c2cb] px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border border-teal-200 dark:border-transparent">
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
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#859394] text-base">
              search
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث بالاسم، رقم الهاتف، أو كود الملف..."
              className="w-full bg-white dark:bg-[#111A2E] text-slate-900 dark:text-[#dde2f5] placeholder:text-slate-400 dark:placeholder:text-[#859394] pr-9 pl-4 py-2.5 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#00c2cb] border border-slate-200 dark:border-white/5 shadow-xs"
            />
          </div>

          <div className="space-y-2 max-h-[650px] overflow-y-auto pr-1">
            {filteredPatients.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-[#111A2E] rounded-2xl border border-slate-200 dark:border-white/5 text-xs text-slate-400">
                لا يوجد مرضى مطابقين لنتائج البحث
              </div>
            ) : (
              filteredPatients.map((p) => {
                const isSelected = p.id === selectedPatient?.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPatientId(p.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-teal-50 dark:bg-[#18233C] border-teal-400 dark:border-[#00c2cb]/60 shadow-xs'
                        : 'bg-white dark:bg-[#111A2E] border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-[#18233C]/50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                          isSelected
                            ? 'bg-[#00c2cb] text-[#08101C]'
                            : 'bg-slate-100 dark:bg-[#080e1b] text-[#008f97] dark:text-[#00c2cb] border border-slate-200 dark:border-white/5'
                        }`}
                      >
                        {p.gender === 'male' ? 'ذكر' : 'أنثى'}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-slate-900 dark:text-[#dde2f5] truncate">{p.name}</div>
                        <div className="text-[11px] text-slate-500 dark:text-[#859394] font-mono mt-0.5">
                          <span dir="ltr">{p.phone}</span> • #{p.medicalCode}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] text-[#008f97] dark:text-[#45dee7] font-mono shrink-0 font-bold">
                      {p.age} سنة
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Selected Patient Dossier (8 Cols) */}
        {selectedPatient ? (
          <div className="lg:col-span-8 flex flex-col gap-5">
            {/* Patient Demographic Banner */}
            <div className="bg-white dark:bg-[#111A2E] p-6 rounded-2xl border border-slate-200 dark:border-white/5 shadow-xs flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-teal-50 dark:bg-[#00c2cb]/20 text-[#008f97] dark:text-[#00c2cb] border border-teal-200 dark:border-[#00c2cb]/40 flex items-center justify-center text-2xl font-bold shrink-0">
                    <span className="material-symbols-outlined text-3xl">account_circle</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xl font-bold text-slate-900 dark:text-[#dde2f5]">{selectedPatient.name}</h2>
                      <span className="bg-teal-50 dark:bg-[#00c2cb]/15 text-[#008f97] dark:text-[#45dee7] text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border border-teal-200 dark:border-[#00c2cb]/20">
                        #{selectedPatient.medicalCode}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-[#bbc9ca] mt-1">
                      {selectedPatient.age} سنة • {selectedPatient.gender === 'male' ? 'ذكر' : 'أنثى'} • فصيلة الدم:{' '}
                      <strong className="text-[#008f97] dark:text-[#00c2cb] font-mono">{selectedPatient.bloodGroup || 'O+'}</strong> • {selectedPatient.governorate || 'القاهرة'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {canAccess('clinical-exam') && (
                    <button
                      onClick={() => {
                        onSelectPatientForExam(selectedPatient);
                        onNavigate('clinical-exam');
                      }}
                      className="px-3.5 py-2 rounded-xl bg-[#00c2cb] hover:bg-[#45dee7] text-[#08101C] text-xs font-bold shadow-sm shadow-[#00c2cb]/20 transition-all cursor-pointer"
                    >
                      بدء كشف إكلينيكي
                    </button>
                  )}
                  {canAccess('prescription-pad') && (
                    <button
                      onClick={() => onNavigate('prescription-pad')}
                      className="px-3 py-2 rounded-xl bg-purple-50 dark:bg-[#571bc1]/60 hover:bg-purple-100 dark:hover:bg-[#571bc1] text-purple-700 dark:text-[#e9ddff] text-xs font-bold transition-all cursor-pointer border border-purple-200 dark:border-transparent"
                    >
                      إصدار روشتة
                    </button>
                  )}
                </div>
              </div>

              {/* Patient Key Indicators */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-slate-50 dark:bg-[#080e1b] rounded-xl border border-slate-200 dark:border-white/5">
                  <span className="text-slate-500 dark:text-[#859394] block text-[11px]">تاريخ التسجيل بالعيادة:</span>
                  <strong className="text-slate-900 dark:text-[#dde2f5] font-mono">{selectedPatient.registrationDate || 'اليوم'}</strong>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-[#080e1b] rounded-xl border border-slate-200 dark:border-white/5">
                  <span className="text-slate-500 dark:text-[#859394] block text-[11px]">عدد الزيارات المثبتة:</span>
                  <strong className="text-[#008f97] dark:text-[#45dee7] font-mono">{patientVisits.length} زيارات</strong>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-[#080e1b] rounded-xl border border-slate-200 dark:border-white/5">
                  <span className="text-slate-500 dark:text-[#859394] block text-[11px]">إجمالي المدفوعات:</span>
                  <strong className="text-emerald-600 dark:text-[#10B981] font-mono">{selectedPatient.totalPaid || 0} ج.م</strong>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-[#080e1b] rounded-xl border border-slate-200 dark:border-white/5">
                  <span className="text-slate-500 dark:text-[#859394] block text-[11px]">آخر تشخيص إكلينيكي:</span>
                  <strong className="text-purple-700 dark:text-[#d0bcff] truncate block">{selectedPatient.lastDiagnosis || 'كشف عيادة'}</strong>
                </div>
              </div>

              {/* Allergy Banner if any */}
              {selectedPatient.allergies && selectedPatient.allergies.length > 0 && (
                <div className="bg-red-50 dark:bg-[#ef4444]/15 border border-red-200 dark:border-[#ef4444]/30 text-red-700 dark:text-[#ef4444] p-3 rounded-xl flex items-center gap-2 text-xs font-bold">
                  <span className="material-symbols-outlined text-base">warning</span>
                  <span>تنبيه حساسية دوائية: {selectedPatient.allergies.join('، ')}</span>
                </div>
              )}
            </div>

            {/* Dossier Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/5 pb-1 overflow-x-auto">
              {[
                { id: 'visits', label: `الزيارات والكشوفات (${patientVisits.length})`, icon: 'history' },
                { id: 'prescriptions', label: `الروشتات (${patientPrescriptions.length})`, icon: 'prescriptions' },
                { id: 'labs', label: `التحاليل والأشعة (${patientLabOrders.length + patientRadiologyOrders.length})`, icon: 'science' },
                { id: 'chronic', label: 'الأمراض المزمنة والتاريخ', icon: 'healing' },
                { id: 'billing', label: `سجل الفواتير (${patientInvoices.length})`, icon: 'receipt_long' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-[#00c2cb] text-[#08101C] shadow-xs'
                      : 'bg-white dark:bg-[#111A2E] text-slate-600 dark:text-[#bbc9ca] hover:bg-slate-50 dark:hover:bg-[#18233C] border border-slate-200 dark:border-white/5'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Tab Contents */}
            <div className="bg-white dark:bg-[#111A2E] p-6 rounded-2xl border border-slate-200 dark:border-white/5 shadow-xs">
              {activeTab === 'visits' && (
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-[#dde2f5] mb-2">تاريخ الزيارات والكشوفات بالعيادة</h3>
                  {patientVisits.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 dark:bg-[#080e1b] rounded-xl border border-slate-200 dark:border-white/5">
                      لا توجد زيارات مسجلة لهذا المريض حتى الآن
                    </div>
                  ) : (
                    <div className="border-r-2 border-teal-300 dark:border-[#00c2cb]/40 pr-4 space-y-4">
                      {patientVisits.map((v) => (
                        <div key={v.visitId} className="relative">
                          <span className={`w-2.5 h-2.5 rounded-full absolute -right-[21px] top-1.5 ${v.status === 'COMPLETED' ? 'bg-[#00c2cb]' : 'bg-amber-400'}`}></span>
                          <div className="text-xs font-mono text-[#008f97] dark:text-[#00c2cb] font-bold">
                            {new Date(v.createdAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <div className="font-bold text-sm text-slate-900 dark:text-[#dde2f5] mt-0.5">
                            {v.visitType === 'NEW' ? 'كشف جديد' : 'استشارة / متابعة'} — {v.clinicalData?.chiefComplaint || v.receptionistData?.symptoms || 'كشف عيادة'}
                          </div>
                          {v.clinicalData?.diagnosis && v.clinicalData.diagnosis.length > 0 && (
                            <p className="text-xs text-slate-600 dark:text-[#bbc9ca] mt-1">
                              التشخيص: {v.clinicalData.diagnosis.join('، ')}
                            </p>
                          )}
                          {v.clinicalData?.treatment && (
                            <p className="text-xs text-slate-500 dark:text-[#859394] mt-0.5">
                              العلاج الموصوف: {v.clinicalData.treatment}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'prescriptions' && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-[#dde2f5]">الروشتات الطبية المعتمدة للمريض</h3>
                  {patientPrescriptions.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 dark:bg-[#080e1b] rounded-xl border border-slate-200 dark:border-white/5">
                      لا توجد روشتات مسجلة لهذا المريض
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {patientPrescriptions.map((pr) => (
                        <div key={pr.prescriptionId} className="p-4 rounded-xl bg-slate-50 dark:bg-[#080e1b] border border-slate-200 dark:border-white/5 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-[#008f97] dark:text-[#00c2cb]">
                              روشتة بتاريخ {new Date(pr.createdAt).toLocaleDateString('ar-EG')}
                            </span>
                            <span className="text-slate-400 text-[11px] font-mono">{pr.items.length} أصناف</span>
                          </div>
                          <div className="space-y-1.5 pt-1">
                            {pr.items.map((it, idx) => (
                              <div key={idx} className="text-xs flex items-center justify-between bg-white dark:bg-[#111A2E] p-2.5 rounded-lg border border-slate-100 dark:border-white/5">
                                <span className="font-bold text-slate-900 dark:text-[#dde2f5]">{it.name} {it.strength}</span>
                                <span className="text-slate-500 dark:text-[#bbc9ca]">{it.dose} • {it.duration}</span>
                              </div>
                            ))}
                          </div>
                          {pr.notes && (
                            <p className="text-[11px] text-slate-500 italic mt-1">ملاحظات: {pr.notes}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'labs' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-[#dde2f5] mb-3">تقارير التحاليل المعملية</h3>
                    {patientLabOrders.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 dark:bg-[#080e1b] rounded-xl border border-slate-200 dark:border-white/5">
                        لا توجد تحاليل معملية مسجلة
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {patientLabOrders.map((l) => (
                          <div key={l.labOrderId} className="p-3 rounded-xl bg-slate-50 dark:bg-[#080e1b] border border-slate-200 dark:border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="material-symbols-outlined text-2xl text-[#008f97] dark:text-[#00c2cb]">biotech</span>
                              <div>
                                <div className="text-xs font-bold text-slate-900 dark:text-[#dde2f5]">{l.testName}</div>
                                <div className="text-[10px] text-slate-400 dark:text-[#859394]">
                                  {new Date(l.orderedAt).toLocaleDateString('ar-EG')} • {l.notes || 'طلب معملي'}
                                </div>
                              </div>
                            </div>
                            <span className="px-2.5 py-1 rounded bg-teal-50 dark:bg-[#00c2cb]/20 text-[#008f97] dark:text-[#45dee7] text-xs font-bold">
                              {l.status === 'RESULT' ? (l.result || 'تم الفحص') : 'مطلوب'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-[#dde2f5] mb-3">تقارير الأشعة والتصوير الطبي</h3>
                    {patientRadiologyOrders.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 dark:bg-[#080e1b] rounded-xl border border-slate-200 dark:border-white/5">
                        لا توجد فحوصات أشعة مسجلة
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {patientRadiologyOrders.map((r) => (
                          <div key={r.radiologyOrderId} className="p-3 rounded-xl bg-slate-50 dark:bg-[#080e1b] border border-slate-200 dark:border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="material-symbols-outlined text-2xl text-purple-600 dark:text-[#d0bcff]">monitor_heart</span>
                              <div>
                                <div className="text-xs font-bold text-slate-900 dark:text-[#dde2f5]">{r.radiologyName}</div>
                                <div className="text-[10px] text-slate-400 dark:text-[#859394]">
                                  {new Date(r.orderedAt).toLocaleDateString('ar-EG')} • {r.notes || 'طلب أشعة'}
                                </div>
                              </div>
                            </div>
                            <span className="px-2.5 py-1 rounded bg-purple-50 dark:bg-[#571bc1]/20 text-purple-700 dark:text-[#d0bcff] text-xs font-bold">
                              {r.status === 'REPORT' ? (r.result || 'تقرير جاهز') : 'مطلوب'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'chronic' && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-[#dde2f5]">الأمراض المزمنة المثبتة</h3>
                  {!selectedPatient.chronicConditions || selectedPatient.chronicConditions.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 dark:bg-[#080e1b] rounded-xl border border-slate-200 dark:border-white/5">
                      لا توجد أمراض مزمنة مسجلة
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {selectedPatient.chronicConditions.map((cond) => (
                        <div key={cond} className="p-3 bg-slate-50 dark:bg-[#080e1b] rounded-xl border border-slate-200 dark:border-white/5 flex items-center gap-3">
                          <span className="material-symbols-outlined text-xl text-[#008f97] dark:text-[#00c2cb]">check_box</span>
                          <span className="text-xs font-bold text-slate-900 dark:text-[#dde2f5]">{cond}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'billing' && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-[#dde2f5]">سجل المعاملات والمدفوعات المالية</h3>
                  {patientInvoices.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 dark:bg-[#080e1b] rounded-xl border border-slate-200 dark:border-white/5">
                      لا توجد فواتير أو معاملات مالية مسجلة لهذا المريض
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {patientInvoices.map((inv) => (
                        <div key={inv.invoiceId} className="p-3 bg-slate-50 dark:bg-[#080e1b] rounded-xl border border-slate-200 dark:border-white/5 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-slate-900 dark:text-[#dde2f5]">فاتورة كشف وزيارة</span>
                            <span className="text-[11px] text-slate-400 dark:text-[#859394] block font-mono">
                              {new Date(inv.createdAt).toLocaleDateString('ar-EG')} • #{inv.invoiceId.slice(0, 8)}
                            </span>
                          </div>
                          <div className="text-left">
                            <span className="font-mono font-bold text-[#008f97] dark:text-[#45dee7]">{inv.total} ج.م</span>
                            <span className="text-[10px] text-emerald-600 dark:text-[#10B981] block">
                              {inv.status === 'PAID' ? 'مسدد بالكامل ✓' : 'غير مسدد'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="lg:col-span-8 p-12 text-center bg-white dark:bg-[#111A2E] rounded-2xl border border-slate-200 dark:border-white/5 text-slate-400 text-xs">
            قم باختيار مريض من القائمة لعرض ملفه الطبي
          </div>
        )}
      </div>
    </div>
  );
};

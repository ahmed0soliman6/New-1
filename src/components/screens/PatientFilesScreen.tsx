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
  onDeletePatient?: (patientId: string) => void;
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
  onDeletePatient,
  visits = [],
  invoices = [],
  prescriptions = [],
  labOrders = [],
  radiologyOrders = [],
  followUps = [],
}) => {
  const { canAccess } = usePermissions();
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'visits' | 'labs' | 'chronic' | 'billing' | 'prescriptions'>('visits');
  const [patientToDelete, setPatientToDelete] = useState<PatientListItem | null>(null);

  const filteredPatients = patients.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (p.name || '').toLowerCase().includes(q) ||
      (p.phone || '').includes(q) ||
      (p.medicalCode || '').toLowerCase().includes(q)
    );
  });

  const toggleExpandPatient = (patientId: string) => {
    if (selectedPatientId === patientId) {
      setSelectedPatientId(''); // Collapse if clicked again
    } else {
      setSelectedPatientId(patientId);
      setActiveTab('visits'); // Reset to visits tab for the newly opened patient
    }
  };

  return (
    <div className="flex flex-col w-full pb-16 space-y-6 text-slate-800 dark:text-[#dde2f5]" id="patient-files-screen">
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
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#00c2cb] hover:bg-[#45dee7] text-[#08101C] text-xs font-bold shadow-md shadow-[#00c2cb]/20 transition-all cursor-pointer self-start sm:self-auto"
          id="btn-add-new-patient"
        >
          <span className="material-symbols-outlined text-base">person_add</span>
          <span>+ فتح ملف مريض جديد</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <span className="material-symbols-outlined absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#859394] text-base">
          search
        </span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث بالاسم، رقم الهاتف، أو كود الملف..."
          className="w-full bg-white dark:bg-[#111A2E] text-slate-900 dark:text-[#dde2f5] placeholder:text-slate-400 dark:placeholder:text-[#859394] pr-10 pl-4 py-3 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#00c2cb] border border-slate-200 dark:border-white/5 shadow-xs transition-all"
          id="patient-search-input"
        />
      </div>

      {/* Main Patients List - Expandable Layout */}
      <div className="space-y-4">
        {filteredPatients.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-[#111A2E] rounded-2xl border border-slate-200 dark:border-white/5 text-xs text-slate-400">
            لا يوجد مرضى مطابقين لنتائج البحث
          </div>
        ) : (
          filteredPatients.map((p) => {
            const isSelected = p.id === selectedPatientId;

            // Fetch patient-specific data dynamically
            const pVisits = visits
              .filter((v) => v.patientId === p.id)
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

            const pInvoices = invoices
              .filter((i) => i.patientId === p.id)
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

            const pPrescriptions = prescriptions
              .filter((pr) => pr.patientId === p.id)
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

            const pLabOrders = labOrders
              .filter((l) => l.patientId === p.id)
              .sort((a, b) => new Date(b.orderedAt).getTime() - new Date(a.orderedAt).getTime());

            const pRadiologyOrders = radiologyOrders
              .filter((r) => r.patientId === p.id)
              .sort((a, b) => new Date(b.orderedAt).getTime() - new Date(a.orderedAt).getTime());

            return (
              <div
                key={p.id}
                className={`rounded-2xl border transition-all overflow-hidden ${
                  isSelected
                    ? 'bg-white dark:bg-[#111A2E] border-teal-500/60 dark:border-[#00c2cb]/60 shadow-md ring-1 ring-teal-500/10'
                    : 'bg-white dark:bg-[#111A2E] border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 shadow-xs'
                }`}
                id={`patient-card-${p.id}`}
              >
                {/* Clickable Header for Patient Card */}
                <div
                  onClick={() => toggleExpandPatient(p.id)}
                  className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none"
                >
                  {/* Basic Patient Info */}
                  <div className="flex items-center gap-4 min-w-0">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 transition-all ${
                        isSelected
                          ? 'bg-[#00c2cb] text-[#08101C]'
                          : 'bg-slate-100 dark:bg-[#080e1b] text-[#008f97] dark:text-[#00c2cb] border border-slate-200 dark:border-white/5'
                      }`}
                    >
                      {p.gender === 'male' ? 'ذكر' : 'أنثى'}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base font-bold text-slate-900 dark:text-[#dde2f5]">{p.name}</span>
                        <span className="bg-teal-50 dark:bg-[#00c2cb]/15 text-[#008f97] dark:text-[#45dee7] text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border border-teal-200/50 dark:border-transparent">
                          #{p.medicalCode}
                        </span>
                        {p.bloodType && p.bloodType !== 'غير محدد' && (
                          <span className="bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border border-red-100 dark:border-transparent">
                            {p.bloodType}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-[#859394] mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="font-mono">{p.phone}</span>
                        <span>•</span>
                        <span>{p.age} سنة</span>
                        {p.address && (
                          <>
                            <span>•</span>
                            <span className="truncate max-w-[200px]">{p.address}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions & Expanded Indicator */}
                  <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 dark:border-white/5">
                    <div className="flex items-center gap-2">
                      {canAccess('clinical-exam') && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectPatientForExam(p);
                            onNavigate('clinical-exam');
                          }}
                          className="px-3.5 py-2 rounded-xl bg-[#00c2cb] hover:bg-[#45dee7] text-[#08101C] text-xs font-bold shadow-xs transition-all cursor-pointer whitespace-nowrap"
                        >
                          بدء كشف إكلينيكي
                        </button>
                      )}
                      {canAccess('prescription-pad') && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectPatientForExam(p);
                            onNavigate('prescription-pad');
                          }}
                          className="px-3 py-2 rounded-xl bg-purple-50 dark:bg-[#571bc1]/60 hover:bg-purple-100 dark:hover:bg-[#571bc1] text-purple-700 dark:text-[#e9ddff] text-xs font-bold transition-all cursor-pointer border border-purple-200 dark:border-transparent whitespace-nowrap"
                        >
                          إصدار روشتة
                        </button>
                      )}
                      {onDeletePatient && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPatientToDelete(p);
                          }}
                          className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 transition-all cursor-pointer border border-rose-200 dark:border-rose-900/30 flex items-center justify-center shrink-0"
                          title="حذف ملف المريض بالكامل"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      )}
                    </div>

                    <div className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-all text-slate-400">
                      <span className="material-symbols-outlined transition-transform duration-300 block select-none" style={{ transform: isSelected ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                        expand_more
                      </span>
                    </div>
                  </div>
                </div>

                {/* Expanded Dossier Details (Directly under patient name!) */}
                {isSelected && (
                  <div className="border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#0e1626]/40 p-4 sm:p-6 space-y-6">
                    {/* Patient Key Indicators Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="p-3 bg-white dark:bg-[#111A2E] rounded-xl border border-slate-200/60 dark:border-white/5">
                        <span className="text-slate-400 dark:text-[#859394] block text-[10px] mb-1">تاريخ التسجيل:</span>
                        <strong className="text-slate-800 dark:text-[#dde2f5] font-mono">{p.registrationDate || 'اليوم'}</strong>
                      </div>
                      <div className="p-3 bg-white dark:bg-[#111A2E] rounded-xl border border-slate-200/60 dark:border-white/5">
                        <span className="text-slate-400 dark:text-[#859394] block text-[10px] mb-1">عدد الزيارات:</span>
                        <strong className="text-[#008f97] dark:text-[#45dee7] font-mono">{pVisits.length} زيارة طائرة</strong>
                      </div>
                      <div className="p-3 bg-white dark:bg-[#111A2E] rounded-xl border border-slate-200/60 dark:border-white/5">
                        <span className="text-slate-400 dark:text-[#859394] block text-[10px] mb-1">إجمالي المدفوعات:</span>
                        <strong className="text-emerald-600 dark:text-[#10B981] font-mono">{p.totalPaid || 0} ج.م</strong>
                      </div>
                      <div className="p-3 bg-white dark:bg-[#111A2E] rounded-xl border border-slate-200/60 dark:border-white/5">
                        <span className="text-slate-400 dark:text-[#859394] block text-[10px] mb-1">آخر تشخيص إكلينيكي:</span>
                        <strong className="text-purple-700 dark:text-[#d0bcff] truncate block">{p.lastDiagnosis || 'كشف عيادة باطنة'}</strong>
                      </div>
                    </div>

                    {/* Allergy Warning if any */}
                    {p.allergies && p.allergies.length > 0 && (
                      <div className="bg-red-50 dark:bg-red-950/30 border border-red-200/50 dark:border-red-900/30 text-red-700 dark:text-red-400 p-3 rounded-xl flex items-center gap-2 text-xs font-bold">
                        <span className="material-symbols-outlined text-base">warning</span>
                        <span>تنبيه حساسية دوائية: {p.allergies.join('، ')}</span>
                      </div>
                    )}

                    {/* Dossier Tabs Container */}
                    <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/5 pb-1.5 overflow-x-auto">
                      {[
                        { id: 'visits', label: `الزيارات والكشوفات (${pVisits.length})`, icon: 'history' },
                        { id: 'prescriptions', label: `الروشتات (${pPrescriptions.length})`, icon: 'description' },
                        { id: 'labs', label: `التحاليل والأشعة (${pLabOrders.length + pRadiologyOrders.length})`, icon: 'biotech' },
                        { id: 'chronic', label: 'الأمراض المزمنة والتاريخ', icon: 'healing' },
                        { id: 'billing', label: `سجل الفواتير (${pInvoices.length})`, icon: 'receipt_long' },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id as any)}
                          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap border ${
                            activeTab === tab.id
                              ? 'bg-[#00c2cb] text-[#08101C] border-[#00c2cb] shadow-xs'
                              : 'bg-white dark:bg-[#111A2E] text-slate-600 dark:text-[#bbc9ca] hover:bg-slate-50 dark:hover:bg-[#18233C] border-slate-200 dark:border-white/5'
                          }`}
                        >
                          <span className="material-symbols-outlined text-base">{tab.icon}</span>
                          <span>{tab.label}</span>
                        </button>
                      ))}
                    </div>

                    {/* Active Tab Panel */}
                    <div className="bg-white dark:bg-[#111A2E] p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-white/5 shadow-xs">
                      {activeTab === 'visits' && (
                        <div className="space-y-4">
                          <h3 className="text-xs font-bold text-slate-950 dark:text-[#dde2f5] mb-2">تاريخ الزيارات والكشوفات بالعيادة</h3>
                          {pVisits.length === 0 ? (
                            <div className="p-8 text-center text-xs text-slate-400 bg-slate-50/50 dark:bg-[#080e1b]/30 rounded-xl border border-slate-200/50 dark:border-white/5">
                              لا توجد زيارات مسجلة لهذا المريض حتى الآن
                            </div>
                          ) : (
                            <div className="border-r-2 border-teal-300 dark:border-[#00c2cb]/40 pr-4 space-y-6">
                              {pVisits.map((v) => {
                                const vPrescriptions = pPrescriptions.filter(
                                  (pr) => pr.visitId === v.visitId || pr.createdAt?.startsWith(v.createdAt?.split('T')[0])
                                );
                                const vLabs = pLabOrders.filter(
                                  (l) => l.visitId === v.visitId || l.orderedAt?.startsWith(v.createdAt?.split('T')[0])
                                );
                                const vRads = pRadiologyOrders.filter(
                                  (r) => r.visitId === v.visitId || r.orderedAt?.startsWith(v.createdAt?.split('T')[0])
                                );
                                const vFollowUp = followUps.find(
                                  (fu) => (fu.sourceVisitId === v.visitId || fu.patientId === p.patientId) && fu.status !== 'CANCELLED'
                                );

                                const handleSendVisitWhatsapp = () => {
                                  const cleanPhone = (p.phone || '').replace(/[^0-9]/g, '');
                                  const formattedPhone = cleanPhone.startsWith('0') ? `2${cleanPhone}` : cleanPhone || '201092847162';

                                  const visitDateStr = new Date(v.createdAt).toLocaleDateString('ar-EG', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                  });

                                  const diagnosisStr =
                                    v.clinicalData?.diagnosis && v.clinicalData.diagnosis.length > 0
                                      ? v.clinicalData.diagnosis.join('، ')
                                      : 'فحص واستشارة باطنة';

                                  const allMeds = vPrescriptions.flatMap((pr) => pr.items || []);

                                  let medsSection = '';
                                  if (allMeds.length > 0) {
                                    const medsList = allMeds
                                      .map(
                                        (it, idx) =>
                                          `  ${idx + 1}. *${it.name}* ${it.strength ? `(${it.strength})` : ''}\n     • الجرعة والمدة: ${it.dose || 'قرص'} — ${it.duration || ''}`
                                      )
                                      .join('\n');
                                    medsSection = `\n\n💊 *الأدوية الموصوفة:*\n${medsList}`;
                                  } else if (v.clinicalData?.treatment) {
                                    medsSection = `\n\n💊 *العلاج والخطّة الدوائية:*\n${v.clinicalData.treatment}`;
                                  }

                                  let labsSection = '';
                                  if (vLabs.length > 0) {
                                    const labsListStr = vLabs
                                      .map((l, idx) => `  ${idx + 1}. *${l.testName}*`)
                                      .join('\n');
                                    labsSection = `\n\n🧪 *الفحوصات والتحاليل المعملية:*\n${labsListStr}`;
                                  }

                                  let radsSection = '';
                                  if (vRads.length > 0) {
                                    const radsListStr = vRads
                                      .map((r, idx) => `  ${idx + 1}. *${r.radiologyName}*`)
                                      .join('\n');
                                    radsSection = `\n\n🩻 *الأشعة والموجات الصوتية:*\n${radsListStr}`;
                                  }

                                  let followUpSection = '';
                                  if (vFollowUp?.scheduledDate) {
                                    followUpSection = `\n\n🗓 *موعد المتابعة الاستشارية:* ${vFollowUp.scheduledDate}`;
                                  }

                                  const message = `مرحباً بك أستاذ/ة *${p.fullName}* 🌸
إليك تفاصيل وتقارير زيارتكم الطبية لدى *عيادة د. حازم القاضي* 🩺

🗓 *تاريخ الزيارة:* ${visitDateStr}
📋 *التشخيص الإكلينيكي:* ${diagnosisStr}${medsSection}${labsSection}${radsSection}${followUpSection}

📍 *العنوان:* عيادة الباطنة التخصصية - المهندسين
📞 *للتأكيد والاستفسار:* 01092847162
مع تمنياتنا لكم بتمام الشفاء ودوام الصحة والعافية ✨`;

                                  window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`, '_blank');
                                };

                                return (
                                  <div key={v.visitId} className="relative bg-slate-50/80 dark:bg-[#080e1b] p-3.5 sm:p-4 rounded-xl border border-slate-200/80 dark:border-white/5 space-y-2.5 shadow-xs">
                                    <span className={`w-3 h-3 rounded-full absolute -right-[23px] top-4 border-2 border-white dark:border-[#111A2E] ${v.status === 'COMPLETED' ? 'bg-[#00c2cb]' : 'bg-amber-400'}`}></span>

                                    <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-slate-200/60 dark:border-white/5">
                                      <div>
                                        <div className="text-xs font-mono text-[#008f97] dark:text-[#00c2cb] font-bold">
                                          {new Date(v.createdAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                        <div className="font-bold text-sm text-slate-900 dark:text-[#dde2f5] mt-0.5">
                                          {v.visitType === 'NEW' ? 'كشف جديد' : 'استشارة / متابعة'} — {v.clinicalData?.chiefComplaint || v.receptionistData?.symptoms || 'كشف عيادة'}
                                        </div>
                                      </div>

                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleSendVisitWhatsapp();
                                        }}
                                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-xs shrink-0"
                                        title="إرسال بيانات الزيارة بالكامل (تشخيص، تحاليل، أشعة، أدوية، وموعد المتابعة) إلى المريض عبر واتساب"
                                      >
                                        <span className="material-symbols-outlined text-sm">chat</span>
                                        <span>إرسال تقرير الزيارة (واتساب)</span>
                                      </button>
                                    </div>

                                    {v.clinicalData?.diagnosis && v.clinicalData.diagnosis.length > 0 && (
                                      <p className="text-xs text-slate-700 dark:text-[#bbc9ca]">
                                        <strong className="text-slate-900 dark:text-[#dde2f5]">📋 التشخيص:</strong> {v.clinicalData.diagnosis.join('، ')}
                                      </p>
                                    )}

                                    {v.clinicalData?.treatment && (
                                      <p className="text-xs text-slate-600 dark:text-[#859394]">
                                        <strong className="text-slate-900 dark:text-[#dde2f5]">💊 العلاج والتعليمات:</strong> {v.clinicalData.treatment}
                                      </p>
                                    )}

                                    {vLabs.length > 0 && (
                                      <div className="text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 p-2 rounded-lg border border-amber-200/50 dark:border-amber-900/30">
                                        <strong>🧪 التحاليل المطلوبة:</strong> {vLabs.map((l) => l.testName).join('، ')}
                                      </div>
                                    )}

                                    {vRads.length > 0 && (
                                      <div className="text-xs text-purple-800 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/30 p-2 rounded-lg border border-purple-200/50 dark:border-purple-900/30">
                                        <strong>🩻 الأشعة المطلوبة:</strong> {vRads.map((r) => r.radiologyName).join('، ')}
                                      </div>
                                    )}

                                    {vFollowUp?.scheduledDate && (
                                      <div className="text-xs text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/30 p-2 rounded-lg border border-teal-200/50 dark:border-teal-900/30 flex items-center justify-between">
                                        <span><strong>🗓 موعد المتابعة القادم:</strong> {vFollowUp.scheduledDate}</span>

                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {activeTab === 'prescriptions' && (
                        <div className="space-y-4">
                          <h3 className="text-xs font-bold text-slate-950 dark:text-[#dde2f5]">الروشتات الطبية المعتمدة للمريض</h3>
                          {pPrescriptions.length === 0 ? (
                            <div className="p-8 text-center text-xs text-slate-400 bg-slate-50/50 dark:bg-[#080e1b]/30 rounded-xl border border-slate-200/50 dark:border-white/5">
                              لا توجد روشتات مسجلة لهذا المريض
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {pPrescriptions.map((pr) => (
                                <div key={pr.prescriptionId} className="p-4 rounded-xl bg-slate-50 dark:bg-[#080e1b] border border-slate-200 dark:border-white/5 space-y-2.5">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="font-bold text-[#008f97] dark:text-[#00c2cb]">
                                      روشتة بتاريخ {new Date(pr.createdAt).toLocaleDateString('ar-EG')}
                                    </span>
                                    <div className="flex items-center gap-2">
                                      <span className="text-slate-400 text-[10px] font-mono">{pr.items.length} صنف</span>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const cleanPhone = (p.phone || '').replace(/[^0-9]/g, '');
                                          const formattedPhone = cleanPhone.startsWith('0') ? `2${cleanPhone}` : cleanPhone || '201092847162';
                                          const medsList = pr.items.map((it, idx) => `${idx + 1}. *${it.name}* (${it.strength || ''})\n   - الجرعة: ${it.dose || 'قرص'}\n   - المدة والتكرار: ${it.duration || ''}`).join('\n');
                                          const message = `مرحباً بك أستاذ/ة *${p.fullName}* 🌸\nإليك الروشتة الطبية الخاصة بزيارتكم في *عيادة د. حازم القاضي* 🩺\n\n🗓 تاريخ الروشتة: *${new Date(pr.createdAt).toLocaleDateString('ar-EG')}*\n\n💊 *الأدوية الموصوفة:*\n${medsList}\n\n${pr.notes ? `📝 *إرشادات الطبيب:* ${pr.notes}\n\n` : ''}📍 عيادة الباطنة التخصصية - المهندسين\nمع تمنياتنا لكم بالشفاء العاجل ودوام الصحة والعافية ✨`;
                                          window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`, '_blank');
                                        }}
                                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all shadow-xs"
                                        title="إرسال الروشتة للمريض عبر واتساب"
                                      >
                                        <span className="material-symbols-outlined text-xs">chat</span>
                                        <span>إرسال واتساب</span>
                                      </button>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-1 gap-2">
                                    {pr.items.map((it, idx) => (
                                      <div key={idx} className="text-xs flex items-center justify-between bg-white dark:bg-[#111A2E] p-2.5 rounded-lg border border-slate-200/40 dark:border-white/5">
                                        <span className="font-bold text-slate-900 dark:text-[#dde2f5]">{it.name} {it.strength}</span>
                                        <span className="text-slate-500 dark:text-[#bbc9ca] font-mono">{it.dose} • {it.duration}</span>
                                      </div>
                                    ))}
                                  </div>
                                  {pr.notes && (
                                    <p className="text-[11px] text-slate-500 dark:text-[#859394] italic mt-1 bg-slate-100/50 dark:bg-[#18233C]/40 p-2 rounded-lg">
                                      ملاحظات وإرشادات: {pr.notes}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {activeTab === 'labs' && (
                        <div className="space-y-6">
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="text-xs font-bold text-slate-950 dark:text-[#dde2f5] flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[#008f97] dark:text-[#00c2cb] text-base">biotech</span>
                                <span>الفحوصات والتحاليل المعملية ({pLabOrders.length})</span>
                              </h3>
                            </div>
                            {pLabOrders.length === 0 ? (
                              <div className="p-4 text-center text-xs text-slate-400 bg-slate-50/50 dark:bg-[#080e1b]/30 rounded-xl border border-slate-200/50 dark:border-white/5">
                                لا توجد تحاليل معملية مسجلة
                              </div>
                            ) : (
                              <div className="space-y-2.5">
                                {pLabOrders.map((l) => {
                                  const hasResult = !!(l.result && l.result.trim());
                                  const isResult = l.status === 'RESULT' || hasResult;
                                  const isReport = l.status === 'REPORT';
                                  return (
                                    <div key={l.labOrderId} className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#080e1b] border border-slate-200/80 dark:border-white/5 space-y-2">
                                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                        <div className="flex items-center gap-3">
                                          <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-[#00c2cb] flex items-center justify-center">
                                            <span className="material-symbols-outlined text-lg">science</span>
                                          </div>
                                          <div>
                                            <div className="text-xs font-bold text-slate-900 dark:text-[#dde2f5]">{l.testName}</div>
                                            <div className="text-[10px] text-slate-400 dark:text-[#859394]">
                                              تاريخ الفحص: {new Date(l.orderedAt).toLocaleDateString('ar-EG')} {l.notes ? `• ${l.notes}` : ''}
                                            </div>
                                          </div>
                                        </div>
                                        <div>
                                          {isResult ? (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-[#10B981] border border-emerald-300 dark:border-emerald-700/50 shadow-xs">
                                              <span className="material-symbols-outlined text-sm text-emerald-600">check_circle</span>
                                              <span>النتيجة المسجلة: <strong>{l.result || 'معتمدة'}</strong></span>
                                            </span>
                                          ) : isReport ? (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-400 border border-indigo-300 dark:border-indigo-700/50">
                                              <span className="material-symbols-outlined text-sm">clinical_notes</span>
                                              <span>تقرير معملي معتمد</span>
                                            </span>
                                          ) : (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-[#FBBF24] border border-amber-300 dark:border-amber-700/50">
                                              <span className="material-symbols-outlined text-sm">hourglass_top</span>
                                              <span>مطلوب وبانتظار النتيجة</span>
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      {/* If result is recorded */}
                                      {isResult && hasResult && (
                                        <div className="p-2.5 rounded-lg bg-white dark:bg-[#111A2E] border border-emerald-200/60 dark:border-emerald-900/30 text-xs flex items-center justify-between">
                                          <div className="flex items-center gap-2">
                                            <span className="text-slate-500 dark:text-[#859394] font-medium">النتيجة المقاسة بالتحليل:</span>
                                            <span className="font-mono font-extrabold text-emerald-700 dark:text-[#10B981] text-sm bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded border border-emerald-200/60 dark:border-emerald-800/40">
                                              {l.result}
                                            </span>
                                          </div>
                                          {l.notes && <span className="text-[11px] text-slate-500 dark:text-[#859394]">{l.notes}</span>}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          <div className="border-t border-slate-100 dark:border-white/5 pt-4">
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="text-xs font-bold text-slate-950 dark:text-[#dde2f5] flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-purple-600 dark:text-[#d0bcff] text-base">monitor_heart</span>
                                <span>تقارير الأشعة والتصوير الطبي ({pRadiologyOrders.length})</span>
                              </h3>
                            </div>
                            {pRadiologyOrders.length === 0 ? (
                              <div className="p-4 text-center text-xs text-slate-400 bg-slate-50/50 dark:bg-[#080e1b]/30 rounded-xl border border-slate-200/50 dark:border-white/5">
                                لا توجد فحوصات أشعة مسجلة
                              </div>
                            ) : (
                              <div className="space-y-2.5">
                                {pRadiologyOrders.map((r) => {
                                  const hasReport = !!(r.report && r.report.trim());
                                  const hasResult = !!(r.result && r.result.trim());
                                  const isRecorded = r.status === 'REPORT' || r.status === 'RESULT' || hasReport || hasResult;
                                  const reportText = r.report || r.result || '';
                                  return (
                                    <div key={r.radiologyOrderId} className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#080e1b] border border-slate-200/80 dark:border-white/5 space-y-2">
                                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                        <div className="flex items-center gap-3">
                                          <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-[#d0bcff] flex items-center justify-center">
                                            <span className="material-symbols-outlined text-lg">radiology</span>
                                          </div>
                                          <div>
                                            <div className="text-xs font-bold text-slate-900 dark:text-[#dde2f5]">{r.radiologyName}</div>
                                            <div className="text-[10px] text-slate-400 dark:text-[#859394]">
                                              تاريخ الفحص: {new Date(r.orderedAt).toLocaleDateString('ar-EG')} {r.notes ? `• ${r.notes}` : ''}
                                            </div>
                                          </div>
                                        </div>
                                        <div>
                                          {isRecorded ? (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-[#d0bcff] border border-purple-300 dark:border-purple-700/50 shadow-xs">
                                              <span className="material-symbols-outlined text-sm text-purple-600">check_circle</span>
                                              <span>تم تسجيل التقرير الإشعاعي ✓</span>
                                            </span>
                                          ) : (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-[#FBBF24] border border-amber-300 dark:border-amber-700/50">
                                              <span className="material-symbols-outlined text-sm">hourglass_top</span>
                                              <span>مطلوب وبانتظار التقرير</span>
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      {/* Display report content if recorded */}
                                      {isRecorded && reportText && (
                                        <div className="p-3 rounded-lg bg-white dark:bg-[#111A2E] border border-purple-200/60 dark:border-purple-900/30 text-xs text-slate-800 dark:text-[#dde2f5] space-y-1">
                                          <div className="flex items-center gap-1.5 text-purple-700 dark:text-[#d0bcff] font-bold text-[11px]">
                                            <span className="material-symbols-outlined text-xs">description</span>
                                            <span>التقرير السريري للأشعة والتصوير:</span>
                                          </div>
                                          <p className="leading-relaxed whitespace-pre-wrap text-slate-700 dark:text-[#c4d0e6]">{reportText}</p>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {activeTab === 'chronic' && (
                        <div className="space-y-3">
                          <h3 className="text-xs font-bold text-slate-950 dark:text-[#dde2f5]">الأمراض المزمنة المثبتة</h3>
                          {!p.chronicConditions || p.chronicConditions.length === 0 ? (
                            <div className="p-4 text-center text-xs text-slate-400 bg-slate-50/50 dark:bg-[#080e1b]/30 rounded-xl border border-slate-200/50 dark:border-white/5">
                              لا توجد أمراض مزمنة مسجلة في ملف المريض
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {p.chronicConditions.map((cond) => (
                                <div key={cond} className="p-3 bg-slate-50 dark:bg-[#080e1b] rounded-xl border border-slate-200/60 dark:border-white/5 flex items-center gap-2.5">
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
                          <h3 className="text-xs font-bold text-slate-950 dark:text-[#dde2f5]">سجل المعاملات والمدفوعات المالية</h3>
                          {pInvoices.length === 0 ? (
                            <div className="p-8 text-center text-xs text-slate-400 bg-slate-50/50 dark:bg-[#080e1b]/30 rounded-xl border border-slate-200/50 dark:border-white/5">
                              لا توجد فواتير أو معاملات مالية مسجلة لهذا المريض
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {pInvoices.map((inv) => (
                                <div key={inv.invoiceId} className="p-3 bg-slate-50 dark:bg-[#080e1b] rounded-xl border border-slate-200 dark:border-white/5 flex items-center justify-between text-xs">
                                  <div>
                                    <span className="font-bold text-slate-900 dark:text-[#dde2f5]">فاتورة كشف وزيارة بالعيادة</span>
                                    <span className="text-[10px] text-slate-400 dark:text-[#859394] block font-mono mt-0.5">
                                      {new Date(inv.createdAt).toLocaleDateString('ar-EG')} • #{inv.invoiceId.slice(0, 8)}
                                    </span>
                                  </div>
                                  <div className="text-left">
                                    <span className="font-mono font-bold text-[#008f97] dark:text-[#45dee7]">{inv.total} ج.م</span>
                                    <span className="text-[10px] text-emerald-600 dark:text-[#10B981] block mt-0.5">
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
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Confirmation Modal for Deleting Patient File */}
      {patientToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111A2E] border border-rose-500/30 rounded-3xl p-6 max-w-md w-full text-center space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 mx-auto flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl">delete_forever</span>
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                تأكيد حذف ملف المريض نهائياً
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#859394] leading-relaxed">
                هل أنت متأكد من رغبتك في حذف ملف المريض <strong className="text-slate-800 dark:text-white">({patientToDelete.name})</strong> كود ملف <strong className="text-[#008f97] dark:text-[#00c2cb] font-mono">{patientToDelete.medicalCode}</strong>؟
              </p>
              <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium pt-1">
                ⚠️ تحذير: سيتم حذف كافة البيانات الطبية والزيارات المرتبطة بهذا الملف ولا يمكن التراجع بعد الحذف.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-3">
              <button
                type="button"
                onClick={() => setPatientToDelete(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-[#18233C] text-slate-700 dark:text-[#dde2f5] text-xs font-bold transition-all cursor-pointer hover:bg-slate-200 dark:hover:bg-[#242a38]"
              >
                إلغاء التراجع
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeletePatient && patientToDelete) {
                    onDeletePatient(patientToDelete.id);
                    if (selectedPatientId === patientToDelete.id) {
                      setSelectedPatientId('');
                    }
                    setPatientToDelete(null);
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md transition-all cursor-pointer active:scale-95"
              >
                تأكيد الحذف النهائي
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import {
  PatientListItem,
  PrescriptionItem,
} from '../../types';
import {
  Visit,
  Prescription,
  LabOrder,
  RadiologyOrder,
} from '../../types/database';

interface PreviousVisitCardProps {
  patient: PatientListItem;
  visit?: Visit | null;
  totalVisitsCount?: number;
  prescription?: Prescription | null;
  labOrders?: LabOrder[];
  radiologyOrders?: RadiologyOrder[];
  onCopyMedications?: (meds: PrescriptionItem[]) => void;
}

export const PreviousVisitCard: React.FC<PreviousVisitCardProps> = ({
  patient,
  visit,
  totalVisitsCount,
  prescription,
  labOrders = [],
  radiologyOrders = [],
  onCopyMedications,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [copiedNotification, setCopiedNotification] = useState(false);

  // Derive date and time formatted in Arabic
  const rawDate = visit?.createdAt;
  let formattedDate = '';
  let formattedTime = '';

  if (rawDate) {
    try {
      const d = new Date(rawDate);
      if (!isNaN(d.getTime())) {
        formattedDate = d.toLocaleDateString('ar-EG', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });
        formattedTime = d.toLocaleTimeString('ar-EG', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });
      }
    } catch {
      // Keep empty if invalid
    }
  }

  // Derive total visits count
  const visitsDisplayCount =
    typeof totalVisitsCount === 'number' && totalVisitsCount > 0
      ? totalVisitsCount
      : patient.visitsCount && patient.visitsCount > 0
      ? patient.visitsCount
      : 1;

  // Derive symptoms strictly from visit data
  const symptomsText =
    visit?.clinicalData?.chiefComplaint ||
    visit?.receptionistData?.symptoms ||
    '';

  // Derive diagnosis strictly from visit data
  let diagnosisText = '';
  if (visit?.clinicalData?.diagnosis && visit.clinicalData.diagnosis.length > 0) {
    diagnosisText = visit.clinicalData.diagnosis.join(' ، ');
  }

  // Derive medications strictly from prescription
  const medicationsList: Array<{ name: string; dose?: string; form?: string; frequency?: string }> =
    prescription && prescription.items && prescription.items.length > 0
      ? prescription.items.map((i) => ({
          name: i.name,
          dose: i.dose,
          form: i.form,
          frequency: i.frequency,
        }))
      : [];

  // Derive Labs strictly from labOrders
  const labItemsText: string[] = (labOrders || []).map((l) => {
    if (l.status === 'RESULT' && l.result) {
      return `نتيجة تحليل ${l.testName} "${l.result}"`;
    }
    return `${l.testName} "${l.status === 'RESULT' ? (l.result || 'معتمد') : 'مطلوب'}"`;
  });

  // Derive Radiology strictly from radiologyOrders
  const radiologyItemsText: string[] = (radiologyOrders || []).map((r) => {
    if (r.status === 'REPORT' && r.result) {
      return `أشعة ${r.radiologyName} "${r.result}"`;
    }
    return `اشعه ${r.radiologyName} "${r.status === 'REPORT' || r.status === 'RESULT' ? 'تقرير معتمد' : 'مطلوب'}"`;
  });

  // Derive notes strictly from prescription notes or clinical treatment
  const notesText = prescription?.notes || visit?.clinicalData?.treatment || '';

  const handleCopy = () => {
    if (!onCopyMedications) return;
    const mapped: PrescriptionItem[] = medicationsList.map((m, idx) => ({
      id: `rx-copied-${Date.now()}-${idx}`,
      drugName: m.name,
      dosage: m.dose || 'قرص واحد',
      dosageForm: m.form || 'أقراص',
      frequency: m.frequency || 'يومياً',
      timing: 'بعد الأكل',
      duration: '5 أيام',
      notes: 'تكرار من الزيارة السابقة',
    }));
    onCopyMedications(mapped);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 3500);
  };

  return (
    <div
      id="previous-visit-card"
      className="w-full rounded-2xl bg-gradient-to-br from-amber-50/40 via-white to-teal-50/30 dark:from-[#0d1829] dark:via-[#111A2E] dark:to-[#0f1d31] border-2 border-teal-500/30 dark:border-[#00c2cb]/30 shadow-sm transition-all overflow-hidden"
    >
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:px-5 sm:py-3.5 bg-teal-500/10 dark:bg-[#00c2cb]/10 border-b border-teal-500/20 dark:border-[#00c2cb]/20">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#00c2cb]/20 text-[#008f97] dark:text-[#45dee7] flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-lg">history_edu</span>
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-[#dde2f5] flex items-center gap-2">
              تفاصيل الزيارة السابقة
            </h3>
          </div>
        </div>

        {/* Badges: Total Visits & Date / Time */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2.5 py-1 rounded-full bg-teal-600 text-white dark:bg-[#00c2cb] dark:text-slate-950 text-xs font-bold shadow-xs">
            إجمالي الزيارات: {visitsDisplayCount}
          </span>

          {formattedDate && (
            <span className="px-3 py-1 rounded-full bg-white dark:bg-white/10 text-slate-700 dark:text-[#dde2f5] border border-slate-200 dark:border-white/10 text-xs font-bold font-mono">
              {formattedDate} {formattedTime ? `• ${formattedTime}` : ''}
            </span>
          )}

          {onCopyMedications && medicationsList.length > 0 && (
            <button
              type="button"
              onClick={handleCopy}
              className="px-3 py-1 rounded-full bg-white dark:bg-[#080e1b] hover:bg-teal-50 dark:hover:bg-teal-950/40 text-[#008f97] dark:text-[#45dee7] border border-[#00c2cb]/40 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
              title="نسخ أدوية الزيارة السابقة إلى الروشتة الحالية مباشرة"
            >
              <span className="material-symbols-outlined text-sm">content_copy</span>
              <span>نسخ الأدوية للروشتة</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-slate-500 hover:text-slate-900 dark:text-[#859394] dark:hover:text-white p-1 rounded-lg hover:bg-slate-200/50 dark:hover:bg-white/5 transition-colors cursor-pointer"
            title={isExpanded ? 'طي البطاقة' : 'عرض التفاصيل'}
          >
            <span className="material-symbols-outlined text-base">
              {isExpanded ? 'expand_less' : 'expand_more'}
            </span>
          </button>
        </div>
      </div>

      {copiedNotification && (
        <div className="bg-emerald-500/15 border-b border-emerald-500/30 px-4 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">check_circle</span>
          <span>تم استيراد أدوية الزيارة السابقة إلى الروشتة الحالية بنجاح!</span>
        </div>
      )}

      {/* Card Body */}
      {isExpanded && (
        <div className="p-4 sm:p-5 space-y-4 text-xs sm:text-sm">
          {/* 1. الأعراض والشكوى */}
          {symptomsText && (
            <div className="flex flex-col gap-1">
              <span className="font-bold text-slate-900 dark:text-[#dde2f5] flex items-center gap-1.5 text-xs sm:text-sm">
                <span>🩺</span>
                <span>الأعراض:</span>
              </span>
              <p className="text-slate-700 dark:text-[#bbc9ca] font-medium leading-relaxed pr-6">
                {symptomsText}
              </p>
            </div>
          )}

          {/* 2. التشخيص المعتمد */}
          {diagnosisText && (
            <div className="flex flex-col gap-1 pt-1">
              <span className="font-bold text-slate-900 dark:text-[#dde2f5] flex items-center gap-1.5 text-xs sm:text-sm">
                <span>📋</span>
                <span>التشخيص:</span>
              </span>
              <p className="text-slate-800 dark:text-teal-200 font-bold leading-relaxed pr-6">
                {diagnosisText}
              </p>
            </div>
          )}

          {/* 3. العلاج الموصوف */}
          {medicationsList.length > 0 && (
            <div className="flex flex-col gap-1.5 pt-1">
              <span className="font-bold text-slate-900 dark:text-[#dde2f5] flex items-center gap-1.5 text-xs sm:text-sm">
                <span>💊</span>
                <span>العلاج الموصوف:</span>
              </span>
              <ul className="space-y-1.5 pr-6">
                {medicationsList.map((med, idx) => (
                  <li
                    key={idx}
                    className="text-slate-800 dark:text-[#dde2f5] font-semibold flex items-baseline gap-2"
                  >
                    <span className="text-teal-600 dark:text-[#00c2cb] font-bold text-base leading-none">•</span>
                    <span>{med.name}</span>
                    {med.dose && (
                      <span className="text-slate-500 dark:text-[#859394] text-xs font-normal">
                        ({med.dose})
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 4. التحاليل والأشعة والملاحظات */}
          {(labItemsText.length > 0 || radiologyItemsText.length > 0 || notesText) && (
            <div className="pt-2 border-t border-slate-200/60 dark:border-white/5 flex flex-col gap-2">
              {/* Lab item */}
              {labItemsText.map((txt, idx) => (
                <div key={idx} className="text-slate-800 dark:text-[#dde2f5] font-semibold flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-base">
                    science
                  </span>
                  <span>{txt}</span>
                </div>
              ))}

              {/* Radiology item */}
              {radiologyItemsText.map((txt, idx) => (
                <div key={idx} className="text-slate-800 dark:text-[#dde2f5] font-semibold flex items-center gap-2">
                  <span className="material-symbols-outlined text-sky-600 dark:text-sky-400 text-base">
                    radiology
                  </span>
                  <span>{txt}</span>
                </div>
              ))}

              {/* Notes */}
              {notesText && (
                <div className="text-slate-700 dark:text-amber-300 font-bold flex items-start gap-2 pt-1">
                  <span className="material-symbols-outlined text-amber-500 text-base shrink-0 mt-0.5">
                    edit_note
                  </span>
                  <span>ملاحظات: {notesText}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

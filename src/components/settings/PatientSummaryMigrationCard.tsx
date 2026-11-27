import { useState } from 'react';
import { db } from '../../services/firebase';
import {
  backfillPatientSummary,
  type PatientSummaryMigrationReport,
} from '../../services/migrations/backfillPatientSummary';
import { safeStorage } from '../../services/storage';

const LAST_RUN_KEY = 'soli_patient_summary_migration_last_run';

// حارس على مستوى الوحدة يمنع تشغيلاً ثانياً متزامناً حتى لو أُعيد
// تركيب المكوّن أثناء التشغيل (إضافة لحالة busy في الواجهة).
let migrationRunning = false;

function loadLastRun(): PatientSummaryMigrationReport | null {
  try {
    const raw = safeStorage.getItem(LAST_RUN_KEY, null);
    return raw ? (JSON.parse(raw) as PatientSummaryMigrationReport) : null;
  } catch {
    return null;
  }
}

function formatRun(r: PatientSummaryMigrationReport): string {
  const when = r.finishedAt ? new Date(r.finishedAt).toLocaleString('ar-EG') : '';
  return (
    `آخر تشغيل (${when}): فُحص ${r.patientsScanned} مريض — ` +
    `حُدّث ${r.patientsUpdated} — صحيح أصلاً ${r.alreadyCorrect}` +
    (r.duplicatesRepaired > 0 ? ` — أُصلح ${r.duplicatesRepaired} رقم ملف مكرر` : '') +
    (r.fileCounterSeeded
      ? ` — بُذَر عدّاد أرقام الملفات عند ${r.fileCounterSeededTo} (التالي #${(r.fileCounterSeededTo ?? 0) + 1})`
      : '') +
    (r.stoppedEarly ? ` — توقف مبكراً: ${r.stoppedEarlyReason}` : '')
  );
}

/**
 * زر «ترحيل ملخص المرضى» (إصلاح 2 — مراجعة كلود لِـ W4).
 * يعيد حساب hasClinicalFile / visitsCount / lastVisitDate / lastDiagnosis
 * لكل مريض من تاريخه الكامل، ويُصلح العدّ الناقص للمرضى القدامى
 * (وعدداً أعلى من الحقيقة بعد حذف زيارة). يُشغَّل مرة واحدة يدوياً،
 * وآمن لإعادة التشغيل. يُعرض فقط للمدير (Block 4 في الإعدادات).
 */
export function PatientSummaryMigrationCard() {
  const [busy, setBusy] = useState(false);
  // تأكيد داخلي من خطوتين بدلاً من window.confirm الأصلي — المتصفحات
  // الآلية لا تستطيع الرد على نوافذ التأكيد الأصلية فكان الزر لا يفعل شيئاً.
  const [armed, setArmed] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [lastRun, setLastRun] = useState<PatientSummaryMigrationReport | null>(() => loadLastRun());
  const push = (m: string) => setLog((l) => [...l.slice(-30), m]);

  const run = async () => {
    if (!db || busy || migrationRunning) return;
    migrationRunning = true;
    setBusy(true);
    try {
      push('بدأ ترحيل ملخص المرضى…');
      const report = await backfillPatientSummary(db, push);
      push(
        `انتهى الترحيل: فُحص ${report.patientsScanned} مريض / ` +
          `حُدّث ${report.patientsUpdated} / صحيح أصلاً ${report.alreadyCorrect} / ` +
          `زيارات مكتملة ${report.completedVisitsScanned} / روشتات ${report.prescriptionsScanned} / ` +
          `أعلى رقم ملف ${report.maxFileNumber} / أُصلح ${report.duplicatesRepaired} رقم ملف مكرر` +
          (report.fileCounterSeeded
            ? ` / بُذَر عدّاد أرقام الملفات عند ${report.fileCounterSeededTo} (التخصيص التالي #${(report.fileCounterSeededTo ?? 0) + 1})`
            : ' / لم يُبذَر عدّاد أرقام الملفات') +
          (report.stoppedEarly ? ` / توقف مبكراً: ${report.stoppedEarlyReason}` : ''),
      );
      safeStorage.setItem(LAST_RUN_KEY, JSON.stringify(report));
      setLastRun(report);
    } catch (e) {
      push('خطأ: ' + (e as Error).message);
    } finally {
      migrationRunning = false;
      setBusy(false);
    }
  };

  // الضغطة الأولى تُسلّح الزر فقط، والثانية (وهو مسلّح) تشغّل الترحيل.
  const onButtonClick = () => {
    if (busy || migrationRunning) return;
    if (!armed) {
      setArmed(true);
      return;
    }
    setArmed(false);
    void run();
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111A2E] p-5 space-y-4 shadow-sm" dir="rtl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
          <span className="material-symbols-outlined text-xl">clinical_notes</span>
        </div>
        <div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">ترحيل ملخص المرضى — عدد الزيارات وآخر زيارة</h3>
          <p className="text-xs text-slate-500 dark:text-[#859394]">
            يعيد حساب عدد الزيارات المكتملة وآخر زيارة وتشخيصها لكل مريض من تاريخه الكامل
            (يُصلح العدّ الناقص للمرضى القدامى). كما يبذر عدّاد أرقام الملفات
            (counters/patientFile) من أعلى رقم ملف موجود، ويُصلح أي أرقام ملفات
            مكررة بإعادة تسمية اللاحق منها. شغّلها مرة واحدة فقط، والأجهزة الأخرى مغلقة.
            إعادة التشغيل آمنة — تُعيد نفس القيم.
          </p>
        </div>
      </div>
      {lastRun && (
        <p className="text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-900 dark:text-emerald-200 rounded-xl px-3 py-2">
          {formatRun(lastRun)}
        </p>
      )}
      {armed && !busy && (
        <p className="text-xs bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 rounded-xl px-3 py-2">
          أغلق النظام على كل الأجهزة الأخرى قبل البدء — سيُعاد حساب ملخص كل مريض من تاريخه الكامل.
          اضغط «تأكيد بدء الترحيل» مرة أخرى للبدء، أو «إلغاء» للتراجع.
        </p>
      )}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={onButtonClick}
          disabled={busy}
          className={`px-5 py-2.5 rounded-xl text-white font-bold text-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2 shadow-xs ${
            armed ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'
          }`}
        >
          <span className="material-symbols-outlined text-base">
            {busy ? 'hourglass_top' : armed ? 'warning' : 'play_arrow'}
          </span>
          <span>{busy ? 'جارٍ الترحيل…' : armed ? 'تأكيد بدء الترحيل — اضغط مرة أخرى للتأكيد' : 'ترحيل ملخص المرضى'}</span>
        </button>
        {armed && !busy && (
          <button
            type="button"
            onClick={() => setArmed(false)}
            className="px-3 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            إلغاء
          </button>
        )}
      </div>
      {log.length > 0 && (
        <pre className="text-xs max-h-48 overflow-auto whitespace-pre-wrap bg-slate-950 text-slate-100 p-3 rounded-xl border border-slate-800 font-mono">
          {log.join('\n')}
        </pre>
      )}
    </div>
  );
}

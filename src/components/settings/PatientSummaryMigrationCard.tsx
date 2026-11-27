import { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { PATIENT_FILE_COUNTER_ID } from '../../services/firestoreWorkflows';
import {
  backfillPatientSummary,
  type PatientSummaryMigrationReport,
} from '../../services/migrations/backfillPatientSummary';
import {
  renumberPatientFiles,
  type RenumberPatientFilesReport,
} from '../../services/migrations/renumberPatientFiles';
import { safeStorage } from '../../services/storage';

const LAST_RUN_KEY = 'soli_patient_summary_migration_last_run';
const RENUMBER_LAST_RUN_KEY = 'soli_patient_renumber_last_run';
const RESET_LAST_RUN_KEY = 'soli_patient_counter_reset_last_run';

// حارس على مستوى الوحدة يمنع تشغيلين متزامنين حتى لو أُعيد
// تركيب المكوّن أثناء التشغيل (إضافة لحالة busy في الواجهة).
// حارس واحد مشترك لكل إجراءات الصيانة في هذه البطاقة.
let maintenanceRunning = false;

type MaintenanceAction = 'migration' | 'renumber' | 'reset';

/** سجل آخر تصفير لعدّاد أرقام الملفات. */
interface CounterResetRecord {
  finishedAt: string;
  counterSetTo: number;
}

function loadLastRun(): PatientSummaryMigrationReport | null {
  try {
    const raw = safeStorage.getItem(LAST_RUN_KEY, null);
    return raw ? (JSON.parse(raw) as PatientSummaryMigrationReport) : null;
  } catch {
    return null;
  }
}

function loadRenumberLastRun(): RenumberPatientFilesReport | null {
  try {
    const raw = safeStorage.getItem(RENUMBER_LAST_RUN_KEY, null);
    return raw ? (JSON.parse(raw) as RenumberPatientFilesReport) : null;
  } catch {
    return null;
  }
}

function loadResetLastRun(): CounterResetRecord | null {
  try {
    const raw = safeStorage.getItem(RESET_LAST_RUN_KEY, null);
    return raw ? (JSON.parse(raw) as CounterResetRecord) : null;
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

function formatRenumberRun(r: RenumberPatientFilesReport): string {
  const when = r.finishedAt ? new Date(r.finishedAt).toLocaleString('ar-EG') : '';
  return (
    `آخر إعادة ترقيم (${when}): فُحص ${r.patientsScanned} مريض — ` +
    `أُعيد ترقيم ${r.patientsRenumbered} — ضُبط عدّاد أرقام الملفات على ${r.counterSetTo} ` +
    `(التخصيص التالي #${r.counterSetTo + 1})`
  );
}

function formatResetRun(r: CounterResetRecord): string {
  const when = r.finishedAt ? new Date(r.finishedAt).toLocaleString('ar-EG') : '';
  return `آخر تصفير للعدّاد (${when}): ضُبط عدّاد أرقام الملفات على ${r.counterSetTo} — أول مريض جديد ياخد #1`;
}

/**
 * زر «ترحيل ملخص المرضى» (إصلاح 2 — مراجعة كلود لِـ W4).
 * يعيد حساب hasClinicalFile / visitsCount / lastVisitDate / lastDiagnosis
 * لكل مريض من تاريخه الكامل، ويُصلح العدّ الناقص للمرضى القدامى
 * (وعدداً أعلى من الحقيقة بعد حذف زيارة). يُشغَّل مرة واحدة يدوياً،
 * وآمن لإعادة التشغيل. يُعرض فقط للمدير (Block 4 في الإعدادات).
 *
 * وتضم البطاقة أيضاً إجراءين لأرقام الملفات (2026-11-27):
 * «إعادة ترقيم الملفات من 1» — يعيد ترقيم كل الملفات الموجودة من 1
 * حسب تاريخ التسجيل ويضبط العدّاد على عددها؛ و«تصفير عدّاد أرقام
 * الملفات» — يصفّر العدّاد إلى 0 بعد حذف البيانات التجريبية، فيأخذ
 * أول مريض حقيقي الرقم #1. نفس بوابة المدير (Block 4) تحكم البطاقة كلها.
 */
export function PatientSummaryMigrationCard() {
  const [busy, setBusy] = useState(false);
  const [busyAction, setBusyAction] = useState<MaintenanceAction | null>(null);
  // تأكيد داخلي من خطوتين بدلاً من window.confirm الأصلي — المتصفحات
  // الآلية لا تستطيع الرد على نوافذ التأكيد الأصلية فكان الزر لا يفعل شيئاً.
  const [armed, setArmed] = useState(false);
  const [renumberArmed, setRenumberArmed] = useState(false);
  const [resetArmed, setResetArmed] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [lastRun, setLastRun] = useState<PatientSummaryMigrationReport | null>(() => loadLastRun());
  const [renumberLastRun, setRenumberLastRun] = useState<RenumberPatientFilesReport | null>(() => loadRenumberLastRun());
  const [resetLastRun, setResetLastRun] = useState<CounterResetRecord | null>(() => loadResetLastRun());
  const push = (m: string) => setLog((l) => [...l.slice(-30), m]);

  const runMigration = async () => {
    if (!db || busy || maintenanceRunning) return;
    maintenanceRunning = true;
    setBusy(true);
    setBusyAction('migration');
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
      maintenanceRunning = false;
      setBusy(false);
      setBusyAction(null);
    }
  };

  const runRenumber = async () => {
    if (!db || busy || maintenanceRunning) return;
    maintenanceRunning = true;
    setBusy(true);
    setBusyAction('renumber');
    try {
      push('بدأت إعادة ترقيم الملفات من 1…');
      const report = await renumberPatientFiles(db, push);
      push(
        `انتهت إعادة الترقيم: فُحص ${report.patientsScanned} مريض / ` +
          `أُعيد ترقيم ${report.patientsRenumbered} / ` +
          `ضُبط عدّاد أرقام الملفات على ${report.counterSetTo} (التخصيص التالي #${report.counterSetTo + 1})`,
      );
      safeStorage.setItem(RENUMBER_LAST_RUN_KEY, JSON.stringify(report));
      setRenumberLastRun(report);
    } catch (e) {
      push('خطأ: ' + (e as Error).message);
    } finally {
      maintenanceRunning = false;
      setBusy(false);
      setBusyAction(null);
    }
  };

  const runReset = async () => {
    if (!db || busy || maintenanceRunning) return;
    maintenanceRunning = true;
    setBusy(true);
    setBusyAction('reset');
    try {
      push('بدأ تصفير عدّاد أرقام الملفات…');
      await setDoc(doc(db, 'counters', PATIENT_FILE_COUNTER_ID), { lastNumber: 0 }, { merge: true });
      const record: CounterResetRecord = { finishedAt: new Date().toISOString(), counterSetTo: 0 };
      push('انتهى تصفير العدّاد: ضُبط عدّاد أرقام الملفات (counters/patientFile) على 0 — أول مريض جديد ياخد #1');
      safeStorage.setItem(RESET_LAST_RUN_KEY, JSON.stringify(record));
      setResetLastRun(record);
    } catch (e) {
      push('خطأ: ' + (e as Error).message);
    } finally {
      maintenanceRunning = false;
      setBusy(false);
      setBusyAction(null);
    }
  };

  // الضغطة الأولى تُسلّح الزر فقط، والثانية (وهو مسلّح) تشغّل الإجراء.
  const onMigrationClick = () => {
    if (busy || maintenanceRunning) return;
    if (!armed) {
      setArmed(true);
      return;
    }
    setArmed(false);
    void runMigration();
  };

  const onRenumberClick = () => {
    if (busy || maintenanceRunning) return;
    if (!renumberArmed) {
      setRenumberArmed(true);
      return;
    }
    setRenumberArmed(false);
    void runRenumber();
  };

  const onResetClick = () => {
    if (busy || maintenanceRunning) return;
    if (!resetArmed) {
      setResetArmed(true);
      return;
    }
    setResetArmed(false);
    void runReset();
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
          onClick={onMigrationClick}
          disabled={busy}
          className={`px-5 py-2.5 rounded-xl text-white font-bold text-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2 shadow-xs ${
            armed ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'
          }`}
        >
          <span className="material-symbols-outlined text-base">
            {busy ? 'hourglass_top' : armed ? 'warning' : 'play_arrow'}
          </span>
          <span>{busy ? (busyAction === 'migration' ? 'جارٍ الترحيل…' : 'جارٍ التنفيذ…') : armed ? 'تأكيد بدء الترحيل — اضغط مرة أخرى للتأكيد' : 'ترحيل ملخص المرضى'}</span>
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

      {/* أرقام الملفات: إعادة ترقيم من 1 + تصفير العدّاد (2026-11-27) */}
      <div className="pt-4 mt-2 border-t border-slate-200 dark:border-white/10 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-xl">format_list_numbered</span>
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">أرقام الملفات — إعادة ترقيم من 1 وتصفير العدّاد</h3>
            <p className="text-xs text-slate-500 dark:text-[#859394]">
              أرقام الملفات الحالية تجريبية (أرقامها عالية). مسح البيانات التجريبية لا يمسّ
              عدّاد أرقام الملفات، فيبقى على قيمته القديمة — لذلك صفّر العدّاد قبل تسجيل
              أول مريض حقيقي. الترتيب الصحيح: احذف البيانات التجريبية ← اضغط تصفير
              العدّاد ← أول مريض حقيقي ياخد #1. زر «إعادة ترقيم الملفات من 1» يعيد
              ترقيم كل الملفات الموجودة حالياً من 1 حسب تاريخ التسجيل (الأقدم أولاً)
              ويضبط العدّاد على عددها.
            </p>
          </div>
        </div>
        {renumberLastRun && (
          <p className="text-xs bg-sky-500/10 border border-sky-500/20 text-sky-900 dark:text-sky-200 rounded-xl px-3 py-2">
            {formatRenumberRun(renumberLastRun)}
          </p>
        )}
        {resetLastRun && (
          <p className="text-xs bg-sky-500/10 border border-sky-500/20 text-sky-900 dark:text-sky-200 rounded-xl px-3 py-2">
            {formatResetRun(resetLastRun)}
          </p>
        )}
        {renumberArmed && !busy && (
          <p className="text-xs bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 rounded-xl px-3 py-2">
            أغلق النظام على كل الأجهزة الأخرى قبل البدء — سيُعاد ترقيم كل ملفات المرضى من 1
            حسب تاريخ التسجيل (الأقدم أولاً)، ويُضبط العدّاد على عدد المرضى.
            اضغط «تأكيد إعادة الترقيم» مرة أخرى للبدء، أو «إلغاء» للتراجع.
          </p>
        )}
        {resetArmed && !busy && (
          <p className="text-xs bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 rounded-xl px-3 py-2">
            سيُصفَّر عدّاد أرقام الملفات إلى 0، فيأخذ أول مريض جديد بعدها الرقم #1.
            تأكد أنك حذفت البيانات التجريبية أولاً — التصفير مع وجود مرضى مسجلين
            يجعل المريض الجديد يأخذ رقماً مكرراً.
            اضغط «تأكيد تصفير العدّاد» مرة أخرى للبدء، أو «إلغاء» للتراجع.
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            onClick={onRenumberClick}
            disabled={busy}
            className={`px-5 py-2.5 rounded-xl text-white font-bold text-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2 shadow-xs ${
              renumberArmed ? 'bg-amber-600 hover:bg-amber-700' : 'bg-sky-600 hover:bg-sky-700'
            }`}
          >
            <span className="material-symbols-outlined text-base">
              {busy ? 'hourglass_top' : renumberArmed ? 'warning' : 'format_list_numbered'}
            </span>
            <span>{busy ? (busyAction === 'renumber' ? 'جارٍ إعادة الترقيم…' : 'جارٍ التنفيذ…') : renumberArmed ? 'تأكيد إعادة الترقيم — اضغط مرة أخرى للتأكيد' : 'إعادة ترقيم الملفات من 1'}</span>
          </button>
          {renumberArmed && !busy && (
            <button
              type="button"
              onClick={() => setRenumberArmed(false)}
              className="px-3 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              إلغاء
            </button>
          )}
          <button
            onClick={onResetClick}
            disabled={busy}
            className={`px-5 py-2.5 rounded-xl text-white font-bold text-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2 shadow-xs ${
              resetArmed ? 'bg-amber-600 hover:bg-amber-700' : 'bg-rose-600 hover:bg-rose-700'
            }`}
          >
            <span className="material-symbols-outlined text-base">
              {busy ? 'hourglass_top' : resetArmed ? 'warning' : 'restart_alt'}
            </span>
            <span>{busy ? (busyAction === 'reset' ? 'جارٍ تصفير العدّاد…' : 'جارٍ التنفيذ…') : resetArmed ? 'تأكيد تصفير العدّاد — اضغط مرة أخرى للتأكيد' : 'تصفير عدّاد أرقام الملفات'}</span>
          </button>
          {resetArmed && !busy && (
            <button
              type="button"
              onClick={() => setResetArmed(false)}
              className="px-3 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              إلغاء
            </button>
          )}
        </div>
      </div>
      {log.length > 0 && (
        <pre className="text-xs max-h-48 overflow-auto whitespace-pre-wrap bg-slate-950 text-slate-100 p-3 rounded-xl border border-slate-800 font-mono">
          {log.join('\n')}
        </pre>
      )}
    </div>
  );
}

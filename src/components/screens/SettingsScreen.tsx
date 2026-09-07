import React, { useState, useEffect } from 'react';
import { CLINIC_INFO } from '../../data/previewClinicData';
import {
  RadiologyCatalogItem,
  LabCatalogItem,
  DrugCatalogItem,
  DiagnosisCatalogItem,
  SymptomCatalogItem,
} from '../../types';
import { MedicalCatalogsManager } from '../settings/MedicalCatalogsManager';
import { UserManagementPanel } from '../settings/UserManagementPanel';
import { usePermissions } from '../../context/AuthContext';
import { PermissionGate } from '../auth/PermissionGate';
import { loadAlertSettings, saveAlertSettings, playSingleAlertSound, AlertSettings } from '../../utils/alertManager';
import {
  loadExamDisplaySettings,
  saveExamDisplaySettings,
  ExamDisplaySettings,
} from '../../utils/examDisplaySettings';

interface ChronicItem {
  id: string;
  name: string;
  category: string;
  color: string;
}

interface SettingsScreenProps {
  presetChronicConditions?: ChronicItem[];
  onAddChronicCondition?: (item: ChronicItem) => void;
  onRemoveChronicCondition?: (id: string) => void;

  radiologyCatalog?: RadiologyCatalogItem[];
  onAddRadiology?: (item: RadiologyCatalogItem) => void;
  onRemoveRadiology?: (id: string) => void;
  onToggleRadiologyFavorite?: (id: string) => void;

  labCatalog?: LabCatalogItem[];
  onAddLab?: (item: LabCatalogItem) => void;
  onRemoveLab?: (id: string) => void;
  onToggleLabFavorite?: (id: string) => void;

  drugCatalog?: DrugCatalogItem[];
  onAddDrug?: (item: DrugCatalogItem) => void;
  onRemoveDrug?: (id: string) => void;
  onToggleDrugFavorite?: (id: string) => void;

  diagnosesCatalog?: DiagnosisCatalogItem[];
  onAddDiagnosis?: (item: DiagnosisCatalogItem) => void;
  onRemoveDiagnosis?: (id: string) => void;
  onToggleDiagnosisFavorite?: (id: string) => void;

  symptomsCatalog?: SymptomCatalogItem[];
  onAddSymptom?: (item: SymptomCatalogItem) => void;
  onRemoveSymptom?: (id: string) => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  presetChronicConditions = [],
  onAddChronicCondition = () => {},
  onRemoveChronicCondition = () => {},
  radiologyCatalog = [],
  onAddRadiology = () => {},
  onRemoveRadiology = () => {},
  onToggleRadiologyFavorite = () => {},
  labCatalog = [],
  onAddLab = () => {},
  onRemoveLab = () => {},
  onToggleLabFavorite = () => {},
  drugCatalog = [],
  onAddDrug = () => {},
  onRemoveDrug = () => {},
  onToggleDrugFavorite = () => {},
  diagnosesCatalog = [],
  onAddDiagnosis = () => {},
  onRemoveDiagnosis = () => {},
  onToggleDiagnosisFavorite = () => {},
  symptomsCatalog = [],
  onAddSymptom = () => {},
  onRemoveSymptom = () => {},
}) => {
  const { hasPermission, assertPermission } = usePermissions();
  const [activeSettingsSection, setActiveSettingsSection] = useState<'catalogs' | 'alerts' | 'general' | 'users'>('catalogs');
  const [clinicName, setClinicName] = useState(CLINIC_INFO.name);

  // If user cannot view users but tab was somehow selected, fallback to catalogs
  useEffect(() => {
    if (activeSettingsSection === 'users' && !hasPermission('users.view')) {
      setActiveSettingsSection('catalogs');
    }
  }, [activeSettingsSection, hasPermission]);

  const [phone, setPhone] = useState(CLINIC_INFO.branches[0]?.mobile || '01092847162');
  const [newVisitFee, setNewVisitFee] = useState(300);
  const [followupFee, setFollowupFee] = useState(150);
  const [freeFollowupDays, setFreeFollowupDays] = useState(14);
  const [printerPaper, setPrinterPaper] = useState('80mm');
  const [autoPrintReceipt, setAutoPrintReceipt] = useState(true);
  const [alertConfig, setAlertConfig] = useState<AlertSettings>(loadAlertSettings);
  const [examDisplayConfig, setExamDisplayConfig] = useState<ExamDisplaySettings>(loadExamDisplaySettings);
  const [savedToast, setSavedToast] = useState<string | null>(null);

  const updateExamDisplayConfig = (key: keyof ExamDisplaySettings, value: boolean) => {
    const updated = { ...examDisplayConfig, [key]: value };
    setExamDisplayConfig(updated);
    saveExamDisplaySettings(updated);
    const names: Record<keyof ExamDisplaySettings, string> = {
      showVitals: 'العلامات الحيوية',
      showLabs: 'التحاليل الطبية',
      showRadiology: 'الأشعة والتصوير',
    };
    setSavedToast(
      `تم تحديث شاشة الكشف: ${value ? 'إظهار' : 'إخفاء'} قسم ${names[key]} بنجاح ✓`
    );
    setTimeout(() => setSavedToast(null), 2500);
  };

  const updateAlertConfig = (key: keyof AlertSettings, value: boolean) => {
    const updated = { ...alertConfig, [key]: value };
    setAlertConfig(updated);
    saveAlertSettings(updated);
    setSavedToast(
      `تم تحديث التنبيهات: ${
        key === 'audioEnabled'
          ? value
            ? 'تشغيل الصوت العام ✓'
            : 'إيقاف الصوت العام ✕'
          : key === 'visualEnabled'
          ? value
            ? 'تشغيل التنبيه المرئي ✓'
            : 'إيقاف التنبيه المرئي ✕'
          : value
          ? 'تم تفعيل التنبيه'
          : 'تم إيقاف التنبيه'
      }`
    );
    setTimeout(() => setSavedToast(null), 2500);
  };

  const handleTestAlertSound = (type: 'new_visit' | 'call' | 'finish' = 'new_visit') => {
    if (alertConfig.audioEnabled) {
      playSingleAlertSound(type);
    }
    setSavedToast('🔔 تم إطلاق نغمة التنبيه لمرة واحدة للتجربة');
    setTimeout(() => setSavedToast(null), 3000);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      assertPermission('settings.edit', 'حفظ إعدادات العيادة العامة والأسعار');
      saveAlertSettings(alertConfig);
      setSavedToast('تم حفظ كافة إعدادات عيادات سولي وإعدادات التنبيهات بنجاح وتطبيقها');
      setTimeout(() => setSavedToast(null), 3500);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'ليس لديك صلاحية لتعديل الإعدادات العامة.');
    }
  };

  return (
    <div className="flex flex-col w-full min-w-0 max-w-full overflow-x-hidden pb-16 space-y-5 text-slate-800 dark:text-[#dde2f5]">
      {savedToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-[#18233C] border border-[#10B981] text-emerald-600 dark:text-[#10B981] px-6 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in">
          <span className="material-symbols-outlined text-2xl">check_circle</span>
          <span className="text-sm font-bold">{savedToast}</span>
        </div>
      )}

      {/* Top Header & Navigation Tabs */}
      <div className="min-w-0 max-w-full">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-[#859394] mb-1">
          <span>الرئيسية</span>
          <span>&gt;</span>
          <span className="text-[#008f97] dark:text-[#00c2cb]">إعدادات النظام والعيادة</span>
        </div>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 min-w-0">
          <h1 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-[#dde2f5] flex items-center gap-2.5 flex-wrap min-w-0">
            <span>إعدادات وأدلة عيادات سولي التخصصية</span>
            <span className="text-xs bg-[#00c2cb]/15 text-[#008f97] dark:text-[#45dee7] font-bold px-3 py-1 rounded-full border border-[#00c2cb]/20">
              صلاحية المدير والطبيب
            </span>
          </h1>

          {/* Clean 3 Navigation Tabs (Catalogs, Users, Clinic/Print) */}
          <div className="flex flex-wrap items-center gap-1.5 bg-white dark:bg-[#111A2E] p-1 rounded-2xl border border-slate-200 dark:border-white/5 shadow-2xs max-w-full overflow-x-auto min-w-0">
            <button
              type="button"
              onClick={() => setActiveSettingsSection('catalogs')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeSettingsSection === 'catalogs'
                  ? 'bg-[#00c2cb] text-slate-950 shadow-xs'
                  : 'text-slate-600 dark:text-[#859394] hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
            >
              <span className="material-symbols-outlined text-base">menu_book</span>
              <span>الأدلة الطبية (Medical Catalogs)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSettingsSection('alerts')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeSettingsSection === 'alerts'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-600 dark:text-[#859394] hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
            >
              <span className="material-symbols-outlined text-base">notifications_active</span>
              <span>نظام التنبيهات والأصوات</span>
            </button>

            <PermissionGate permission="users.view">
              <button
                type="button"
                onClick={() => setActiveSettingsSection('users')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeSettingsSection === 'users'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-[#859394] hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
              >
                <span className="material-symbols-outlined text-base">manage_accounts</span>
                <span>المستخدمون والصلاحيات</span>
              </button>
            </PermissionGate>

            <PermissionGate permission="settings.edit">
              <button
                type="button"
                onClick={() => setActiveSettingsSection('general')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeSettingsSection === 'general'
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                    : 'text-slate-600 dark:text-[#859394] hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
              >
                <span className="material-symbols-outlined text-base">tune</span>
                <span>بيانات العيادة والطباعة</span>
              </button>
            </PermissionGate>
          </div>
        </div>
      </div>

      {/* USER MANAGEMENT TAB */}
      {activeSettingsSection === 'users' && <UserManagementPanel />}

      {/* MEDICAL CATALOGS TAB (STACKED ACCORDIONS) */}
      {activeSettingsSection === 'catalogs' && (
        <MedicalCatalogsManager
          radiologyCatalog={radiologyCatalog}
          onAddRadiology={onAddRadiology}
          onRemoveRadiology={onRemoveRadiology}
          onToggleRadiologyFavorite={onToggleRadiologyFavorite}
          labCatalog={labCatalog}
          onAddLab={onAddLab}
          onRemoveLab={onRemoveLab}
          onToggleLabFavorite={onToggleLabFavorite}
          drugCatalog={drugCatalog}
          onAddDrug={onAddDrug}
          onRemoveDrug={onRemoveDrug}
          onToggleDrugFavorite={onToggleDrugFavorite}
          diagnosesCatalog={diagnosesCatalog}
          onAddDiagnosis={onAddDiagnosis}
          onRemoveDiagnosis={onRemoveDiagnosis}
          onToggleDiagnosisFavorite={onToggleDiagnosisFavorite}
          symptomsCatalog={symptomsCatalog}
          onAddSymptom={onAddSymptom}
          onRemoveSymptom={onRemoveSymptom}
          presetChronicConditions={presetChronicConditions}
          onAddChronicCondition={onAddChronicCondition}
          onRemoveChronicCondition={onRemoveChronicCondition}
        />
      )}

      {/* ALERTS & NOTIFICATIONS TAB */}
      {activeSettingsSection === 'alerts' && (
        <div className="bg-white dark:bg-[#111A2E] p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm space-y-6 max-w-4xl mx-auto w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-[#dde2f5] flex items-center gap-2.5">
                <span className="material-symbols-outlined text-amber-500 text-2xl">notifications_active</span>
                <span>إعدادات نظام التنبيهات والأصوات بالعيادة</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-[#859394] mt-1">
                تخصيص التنبيهات المرئية والصوتية للسكرتارية وغرفة الكشف. الصافرة تعمل مرة واحدة فقط عند كل إجراء.
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleTestAlertSound('new_visit')}
              className="px-4 py-2.5 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-md shadow-amber-500/20 active:scale-95 shrink-0"
            >
              <span className="material-symbols-outlined text-base">volume_up</span>
              <span>تجربة التنبيه والصوت الآن</span>
            </button>
          </div>

          {/* Master Toggles: Audio & Visual */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Audio Master */}
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-[#080e1b] border border-slate-200 dark:border-white/5 flex flex-col justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#008f97] dark:text-[#00c2cb]">volume_up</span>
                    التنبيه الصوتي (الصافرة والنغمات)
                  </span>
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      alertConfig.audioEnabled
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                    }`}
                  >
                    {alertConfig.audioEnabled ? 'الصوت مفعّل ✓' : 'الصوت متوقف ✕'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-[#859394] leading-relaxed">
                  يُصدر نغمة طبية هادئة لمرة واحدة فقط عند حدوث أي إجراء، ولا يتكرر تلقائياً لتفادي أي إزعاج.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-200/50 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => updateAlertConfig('audioEnabled', true)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    alertConfig.audioEnabled
                      ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-500/30'
                      : 'bg-white dark:bg-[#18233C] text-slate-700 dark:text-[#dde2f5] border border-slate-200 dark:border-white/10 hover:bg-slate-100'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">check_circle</span>
                  <span>تشغيل الصوت</span>
                </button>
                <button
                  type="button"
                  onClick={() => updateAlertConfig('audioEnabled', false)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    !alertConfig.audioEnabled
                      ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-500/30'
                      : 'bg-white dark:bg-[#18233C] text-slate-700 dark:text-[#dde2f5] border border-slate-200 dark:border-white/10 hover:bg-slate-100'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">cancel</span>
                  <span>إيقاف الصوت</span>
                </button>
              </div>
            </div>

            {/* Visual Master */}
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-[#080e1b] border border-slate-200 dark:border-white/5 flex flex-col justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#008f97] dark:text-[#00c2cb]">visibility</span>
                    التنبيه المرئي (اللافتة المنبثقة)
                  </span>
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      alertConfig.visualEnabled
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                    }`}
                  >
                    {alertConfig.visualEnabled ? 'المرئي مفعّل ✓' : 'المرئي متوقف ✕'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-[#859394] leading-relaxed">
                  يُظهر لافتة إشعار ملونة ومنبثقة أعلى الشاشة لتنبيه السكرتارية وغرفة الكشف فور حدوث الإجراء.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-200/50 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => updateAlertConfig('visualEnabled', true)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    alertConfig.visualEnabled
                      ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-500/30'
                      : 'bg-white dark:bg-[#18233C] text-slate-700 dark:text-[#dde2f5] border border-slate-200 dark:border-white/10 hover:bg-slate-100'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">check_circle</span>
                  <span>تشغيل التنبيه المرئي</span>
                </button>
                <button
                  type="button"
                  onClick={() => updateAlertConfig('visualEnabled', false)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    !alertConfig.visualEnabled
                      ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-500/30'
                      : 'bg-white dark:bg-[#18233C] text-slate-700 dark:text-[#dde2f5] border border-slate-200 dark:border-white/10 hover:bg-slate-100'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">cancel</span>
                  <span>إيقاف التنبيه المرئي</span>
                </button>
              </div>
            </div>
          </div>

          {/* Granular event controls */}
          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-[#dde2f5] flex items-center gap-2">
              <span className="material-symbols-outlined text-[#00c2cb] text-lg">checklist</span>
              <span>التحكم في التنبيهات عند كل حدث مستقل:</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Event 1 */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#080e1b] border border-slate-200 dark:border-white/5 space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-teal-500/15 text-[#008f97] dark:text-[#00c2cb] flex items-center justify-center font-bold text-sm">
                    1
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">إضافة زيارة جديدة</h4>
                    <p className="text-[10px] text-slate-500 dark:text-[#859394]">تسجيل مريض جديد بالانتظار</p>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-200/60 dark:border-white/5">
                  <label className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-[#111A2E] cursor-pointer">
                    <span className="text-xs text-slate-700 dark:text-[#dde2f5] flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-teal-600">volume_up</span>
                      تنبيه صوتي
                    </span>
                    <input
                      type="checkbox"
                      checked={alertConfig.newVisitAudio}
                      onChange={(e) => updateAlertConfig('newVisitAudio', e.target.checked)}
                      className="w-4 h-4 rounded text-[#00c2cb] accent-[#00c2cb] cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-[#111A2E] cursor-pointer">
                    <span className="text-xs text-slate-700 dark:text-[#dde2f5] flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-teal-600">visibility</span>
                      تنبيه مرئي (لافتة)
                    </span>
                    <input
                      type="checkbox"
                      checked={alertConfig.newVisitVisual}
                      onChange={(e) => updateAlertConfig('newVisitVisual', e.target.checked)}
                      className="w-4 h-4 rounded text-[#00c2cb] accent-[#00c2cb] cursor-pointer"
                    />
                  </label>
                </div>

                <button
                  type="button"
                  onClick={() => handleTestAlertSound('new_visit')}
                  className="w-full py-1.5 text-[11px] font-bold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 rounded-lg hover:bg-teal-100 transition-colors cursor-pointer"
                >
                  تجربة الصوت لمرة واحدة
                </button>
              </div>

              {/* Event 2 */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#080e1b] border border-slate-200 dark:border-white/5 space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center font-bold text-sm">
                    2
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">دخول مريض للكشف</h4>
                    <p className="text-[10px] text-slate-500 dark:text-[#859394]">نداء الدخول لغرفة الطبيب</p>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-200/60 dark:border-white/5">
                  <label className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-[#111A2E] cursor-pointer">
                    <span className="text-xs text-slate-700 dark:text-[#dde2f5] flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-amber-500">volume_up</span>
                      تنبيه صوتي
                    </span>
                    <input
                      type="checkbox"
                      checked={alertConfig.callPatientAudio}
                      onChange={(e) => updateAlertConfig('callPatientAudio', e.target.checked)}
                      className="w-4 h-4 rounded text-[#00c2cb] accent-[#00c2cb] cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-[#111A2E] cursor-pointer">
                    <span className="text-xs text-slate-700 dark:text-[#dde2f5] flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-amber-500">visibility</span>
                      تنبيه مرئي (لافتة)
                    </span>
                    <input
                      type="checkbox"
                      checked={alertConfig.callPatientVisual}
                      onChange={(e) => updateAlertConfig('callPatientVisual', e.target.checked)}
                      className="w-4 h-4 rounded text-[#00c2cb] accent-[#00c2cb] cursor-pointer"
                    />
                  </label>
                </div>

                <button
                  type="button"
                  onClick={() => handleTestAlertSound('call')}
                  className="w-full py-1.5 text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 rounded-lg hover:bg-amber-100 transition-colors cursor-pointer"
                >
                  تجربة الصوت لمرة واحدة
                </button>
              </div>

              {/* Event 3 */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#080e1b] border border-slate-200 dark:border-white/5 space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center font-bold text-sm">
                    3
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">انتهاء الكشف الطبي</h4>
                    <p className="text-[10px] text-slate-500 dark:text-[#859394]">إشعار السكرتارية بانتهاء الزيارة</p>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-200/60 dark:border-white/5">
                  <label className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-[#111A2E] cursor-pointer">
                    <span className="text-xs text-slate-700 dark:text-[#dde2f5] flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-emerald-600">volume_up</span>
                      تنبيه صوتي
                    </span>
                    <input
                      type="checkbox"
                      checked={alertConfig.finishExamAudio}
                      onChange={(e) => updateAlertConfig('finishExamAudio', e.target.checked)}
                      className="w-4 h-4 rounded text-[#00c2cb] accent-[#00c2cb] cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-[#111A2E] cursor-pointer">
                    <span className="text-xs text-slate-700 dark:text-[#dde2f5] flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-emerald-600">visibility</span>
                      تنبيه مرئي (لافتة)
                    </span>
                    <input
                      type="checkbox"
                      checked={alertConfig.finishExamVisual}
                      onChange={(e) => updateAlertConfig('finishExamVisual', e.target.checked)}
                      className="w-4 h-4 rounded text-[#00c2cb] accent-[#00c2cb] cursor-pointer"
                    />
                  </label>
                </div>

                <button
                  type="button"
                  onClick={() => handleTestAlertSound('finish')}
                  className="w-full py-1.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg hover:bg-emerald-100 transition-colors cursor-pointer"
                >
                  تجربة الصوت لمرة واحدة
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CLINIC DATA & PRINT SETTINGS TAB */}
      {activeSettingsSection === 'general' && (
        <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Column (8 Cols) */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            {/* Clinic Information */}
            <div className="bg-white dark:bg-[#111A2E] p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-white/5 shadow-xs space-y-4">
              <h2 className="text-sm font-bold text-slate-900 dark:text-[#dde2f5] flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-3">
                <span className="material-symbols-outlined text-[#008f97] dark:text-[#00c2cb] text-lg">domain</span>
                <span>1. هوية العيادة والبيانات الرسمية</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-600 dark:text-[#859394] block mb-1">اسم العيادة (عربي):</label>
                  <input
                    type="text"
                    value={clinicName}
                    onChange={(e) => setClinicName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/5 focus:outline-none focus:ring-1 focus:ring-[#00c2cb]"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-600 dark:text-[#859394] block mb-1">
                    رقم الهاتف الرسمي والواتساب:
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/5 font-mono focus:outline-none focus:ring-1 focus:ring-[#00c2cb]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs text-slate-600 dark:text-[#859394] block mb-1">عنوان الفرع الرئيسي:</label>
                  <input
                    type="text"
                    defaultValue="14 شارع جامعة الدول العربية - المهندسين - الجيزة"
                    className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/5 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Tariffs and Follow-up rules */}
            <div className="bg-white dark:bg-[#111A2E] p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-white/5 shadow-xs space-y-4">
              <h2 className="text-sm font-bold text-slate-900 dark:text-[#dde2f5] flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-3">
                <span className="material-symbols-outlined text-[#008f97] dark:text-[#00c2cb] text-lg">price_change</span>
                <span>2. تسعيرة الكشوفات ولائحة الاستشارات</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-slate-600 dark:text-[#859394] block mb-1">سعر الكشف الجديد (ج.م):</label>
                  <input
                    type="number"
                    value={newVisitFee}
                    onChange={(e) => setNewVisitFee(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/5 font-mono focus:outline-none focus:ring-1 focus:ring-[#00c2cb]"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-600 dark:text-[#859394] block mb-1">
                    سعر الاستشارة بعد المدة (ج.م):
                  </label>
                  <input
                    type="number"
                    value={followupFee}
                    onChange={(e) => setFollowupFee(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/5 font-mono focus:outline-none focus:ring-1 focus:ring-[#00c2cb]"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-600 dark:text-[#859394] block mb-1">
                    مدة الاستشارة المجانية (أيام):
                  </label>
                  <input
                    type="number"
                    value={freeFollowupDays}
                    onChange={(e) => setFreeFollowupDays(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/5 font-mono focus:outline-none focus:ring-1 focus:ring-[#00c2cb]"
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-[#859394]">
                طبقاً للائحة، أي زيارة متابعة خلال {freeFollowupDays} يوماً تكون بقيمة 0 ج.م تلقائياً.
              </p>
            </div>

            {/* Hardware & Printer Settings */}
            <div className="bg-white dark:bg-[#111A2E] p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-white/5 shadow-xs space-y-4">
              <h2 className="text-sm font-bold text-slate-900 dark:text-[#dde2f5] flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-3">
                <span className="material-symbols-outlined text-[#008f97] dark:text-[#00c2cb] text-lg">print</span>
                <span>3. إعدادات طابعات الإيصالات والروشتات</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-600 dark:text-[#859394] block mb-1">
                    مقاس ورق إيصالات الاستقبال:
                  </label>
                  <select
                    value={printerPaper}
                    onChange={(e) => setPrinterPaper(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/5 focus:outline-none cursor-pointer"
                  >
                    <option value="80mm">طابعة حرارية 80mm (Thermal POS)</option>
                    <option value="58mm">طابعة حرارية 58mm</option>
                    <option value="a4">طابعة عادية A4</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-2 sm:pt-6">
                  <input
                    type="checkbox"
                    id="autoPrint"
                    checked={autoPrintReceipt}
                    onChange={(e) => setAutoPrintReceipt(e.target.checked)}
                    className="w-4 h-4 rounded text-[#00c2cb] accent-[#00c2cb]"
                  />
                  <label htmlFor="autoPrint" className="text-xs text-slate-700 dark:text-[#dde2f5] cursor-pointer">
                    طباعة إيصال السداد تلقائياً عند تأكيد حضور المريض
                  </label>
                </div>
              </div>
            </div>

            {/* Card 4: Audio & Visual Notification Controls */}
            <div className="bg-white dark:bg-[#111A2E] p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-white/5 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-white/5 pb-3">
                <h2 className="text-sm font-bold text-slate-900 dark:text-[#dde2f5] flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-500 text-lg">notifications_active</span>
                  <span>4. نظام التنبيهات والأصوات (إشعار السكرتارية والعيادة)</span>
                </h2>
                <button
                  type="button"
                  onClick={() => handleTestAlertSound('new_visit')}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-400 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 self-start sm:self-auto border border-amber-500/30"
                >
                  <span className="material-symbols-outlined text-sm">volume_up</span>
                  <span>تجربة الصوت والتنبيه الآن</span>
                </button>
              </div>

              {/* Master Toggles: Audio & Visual */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Audio Master */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#080e1b] border border-slate-200 dark:border-white/5 flex flex-col justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-base text-[#008f97] dark:text-[#00c2cb]">volume_up</span>
                        التنبيه الصوتي (صافرة الكشف)
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          alertConfig.audioEnabled
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {alertConfig.audioEnabled ? 'الصوت يعمل ✓' : 'الصوت متوقف ✕'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-[#859394]">
                      يصدر نغمة طبية هادئة لمرة واحدة فقط عند كل حدث ولا يتكرر تلقائياً.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => updateAlertConfig('audioEnabled', !alertConfig.audioEnabled)}
                    className={`w-full py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      alertConfig.audioEnabled
                        ? 'bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 dark:text-rose-400 border border-rose-200 dark:border-rose-900/30'
                        : 'bg-[#00c2cb] hover:bg-[#45dee7] text-slate-950 shadow-xs'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">
                      {alertConfig.audioEnabled ? 'volume_off' : 'volume_up'}
                    </span>
                    <span>{alertConfig.audioEnabled ? 'إيقاف الصوت' : 'تشغيل الصوت'}</span>
                  </button>
                </div>

                {/* Visual Master */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#080e1b] border border-slate-200 dark:border-white/5 flex flex-col justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-base text-[#008f97] dark:text-[#00c2cb]">visibility</span>
                        التنبيه المرئي (اللافتة المنبثقة)
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          alertConfig.visualEnabled
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {alertConfig.visualEnabled ? 'المرئي يعمل ✓' : 'المرئي متوقف ✕'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-[#859394]">
                      إظهار شريط إشعار ملون أعلى الشاشة لتنبيه السكرتارية بالحدث.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => updateAlertConfig('visualEnabled', !alertConfig.visualEnabled)}
                    className={`w-full py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      alertConfig.visualEnabled
                        ? 'bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 dark:text-rose-400 border border-rose-200 dark:border-rose-900/30'
                        : 'bg-[#00c2cb] hover:bg-[#45dee7] text-slate-950 shadow-xs'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">
                      {alertConfig.visualEnabled ? 'visibility_off' : 'visibility'}
                    </span>
                    <span>{alertConfig.visualEnabled ? 'إيقاف التنبيه المرئي' : 'تشغيل التنبيه المرئي'}</span>
                  </button>
                </div>
              </div>

              {/* Event-by-event Controls */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-slate-700 dark:text-[#bbc9ca]">
                  التحكم في التنبيهات عند كل حدث:
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Event 1: New Visit */}
                  <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-[#080e1b]/80 border border-slate-200 dark:border-white/5 space-y-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-teal-500/15 text-[#008f97] dark:text-[#00c2cb] flex items-center justify-center font-bold text-xs">
                        1
                      </div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">إضافة زيارة جديدة</span>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60 dark:border-white/5">
                      <label className="flex items-center gap-1.5 cursor-pointer text-[11px]">
                        <input
                          type="checkbox"
                          checked={alertConfig.newVisitAudio}
                          onChange={(e) => updateAlertConfig('newVisitAudio', e.target.checked)}
                          className="rounded text-[#00c2cb] accent-[#00c2cb]"
                        />
                        <span>صوت 🔔</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer text-[11px]">
                        <input
                          type="checkbox"
                          checked={alertConfig.newVisitVisual}
                          onChange={(e) => updateAlertConfig('newVisitVisual', e.target.checked)}
                          className="rounded text-[#00c2cb] accent-[#00c2cb]"
                        />
                        <span>مرئي 👁️</span>
                      </label>
                    </div>
                  </div>

                  {/* Event 2: Call patient into exam */}
                  <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-[#080e1b]/80 border border-slate-200 dark:border-white/5 space-y-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-500 flex items-center justify-center font-bold text-xs">
                        2
                      </div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">دخول مريض للكشف</span>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60 dark:border-white/5">
                      <label className="flex items-center gap-1.5 cursor-pointer text-[11px]">
                        <input
                          type="checkbox"
                          checked={alertConfig.callPatientAudio}
                          onChange={(e) => updateAlertConfig('callPatientAudio', e.target.checked)}
                          className="rounded text-[#00c2cb] accent-[#00c2cb]"
                        />
                        <span>صوت 🔔</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer text-[11px]">
                        <input
                          type="checkbox"
                          checked={alertConfig.callPatientVisual}
                          onChange={(e) => updateAlertConfig('callPatientVisual', e.target.checked)}
                          className="rounded text-[#00c2cb] accent-[#00c2cb]"
                        />
                        <span>مرئي 👁️</span>
                      </label>
                    </div>
                  </div>

                  {/* Event 3: Finish exam */}
                  <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-[#080e1b]/80 border border-slate-200 dark:border-white/5 space-y-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-500 flex items-center justify-center font-bold text-xs">
                        3
                      </div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">انتهاء الكشف الطبي</span>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60 dark:border-white/5">
                      <label className="flex items-center gap-1.5 cursor-pointer text-[11px]">
                        <input
                          type="checkbox"
                          checked={alertConfig.finishExamAudio}
                          onChange={(e) => updateAlertConfig('finishExamAudio', e.target.checked)}
                          className="rounded text-[#00c2cb] accent-[#00c2cb]"
                        />
                        <span>صوت 🔔</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer text-[11px]">
                        <input
                          type="checkbox"
                          checked={alertConfig.finishExamVisual}
                          onChange={(e) => updateAlertConfig('finishExamVisual', e.target.checked)}
                          className="rounded text-[#00c2cb] accent-[#00c2cb]"
                        />
                        <span>مرئي 👁️</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 5: Examination Screen Display Customization (Vitals, Labs, Radiology) */}
            <div className="bg-white dark:bg-[#111A2E] p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-white/5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-white/5 pb-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-[#dde2f5] flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#008f97] dark:text-[#00c2cb] text-lg">view_carousel</span>
                    <span>5. تخصيص أقسام شاشة الكشف الطبي (عرض وإخفاء)</span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-[#859394] mt-0.5">
                    اختر الأقسام الطبية المطلوب إظهارها أو إخفاؤها داخل غرفة الكشف حسب متطلبات تخصص العيادة
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {/* Toggle 1: Vital Signs */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#080e1b] border border-slate-200 dark:border-white/5 flex flex-col justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-base text-teal-600">vital_signs</span>
                        العلامات الحيوية
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          examDisplayConfig.showVitals
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                            : 'bg-slate-200 dark:bg-white/10 text-slate-500'
                        }`}
                      >
                        {examDisplayConfig.showVitals ? 'معروض ✓' : 'مخفي ✕'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-[#859394]">
                      بطاقة قياس الضغط، النبض، الحرارة، والوزن
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => updateExamDisplayConfig('showVitals', !examDisplayConfig.showVitals)}
                    className={`w-full py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      examDisplayConfig.showVitals
                        ? 'bg-teal-600 hover:bg-teal-500 text-white shadow-xs'
                        : 'bg-slate-200 dark:bg-[#18233C] text-slate-600 dark:text-slate-400 hover:bg-slate-300'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">
                      {examDisplayConfig.showVitals ? 'visibility' : 'visibility_off'}
                    </span>
                    <span>{examDisplayConfig.showVitals ? 'معروض في الكشف (إخفاء)' : 'مخفي حالياً (إظهار)'}</span>
                  </button>
                </div>

                {/* Toggle 2: Labs */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#080e1b] border border-slate-200 dark:border-white/5 flex flex-col justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-base text-emerald-600">biotechnology</span>
                        التحاليل الطبية
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          examDisplayConfig.showLabs
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                            : 'bg-slate-200 dark:bg-white/10 text-slate-500'
                        }`}
                      >
                        {examDisplayConfig.showLabs ? 'معروض ✓' : 'مخفي ✕'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-[#859394]">
                      بطاقة طلب التحاليل المخبرية وتسجيل نتائج الفحوصات
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => updateExamDisplayConfig('showLabs', !examDisplayConfig.showLabs)}
                    className={`w-full py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      examDisplayConfig.showLabs
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
                        : 'bg-slate-200 dark:bg-[#18233C] text-slate-600 dark:text-slate-400 hover:bg-slate-300'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">
                      {examDisplayConfig.showLabs ? 'visibility' : 'visibility_off'}
                    </span>
                    <span>{examDisplayConfig.showLabs ? 'معروض في الكشف (إخفاء)' : 'مخفي حالياً (إظهار)'}</span>
                  </button>
                </div>

                {/* Toggle 3: Radiology */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#080e1b] border border-slate-200 dark:border-white/5 flex flex-col justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-base text-sky-600">radiology</span>
                        الأشعة والتصوير
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          examDisplayConfig.showRadiology
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                            : 'bg-slate-200 dark:bg-white/10 text-slate-500'
                        }`}
                      >
                        {examDisplayConfig.showRadiology ? 'معروض ✓' : 'مخفي ✕'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-[#859394]">
                      بطاقة طلب الأشعة السينية، السونار، والرنين
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => updateExamDisplayConfig('showRadiology', !examDisplayConfig.showRadiology)}
                    className={`w-full py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      examDisplayConfig.showRadiology
                        ? 'bg-sky-600 hover:bg-sky-500 text-white shadow-xs'
                        : 'bg-slate-200 dark:bg-[#18233C] text-slate-600 dark:text-slate-400 hover:bg-slate-300'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">
                      {examDisplayConfig.showRadiology ? 'visibility' : 'visibility_off'}
                    </span>
                    <span>{examDisplayConfig.showRadiology ? 'معروض في الكشف (إخفاء)' : 'مخفي حالياً (إظهار)'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Action / Save Sidebar (4 Cols) */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="bg-white dark:bg-[#111A2E] p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-white/5 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-[#dde2f5]">حفظ الإعدادات والتطبيق</h3>
              <p className="text-xs text-slate-500 dark:text-[#bbc9ca] leading-relaxed">
                سيتم تطبيق أي تعديل في تسعيرة الكشوفات أو أسماء الفروع فوراً على جميع شاشات الاستقبال والدرج وغرفة الكشف.
              </p>
              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-[#00c2cb] hover:bg-[#45dee7] text-[#08101C] font-bold text-xs shadow-md shadow-[#00c2cb]/20 transition-all cursor-pointer active:scale-95"
              >
                حفظ وتطبيق التغييرات
              </button>
            </div>

            <div className="bg-white dark:bg-[#111A2E] p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-white/5 shadow-xs space-y-3">
              <h3 className="text-xs font-bold text-slate-900 dark:text-[#dde2f5] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-emerald-600 text-base">cloud_sync</span>
                <span>النسخ الاحتياطي والأمان</span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-[#859394]">
                تطبيق عيادات سولي يعمل بنظام المزامنة السحابية الدورية. آخر نسخة احتياطية تمت اليوم الساعة 08:30 ص.
              </p>
              <button
                type="button"
                onClick={() => alert('تم تصدير نسخة احتياطية من قاعدة بيانات العيادة بنجاح')}
                className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-[#18233C] hover:bg-slate-200 dark:hover:bg-[#242a38] text-slate-800 dark:text-[#dde2f5] text-xs font-medium border border-slate-200 dark:border-white/5 transition-colors cursor-pointer"
              >
                تحميل نسخة احتياطية JSON
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};

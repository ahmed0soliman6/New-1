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
  const [activeSettingsSection, setActiveSettingsSection] = useState<'catalogs' | 'general' | 'users'>('catalogs');
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
  const [savedToast, setSavedToast] = useState<string | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      assertPermission('settings.edit', 'حفظ إعدادات العيادة العامة والأسعار');
      setSavedToast('تم حفظ كافة إعدادات عيادات سولي بنجاح وتطبيقها على المنظومة');
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
        />
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

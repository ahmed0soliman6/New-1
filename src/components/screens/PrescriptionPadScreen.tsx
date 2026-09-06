import React, { useState, useEffect } from 'react';
import { CLINIC_INFO } from '../../data/previewClinicData';
import { db } from '../../services/firebase';
import { saveSettingsDocument } from '../../services/repositories';
import { usePermissions } from '../../context/AuthContext';
import { PermissionGate } from '../auth/PermissionGate';

export interface PrescriptionLayoutSettings {
  doctorName: string;
  specialtyAr: string;
  specialtyEn: string;
  degreesAr: string;
  degreesEn: string;
  phone: string;
  logoUrl: string | null;
  showLogo: boolean;
  showHeader: boolean;
  showFooter: boolean;
  preprintedPaperMode: boolean;
  showQr: boolean;
  qrType: 'whatsapp' | 'custom';
  qrWhatsappPhone: string;
  qrCustomUrl: string;
  qrSize: 'small' | 'medium' | 'large'; // 14mm | 19mm | 25mm
  footerFontSize: 'small' | 'regular' | 'large'; // 8px | 10px | 12px
  outerMargin: 'very_tight' | 'tight' | 'normal' | 'wide' | 'very_wide'; // 2mm | 4mm | 7mm | 10mm | 14mm
  headerMarginTop: 'very_tight' | 'tight' | 'balanced' | 'wide' | 'very_wide'; // 2mm | 4mm | 7mm | 10mm | 14mm
  footerMarginBottom: 'very_tight' | 'tight' | 'balanced' | 'wide' | 'very_wide'; // 2mm | 4mm | 7mm | 10mm | 14mm
  sectionSpacing: 'compact' | 'balanced' | 'comfortable';
  contentScale: 'scale_70' | 'scale_100' | 'auto_shrink';
  branches: Array<{
    id: string;
    name: string;
    address?: string;
    phone: string;
    workingHours?: string;
  }>;
}

const DEFAULT_LAYOUT: PrescriptionLayoutSettings = {
  doctorName: CLINIC_INFO.doctorName,
  specialtyAr: CLINIC_INFO.doctorTitle,
  specialtyEn: 'Consultant of Internal Medicine & Cardiology',
  degreesAr: CLINIC_INFO.doctorCredentials,
  degreesEn: 'M.D., MRCP (London) • Cairo University',
  phone: CLINIC_INFO.branches[0]?.mobile || '01092847162',
  logoUrl: CLINIC_INFO.logoUrl || null,
  showLogo: true,
  showHeader: true,
  showFooter: true,
  preprintedPaperMode: false,
  showQr: true,
  qrType: 'whatsapp',
  qrWhatsappPhone: '01092847162',
  qrCustomUrl: 'https://solimedical.com',
  qrSize: 'medium',
  footerFontSize: 'regular',
  outerMargin: 'normal',
  headerMarginTop: 'balanced',
  footerMarginBottom: 'balanced',
  sectionSpacing: 'balanced',
  contentScale: 'auto_shrink',
  branches: [
    {
      id: 'b-1',
      name: 'الفرع الرئيسي - المهندسين',
      address: '24 شارع سوريا - تقاطع جزيرة العرب',
      phone: '02-37618920 / 01092847162',
      workingHours: 'السبت، الإثنين، الأربعاء 04:00 م - 10:00 م',
    },
    {
      id: 'b-2',
      name: 'فرع الدقي - مركز التحرير',
      address: '98 شارع التحرير - برج الأطباء',
      phone: '02-33385210 / 01124890014',
      workingHours: 'الأحد، الثلاثاء، الخميس 06:00 م - 11:30 م',
    },
  ],
};

const MARGIN_VALUES: Record<string, string> = {
  very_tight: '2mm',
  tight: '4mm',
  normal: '7mm',
  wide: '10mm',
  very_wide: '14mm',
  balanced: '7mm',
};

const QR_SIZE_PX: Record<string, number> = {
  small: 52, // ~14mm
  medium: 72, // ~19mm
  large: 95, // ~25mm
};

export const PrescriptionPadScreen: React.FC = () => {
  const { assertPermission } = usePermissions();
  const [config, setConfig] = useState<PrescriptionLayoutSettings>(DEFAULT_LAYOUT);
  const [activeTab, setActiveTab] = useState<'layout' | 'header' | 'qr' | 'branches'>('layout');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // New branch form
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchAddress, setNewBranchAddress] = useState('');
  const [newBranchPhone, setNewBranchPhone] = useState('');
  const [newBranchHours, setNewBranchHours] = useState('');
  const [showAddBranchModal, setShowAddBranchModal] = useState(false);

  const isValidUrl = (url: string) => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const getEffectiveQrLink = () => {
    if (config.qrType === 'whatsapp') {
      const clean = config.qrWhatsappPhone.replace(/\D/g, '');
      const formatted = clean.startsWith('0') ? `2${clean}` : clean;
      return `https://wa.me/${formatted}`;
    }
    return config.qrCustomUrl || 'https://solimedical.com';
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('png') && !file.type.includes('jpeg') && !file.type.includes('jpg')) {
      alert('يرجى اختيار صورة بتنسيق PNG أو JPG فقط');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setConfig((prev) => ({ ...prev, logoUrl: result, showLogo: true }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveSettings = async () => {
    try {
      assertPermission('settings.edit', 'حفظ إعدادات الروشتة والطباعة');
      setIsSaving(true);
      if (db) {
        await saveSettingsDocument(db, 'prescriptionSettings', config as unknown as Record<string, unknown>);
      }
      setToastMessage('تم حفظ إعدادات الروشتة والطباعة بنجاح');
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'تعذر حفظ الإعدادات');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName.trim()) return;

    const newBranch = {
      id: `branch-${Date.now()}`,
      name: newBranchName.trim(),
      address: newBranchAddress.trim() || undefined,
      phone: newBranchPhone.trim() || config.phone,
      workingHours: newBranchHours.trim() || undefined,
    };

    setConfig((prev) => ({
      ...prev,
      branches: [...prev.branches, newBranch],
    }));

    setNewBranchName('');
    setNewBranchAddress('');
    setNewBranchPhone('');
    setNewBranchHours('');
    setShowAddBranchModal(false);
  };

  const handleRemoveBranch = (id: string) => {
    setConfig((prev) => ({
      ...prev,
      branches: prev.branches.filter((b) => b.id !== id),
    }));
  };

  const handlePrintTest = () => {
    window.print();
  };

  const isCustomUrlValid = config.qrType === 'custom' ? isValidUrl(config.qrCustomUrl) : true;

  return (
    <div className="flex flex-col w-full pb-20 space-y-6 text-slate-800 dark:text-[#dde2f5]">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-[#18233C] border border-[#10B981] text-emerald-600 dark:text-[#10B981] px-6 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in">
          <span className="material-symbols-outlined text-2xl">check_circle</span>
          <span className="text-sm font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Top Banner & Main Actions */}
      <div className="bg-white dark:bg-[#111A2E] p-5 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-[#00c2cb]/15 text-[#008f97] dark:text-[#00c2cb] flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-2xl">print</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-[#dde2f5] flex items-center gap-2">
                <span>إعدادات الروشتة والطباعة (A5 Print Settings)</span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-[#859394] mt-0.5">
                التحكم المباشر في هوية ورأس الروشتة، الشعار، رمز QR، الهوامش، والفروع بدون إدخال بيانات طبية
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-center">
            <button
              type="button"
              onClick={handlePrintTest}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-[#18233C] text-slate-700 dark:text-[#dde2f5] hover:bg-slate-200 dark:hover:bg-white/10 text-xs font-bold transition-all cursor-pointer border border-slate-200 dark:border-white/5"
            >
              <span className="material-symbols-outlined text-base">print</span>
              <span>تجربة الطباعة الحية</span>
            </button>

            <PermissionGate permission="settings.edit">
              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#00c2cb] hover:bg-[#45dee7] text-[#08101C] text-xs font-bold shadow-md shadow-[#00c2cb]/20 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-base">save</span>
                <span>{isSaving ? 'جارٍ الحفظ...' : 'حفظ الإعدادات'}</span>
              </button>
            </PermissionGate>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="flex items-center gap-2 pt-4 mt-4 border-t border-slate-100 dark:border-white/5 overflow-x-auto text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('layout')}
            className={`px-3.5 py-2 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'layout'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-[#859394] hover:bg-slate-100 dark:hover:bg-white/5'
            }`}
          >
            <span className="material-symbols-outlined text-base">dashboard_customize</span>
            <span>الهوامش والأبعاد والتنسيق</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('header')}
            className={`px-3.5 py-2 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'header'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-[#859394] hover:bg-slate-100 dark:hover:bg-white/5'
            }`}
          >
            <span className="material-symbols-outlined text-base">badge</span>
            <span>بيانات الطبيب والشعار</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('qr')}
            className={`px-3.5 py-2 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'qr'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-[#859394] hover:bg-slate-100 dark:hover:bg-white/5'
            }`}
          >
            <span className="material-symbols-outlined text-base">qr_code_2</span>
            <span>رمز الاستجابة السريعة (QR Code)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('branches')}
            className={`px-3.5 py-2 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'branches'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-[#859394] hover:bg-slate-100 dark:hover:bg-white/5'
            }`}
          >
            <span className="material-symbols-outlined text-base">apartment</span>
            <span>فروع العيادة بالتذييل</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Settings Controls (Left 5 Cols) + Live Interactive A5 Canvas (Right 7 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Settings Controls Panel */}
        <div className="lg:col-span-5 space-y-5">
          {/* TAB 1: Layout & Margins */}
          {activeTab === 'layout' && (
            <div className="bg-white dark:bg-[#111A2E] p-5 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm space-y-4 text-xs">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-2.5">
                <span className="material-symbols-outlined text-teal-600 dark:text-[#00c2cb] text-lg">aspect_ratio</span>
                <span>تنسيق الصفحة والهوامش</span>
              </h3>

              {/* Pre-printed Paper Mode Toggle */}
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 space-y-2">
                <label className="flex items-center gap-2.5 cursor-pointer font-bold text-amber-900 dark:text-amber-300">
                  <input
                    type="checkbox"
                    checked={config.preprintedPaperMode}
                    onChange={(e) => setConfig({ ...config, preprintedPaperMode: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-600 accent-amber-600 focus:ring-0"
                  />
                  <span>وضع الورق المطبوع مسبقاً (المحتوى الطبي فقط)</span>
                </label>
                <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed pr-6">
                  عند تفعيل هذا الخيار، يتم إخفاء الرأس والتذييل تلقائياً لطباعة المحتوى الطبي فقط على الورق المطبوع مسبقاً للعيادة.
                </p>
              </div>

              {/* Header & Footer Toggles */}
              {!config.preprintedPaperMode && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-[#18233C] border border-slate-200 dark:border-white/5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.showHeader}
                      onChange={(e) => setConfig({ ...config, showHeader: e.target.checked })}
                      className="w-4 h-4 rounded text-[#00c2cb] accent-[#00c2cb]"
                    />
                    <span className="font-bold">إظهار رأس الروشتة</span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-[#18233C] border border-slate-200 dark:border-white/5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.showFooter}
                      onChange={(e) => setConfig({ ...config, showFooter: e.target.checked })}
                      className="w-4 h-4 rounded text-[#00c2cb] accent-[#00c2cb]"
                    />
                    <span className="font-bold">إظهار تذييل الروشتة</span>
                  </label>
                </div>
              )}

              {/* Outer Margins */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-[#bbc9ca]">
                  الهوامش الخارجية للصفحة (Outer Margins)
                </label>
                <select
                  value={config.outerMargin}
                  onChange={(e) => setConfig({ ...config, outerMargin: e.target.value as unknown as PrescriptionLayoutSettings['outerMargin'] })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#18233C] border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white font-medium"
                >
                  <option value="very_tight">شديدة الضيق (2 مم)</option>
                  <option value="tight">ضيقة (4 مم)</option>
                  <option value="normal">عادية قياسية (7 مم)</option>
                  <option value="wide">واسعة (10 مم)</option>
                  <option value="very_wide">شديدة الاتساع (14 مم)</option>
                </select>
              </div>

              {/* Header Top Margin */}
              {!config.preprintedPaperMode && config.showHeader && (
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-[#bbc9ca]">
                    الهامش العلوي للرأس (Header Top Clearance)
                  </label>
                  <select
                    value={config.headerMarginTop}
                    onChange={(e) => setConfig({ ...config, headerMarginTop: e.target.value as unknown as PrescriptionLayoutSettings['headerMarginTop'] })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#18233C] border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white font-medium"
                  >
                    <option value="very_tight">شديد الضيق (2 مم)</option>
                    <option value="tight">ضيق (4 مم)</option>
                    <option value="balanced">متوازن (7 مم)</option>
                    <option value="wide">واسع (10 مم)</option>
                    <option value="very_wide">شديد الاتساع (14 مم)</option>
                  </select>
                </div>
              )}

              {/* Footer Bottom Margin */}
              {!config.preprintedPaperMode && config.showFooter && (
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-[#bbc9ca]">
                    الهامش السفلي للتذييل (Footer Bottom Clearance)
                  </label>
                  <select
                    value={config.footerMarginBottom}
                    onChange={(e) => setConfig({ ...config, footerMarginBottom: e.target.value as unknown as PrescriptionLayoutSettings['footerMarginBottom'] })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#18233C] border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white font-medium"
                  >
                    <option value="very_tight">شديد الضيق (2 مم)</option>
                    <option value="tight">ضيق (4 مم)</option>
                    <option value="balanced">متوازن (7 مم)</option>
                    <option value="wide">واسع (10 مم)</option>
                    <option value="very_wide">شديد الاتساع (14 مم)</option>
                  </select>
                </div>
              )}

              {/* Section Spacing */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-[#bbc9ca]">
                  التباعد بين الأقسام (Section Spacing)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['compact', 'balanced', 'comfortable'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setConfig({ ...config, sectionSpacing: mode })}
                      className={`py-2 rounded-xl border text-center font-bold transition-all ${
                        config.sectionSpacing === mode
                          ? 'bg-teal-50 dark:bg-[#00c2cb]/20 border-teal-500 text-teal-800 dark:text-[#45dee7]'
                          : 'border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#18233C] text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {mode === 'compact' ? 'مضغوط' : mode === 'balanced' ? 'متوازن' : 'مريح'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Footer Font Size */}
              {!config.preprintedPaperMode && config.showFooter && (
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-[#bbc9ca]">
                    حجم خط تذييل الروشتة (Footer Font Size)
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['small', 'regular', 'large'] as const).map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => setConfig({ ...config, footerFontSize: sz })}
                        className={`py-2 rounded-xl border text-center font-bold transition-all ${
                          config.footerFontSize === sz
                            ? 'bg-teal-50 dark:bg-[#00c2cb]/20 border-teal-500 text-teal-800 dark:text-[#45dee7]'
                            : 'border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#18233C] text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {sz === 'small' ? 'صغير (8px)' : sz === 'regular' ? 'عادي (10px)' : 'كبير (12px)'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Content Scaling */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-[#bbc9ca]">
                  حجم المحتوى والتصغير التلقائي (Auto Shrink)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['scale_70', 'scale_100', 'auto_shrink'] as const).map((sc) => (
                    <button
                      key={sc}
                      type="button"
                      onClick={() => setConfig({ ...config, contentScale: sc })}
                      className={`py-2 rounded-xl border text-center font-bold transition-all ${
                        config.contentScale === sc
                          ? 'bg-teal-50 dark:bg-[#00c2cb]/20 border-teal-500 text-teal-800 dark:text-[#45dee7]'
                          : 'border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#18233C] text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {sc === 'scale_70' ? '70% مكثف' : sc === 'scale_100' ? '100% قياسي' : 'تصغير تلقائي'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Doctor Info & Logo */}
          {activeTab === 'header' && (
            <div className="bg-white dark:bg-[#111A2E] p-5 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm space-y-4 text-xs">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-2.5">
                <span className="material-symbols-outlined text-teal-600 dark:text-[#00c2cb] text-lg">person_pin</span>
                <span>بيانات الطبيب وشعار العيادة</span>
              </h3>

              {/* Doctor Name */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-[#bbc9ca]">اسم الطبيب (عربي)</label>
                <input
                  type="text"
                  value={config.doctorName}
                  onChange={(e) => setConfig({ ...config, doctorName: e.target.value })}
                  placeholder="د. حازم سمير القاضي"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#18233C] border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white font-medium"
                />
              </div>

              {/* Specialty Top (AR) */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-[#bbc9ca]">التخصص المكتوب أعلى الروشتة (عربي)</label>
                <input
                  type="text"
                  value={config.specialtyAr}
                  onChange={(e) => setConfig({ ...config, specialtyAr: e.target.value })}
                  placeholder="استشاري الباطنة والقلب والسكر"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#18233C] border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white font-medium"
                />
              </div>

              {/* Specialty Top (EN) */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-[#bbc9ca]">التخصص بالإنجليزية (English Title)</label>
                <input
                  type="text"
                  value={config.specialtyEn}
                  onChange={(e) => setConfig({ ...config, specialtyEn: e.target.value })}
                  placeholder="Consultant of Internal Medicine & Cardiology"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#18233C] border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white font-medium text-left"
                  dir="ltr"
                />
              </div>

              {/* Degrees (AR) */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-[#bbc9ca]">المؤهلات والدرجات العلمية (عربي)</label>
                <input
                  type="text"
                  value={config.degreesAr}
                  onChange={(e) => setConfig({ ...config, degreesAr: e.target.value })}
                  placeholder="دكتوراه الباطنة العامة - جامعة القاهرة • زميل الكلية الملكية للأطباء"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#18233C] border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white font-medium"
                />
              </div>

              {/* Contact Phone */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-[#bbc9ca]">رقم التواصل المكتوب بالروشتة</label>
                <input
                  type="text"
                  value={config.phone}
                  onChange={(e) => setConfig({ ...config, phone: e.target.value })}
                  placeholder="01092847162"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#18233C] border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white font-mono"
                />
              </div>

              {/* Clinic Logo */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-white/5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 dark:text-[#bbc9ca]">شعار العيادة (Clinic Logo)</label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold">
                    <input
                      type="checkbox"
                      checked={config.showLogo}
                      onChange={(e) => setConfig({ ...config, showLogo: e.target.checked })}
                      className="w-3.5 h-3.5 rounded text-[#00c2cb] accent-[#00c2cb]"
                    />
                    <span>إظهار الشعار بالروشتة</span>
                  </label>
                </div>

                <div className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 dark:bg-[#18233C] border border-slate-200 dark:border-white/5">
                  {config.logoUrl ? (
                    <div className="relative group shrink-0">
                      <img
                        src={config.logoUrl}
                        alt="شعار العيادة"
                        className="w-14 h-14 object-contain rounded-xl bg-white p-1 border border-slate-200 shadow-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setConfig({ ...config, logoUrl: null })}
                        className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-xs shadow-md"
                        title="حذف الشعار"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-slate-200 dark:bg-white/10 text-slate-400 flex flex-col items-center justify-center text-[10px] text-center p-1 font-medium">
                      <span>لا يوجد شعار</span>
                    </div>
                  )}

                  <div className="flex-1 space-y-1.5">
                    <label className="inline-block px-3 py-1.5 rounded-lg bg-teal-50 dark:bg-[#00c2cb]/20 text-teal-800 dark:text-[#45dee7] font-bold text-xs cursor-pointer hover:bg-teal-100 dark:hover:bg-[#00c2cb]/30 transition-all">
                      <span>رفع شعار جديد (PNG / JPG)</span>
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/jpg"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      يفضل استخدام شعار بخلفية شفافة PNG وأبعاد مربعة 512×512
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: QR Code */}
          {activeTab === 'qr' && (
            <div className="bg-white dark:bg-[#111A2E] p-5 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm space-y-4 text-xs">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-2.5">
                <span className="material-symbols-outlined text-teal-600 dark:text-[#00c2cb] text-lg">qr_code_scanner</span>
                <span>إعدادات رمز الاستجابة السريعة (QR Code)</span>
              </h3>

              {/* Show QR Toggle */}
              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-teal-50 dark:bg-[#00c2cb]/10 border border-teal-200 dark:border-[#00c2cb]/20 cursor-pointer font-bold text-teal-900 dark:text-[#45dee7]">
                <input
                  type="checkbox"
                  checked={config.showQr}
                  onChange={(e) => setConfig({ ...config, showQr: e.target.checked })}
                  className="w-4 h-4 rounded text-[#00c2cb] accent-[#00c2cb]"
                />
                <span>☑ إظهار QR Code في الروشتة المطبوعة</span>
              </label>

              {config.showQr && (
                <div className="space-y-4 pt-1">
                  {/* QR Link Type */}
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700 dark:text-[#bbc9ca]">نوع الرابط الموجه إليه الـ QR</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setConfig({ ...config, qrType: 'whatsapp' })}
                        className={`py-2 px-3 rounded-xl border font-bold flex items-center justify-center gap-1.5 transition-all ${
                          config.qrType === 'whatsapp'
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500 text-emerald-800 dark:text-emerald-300'
                            : 'border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#18233C] text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <span className="material-symbols-outlined text-sm">chat</span>
                        <span>محادثة WhatsApp</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setConfig({ ...config, qrType: 'custom' })}
                        className={`py-2 px-3 rounded-xl border font-bold flex items-center justify-center gap-1.5 transition-all ${
                          config.qrType === 'custom'
                            ? 'bg-teal-50 dark:bg-[#00c2cb]/20 border-teal-500 text-teal-800 dark:text-[#45dee7]'
                            : 'border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#18233C] text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <span className="material-symbols-outlined text-sm">link</span>
                        <span>رابط خارجي مخصص</span>
                      </button>
                    </div>
                  </div>

                  {/* Input based on type */}
                  {config.qrType === 'whatsapp' ? (
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 dark:text-[#bbc9ca]">
                        رقم WhatsApp للعيادة أو الاستقبال
                      </label>
                      <input
                        type="text"
                        value={config.qrWhatsappPhone}
                        onChange={(e) => setConfig({ ...config, qrWhatsappPhone: e.target.value })}
                        placeholder="01092847162"
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#18233C] border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white font-mono"
                      />
                      <p className="text-[10px] text-slate-500">
                        الرابط المتولد: <span className="font-mono text-teal-600 dark:text-[#45dee7]">{getEffectiveQrLink()}</span>
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-slate-700 dark:text-[#bbc9ca]">الرابط الخارجي (URL)</label>
                        {!isCustomUrlValid && (
                          <span className="text-[10px] font-bold text-rose-500">رابط غير صالح (يجب أن يبدأ بـ http:// أو https://)</span>
                        )}
                      </div>
                      <input
                        type="url"
                        value={config.qrCustomUrl}
                        onChange={(e) => setConfig({ ...config, qrCustomUrl: e.target.value })}
                        placeholder="https://solimedical.com"
                        className={`w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#18233C] border text-slate-800 dark:text-white font-mono text-left ${
                          isCustomUrlValid ? 'border-slate-200 dark:border-white/10' : 'border-rose-500 focus:border-rose-500'
                        }`}
                        dir="ltr"
                      />
                    </div>
                  )}

                  {/* QR Size */}
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700 dark:text-[#bbc9ca]">حجم الـ QR المطبوع</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['small', 'medium', 'large'] as const).map((sz) => (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => setConfig({ ...config, qrSize: sz })}
                          className={`py-2 rounded-xl border text-center font-bold transition-all ${
                            config.qrSize === sz
                              ? 'bg-teal-50 dark:bg-[#00c2cb]/20 border-teal-500 text-teal-800 dark:text-[#45dee7]'
                              : 'border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#18233C] text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {sz === 'small' ? 'صغير (14 مم)' : sz === 'medium' ? 'متوسط (19 مم)' : 'كبير (25 مم)'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Branches */}
          {activeTab === 'branches' && (
            <div className="bg-white dark:bg-[#111A2E] p-5 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-2.5">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-teal-600 dark:text-[#00c2cb] text-lg">apartment</span>
                  <span>فروع العيادة في التذييل</span>
                </h3>

                <button
                  type="button"
                  onClick={() => setShowAddBranchModal(true)}
                  className="px-2.5 py-1.5 rounded-lg bg-teal-50 dark:bg-[#00c2cb]/20 text-teal-800 dark:text-[#45dee7] font-bold text-xs flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                  <span>إضافة فرع</span>
                </button>
              </div>

              <div className="space-y-2.5">
                {config.branches.map((branch, idx) => (
                  <div
                    key={branch.id || idx}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-[#18233C] border border-slate-200 dark:border-white/5 flex items-start justify-between gap-2"
                  >
                    <div className="space-y-1">
                      <div className="font-bold text-slate-900 dark:text-white">{branch.name}</div>
                      {branch.address && <div className="text-[11px] text-slate-500 dark:text-slate-400">{branch.address}</div>}
                      <div className="text-[11px] text-teal-700 dark:text-[#45dee7] font-mono">{branch.phone}</div>
                      {branch.workingHours && (
                        <div className="text-[10px] text-slate-400">{branch.workingHours}</div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveBranch(branch.id)}
                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all cursor-pointer"
                      title="حذف الفرع"
                    >
                      <span className="material-symbols-outlined text-base">delete</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Live A5 Canvas Preview Panel (Right 7 Cols) */}
        <div className="lg:col-span-7 flex flex-col items-center">
          <div className="w-full flex items-center justify-between mb-2 px-1 text-xs">
            <span className="font-bold text-slate-700 dark:text-[#dde2f5] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[#00c2cb] text-base">visibility</span>
              <span>معاينة حية لشكل الروشتة (A5 Live Preview)</span>
            </span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300">
              148mm × 210mm
            </span>
          </div>

          {/* A5 Simulated Sheet */}
          <div
            id="printable-prescription-pad"
            style={{
              padding: MARGIN_VALUES[config.outerMargin] || '7mm',
              paddingTop: config.preprintedPaperMode ? '25mm' : MARGIN_VALUES[config.headerMarginTop] || '7mm',
              paddingBottom: config.preprintedPaperMode ? '20mm' : MARGIN_VALUES[config.footerMarginBottom] || '7mm',
            }}
            className="w-full max-w-[560px] bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-300 min-h-[680px] flex flex-col justify-between transition-all print:m-0 print:border-none print:shadow-none print:w-full print:max-w-none"
          >
            {/* Header Area */}
            {!config.preprintedPaperMode && config.showHeader ? (
              <div className="border-b-2 border-[#00c2cb] pb-3">
                <div className="flex items-start justify-between gap-3">
                  {/* Arabic Doctor Info */}
                  <div className="text-right flex-1">
                    <h2 className="text-base font-bold text-slate-950 leading-tight">
                      {config.doctorName || CLINIC_INFO.doctorName}
                    </h2>
                    <div className="text-xs font-bold text-[#008f97] mt-0.5">
                      {config.specialtyAr || CLINIC_INFO.doctorTitle}
                    </div>
                    <div className="text-[10px] text-slate-600 leading-snug mt-0.5">
                      {config.degreesAr || CLINIC_INFO.doctorCredentials}
                    </div>
                  </div>

                  {/* Logo Center */}
                  {config.showLogo && (
                    <div className="flex flex-col items-center shrink-0">
                      {config.logoUrl ? (
                        <img
                          src={config.logoUrl}
                          alt="Clinic Logo"
                          className="w-12 h-12 object-contain"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-slate-950 text-[#00c2cb] flex items-center justify-center font-bold">
                          <span className="material-symbols-outlined text-xl">medical_services</span>
                        </div>
                      )}
                      <span className="text-[8px] font-bold text-slate-400 mt-0.5 uppercase tracking-wider">
                        SOLI CLINIC
                      </span>
                    </div>
                  )}

                  {/* English Info */}
                  <div className="text-left flex-1 hidden sm:block" dir="ltr">
                    <h2 className="text-sm font-bold text-slate-950 leading-tight">
                      Dr. Hazem El-Kady
                    </h2>
                    <div className="text-[11px] font-bold text-[#008f97] mt-0.5">
                      {config.specialtyEn}
                    </div>
                    <div className="text-[10px] text-slate-600 leading-snug mt-0.5">
                      {config.degreesEn}
                    </div>
                  </div>
                </div>
              </div>
            ) : config.preprintedPaperMode ? (
              <div className="text-center text-[10px] text-amber-700 bg-amber-50/60 rounded-md py-1 border border-dashed border-amber-300 print:hidden mb-2">
                وضع الورق المطبوع مسبقاً: مساحة فارغة في الأعلى للرأس
              </div>
            ) : null}

            {/* Patient Meta Strip (Preview Mock for layout inspection) */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 my-2.5 text-[11px] flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-600">اسم المريض:</span>
                <span className="font-bold text-slate-900">أحمد محمد الشناوي</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-600">السن:</span>
                <span className="font-bold text-slate-900">38 سنة</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-600">التاريخ:</span>
                <span className="font-mono text-slate-900">{new Date().toLocaleDateString('ar-EG')}</span>
              </div>
            </div>

            {/* Prescription Body Mock */}
            <div
              className={`flex-1 space-y-2.5 py-1 ${
                config.sectionSpacing === 'compact'
                  ? 'space-y-1.5'
                  : config.sectionSpacing === 'comfortable'
                  ? 'space-y-4'
                  : 'space-y-2.5'
              }`}
            >
              <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
                <span className="text-2xl font-serif font-black text-[#008f97] italic">℞</span>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">العلاج الموصوف</span>
              </div>

              {/* Sample Items for Layout Preview */}
              <div className="space-y-2">
                <div className="p-2 rounded-lg bg-slate-50/80 border border-slate-100 flex items-start justify-between gap-2 text-xs">
                  <div>
                    <div className="font-bold text-slate-900">1. Nexium 40 mg Tab. (Esomeprazole)</div>
                    <div className="text-[11px] text-teal-700 font-medium">قرص واحد قبل الإفطار بنصف ساعة • لمدة 30 يوماً</div>
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-slate-50/80 border border-slate-100 flex items-start justify-between gap-2 text-xs">
                  <div>
                    <div className="font-bold text-slate-900">2. Concor 5 Plus Tab. (Bisoprolol / HCTZ)</div>
                    <div className="text-[11px] text-teal-700 font-medium">قرص واحد صباحاً بعد الإفطار • مستمر</div>
                  </div>
                </div>
              </div>

              {/* Sample Advice */}
              <div className="p-2 rounded-lg bg-teal-50/40 border border-teal-100 text-[10px] text-teal-900 leading-relaxed">
                <span className="font-bold">تعليمات طبية:</span> تجنب الأطعمة الدسمة والمقليات، وممارسة رياضة المشي 30 دقيقة يومياً.
              </div>
            </div>

            {/* Footer Area */}
            {!config.preprintedPaperMode && config.showFooter ? (
              <div className="border-t-2 border-[#00c2cb] pt-2.5 mt-2">
                <div className="flex items-end justify-between gap-3">
                  {/* Branches & Info */}
                  <div
                    className={`flex-1 space-y-1 ${
                      config.footerFontSize === 'small'
                        ? 'text-[8px]'
                        : config.footerFontSize === 'large'
                        ? 'text-[11px]'
                        : 'text-[9.5px]'
                    } text-slate-600`}
                  >
                    {config.branches.map((b, i) => (
                      <div key={b.id || i} className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-900">{b.name}:</span>
                        <span>{b.address || ''}</span>
                        <span className="font-mono text-teal-700 font-bold">{b.phone}</span>
                      </div>
                    ))}
                    <div className="text-slate-500 pt-0.5">
                      رقم الحجز والاستعلام: <span className="font-mono font-bold text-slate-800">{config.phone}</span>
                    </div>
                  </div>

                  {/* QR Code Render in Footer */}
                  {config.showQr && (
                    <div className="flex flex-col items-center shrink-0">
                      <div
                        style={{
                          width: `${QR_SIZE_PX[config.qrSize] || 72}px`,
                          height: `${QR_SIZE_PX[config.qrSize] || 72}px`,
                        }}
                        className="bg-white p-1 rounded-lg border border-slate-300 shadow-xs flex items-center justify-center"
                      >
                        {/* High Quality Standard QR SVG Icon with target payload */}
                        <svg
                          viewBox="0 0 100 100"
                          className="w-full h-full text-slate-900"
                          fill="currentColor"
                        >
                          <path d="M10 10h30v30h-30zM15 15v20h20v-20zM22 22h6v6h-6zM60 10h30v30h-30zM65 15v20h20v-20zM72 22h6v6h-6zM10 60h30v30h-30zM15 65v20h20v-20zM22 72h6v6h-6zM60 60h10v10h-10zM80 60h10v10h-10zM70 70h10v10h-10zM60 80h10v10h-10zM80 80h10v10h-10zM45 10h10v80h-10z" />
                        </svg>
                      </div>
                      <span className="text-[7.5px] font-bold text-slate-500 mt-0.5">
                        {config.qrType === 'whatsapp' ? 'واتساب العيادة' : 'موقع العيادة'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : config.preprintedPaperMode ? (
              <div className="text-center text-[10px] text-amber-700 bg-amber-50/60 rounded-md py-1 border border-dashed border-amber-300 print:hidden mt-2">
                وضع الورق المطبوع مسبقاً: مساحة فارغة في الأسفل للتذييل
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Add Branch Modal */}
      {showAddBranchModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-white/10 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-teal-600">apartment</span>
              <span>إضافة فرع عيادة جديد</span>
            </h3>

            <form onSubmit={handleAddBranch} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">اسم الفرع *</label>
                <input
                  type="text"
                  required
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  placeholder="فرع مصر الجديدة"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#18233C] border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">العنوان</label>
                <input
                  type="text"
                  value={newBranchAddress}
                  onChange={(e) => setNewBranchAddress(e.target.value)}
                  placeholder="شارع الأهرام - روكسي"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#18233C] border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">رقم الهاتف للتواصل</label>
                <input
                  type="text"
                  value={newBranchPhone}
                  onChange={(e) => setNewBranchPhone(e.target.value)}
                  placeholder="0100 123 4567"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#18233C] border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">مواعيد العمل</label>
                <input
                  type="text"
                  value={newBranchHours}
                  onChange={(e) => setNewBranchHours(e.target.value)}
                  placeholder="السبت والثلاثاء 05:00 م - 09:00 م"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#18233C] border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setShowAddBranchModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#00c2cb] hover:bg-[#45dee7] text-slate-950 font-bold"
                >
                  إضافة الفرع
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

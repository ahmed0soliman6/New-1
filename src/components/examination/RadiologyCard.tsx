import React, { useState } from 'react';
import { RadiologyCatalogItem, RadiologyOrderItem, RadiologyStatus } from '../../types';

interface RadiologyCardProps {
  radiologyOrders: RadiologyOrderItem[];
  onChangeOrders: (orders: RadiologyOrderItem[]) => void;
  radiologyCatalog: RadiologyCatalogItem[];
  onAddRadiologyToCatalog: (item: RadiologyCatalogItem) => void;
}

export const RadiologyCard: React.FC<RadiologyCardProps> = ({
  radiologyOrders,
  onChangeOrders,
  radiologyCatalog,
  onAddRadiologyToCatalog,
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newScanName, setNewScanName] = useState('');
  const [newScanCategory, setNewScanCategory] = useState('موجات صوتية (Ultrasound)');
  const [saveToCatalog, setSaveToCatalog] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');

  // Add existing item from catalog to active patient orders
  const handleAddFromCatalog = (item: RadiologyCatalogItem) => {
    // Check if already ordered
    if (radiologyOrders.some((o) => o.name === item.name)) {
      return;
    }
    const newOrder: RadiologyOrderItem = {
      id: `rad-ord-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      radiologyId: item.id,
      name: item.name,
      category: item.category,
      status: 'REQUEST',
      orderedAt: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      notes: '',
    };
    onChangeOrders([...radiologyOrders, newOrder]);
    setShowPicker(false);
  };

  // Add completely new custom radiology scan during exam
  const handleAddNewCustomScan = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newScanName.trim();
    if (!trimmed) return;

    // 1. If saveToCatalog checked, add to general catalog
    if (saveToCatalog) {
      onAddRadiologyToCatalog({
        id: `rad-cat-${Date.now()}`,
        name: trimmed,
        category: newScanCategory,
        isFavorite: true,
      });
    }

    // 2. Add directly to patient's active orders with status 'REQUEST'
    const newOrder: RadiologyOrderItem = {
      id: `rad-ord-${Date.now()}`,
      name: trimmed,
      category: newScanCategory,
      status: 'REQUEST',
      orderedAt: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      notes: '',
    };
    onChangeOrders([...radiologyOrders, newOrder]);

    setNewScanName('');
    setShowAddModal(false);
  };

  const handleUpdateOrderStatus = (id: string, newStatus: RadiologyStatus) => {
    onChangeOrders(
      radiologyOrders.map((ord) => {
        if (ord.id === id) {
          return {
            ...ord,
            status: newStatus,
            resultAt: newStatus !== 'REQUEST' && !ord.resultAt ? new Date().toLocaleDateString('ar-EG') : ord.resultAt,
          };
        }
        return ord;
      })
    );
  };

  const handleUpdateOrderField = (id: string, field: 'resultSummary' | 'reportDetails' | 'notes', val: string) => {
    onChangeOrders(
      radiologyOrders.map((ord) => (ord.id === id ? { ...ord, [field]: val } : ord))
    );
  };

  const handleRemoveOrder = (id: string) => {
    onChangeOrders(radiologyOrders.filter((ord) => ord.id !== id));
  };

  const filteredCatalog = radiologyCatalog.filter((item) =>
    item.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    item.category.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="bg-white dark:bg-[#111A2E] p-5 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-white/5 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-[#38BDF8] flex items-center justify-center">
            <span className="material-symbols-outlined text-lg">radiology</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-[#dde2f5]">الأشعة والتصوير الطبي</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-[#38BDF8]">
                {radiologyOrders.length} فحص
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-[#859394]">
              إدارة طلبات الأشعة، تسجيل النتائج، وكتابة التقارير الطبية
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPicker(!showPicker)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-900/30 hover:bg-sky-100 text-sky-700 dark:text-[#38BDF8] text-xs font-bold transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">lists</span>
            <span>+ اختيار من دليلي</span>
          </button>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#00c2cb] hover:bg-[#45dee7] text-[#08101C] text-xs font-bold transition-all cursor-pointer shadow-xs"
          >
            <span className="material-symbols-outlined text-base">add</span>
            <span>+ إضافة نوع جديد</span>
          </button>
        </div>
      </div>

      {/* Catalog quick picker popover */}
      {showPicker && (
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#080e1b] border border-slate-200 dark:border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 dark:text-[#dde2f5]">
              اختر فحصاً من دليل الأشعة السريع:
            </span>
            <input
              type="text"
              placeholder="بحث في الأشعة..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="text-xs bg-white dark:bg-[#111A2E] text-slate-900 dark:text-[#dde2f5] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 w-48 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
            {filteredCatalog.map((catItem) => {
              const isAlreadyOrdered = radiologyOrders.some((o) => o.name === catItem.name);
              return (
                <button
                  key={catItem.id}
                  type="button"
                  disabled={isAlreadyOrdered}
                  onClick={() => handleAddFromCatalog(catItem)}
                  className={`p-2 rounded-xl text-right text-xs border transition-all flex items-start justify-between cursor-pointer ${
                    isAlreadyOrdered
                      ? 'bg-slate-200/50 dark:bg-white/5 border-transparent text-slate-400 cursor-not-allowed'
                      : 'bg-white dark:bg-[#111A2E] hover:border-sky-400 border-slate-200 dark:border-white/5 text-slate-800 dark:text-[#dde2f5]'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="font-bold flex items-center gap-1">
                      {catItem.isFavorite && <span className="text-amber-500 text-[10px]">⭐</span>}
                      <span>{catItem.name}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-[#859394] block">{catItem.category}</span>
                  </div>
                  {isAlreadyOrdered ? (
                    <span className="text-[10px] text-emerald-600 font-bold">مضاف ✓</span>
                  ) : (
                    <span className="material-symbols-outlined text-sky-600 text-sm">add</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Active Radiology Orders List */}
      {radiologyOrders.length === 0 ? (
        <div className="py-8 text-center bg-slate-50/50 dark:bg-[#080e1b]/40 rounded-xl border border-dashed border-slate-200 dark:border-white/5">
          <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 text-3xl mb-1">
            radiology
          </span>
          <p className="text-xs text-slate-500 dark:text-[#859394]">
            لم يتم طلب أي فحوصات أشعة حتى الآن في هذا الكشف.
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            انقر "+ اختيار من دليلي" أو "+ إضافة نوع جديد" لطلب أشعة أو تسجيل تقريرها فوراً.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {radiologyOrders.map((ord) => (
            <div
              key={ord.id}
              className="bg-slate-50 dark:bg-[#080e1b] rounded-xl border border-slate-200 dark:border-white/5 p-3.5 space-y-3"
            >
              {/* Top Row: Name + Category + Status Select + Remove */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-[#dde2f5]">{ord.name}</span>
                    <span className="text-[10px] text-slate-500 dark:text-[#859394] mr-2 px-1.5 py-0.5 rounded bg-slate-200/60 dark:bg-white/5">
                      {ord.category}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Status Dropdown */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-500 dark:text-[#859394]">الحالة:</span>
                    <select
                      value={ord.status}
                      onChange={(e) => handleUpdateOrderStatus(ord.id, e.target.value as RadiologyStatus)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg border cursor-pointer focus:outline-none transition-all ${
                        ord.status === 'REQUEST'
                          ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700/50'
                          : ord.status === 'RESULT'
                          ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-[#10B981] border-emerald-300 dark:border-emerald-700/50'
                          : 'bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-[#38BDF8] border-sky-300 dark:border-sky-700/50'
                      }`}
                    >
                      <option value="REQUEST">طلب (REQUEST)</option>
                      <option value="RESULT">نتيجة (RESULT)</option>
                      <option value="REPORT">تقرير (REPORT)</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveOrder(ord.id)}
                    className="p-1 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                    title="حذف من الكشف"
                  >
                    <span className="material-symbols-outlined text-base">delete</span>
                  </button>
                </div>
              </div>

              {/* Dynamic State Details: If RESULT */}
              {ord.status === 'RESULT' && (
                <div className="pt-2 border-t border-slate-200 dark:border-white/5 flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                  <span className="text-xs font-bold text-slate-700 dark:text-[#dde2f5] whitespace-nowrap">
                    ملخص النتيجة السريرية:
                  </span>
                  <input
                    type="text"
                    value={ord.resultSummary || ''}
                    onChange={(e) => handleUpdateOrderField(ord.id, 'resultSummary', e.target.value)}
                    placeholder="مثال: فحص سليم طبيعي، لا توجد جلطات DVT أو توسعات شريانية..."
                    className="flex-1 w-full bg-white dark:bg-[#111A2E] text-slate-900 dark:text-[#dde2f5] text-xs p-2 rounded-lg border border-slate-200 dark:border-white/5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              )}

              {/* Dynamic State Details: If REPORT */}
              {ord.status === 'REPORT' && (
                <div className="pt-2 border-t border-slate-200 dark:border-white/5 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-[#dde2f5]">
                    <span>نص التقرير الإشعاعي المفصل (Radiological Findings & Impression):</span>
                    <span className="text-[10px] text-sky-600 font-mono">سجل الأشعة الطبي</span>
                  </div>
                  <textarea
                    rows={3}
                    value={ord.reportDetails || ''}
                    onChange={(e) => handleUpdateOrderField(ord.id, 'reportDetails', e.target.value)}
                    placeholder="Findings: Normal cardiac silhouette, clear lung fields, no pleural effusion. Impression: Clear chest."
                    className="w-full bg-white dark:bg-[#111A2E] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-lg border border-slate-200 dark:border-white/5 focus:outline-none focus:ring-1 focus:ring-sky-500 leading-relaxed resize-none"
                  />
                </div>
              )}

              {/* Clinical note for 'REQUEST' status */}
              {ord.status === 'REQUEST' && (
                <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-500 dark:text-[#859394]">
                  <span className="material-symbols-outlined text-xs text-amber-500">schedule</span>
                  <span>تم إصدار طلب الفحص الساعة {ord.orderedAt} - في انتظار إجراء الفحص وورود التقرير.</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal: Add New Radiology Scan */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleAddNewCustomScan}
            className="bg-white dark:bg-[#18233C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-[#dde2f5] flex items-center gap-2">
                <span className="material-symbols-outlined text-sky-600">radiology</span>
                <span>إضافة نوع فحص أشعة جديد أثناء الكشف</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="text-xs text-slate-600 dark:text-[#859394] block mb-1">اسم فحص الأشعة:</label>
              <input
                type="text"
                required
                value={newScanName}
                onChange={(e) => setNewScanName(e.target.value)}
                placeholder="مثال: دوبلر شرايين الطرف السفلي، إيكو بالمجهود الدوائي..."
                className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/5 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="text-xs text-slate-600 dark:text-[#859394] block mb-1">تصنيف الأشعة والتصوير:</label>
              <select
                value={newScanCategory}
                onChange={(e) => setNewScanCategory(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/5 focus:outline-none cursor-pointer"
              >
                <option value="دوبلر ملون (Doppler)">دوبلر ملون (Doppler)</option>
                <option value="موجات صوتية (Ultrasound)">موجات صوتية (Ultrasound)</option>
                <option value="أشعة سينية (X-Ray)">أشعة سينية (X-Ray)</option>
                <option value="أشعة مقطعية (CT)">أشعة مقطعية (CT)</option>
                <option value="رنين مغناطيسي (MRI)">رنين مغناطيسي (MRI)</option>
                <option value="فسيولوجيا القلب">فسيولوجيا القلب ورسم قلب</option>
              </select>
            </div>

            <div className="flex items-center gap-2 p-3 bg-sky-50/60 dark:bg-sky-950/20 rounded-xl border border-sky-200 dark:border-sky-800/30">
              <input
                type="checkbox"
                id="saveRadToCatalog"
                checked={saveToCatalog}
                onChange={(e) => setSaveToCatalog(e.target.checked)}
                className="w-4 h-4 rounded text-[#00c2cb] accent-[#00c2cb]"
              />
              <label htmlFor="saveRadToCatalog" className="text-xs text-slate-700 dark:text-[#dde2f5] cursor-pointer">
                ☑ إضافة إلى قائمتي المفضلة (يُحفظ في دليل الأشعة ليظهر في كل الكشوفات القادمة)
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-[#111A2E] text-xs text-slate-600 dark:text-[#bbc9ca] hover:bg-slate-200 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-xs font-bold text-white transition-all cursor-pointer"
              >
                إضافة وطلب الفحص
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

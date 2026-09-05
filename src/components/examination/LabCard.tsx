import React, { useState } from 'react';
import { LabCatalogItem, LabOrderItem, LabStatus } from '../../types';

interface LabCardProps {
  labOrders: LabOrderItem[];
  onChangeOrders: (orders: LabOrderItem[]) => void;
  labCatalog: LabCatalogItem[];
  onAddLabToCatalog: (item: LabCatalogItem) => void;
}

export const LabCard: React.FC<LabCardProps> = ({
  labOrders,
  onChangeOrders,
  labCatalog,
  onAddLabToCatalog,
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  // Form states for new lab test modal
  const [newTestName, setNewTestName] = useState('');
  const [newCategory, setNewCategory] = useState('كيمياء حيوية');
  const [newSampleType, setNewSampleType] = useState('عينة دم وريدي');
  const [newFasting, setNewFasting] = useState(false);
  const [newRefRange, setNewRefRange] = useState('');
  const [newUnit, setNewUnit] = useState('');
  const [saveToCatalog, setSaveToCatalog] = useState(true);

  const handleAddFromCatalog = (item: LabCatalogItem) => {
    if (labOrders.some((o) => o.testName === item.name)) return;

    const newOrder: LabOrderItem = {
      id: `lab-ord-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      labTestId: item.id,
      testName: item.name,
      category: item.category,
      status: 'REQUEST',
      orderedAt: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      sampleType: item.sampleType || 'دم',
      instructions: item.fastingRequired ? 'يتطلب صيام 10-12 ساعة' : undefined,
      referenceRange: item.referenceRange,
      unit: item.unit,
      isAbnormal: false,
    };
    onChangeOrders([...labOrders, newOrder]);
    setShowPicker(false);
  };

  const handleAddNewCustomLab = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newTestName.trim();
    if (!trimmed) return;

    if (saveToCatalog) {
      onAddLabToCatalog({
        id: `lab-cat-${Date.now()}`,
        name: trimmed,
        category: newCategory,
        sampleType: newSampleType,
        fastingRequired: newFasting,
        referenceRange: newRefRange || undefined,
        unit: newUnit || undefined,
        isFavorite: true,
      });
    }

    const newOrder: LabOrderItem = {
      id: `lab-ord-${Date.now()}`,
      testName: trimmed,
      category: newCategory,
      status: 'REQUEST',
      orderedAt: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      sampleType: newSampleType,
      instructions: newFasting ? 'يتطلب صيام 10-12 ساعة' : undefined,
      referenceRange: newRefRange || undefined,
      unit: newUnit || undefined,
      isAbnormal: false,
    };
    onChangeOrders([...labOrders, newOrder]);

    setNewTestName('');
    setNewRefRange('');
    setNewUnit('');
    setNewFasting(false);
    setShowAddModal(false);
  };

  const handleUpdateStatus = (id: string, newStatus: LabStatus) => {
    onChangeOrders(
      labOrders.map((ord) => {
        if (ord.id === id) {
          return {
            ...ord,
            status: newStatus,
            resultDate: newStatus !== 'REQUEST' && !ord.resultDate ? new Date().toLocaleDateString('ar-EG') : ord.resultDate,
          };
        }
        return ord;
      })
    );
  };

  const handleUpdateField = (id: string, field: keyof LabOrderItem, val: any) => {
    onChangeOrders(
      labOrders.map((ord) => (ord.id === id ? { ...ord, [field]: val } : ord))
    );
  };

  const handleRemove = (id: string) => {
    onChangeOrders(labOrders.filter((ord) => ord.id !== id));
  };

  const filteredCatalog = labCatalog.filter((item) =>
    item.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    item.category.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="bg-white dark:bg-[#111A2E] p-5 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-white/5 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-[#10B981] flex items-center justify-center">
            <span className="material-symbols-outlined text-lg">science</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-[#dde2f5]">المعمل والتحاليل الطبية</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-[#10B981]">
                {labOrders.length} تحليل
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-[#859394]">
              فصل أوامر التحاليل (Orders) وتسجيل النتائج القياسية والملاحظات (Results)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPicker(!showPicker)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 text-emerald-700 dark:text-[#10B981] text-xs font-bold transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">lists</span>
            <span>+ اختيار من دليلي</span>
          </button>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
          >
            <span className="material-symbols-outlined text-base">add</span>
            <span>+ إضافة تحليل جديد</span>
          </button>
        </div>
      </div>

      {/* Catalog quick picker popover */}
      {showPicker && (
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#080e1b] border border-slate-200 dark:border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 dark:text-[#dde2f5]">
              اختر تحليلاً من دليل المعمل والتحاليل:
            </span>
            <input
              type="text"
              placeholder="بحث في التحاليل..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="text-xs bg-white dark:bg-[#111A2E] text-slate-900 dark:text-[#dde2f5] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 w-48 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-52 overflow-y-auto pr-1">
            {filteredCatalog.map((catItem) => {
              const isAlreadyOrdered = labOrders.some((o) => o.testName === catItem.name);
              return (
                <button
                  key={catItem.id}
                  type="button"
                  disabled={isAlreadyOrdered}
                  onClick={() => handleAddFromCatalog(catItem)}
                  className={`p-2 rounded-xl text-right text-xs border transition-all flex items-start justify-between cursor-pointer ${
                    isAlreadyOrdered
                      ? 'bg-slate-200/50 dark:bg-white/5 border-transparent text-slate-400 cursor-not-allowed'
                      : 'bg-white dark:bg-[#111A2E] hover:border-emerald-400 border-slate-200 dark:border-white/5 text-slate-800 dark:text-[#dde2f5]'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="font-bold flex items-center gap-1">
                      {catItem.isFavorite && <span className="text-amber-500 text-[10px]">⭐</span>}
                      <span>{catItem.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-[#859394]">
                      <span>{catItem.category}</span>
                      {catItem.fastingRequired && <span className="text-amber-600 font-bold">• صائم</span>}
                    </div>
                  </div>
                  {isAlreadyOrdered ? (
                    <span className="text-[10px] text-emerald-600 font-bold">مضاف ✓</span>
                  ) : (
                    <span className="material-symbols-outlined text-emerald-600 text-sm">add</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Active Lab Orders & Results List */}
      {labOrders.length === 0 ? (
        <div className="py-8 text-center bg-slate-50/50 dark:bg-[#080e1b]/40 rounded-xl border border-dashed border-slate-200 dark:border-white/5">
          <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 text-3xl mb-1">
            biotechnology
          </span>
          <p className="text-xs text-slate-500 dark:text-[#859394]">
            لم يتم طلب أي تحاليل معملية حتى الآن في هذا الكشف.
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            انقر "+ اختيار من دليلي" أو "+ إضافة تحليل جديد" لطلب تحاليل أو رصد قيمها المخبرية فوراً.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {labOrders.map((ord) => (
            <div
              key={ord.id}
              className={`rounded-xl border p-3.5 space-y-3 transition-all ${
                ord.isAbnormal
                  ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40'
                  : 'bg-slate-50 dark:bg-[#080e1b] border-slate-200 dark:border-white/5'
              }`}
            >
              {/* Row 1: Header info + status dropdown */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      ord.isAbnormal ? 'bg-rose-500' : 'bg-emerald-500'
                    }`}
                  ></span>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-[#dde2f5]">{ord.testName}</span>
                    <span className="text-[10px] text-slate-500 dark:text-[#859394] mr-2 px-1.5 py-0.5 rounded bg-slate-200/60 dark:bg-white/5">
                      {ord.category}
                    </span>
                    {ord.sampleType && (
                      <span className="text-[10px] text-slate-400 mr-1">({ord.sampleType})</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Status Dropdown */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-500 dark:text-[#859394]">الحالة:</span>
                    <select
                      value={ord.status}
                      onChange={(e) => handleUpdateStatus(ord.id, e.target.value as LabStatus)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg border cursor-pointer focus:outline-none transition-all ${
                        ord.status === 'REQUEST'
                          ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700/50'
                          : ord.status === 'RESULT'
                          ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-[#10B981] border-emerald-300 dark:border-emerald-700/50'
                          : 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 border-indigo-300 dark:border-indigo-700/50'
                      }`}
                    >
                      <option value="REQUEST">طلب (ORDERED)</option>
                      <option value="RESULT">نتيجة (RESULT)</option>
                      <option value="REPORT">تقرير (REPORT)</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemove(ord.id)}
                    className="p-1 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                    title="حذف التحليل"
                  >
                    <span className="material-symbols-outlined text-base">delete</span>
                  </button>
                </div>
              </div>

              {/* Status details: If REQUEST */}
              {ord.status === 'REQUEST' && (
                <div className="pt-2 border-t border-slate-200 dark:border-white/5 flex items-center justify-between text-[11px] text-slate-500 dark:text-[#859394]">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-xs text-amber-500">pending</span>
                    <span>تم تسجيل أمر التحليل ({ord.orderedAt}) - المريض متجه للمعمل</span>
                  </div>
                  {ord.instructions && (
                    <span className="text-amber-600 font-bold bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded">
                      تعليمات: {ord.instructions}
                    </span>
                  )}
                </div>
              )}

              {/* Status details: If RESULT */}
              {ord.status === 'RESULT' && (
                <div className="pt-2 border-t border-slate-200 dark:border-white/5 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                  <div className="sm:col-span-4 flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-700 dark:text-[#dde2f5] whitespace-nowrap">
                      النتيجة المقاسة:
                    </span>
                    <input
                      type="text"
                      value={ord.resultValue || ''}
                      onChange={(e) => handleUpdateField(ord.id, 'resultValue', e.target.value)}
                      placeholder="e.g. 7.2"
                      className="w-full bg-white dark:bg-[#111A2E] text-slate-900 dark:text-[#dde2f5] font-mono font-bold text-xs p-2 rounded-lg border border-slate-200 dark:border-white/5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    {ord.unit && (
                      <span className="text-[11px] text-slate-500 font-mono">{ord.unit}</span>
                    )}
                  </div>

                  <div className="sm:col-span-4 text-xs text-slate-500 dark:text-[#859394]">
                    <span>النطاق الطبيعي: </span>
                    <span className="font-mono text-slate-700 dark:text-[#dde2f5]">
                      {ord.referenceRange || 'غير محدد'}
                    </span>
                  </div>

                  <div className="sm:col-span-4 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => handleUpdateField(ord.id, 'isAbnormal', !ord.isAbnormal)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                        ord.isAbnormal
                          ? 'bg-rose-600 text-white border-rose-600'
                          : 'bg-slate-100 dark:bg-[#111A2E] text-slate-600 dark:text-[#859394] border-slate-200 dark:border-white/5'
                      }`}
                    >
                      {ord.isAbnormal ? '⚠️ نتيجة خارج المعدل الطبيعي' : 'ضمن المعدل الطبيعي ✓'}
                    </button>
                  </div>
                </div>
              )}

              {/* Status details: If REPORT */}
              {ord.status === 'REPORT' && (
                <div className="pt-2 border-t border-slate-200 dark:border-white/5 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-[#dde2f5]">
                    <span>ملاحظات وتقرير التحليل المعملي التفصيلي:</span>
                    <span className="text-[10px] text-emerald-600 font-mono">سجل المعمل</span>
                  </div>
                  <textarea
                    rows={2}
                    value={ord.reportNotes || ''}
                    onChange={(e) => handleUpdateField(ord.id, 'reportNotes', e.target.value)}
                    placeholder="اكتب التقرير المجهري، نمو المزرعة، أو الحساسية البكتيرية..."
                    className="w-full bg-white dark:bg-[#111A2E] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-lg border border-slate-200 dark:border-white/5 focus:outline-none focus:ring-1 focus:ring-emerald-500 leading-relaxed resize-none"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal: Add New Lab Test */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleAddNewCustomLab}
            className="bg-white dark:bg-[#18233C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-[#dde2f5] flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-600">biotechnology</span>
                <span>إضافة تحليل معملي جديد أثناء الكشف</span>
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
              <label className="text-xs text-slate-600 dark:text-[#859394] block mb-1">اسم الفحص المعملي:</label>
              <input
                type="text"
                required
                value={newTestName}
                onChange={(e) => setNewTestName(e.target.value)}
                placeholder="مثال: تحليل كالسيوم متأين، فحص سكر عشوائي..."
                className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-600 dark:text-[#859394] block mb-1">التصنيف:</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/5 focus:outline-none"
                >
                  <option value="كيمياء حيوية">كيمياء حيوية</option>
                  <option value="أمراض الدم">أمراض الدم</option>
                  <option value="الغدد الصماء والسكر">الغدد الصماء والسكر</option>
                  <option value="مناعة وفيروسات">مناعة وفيروسات</option>
                  <option value="فحوصات مجهرية">فحوصات مجهرية وبول</option>
                  <option value="هرمونات">هرمونات</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-600 dark:text-[#859394] block mb-1">نوع العينة المطلوبة:</label>
                <input
                  type="text"
                  value={newSampleType}
                  onChange={(e) => setNewSampleType(e.target.value)}
                  placeholder="عينة دم وريدي، بول صباحي..."
                  className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/5 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-600 dark:text-[#859394] block mb-1">النطاق الطبيعي:</label>
                <input
                  type="text"
                  value={newRefRange}
                  onChange={(e) => setNewRefRange(e.target.value)}
                  placeholder="e.g. 70 - 100"
                  className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/5 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-slate-600 dark:text-[#859394] block mb-1">وحدة القياس:</label>
                <input
                  type="text"
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value)}
                  placeholder="mg/dl, %, uIU/mL..."
                  className="w-full bg-slate-50 dark:bg-[#080e1b] text-slate-900 dark:text-[#dde2f5] text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/5 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="newFastingCheck"
                checked={newFasting}
                onChange={(e) => setNewFasting(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 accent-emerald-600"
              />
              <label htmlFor="newFastingCheck" className="text-xs text-slate-700 dark:text-[#dde2f5] cursor-pointer">
                يتطلب صيام 10-12 ساعة
              </label>
            </div>

            <div className="flex items-center gap-2 p-3 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-800/30">
              <input
                type="checkbox"
                id="saveLabToCatalog"
                checked={saveToCatalog}
                onChange={(e) => setSaveToCatalog(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 accent-emerald-600"
              />
              <label htmlFor="saveLabToCatalog" className="text-xs text-slate-700 dark:text-[#dde2f5] cursor-pointer">
                ☑ إضافة إلى قائمتي المفضلة (يُحفظ في دليل التحاليل ليظهر في الكشوفات القادمة)
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
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition-all cursor-pointer"
              >
                إضافة وطلب التحليل
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

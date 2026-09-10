import { db } from '../services/firebase';
import { doc, setDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';

export interface MedicalServiceItem {
  id: string;
  name: string;
  price: number;
  category?: string;
  active?: boolean;
}

export interface ExpenseCategoryItem {
  id: string;
  name: string;
}

export interface ClinicExpenseRecord {
  id: string;
  category: string;
  amount: number;
  date: string;
  time?: string;
  notes?: string;
  createdAt: string;
  createdBy?: string;
}

export const DEFAULT_MEDICAL_SERVICES: MedicalServiceItem[] = [
  { id: 'srv-1', name: 'كشف واستشارة طبية', price: 300, category: 'كشوفات' },
  { id: 'srv-2', name: 'عمل رسم قلب', price: 150, category: 'فحوصات' },
  { id: 'srv-3', name: 'خياطة جرح', price: 200, category: 'إجراءات جراحية' },
  { id: 'srv-4', name: 'عمل جبيرة', price: 250, category: 'عظام وإصابات' },
  { id: 'srv-5', name: 'غيار جروح وتعقيم', price: 100, category: 'تمريض وعناية' },
  { id: 'srv-6', name: 'سونار وفحص موجات صوتية', price: 250, category: 'تصوير طبي' },
  { id: 'srv-7', name: 'جلسة علاج طبيعي', price: 180, category: 'علاج طبيعي' },
  { id: 'srv-8', name: 'قياس ضغط وسكر وتخطيط سريع', price: 50, category: 'فحوصات أولية' },
];

export const DEFAULT_EXPENSE_CATEGORIES: ExpenseCategoryItem[] = [
  { id: 'exp-cat-1', name: 'فاتورة كهرباء' },
  { id: 'exp-cat-2', name: 'فاتورة إنترنت' },
  { id: 'exp-cat-3', name: 'إيجار العيادة' },
  { id: 'exp-cat-4', name: 'رواتب الموظفين' },
  { id: 'exp-cat-5', name: 'صيانة ومستلزمات' },
  { id: 'exp-cat-6', name: 'صيانة أجهزة' },
  { id: 'exp-cat-7', name: 'شراء شاش ومستهلكات طبية' },
];

export const DEFAULT_CLINIC_EXPENSES: ClinicExpenseRecord[] = [
  {
    id: 'exp-101',
    category: 'فاتورة كهرباء',
    amount: 450,
    date: '2026-09-07',
    time: '02:30 م',
    notes: 'سداد فاتورة كهرباء شهر سبتمبر',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'exp-102',
    category: 'صيانة ومستلزمات',
    amount: 250,
    date: '2026-09-08',
    time: '11:15 ص',
    notes: 'شراء أدوات نظافة ومطهرات للعيادة',
    createdAt: new Date().toISOString(),
  },
];

// ==========================================
// 1. Medical Services (الوارد والخدمات الطبية)
// ==========================================
export function loadMedicalServices(): MedicalServiceItem[] {
  try {
    const raw = localStorage.getItem('soli_medical_services');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn('Failed to load medical services from localStorage', e);
  }
  return DEFAULT_MEDICAL_SERVICES;
}

export function saveMedicalServices(services: MedicalServiceItem[]) {
  try {
    localStorage.setItem('soli_medical_services', JSON.stringify(services));
    window.dispatchEvent(new CustomEvent('soli_services_updated', { detail: services }));
  } catch (e) {
    console.warn('Failed to save medical services to localStorage', e);
  }
}

export function addMedicalService(service: MedicalServiceItem) {
  const current = loadMedicalServices();
  const updated = [service, ...current];
  saveMedicalServices(updated);
  if (db) {
    setDoc(doc(db, 'services', service.id), service).catch((err) =>
      console.warn('Firestore service sync error:', err)
    );
  }
  return updated;
}

export function removeMedicalService(id: string) {
  const current = loadMedicalServices();
  const updated = current.filter((s) => s.id !== id);
  saveMedicalServices(updated);
  if (db) {
    deleteDoc(doc(db, 'services', id)).catch((err) =>
      console.warn('Firestore service delete error:', err)
    );
  }
  return updated;
}

export function updateMedicalService(id: string, updates: Partial<MedicalServiceItem>) {
  const current = loadMedicalServices();
  const updated = current.map((s) => (s.id === id ? { ...s, ...updates } : s));
  saveMedicalServices(updated);
  if (db) {
    const target = updated.find((s) => s.id === id);
    if (target) {
      setDoc(doc(db, 'services', id), target, { merge: true }).catch((err) =>
        console.warn('Firestore service update error:', err)
      );
    }
  }
  return updated;
}

// ==========================================
// 2. Expense Categories (بنود المنصرف)
// ==========================================
export function loadExpenseCategories(): ExpenseCategoryItem[] {
  try {
    const raw = localStorage.getItem('soli_expense_categories');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn('Failed to load expense categories from localStorage', e);
  }
  return DEFAULT_EXPENSE_CATEGORIES;
}

export function saveExpenseCategories(categories: ExpenseCategoryItem[]) {
  try {
    localStorage.setItem('soli_expense_categories', JSON.stringify(categories));
    window.dispatchEvent(new CustomEvent('soli_expense_categories_updated', { detail: categories }));
  } catch (e) {
    console.warn('Failed to save expense categories to localStorage', e);
  }
}

export function addExpenseCategory(name: string): ExpenseCategoryItem[] {
  const cleanName = name.trim();
  if (!cleanName) return loadExpenseCategories();
  const current = loadExpenseCategories();
  if (current.some((c) => c.name === cleanName)) return current;
  const newItem: ExpenseCategoryItem = {
    id: `exp-cat-${Date.now()}`,
    name: cleanName,
  };
  const updated = [...current, newItem];
  saveExpenseCategories(updated);
  if (db) {
    setDoc(doc(db, 'expenseCategories', newItem.id), newItem).catch((err) =>
      console.warn('Firestore expense category sync error:', err)
    );
  }
  return updated;
}

export function removeExpenseCategory(id: string): ExpenseCategoryItem[] {
  const current = loadExpenseCategories();
  const updated = current.filter((c) => c.id !== id && c.name !== id);
  saveExpenseCategories(updated);
  if (db) {
    deleteDoc(doc(db, 'expenseCategories', id)).catch((err) =>
      console.warn('Firestore expense category delete error:', err)
    );
  }
  return updated;
}

// ==========================================
// 3. Clinic Expenses (المنصرف والمصروفات المسجلة)
// ==========================================
export function loadClinicExpenses(): ClinicExpenseRecord[] {
  try {
    const raw = localStorage.getItem('soli_clinic_expenses');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Failed to load clinic expenses from localStorage', e);
  }
  return [];
}

export function saveClinicExpenses(expenses: ClinicExpenseRecord[]) {
  try {
    localStorage.setItem('soli_clinic_expenses', JSON.stringify(expenses));
    window.dispatchEvent(new CustomEvent('soli_clinic_expenses_updated', { detail: expenses }));
  } catch (e) {
    console.warn('Failed to save clinic expenses to localStorage', e);
  }
}

export function addClinicExpense(expense: ClinicExpenseRecord): ClinicExpenseRecord[] {
  const current = loadClinicExpenses();
  const updated = [expense, ...current];
  saveClinicExpenses(updated);
  if (db) {
    setDoc(doc(db, 'expenses', expense.id), expense).catch((err) =>
      console.warn('Firestore expense sync error:', err)
    );
  }
  return updated;
}

export function removeClinicExpense(id: string): ClinicExpenseRecord[] {
  const current = loadClinicExpenses();
  const updated = current.filter((e) => e.id !== id);
  saveClinicExpenses(updated);
  if (db) {
    deleteDoc(doc(db, 'expenses', id)).catch((err) =>
      console.warn('Firestore expense delete error:', err)
    );
  }
  return updated;
}

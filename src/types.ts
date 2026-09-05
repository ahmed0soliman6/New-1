export * from './types/database';

export type ScreenType =
  | 'dashboard'
  | 'new-visit'
  | 'waiting-queue'
  | 'clinical-exam'
  | 'upcoming-followups'
  | 'appointments'
  | 'patient-records'
  | 'billing-payments'
  | 'finance'
  | 'clinical-reports'
  | 'prescriptions-catalog'
  | 'prescription-pad'
  | 'system-settings'
  | 'settings';

export interface PatientListItem {
  id: string;
  medicalCode: string;
  fileNumber?: number | string;
  name: string;
  age: number;
  gender: 'male' | 'female';
  phone: string;
  governorate: string;
  avatarUrl?: string;
  allergies: string[];
  chronicConditions: string[];
  bloodType?: string;
  bloodGroup?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relation: string;
  };
  lastVisitDate?: string;
  registrationDate?: string;
  accountBalance?: number;
  visitsCount: number;
  totalPaid?: number;
  lastDiagnosis?: string;
}

export interface QueueItem {
  id: string;
  ticketNumber: string;
  fileNumber?: number | string;
  patientName: string;
  medicalCode: string;
  phone: string;
  age: number;
  visitType: string;
  arrivalTime: string;
  elapsedMinutes: number;
  paidAmount: number;
  paymentMethod: string;
  complaint: string;
  status: 'waiting' | 'in-room' | 'done' | 'delayed';
  isUrgent?: boolean;
  address?: string;
  chronicConditions?: string[];
}

export interface AppointmentListItem {
  id: string;
  patientName: string;
  fileNumber?: number | string;
  phone: string;
  medicalCode: string;
  timeSlot: string;
  branch: string;
  visitType: string;
  expectedFee: number;
  status: 'مجدول' | 'حضر وسدد' | 'في الانتظار' | 'جاري الكشف' | 'مكتمل' | 'لم يحضر';
  notes?: string;
  freeFollowupEligible?: boolean;
}

export interface TransactionRecord {
  id: string;
  receiptNumber?: string;
  receiptNo?: string;
  timestamp?: string;
  time?: string;
  patientName: string;
  medicalCode?: string;
  phone?: string;
  serviceName?: string;
  description?: string;
  serviceCategory?: string;
  category?: string;
  totalAmount?: number;
  discountAmount?: number;
  paidAmount?: number;
  remainingAmount?: number;
  amount?: number;
  type?: 'in' | 'out';
  paymentMethod?: string;
  paymentMethodLabel?: string;
  method?: string;
  status?: string;
  doctor?: string;
  cashier?: string;
}

export interface PrescriptionItem {
  id: string;
  drugName: string;
  scientificName?: string;
  strength?: string;
  dosageForm?: string;
  dosageInstructions?: string;
  dosage?: string;
  timing?: string;
  duration: string;
  notes?: string;
}

export type RadiologyStatus = 'REQUEST' | 'RESULT' | 'REPORT';

export interface RadiologyCatalogItem {
  id: string;
  name: string;
  category: string; // e.g. أشعة عادية X-Ray, موجات صوتية Ultrasound, أشعة مقطعية CT, رنين مغناطيسي MRI, دوبلر Doppler
  isFavorite: boolean;
  active?: boolean;
  notes?: string;
}

export interface RadiologyOrderItem {
  id: string;
  radiologyId?: string;
  name: string;
  category: string;
  status: RadiologyStatus;
  orderedAt: string;
  resultAt?: string;
  resultSummary?: string;
  reportDetails?: string;
  notes?: string;
}

export type LabStatus = 'REQUEST' | 'RESULT' | 'REPORT';

export interface LabCatalogItem {
  id: string;
  name: string;
  category: string; // e.g. صورة دم, كيمياء حيوية, هرمونات, مناعة وفيروسات, بول وبراز
  sampleType?: string; // e.g. عينة دم وريدي, بول صباحي
  fastingRequired?: boolean;
  referenceRange?: string;
  unit?: string;
  isFavorite: boolean;
  active?: boolean;
}

export interface LabOrderItem {
  id: string;
  labTestId?: string;
  testName: string;
  category: string;
  status: LabStatus;
  orderedAt: string;
  sampleType?: string;
  instructions?: string;
  resultValue?: string;
  referenceRange?: string;
  unit?: string;
  resultDate?: string;
  reportNotes?: string;
  isAbnormal?: boolean;
}

export interface DrugCatalogItem {
  id: string;
  brandName: string;
  genericName: string;
  strength: string;
  form: string; // أقراص, كبسولات, شراب, أمبولات حقن, فوار, نقط
  category: string;
  defaultDosage: string;
  defaultDuration: string;
  defaultTiming: string;
  isFavorite: boolean;
  active?: boolean;
  notes?: string;
}

export interface DiagnosisCatalogItem {
  id: string;
  code: string; // ICD-10
  nameAr: string;
  nameEn: string;
  category: string;
  isFavorite: boolean;
  active?: boolean;
}

export interface SymptomCatalogItem {
  id: string;
  name: string;
  category: string;
  isFavorite?: boolean;
  active?: boolean;
}

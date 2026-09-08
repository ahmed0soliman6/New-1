import { PrescriptionItem } from '../types';

export interface RecurringRxTemplate {
  id: string;
  title: string;
  category?: string;
  diagnoses: Array<{
    id?: string;
    catalogId?: string;
    code?: string;
    nameAr: string;
    nameEn?: string;
    isPrimary?: boolean;
    notes?: string;
  }>;
  prescription: Array<PrescriptionItem>;
  lifestyleAdvice?: string;
  notes?: string;
  isFavorite?: boolean;
}

export const INITIAL_CLINICAL_GUIDES_TEMPLATES: RecurringRxTemplate[] = [
  {
    id: 'tmpl-guide-1',
    title: 'بروتوكول جرثومة المعدة H. Pylori (العلاج الرباعي)',
    category: 'الجهاز الهضمي والكبد',
    diagnoses: [
      {
        id: 'diag-hp-1',
        nameAr: 'قرحة والتهاب المعدة بجرثومة الملوية البوابية (H. Pylori Gastritis)',
        nameEn: 'Helicobacter Pylori Gastritis & Peptic Ulcer',
        code: 'K29.7',
        isPrimary: true,
      },
    ],
    prescription: [
      {
        id: 'rx-hp-1',
        drugName: 'Nexium 40 mg',
        scientificName: 'Esomeprazole 40mg',
        strength: '40 mg',
        dosageForm: 'أقراص (Tablets)',
        dosage: 'قرص واحد قبل الإفطار والعشاء بنصف ساعة',
        timing: 'قبل الإفطار والعشاء',
        duration: 'لمدة 14 يوماً',
        notes: 'مثبط مضخة البروتون لحماية الغشاء المخاطي للمعدة',
      },
      {
        id: 'rx-hp-2',
        drugName: 'Klacid 500 mg',
        scientificName: 'Clarithromycin 500mg',
        strength: '500 mg',
        dosageForm: 'أقراص (Tablets)',
        dosage: 'قرص كل 12 ساعة بعد الأكل مباشرة',
        timing: 'بعد الأكل',
        duration: 'لمدة 14 يوماً',
        notes: 'مضاد حيوي رئيسي لجرثومة المعدة',
      },
      {
        id: 'rx-hp-3',
        drugName: 'Flagyl 500 mg',
        scientificName: 'Metronidazole 500mg',
        strength: '500 mg',
        dosageForm: 'أقراص (Tablets)',
        dosage: 'قرص كل 8 ساعات بعد الأكل',
        timing: 'بعد الأكل',
        duration: 'لمدة 14 يوماً',
        notes: 'مضاد بكتيري ولا هوائي',
      },
      {
        id: 'rx-hp-4',
        drugName: 'Augmentin 1 gm',
        scientificName: 'Amoxicillin + Clavulanic acid',
        strength: '1000 mg',
        dosageForm: 'أقراص (Tablets)',
        dosage: 'قرص كل 12 ساعة بعد الأكل',
        timing: 'بعد الأكل',
        duration: 'لمدة 14 يوماً',
        notes: 'في حال عدم وجود حساسية بنسلين',
      },
    ],
    lifestyleAdvice:
      'الامتناع التام عن الأطعمة الحارة والمقليات والمخللات والمياه الغازية والتدخين والقهوة. تقسيم الوجبات إلى 5 وجبات خفيفة يومياً. عدم الاستلقاء مباشرة بعد الأكل. إعادة فحص مستضد الجرثومة في البراز بعد شهر من انتهاء العلاج.',
    isFavorite: true,
  },
  {
    id: 'tmpl-guide-2',
    title: 'بروتوكول القولون العصبي وعسر الهضم (IBS Protocol)',
    category: 'الجهاز الهضمي والكبد',
    diagnoses: [
      {
        id: 'diag-ibs-1',
        nameAr: 'متلازمة القولون العصبي واضطراب حركة الأمعاء (IBS)',
        nameEn: 'Irritable Bowel Syndrome',
        code: 'K58.9',
        isPrimary: true,
      },
    ],
    prescription: [
      {
        id: 'rx-ibs-1',
        drugName: 'Duspatalin Retard 200 mg',
        scientificName: 'Mebeverine Hydrochloride',
        strength: '200 mg',
        dosageForm: 'كبسولات ممتدة المفعول',
        dosage: 'كبسولة واحدة مرتين يومياً',
        timing: 'قبل الأكل بنصف ساعة',
        duration: 'لمدة شهر',
        notes: 'مضاد لتقلصات عضلات القولون الملساء',
      },
      {
        id: 'rx-ibs-2',
        drugName: 'Controloc 40 mg',
        scientificName: 'Pantoprazole 40mg',
        strength: '40 mg',
        dosageForm: 'أقراص (Tablets)',
        dosage: 'قرص واحد صباحاً على الريق',
        timing: 'قبل الإفطار',
        duration: 'لمدة 21 يوماً',
        notes: 'لتقليل حموضة المعدة والشعور بالحرقان',
      },
      {
        id: 'rx-ibs-3',
        drugName: 'Visceralgine 50 mg',
        scientificName: 'Tiemonium methylsulfate',
        strength: '50 mg',
        dosageForm: 'أقراص (Tablets)',
        dosage: 'قرص عند اللزوم عند اشتداد المغص',
        timing: 'عند اللزوم',
        duration: 'عند الحاجة',
        notes: 'مسكن للمغص والتقلصات المعوية',
      },
    ],
    lifestyleAdvice:
      'تجنب التوتر والقلق العصبي، شرب الينسون والنعناع والبابونج الدافئ، الابتعاد عن البقوليات والكرنب والأطعمة المسبكة، شرب كميات وفيرة من الماء وممارسة رياضة المشي بانتظام.',
    isFavorite: true,
  },
  {
    id: 'tmpl-guide-3',
    title: 'بروتوكول ارتفاع ضغط الدم والوقاية القلبية (HTN Protocol)',
    category: 'القلب والأوعية الدموية',
    diagnoses: [
      {
        id: 'diag-htn-1',
        nameAr: 'ارتفاع ضغط الدم الشرياني الأولي (Essential Hypertension)',
        nameEn: 'Essential (Primary) Hypertension',
        code: 'I10',
        isPrimary: true,
      },
    ],
    prescription: [
      {
        id: 'rx-htn-1',
        drugName: 'Concor 5 mg',
        scientificName: 'Bisoprolol fumarate',
        strength: '5 mg',
        dosageForm: 'أقراص (Tablets)',
        dosage: 'قرص واحد صباحاً بعد الإفطار',
        timing: 'بعد الإفطار',
        duration: 'علاج مستمر شهرياً',
        notes: 'منظم لضربات القلب وخافض للضغط',
      },
      {
        id: 'rx-htn-2',
        drugName: 'Plavix 75 mg',
        scientificName: 'Clopidogrel 75mg',
        strength: '75 mg',
        dosageForm: 'أقراص (Tablets)',
        dosage: 'قرص واحد يومياً بعد الغداء',
        timing: 'بعد الأكل',
        duration: 'علاج مستمر شهرياً',
        notes: 'مانع للتجلط وتحسين السيولة الدموية',
      },
      {
        id: 'rx-htn-3',
        drugName: 'Crestor 10 mg',
        scientificName: 'Rosuvastatin calcium',
        strength: '10 mg',
        dosageForm: 'أقراص (Tablets)',
        dosage: 'قرص واحد مساءً قبل النوم',
        timing: 'قبل النوم',
        duration: 'علاج مستمر شهرياً',
        notes: 'لخفض الكوليسترول وحماية الشرايين',
      },
    ],
    lifestyleAdvice:
      'تقليل ملح الطعام إلى أقل من 2 جرام يومياً، الامتناع عن المخللات والوجبات السريعة، قياس الضغط وتسجيله صباحاً ومساءً في جدول المتابعة، المشي اليومي 30 دقيقة.',
    isFavorite: true,
  },
  {
    id: 'tmpl-guide-4',
    title: 'بروتوكول داء السكري النوع الثاني والدهون (Type 2 DM)',
    category: 'الغدد الصماء والسكر',
    diagnoses: [
      {
        id: 'diag-dm-1',
        nameAr: 'داء السكري من النوع الثاني بدون مضاعفات (Type 2 Diabetes)',
        nameEn: 'Type 2 Diabetes Mellitus',
        code: 'E11.9',
        isPrimary: true,
      },
    ],
    prescription: [
      {
        id: 'rx-dm-1',
        drugName: 'Janumet 50/1000',
        scientificName: 'Sitagliptin + Metformin HCl',
        strength: '50/1000 mg',
        dosageForm: 'أقراص (Tablets)',
        dosage: 'قرص مرتين يومياً مع الوجبات الرئيسية',
        timing: 'مع الوجبات',
        duration: 'علاج مستمر شهرياً',
        notes: 'مضبوط السكر المزدوج المتطور',
      },
      {
        id: 'rx-dm-2',
        drugName: 'Glucophage 1000 XR',
        scientificName: 'Metformin Hydrochloride XR',
        strength: '1000 mg',
        dosageForm: 'أقراص ممتدة المفعول',
        dosage: 'قرص واحد مساءً بعد العشاء',
        timing: 'بعد العشاء',
        duration: 'علاج مستمر شهرياً',
        notes: 'لتقليل مقاومة الإنسولين الكبدية',
      },
    ],
    lifestyleAdvice:
      'حمية غذائية متوازنة منخفضة الكربوهيدرات والنشويات المكررة، منع السكريات والمشروبات الغازية والعصائر المحلاة، فحص السكر التراكمي HbA1c كل 3 أشهر، فحص القدمين يومياً.',
    isFavorite: true,
  },
  {
    id: 'tmpl-guide-5',
    title: 'بروتوكول نزلات البرد والتهاب الحلق الحاد (Acute URI)',
    category: 'الجهاز التنفسي',
    diagnoses: [
      {
        id: 'diag-uri-1',
        nameAr: 'التهاب الجهاز التنفسي العلوي والحلق الحاد (Acute Pharyngitis & URI)',
        nameEn: 'Acute Upper Respiratory Infection',
        code: 'J06.9',
        isPrimary: true,
      },
    ],
    prescription: [
      {
        id: 'rx-uri-1',
        drugName: 'Augmentin 1 gm',
        scientificName: 'Amoxicillin + Clavulanic acid',
        strength: '1000 mg',
        dosageForm: 'أقراص (Tablets)',
        dosage: 'قرص كل 12 ساعة بعد الأكل مباشرة',
        timing: 'بعد الأكل',
        duration: 'لمدة 7 أيام',
        notes: 'مضاد حيوي واسع المجال - إكمال الجرعة كاملاً',
      },
      {
        id: 'rx-uri-2',
        drugName: 'Panadol Extra',
        scientificName: 'Paracetamol + Caffeine',
        strength: '500/65 mg',
        dosageForm: 'أقراص (Tablets)',
        dosage: 'قرصين عند اللزوم بحد أقصى 4 مرات يومياً',
        timing: 'بعد الأكل',
        duration: 'لمدة 5 أيام',
        notes: 'مسكن وخافض للحرارة وآلام الجسم',
      },
      {
        id: 'rx-uri-3',
        drugName: 'Otrivin Adult Spray',
        scientificName: 'Xylometazoline 0.1%',
        strength: '0.1%',
        dosageForm: 'بخاخة أنفية',
        dosage: 'بخة بكل فتحة أنف مرتين يومياً',
        timing: 'عند اللزوم',
        duration: 'لمدة 5 أيام فقط',
        notes: 'مزيل لاحتقان وانسداد الأنف - لا تتجاوز 5 أيام',
      },
    ],
    lifestyleAdvice:
      'الراحة التامة في الفراش، شرب سوائل دافئة بكثرة (ليمون بالعسل، زنجبيل)، الغرغرة بماء دافئ وملح 3 مرات يومياً، الابتعاد عن التيارات الهوائية الباردة.',
    isFavorite: false,
  },
];

const STORAGE_KEY = 'soli_recurring_rx_templates';

export function loadRecurringTemplates(): RecurringRxTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error loading recurring templates:', err);
  }
  // If not found or empty, initialize with clinical guides templates
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_CLINICAL_GUIDES_TEMPLATES));
  } catch (e) {
    console.error(e);
  }
  return INITIAL_CLINICAL_GUIDES_TEMPLATES;
}

export function saveRecurringTemplates(templates: RecurringRxTemplate[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
    window.dispatchEvent(new Event('soli_templates_updated'));
  } catch (err) {
    console.error('Error saving recurring templates:', err);
  }
}

export function addOrUpdateRecurringTemplate(template: RecurringRxTemplate): RecurringRxTemplate[] {
  const current = loadRecurringTemplates();
  const existingIdx = current.findIndex((t) => t.id === template.id);
  let updated: RecurringRxTemplate[];
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = template;
  } else {
    updated = [template, ...current];
  }
  saveRecurringTemplates(updated);
  return updated;
}

export function deleteRecurringTemplate(templateId: string): RecurringRxTemplate[] {
  const current = loadRecurringTemplates();
  const updated = current.filter((t) => t.id !== templateId);
  saveRecurringTemplates(updated);
  return updated;
}

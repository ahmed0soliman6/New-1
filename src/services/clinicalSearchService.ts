import {
  DrugCatalogItem,
  LabCatalogItem,
  RadiologyCatalogItem,
  DiagnosisCatalogItem,
} from '../types';
import {
  STANDARD_DRUGS_ARCHIVE,
  STANDARD_LABS_ARCHIVE,
  STANDARD_RADIOLOGY_ARCHIVE,
  STANDARD_DIAGNOSES_ARCHIVE,
  StandardDrugRecord,
  StandardLabRecord,
  StandardRadiologyRecord,
  StandardDiagnosisRecord,
} from '../data/medicalStandardArchive';

export type ClinicalItemSource = 'clinic' | 'archive' | 'api';

export interface ClinicalSearchResult<T> {
  item: T;
  source: ClinicalItemSource;
  isFavorite?: boolean;
  score: number;
}

// ---------------------------------------------------------------------------
// 1. Arabic & Medical Phonetic Text Normalization
// ---------------------------------------------------------------------------
export function normalizeClinicalText(input: string): string {
  if (!input) return '';
  return input
    .toLowerCase()
    .trim()
    // Strip Arabic diacritics (tashkeel)
    .replace(/[\u064B-\u065F\u0670]/g, '')
    // Normalize Arabic alefs
    .replace(/[أإآء]/g, 'ا')
    // Normalize taa marbouta
    .replace(/ة/g, 'ه')
    // Normalize alef maqsoura
    .replace(/ى/g, 'ي')
    // Normalize hamzated letters
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    // Normalize multiple spaces
    .replace(/\s+/g, ' ');
}

// Common Arabic phonetic & colloquial aliases mapped to standardized English acronyms & keywords
const PHONETIC_MEDICAL_MAP: Record<string, string[]> = {
  // Labs
  'سي بي سي': ['cbc', 'complete blood count'],
  'سي بى سى': ['cbc'],
  'تراكمي': ['hba1c', 'glycated hemoglobin'],
  'تراكمى': ['hba1c'],
  'سكر صائم': ['fbs', 'fasting blood sugar'],
  'سكر فاطر': ['ppbs', 'post prandial'],
  'سكر عشوائي': ['rbs', 'random blood sugar'],
  'سكر عشوائى': ['rbs'],
  'وظائف كلى': ['kft', 'creatinine', 'urea', 'bun'],
  'وظائف كبد': ['lft', 'alt', 'ast', 'sgpt', 'sgot', 'bilirubin'],
  'انزيمات كبد': ['alt', 'ast', 'sgpt', 'sgot'],
  'ترسيب': ['esr', 'sedimentation rate'],
  'سي ار بي': ['crp', 'c-reactive protein'],
  'سي ار بى': ['crp'],
  'تي اس اتش': ['tsh', 'thyroid'],
  'سيولة': ['inr', 'pt', 'prothrombin'],
  'بروثرومبين': ['pt', 'inr'],
  'دي دايمر': ['d-dimer'],
  'تروبونين': ['troponin'],
  'بول': ['urine', 'urinalysis'],
  'تحليل بول': ['urine', 'urine analysis'],
  'براز': ['stool', 'stool analysis'],
  'نقرس': ['uric acid', 'gout'],
  'يوريك اسيد': ['uric acid'],
  'دهون': ['lipid profile', 'cholesterol', 'triglycerides'],
  'كوليسترول': ['cholesterol', 'lipid profile'],
  'غدة درقية': ['tsh', 'ft3', 'ft4'],
  'حديد': ['ferritin', 'iron'],
  'فيتامين د': ['vitamin d', 'vit d'],
  'فيتامين ب': ['vitamin b12', 'b12'],

  // Radiology
  'اشعة صدر': ['cxr', 'chest x-ray'],
  'سي اكس ار': ['cxr'],
  'سونار': ['us', 'ultrasound'],
  'التراساوند': ['ultrasound', 'us'],
  'سونار بطن': ['abdominal ultrasound', 'pelvi-abdominal'],
  'ايكو': ['echo', 'echocardiography'],
  'رسم قلب': ['ecg', 'electrocardiogram'],
  'اي سي جي': ['ecg'],
  'هولتر': ['holter'],
  'مقطعية': ['ct', 'computed tomography'],
  'اشعة مقطعية': ['ct'],
  'رنين': ['mri', 'magnetic resonance'],
  'رنين مغناطيسي': ['mri'],
  'دوبلر': ['doppler', 'duplex'],
  'دوبلكس': ['doppler', 'duplex'],
  'ماموجرام': ['mammogram', 'mammography'],
  'اشعة ثدي': ['mammogram'],
  'هشاشة': ['dexa', 'bone mineral density'],
  'ديكسا': ['dexa'],
  'اشعة مسالك': ['kub'],

  // Diagnoses
  'ضغط': ['htn', 'hypertension', 'high blood pressure'],
  'ضغط دم مرتفع': ['htn', 'hypertension'],
  'سكر': ['dm', 'diabetes', 'type 2 diabetes', 't2dm'],
  'مرض السكر': ['dm', 'diabetes'],
  'قولون': ['ibs', 'irritable bowel syndrome'],
  'قولون عصبي': ['ibs'],
  'ارتجاع': ['gerd', 'gastroesophageal reflux'],
  'حموضة': ['gerd', 'dyspepsia'],
  'ربو': ['bronchial asthma', 'asthma', 'copd'],
  'حساسية صدر': ['bronchial asthma', 'asthma'],
  'مسالك': ['uti', 'urinary tract infection'],
  'التهاب مسالك': ['uti', 'cystitis'],
  'قصور كلى': ['ckd', 'chronic kidney disease'],
  'فشل كلوي': ['ckd', 'renal failure'],
  'خشونة': ['osteoarthritis', 'oa'],
  'خشونة ركبة': ['knee osteoarthritis'],
  'قصور شريان تاجي': ['cad', 'ihd', 'angina'],
  'ذبحة': ['angina', 'ihd', 'cad', 'mi'],
  'انيميا': ['anemia', 'iron deficiency anemia', 'ida'],
  'فقر دم': ['anemia', 'ida'],
  'التهاب اعصاب': ['peripheral neuropathy', 'neuropathy'],
  'غضروف': ['disc prolapse', 'sciatica'],
  'عرق النسا': ['sciatica'],

  // Egyptian Medications & Common Brands
  'بيتاك': ['betaserc', 'betaloc', 'betac', 'بيتاسيرك', 'بيتالوك'],
  'بيتاسيرك': ['betaserc', 'betac'],
  'بيتالوك': ['betaloc', 'betac'],
  'كونكور': ['concor', 'bisoprolol'],
  'بنادول': ['panadol', 'paracetamol'],
  'باراسيتامول': ['paracetamol', 'panadol', 'cetal'],
  'سيتال': ['cetal', 'paracetamol'],
  'كتافلام': ['cataflam', 'diclofenac'],
  'فولتارين': ['voltaren', 'diclofenac'],
  'بروفين': ['brufen', 'ibuprofen'],
  'ايبوبروفين': ['ibuprofen', 'brufen'],
  'كيتوفان': ['ketofan', 'ketoprofen'],
  'اوجمنتين': ['augmentin', 'amoxicillin'],
  'أوجمنتين': ['augmentin', 'curam', 'hibiotic'],
  'كيورام': ['curam', 'augmentin'],
  'هاي بيوتك': ['hibiotic', 'augmentin'],
  'زيثروكان': ['zithrokan', 'azithromycin', 'zithromax'],
  'سيبروفار': ['ciprofar', 'ciprofloxacin'],
  'سيدوفاج': ['cidophage', 'glucophage', 'metformin'],
  'جلوكوفاج': ['glucophage', 'cidophage', 'metformin'],
  'اماريل': ['amaryl', 'glimepiride'],
  'أماريل': ['amaryl'],
  'فوركسيجا': ['forxiga', 'dapagliflozin'],
  'نيكسيوم': ['nexium', 'esomeprazole'],
  'كونترولوك': ['controloc', 'pantoprazole'],
  'دوسباتالين': ['duspatalin', 'mebeverine'],
  'انتينال': ['antinal', 'nifuroxazide'],
  'أنتينال': ['antinal'],
  'فلاجيل': ['flagyl', 'metronidazole'],
  'فيسرالجين': ['visceralgine'],
  'زيرتك': ['zyrtec', 'cetirizine'],
  'تلفاست': ['telfast', 'fexofenadine'],
  'فنتولين': ['ventolin', 'salbutamol'],
  'كونجستال': ['congestal'],
  'وان تو ثري': ['123', 'one two three'],
  'ميلجا': ['milga', 'milga advance'],
  'نيوروفيت': ['neurovit', 'vitamin b'],
  'رواتينكس': ['rowatinex'],
  'دافلون': ['daflon', 'diosmin'],
  'دافلو': ['daflon'],
  'الفانترن': ['alphintern'],
  'ألفانترن': ['alphintern'],
  'ريباريل': ['reparil'],
};

// ---------------------------------------------------------------------------
// 2. Client-Side Safe Caching System (Memory + LocalStorage TTL)
// ---------------------------------------------------------------------------
const memoryCache = new Map<string, { timestamp: number; data: any }>();
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const CACHE_STORAGE_PREFIX = 'soli_med_api_cache_';

function getCachedData<T>(key: string): T | null {
  // Check in-memory
  const mem = memoryCache.get(key);
  if (mem && Date.now() - mem.timestamp < CACHE_TTL_MS) {
    return mem.data as T;
  }

  // Check localStorage safely
  try {
    const raw = localStorage.getItem(CACHE_STORAGE_PREFIX + key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Date.now() - parsed.timestamp < CACHE_TTL_MS) {
        memoryCache.set(key, parsed);
        return parsed.data as T;
      }
    }
  } catch (_e) {
    // Ignore storage quota or parsing errors
  }
  return null;
}

function setCachedData(key: string, data: any): void {
  const payload = { timestamp: Date.now(), data };
  memoryCache.set(key, payload);
  try {
    localStorage.setItem(CACHE_STORAGE_PREFIX + key, JSON.stringify(payload));
  } catch (_e) {
    // LocalStorage may be full or blocked; memory cache remains active
  }
}

// ---------------------------------------------------------------------------
// 3. Match Helpers
// ---------------------------------------------------------------------------
function matchesTokens(queryTokens: string[], targetText: string): boolean {
  if (!queryTokens.length) return false;
  const normalizedTarget = normalizeClinicalText(targetText);
  return queryTokens.every((token) => normalizedTarget.includes(token));
}

function getPhoneticEquivalents(query: string): string[] {
  const norm = normalizeClinicalText(query);
  const equivalents: string[] = [norm];

  for (const [arKey, enTerms] of Object.entries(PHONETIC_MEDICAL_MAP)) {
    const normKey = normalizeClinicalText(arKey);
    if (norm.includes(normKey) || normKey.includes(norm)) {
      equivalents.push(...enTerms.map(normalizeClinicalText));
    }
  }

  return Array.from(new Set(equivalents));
}

// ---------------------------------------------------------------------------
// 4. Medications Search (Local Clinic Catalog + Egyptian Drug Authority Archive + Online API Fallback)
// ---------------------------------------------------------------------------
export async function searchClinicalDrugs(
  query: string,
  clinicDrugs: DrugCatalogItem[] = [],
  signal?: AbortSignal
): Promise<{
  clinicMatches: ClinicalSearchResult<DrugCatalogItem>[];
  archiveMatches: ClinicalSearchResult<StandardDrugRecord>[];
  apiMatches: ClinicalSearchResult<StandardDrugRecord>[];
}> {
  const cleanQ = normalizeClinicalText(query);
  if (!cleanQ) {
    return {
      clinicMatches: clinicDrugs.map((d) => ({
        item: d,
        source: 'clinic',
        isFavorite: !!d.isFavorite,
        score: d.isFavorite ? 10 : 1,
      })),
      archiveMatches: STANDARD_DRUGS_ARCHIVE.slice(0, 35).map((d) => ({
        item: d,
        source: 'archive',
        isFavorite: !!d.isFavorite,
        score: 1,
      })),
      apiMatches: [],
    };
  }

  const queryEquivalents = getPhoneticEquivalents(query);
  const clinicIds = new Set(clinicDrugs.map((d) => d.id));
  const clinicNames = new Set(clinicDrugs.map((d) => normalizeClinicalText(d.brandName)));

  // 1. Search Clinic Drugs
  const clinicMatches: ClinicalSearchResult<DrugCatalogItem>[] = [];
  for (const drug of clinicDrugs) {
    const searchable = `${drug.brandName} ${drug.genericName || ''} ${drug.category || ''} ${drug.form || ''} ${drug.strength || ''}`;
    const matches = queryEquivalents.some((term) =>
      matchesTokens(term.split(' ').filter(Boolean), searchable)
    );
    if (matches) {
      let score = 50;
      if (normalizeClinicalText(drug.brandName).startsWith(cleanQ)) score += 30;
      if (drug.isFavorite) score += 20;
      clinicMatches.push({ item: drug, source: 'clinic', isFavorite: !!drug.isFavorite, score });
    }
  }
  clinicMatches.sort((a, b) => b.score - a.score);

  // 2. Search Standard Archive (exclude items already present in clinic catalog)
  const archiveMatches: ClinicalSearchResult<StandardDrugRecord>[] = [];
  for (const drug of STANDARD_DRUGS_ARCHIVE) {
    if (clinicIds.has(drug.id) || clinicNames.has(normalizeClinicalText(drug.brandName))) {
      continue;
    }
    const aliasesStr = (drug.aliases || []).join(' ');
    const searchable = `${drug.brandName} ${drug.arabicBrand || ''} ${drug.genericName || ''} ${drug.arabicGeneric || ''} ${drug.category || ''} ${aliasesStr}`;

    const matches = queryEquivalents.some((term) =>
      matchesTokens(term.split(' ').filter(Boolean), searchable)
    );
    if (matches) {
      let score = 20;
      if (
        normalizeClinicalText(drug.brandName).startsWith(cleanQ) ||
        normalizeClinicalText(drug.arabicBrand || '').startsWith(cleanQ)
      ) {
        score += 25;
      }
      if (drug.isFavorite) score += 10;
      archiveMatches.push({ item: drug, source: 'archive', isFavorite: !!drug.isFavorite, score });
    }
  }
  archiveMatches.sort((a, b) => b.score - a.score);

  // 3. Online Live Search Fallback (RxNav / OpenFDA) with Client Caching
  const apiMatches: ClinicalSearchResult<StandardDrugRecord>[] = [];
  const totalLocalMatches = clinicMatches.length + archiveMatches.length;

  if (totalLocalMatches < 2 && cleanQ.length >= 3) {
    const cacheKey = `drug_api_cache_${cleanQ}`;
    const cached = getCachedData<StandardDrugRecord[]>(cacheKey);

    if (cached) {
      cached.forEach((item) => {
        apiMatches.push({ item, source: 'api', score: 10 });
      });
    } else {
      try {
        const searchKeyword = queryEquivalents[1] || query.trim();
        const url = `https://rxnav.nlm.nih.gov/REST/drugs.json?name=${encodeURIComponent(searchKeyword)}`;
        const res = await fetch(url, { signal });
        if (res.ok) {
          const data = await res.json();
          const conceptGroup = data?.drugGroup?.conceptGroup;
          if (Array.isArray(conceptGroup)) {
            const fetched: StandardDrugRecord[] = [];
            for (const group of conceptGroup) {
              if (Array.isArray(group.conceptProperties)) {
                for (const prop of group.conceptProperties.slice(0, 4)) {
                  fetched.push({
                    id: `rxnorm-${prop.rxcui}`,
                    brandName: prop.name,
                    arabicBrand: prop.name,
                    genericName: prop.synonym || prop.name,
                    arabicGeneric: prop.synonym || prop.name,
                    strength: '',
                    form: 'أقراص / كبسولات',
                    category: 'الدليل الدوائي المعتمد (RxNorm)',
                    defaultDosage: 'قرص واحد يومياً أو حسب الإرشاد الطبي',
                    defaultDuration: 'لمدة شهر',
                    defaultTiming: 'بعد الأكل',
                    isFavorite: false,
                    aliases: [prop.name],
                  });
                }
              }
            }
            if (fetched.length > 0) {
              setCachedData(cacheKey, fetched);
              fetched.forEach((item) => {
                apiMatches.push({ item, source: 'api', score: 10 });
              });
            }
          }
        }
      } catch (_e) {
        // Silently catch fetch or abort errors
      }
    }
  }

  return { clinicMatches, archiveMatches, apiMatches };
}

// ---------------------------------------------------------------------------
// 5. Laboratory Tests Search (Clinic + Standard Archive + NLM/LOINC Live API fallback)
// ---------------------------------------------------------------------------
export async function searchClinicalLabs(
  query: string,
  clinicLabs: LabCatalogItem[] = [],
  signal?: AbortSignal
): Promise<{
  clinicMatches: ClinicalSearchResult<LabCatalogItem>[];
  archiveMatches: ClinicalSearchResult<StandardLabRecord>[];
  apiMatches: ClinicalSearchResult<LabCatalogItem>[];
}> {
  const cleanQ = normalizeClinicalText(query);
  if (!cleanQ) {
    return {
      clinicMatches: clinicLabs.map((l) => ({
        item: l,
        source: 'clinic',
        isFavorite: !!l.isFavorite,
        score: l.isFavorite ? 10 : 1,
      })),
      archiveMatches: STANDARD_LABS_ARCHIVE.slice(0, 30).map((l) => ({
        item: l,
        source: 'archive',
        isFavorite: !!l.isFavorite,
        score: 1,
      })),
      apiMatches: [],
    };
  }

  const queryEquivalents = getPhoneticEquivalents(query);
  const clinicIds = new Set(clinicLabs.map((l) => l.id));
  const clinicNames = new Set(clinicLabs.map((l) => normalizeClinicalText(l.name)));

  // 1. Clinic Search
  const clinicMatches: ClinicalSearchResult<LabCatalogItem>[] = [];
  for (const lab of clinicLabs) {
    const searchable = `${lab.name} ${lab.category || ''} ${lab.sampleType || ''} ${(lab as any).englishName || ''} ${((lab as any).abbreviations || []).join(' ')}`;
    const matches = queryEquivalents.some((term) =>
      matchesTokens(term.split(' ').filter(Boolean), searchable)
    );
    if (matches) {
      let score = 50;
      if (normalizeClinicalText(lab.name).startsWith(cleanQ)) score += 30;
      if (lab.isFavorite) score += 15;
      clinicMatches.push({ item: lab, source: 'clinic', isFavorite: !!lab.isFavorite, score });
    }
  }
  clinicMatches.sort((a, b) => b.score - a.score);

  // 2. Standard Archive Search
  const archiveMatches: ClinicalSearchResult<StandardLabRecord>[] = [];
  for (const lab of STANDARD_LABS_ARCHIVE) {
    if (clinicIds.has(lab.id) || clinicNames.has(normalizeClinicalText(lab.name))) {
      continue;
    }
    const searchable = `${lab.name} ${lab.englishName || ''} ${lab.category || ''} ${(lab.abbreviations || []).join(' ')} ${(lab.aliasesAr || []).join(' ')}`;
    const matches = queryEquivalents.some((term) =>
      matchesTokens(term.split(' ').filter(Boolean), searchable)
    );
    if (matches) {
      let score = 25;
      if (
        (lab.abbreviations || []).some(
          (ab) => normalizeClinicalText(ab) === cleanQ
        )
      ) {
        score += 40;
      }
      if (normalizeClinicalText(lab.name).startsWith(cleanQ)) score += 20;
      if (lab.isFavorite) score += 10;
      archiveMatches.push({ item: lab, source: 'archive', isFavorite: !!lab.isFavorite, score });
    }
  }
  archiveMatches.sort((a, b) => b.score - a.score);

  // 3. Verified Live API (LOINC / NLM ClinicalTables)
  // Only query external API if local + archive matches are sparse (< 2) and query is >= 2 chars
  const apiMatches: ClinicalSearchResult<LabCatalogItem>[] = [];
  const totalLocalMatches = clinicMatches.length + archiveMatches.length;

  if (totalLocalMatches < 2 && cleanQ.length >= 2) {
    const cacheKey = `loinc_search_${cleanQ}`;
    const cached = getCachedData<LabCatalogItem[]>(cacheKey);

    if (cached) {
      cached.forEach((item) => {
        apiMatches.push({ item, source: 'api', score: 10 });
      });
    } else {
      try {
        const searchKeyword = queryEquivalents[1] || query.trim();
        const url = `https://clinicaltables.nlm.nih.gov/api/loinc_items/v3/search?terms=${encodeURIComponent(searchKeyword)}&maxList=6`;
        const res = await fetch(url, { signal });
        if (res.ok) {
          const data = await res.json();
          // Structure: [total, codes[], null, [[code, component, ...], ...]]
          if (Array.isArray(data) && Array.isArray(data[3])) {
            const fetchedItems: LabCatalogItem[] = data[3].map((row: any[]) => {
              const code = row[0] || '';
              const component = row[1] || row[0];
              return {
                id: `loinc-${code}`,
                name: `${component} (${code})`,
                category: 'مختبرات معتمدة (LOINC / NIH)',
                sampleType: 'عينة دم / مصل مخبري',
                fastingRequired: false,
                isFavorite: false,
                notes: `رمز LOINC الطبي: ${code}`,
              };
            });
            setCachedData(cacheKey, fetchedItems);
            fetchedItems.forEach((item) => {
              apiMatches.push({ item, source: 'api', score: 10 });
            });
          }
        }
      } catch (_e) {
        // Silently catch fetch or abort errors, preventing UI break
      }
    }
  }

  return { clinicMatches, archiveMatches, apiMatches };
}

// ---------------------------------------------------------------------------
// 6. Radiology Search (Clinic + Standard Archive)
// ---------------------------------------------------------------------------
export function searchClinicalRadiology(
  query: string,
  clinicRadiology: RadiologyCatalogItem[] = []
): {
  clinicMatches: ClinicalSearchResult<RadiologyCatalogItem>[];
  archiveMatches: ClinicalSearchResult<StandardRadiologyRecord>[];
} {
  const cleanQ = normalizeClinicalText(query);
  if (!cleanQ) {
    return {
      clinicMatches: clinicRadiology.map((r) => ({
        item: r,
        source: 'clinic',
        isFavorite: !!r.isFavorite,
        score: r.isFavorite ? 10 : 1,
      })),
      archiveMatches: STANDARD_RADIOLOGY_ARCHIVE.slice(0, 30).map((r) => ({
        item: r,
        source: 'archive',
        isFavorite: !!r.isFavorite,
        score: 1,
      })),
    };
  }

  const queryEquivalents = getPhoneticEquivalents(query);
  const clinicIds = new Set(clinicRadiology.map((r) => r.id));
  const clinicNames = new Set(clinicRadiology.map((r) => normalizeClinicalText(r.name)));

  // 1. Clinic Search
  const clinicMatches: ClinicalSearchResult<RadiologyCatalogItem>[] = [];
  for (const rad of clinicRadiology) {
    const searchable = `${rad.name} ${rad.category || ''} ${(rad as any).englishName || ''} ${((rad as any).abbreviations || []).join(' ')}`;
    const matches = queryEquivalents.some((term) =>
      matchesTokens(term.split(' ').filter(Boolean), searchable)
    );
    if (matches) {
      let score = 50;
      if (normalizeClinicalText(rad.name).startsWith(cleanQ)) score += 30;
      if (rad.isFavorite) score += 15;
      clinicMatches.push({ item: rad, source: 'clinic', isFavorite: !!rad.isFavorite, score });
    }
  }
  clinicMatches.sort((a, b) => b.score - a.score);

  // 2. Standard Archive Search
  const archiveMatches: ClinicalSearchResult<StandardRadiologyRecord>[] = [];
  for (const rad of STANDARD_RADIOLOGY_ARCHIVE) {
    if (clinicIds.has(rad.id) || clinicNames.has(normalizeClinicalText(rad.name))) {
      continue;
    }
    const searchable = `${rad.name} ${rad.englishName || ''} ${rad.modality || ''} ${rad.category || ''} ${(rad.abbreviations || []).join(' ')} ${(rad.aliasesAr || []).join(' ')}`;
    const matches = queryEquivalents.some((term) =>
      matchesTokens(term.split(' ').filter(Boolean), searchable)
    );
    if (matches) {
      let score = 25;
      if (
        (rad.abbreviations || []).some(
          (ab) => normalizeClinicalText(ab) === cleanQ
        )
      ) {
        score += 40;
      }
      if (normalizeClinicalText(rad.name).startsWith(cleanQ)) score += 20;
      if (rad.isFavorite) score += 10;
      archiveMatches.push({ item: rad, source: 'archive', isFavorite: !!rad.isFavorite, score });
    }
  }
  archiveMatches.sort((a, b) => b.score - a.score);

  return { clinicMatches, archiveMatches };
}

// ---------------------------------------------------------------------------
// 7. Clinical Diagnoses Search (Clinic + ICD-10 Archive + NLM ClinicalTables API)
// ---------------------------------------------------------------------------
export async function searchClinicalDiagnoses(
  query: string,
  clinicDiagnoses: DiagnosisCatalogItem[] = [],
  signal?: AbortSignal
): Promise<{
  clinicMatches: ClinicalSearchResult<DiagnosisCatalogItem>[];
  archiveMatches: ClinicalSearchResult<StandardDiagnosisRecord>[];
  apiMatches: ClinicalSearchResult<DiagnosisCatalogItem>[];
}> {
  const cleanQ = normalizeClinicalText(query);
  if (!cleanQ) {
    return {
      clinicMatches: clinicDiagnoses.map((d) => ({
        item: d,
        source: 'clinic',
        isFavorite: !!d.isFavorite,
        score: d.isFavorite ? 10 : 1,
      })),
      archiveMatches: STANDARD_DIAGNOSES_ARCHIVE.slice(0, 30).map((d) => ({
        item: d,
        source: 'archive',
        isFavorite: !!d.isFavorite,
        score: 1,
      })),
      apiMatches: [],
    };
  }

  const queryEquivalents = getPhoneticEquivalents(query);
  const clinicIds = new Set(clinicDiagnoses.map((d) => d.id));
  const clinicNames = new Set(clinicDiagnoses.map((d) => normalizeClinicalText(d.nameAr)));

  // 1. Clinic Search
  const clinicMatches: ClinicalSearchResult<DiagnosisCatalogItem>[] = [];
  for (const diag of clinicDiagnoses) {
    const searchable = `${diag.code} ${diag.nameAr} ${diag.nameEn} ${diag.category || ''} ${((diag as any).abbreviations || []).join(' ')}`;
    const matches = queryEquivalents.some((term) =>
      matchesTokens(term.split(' ').filter(Boolean), searchable)
    );
    if (matches) {
      let score = 50;
      if (normalizeClinicalText(diag.nameAr).startsWith(cleanQ) || diag.code.toLowerCase().startsWith(cleanQ)) {
        score += 30;
      }
      if (diag.isFavorite) score += 15;
      clinicMatches.push({ item: diag, source: 'clinic', isFavorite: !!diag.isFavorite, score });
    }
  }
  clinicMatches.sort((a, b) => b.score - a.score);

  // 2. Standard Archive Search
  const archiveMatches: ClinicalSearchResult<StandardDiagnosisRecord>[] = [];
  for (const diag of STANDARD_DIAGNOSES_ARCHIVE) {
    if (clinicIds.has(diag.id) || clinicNames.has(normalizeClinicalText(diag.nameAr))) {
      continue;
    }
    const searchable = `${diag.code} ${diag.nameAr} ${diag.nameEn} ${diag.category || ''} ${(diag.abbreviations || []).join(' ')} ${(diag.aliasesAr || []).join(' ')}`;
    const matches = queryEquivalents.some((term) =>
      matchesTokens(term.split(' ').filter(Boolean), searchable)
    );
    if (matches) {
      let score = 25;
      if (diag.code.toLowerCase().startsWith(cleanQ)) score += 40;
      if ((diag.abbreviations || []).some((ab) => normalizeClinicalText(ab) === cleanQ)) score += 35;
      if (normalizeClinicalText(diag.nameAr).startsWith(cleanQ)) score += 20;
      if (diag.isFavorite) score += 10;
      archiveMatches.push({ item: diag, source: 'archive', isFavorite: !!diag.isFavorite, score });
    }
  }
  archiveMatches.sort((a, b) => b.score - a.score);

  // 3. Verified NLM ClinicalTables ICD-10-CM API (cached)
  const apiMatches: ClinicalSearchResult<DiagnosisCatalogItem>[] = [];
  const totalLocalMatches = clinicMatches.length + archiveMatches.length;

  if (totalLocalMatches < 3 && cleanQ.length >= 2) {
    const cacheKey = `icd10_search_${cleanQ}`;
    const cached = getCachedData<DiagnosisCatalogItem[]>(cacheKey);

    if (cached) {
      cached.forEach((item) => {
        apiMatches.push({ item, source: 'api', score: 10 });
      });
    } else {
      try {
        const searchKeyword = queryEquivalents[1] || query.trim();
        const url = `https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search?terms=${encodeURIComponent(searchKeyword)}&sf=code,name&df=code,name&maxList=8`;
        const res = await fetch(url, { signal });
        if (res.ok) {
          const data = await res.json();
          // Structure: [total, [codes...], null, [[code, description], ...]]
          if (Array.isArray(data) && Array.isArray(data[3])) {
            const fetchedItems: DiagnosisCatalogItem[] = data[3].map((row: any[]) => {
              const code = row[0] || '';
              const description = row[1] || '';
              return {
                id: `icd10-nlm-${code}`,
                code: code,
                nameAr: `${description} (${code})`,
                nameEn: description,
                category: 'منظمة الصحة العالمية ICD-10 (NLM)',
                isFavorite: false,
              };
            });
            setCachedData(cacheKey, fetchedItems);
            fetchedItems.forEach((item) => {
              apiMatches.push({ item, source: 'api', score: 10 });
            });
          }
        }
      } catch (_e) {
        // Silently catch fetch/abort errors
      }
    }
  }

  return { clinicMatches, archiveMatches, apiMatches };
}

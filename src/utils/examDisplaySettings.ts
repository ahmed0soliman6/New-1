export interface ExamDisplaySettings {
  showVitals: boolean;
  showLabs: boolean;
  showRadiology: boolean;
}

const STORAGE_KEY = 'soli_clinic_exam_display_settings_v1';

export const DEFAULT_EXAM_DISPLAY_SETTINGS: ExamDisplaySettings = {
  showVitals: true,
  showLabs: true,
  showRadiology: true,
};

export const loadExamDisplaySettings = (): ExamDisplaySettings => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_EXAM_DISPLAY_SETTINGS, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.warn('Failed to read exam display settings from localStorage', e);
  }
  return DEFAULT_EXAM_DISPLAY_SETTINGS;
};

export const saveExamDisplaySettings = (settings: ExamDisplaySettings): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('Failed to save exam display settings to localStorage', e);
  }
};

// Alert and Notification Manager for Soli Medical Clinics
// Handles 1-time single audio chimes and visual notifications with configurable settings

import { doc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { FirestoreCollections, SettingsDocs } from '../services/firebase/collections';

export interface AlertSettings {
  audioEnabled: boolean;
  visualEnabled: boolean;
  newVisitAudio: boolean;
  newVisitVisual: boolean;
  callPatientAudio: boolean;
  callPatientVisual: boolean;
  finishExamAudio: boolean;
  finishExamVisual: boolean;
}

export interface ClinicAlertPayload {
  id: string;
  type: 'new_visit' | 'call' | 'finish';
  title: string;
  message: string;
  ticket?: string;
  timestamp: string;
  patientId?: string;
  visitId?: string;
}

const STORAGE_KEY = 'soli_clinic_alert_settings';

export const getDefaultAlertSettings = (): AlertSettings => ({
  audioEnabled: true,
  visualEnabled: true,
  newVisitAudio: true,
  newVisitVisual: true,
  callPatientAudio: true,
  callPatientVisual: true,
  finishExamAudio: true,
  finishExamVisual: true,
});

let cachedAlertSettings: AlertSettings = getDefaultAlertSettings();

export const loadAlertSettings = (): AlertSettings => {
  // د1: اقرأ القيم المحفوظة فعلياً (localStorage) بدل الكاش في الذاكرة فقط،
  // حتى تبقى الإعدادات بعد إعادة تحميل الصفحة.
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AlertSettings>;
      cachedAlertSettings = { ...getDefaultAlertSettings(), ...parsed };
    }
  } catch {
    // ignore — fall back to cached/default settings
  }
  return cachedAlertSettings;
};

export const setCachedAlertSettings = (settings: AlertSettings): void => {
  cachedAlertSettings = { ...getDefaultAlertSettings(), ...settings };
  // د1: احفظ نسخة محلية أيضاً حتى تنجو إعدادات الاشتراك السحابي من إعادة التحميل.
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cachedAlertSettings));
  } catch {
    // ignore
  }
};

/**
 * د1: يحفظ الإعدادات فعلياً — في Firestore (settings/alertSettings) لتصل لكل
 * الأجهزة، وفي localStorage كنسخة محلية. يرمي خطأً عند فشل الكتابة السحابية
 * حتى لا تعرض الواجهة رسالة نجاح كاذبة.
 */
export const saveAlertSettings = async (settings: AlertSettings): Promise<void> => {
  const merged = { ...getDefaultAlertSettings(), ...settings };
  cachedAlertSettings = merged;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch {
    // ignore local failures; Firestore is the source of truth
  }
  if (db) {
    await setDoc(doc(db, FirestoreCollections.SETTINGS, SettingsDocs.ALERT_SETTINGS), merged, { merge: true });
  }
};

// Synthesize single, pleasant hospital/clinic chime - PLAYS EXACTLY ONCE
export const playSingleAlertSound = (type: 'new_visit' | 'call' | 'finish' = 'new_visit'): void => {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';

    if (type === 'call') {
      // High calling chime for entering exam (E5 to A5)
      osc.frequency.setValueAtTime(659.25, now);
      osc.frequency.exponentialRampToValueAtTime(880.0, now + 0.15);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.45);
    } else if (type === 'finish') {
      // Pleasant completed melody (C5 -> E5 -> G5)
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.12);
      osc.frequency.setValueAtTime(783.99, now + 0.24);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.55);
    } else {
      // New visit arrival chime (C5 to G5)
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.15);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.4);
    }
  } catch {
    // Audio policy safe
  }
};

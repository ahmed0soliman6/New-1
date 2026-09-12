import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { Language, translations, ARABIC_PHRASE_DICTIONARY, translateArabicToEnglish } from './translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (keyOrText: string, fallback?: string) => string;
  translateText: (text: string) => string;
  dir: 'rtl' | 'ltr';
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LANGUAGE_STORAGE_KEY = 'soli_clinic_language';

// Cache for node original text values
const originalTextMap = new WeakMap<Node, string>();
const originalPlaceholderMap = new WeakMap<Element, string>();
const originalTitleMap = new WeakMap<Element, string>();
const originalAriaLabelMap = new WeakMap<Element, string>();

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (saved === 'en' || saved === 'ar') {
        return saved;
      }
    } catch {
      // ignore
    }
    return 'ar';
  });

  const dir: 'rtl' | 'ltr' = language === 'ar' ? 'rtl' : 'ltr';
  const isRTL = language === 'ar';

  useEffect(() => {
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
      document.documentElement.setAttribute('dir', dir);
      document.documentElement.setAttribute('lang', language);
    } catch {
      // ignore
    }
  }, [language, dir]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguageState((prev) => (prev === 'ar' ? 'en' : 'ar'));
  }, []);

  const translateText = useCallback(
    (text: string): string => {
      if (language === 'ar' || !text) return text;
      return translateArabicToEnglish(text);
    },
    [language]
  );

  const t = useCallback(
    (keyOrText: string, fallback?: string): string => {
      if (!keyOrText) return '';

      // 1. Direct key match in translations
      const entry = translations[keyOrText];
      if (entry && entry[language]) {
        return entry[language];
      }

      // 2. If English is selected and keyOrText is in Arabic
      if (language === 'en') {
        if (fallback) return fallback;
        return translateArabicToEnglish(keyOrText);
      }

      // 3. Arabic mode: if a key wasn't found, check if it was already Arabic or fallback
      if (fallback !== undefined && language === 'en') {
        return fallback;
      }

      return keyOrText;
    },
    [language]
  );

  // Auto-translate DOM text nodes, input placeholders, titles, and aria-labels
  // in real time when English is active, strictly excluding the prescription pad
  // container (#printable-prescription-pad) and user custom input / patient names.
  useEffect(() => {
    const rootEl = document.getElementById('root');
    if (!rootEl) return;

    const translateElementAttributes = (el: Element) => {
      if (
        el.closest('#printable-prescription-pad') ||
        el.closest('[data-no-translate="true"]') ||
        el.closest('.no-translate') ||
        el.closest('.patient-name')
      ) {
        return;
      }

      // 1. Placeholder on input / textarea
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        const ph = el.placeholder;
        if (ph && ph.trim()) {
          if (language === 'en') {
            if (!originalPlaceholderMap.has(el)) {
              originalPlaceholderMap.set(el, ph);
            }
            const translated = translateArabicToEnglish(ph.trim());
            if (translated !== ph.trim()) {
              el.placeholder = translated;
            }
          } else {
            if (originalPlaceholderMap.has(el)) {
              const orig = originalPlaceholderMap.get(el);
              if (orig !== undefined && el.placeholder !== orig) {
                el.placeholder = orig;
              }
            }
          }
        }
      }

      // 2. Title attribute
      if (el instanceof HTMLElement) {
        if (el.title && el.title.trim()) {
          if (language === 'en') {
            if (!originalTitleMap.has(el)) {
              originalTitleMap.set(el, el.title);
            }
            const translated = translateArabicToEnglish(el.title.trim());
            if (translated !== el.title.trim()) {
              el.title = translated;
            }
          } else {
            if (originalTitleMap.has(el)) {
              const orig = originalTitleMap.get(el);
              if (orig !== undefined && el.title !== orig) {
                el.title = orig;
              }
            }
          }
        }

        // 3. Aria-label attribute
        const ariaLabel = el.getAttribute('aria-label');
        if (ariaLabel && ariaLabel.trim()) {
          if (language === 'en') {
            if (!originalAriaLabelMap.has(el)) {
              originalAriaLabelMap.set(el, ariaLabel);
            }
            const translated = translateArabicToEnglish(ariaLabel.trim());
            if (translated !== ariaLabel.trim()) {
              el.setAttribute('aria-label', translated);
            }
          } else {
            if (originalAriaLabelMap.has(el)) {
              const orig = originalAriaLabelMap.get(el);
              if (orig !== undefined && el.getAttribute('aria-label') !== orig) {
                el.setAttribute('aria-label', orig);
              }
            }
          }
        }
      }
    };

    const translateNode = (node: Node) => {
      // If element, translate its interactive attributes
      if (node.nodeType === Node.ELEMENT_NODE) {
        translateElementAttributes(node as Element);
      }

      // Skip script, style, code, pre
      const parent = node.parentElement;
      if (!parent) return;

      const tag = parent.tagName.toLowerCase();
      if (['script', 'style', 'input', 'textarea', 'code', 'pre'].includes(tag)) {
        return;
      }

      // Skip elements marked explicitly as no-translate or inside prescription pad simulation
      if (
        parent.closest('#printable-prescription-pad') ||
        parent.closest('[data-no-translate="true"]') ||
        parent.closest('.no-translate') ||
        parent.closest('.patient-name')
      ) {
        return;
      }

      if (node.nodeType === Node.TEXT_NODE && node.nodeValue) {
        const raw = node.nodeValue;
        const trimmed = raw.trim();
        if (!trimmed) return;

        if (language === 'en') {
          // Store original if not yet stored
          if (!originalTextMap.has(node)) {
            originalTextMap.set(node, raw);
          }

          // Check if there's an Arabic translation
          const translated = translateArabicToEnglish(trimmed);
          if (translated !== trimmed) {
            // Keep leading and trailing whitespace
            const leadingWs = raw.match(/^\s*/)?.[0] || '';
            const trailingWs = raw.match(/\s*$/)?.[0] || '';
            node.nodeValue = leadingWs + translated + trailingWs;
          }
        } else {
          // Restore original Arabic
          if (originalTextMap.has(node)) {
            const orig = originalTextMap.get(node);
            if (orig !== undefined && node.nodeValue !== orig) {
              node.nodeValue = orig;
            }
          }
        }
      }
    };

    const walk = (node: Node) => {
      translateNode(node);
      let child = node.firstChild;
      while (child) {
        walk(child);
        child = child.nextSibling;
      }
    };

    // Run initial walk
    walk(rootEl);

    // Run mutation observer for dynamically rendered elements
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'characterData') {
          translateNode(mutation.target);
        } else if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((added) => {
            walk(added);
          });
        }
      }
    });

    observer.observe(rootEl, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      observer.disconnect();
    };
  }, [language]);

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        toggleLanguage,
        t,
        translateText,
        dir,
        isRTL,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    // Fallback if rendered outside LanguageProvider
    return {
      language: 'ar',
      setLanguage: () => {},
      toggleLanguage: () => {},
      t: (keyOrText: string, fallback?: string) => translations[keyOrText]?.ar || fallback || keyOrText,
      translateText: (text: string) => text,
      dir: 'rtl',
      isRTL: true,
    };
  }
  return context;
};


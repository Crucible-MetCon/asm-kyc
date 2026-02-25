import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { en, type TranslationKeys } from './en';
import { bem } from './bem';

export type Language = 'en' | 'bem';

const translations: Record<Language, TranslationKeys> = { en, bem };

interface I18nState {
  lang: Language;
  setLang: (lang: Language) => void;
  t: TranslationKeys;
}

const I18nContext = createContext<I18nState | null>(null);

export function I18nProvider({
  initialLang = 'en',
  children,
}: {
  initialLang?: Language;
  children: ReactNode;
}) {
  const [lang, setLangState] = useState<Language>(initialLang);

  const setLang = useCallback((newLang: Language) => {
    setLangState(newLang);
  }, []);

  const t = translations[lang];

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}

export function interpolate(
  template: string,
  vars: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? `{${key}}`));
}

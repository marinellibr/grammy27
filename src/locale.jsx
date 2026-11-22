import React, { createContext, useContext, useEffect, useState } from 'react';
import { initialLanguage, translate, LANGUAGE_KEY } from './i18n';
const LocaleContext = createContext(null);
export function LocaleProvider({ children }) {
  const [locale, setLocale] = useState(initialLanguage);
  useEffect(() => {
    document.documentElement.lang = locale === 'pt' ? 'pt-BR' : locale;
    document.title = translate(locale, 'My Grammy 2027 picks');
    try { localStorage.setItem(LANGUAGE_KEY, locale); } catch { /* Interface works without storage. */ }
  }, [locale]);
  return <LocaleContext.Provider value={{ locale, setLocale, t: (key, ...values) => translate(locale, key, ...values) }}>{children}</LocaleContext.Provider>;
}
export function useLocale() { return useContext(LocaleContext); }

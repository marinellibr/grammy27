import messages from './translations.json' with { type: 'json' };
export const LANGUAGES = [{ id: 'en', label: 'English' }, { id: 'pt', label: 'Português' }, { id: 'es', label: 'Español' }];
export const LANGUAGE_KEY = 'grammy27-language';
export function detectLanguage(preferences = [], saved = null) {
  if (LANGUAGES.some(lang => lang.id === saved)) return saved;
  for (const preference of preferences) {
    const base = String(preference).toLowerCase().split(/[-_]/)[0];
    if (LANGUAGES.some(lang => lang.id === base)) return base;
  }
  return 'en';
}
export function initialLanguage() {
  let saved;
  try { saved = localStorage.getItem(LANGUAGE_KEY); } catch { /* Private browsing may block storage. */ }
  return detectLanguage(navigator.languages?.length ? navigator.languages : [navigator.language], saved);
}
export function translate(locale, key, ...values) {
  const text = messages[key]?.[locale] || key;
  return String(text).replace(/\{(\d+)\}/g, (match, index) => values[index] ?? match);
}
export function categoryLabel(category, locale = 'en') {
  return translate(locale, category.name.replace(/\s*\(new for 2027\)/i, ''));
}
export function fieldName(field, locale = 'en') {
  return translate(locale, (field || 'General Field').replace(/^Field \d+:\s*/, ''));
}
export { messages };

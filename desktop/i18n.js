let catalog = {}, language = 'tr';
export const locale = () => language === 'tr' ? 'tr-TR' : 'en-US';
export const currentLanguage = () => language;
export function t(key, values = {}) {
  const entry = catalog[key];
  if (!entry) throw new Error('Unknown translation key: ' + key);
  return entry[language].replace(/\{([a-z]+)\}/g, (match, name) => Object.hasOwn(values, name) ? String(values[name]) : match);
}
export async function initializeTranslations() {
  const response = await fetch('/translations.json');
  if (!response.ok) throw new Error('Translation catalog unavailable');
  catalog = await response.json();
}
export function applyLanguage(value) {
  language = value === 'en' ? 'en' : 'tr';
  document.documentElement.lang = language;
  const roots = [document, ...Array.from(document.querySelectorAll('template'), el => el.content)];
  for (const root of roots) {
    for (const el of root.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
    for (const attr of ['aria-label','title','placeholder','alt']) for (const el of root.querySelectorAll('[data-i18n-' + attr + ']')) el.setAttribute(attr, t(el.getAttribute('data-i18n-' + attr)));
  }
  const select = document.querySelector('#language-select'); if (select) select.value = language;
  window.chrome?.webview?.postMessage('language:' + language);
  document.dispatchEvent(new Event('languagechange'));
}

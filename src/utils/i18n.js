const DEFAULT_LOCALE = 'en';

const LOCALES = {
  en: require('../../locales/en.json'),
  fr: require('../../locales/fr.json'),
};

// Picks a supported locale code from a ?lang= value, falling back to English.
function resolveLocale(lang) {
  const value = Array.isArray(lang) ? lang[0] : lang;
  if (typeof value !== 'string') return DEFAULT_LOCALE;
  const primary = value.trim().toLowerCase().split(/[-_]/)[0];
  return Object.hasOwn(LOCALES, primary) ? primary : DEFAULT_LOCALE;
}

// Returns the translated messages for a supported locale code.
function getMessages(code) {
  return LOCALES[code] || LOCALES[DEFAULT_LOCALE];
}

// Formats a date in the long style of the given locale, e.g. "Wednesday 25 November 2026".
function formatDate(date, intlLocale) {
  return new Intl.DateTimeFormat(intlLocale, { dateStyle: 'full' }).format(date);
}

// Escapes text so it can be placed safely inside HTML.
function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

module.exports = {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES: Object.keys(LOCALES),
  resolveLocale,
  getMessages,
  formatDate,
  escapeHtml,
};

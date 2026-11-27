const en = require('../locales/en.json');
const fr = require('../locales/fr.json');
const { resolveLocale, getMessages, formatDate, escapeHtml } = require('../src/utils/i18n');
const { renderFeedbackForm } = require('../src/views/feedbackPage');

describe('resolveLocale — ?lang= handling', () => {
  test('defaults to English when no language is given', () => {
    expect(resolveLocale(undefined)).toBe('en');
  });

  test('selects French for "fr", any letter case, or a regional tag like fr-CA', () => {
    expect(resolveLocale('fr')).toBe('fr');
    expect(resolveLocale('FR')).toBe('fr');
    expect(resolveLocale('fr-CA')).toBe('fr');
  });

  test.each(['de', 'xx<script>', '', '__proto__', 'toString', 123, null])(
    'falls back to English for unsupported value %p instead of crashing',
    (value) => {
      expect(resolveLocale(value)).toBe('en');
    }
  );

  test('uses the first value when ?lang= is repeated', () => {
    expect(resolveLocale(['fr', 'en'])).toBe('fr');
  });
});

describe('locale files', () => {
  test('English and French define exactly the same keys', () => {
    expect(Object.keys(fr).sort()).toEqual(Object.keys(en).sort());
  });

  test.each([['en', en], ['fr', fr]])('%s has exactly 5 non-empty essay questions', (_code, messages) => {
    expect(messages.questions).toHaveLength(5);
    messages.questions.forEach((q) => expect(q.trim()).not.toBe(''));
  });

  test('getMessages returns the French messages for "fr"', () => {
    expect(getMessages('fr').title).toBe(fr.title);
  });
});

describe('formatDate — locale-aware date', () => {
  const date = new Date(2026, 10, 25, 12, 0);

  test('uses English day and month names for en-GB', () => {
    const text = formatDate(date, 'en-GB');
    expect(text).toMatch(/Wednesday/);
    expect(text).toMatch(/25 November 2026/);
  });

  test('uses French day and month names for fr-FR', () => {
    const text = formatDate(date, 'fr-FR');
    expect(text).toMatch(/mercredi/);
    expect(text).toMatch(/25 novembre 2026/);
  });
});

describe('feedback page rendering', () => {
  const today = { iso: '2026-11-25', text: 'mercredi 25 novembre 2026' };
  const html = renderFeedbackForm({ code: 'fr', messages: fr, today });

  test('renders one textarea per question, labelled with the translated question', () => {
    expect(html.match(/<textarea/g)).toHaveLength(5);
    fr.questions.forEach((q) => expect(html).toContain(escapeHtml(q)));
  });

  test('marks the page language and shows the localised title and date', () => {
    expect(html).toContain('<html lang="fr">');
    expect(html).toContain(`<title>${escapeHtml(fr.title)}</title>`);
    expect(html).toContain('mercredi 25 novembre 2026');
  });

  test('escapes HTML special characters in text', () => {
    expect(escapeHtml(`<a href="x">Tom's</a> & co`)).toBe('&lt;a href=&quot;x&quot;&gt;Tom&#39;s&lt;/a&gt; &amp; co');
  });
});

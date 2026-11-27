const { escapeHtml: e, SUPPORTED_LOCALES, getMessages } = require('../utils/i18n');

const STYLES = `
  :root { color-scheme: light dark; --bg: #f6f7f9; --card: #fff; --text: #1d2330; --muted: #5b6475; --border: #d6dae1; --accent: #1f6feb; }
  @media (prefers-color-scheme: dark) { :root { --bg: #111418; --card: #1a1f26; --text: #e6e9ef; --muted: #9aa4b2; --border: #2f3640; --accent: #4c8dff; } }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--text); font: 16px/1.55 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
  main { max-width: 760px; margin: 0 auto; padding: 32px 16px 48px; }
  header { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: baseline; gap: 8px 16px; margin-bottom: 8px; }
  h1 { font-size: 1.6rem; margin: 0; }
  nav a { color: var(--accent); margin-left: 8px; text-decoration: none; }
  nav a[aria-current="true"] { font-weight: 700; text-decoration: underline; }
  .date { color: var(--muted); margin: 0 0 16px; }
  .card { background: var(--card); border: 1px solid var(--border); border-radius: 10px; padding: 24px; }
  ol { padding-left: 1.4rem; margin: 24px 0 0; }
  li { margin-bottom: 22px; }
  label { display: block; font-weight: 600; margin-bottom: 8px; }
  textarea { width: 100%; min-height: 110px; padding: 10px 12px; font: inherit; color: inherit; background: var(--bg); border: 1px solid var(--border); border-radius: 8px; resize: vertical; }
  textarea:focus, button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  button { font: inherit; font-weight: 600; color: #fff; background: var(--accent); border: 0; border-radius: 8px; padding: 10px 20px; cursor: pointer; }
`;

// Wraps page content in a complete HTML document for the given locale.
function layout(code, title, body) {
  return `<!doctype html>
<html lang="${e(code)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e(title)}</title>
<style>${STYLES}</style>
</head>
<body>
<main>
${body}
</main>
</body>
</html>`;
}

// Renders the links for switching between the supported languages.
function languageSwitcher(code, messages) {
  const links = SUPPORTED_LOCALES.map(
    (c) => `<a href="/feedback?lang=${c}" hreflang="${c}" lang="${c}"${c === code ? ' aria-current="true"' : ''}>${e(getMessages(c).language_name)}</a>`
  ).join('');
  return `<nav aria-label="${e(messages.language_label)}">${e(messages.language_label)}${e(messages.label_separator)}${links}</nav>`;
}

// Renders the feedback form with its five essay questions.
function renderFeedbackForm({ code, messages, today }) {
  const questions = messages.questions
    .map(
      (q, i) => `  <li>
    <label for="q${i + 1}">${e(q)}</label>
    <textarea id="q${i + 1}" name="q${i + 1}" rows="5" placeholder="${e(messages.answer_placeholder)}"></textarea>
  </li>`
    )
    .join('\n');

  return layout(
    code,
    messages.title,
    `<header>
  <h1>${e(messages.heading)}</h1>
  ${languageSwitcher(code, messages)}
</header>
<p class="date">${e(messages.date_label)}${e(messages.label_separator)}<time datetime="${e(today.iso)}">${e(today.text)}</time></p>
<form class="card" method="post" action="/feedback?lang=${e(code)}">
  <p>${e(messages.instructions)}</p>
  <ol>
${questions}
  </ol>
  <button type="submit">${e(messages.submit)}</button>
</form>`
  );
}

// Renders the thank-you page shown after the form is submitted.
function renderThankYou({ code, messages, today }) {
  return layout(
    code,
    messages.thanks_title,
    `<header>
  <h1>${e(messages.thanks_title)}</h1>
  ${languageSwitcher(code, messages)}
</header>
<p class="date">${e(messages.date_label)}${e(messages.label_separator)}<time datetime="${e(today.iso)}">${e(today.text)}</time></p>
<div class="card">
  <p>${e(messages.thanks_message)}</p>
  <p><a href="/feedback?lang=${e(code)}">${e(messages.back_link)}</a></p>
</div>`
  );
}

module.exports = { renderFeedbackForm, renderThankYou };

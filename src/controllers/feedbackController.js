const { resolveLocale, getMessages, formatDate } = require('../utils/i18n');
const { toSqlDateTime } = require('../utils/scheduling');
const { renderFeedbackForm, renderThankYou } = require('../views/feedbackPage');

// Builds the locale, messages and today's localised date for a request.
function pageContext(req) {
  const code = resolveLocale(req.query.lang);
  const messages = getMessages(code);
  const now = new Date();
  return { code, messages, today: { iso: toSqlDateTime(now).slice(0, 10), text: formatDate(now, messages.intl_locale) } };
}

// Sends an HTML page with the language headers set.
function sendHtml(res, code, html) {
  res.set('Content-Language', code).type('html').send(html);
}

// Shows the course feedback form in the requested language.
function showForm(req, res) {
  const ctx = pageContext(req);
  sendHtml(res, ctx.code, renderFeedbackForm(ctx));
}

// Shows the thank-you page after the form is submitted.
function submit(req, res) {
  const ctx = pageContext(req);
  sendHtml(res, ctx.code, renderThankYou(ctx));
}

module.exports = { showForm, submit };

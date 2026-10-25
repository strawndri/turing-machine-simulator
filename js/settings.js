'use strict';

/* Language and theme: applying them to the page, and remembering the choice in the browser. */

const remember = (key, value) => { try { localStorage.setItem(key, value); } catch (_) {} };
const recall = key => { try { return localStorage.getItem(key); } catch (_) { return null; } };

/* writes every text of the current language into the page; elements ask for a text with data-i18n attributes */
function applyStatic() {
  document.documentElement.lang = lang === 'pt' ? 'pt-BR' : 'en';
  document.title = tr('title');
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = tr(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-title]').forEach(el => { el.title = tr(el.dataset.i18nTitle); });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => { el.placeholder = tr(el.dataset.i18nPh); });
  document.querySelectorAll('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', tr(el.dataset.i18nAria)); });
  $('#speed-out').textContent = tr('speed_out', speed);
  $('#lang').value = lang;
}

function setLang(code) {
  lang = code in I18N ? code : 'pt';
  remember(LANG_KEY, lang);
  applyStatic();
  forceBuild = true;
  renderAll();
}

const systemTheme = () => (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

function setTheme(name) {
  if (!THEMES.includes(name)) name = systemTheme();
  document.documentElement.dataset.theme = name;
  $('#theme').value = name;
  remember(THEME_KEY, name);
}

$('#lang').addEventListener('change', ev => setLang(ev.target.value));
$('#theme').addEventListener('change', ev => setTheme(ev.target.value));

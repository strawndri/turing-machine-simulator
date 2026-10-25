'use strict';

/* ---------- start ---------- */
function renderAll() {
  renderToolbar(); renderCanvas(); renderInspector(); renderTapes(); renderStatus(); renderTree();
  $('#blank').value = M.blank;
  renderGamma();
}
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
function setLang(l) {
  lang = l in I18N ? l : 'pt';
  try { localStorage.setItem(LANG_KEY, lang); } catch (_) {}
  applyStatic(); forceBuild = true; renderAll();
}
function setTheme(name) {
  if (!THEMES.includes(name)) name = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.dataset.theme = name;
  $('#theme').value = name;
  try { localStorage.setItem(THEME_KEY, name); } catch (_) {}
}
$('#lang').addEventListener('change', ev => setLang(ev.target.value));
$('#theme').addEventListener('change', ev => setTheme(ev.target.value));

let savedLang = null, savedTheme = null;
try { savedLang = localStorage.getItem(LANG_KEY); savedTheme = localStorage.getItem(THEME_KEY); } catch (_) {}
lang = savedLang in I18N ? savedLang : 'en';
setTheme(savedTheme);
applyStatic();
M = loadSaved() || buildExample('abc');
renderAll();
new ResizeObserver(() => {
  if (!fitted && svg.getBoundingClientRect().width > 0) { fitted = true; fit(); scrollAll(false); }
}).observe(svg);

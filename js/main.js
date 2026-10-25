'use strict';

/* Start-up: draws everything and starts the app. */

function renderAll() {
  renderToolbar(); renderCanvas(); renderInspector(); renderTapes(); renderStatus(); renderTree();
  $('#blank').value = M.blank;
  renderGamma();
}

/* the saved language and theme (English and the system theme at first), then the saved machine or an example */
const savedLang = recall(LANG_KEY);
lang = savedLang in I18N ? savedLang : 'en';
setTheme(recall(THEME_KEY));
applyStatic();
M = loadSaved() || buildExample('abc');
renderAll();

/* the diagram is fitted once, as soon as the board has a size */
new ResizeObserver(() => {
  if (!fitted && svg.getBoundingClientRect().width > 0) { fitted = true; fit(); scrollAll(false); }
}).observe(svg);

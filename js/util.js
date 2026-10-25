'use strict';

const R = 28, LIMIT = 5000, KEY = 'turing-machine-simulator-v1', COLW = 42, MAXK = 4;
const LANG_KEY = 'turing-machine-simulator-lang', THEME_KEY = 'turing-machine-simulator-theme';
const THEMES = ['light', 'dark'];
let lang = 'pt';
const tr = (k, ...a) => { const v = I18N[lang][k] ?? I18N.pt[k] ?? k; return typeof v === 'function' ? v(...a) : v; };
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const unit = (x, y) => { const l = Math.hypot(x, y) || 1; return { x: x / l, y: y / l }; };
const f = p => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`;

let toastTimer = 0;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 3800);
}

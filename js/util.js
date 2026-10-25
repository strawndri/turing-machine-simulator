'use strict';

/* Settings and small helpers used everywhere. */

const R = 28;                // radius of a state circle in the diagram
const LIMIT = 5000;          // steps before a deterministic run gives up
const COLW = 42;             // width of a tape cell column, in px (keep in sync with .col in the css)
const MAXK = 4;              // most tapes a machine can have
const KEY = 'turing-machine-simulator-v1';
const LANG_KEY = 'turing-machine-simulator-lang', THEME_KEY = 'turing-machine-simulator-theme';
const THEMES = ['light', 'dark'];

/* ---------- translation ---------- */

let lang = 'pt';
/* the text for a key in the current language; texts that need values are functions: tr('k_out', 2) */
const tr = (key, ...args) => {
  const text = I18N[lang][key] ?? I18N.pt[key] ?? key;
  return typeof text === 'function' ? text(...args) : text;
};

/* ---------- small helpers ---------- */

const $ = selector => document.querySelector(selector);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const unit = (x, y) => { const length = Math.hypot(x, y) || 1; return { x: x / length, y: y / length }; };
/* a point as text for an SVG path: "12.0 34.5" */
const f = p => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`;

/* ---------- messages ---------- */

let toastTimer = 0;
function toast(message) {
  const box = $('#toast');
  box.textContent = message;
  box.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { box.hidden = true; }, 3800);
}

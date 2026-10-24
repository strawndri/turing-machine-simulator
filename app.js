(() => {
'use strict';
const R = 28, LIMIT = 5000, KEY = 'turing-machine-simulator-v1', COLW = 46, MAXK = 4;
const LANG_KEY = 'turing-machine-simulator-lang', THEME_KEY = 'turing-machine-simulator-theme';
const THEMES = ['auto', 'light', 'dark', 'blueprint', 'terminal', 'sepia'];
let lang = 'pt';
const tr = (k, ...a) => { const v = I18N[lang][k] ?? I18N.pt[k] ?? k; return typeof v === 'function' ? v(...a) : v; };
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const unit = (x, y) => { const l = Math.hypot(x, y) || 1; return { x: x / l, y: y / l }; };
const f = p => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`;

const svg = $('#svg'), vp = $('#vp'), board = $('#board'), insp = $('#inspector');
const tapesEl = $('#tapes'), panel = $('#tape-panel');

/* ---------- model ---------- */
let M, sel = null, tool = 'select', pending = null, hover = null, ghost = null;
let group = { s: new Set(), e: new Set() }, spaceDown = false, overBoard = false;
const hasGroup = () => group.s.size + group.e.size > 0;
const clearGroup = () => { group = { s: new Set(), e: new Set() }; };
let view = { x: 0, y: 0, k: 1 }, drag = null, ignoreUp = false, fitted = false;
let run = null, playing = false, timer = 0, speed = 4, notice = '';
let blocks = [], builtK = 0, forceBuild = true, cursor = [], pads = [], ranges = [];
let undoStack = [], redoStack = [], lastKey = null, lastT = 0;

const newTape = () => ({ cells: {}, head: 0, ro: false });
const blankMachine = () => ({ states: [], edges: [], blank: 'B', gamma: ['B'], k: 1, tapes: [newTape()], seq: 1 });
const inG = c => M.gamma.includes(c);
const S = id => M.states.find(s => s.id === id);
const E = id => M.edges.find(e => e.id === id);
const initialState = () => M.states.find(s => s.initial);
const symAt = (cells, i) => cells[i] ?? M.blank;
const tapeData = t => (run ? run.tapes : M.tapes)[t];
const ruleText = r => {
  const j = a => a.map(x => x || '·').join(', ');
  return `[${j(r.r)}; ${j(r.w)}; ${r.d.join(', ')}]`;
};
const nameHtml = n => { const a = Array.from(n); return a.length > 1 ? `${esc(a[0])}<sub>${esc(a.slice(1).join(''))}</sub>` : esc(n); };
const nameSvg = n => { const a = Array.from(n); return a.length > 1 ? `${esc(a[0])}<tspan class="sub" dy="5">${esc(a.slice(1).join(''))}</tspan>` : esc(n); };

function usedSymbols(m) {
  const s = new Set([m.blank]);
  m.edges.forEach(e => e.rules.forEach(r => { r.r.forEach(c => c && s.add(c)); r.w.forEach(c => c && s.add(c)); }));
  m.tapes.forEach(t => Object.values(t.cells).forEach(c => s.add(c)));
  return [...s];
}
function setTape(m, str, t = 0) {
  const tp = m.tapes[t];
  tp.cells = {}; tp.head = 0;
  Array.from(str).forEach((ch, i) => { if (ch.trim() && ch !== m.blank) tp.cells[i] = ch; });
}
function tapeString(t) {
  const ks = Object.keys(M.tapes[t].cells).map(Number);
  if (!ks.length) return '';
  let s = '';
  for (let i = Math.min(...ks); i <= Math.max(...ks); i++) s += M.tapes[t].cells[i] ?? M.blank;
  return s;
}

function examples(name) {
  const m = blankMachine();
  const st = (nm, x, y, o = {}) => { const s = { id: 's' + m.seq++, name: nm, x, y, initial: !!o.initial, final: !!o.final }; m.states.push(s); return s.id; };
  const ed = (a, b, rules, o = {}) => m.edges.push({
    id: 'e' + m.seq++, from: a, to: b, bend: o.bend || 0, angle: o.angle ?? -90,
    rules: rules.map(([r, w, d]) => ({ r: [].concat(r), w: [].concat(w), d: [].concat(d) }))
  });
  if (name === 'abc') {
    const q0 = st('q0', 130, 180, { initial: true }), q1 = st('q1', 340, 180), qN = st('qN', 550, 180), q2 = st('q2', 780, 180);
    const q3 = st('q3', 130, 370), qM = st('qM', 340, 370), q4 = st('q4', 550, 370, { final: true });
    ed(q0, q1, [['a', 'X', 'R']]);
    ed(q1, q1, [['Y', 'Y', 'R'], ['a', 'a', 'R']]);
    ed(q1, qN, [['b', 'Y', 'R']]);
    ed(qN, qN, [['Z', 'Z', 'R'], ['b', 'b', 'R']]);
    ed(qN, q2, [['c', 'Z', 'L']]);
    ed(q2, q2, [['Z', 'Z', 'L'], ['b', 'b', 'L'], ['Y', 'Y', 'L'], ['a', 'a', 'L']]);
    ed(q2, q0, [['X', 'X', 'R']], { bend: 110 });
    ed(q0, q3, [['Y', 'Y', 'R']]);
    ed(q3, q3, [['Y', 'Y', 'R']], { angle: 90 });
    ed(q3, qM, [['Z', 'Z', 'R']]);
    ed(qM, qM, [['Z', 'Z', 'R']], { angle: 90 });
    ed(qM, q4, [['B', 'B', 'R']]);
    setTape(m, 'aabbcc');
    m.gamma = ['a', 'b', 'c', 'X', 'Y', 'Z', 'B'];
  } else if (name === 'inc') {
    const q0 = st('q0', 160, 200, { initial: true }), q1 = st('q1', 430, 200), q2 = st('q2', 700, 200, { final: true });
    ed(q0, q0, [['0', '0', 'R'], ['1', '1', 'R']]);
    ed(q0, q1, [['B', 'B', 'L']]);
    ed(q1, q1, [['1', '0', 'L']]);
    ed(q1, q2, [['0', '1', 'S'], ['B', '1', 'S']]);
    setTape(m, '1011');
    m.gamma = ['0', '1', 'B'];
  } else if (name === 'copy') {
    const q0 = st('q0', 120, 230, { initial: true }), q1 = st('q1', 360, 70), q2 = st('q2', 600, 150);
    const q3 = st('q3', 360, 390), q4 = st('q4', 600, 310);
    const q5 = st('q5', 120, 540), q6 = st('q6', 400, 540), q7 = st('q7', 660, 540, { final: true });
    ed(q0, q1, [['0', 'A', 'R']]);
    ed(q1, q1, [['0', '0', 'R'], ['1', '1', 'R'], ['D', 'D', 'R'], ['E', 'E', 'R']]);
    ed(q1, q2, [['B', 'D', 'L']]);
    ed(q2, q2, [['0', '0', 'L'], ['1', '1', 'L'], ['D', 'D', 'L'], ['E', 'E', 'L']], { angle: 0 });
    ed(q2, q0, [['A', 'A', 'R'], ['C', 'C', 'R']]);
    ed(q0, q3, [['1', 'C', 'R']]);
    ed(q3, q3, [['0', '0', 'R'], ['1', '1', 'R'], ['D', 'D', 'R'], ['E', 'E', 'R']], { angle: 90 });
    ed(q3, q4, [['B', 'E', 'L']]);
    ed(q4, q4, [['0', '0', 'L'], ['1', '1', 'L'], ['D', 'D', 'L'], ['E', 'E', 'L']], { angle: 0 });
    ed(q4, q0, [['A', 'A', 'R'], ['C', 'C', 'R']]);
    ed(q0, q5, [['D', 'D', 'S'], ['E', 'E', 'S'], ['B', 'B', 'S']]);
    ed(q5, q5, [['D', 'D', 'R'], ['E', 'E', 'R']], { angle: 90 });
    ed(q5, q6, [['B', 'B', 'L']]);
    ed(q6, q6, [['D', '0', 'L'], ['E', '1', 'L'], ['A', '0', 'L'], ['C', '1', 'L']], { angle: 90 });
    ed(q6, q7, [['B', 'B', 'R']]);
    setTape(m, '0110');
    m.gamma = ['0', '1', 'A', 'C', 'D', 'E', 'B'];
  } else if (name === 'copy2') {
    const q0 = st('q0', 220, 190, { initial: true }), q1 = st('q1', 560, 190, { final: true });
    ed(q0, q0, [[['0', 'B'], ['0', '0'], ['R', 'R']], [['1', 'B'], ['1', '1'], ['R', 'R']]]);
    ed(q0, q1, [[['B', 'B'], ['B', 'B'], ['S', 'S']]]);
    m.k = 2; m.tapes = [newTape(), newTape()];
    m.tapes[0].ro = true;
    setTape(m, '0110', 0);
    m.gamma = ['0', '1', 'B'];
  } else if (name === 'soma') {
    const q0 = st('q0', 100, 160, { initial: true }), q1 = st('q1', 360, 160), q2 = st('q2', 620, 160);
    const q3 = st('q3', 420, 400), q4 = st('q4', 800, 400), qf = st('qf', 610, 570, { final: true });
    const bits = ['0', '1'];
    ed(q0, q0, bits.map(a => [[a, 'B'], [a, 'B'], ['R', 'S']]));
    ed(q0, q1, [[['#', 'B'], ['#', 'B'], ['R', 'S']]]);
    ed(q1, q1, bits.map(a => [[a, 'B'], [a, a], ['R', 'R']]));
    ed(q1, q2, [[['B', 'B'], ['B', 'B'], ['L', 'L']]]);
    ed(q2, q2, bits.flatMap(a => bits.map(b => [[a, b], [a, b], ['L', 'S']])));
    ed(q2, q3, bits.map(b => [['#', b], ['#', b], ['L', 'S']]));
    ed(q3, q3, [[['0', '0'], ['0', '0'], ['L', 'L']], [['0', '1'], ['0', '1'], ['L', 'L']], [['1', '0'], ['1', '1'], ['L', 'L']]], { angle: 180 });
    ed(q3, q4, [[['1', '1'], ['1', '0'], ['L', 'L']]], { bend: 40 });
    ed(q4, q3, [[['0', '0'], ['0', '1'], ['L', 'L']]], { bend: 40 });
    ed(q4, q4, [[['0', '1'], ['0', '0'], ['L', 'L']], [['1', '0'], ['1', '0'], ['L', 'L']], [['1', '1'], ['1', '1'], ['L', 'L']]], { angle: 0 });
    ed(q3, qf, [[['B', 'B'], ['B', 'B'], ['S', 'R']]]);
    ed(q4, qf, [[['B', 'B'], ['B', '1'], ['S', 'S']]]);
    m.k = 2; m.tapes = [newTape(), newTape()];
    setTape(m, '10#11', 0);
    m.gamma = ['0', '1', '#', 'B'];
  }
  return m;
}

function parseMachine(o) {
  if (!o || !Array.isArray(o.states) || !Array.isArray(o.edges)) return null;
  const m = blankMachine();
  m.blank = typeof o.blank === 'string' && Array.from(o.blank).length === 1 ? o.blank : 'B';
  const src = Array.isArray(o.tapes) ? o.tapes : (o.tape && typeof o.tape === 'object' ? [o.tape] : []);
  const k = clamp(Number.isInteger(o.k) ? o.k : (src.length || 1), 1, MAXK);
  m.k = k;
  m.tapes = Array.from({ length: k }, (_, i) => {
    const s = src[i] || {}, tp = newTape();
    tp.head = Number.isInteger(s.head) ? s.head : 0;
    tp.ro = !!s.ro && k > 1;
    for (const [c, v] of Object.entries(s.cells || {})) {
      if (Number.isInteger(+c) && typeof v === 'string' && v.length === 1 && v !== m.blank) tp.cells[+c] = v;
    }
    return tp;
  });
  const ids = new Set();
  for (const s of o.states) {
    if (!s || typeof s.id !== 'string' || ids.has(s.id)) return null;
    ids.add(s.id);
    m.states.push({ id: s.id, name: String(s.name || s.id).slice(0, 6), x: +s.x || 0, y: +s.y || 0, initial: !!s.initial, final: !!s.final });
  }
  let seen = false;
  m.states.forEach(s => { if (s.initial) { if (seen) s.initial = false; seen = true; } });
  const sym = (v, i, def) => { const a = Array.isArray(v) ? v : [v]; return a[i] === undefined || a[i] === null ? def : String(a[i]).slice(0, 1); };
  const eids = new Set();
  for (const e of o.edges) {
    if (!e || !ids.has(e.from) || !ids.has(e.to) || !Array.isArray(e.rules) || !e.rules.length) continue;
    const id = String(e.id);
    if (eids.has(id)) continue;
    eids.add(id);
    m.edges.push({
      id, from: e.from, to: e.to, bend: +e.bend || 0, angle: Number.isFinite(+e.angle) ? +e.angle : -90,
      rules: e.rules.map(r => ({
        r: Array.from({ length: k }, (_, i) => sym(r?.r, i, m.blank)),
        w: Array.from({ length: k }, (_, i) => sym(r?.w, i, m.blank)),
        d: Array.from({ length: k }, (_, i) => { const a = Array.isArray(r?.d) ? r.d : [r?.d]; return ['L', 'R', 'S'].includes(a[i]) ? a[i] : (i ? 'S' : 'R'); })
      }))
    });
  }
  m.tapes.forEach((tp, i) => { if (tp.ro) m.edges.forEach(e => e.rules.forEach(r => { r.w[i] = r.r[i]; })); });
  const nums = [...ids, ...eids].map(x => parseInt(String(x).slice(1)) || 0);
  m.seq = 1 + Math.max(0, ...nums);
  const g = Array.isArray(o.gamma) ? o.gamma.filter(c => typeof c === 'string' && Array.from(c).length === 1 && c.trim()) : null;
  m.gamma = [...new Set(g || usedSymbols(m))];
  if (!m.gamma.includes(m.blank)) m.gamma.push(m.blank);
  return m;
}

/* ---------- history and persistence ---------- */
const snap = () => JSON.stringify(M);
function checkpoint(key) {
  const now = Date.now();
  if (key && key === lastKey && now - lastT < 1200) { lastT = now; return; }
  lastKey = key || null; lastT = now;
  undoStack.push(snap());
  if (undoStack.length > 80) undoStack.shift();
  redoStack = [];
  renderToolbar();
}
function restore(json) {
  M = JSON.parse(json);
  clearGroup();
  pause(); run = null; notice = ''; pending = null; lastKey = null; forceBuild = true;
  if (sel && !(sel.kind === 'state' ? S(sel.id) : E(sel.id))) sel = null;
  renderAll(); save();
}
function undo() { if (!undoStack.length) return; redoStack.push(snap()); restore(undoStack.pop()); }
function redo() { if (!redoStack.length) return; undoStack.push(snap()); restore(redoStack.pop()); }
function save() { try { localStorage.setItem(KEY, snap()); } catch (_) {} }
function loadSaved() {
  try { const t = localStorage.getItem(KEY); if (t) return parseMachine(JSON.parse(t)); } catch (_) {}
  return null;
}
let toastTimer = 0;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 3800);
}

/* ---------- diagram geometry ---------- */
function geom(e) {
  const a = S(e.from), b = S(e.to), k = e.rules.length;
  const w = Math.max(...e.rules.map(r => ruleText(r).length)) * 6.6;
  let P0, P1, C, mid, t, s, path, nb = null;
  if (a === b) {
    const A = (e.angle ?? -90) * Math.PI / 180, sp = .5;
    const pt = (r, q) => ({ x: a.x + r * Math.cos(q), y: a.y + r * Math.sin(q) });
    P0 = pt(R, A - sp); P1 = pt(R, A + sp);
    const C1 = pt(R + 54, A - sp * .8), C2 = pt(R + 54, A + sp * .8);
    mid = { x: (P0.x + 3 * C1.x + 3 * C2.x + P1.x) / 8, y: (P0.y + 3 * C1.y + 3 * C2.y + P1.y) / 8 };
    t = unit(P1.x - C2.x, P1.y - C2.y);
    path = `M${f(P0)} C${f(C1)} ${f(C2)} ${f(P1)}`;
    s = { x: Math.cos(A), y: Math.sin(A) };
  } else {
    const u = unit(b.x - a.x, b.y - a.y);
    nb = { x: u.y, y: -u.x };
    const bend = e.bend || 0;
    const m0 = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    C = { x: m0.x + nb.x * bend * 2, y: m0.y + nb.y * bend * 2 };
    const d1 = unit(C.x - a.x, C.y - a.y), d2 = unit(C.x - b.x, C.y - b.y);
    P0 = { x: a.x + d1.x * R, y: a.y + d1.y * R };
    P1 = { x: b.x + d2.x * R, y: b.y + d2.y * R };
    mid = { x: .25 * P0.x + .5 * C.x + .25 * P1.x, y: .25 * P0.y + .5 * C.y + .25 * P1.y };
    t = unit(P1.x - C.x, P1.y - C.y);
    const sg = bend > 0 ? 1 : bend < 0 ? -1 : (Math.abs(nb.y) > .3 ? (nb.y < 0 ? 1 : -1) : 1);
    s = { x: nb.x * sg, y: nb.y * sg };
    path = bend ? `M${f(P0)} Q${f(C)} ${f(P1)}` : `M${f(P0)} L${f(P1)}`;
  }
  const back = { x: P1.x - t.x * 11, y: P1.y - t.y * 11 }, pr = { x: -t.y * 5, y: t.x * 5 };
  const arrow = `${f(P1)} ${f({ x: back.x + pr.x, y: back.y + pr.y })} ${f({ x: back.x - pr.x, y: back.y - pr.y })}`;
  const off = 10 + Math.abs(s.y) * 8 * k + Math.abs(s.x) * w / 2;
  return { path, arrow, L: { x: mid.x + s.x * off, y: mid.y + s.y * off }, w, k, nb, mid };
}

function stateAt(p) {
  for (let i = M.states.length - 1; i >= 0; i--) {
    const s = M.states[i];
    if (Math.hypot(p.x - s.x, p.y - s.y) <= R + 4) return s;
  }
  return null;
}
const world = e => { const r = svg.getBoundingClientRect(); return { x: (e.clientX - r.left - view.x) / view.k, y: (e.clientY - r.top - view.y) / view.k }; };

function boundsPoints() {
  const pts = [];
  M.states.forEach(s => { pts.push([s.x - R - 70, s.y - R - 12], [s.x + R + 12, s.y + R + 12]); });
  M.edges.forEach(e => { const g = geom(e); pts.push([g.L.x - g.w / 2 - 8, g.L.y - 8 * g.k - 8], [g.L.x + g.w / 2 + 8, g.L.y + 8 * g.k + 8]); });
  return pts;
}
function fit() {
  const r = svg.getBoundingClientRect();
  if (!r.width) return;
  const pts = boundsPoints();
  if (!pts.length) { view = { x: r.width / 2, y: r.height / 2, k: 1 }; return renderCanvas(); }
  const x0 = Math.min(...pts.map(p => p[0])), x1 = Math.max(...pts.map(p => p[0]));
  const y0 = Math.min(...pts.map(p => p[1])), y1 = Math.max(...pts.map(p => p[1]));
  const top = 58, gap = 18;
  const k = clamp(Math.min((r.width - 2 * gap) / (x1 - x0), (r.height - top - 40) / (y1 - y0)), .3, 1.3);
  view = { k, x: (r.width - (x1 - x0) * k) / 2 - x0 * k, y: top + (r.height - top - 40 - (y1 - y0) * k) / 2 - y0 * k };
  renderCanvas();
}
function zoomAt(factor, cx, cy) {
  const r = svg.getBoundingClientRect();
  cx ??= r.width / 2; cy ??= r.height / 2;
  const k = clamp(view.k * factor, .3, 2.5), q = k / view.k;
  view = { k, x: cx - (cx - view.x) * q, y: cy - (cy - view.y) * q };
  renderCanvas();
}

/* ---------- diagram drawing ---------- */
function renderCanvas() {
  let lines = '', labels = '', nodes = '', texts = '', init = '', gh = '';
  for (const e of M.edges) {
    const g = geom(e);
    const isSel = (sel && sel.kind === 'edge' && sel.id === e.id) || group.e.has(e.id);
    const act = run && run.last && run.last.e === e.id;
    const cls = (isSel ? ' sel' : '') + (act ? ' act' : '');
    lines += `<g class="edge${cls}" data-kind="edge" data-id="${e.id}"><path class="hit" d="${g.path}"/><path class="line" d="${g.path}"/><polygon class="tip" points="${g.arrow}"/></g>`;
    const y0 = g.L.y - (g.k - 1) * 8 + 5;
    const tsp = e.rules.map((r, i) => `<tspan x="${g.L.x.toFixed(1)}"${i ? ' dy="16"' : ''}${act && run.last.r === i ? ' class="on"' : ''}>${esc(ruleText(r))}</tspan>`).join('');
    labels += `<g class="elabel${cls}" data-kind="edge" data-id="${e.id}"><rect x="${(g.L.x - g.w / 2 - 4).toFixed(1)}" y="${(g.L.y - 8 * g.k).toFixed(1)}" width="${(g.w + 8).toFixed(1)}" height="${16 * g.k}"/><text text-anchor="middle" y="${y0.toFixed(1)}">${tsp}</text></g>`;
  }
  const ini = initialState();
  if (ini) {
    const x0 = ini.x - R - 48, x1 = ini.x - R;
    init = `<g class="init"><path d="M${x0} ${ini.y} L${x1 - 8} ${ini.y}"/><polygon points="${x1},${ini.y} ${x1 - 11},${ini.y - 5} ${x1 - 11},${ini.y + 5}"/><text x="${x0 - 8}" y="${ini.y + 5}" text-anchor="end">${esc(tr('initial'))}</text></g>`;
  }
  for (const s of M.states) {
    let cls = '';
    if ((sel && sel.kind === 'state' && sel.id === s.id) || group.s.has(s.id)) cls += ' sel';
    if (run && run.state === s.id) cls += run.status === 'accepted' ? ' ok' : run.status === 'rejected' || run.status === 'limit' ? ' bad' : ' cur';
    if (pending === s.id) cls += ' pend';
    else if (hover === s.id && pending) cls += ' target';
    nodes += `<g class="state${cls}" data-kind="state" data-id="${s.id}" transform="translate(${s.x} ${s.y})">`
      + (cls.includes(' sel') ? `<circle class="selring" r="${R + 7}"/>` : '')
      + `<circle class="body" r="${R}"/>` + (s.final ? `<circle class="inner" r="${R - 5}"/>` : '') + '</g>';
    texts += `<text class="nm" x="${s.x}" y="${s.y + 7}" text-anchor="middle">${nameSvg(s.name)}</text>`;
  }
  if (pending && ghost) { const p = S(pending); if (p) gh = `<path class="ghost" d="M${p.x} ${p.y} L${ghost.x.toFixed(1)} ${ghost.y.toFixed(1)}"/>`; }
  let mq = '';
  if (drag && drag.type === 'marquee' && drag.moved) {
    const x = Math.min(drag.p0.x, drag.p1.x), y = Math.min(drag.p0.y, drag.p1.y);
    mq = `<rect class="marquee" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${Math.abs(drag.p1.x - drag.p0.x).toFixed(1)}" height="${Math.abs(drag.p1.y - drag.p0.y).toFixed(1)}"/>`;
  }
  const rc = drag && drag.moved ? '' : ' class="rough"';
  vp.innerHTML = `<g${rc}>${lines}</g>` + init + gh + `<g${rc}>${nodes}</g>` + `<g>${texts}</g>` + labels + mq;
  vp.setAttribute('transform', `translate(${view.x.toFixed(1)} ${view.y.toFixed(1)}) scale(${view.k.toFixed(4)})`);
  const g = 22 * view.k;
  board.style.backgroundSize = `${g}px ${g}px`;
  board.style.backgroundPosition = `${view.x}px ${view.y}px`;
  board.dataset.tool = tool;
  const hints = { select: tr('hint_select'), pan: tr('hint_pan'), state: tr('hint_state'), edge: pending ? tr('hint_edge_pending') : tr('hint_edge') };
  $('#hint').textContent = hints[tool];
}

/* ---------- diagram interaction ---------- */
function nextName() {
  const used = new Set(M.states.map(s => s.name));
  for (let i = 0; ; i++) if (!used.has('q' + i)) return 'q' + i;
}
function newRule() {
  return { r: Array(M.k).fill(''), w: Array(M.k).fill(''), d: Array.from({ length: M.k }, (_, i) => (i ? 'S' : 'R')) };
}
function addState(p) {
  checkpoint();
  const s = { id: 's' + M.seq++, name: nextName(), x: Math.round(p.x / 10) * 10, y: Math.round(p.y / 10) * 10, initial: !M.states.length, final: false };
  M.states.push(s);
  clearGroup();
  sel = { kind: 'state', id: s.id };
  renderAll(); save();
}
function createEdge(from, to) {
  checkpoint();
  let e = M.edges.find(x => x.from === from && x.to === to);
  if (e) e.rules.push(newRule());
  else {
    e = { id: 'e' + M.seq++, from, to, rules: [newRule()], bend: 0, angle: -90 };
    const rev = from !== to && M.edges.find(x => x.from === to && x.to === from);
    if (rev) { e.bend = 38; if (!rev.bend) rev.bend = 38; }
    M.edges.push(e);
  }
  clearGroup();
  sel = { kind: 'edge', id: e.id };
  renderAll(); save();
  const el = $(`#rr-${e.rules.length - 1}-0`); if (el) el.focus();
}

svg.addEventListener('pointerdown', ev => {
  if (ev.button && ev.button !== 1) return;
  const p = world(ev);
  const tg = ev.target.closest('[data-kind]');
  const t = tg ? { kind: tg.dataset.kind, id: tg.dataset.id } : null;
  svg.setPointerCapture(ev.pointerId);
  drag = null; ignoreUp = false;
  const down = { sx: ev.clientX, sy: ev.clientY, moved: false };

  if (ev.button === 1 || spaceDown || tool === 'pan') {
    ev.preventDefault();
    drag = { type: 'pan', vx: view.x, vy: view.y, ...down };
    svg.classList.add('panning');
    return;
  }

  if (tool === 'state' && !t) { addState(p); ignoreUp = true; return; }
  if (tool === 'edge' && t && t.kind === 'state') {
    if (pending) { const from = pending; pending = null; ghost = null; createEdge(from, t.id); ignoreUp = true; return; }
    pending = t.id; ghost = p; drag = { type: 'connect', ...down }; renderCanvas(); return;
  }
  if (tool === 'edge' && pending && !t) { pending = null; ghost = null; }

  if (t && t.kind === 'state') {
    const inGroup = group.s.has(t.id);
    if (!inGroup && (!sel || sel.kind !== 'state' || sel.id !== t.id || hasGroup())) { clearGroup(); sel = { kind: 'state', id: t.id }; renderInspector(); }
    const ids = inGroup ? [...group.s] : [t.id];
    drag = { type: 'move', offs: ids.map(i => ({ id: i, dx: p.x - S(i).x, dy: p.y - S(i).y })), ...down };
  } else if (t && t.kind === 'edge') {
    const e = E(t.id), g = geom(e);
    if (!group.e.has(t.id) && (!sel || sel.kind !== 'edge' || sel.id !== t.id || hasGroup())) { clearGroup(); sel = { kind: 'edge', id: t.id }; renderInspector(); }
    drag = { type: 'bend', id: t.id, p0: p, bend0: e.bend || 0, nb: g.nb, ...down };
  } else {
    clearGroup();
    if (sel) sel = null;
    renderInspector();
    drag = { type: 'marquee', p0: p, p1: p, ...down };
  }
  renderCanvas();
});

svg.addEventListener('pointermove', ev => {
  const p = world(ev);
  if (pending) {
    ghost = p;
    const h = stateAt(p); hover = h ? h.id : null;
    if (drag && drag.type === 'connect' && Math.hypot(ev.clientX - drag.sx, ev.clientY - drag.sy) > 8) drag.moved = true;
    renderCanvas();
    return;
  }
  if (!drag) return;
  if (!drag.moved && Math.hypot(ev.clientX - drag.sx, ev.clientY - drag.sy) < 3) return;
  if (!drag.moved) { drag.moved = true; if (drag.type === 'move' || drag.type === 'bend') checkpoint(); }
  if (drag.type === 'move') {
    drag.offs.forEach(o => { const s = S(o.id); s.x = Math.round((p.x - o.dx) / 10) * 10; s.y = Math.round((p.y - o.dy) / 10) * 10; });
  } else if (drag.type === 'bend') {
    const e = E(drag.id);
    if (e.from === e.to) {
      const s = S(e.from);
      e.angle = Math.round(Math.atan2(p.y - s.y, p.x - s.x) * 180 / Math.PI / 5) * 5;
    } else {
      const d = (p.x - drag.p0.x) * drag.nb.x + (p.y - drag.p0.y) * drag.nb.y;
      const b = drag.bend0 + d;
      e.bend = Math.abs(b) < 8 ? 0 : Math.round(b);
    }
  } else if (drag.type === 'pan') {
    view.x = drag.vx + (ev.clientX - drag.sx); view.y = drag.vy + (ev.clientY - drag.sy);
  } else if (drag.type === 'marquee') {
    drag.p1 = p;
    group = marqueeSets(drag);
  }
  renderCanvas();
});

function endPointer(ev) {
  if (ignoreUp) { ignoreUp = false; drag = null; return; }
  const d = drag; drag = null;
  if (!d) return;
  if (d.type === 'connect') {
    if (d.moved) {
      const from = pending, h = stateAt(world(ev));
      pending = null; ghost = null; hover = null;
      if (h && from) createEdge(from, h.id); else renderCanvas();
    }
    return;
  }
  if (d.type === 'pan') { svg.classList.remove('panning'); return; }
  if (d.type === 'marquee') { finishMarquee(); return; }
  if (d.moved && (d.type === 'move' || d.type === 'bend')) save();
}
svg.addEventListener('pointerup', endPointer);
svg.addEventListener('pointercancel', () => { drag = null; svg.classList.remove('panning'); renderCanvas(); });

/* rectangle selection: states whose center is inside; transitions whose label is inside or whose ends are both selected */
function marqueeSets(d) {
  const x0 = Math.min(d.p0.x, d.p1.x), x1 = Math.max(d.p0.x, d.p1.x), y0 = Math.min(d.p0.y, d.p1.y), y1 = Math.max(d.p0.y, d.p1.y);
  const inside = (x, y) => x >= x0 && x <= x1 && y >= y0 && y <= y1;
  const s = new Set(M.states.filter(st => inside(st.x, st.y)).map(st => st.id));
  const e = new Set(M.edges.filter(ed => (s.has(ed.from) && s.has(ed.to)) || inside(geom(ed).L.x, geom(ed).L.y)).map(ed => ed.id));
  return { s, e };
}
function finishMarquee() {
  const n = group.s.size + group.e.size;
  if (n === 1) {
    sel = group.s.size ? { kind: 'state', id: [...group.s][0] } : { kind: 'edge', id: [...group.e][0] };
    clearGroup();
  }
  renderInspector(); renderCanvas();
}
svg.addEventListener('dblclick', ev => {
  if (tool !== 'select') return;
  const tg = ev.target.closest('[data-kind]');
  if (!tg) { addState(world(ev)); return; }
  if (tg.dataset.kind === 'state') { const i = $('#insp-name'); if (i) { i.focus(); i.select(); } }
  else { const i = $('#rr-0-0'); if (i) i.focus(); }
});
svg.addEventListener('wheel', ev => {
  ev.preventDefault();
  if (!(ev.ctrlKey || ev.metaKey)) {
    const k = ev.deltaMode === 1 ? 16 : 1;
    view.x -= ev.deltaX * k; view.y -= ev.deltaY * k;
    renderCanvas();
    return;
  }
  const r = svg.getBoundingClientRect();
  zoomAt(ev.deltaY < 0 ? 1.1 : 1 / 1.1, ev.clientX - r.left, ev.clientY - r.top);
}, { passive: false });

/* ---------- toolbar ---------- */
function setTool(t) { tool = t; pending = null; ghost = null; hover = null; renderToolbar(); renderCanvas(); }
function renderToolbar() {
  document.querySelectorAll('#toolbar [data-tool]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.tool === tool)));
  document.querySelector('#toolbar [data-act="undo"]').disabled = !undoStack.length;
  document.querySelector('#toolbar [data-act="redo"]').disabled = !redoStack.length;
}
$('#toolbar').addEventListener('click', ev => {
  const b = ev.target.closest('button'); if (!b) return;
  if (b.dataset.tool) return setTool(b.dataset.tool);
  const a = b.dataset.act;
  if (a === 'undo') undo(); else if (a === 'redo') redo();
  else if (a === 'fit') fit(); else if (a === 'zoomin') zoomAt(1.2); else if (a === 'zoomout') zoomAt(1 / 1.2);
});

function deleteSel() {
  if (hasGroup()) {
    checkpoint();
    const gs = group.s, ge = group.e;
    M.edges = M.edges.filter(e => !ge.has(e.id) && !gs.has(e.from) && !gs.has(e.to));
    M.states = M.states.filter(s => !gs.has(s.id));
    if (run) { if (gs.size) { pause(); run = null; } else if (run.last && ge.has(run.last.e)) run.last = null; }
    clearGroup(); sel = null; renderAll(); save();
    return;
  }
  if (!sel) return;
  checkpoint();
  if (sel.kind === 'state') {
    const id = sel.id;
    M.edges = M.edges.filter(e => e.from !== id && e.to !== id);
    M.states = M.states.filter(s => s.id !== id);
    if (run) { pause(); run = null; }
  } else {
    const id = sel.id;
    if (run && run.last && run.last.e === id) run.last = null;
    M.edges = M.edges.filter(e => e.id !== id);
  }
  sel = null; renderAll(); save();
}

document.addEventListener('keydown', ev => {
  const tag = (ev.target.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
  const mod = ev.ctrlKey || ev.metaKey;
  if (mod && ev.key.toLowerCase() === 'z') { ev.preventDefault(); ev.shiftKey ? redo() : undo(); return; }
  if (mod && ev.key.toLowerCase() === 'y') { ev.preventDefault(); redo(); return; }
  if (ev.code === 'Space' && overBoard) { ev.preventDefault(); if (!spaceDown) { spaceDown = true; board.classList.add('space-pan'); } return; }
  if (mod || ev.altKey) return;
  if (ev.key === 'Delete' || ev.key === 'Backspace') { if (sel || hasGroup()) { ev.preventDefault(); deleteSel(); } }
  else if (ev.key === 'Escape') { if (tool !== 'select' || pending) setTool('select'); else if (sel || hasGroup()) { sel = null; clearGroup(); renderInspector(); renderCanvas(); } }
  else if (ev.key === 'h' || ev.key === 'H') setTool('pan');
  else if (ev.key === 'v' || ev.key === 'V') setTool('select');
  else if (ev.key === 'e' || ev.key === 'E') setTool('state');
  else if (ev.key === 't' || ev.key === 'T') setTool('edge');
});
const stopSpace = () => { spaceDown = false; board.classList.remove('space-pan'); };
document.addEventListener('keyup', ev => { if (ev.code === 'Space') stopSpace(); });
window.addEventListener('blur', stopSpace);
board.addEventListener('pointerenter', () => { overBoard = true; });
board.addEventListener('pointerleave', () => { overBoard = false; });

/* ---------- side panel ---------- */
function ruleRows(r, i) {
  const k = M.k, multi = k > 1;
  const canDel = M.edges.find(x => x.id === sel.id).rules.length > 1;
  let rows = '';
  for (let t = 0; t < k; t++) {
    const ro = M.tapes[t].ro, bad = c => (c && !inG(c) ? ' bad' : '');
    rows += `<div class="rule" data-ri="${i}" data-t="${t}">
      ${multi ? `<span class="tl">F${t + 1}</span>` : ''}
      <input class="sym${bad(r.r[t])}" id="rr-${i}-${t}" data-f="r" value="${esc(r.r[t])}" placeholder="?" maxlength="1" aria-label="${esc(tr('ariaRead', multi, t, i))}" autocomplete="off" spellcheck="false">
      <input class="sym${ro ? '' : bad(r.w[t])}" id="rw-${i}-${t}" data-f="w" value="${esc(ro ? r.r[t] : r.w[t])}" placeholder="?" maxlength="1" ${ro ? `disabled title="${esc(tr('ro_title'))}"` : ''} aria-label="${esc(tr('ariaWrite', multi, t, i))}" autocomplete="off" spellcheck="false">
      <select id="rd-${i}-${t}" data-f="d" aria-label="${esc(tr('ariaMove', multi, t, i))}">${['L', 'R', 'S'].map(v => `<option value="${v}"${r.d[t] === v ? ' selected' : ''}>${tr('mv_' + v)}</option>`).join('')}</select>
      ${t === 0 ? `<button class="icon" type="button" data-del-rule="${i}" aria-label="${esc(tr('ariaDelRule', i))}" ${canDel ? '' : 'disabled'}>×</button>` : '<span></span>'}
    </div>`;
  }
  return multi ? `<div class="rcard">${rows}</div>` : rows;
}
function renderInspector() {
  if (sel && !(sel.kind === 'state' ? S(sel.id) : E(sel.id))) sel = null;
  if (hasGroup()) {
    insp.innerHTML = `<h2>${tr('h_group')}</h2><p class="big">${tr('group_counts', group.s.size, group.e.size)}</p><p class="note">${tr('group_note')}</p><button class="btn danger" type="button" data-act="delete">${tr('del_group')}</button>`;
    return;
  }
  if (!sel) {
    const rows = tr('shortcuts').map(([k, a]) => `<tr><td>${esc(k)}</td><td>${esc(a)}</td></tr>`).join('');
    insp.innerHTML = `<h2>${tr('how_title')}</h2><ol class="help">${tr('help').map(h => `<li>${h}</li>`).join('')}</ol><h2>${tr('shortcuts_title')}</h2><table class="keys">${rows}</table><p class="note">${tr('saved_note')}</p>`;
    return;
  }
  if (sel.kind === 'state') {
    const s = S(sel.id);
    const outs = M.edges.filter(e => e.from === s.id), ins = M.edges.filter(e => e.to === s.id && e.from !== s.id);
    const li = e => `<li><button type="button" class="link" data-go="${e.id}">${nameHtml(S(e.from).name)} → ${nameHtml(S(e.to).name)} <span>${esc(e.rules.map(ruleText).join(' '))}</span></button></li>`;
    insp.innerHTML = `<h2>${tr('h_state')}</h2>
      <p class="big">${nameHtml(s.name)}</p>
      <label class="field" for="insp-name"><span>${tr('f_name')}</span><input type="text" id="insp-name" value="${esc(s.name)}" maxlength="6" autocomplete="off" spellcheck="false"></label>
      <p class="err" id="insp-err"></p>
      <label class="check" for="insp-initial"><input type="checkbox" id="insp-initial" ${s.initial ? 'checked' : ''}> ${tr('chk_initial')}</label>
      <label class="check" for="insp-final"><input type="checkbox" id="insp-final" ${s.final ? 'checked' : ''}> ${tr('chk_final')}</label>
      ${outs.length ? `<div class="field"><span>${tr('outs')}</span><ul class="list">${outs.map(li).join('')}</ul></div>` : ''}
      ${ins.length ? `<div class="field"><span>${tr('ins')}</span><ul class="list">${ins.map(li).join('')}</ul></div>` : ''}
      <button class="btn danger" type="button" data-act="delete">${tr('del_state')}</button>`;
    return;
  }
  const e = E(sel.id), a = S(e.from), b = S(e.to), multi = M.k > 1;
  insp.innerHTML = `<h2>${tr('h_edge')}</h2>
    <p class="big">${nameHtml(a.name)} → ${nameHtml(b.name)}</p>
    <div class="rules${multi ? ' multi' : ''}">
      <div class="rule head">${multi ? `<span>${tr('col_tape')}</span>` : ''}<span>${tr('col_read')}</span><span>${tr('col_write')}</span><span>${tr('col_move')}</span><span></span></div>
      ${e.rules.map(ruleRows).join('')}
    </div>
    <button class="btn" type="button" data-act="add-rule">${tr('add_rule')}</button>
    <p class="note">${tr('edge_note', multi, esc(M.blank))}</p>
    <button class="btn danger" type="button" data-act="delete">${tr('del_edge')}</button>`;
}

insp.addEventListener('input', ev => {
  const t = ev.target;
  if (!sel) return;
  if (t.id === 'insp-name') {
    const s = S(sel.id), v = t.value.trim(), err = $('#insp-err');
    if (!v) { err.textContent = tr('err_name_empty'); return; }
    if (M.states.some(x => x !== s && x.name === v)) { err.textContent = tr('err_name_dup'); return; }
    err.textContent = '';
    checkpoint('name:' + s.id); s.name = v;
    insp.querySelector('.big').innerHTML = nameHtml(v);
    renderCanvas(); renderTapes(); renderStatus(); save();
  } else if (t.dataset.f === 'r' || t.dataset.f === 'w') {
    const row = t.closest('.rule'), ri = +row.dataset.ri, ti = +row.dataset.t, fld = t.dataset.f, e = E(sel.id);
    checkpoint('rule:' + e.id + ':' + ri + ':' + ti + fld);
    t.value = t.value.replace(/\s/g, '');
    if (t.value && !inG(t.value)) { toast(tr('notInGamma', t.value)); t.value = ''; }
    t.classList.toggle('bad', !!t.value && !inG(t.value));
    e.rules[ri][fld][ti] = t.value;
    if (fld === 'r' && M.tapes[ti].ro) {
      e.rules[ri].w[ti] = t.value;
      const wi = $(`#rw-${ri}-${ti}`); if (wi) wi.value = t.value;
    }
    renderCanvas(); save();
    if (fld === 'r' && t.value) {
      const n = $(`#rw-${ri}-${ti}`), nx = $(`#rr-${ri}-${ti + 1}`);
      const target = n && !n.disabled ? n : nx;
      if (target) { target.focus(); target.select(); }
    }
  }
});
insp.addEventListener('change', ev => {
  const t = ev.target;
  if (!sel) return;
  if (t.id === 'insp-initial' || t.id === 'insp-final') {
    const s = S(sel.id); checkpoint();
    if (t.id === 'insp-initial') { M.states.forEach(x => { x.initial = false; }); s.initial = t.checked; }
    else s.final = t.checked;
    renderCanvas(); renderTapes(); renderStatus(); save();
  } else if (t.dataset.f === 'd') {
    const row = t.closest('.rule'), e = E(sel.id);
    checkpoint(); e.rules[+row.dataset.ri].d[+row.dataset.t] = t.value; renderCanvas(); save();
  }
});
insp.addEventListener('click', ev => {
  const b = ev.target.closest('button'); if (!b) return;
  if (b.dataset.go) { sel = { kind: 'edge', id: b.dataset.go }; renderInspector(); renderCanvas(); return; }
  if (b.dataset.act === 'delete') return deleteSel();
  if (b.dataset.act === 'add-rule') {
    const e = E(sel.id); checkpoint(); e.rules.push(newRule());
    renderInspector(); renderCanvas(); save();
    const el = $(`#rr-${e.rules.length - 1}-0`); if (el) el.focus();
  } else if (b.dataset.delRule !== undefined) {
    const e = E(sel.id); if (e.rules.length < 2) return;
    checkpoint(); e.rules.splice(+b.dataset.delRule, 1);
    if (run && run.last && run.last.e === e.id) run.last = null;
    renderInspector(); renderCanvas(); save();
  }
});

/* ---------- tapes ---------- */
const cellId = (t, i) => `cell_${t}_${i < 0 ? 'm' + -i : i}`;

function buildTapes() {
  let h = '';
  for (let t = 0; t < M.k; t++) {
    h += `<div class="tape-block" data-t="${t}">
      <div class="tb-head">
        <span class="tb-name">${tr('tape_n', t + 1)}</span>
        <label class="check" for="ro-${t}"><input type="checkbox" class="ro-cb" id="ro-${t}"> ${tr('ro_label')}</label>
        <label class="sr" for="inp-${t}">${esc(tr('inp_sr', t + 1))}</label>
        <input type="text" class="inp" id="inp-${t}" autocomplete="off" spellcheck="false" placeholder="${esc(tr('inp_ph'))}">
        <button class="btn sm" type="button" data-act="load">${tr('load')}</button>
        <button class="btn sm" type="button" data-act="clear">${tr('clear')}</button>
      </div>
      <div class="tape-scroll"><button class="padbtn" type="button" data-act="pad-l">${tr('pad')}</button><div class="strip"></div><button class="padbtn" type="button" data-act="pad-r">${tr('pad')}</button></div>
    </div>`;
  }
  tapesEl.innerHTML = h;
  tapesEl.classList.toggle('multi', M.k > 1);
  blocks = [...tapesEl.querySelectorAll('.tape-block')].map((el, t) => ({
    el, strip: el.querySelector('.strip'), scroller: el.querySelector('.tape-scroll'), ro: el.querySelector('.ro-cb'), inp: el.querySelector('.inp')
  }));
  blocks.forEach((b, t) => { b.inp.value = tapeString(t); });
  cursor = Array(M.k).fill(null);
  pads = Array.from({ length: M.k }, () => ({ l: 0, r: 0 }));
  ranges = Array.from({ length: M.k }, () => [null, null]);
  builtK = M.k; forceBuild = false;
}
function renderTapes() {
  if (forceBuild || builtK !== M.k) buildTapes();
  for (let t = 0; t < M.k; t++) renderTape(t);
  $('#k-out').textContent = tr('k_out', M.k);
  $('#k-minus').disabled = M.k <= 1;
  $('#k-plus').disabled = M.k >= MAXK;
  $('#tape-tag').textContent = tr('tag', M.k, !!run);
  $('#tape-tag').classList.toggle('live', !!run);
}
function renderTape(t) {
  const B = blocks[t], T = tapeData(t), cells = T.cells, head = T.head, strip = B.strip;
  const keys = Object.keys(cells).map(Number);
  const cur = cursor[t];
  const lo = Math.min(0, head, cur ?? 0, ...keys) - 7 - pads[t].l;
  const hi = Math.max(14, head, cur ?? 0, ...keys) + 7 + pads[t].r;
  const st = run ? S(run.state) : initialState();
  const chip = st ? nameHtml(st.name) : '?';
  const wrote = run && run.lastWrite ? run.lastWrite[t] : null;
  B.ro.checked = !!M.tapes[t].ro;
  B.el.classList.toggle('ro', !!M.tapes[t].ro);
  const [oldLo, oldHi] = ranges[t];
  if (lo !== oldLo || hi !== oldHi) {
    const act = document.activeElement, keep = act && act.classList && act.classList.contains('cell') && B.el.contains(act) ? act.dataset.i : null;
    const oldScroll = B.scroller.scrollLeft;
    let h = '';
    for (let i = lo; i <= hi; i++) {
      h += `<div class="col" data-i="${i}"><button type="button" class="slot" data-i="${i}" title="${esc(tr('slot_title'))}" aria-label="${esc(tr('slot_aria', t, i))}"><span class="chip"></span><span class="tri"></span></button>`
        + `<input class="cell" id="${cellId(t, i)}" data-i="${i}" maxlength="1" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="${esc(tr('cell_aria', t, i))}"><span class="idx">${i}</span></div>`;
    }
    strip.innerHTML = h;
    if (oldLo !== null && lo < oldLo) B.scroller.scrollLeft = oldScroll + (oldLo - lo) * COLW;
    ranges[t] = [lo, hi];
    if (keep !== null) { const n = strip.querySelector(`.cell[data-i="${keep}"]`); if (n) n.focus({ preventScroll: true }); }
  }
  strip.querySelectorAll('.col').forEach(col => {
    const i = +col.dataset.i, inp = col.querySelector('.cell');
    const v = cells[i] ?? '';
    if (inp.value !== v) inp.value = v;
    inp.placeholder = M.blank;
    inp.classList.toggle('out', v !== '' && !inG(v));
    col.classList.toggle('head', i === head);
    col.classList.toggle('wrote', i === wrote);
    if (i === head) col.querySelector('.chip').innerHTML = chip;
  });
}
function scrollToHead(t, smooth) {
  const B = blocks[t]; if (!B) return;
  const col = B.strip.querySelector(`.col[data-i="${tapeData(t).head}"]`);
  if (!col) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  B.scroller.scrollTo({ left: col.offsetLeft + B.strip.offsetLeft - B.scroller.clientWidth / 2 + COLW / 2, behavior: smooth && !reduce ? 'smooth' : 'auto' });
}
const scrollAll = smooth => { for (let t = 0; t < M.k; t++) scrollToHead(t, smooth); };
function setCell(t, i, ch) {
  const T = tapeData(t);
  if (!ch || ch === M.blank) delete T.cells[i]; else T.cells[i] = ch;
}
function focusCell(t, i) {
  cursor[t] = i; renderTape(t);
  const n = blocks[t].strip.querySelector(`.cell[data-i="${i}"]`);
  if (n) { n.focus({ preventScroll: true }); n.select(); n.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
}
const tapeOfEvent = ev => { const b = ev.target.closest('.tape-block'); return b ? +b.dataset.t : -1; };

tapesEl.addEventListener('focusin', ev => {
  if (ev.target.classList.contains('cell')) { cursor[tapeOfEvent(ev)] = +ev.target.dataset.i; ev.target.select(); }
});
tapesEl.addEventListener('input', ev => {
  const el = ev.target; if (!el.classList.contains('cell')) return;
  const t = tapeOfEvent(ev), i = +el.dataset.i, chars = Array.from(el.value.trim());
  const ch = chars.length ? chars[chars.length - 1] : '';
  if (ch && !inG(ch)) { toast(tr('notInGamma', ch)); el.value = tapeData(t).cells[i] ?? ''; el.select(); return; }
  checkpoint('tape');
  setCell(t, i, ch);
  el.value = tapeData(t).cells[i] ?? '';
  save();
  if (chars.length || ev.data === ' ') focusCell(t, i + 1); else renderTape(t);
  renderStatus();
});
tapesEl.addEventListener('keydown', ev => {
  const el = ev.target;
  if (el.classList.contains('inp')) { if (ev.key === 'Enter') loadInput(tapeOfEvent(ev)); return; }
  if (!el.classList.contains('cell')) return;
  const t = tapeOfEvent(ev), i = +el.dataset.i;
  if (ev.key === 'ArrowLeft') { ev.preventDefault(); focusCell(t, i - 1); }
  else if (ev.key === 'ArrowRight') { ev.preventDefault(); focusCell(t, i + 1); }
  else if (ev.key === 'Backspace') {
    ev.preventDefault(); checkpoint('tape');
    if (tapeData(t).cells[i] !== undefined) { setCell(t, i, ''); save(); renderTape(t); el.select(); }
    else { setCell(t, i - 1, ''); save(); focusCell(t, i - 1); }
  } else if (ev.key === 'Delete') { ev.preventDefault(); checkpoint('tape'); setCell(t, i, ''); save(); renderTape(t); el.select(); }
  else if (ev.key === ' ') { ev.preventDefault(); checkpoint('tape'); setCell(t, i, ''); save(); focusCell(t, i + 1); }
  else if (ev.key === 'Enter') el.blur();
});
tapesEl.addEventListener('click', ev => {
  const t = tapeOfEvent(ev); if (t < 0) return;
  const slot = ev.target.closest('.slot');
  if (slot) {
    checkpoint('head');
    tapeData(t).head = +slot.dataset.i;
    save(); renderTape(t); renderStatus();
    return;
  }
  const b = ev.target.closest('button[data-act]'); if (!b) return;
  const a = b.dataset.act;
  if (a === 'pad-l') { pads[t].l += 8; renderTape(t); }
  else if (a === 'pad-r') { pads[t].r += 8; renderTape(t); blocks[t].scroller.scrollLeft = blocks[t].scroller.scrollWidth; }
  else if (a === 'load') loadInput(t);
  else if (a === 'clear') {
    checkpoint(); const tp = M.tapes[t]; tp.cells = {}; tp.head = 0; blocks[t].inp.value = '';
    pause(); run = null; notice = ''; cursor[t] = null; renderAll(); save();
  }
});
tapesEl.addEventListener('change', ev => {
  if (!ev.target.classList.contains('ro-cb')) return;
  const t = tapeOfEvent(ev), on = ev.target.checked;
  checkpoint(); M.tapes[t].ro = on;
  if (on) M.edges.forEach(e => e.rules.forEach(r => { r.w[t] = r.r[t]; }));
  renderTape(t); renderInspector(); renderCanvas(); save();
});
$('#b-gohead').addEventListener('click', () => scrollAll(true));

function loadInput(t) {
  const str = blocks[t].inp.value;
  const bad = [...new Set(Array.from(str).filter(c => c.trim() && !inG(c)))];
  if (bad.length) { toast(tr('loadOutside', bad.join(', '))); return; }
  checkpoint();
  setTape(M, str, t);
  pause(); run = null; notice = ''; cursor[t] = null;
  renderAll(); save(); blocks[t].scroller.scrollLeft = 0;
}
$('#blank').addEventListener('input', ev => {
  const v = Array.from(ev.target.value.trim())[0];
  if (!v) return;
  checkpoint('blank');
  const old = M.blank;
  M.blank = v;
  M.gamma = [...new Set(M.gamma.map(c => c === old ? v : c))];
  [...M.tapes, ...(run ? run.tapes : [])].forEach(tp => { for (const k of Object.keys(tp.cells)) if (tp.cells[k] === v) delete tp.cells[k]; });
  ev.target.value = v;
  renderGamma(); renderTapes(); renderInspector(); renderStatus(); save();
});

function setK(k) {
  if (k < 1 || k > MAXK || k === M.k) return;
  checkpoint();
  pause(); run = null; notice = '';
  const grew = k > M.k;
  if (k > M.k) {
    while (M.tapes.length < k) M.tapes.push(newTape());
    M.edges.forEach(e => e.rules.forEach(r => { while (r.r.length < k) { r.r.push(M.blank); r.w.push(M.blank); r.d.push('S'); } }));
  } else {
    M.tapes.length = k;
    M.edges.forEach(e => e.rules.forEach(r => { r.r.length = k; r.w.length = k; r.d.length = k; }));
    if (k === 1) M.tapes[0].ro = false;
  }
  M.k = k; forceBuild = true;
  renderAll(); save();
  if (grew) toast(tr('kGrew', k));
}
$('#k-plus').addEventListener('click', () => setK(M.k + 1));
$('#k-minus').addEventListener('click', () => setK(M.k - 1));

/* ---------- execution ---------- */
const halted = () => run && ['accepted', 'rejected', 'limit'].includes(run.status);
function startRun() {
  const ini = initialState();
  run = { tapes: M.tapes.map(t => ({ cells: { ...t.cells }, head: t.head })), state: ini.id, steps: 0, status: 'ready', last: null, lastWrite: null, msg: '' };
}
function stepOnce() {
  if (!run) {
    if (!initialState()) { notice = tr('noInitial'); renderStatus(); return false; }
    startRun();
  }
  if (halted()) return false;
  const st = S(run.state), syms = run.tapes.map(t => symAt(t.cells, t.head));
  if (st.final) { run.status = 'accepted'; run.msg = tr('atFinal', st.name); return false; }
  const matches = [];
  for (const e of M.edges) {
    if (e.from !== run.state) continue;
    e.rules.forEach((r, ri) => {
      const ok = syms.every((c, i) => r.r[i] && inG(r.r[i]) && r.r[i] === c && (M.tapes[i].ro || (r.w[i] && inG(r.w[i]))));
      if (ok) matches.push([e, ri]);
    });
  }
  if (!matches.length) {
    run.status = 'rejected'; run.last = null;
    run.msg = tr('noRule', st.name, syms.join(', '));
    return false;
  }
  const [e, ri] = matches[0], r = e.rules[ri];
  run.lastWrite = [];
  run.tapes.forEach((tp, i) => {
    if (!M.tapes[i].ro) {
      if (r.w[i] === M.blank) delete tp.cells[tp.head]; else tp.cells[tp.head] = r.w[i];
      run.lastWrite[i] = tp.head;
    } else run.lastWrite[i] = null;
    tp.head += r.d[i] === 'L' ? -1 : r.d[i] === 'R' ? 1 : 0;
  });
  run.state = e.to; run.steps++; run.last = { e: e.id, r: ri };
  const wr = r.w.map((c, i) => (M.tapes[i].ro ? r.r[i] : c));
  run.msg = `δ(${st.name}, ${syms.join(', ')}) = (${S(e.to).name}, ${wr.join(', ')}, ${r.d.join(', ')})` + (matches.length > 1 ? tr('warnMulti', matches.length) : '');
  if (S(e.to).final) { run.status = 'accepted'; run.msg += tr('reachedFinal', S(e.to).name); return false; }
  if (run.steps >= LIMIT) { run.status = 'limit'; run.msg = tr('limitMsg', LIMIT); return false; }
  return true;
}
function afterStep() { renderCanvas(); renderTapes(); renderStatus(); scrollAll(true); }
function tick() {
  if (!playing) return;
  const ok = stepOnce();
  afterStep();
  if (!ok) { playing = false; renderStatus(); return; }
  timer = setTimeout(tick, 1000 / speed);
}
function pause() { playing = false; clearTimeout(timer); }
function resetRun() { pause(); run = null; notice = ''; renderAll(); scrollAll(false); }
$('#b-reset').addEventListener('click', resetRun);
$('#b-step').addEventListener('click', () => { pause(); stepOnce(); afterStep(); });
$('#b-run').addEventListener('click', () => {
  if (playing) { pause(); renderStatus(); return; }
  if (halted()) { run = null; }
  if (!run && !initialState()) { stepOnce(); return; }
  playing = true; renderStatus(); tick();
});
$('#speed').addEventListener('input', ev => {
  speed = +ev.target.value; $('#speed-out').textContent = tr('speed_out', speed);
});

function renderStatus() {
  const st = run ? S(run.state) : initialState();
  const tps = M.tapes.map((_, t) => tapeData(t));
  const code = !run ? 'idle' : halted() ? run.status : playing ? 'playing' : 'paused';
  panel.dataset.status = code;
  const heads = tr(M.k > 1 ? 'lbl_heads' : 'lbl_head');
  $('#status').innerHTML = `<span class="pill ${code}">${tr('st_' + code)}</span>
    <span class="facts">${tr('lbl_state')} <b class="m">${st ? nameHtml(st.name) : '—'}</b> · ${tr('lbl_reading')} <b>${esc(tps.map(t => symAt(t.cells, t.head)).join(', '))}</b> · ${heads} <b>${tps.map(t => t.head).join(', ')}</b> · ${tr('lbl_steps')} <b>${run ? run.steps : 0}</b></span>
    <p class="msg">${esc(run ? run.msg : notice) || '&nbsp;'}</p>`;
  $('#b-run').textContent = tr(playing ? 'pause' : 'run');
  $('#b-step').disabled = !!halted();
}

/* ---------- alphabet Γ ---------- */
function renderGamma() {
  $('#g-chips').innerHTML = M.gamma.map(c => c === M.blank
    ? `<span class="gchip blank" title="${esc(tr('gamma_blank_title'))}">${esc(c)}</span>`
    : `<span class="gchip">${esc(c)}<button type="button" data-rm="${esc(c)}" aria-label="${esc(tr('gamma_rm', c))}">×</button></span>`).join('');
}
function addGamma() {
  const inp = $('#g-add');
  const add = [...new Set(Array.from(inp.value).filter(c => c.trim() && !M.gamma.includes(c)))];
  inp.value = '';
  if (!add.length) return;
  checkpoint(); M.gamma.push(...add);
  renderGamma(); renderTapes(); renderInspector(); save();
}
$('#g-btn').addEventListener('click', addGamma);
$('#g-add').addEventListener('keydown', ev => { if (ev.key === 'Enter') addGamma(); });
$('#g-fill').addEventListener('click', () => {
  const miss = usedSymbols(M).filter(c => !M.gamma.includes(c));
  if (!miss.length) { toast(tr('gammaAllIn')); return; }
  checkpoint(); M.gamma.push(...miss);
  renderGamma(); renderTapes(); renderInspector(); save();
});
$('#g-chips').addEventListener('click', ev => {
  const b = ev.target.closest('button[data-rm]'); if (!b) return;
  checkpoint(); M.gamma = M.gamma.filter(c => c !== b.dataset.rm);
  renderGamma(); renderTapes(); renderInspector(); renderStatus(); save();
});

/* ---------- save / load and examples ---------- */
$('#btn-io').addEventListener('click', () => { $('#io-text').value = JSON.stringify(M, null, 1); $('#io-err').textContent = ''; $('#modal').hidden = false; $('#io-text').focus(); });
$('#io-close').addEventListener('click', () => { $('#modal').hidden = true; });
$('#modal').addEventListener('click', ev => { if (ev.target.id === 'modal') $('#modal').hidden = true; });
$('#io-copy').addEventListener('click', async () => {
  const ta = $('#io-text');
  try { await navigator.clipboard.writeText(ta.value); toast(tr('copied')); } catch (_) { ta.select(); toast(tr('copyFail')); }
});
$('#io-load').addEventListener('click', () => {
  let m = null;
  try { m = parseMachine(JSON.parse($('#io-text').value)); } catch (_) {}
  if (!m) { $('#io-err').textContent = tr('ioBad'); return; }
  applyMachine(m); $('#modal').hidden = true; toast(tr('loaded'));
});
function applyMachine(m) {
  checkpoint();
  M = m; sel = null; clearGroup(); pending = null; forceBuild = true;
  pause(); run = null; notice = '';
  renderAll(); fit(); save(); scrollAll(false);
}
$('#examples').addEventListener('change', ev => {
  const v = ev.target.value; ev.target.value = '';
  if (!v) return;
  applyMachine(v === 'vazio' ? blankMachine() : examples(v));
  toast(tr('exLoaded'));
});

/* ---------- start ---------- */
function renderAll() {
  renderCanvas(); renderInspector(); renderTapes(); renderStatus(); renderToolbar();
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
  if (!THEMES.includes(name)) name = 'auto';
  if (name === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.dataset.theme = name;
  $('#theme').value = name;
  try { localStorage.setItem(THEME_KEY, name); } catch (_) {}
}
$('#lang').addEventListener('change', ev => setLang(ev.target.value));
$('#theme').addEventListener('change', ev => setTheme(ev.target.value));

let savedLang = null, savedTheme = 'auto';
try { savedLang = localStorage.getItem(LANG_KEY); savedTheme = localStorage.getItem(THEME_KEY) || 'auto'; } catch (_) {}
lang = savedLang in I18N ? savedLang : ((navigator.language || '').toLowerCase().startsWith('pt') ? 'pt' : 'en');
setTheme(savedTheme);
applyStatic();
M = loadSaved() || examples('abc');
renderAll();
new ResizeObserver(() => {
  if (!fitted && svg.getBoundingClientRect().width > 0) { fitted = true; fit(); scrollAll(false); }
}).observe(svg);
})();

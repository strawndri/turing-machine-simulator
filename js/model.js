'use strict';

const newTape = () => ({ cells: {}, head: 0, ro: false });
const blankMachine = () => ({ states: [], edges: [], blank: 'B', gamma: ['B'], k: 1, nd: false, tapes: [newTape()], seq: 1 });
const inG = c => M.gamma.includes(c);
const S = id => M.states.find(s => s.id === id);
const E = id => M.edges.find(e => e.id === id);
const initialState = () => M.states.find(s => s.initial);
const symAt = (cells, i) => cells[i] ?? M.blank;
const tapeData = t => (run ? run.tapes : M.tapes)[t];
const ruleText = r => {
  const j = a => a.map(x => x || '·').join(', ');
  return `${M.nd ? 'δ' + (r.f | 0) + ' ' : ''}[${j(r.r)}; ${j(r.w)}; ${r.d.join(', ')}]`;
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

function parseMachine(o) {
  if (!o || !Array.isArray(o.states) || !Array.isArray(o.edges)) return null;
  const m = blankMachine();
  m.blank = typeof o.blank === 'string' && Array.from(o.blank).length === 1 ? o.blank : 'B';
  const src = Array.isArray(o.tapes) ? o.tapes : (o.tape && typeof o.tape === 'object' ? [o.tape] : []);
  const k = clamp(Number.isInteger(o.k) ? o.k : (src.length || 1), 1, MAXK);
  m.k = k;
  m.nd = !!o.nd;
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
        d: Array.from({ length: k }, (_, i) => { const a = Array.isArray(r?.d) ? r.d : [r?.d]; return ['L', 'R', 'S'].includes(a[i]) ? a[i] : (i ? 'S' : 'R'); }),
        f: r?.f === 1 ? 1 : 0
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

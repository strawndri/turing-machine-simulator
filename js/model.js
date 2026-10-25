'use strict';

/* The machine model: small helpers to read it, and the parser that checks a saved machine. */

const newTape = () => ({ cells: {}, head: 0, ro: false });
const blankMachine = () => ({ states: [], edges: [], blank: 'B', gamma: ['B'], k: 1, nd: false, tapes: [newTape()], seq: 1 });
const inG = c => M.gamma.includes(c);
const S = id => M.states.find(s => s.id === id);
const E = id => M.edges.find(e => e.id === id);
const initialState = () => M.states.find(s => s.initial);
const symAt = (cells, i) => cells[i] ?? M.blank;
const tapeData = t => (run ? run.tapes : M.tapes)[t];

/* [read; write; move] for one rule, with the δ number in front on non-deterministic machines */
const ruleText = r => {
  const join = a => a.map(x => x || '·').join(', ');
  return `${M.nd ? 'δ' + (r.f | 0) + ' ' : ''}[${join(r.r)}; ${join(r.w)}; ${r.d.join(', ')}]`;
};

/* "q12" becomes q with a subscript 12, as HTML and as SVG */
const splitName = n => { const a = Array.from(n); return { base: a[0], sub: a.slice(1).join('') }; };
const nameHtml = n => { const { base, sub } = splitName(n); return sub ? `${esc(base)}<sub>${esc(sub)}</sub>` : esc(n); };
const nameSvg = n => { const { base, sub } = splitName(n); return sub ? `${esc(base)}<tspan class="sub" dy="5">${esc(sub)}</tspan>` : esc(n); };

/* every symbol that appears in a rule or on a tape, blank included */
function usedSymbols(m) {
  const symbols = new Set([m.blank]);
  m.edges.forEach(e => e.rules.forEach(r => [...r.r, ...r.w].forEach(c => c && symbols.add(c))));
  m.tapes.forEach(t => Object.values(t.cells).forEach(c => symbols.add(c)));
  return [...symbols];
}

/* writes a word on a tape, with the head on its first symbol */
function setTape(m, word, t = 0) {
  const tape = m.tapes[t];
  tape.cells = {};
  tape.head = 0;
  Array.from(word).forEach((ch, i) => { if (ch.trim() && ch !== m.blank) tape.cells[i] = ch; });
}

/* the non-blank part of a tape as text, with blanks between symbols */
function tapeString(t) {
  const cells = M.tapes[t].cells, indexes = Object.keys(cells).map(Number);
  if (!indexes.length) return '';
  let text = '';
  for (let i = Math.min(...indexes); i <= Math.max(...indexes); i++) text += cells[i] ?? M.blank;
  return text;
}

/* ---------- reading a saved machine (JSON from the browser or from the Save / load box) ---------- */

const isSingleChar = v => typeof v === 'string' && Array.from(v).length === 1;
const isMachineShape = o => !!o && Array.isArray(o.states) && Array.isArray(o.edges);
const tapeSources = o => (Array.isArray(o.tapes) ? o.tapes : (o.tape && typeof o.tape === 'object' ? [o.tape] : []));

function parseTape(source, k, blank) {
  const tape = newTape();
  tape.head = Number.isInteger(source.head) ? source.head : 0;
  tape.ro = !!source.ro && k > 1;
  for (const [index, symbol] of Object.entries(source.cells || {})) {
    if (Number.isInteger(+index) && isSingleChar(symbol) && symbol !== blank) tape.cells[+index] = symbol;
  }
  return tape;
}

function parseTapes(o, k, blank) {
  const sources = tapeSources(o);
  return Array.from({ length: k }, (_, i) => parseTape(sources[i] || {}, k, blank));
}

function parseState(s) {
  return { id: s.id, name: String(s.name || s.id).slice(0, 6), x: +s.x || 0, y: +s.y || 0, initial: !!s.initial, final: !!s.final };
}

/* returns false when a state is malformed or repeats an id */
function parseStates(list, m) {
  const ids = new Set();
  for (const s of list) {
    if (!s || typeof s.id !== 'string' || ids.has(s.id)) return false;
    ids.add(s.id);
    m.states.push(parseState(s));
  }
  keepOnlyFirstInitial(m.states);
  return true;
}

function keepOnlyFirstInitial(states) {
  let seen = false;
  states.forEach(s => { if (s.initial && seen) s.initial = false; if (s.initial) seen = true; });
}

/* the i-th value of a rule field (a string for one tape, an array for several) */
const fieldAt = (field, i, fallback) => {
  const values = Array.isArray(field) ? field : [field];
  return values[i] === undefined || values[i] === null ? fallback : String(values[i]).slice(0, 1);
};

function parseRule(r, k, blank) {
  const perTape = fn => Array.from({ length: k }, (_, i) => fn(i));
  const move = i => { const m = fieldAt(r?.d, i, ''); return ['L', 'R', 'S'].includes(m) ? m : (i ? 'S' : 'R'); };
  return {
    r: perTape(i => fieldAt(r?.r, i, blank)),
    w: perTape(i => fieldAt(r?.w, i, blank)),
    d: perTape(move),
    f: r?.f === 1 ? 1 : 0
  };
}

function parseEdges(list, m) {
  const stateIds = new Set(m.states.map(s => s.id)), edgeIds = new Set();
  for (const e of list) {
    const valid = e && stateIds.has(e.from) && stateIds.has(e.to) && Array.isArray(e.rules) && e.rules.length;
    if (!valid || edgeIds.has(String(e.id))) continue;
    edgeIds.add(String(e.id));
    m.edges.push({
      id: String(e.id), from: e.from, to: e.to,
      bend: +e.bend || 0, angle: Number.isFinite(+e.angle) ? +e.angle : -90,
      rules: e.rules.map(r => parseRule(r, m.k, m.blank))
    });
  }
}

/* on a read-only tape the written symbol is always the one that was read */
function lockReadOnlyWrites(m) {
  m.tapes.forEach((tape, i) => {
    if (tape.ro) m.edges.forEach(e => e.rules.forEach(r => { r.w[i] = r.r[i]; }));
  });
}

/* the next free number for ids like s12 and e7 */
function nextId(m) {
  const numbers = [...m.states, ...m.edges].map(x => parseInt(x.id.slice(1)) || 0);
  return 1 + Math.max(0, ...numbers);
}

function parseGamma(list, m) {
  const given = Array.isArray(list) ? list.filter(c => isSingleChar(c) && c.trim()) : null;
  const gamma = [...new Set(given || usedSymbols(m))];
  if (!gamma.includes(m.blank)) gamma.push(m.blank);
  return gamma;
}

/* a clean machine built from untrusted data, or null when it cannot be used */
function parseMachine(o) {
  if (!isMachineShape(o)) return null;
  const m = blankMachine();
  m.blank = isSingleChar(o.blank) ? o.blank : 'B';
  m.k = clamp(Number.isInteger(o.k) ? o.k : (tapeSources(o).length || 1), 1, MAXK);
  m.nd = !!o.nd;
  m.tapes = parseTapes(o, m.k, m.blank);
  if (!parseStates(o.states, m)) return null;
  parseEdges(o.edges, m);
  lockReadOnlyWrites(m);
  m.seq = nextId(m);
  m.gamma = parseGamma(o.gamma, m);
  return m;
}

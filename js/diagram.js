'use strict';

/* Draws the state diagram: transitions, the initial arrow, states, labels and the selection rectangle. */

const isEdgeSelected = e => (sel && sel.kind === 'edge' && sel.id === e.id) || group.e.has(e.id);
const isStateSelected = s => (sel && sel.kind === 'state' && sel.id === s.id) || group.s.has(s.id);
const isActiveEdge = e => !!(run && run.last && run.last.e === e.id);

/* ---------- transitions ---------- */

function edgeClasses(e) {
  const dashed = M.nd && e.rules.every(r => r.f === 1);
  return (isEdgeSelected(e) ? ' sel' : '') + (isActiveEdge(e) ? ' act' : '') + (dashed ? ' d1' : '');
}

function drawEdgeLine(e, g) {
  return `<g class="edge${edgeClasses(e)}" data-kind="edge" data-id="${e.id}"><path class="hit" d="${g.path}"/><path class="line" d="${g.path}"/><polygon class="tip" points="${g.arrow}"/></g>`;
}

function drawEdgeLabel(e, g) {
  const active = isActiveEdge(e);
  const firstBaseline = g.L.y - (g.k - 1) * 8 + 5;
  const lines = e.rules.map((r, i) => {
    const lineBreak = i ? ' dy="16"' : '';
    const highlight = active && run.last.r === i ? ' class="on"' : '';
    return `<tspan x="${g.L.x.toFixed(1)}"${lineBreak}${highlight}>${esc(ruleText(r))}</tspan>`;
  }).join('');
  const box = `<rect x="${(g.L.x - g.w / 2 - 4).toFixed(1)}" y="${(g.L.y - 8 * g.k).toFixed(1)}" width="${(g.w + 8).toFixed(1)}" height="${16 * g.k}"/>`;
  return `<g class="elabel${edgeClasses(e)}" data-kind="edge" data-id="${e.id}">${box}<text text-anchor="middle" y="${firstBaseline.toFixed(1)}">${lines}</text></g>`;
}

/* lines go under the states, labels go on top of everything */
function drawEdges() {
  let lines = '', labels = '';
  for (const e of M.edges) {
    const g = geom(e);
    lines += drawEdgeLine(e, g);
    labels += drawEdgeLabel(e, g);
  }
  return { lines, labels };
}

/* ---------- states ---------- */

function stateClasses(s) {
  let classes = isStateSelected(s) ? ' sel' : '';
  if (run && run.state === s.id) {
    const failed = run.status === 'rejected' || run.status === 'limit';
    classes += run.status === 'accepted' ? ' ok' : failed ? ' bad' : ' cur';
  }
  if (pending === s.id) classes += ' pend';
  else if (hover === s.id && pending) classes += ' target';
  return classes;
}

function drawStateBody(s) {
  const classes = stateClasses(s);
  const ring = classes.includes(' sel') ? `<circle class="selring" r="${R + 7}"/>` : '';
  const inner = s.final ? `<circle class="inner" r="${R - 5}"/>` : '';
  return `<g class="state${classes}" data-kind="state" data-id="${s.id}" transform="translate(${s.x} ${s.y})">${ring}<circle class="body" r="${R}"/>${inner}</g>`;
}

const drawStateName = s => `<text class="nm" x="${s.x}" y="${s.y + 7}" text-anchor="middle">${nameSvg(s.name)}</text>`;

/* ---------- small extras ---------- */

/* the arrow that comes from the left into the initial state */
function drawInitialArrow() {
  const s = initialState();
  if (!s) return '';
  const tail = s.x - R - 48, tip = s.x - R;
  return `<g class="init"><path d="M${tail} ${s.y} L${tip - 8} ${s.y}"/><polygon points="${tip},${s.y} ${tip - 11},${s.y - 5} ${tip - 11},${s.y + 5}"/><text x="${tail - 8}" y="${s.y + 5}" text-anchor="end">${esc(tr('initial'))}</text></g>`;
}

/* the dashed line that follows the mouse while a transition is being created */
function drawLinkPreview() {
  const from = pending && ghost && S(pending);
  return from ? `<path class="ghost" d="M${from.x} ${from.y} L${ghost.x.toFixed(1)} ${ghost.y.toFixed(1)}"/>` : '';
}

function drawSelectionRectangle() {
  if (!(drag && drag.type === 'marquee' && drag.moved)) return '';
  const x = Math.min(drag.p0.x, drag.p1.x), y = Math.min(drag.p0.y, drag.p1.y);
  const w = Math.abs(drag.p1.x - drag.p0.x), h = Math.abs(drag.p1.y - drag.p0.y);
  return `<rect class="marquee" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}"/>`;
}

/* ---------- putting it together ---------- */

function applyView() {
  vp.setAttribute('transform', `translate(${view.x.toFixed(1)} ${view.y.toFixed(1)}) scale(${view.k.toFixed(4)})`);
  const cell = 22 * view.k;
  board.style.backgroundSize = `${cell}px ${cell}px`;
  board.style.backgroundPosition = `${view.x}px ${view.y}px`;
}

function showHint() {
  const hints = { select: '', pan: tr('hint_pan'), state: tr('hint_state'), edge: pending ? tr('hint_edge_pending') : tr('hint_edge') };
  board.dataset.tool = tool;
  $('#hint').textContent = hints[tool];
}

function renderCanvas() {
  const { lines, labels } = drawEdges();
  const bodies = M.states.map(drawStateBody).join(''), names = M.states.map(drawStateName).join('');
  vp.innerHTML = lines + drawInitialArrow() + drawLinkPreview() + bodies + names + labels + drawSelectionRectangle();
  applyView();
  showHint();
}

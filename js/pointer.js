'use strict';

/* What the mouse or finger does on the diagram. While a button is down, `drag` says what is going on:
   { type: 'pan' | 'connect' | 'move' | 'bend' | 'marquee', ... }  with the start point and whether it has moved. */

const targetOf = ev => {
  const el = ev.target.closest('[data-kind]');
  return el ? { kind: el.dataset.kind, id: el.dataset.id } : null;
};
const dragStart = ev => ({ sx: ev.clientX, sy: ev.clientY, moved: false });
const dragDistance = (ev, d) => Math.hypot(ev.clientX - d.sx, ev.clientY - d.sy);
const snapToGrid = n => Math.round(n / 10) * 10;

/* ---------- pressing the button ---------- */

function startPan(ev, start) {
  ev.preventDefault();
  drag = { type: 'pan', vx: view.x, vy: view.y, ...start };
  svg.classList.add('panning');
}

/* with the transition tool: the first state starts a link, the second one finishes it */
function pressStateWithLinkTool(id, at, start) {
  if (pending) {
    const from = pending;
    pending = null; ghost = null;
    createEdge(from, id);
    ignoreUp = true;
    return;
  }
  pending = id; ghost = at;
  drag = { type: 'connect', ...start };
  renderCanvas();
}

/* a click selects an item, unless it is already part of the selection; true when it was */
function selectForDrag(kind, id) {
  const inGroup = (kind === 'state' ? group.s : group.e).has(id);
  const alreadyAlone = sel && sel.kind === kind && sel.id === id && !hasGroup();
  if (!inGroup && !alreadyAlone) { selectOnly(kind, id); renderInspector(); }
  return inGroup;
}

/* dragging a state moves it, and moves the whole selection when it is part of one */
function startMoveStates(id, at, start) {
  const ids = selectForDrag('state', id) ? [...group.s] : [id];
  drag = { type: 'move', offs: ids.map(i => ({ id: i, dx: at.x - S(i).x, dy: at.y - S(i).y })), ...start };
}

/* dragging a transition bends it (or turns it, for a loop) */
function startBendEdge(id, at, start) {
  const e = E(id), g = geom(e);
  selectForDrag('edge', id);
  drag = { type: 'bend', id, p0: at, bend0: e.bend || 0, nb: g.nb, ...start };
}

function startMarquee(at, start) {
  clearGroup();
  sel = null;
  renderInspector();
  drag = { type: 'marquee', p0: at, p1: at, ...start };
}

svg.addEventListener('pointerdown', ev => {
  if (ev.button && ev.button !== 1) return;
  svg.setPointerCapture(ev.pointerId);
  drag = null; ignoreUp = false;
  const at = world(ev), target = targetOf(ev), start = dragStart(ev);

  if (ev.button === 1 || ev.shiftKey || tool === 'pan') return startPan(ev, start);
  if (tool === 'state' && !target) { addState(at); ignoreUp = true; return; }
  if (tool === 'edge' && target && target.kind === 'state') return pressStateWithLinkTool(target.id, at, start);
  if (tool === 'edge' && pending && !target) { pending = null; ghost = null; }

  if (target && target.kind === 'state') startMoveStates(target.id, at, start);
  else if (target && target.kind === 'edge') startBendEdge(target.id, at, start);
  else startMarquee(at, start);
  renderCanvas();
});

/* ---------- moving the mouse ---------- */

function moveStates(at) {
  drag.offs.forEach(o => { const s = S(o.id); s.x = snapToGrid(at.x - o.dx); s.y = snapToGrid(at.y - o.dy); });
}

function bendEdge(at) {
  const e = E(drag.id);
  if (e.from === e.to) {
    const s = S(e.from);
    e.angle = Math.round(Math.atan2(at.y - s.y, at.x - s.x) * 180 / Math.PI / 5) * 5;
    return;
  }
  const sideways = (at.x - drag.p0.x) * drag.nb.x + (at.y - drag.p0.y) * drag.nb.y;
  const bend = drag.bend0 + sideways;
  e.bend = Math.abs(bend) < 8 ? 0 : Math.round(bend);
}

function panView(ev) {
  view.x = drag.vx + (ev.clientX - drag.sx);
  view.y = drag.vy + (ev.clientY - drag.sy);
}

function resizeMarquee(at) {
  drag.p1 = at;
  group = marqueeSets(drag);
}

function continueDrag(ev, at) {
  if (drag.type === 'move') moveStates(at);
  else if (drag.type === 'bend') bendEdge(at);
  else if (drag.type === 'pan') panView(ev);
  else if (drag.type === 'marquee') resizeMarquee(at);
}

/* while a link is being created, the dashed line follows the mouse and the state below it is highlighted */
function previewLink(ev, at) {
  ghost = at;
  const over = stateAt(at);
  hover = over ? over.id : null;
  if (drag && drag.type === 'connect' && dragDistance(ev, drag) > 8) drag.moved = true;
  renderCanvas();
}

svg.addEventListener('pointermove', ev => {
  const at = world(ev);
  if (pending) return previewLink(ev, at);
  if (!drag) return;
  if (!drag.moved && dragDistance(ev, drag) < 3) return;
  if (!drag.moved) {
    drag.moved = true;
    if (drag.type === 'move' || drag.type === 'bend') checkpoint();
  }
  continueDrag(ev, at);
  renderCanvas();
});

/* ---------- releasing the button ---------- */

/* a link dragged from one state and dropped on another (or the same, for a loop) */
function finishLinkDrag(d, ev) {
  if (!d.moved) return;
  const from = pending, over = stateAt(world(ev));
  pending = null; ghost = null; hover = null;
  if (over && from) createEdge(from, over.id); else renderCanvas();
}

function endPointer(ev) {
  if (ignoreUp) { ignoreUp = false; drag = null; return; }
  const d = drag;
  drag = null;
  if (!d) return;
  if (d.type === 'connect') return finishLinkDrag(d, ev);
  if (d.type === 'pan') return svg.classList.remove('panning');
  if (d.type === 'marquee') return finishMarquee();
  if (d.moved) save();
}
svg.addEventListener('pointerup', endPointer);
svg.addEventListener('pointercancel', () => { drag = null; svg.classList.remove('panning'); renderCanvas(); });

/* ---------- rectangle selection ---------- */

/* states whose center is inside the rectangle; transitions whose label is inside, or whose two ends are selected */
function marqueeSets(d) {
  const x0 = Math.min(d.p0.x, d.p1.x), x1 = Math.max(d.p0.x, d.p1.x);
  const y0 = Math.min(d.p0.y, d.p1.y), y1 = Math.max(d.p0.y, d.p1.y);
  const inside = (x, y) => x >= x0 && x <= x1 && y >= y0 && y <= y1;
  const states = new Set(M.states.filter(s => inside(s.x, s.y)).map(s => s.id));
  const labelInside = e => { const g = geom(e); return inside(g.L.x, g.L.y); };
  const edges = new Set(M.edges.filter(e => (states.has(e.from) && states.has(e.to)) || labelInside(e)).map(e => e.id));
  return { s: states, e: edges };
}

/* one selected item becomes a normal selection, so its panel opens; several stay as a group */
function finishMarquee() {
  if (group.s.size + group.e.size === 1) {
    const kind = group.s.size ? 'state' : 'edge';
    const id = [...(group.s.size ? group.s : group.e)][0];
    clearGroup();
    sel = { kind, id };
  }
  renderInspector();
  renderCanvas();
}

/* ---------- double click and wheel ---------- */

svg.addEventListener('dblclick', ev => {
  if (tool !== 'select') return;
  const target = ev.target.closest('[data-kind]');
  if (!target) return addState(world(ev));
  const field = $(target.dataset.kind === 'state' ? '#insp-name' : '#rr-0-0');
  if (field) { field.focus(); if (target.dataset.kind === 'state') field.select(); }
});

/* the wheel moves the view; with Ctrl (or a pinch on a touchpad) it zooms around the pointer */
svg.addEventListener('wheel', ev => {
  ev.preventDefault();
  if (ev.ctrlKey || ev.metaKey) {
    const r = svg.getBoundingClientRect();
    return zoomAt(ev.deltaY < 0 ? 1.1 : 1 / 1.1, ev.clientX - r.left, ev.clientY - r.top);
  }
  const lineHeight = ev.deltaMode === 1 ? 16 : 1;
  view.x -= ev.deltaX * lineHeight;
  view.y -= ev.deltaY * lineHeight;
  renderCanvas();
}, { passive: false });

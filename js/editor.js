'use strict';

/* ---------- diagram interaction ---------- */
function nextName() {
  const used = new Set(M.states.map(s => s.name));
  for (let i = 0; ; i++) if (!used.has('q' + i)) return 'q' + i;
}
function newRule() {
  return { r: Array(M.k).fill(''), w: Array(M.k).fill(''), d: Array.from({ length: M.k }, (_, i) => (i ? 'S' : 'R')), f: 0 };
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

  if (ev.button === 1 || ev.shiftKey || tool === 'pan') {
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
  board.classList.toggle('nd', !!M.nd);
  board.dataset.view = M.nd ? ndView : 'diagram';
  document.querySelectorAll('#toolbar [data-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === board.dataset.view)));
  $('#nd').checked = !!M.nd;
}
$('#toolbar').addEventListener('click', ev => {
  const b = ev.target.closest('button'); if (!b) return;
  if (b.dataset.tool) return setTool(b.dataset.tool);
  if (b.dataset.view) return setView(b.dataset.view);
  const a = b.dataset.act, tv = board.dataset.view === 'tree';
  if (a === 'undo') undo(); else if (a === 'redo') redo();
  else if (a === 'fit') { if (tv) { treeAuto = true; treeFit(); } else fit(); }
  else if (a === 'zoomin') { if (tv) treeZoom(1.2); else zoomAt(1.2); }
  else if (a === 'zoomout') { if (tv) treeZoom(1 / 1.2); else zoomAt(1 / 1.2); }
});

function deleteSel() {
  if (hasGroup()) {
    checkpoint();
    const gs = group.s, ge = group.e;
    M.edges = M.edges.filter(e => !ge.has(e.id) && !gs.has(e.from) && !gs.has(e.to));
    M.states = M.states.filter(s => !gs.has(s.id));
    if (run) { if (gs.size) { clearRun(); } else if (run.last && ge.has(run.last.e)) run.last = null; }
    clearGroup(); sel = null; renderAll(); save();
    return;
  }
  if (!sel) return;
  checkpoint();
  if (sel.kind === 'state') {
    const id = sel.id;
    M.edges = M.edges.filter(e => e.from !== id && e.to !== id);
    M.states = M.states.filter(s => s.id !== id);
    if (run) { clearRun(); }
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
  if (mod || ev.altKey) return;
  if (ev.key === 'Delete' || ev.key === 'Backspace') { if (sel || hasGroup()) { ev.preventDefault(); deleteSel(); } }
  else if (ev.key === 'Escape') { if (tool !== 'select' || pending) setTool('select'); else if (sel || hasGroup()) { sel = null; clearGroup(); renderInspector(); renderCanvas(); } }
  else if (ev.key === 'h' || ev.key === 'H') setTool('pan');
  else if (ev.key === 'v' || ev.key === 'V') setTool('select');
  else if (ev.key === 'e' || ev.key === 'E') setTool('state');
  else if (ev.key === 't' || ev.key === 'T') setTool('edge');
});
/* holding Shift shows the grab cursor: Shift + drag moves the view */
const setShift = on => board.classList.toggle('shift-pan', on);
document.addEventListener('keydown', ev => { if (ev.key === 'Shift') setShift(true); });
document.addEventListener('keyup', ev => { if (ev.key === 'Shift') setShift(false); });
window.addEventListener('blur', () => setShift(false));

'use strict';

/* Changes to the machine made from the diagram: adding and removing states and transitions. */

/* the first q0, q1, q2... that no state uses yet */
function nextName() {
  const used = new Set(M.states.map(s => s.name));
  for (let i = 0; ; i++) if (!used.has('q' + i)) return 'q' + i;
}

/* an empty rule: a read, a write and a move for each tape */
function newRule() {
  return { r: Array(M.k).fill(''), w: Array(M.k).fill(''), d: Array.from({ length: M.k }, (_, i) => (i ? 'S' : 'R')), f: 0 };
}

function selectOnly(kind, id) {
  clearGroup();
  sel = { kind, id };
}

/* a state in the clicked place (snapped to a 10 px grid); the first state is the initial one */
function addState(p) {
  checkpoint();
  const snap = n => Math.round(n / 10) * 10;
  const s = { id: 's' + M.seq++, name: nextName(), x: snap(p.x), y: snap(p.y), initial: !M.states.length, final: false };
  M.states.push(s);
  selectOnly('state', s.id);
  renderAll(); save();
}

const findEdge = (from, to) => M.edges.find(e => e.from === from && e.to === to);

/* A new transition. When there is already one between the same states, it gets one more rule instead.
   Two opposite transitions bend away from each other so they do not overlap. */
function edgeBetween(from, to) {
  const existing = findEdge(from, to);
  if (existing) { existing.rules.push(newRule()); return existing; }
  const e = { id: 'e' + M.seq++, from, to, rules: [newRule()], bend: 0, angle: -90 };
  const opposite = from !== to && findEdge(to, from);
  if (opposite) { e.bend = 38; if (!opposite.bend) opposite.bend = 38; }
  M.edges.push(e);
  return e;
}

function createEdge(from, to) {
  checkpoint();
  const e = edgeBetween(from, to);
  selectOnly('edge', e.id);
  renderAll(); save();
  const firstEmptyRule = $(`#rr-${e.rules.length - 1}-0`);
  if (firstEmptyRule) firstEmptyRule.focus();
}

/* ---------- deleting ---------- */

/* removes states and the transitions that touch them; a running machine cannot go on */
function removeStates(ids) {
  M.edges = M.edges.filter(e => !ids.has(e.from) && !ids.has(e.to));
  M.states = M.states.filter(s => !ids.has(s.id));
  if (run) clearRun();
}

function removeEdges(ids) {
  if (run && run.last && ids.has(run.last.e)) run.last = null;
  M.edges = M.edges.filter(e => !ids.has(e.id));
}

/* deletes whatever is selected: a rectangle selection, one state or one transition */
function deleteSel() {
  if (!hasGroup() && !sel) return;
  checkpoint();
  if (hasGroup()) {
    removeEdges(group.e);
    if (group.s.size) removeStates(group.s);
  } else if (sel.kind === 'state') {
    removeStates(new Set([sel.id]));
  } else {
    removeEdges(new Set([sel.id]));
  }
  clearGroup(); sel = null;
  renderAll(); save();
}

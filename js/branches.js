'use strict';

/* Non-deterministic machines. A configuration is a node of the computation tree: its state, its tapes,
   how it was reached (via) and a status:
   'active' (not explored yet), 'expanded' (it split into children), 'accepted' (final state) or 'halted' (no rule fits).
   `nrun` holds the nodes, and `selNode` is the branch shown on the tapes and in the diagram. */

const MAXNODES = 2000, MAXLEVEL = 500;
let autoSel = true;   // while true, the selection follows the first branch as the tree grows

const isLeaf = n => n.status !== 'expanded';
const ndDone = () => !!nrun && (!nrun.nodes.some(n => n.status === 'active') || nrun.capped);

/* true when two rules of the same function read the same symbols in one state (δ must be a function) */
function fnConflict(e) {
  const seen = new Set();
  for (const x of M.edges) {
    if (x.from !== e.from) continue;
    for (const r of x.rules) {
      const key = (r.f | 0) + '|' + r.r.join(',');
      if (seen.has(key)) return true;
      seen.add(key);
    }
  }
  return false;
}

/* numbers for the summary: nodes, leaves by status, and how many different final tapes there are */
function ndStats() {
  const leaves = nrun.nodes.filter(isLeaf), count = status => leaves.filter(n => n.status === status).length;
  const finished = leaves.filter(n => n.status !== 'active');
  return {
    nodes: nrun.nodes.length, leaves: leaves.length,
    accepted: count('accepted'), halted: count('halted'), active: count('active'),
    finished: finished.length,
    distinct: new Set(finished.map(n => n.tapes.map(tapeText).join('|'))).size
  };
}

/* ---------- growing the tree ---------- */

/* the first rule of function f (0 or 1) that fits the node, as { e, ri, r }, or null */
function ruleOfFunction(node, f) {
  const symbols = readSymbols(node.tapes);
  for (const e of M.edges) {
    if (e.from !== node.state) continue;
    const ri = e.rules.findIndex(r => (r.f | 0) === f && ruleFits(r, symbols));
    if (ri >= 0) return { e, ri, r: e.rules[ri] };
  }
  return null;
}

function addChild(parent, match, f) {
  const { e, ri, r } = match;
  const tapes = copyTapes(parent.tapes);
  tapes.forEach((tape, i) => stepTape(tape, r, i));
  const id = nrun.nodes.length;
  nrun.nodes.push({
    id, parent: parent.id, level: parent.level + 1, state: e.to, tapes,
    status: S(e.to).final ? 'accepted' : 'active', via: { e: e.id, r: ri, f }, children: []
  });
  parent.children.push(id);
}

/* a node splits into one child for each function that has a rule that fits, and ends when none has;
   returns false when the limit of nodes is reached */
function expandNode(node) {
  const matches = [ruleOfFunction(node, 0), ruleOfFunction(node, 1)];
  const count = matches.filter(Boolean).length;
  if (!count) { node.status = 'halted'; return true; }
  if (nrun.nodes.length + count > MAXNODES) { nrun.capped = true; return false; }
  node.status = 'expanded';
  matches.forEach((match, f) => { if (match) addChild(node, match, f); });
  return true;
}

function ndStart() {
  const ini = initialState();
  const root = { id: 0, parent: null, level: 0, state: ini.id, tapes: copyTapes(M.tapes), status: ini.final ? 'accepted' : 'active', via: null, children: [] };
  nrun = { nodes: [root], level: 0, capped: false };
  selNode = 0;
  autoSel = true;
  syncRun();
}

/* One level of the tree: every active branch takes one step. Returns true while there is more to explore. */
function stepLevel() {
  if (!nrun) {
    if (!initialState()) { notice = tr('noInitial'); renderStatus(); return false; }
    ndStart();
  }
  const active = nrun.nodes.filter(n => n.status === 'active');
  if (!active.length) return false;
  if (nrun.level >= MAXLEVEL) { nrun.capped = true; return false; }
  for (const node of active) if (!expandNode(node)) break;
  nrun.level++;
  if (autoSel) selNode = firstLeaf();
  syncRun();
  return !ndDone();
}

/* ---------- the selected branch ---------- */

function firstLeaf() {
  let node = nrun.nodes[0];
  while (node.children.length) node = nrun.nodes[node.children[0]];
  return node.id;
}

/* makes `run` show the selected branch, so the tapes and the diagram draw it like a normal run */
function syncRun() {
  if (!nrun) { run = null; return; }
  const node = nrun.nodes[selNode ?? 0] || nrun.nodes[0], via = node.via;
  const status = node.status === 'accepted' ? 'accepted' : node.status === 'halted' ? 'rejected' : 'ready';
  run = {
    tapes: node.tapes, state: node.state, steps: node.level, lastWrite: null, status,
    last: via ? { e: via.e, r: via.r } : null,
    msg: tr('nd_msg', node.level, via ? via.f : null, tr('nd_st_' + node.status))
  };
}

function afterNd() {
  renderCanvas(); renderTapes(); renderStatus(); renderTree();
  if (!sel && !hasGroup()) renderInspector();
  scrollAll(true);
}

function selectNode(id) {
  selNode = id;
  autoSel = false;
  syncRun();
  afterNd();
}

/* the checkbox that turns the non-deterministic mode on and off */
$('#nd').addEventListener('change', ev => {
  const on = ev.target.checked;
  checkpoint();
  M.nd = on;
  ndView = 'diagram';
  clearRun();
  notice = '';
  renderAll(); save();
});

'use strict';

/* ---------- non-deterministic mode ---------- */
const MAXNODES = 2000, MAXLEVEL = 500;
let autoSel = true;
const ndDone = () => !!nrun && (!nrun.nodes.some(n => n.status === 'active') || nrun.capped);
const tapeKey = tp => {
  const ks = Object.keys(tp.cells).map(Number);
  if (!ks.length) return '';
  let s = '';
  for (let i = Math.min(...ks); i <= Math.max(...ks); i++) s += tp.cells[i] ?? M.blank;
  return s;
};
function tapeView(tp) {
  const ks = Object.keys(tp.cells).map(Number);
  let lo = Math.min(tp.head, ...ks), hi = Math.max(tp.head, ...ks);
  if (hi - lo > 11) { lo = Math.max(lo, tp.head - 5); hi = Math.min(hi, tp.head + 5); }
  let s = '';
  for (let i = lo; i <= hi; i++) { const c = tp.cells[i] ?? M.blank; s += i === tp.head ? `[${c}]` : c; }
  return s;
}
function ndStats() {
  const leaves = nrun.nodes.filter(n => n.status !== 'expanded');
  const fin = leaves.filter(n => n.status === 'accepted' || n.status === 'halted');
  return {
    nodes: nrun.nodes.length, leaves: leaves.length,
    accepted: leaves.filter(n => n.status === 'accepted').length,
    halted: leaves.filter(n => n.status === 'halted').length,
    active: leaves.filter(n => n.status === 'active').length,
    finished: fin.length,
    distinct: new Set(fin.map(n => n.tapes.map(tapeKey).join('|'))).size
  };
}
function fnConflict(e) {
  const seen = new Set();
  for (const x of M.edges) if (x.from === e.from) for (const r of x.rules) {
    const k = (r.f | 0) + '|' + r.r.join(',');
    if (seen.has(k)) return true;
    seen.add(k);
  }
  return false;
}
function ndMatch(node, f) {
  const syms = node.tapes.map(t => symAt(t.cells, t.head));
  for (const e of M.edges) {
    if (e.from !== node.state) continue;
    for (let ri = 0; ri < e.rules.length; ri++) {
      const r = e.rules[ri];
      if ((r.f | 0) !== f) continue;
      const ok = syms.every((c, i) => r.r[i] && inG(r.r[i]) && r.r[i] === c && (M.tapes[i].ro || (r.w[i] && inG(r.w[i]))));
      if (ok) return { e, ri, r };
    }
  }
  return null;
}
function ndApply(node, m, f) {
  const { e, ri, r } = m;
  const tapes = node.tapes.map((tp, i) => {
    const cells = { ...tp.cells };
    let head = tp.head;
    if (!M.tapes[i].ro) { if (r.w[i] === M.blank) delete cells[head]; else cells[head] = r.w[i]; }
    head += r.d[i] === 'L' ? -1 : r.d[i] === 'R' ? 1 : 0;
    return { cells, head };
  });
  const id = nrun.nodes.length;
  nrun.nodes.push({ id, parent: node.id, level: node.level + 1, state: e.to, tapes, status: S(e.to).final ? 'accepted' : 'active', via: { e: e.id, r: ri, f }, children: [] });
  node.children.push(id);
}
function syncRun() {
  if (!nrun) { run = null; return; }
  const n = nrun.nodes[selNode ?? 0] || nrun.nodes[0], via = n.via;
  run = {
    tapes: n.tapes, state: n.state, steps: n.level, lastWrite: null,
    status: n.status === 'accepted' ? 'accepted' : n.status === 'halted' ? 'rejected' : 'ready',
    last: via ? { e: via.e, r: via.r } : null,
    msg: tr('nd_msg', n.level, via ? via.f : null, tr('nd_st_' + n.status))
  };
}
function firstLeaf() {
  let n = nrun.nodes[0];
  while (n.children.length) n = nrun.nodes[n.children[0]];
  return n.id;
}
function ndStart() {
  const ini = initialState();
  nrun = { nodes: [{ id: 0, parent: null, level: 0, state: ini.id, tapes: M.tapes.map(t => ({ cells: { ...t.cells }, head: t.head })), status: ini.final ? 'accepted' : 'active', via: null, children: [] }], level: 0, capped: false };
  selNode = 0; autoSel = true;
  syncRun();
}
/* one step for every active branch (one level of the computation tree); true while there is more to explore */
function stepLevel() {
  if (!nrun) {
    if (!initialState()) { notice = tr('noInitial'); renderStatus(); return false; }
    ndStart();
  }
  const frontier = nrun.nodes.filter(n => n.status === 'active');
  if (!frontier.length) return false;
  if (nrun.level >= MAXLEVEL) { nrun.capped = true; return false; }
  for (const n of frontier) {
    const ms = [ndMatch(n, 0), ndMatch(n, 1)], k = ms.filter(Boolean).length;
    if (!k) { n.status = 'halted'; continue; }
    if (nrun.nodes.length + k > MAXNODES) { nrun.capped = true; break; }
    n.status = 'expanded';
    ms.forEach((m, f) => { if (m) ndApply(n, m, f); });
  }
  nrun.level++;
  if (autoSel) selNode = firstLeaf();
  syncRun();
  return !ndDone();
}
function afterNd() {
  renderCanvas(); renderTapes(); renderStatus(); renderTree();
  if (!sel && !hasGroup()) renderInspector();
  scrollAll(true);
}
function selectNode(id) {
  selNode = id; autoSel = false;
  syncRun(); afterNd();
}
function ndPanelHtml() {
  const s = ndStats(), leaves = nrun.nodes.filter(n => n.status !== 'expanded'), shown = leaves.slice(0, 200);
  const li = n => `<li><button type="button" class="link conf ${n.status}${n.id === selNode ? ' on' : ''}" data-node="${n.id}"><span class="cid">#${n.id}</span><span>${nameHtml(S(n.state)?.name ?? '?')}</span><span class="ctape">${esc(tapeView(n.tapes[0]))}</span><span class="cst">${tr('nd_st_' + n.status)}</span></button></li>`;
  return `<h2>${tr('nd_conf')}</h2>
    <p class="note">${tr('nd_summary', s)}</p>
    <ul class="list confs">${shown.map(li).join('')}</ul>
    ${leaves.length > shown.length ? `<p class="note">${tr('nd_more', leaves.length - shown.length)}</p>` : ''}`;
}
function renderStatusNd() {
  const s = ndStats(), done = ndDone();
  const code = done ? (s.accepted ? 'accepted' : nrun.capped ? 'limit' : 'rejected') : playing ? 'playing' : 'paused';
  panel.dataset.status = code;
  $('#status').innerHTML = `<span class="pill ${code}">${tr('st_' + code)}</span>
    <span class="facts">${tr('nd_level')} <b>${nrun.level}</b> · ${tr('nd_nodes')} <b>${s.nodes}</b> · ${tr('nd_leaves')} <b>${s.leaves}</b> · ${tr('nd_accepting')} <b>${s.accepted}</b> · ${tr('nd_active')} <b>${s.active}</b></span>
    <p class="msg">${esc(nrun.capped ? tr('nd_capped', MAXNODES, MAXLEVEL) : run ? run.msg : '') || '&nbsp;'}</p>`;
  $('#b-run').textContent = tr(playing ? 'pause' : 'run');
  $('#b-step').disabled = done;
}

/* computation tree: root on the left, one column per level, leaves stacked */
const TW = 132, TH = 44, GX = 56, GY = 12;
function treeLayout() {
  const pos = new Map();
  let row = 0;
  const place = id => {
    const n = nrun.nodes[id], x = 16 + n.level * (TW + GX);
    if (!n.children.length) { pos.set(id, { x, y: 16 + row * (TH + GY) }); row++; return; }
    n.children.forEach(place);
    pos.set(id, { x, y: (pos.get(n.children[0]).y + pos.get(n.children[n.children.length - 1]).y) / 2 });
  };
  place(0);
  let W = 0, H = 0;
  pos.forEach(p => { W = Math.max(W, p.x + TW + 16); H = Math.max(H, p.y + TH + 16); });
  return { pos, W, H };
}
function applyTreeView() {
  $('#tvp').setAttribute('transform', `translate(${tview.x.toFixed(1)} ${tview.y.toFixed(1)}) scale(${tview.k.toFixed(4)})`);
}
function renderTree() {
  const empty = $('#tree-empty'), ts = $('#tsvg');
  const has = M.nd && nrun;
  empty.hidden = !!has;
  ts.style.display = has ? 'block' : 'none';
  if (!has || board.dataset.view !== 'tree') return;
  const { pos } = treeLayout();
  const path = new Set();
  for (let id = selNode ?? 0; id !== null; id = nrun.nodes[id].parent) path.add(id);
  let edges = '', nodes = '';
  for (const n of nrun.nodes) {
    const p = pos.get(n.id);
    for (const cid of n.children) {
      const c = nrun.nodes[cid], q = pos.get(cid), x0 = p.x + TW, y0 = p.y + TH / 2, x1 = q.x, y1 = q.y + TH / 2, mx = (x0 + x1) / 2;
      edges += `<path class="te${c.via.f ? ' d1' : ''}${path.has(cid) ? ' path' : ''}" d="M${x0} ${y0}C${mx} ${y0} ${mx} ${y1} ${x1} ${y1}"/><text class="te-l" x="${mx}" y="${(y0 + y1) / 2 - 4}" text-anchor="middle">δ${c.via.f}</text>`;
    }
    const st = S(n.state);
    nodes += `<g class="tn ${n.status}${n.id === selNode ? ' selected' : ''}${path.has(n.id) ? ' onpath' : ''}" data-node="${n.id}" transform="translate(${p.x} ${p.y})"><rect width="${TW}" height="${TH}" rx="3"/><text class="tn-s" x="8" y="17">${esc(st ? st.name : '?')}</text><text class="tn-t" x="8" y="35">${esc(tapeView(n.tapes[0]))}${M.k > 1 ? ' …' : ''}</text></g>`;
  }
  $('#tvp').innerHTML = edges + nodes;
  if (treeAuto) treeFit(); else applyTreeView();
}
/* same navigation as the diagram: Shift + drag, two-finger scroll, Ctrl + wheel or pinch to zoom */
function treeFit() {
  const r = $('#tree').getBoundingClientRect(), { W, H } = treeLayout();
  if (!r.width) return;
  const top = 58, gap = 16;
  const k = clamp(Math.min((r.width - 2 * gap) / W, (r.height - top - gap) / H, 1.2), .1, 3);
  tview = { k, x: (r.width - W * k) / 2, y: top + (r.height - top - gap - H * k) / 2 };
  applyTreeView();
}
function treeZoomAt(f, cx, cy) {
  const r = $('#tree').getBoundingClientRect();
  cx ??= r.width / 2; cy ??= r.height / 2;
  const k = clamp(tview.k * f, .1, 3), q = k / tview.k;
  tview = { k, x: cx - (cx - tview.x) * q, y: cy - (cy - tview.y) * q };
  treeAuto = false;
  applyTreeView();
}
const treeZoom = f => treeZoomAt(f);
function setView(v) { ndView = v; renderToolbar(); renderTree(); }
const tsvgEl = $('#tsvg');
let tdrag = null, tjust = false;
tsvgEl.addEventListener('pointerdown', ev => {
  if (ev.button && ev.button !== 1) return;
  tjust = false;
  tdrag = { id: ev.pointerId, sx: ev.clientX, sy: ev.clientY, vx: tview.x, vy: tview.y, moved: false };
});
tsvgEl.addEventListener('pointermove', ev => {
  if (!tdrag || ev.pointerId !== tdrag.id) return;
  const dx = ev.clientX - tdrag.sx, dy = ev.clientY - tdrag.sy;
  if (!tdrag.moved) {
    if (Math.hypot(dx, dy) < 4) return;
    tdrag.moved = true; treeAuto = false;
    try { tsvgEl.setPointerCapture(ev.pointerId); } catch (_) {}
    tsvgEl.classList.add('panning');
  }
  tview.x = tdrag.vx + dx; tview.y = tdrag.vy + dy;
  applyTreeView();
});
const tEnd = () => { tsvgEl.classList.remove('panning'); if (tdrag && tdrag.moved) tjust = true; tdrag = null; };
tsvgEl.addEventListener('pointerup', tEnd);
tsvgEl.addEventListener('pointercancel', tEnd);
tsvgEl.addEventListener('wheel', ev => {
  ev.preventDefault();
  if (ev.ctrlKey || ev.metaKey) {
    const r = tsvgEl.getBoundingClientRect();
    treeZoomAt(ev.deltaY < 0 ? 1.1 : 1 / 1.1, ev.clientX - r.left, ev.clientY - r.top);
    return;
  }
  const k = ev.deltaMode === 1 ? 16 : 1;
  tview.x -= ev.deltaX * k; tview.y -= ev.deltaY * k;
  treeAuto = false;
  applyTreeView();
}, { passive: false });
/* a click right after a drag must not select the node under the pointer */
tsvgEl.addEventListener('click', ev => {
  if (tjust) { tjust = false; return; }
  const g = ev.target.closest('[data-node]');
  if (g) selectNode(+g.dataset.node);
});
$('#nd').addEventListener('change', ev => {
  const on = ev.target.checked;
  checkpoint();
  M.nd = on; ndView = 'diagram';
  clearRun(); notice = '';
  renderAll(); save();
});

'use strict';

/* The computation tree on screen: the root on the left, one column per level and the leaves stacked.
   It moves and zooms like the diagram. `tview` is its pan and zoom, and `treeAuto` keeps it fitted until you touch it. */

const TW = 132, TH = 44, GX = 56, GY = 12;   // node width and height, gaps between columns and rows
const tsvgEl = $('#tsvg');

/* ---------- layout ---------- */

/* the position of every node (a leaf takes the next row, a parent sits in the middle of its children) and the total size */
function treeLayout() {
  const pos = new Map();
  let row = 0;
  const place = id => {
    const node = nrun.nodes[id], x = 16 + node.level * (TW + GX);
    if (!node.children.length) { pos.set(id, { x, y: 16 + row * (TH + GY) }); row++; return; }
    node.children.forEach(place);
    const first = pos.get(node.children[0]).y, last = pos.get(node.children[node.children.length - 1]).y;
    pos.set(id, { x, y: (first + last) / 2 });
  };
  place(0);
  let W = 0, H = 0;
  pos.forEach(p => { W = Math.max(W, p.x + TW + 16); H = Math.max(H, p.y + TH + 16); });
  return { pos, W, H };
}

/* ---------- drawing ---------- */

/* the nodes from the root to the selected one */
function pathToSelected() {
  const path = new Set();
  for (let id = selNode ?? 0; id !== null; id = nrun.nodes[id].parent) path.add(id);
  return path;
}

function treeEdgeSvg(parent, child, p, q, path) {
  const x0 = p.x + TW, y0 = p.y + TH / 2, x1 = q.x, y1 = q.y + TH / 2, mx = (x0 + x1) / 2;
  const classes = `te${child.via.f ? ' d1' : ''}${path.has(child.id) ? ' path' : ''}`;
  return `<path class="${classes}" d="M${x0} ${y0}C${mx} ${y0} ${mx} ${y1} ${x1} ${y1}"/><text class="te-l" x="${mx}" y="${(y0 + y1) / 2 - 4}" text-anchor="middle">δ${child.via.f}</text>`;
}

function treeNodeSvg(n, p, path) {
  const state = S(n.state);
  const classes = `tn ${n.status}${n.id === selNode ? ' selected' : ''}${path.has(n.id) ? ' onpath' : ''}`;
  const more = M.k > 1 ? ' …' : '';
  return `<g class="${classes}" data-node="${n.id}" transform="translate(${p.x} ${p.y})"><rect width="${TW}" height="${TH}" rx="3"/><text class="tn-s" x="8" y="17">${esc(state ? state.name : '?')}</text><text class="tn-t" x="8" y="35">${esc(tapeView(n.tapes[0]))}${more}</text></g>`;
}

function applyTreeView() {
  $('#tvp').setAttribute('transform', `translate(${tview.x.toFixed(1)} ${tview.y.toFixed(1)}) scale(${tview.k.toFixed(4)})`);
}

function renderTree() {
  const has = M.nd && nrun;
  $('#tree-empty').hidden = !!has;
  tsvgEl.style.display = has ? 'block' : 'none';
  if (!has || board.dataset.view !== 'tree') return;
  const { pos } = treeLayout(), path = pathToSelected();
  let edges = '', nodes = '';
  for (const n of nrun.nodes) {
    n.children.forEach(id => { edges += treeEdgeSvg(n, nrun.nodes[id], pos.get(n.id), pos.get(id), path); });
    nodes += treeNodeSvg(n, pos.get(n.id), path);
  }
  $('#tvp').innerHTML = edges + nodes;
  if (treeAuto) treeFit(); else applyTreeView();
}

function setView(v) {
  ndView = v;
  renderToolbar();
  renderTree();
}

/* ---------- fit and zoom ---------- */

function treeFit() {
  const rect = $('#tree').getBoundingClientRect(), { W, H } = treeLayout();
  if (!rect.width) return;
  const top = 58, gap = 16;
  const k = clamp(Math.min((rect.width - 2 * gap) / W, (rect.height - top - gap) / H, 1.2), .1, 3);
  tview = { k, x: (rect.width - W * k) / 2, y: top + (rect.height - top - gap - H * k) / 2 };
  applyTreeView();
}

function treeZoomAt(factor, cx, cy) {
  const rect = $('#tree').getBoundingClientRect();
  cx ??= rect.width / 2; cy ??= rect.height / 2;
  const k = clamp(tview.k * factor, .1, 3), q = k / tview.k;
  tview = { k, x: cx - (cx - tview.x) * q, y: cy - (cy - tview.y) * q };
  treeAuto = false;
  applyTreeView();
}
const treeZoom = factor => treeZoomAt(factor);

/* ---------- pan, zoom and click ---------- */

let tdrag = null;         // a drag that may become a pan
let treeJustPanned = false;   // a click right after a drag must not select the node under the pointer

tsvgEl.addEventListener('pointerdown', ev => {
  if (ev.button && ev.button !== 1) return;
  treeJustPanned = false;
  tdrag = { id: ev.pointerId, sx: ev.clientX, sy: ev.clientY, vx: tview.x, vy: tview.y, moved: false };
});

tsvgEl.addEventListener('pointermove', ev => {
  if (!tdrag || ev.pointerId !== tdrag.id) return;
  const dx = ev.clientX - tdrag.sx, dy = ev.clientY - tdrag.sy;
  if (!tdrag.moved) {
    if (Math.hypot(dx, dy) < 4) return;
    tdrag.moved = true;
    treeAuto = false;
    try { tsvgEl.setPointerCapture(ev.pointerId); } catch (_) {}
    tsvgEl.classList.add('panning');
  }
  tview.x = tdrag.vx + dx;
  tview.y = tdrag.vy + dy;
  applyTreeView();
});

function endTreeDrag() {
  tsvgEl.classList.remove('panning');
  if (tdrag && tdrag.moved) treeJustPanned = true;
  tdrag = null;
}
tsvgEl.addEventListener('pointerup', endTreeDrag);
tsvgEl.addEventListener('pointercancel', endTreeDrag);

tsvgEl.addEventListener('wheel', ev => {
  ev.preventDefault();
  if (ev.ctrlKey || ev.metaKey) {
    const rect = tsvgEl.getBoundingClientRect();
    return treeZoomAt(ev.deltaY < 0 ? 1.1 : 1 / 1.1, ev.clientX - rect.left, ev.clientY - rect.top);
  }
  const lineHeight = ev.deltaMode === 1 ? 16 : 1;
  tview.x -= ev.deltaX * lineHeight;
  tview.y -= ev.deltaY * lineHeight;
  treeAuto = false;
  applyTreeView();
}, { passive: false });

tsvgEl.addEventListener('click', ev => {
  if (treeJustPanned) { treeJustPanned = false; return; }
  const node = ev.target.closest('[data-node]');
  if (node) selectNode(+node.dataset.node);
});

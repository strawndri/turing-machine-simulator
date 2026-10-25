'use strict';

/* ---------- PNG export (diagram or computation tree) ---------- */
const SVGNS = 'http://www.w3.org/2000/svg';
const SVG_PROPS = ['fill', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-linecap', 'stroke-linejoin', 'stroke-opacity', 'opacity', 'font-family', 'font-size', 'font-weight', 'font-style', 'font-variant', 'letter-spacing', 'text-anchor', 'paint-order', 'display', 'visibility'];
/* copy the computed look of each element into the clone, so the picture does not depend on style.css */
function inlineStyles(src, dst) {
  if (src.nodeType !== 1) return;
  const cs = getComputedStyle(src);
  SVG_PROPS.forEach(p => dst.style.setProperty(p, cs.getPropertyValue(p)));
  for (let i = 0; i < src.children.length; i++) inlineStyles(src.children[i], dst.children[i]);
}
function diagramSvg() {
  if (!M.states.length) return null;
  const keep = { sel, group };
  sel = null; group = { s: new Set(), e: new Set() };
  renderCanvas();
  const bb = vp.getBBox(), pad = 24;
  const g = vp.cloneNode(true);
  inlineStyles(vp, g);
  g.removeAttribute('transform');
  g.querySelectorAll('.marquee, .ghost, .selring, .hit').forEach(n => n.remove());
  sel = keep.sel; group = keep.group;
  renderCanvas();
  const W = bb.width + 2 * pad, H = bb.height + 2 * pad;
  const out = document.createElementNS(SVGNS, 'svg');
  out.setAttribute('xmlns', SVGNS);
  out.setAttribute('viewBox', `${bb.x - pad} ${bb.y - pad} ${W} ${H}`);
  out.setAttribute('width', W); out.setAttribute('height', H);
  out.appendChild(g);
  return { svg: out, W, H };
}
function treeSvg() {
  if (!(M.nd && nrun)) return null;
  const { W, H } = treeLayout();
  const g = $('#tvp').cloneNode(true);
  inlineStyles($('#tvp'), g);
  g.removeAttribute('transform');
  const out = document.createElementNS(SVGNS, 'svg');
  out.setAttribute('xmlns', SVGNS);
  out.setAttribute('viewBox', `0 0 ${W} ${H}`);
  out.setAttribute('width', W); out.setAttribute('height', H);
  out.appendChild(g);
  return { svg: out, W, H };
}
/* returns { name, promise } where the promise gives a PNG blob, or null when there is nothing to export */
function makePng() {
  const tree = board.dataset.view === 'tree';
  const d = tree ? treeSvg() : diagramSvg();
  if (!d) { toast(tr(tree ? 'png_empty_tree' : 'png_empty')); return null; }
  const scale = Math.min(2, 8000 / Math.max(d.W, d.H));
  const bg = getComputedStyle(board).backgroundColor;
  const promise = (async () => {
    const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(d.svg)], { type: 'image/svg+xml;charset=utf-8' }));
    try {
      const img = new Image();
      await new Promise((ok, fail) => { img.onload = ok; img.onerror = fail; img.src = url; });
      const c = document.createElement('canvas');
      c.width = Math.round(d.W * scale); c.height = Math.round(d.H * scale);
      const ctx = c.getContext('2d');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      return await new Promise((ok, fail) => c.toBlob(b => (b ? ok(b) : fail(new Error('png'))), 'image/png'));
    } finally { URL.revokeObjectURL(url); }
  })();
  return { name: tree ? 'turing-machine-tree.png' : 'turing-machine-diagram.png', promise };
}
$('#png-save').addEventListener('click', async () => {
  const r = makePng(); if (!r) return;
  try {
    const blob = await r.promise, a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = r.name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast(tr('png_saved'));
  } catch (_) { toast(tr('png_fail')); }
});
$('#png-copy').addEventListener('click', async () => {
  const r = makePng(); if (!r) return;
  try { await navigator.clipboard.write([new ClipboardItem({ 'image/png': r.promise })]); toast(tr('png_copied')); } catch (_) { toast(tr('png_copy_fail')); }
});

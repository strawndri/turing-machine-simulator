'use strict';

/* Exports the diagram or the computation tree as a PNG, to save or to copy.
   The SVG is cloned with its computed styles written in, drawn on a canvas and turned into a PNG. */

const SVGNS = 'http://www.w3.org/2000/svg';
const SVG_PROPS = ['fill', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-linecap', 'stroke-linejoin', 'stroke-opacity', 'opacity', 'font-family', 'font-size', 'font-weight', 'font-style', 'font-variant', 'letter-spacing', 'text-anchor', 'paint-order', 'display', 'visibility'];
const PNG_MARGIN = 24, PNG_SCALE = 2, PNG_MAX_SIDE = 8000;

/* copies the computed look of each element into its clone, so the picture does not depend on the css file */
function inlineStyles(source, copy) {
  if (source.nodeType !== 1) return;
  const style = getComputedStyle(source);
  SVG_PROPS.forEach(p => copy.style.setProperty(p, style.getPropertyValue(p)));
  for (let i = 0; i < source.children.length; i++) inlineStyles(source.children[i], copy.children[i]);
}

function standaloneSvg(content, viewBox, W, H) {
  const out = document.createElementNS(SVGNS, 'svg');
  out.setAttribute('xmlns', SVGNS);
  out.setAttribute('viewBox', viewBox);
  out.setAttribute('width', W);
  out.setAttribute('height', H);
  out.appendChild(content);
  return out;
}

/* runs `draw` with nothing selected, so selection rings and colors are not in the picture */
function withoutSelection(draw) {
  const keep = { sel, group };
  sel = null; group = { s: new Set(), e: new Set() };
  renderCanvas();
  try { return draw(); } finally { sel = keep.sel; group = keep.group; renderCanvas(); }
}

/* { svg, W, H } for the diagram, cropped to its content; null when it is empty */
function diagramSvg() {
  if (!M.states.length) return null;
  const { copy, box } = withoutSelection(() => {
    const copy = vp.cloneNode(true), box = vp.getBBox();
    inlineStyles(vp, copy);
    copy.removeAttribute('transform');
    copy.querySelectorAll('.marquee, .ghost, .selring, .hit').forEach(n => n.remove());
    return { copy, box };
  });
  const W = box.width + 2 * PNG_MARGIN, H = box.height + 2 * PNG_MARGIN;
  return { svg: standaloneSvg(copy, `${box.x - PNG_MARGIN} ${box.y - PNG_MARGIN} ${W} ${H}`, W, H), W, H };
}

/* { svg, W, H } for the whole computation tree, whatever the current pan and zoom; null when there is none */
function treeSvg() {
  if (!(M.nd && nrun)) return null;
  const { W, H } = treeLayout(), content = $('#tvp');
  const copy = content.cloneNode(true);
  inlineStyles(content, copy);
  copy.removeAttribute('transform');
  return { svg: standaloneSvg(copy, `0 0 ${W} ${H}`, W, H), W, H };
}

const loadImage = url => new Promise((done, fail) => {
  const img = new Image();
  img.onload = () => done(img);
  img.onerror = fail;
  img.src = url;
});
const canvasToBlob = canvas => new Promise((done, fail) => canvas.toBlob(b => (b ? done(b) : fail(new Error('png'))), 'image/png'));

/* draws the SVG on a canvas, over the background color, and returns the PNG as a blob */
async function pngBlob(picture, background) {
  const scale = Math.min(PNG_SCALE, PNG_MAX_SIDE / Math.max(picture.W, picture.H));
  const xml = new XMLSerializer().serializeToString(picture.svg);
  const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const img = await loadImage(url);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(picture.W * scale);
    canvas.height = Math.round(picture.H * scale);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await canvasToBlob(canvas);
  } finally { URL.revokeObjectURL(url); }
}

/* { name, promise } for what is on screen; the promise gives the PNG. Null when there is nothing to export. */
function makePng() {
  const tree = board.dataset.view === 'tree';
  const picture = tree ? treeSvg() : diagramSvg();
  if (!picture) { toast(tr(tree ? 'png_empty_tree' : 'png_empty')); return null; }
  return {
    name: tree ? 'turing-machine-tree.png' : 'turing-machine-diagram.png',
    promise: pngBlob(picture, getComputedStyle(board).backgroundColor)
  };
}

function downloadBlob(blob, name) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 4000);
}

$('#png-save').addEventListener('click', async () => {
  const png = makePng();
  if (!png) return;
  try { downloadBlob(await png.promise, png.name); toast(tr('png_saved')); } catch (_) { toast(tr('png_fail')); }
});

/* the blob is passed as a promise, so the browser still counts this as a click */
$('#png-copy').addEventListener('click', async () => {
  const png = makePng();
  if (!png) return;
  try { await navigator.clipboard.write([new ClipboardItem({ 'image/png': png.promise })]); toast(tr('png_copied')); } catch (_) { toast(tr('png_copy_fail')); }
});

'use strict';

/* ---------- diagram geometry ---------- */
function geom(e) {
  const a = S(e.from), b = S(e.to), k = e.rules.length;
  const w = Math.max(...e.rules.map(r => ruleText(r).length)) * 7.6;
  let P0, P1, C, mid, t, s, path, nb = null;
  if (a === b) {
    const A = (e.angle ?? -90) * Math.PI / 180, sp = .5;
    const pt = (r, q) => ({ x: a.x + r * Math.cos(q), y: a.y + r * Math.sin(q) });
    P0 = pt(R, A - sp); P1 = pt(R, A + sp);
    const C1 = pt(R + 54, A - sp * .8), C2 = pt(R + 54, A + sp * .8);
    mid = { x: (P0.x + 3 * C1.x + 3 * C2.x + P1.x) / 8, y: (P0.y + 3 * C1.y + 3 * C2.y + P1.y) / 8 };
    t = unit(P1.x - C2.x, P1.y - C2.y);
    path = `M${f(P0)} C${f(C1)} ${f(C2)} ${f(P1)}`;
    s = { x: Math.cos(A), y: Math.sin(A) };
  } else {
    const u = unit(b.x - a.x, b.y - a.y);
    nb = { x: u.y, y: -u.x };
    const bend = e.bend || 0;
    const m0 = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    C = { x: m0.x + nb.x * bend * 2, y: m0.y + nb.y * bend * 2 };
    const d1 = unit(C.x - a.x, C.y - a.y), d2 = unit(C.x - b.x, C.y - b.y);
    P0 = { x: a.x + d1.x * R, y: a.y + d1.y * R };
    P1 = { x: b.x + d2.x * R, y: b.y + d2.y * R };
    mid = { x: .25 * P0.x + .5 * C.x + .25 * P1.x, y: .25 * P0.y + .5 * C.y + .25 * P1.y };
    t = unit(P1.x - C.x, P1.y - C.y);
    const sg = bend > 0 ? 1 : bend < 0 ? -1 : (Math.abs(nb.y) > .3 ? (nb.y < 0 ? 1 : -1) : 1);
    s = { x: nb.x * sg, y: nb.y * sg };
    path = bend ? `M${f(P0)} Q${f(C)} ${f(P1)}` : `M${f(P0)} L${f(P1)}`;
  }
  const back = { x: P1.x - t.x * 11, y: P1.y - t.y * 11 }, pr = { x: -t.y * 5, y: t.x * 5 };
  const arrow = `${f(P1)} ${f({ x: back.x + pr.x, y: back.y + pr.y })} ${f({ x: back.x - pr.x, y: back.y - pr.y })}`;
  const off = 10 + Math.abs(s.y) * 8 * k + Math.abs(s.x) * w / 2;
  return { path, arrow, L: { x: mid.x + s.x * off, y: mid.y + s.y * off }, w, k, nb, mid };
}

function stateAt(p) {
  for (let i = M.states.length - 1; i >= 0; i--) {
    const s = M.states[i];
    if (Math.hypot(p.x - s.x, p.y - s.y) <= R + 4) return s;
  }
  return null;
}
const world = e => { const r = svg.getBoundingClientRect(); return { x: (e.clientX - r.left - view.x) / view.k, y: (e.clientY - r.top - view.y) / view.k }; };

function boundsPoints() {
  const pts = [];
  M.states.forEach(s => { pts.push([s.x - R - 70, s.y - R - 12], [s.x + R + 12, s.y + R + 12]); });
  M.edges.forEach(e => { const g = geom(e); pts.push([g.L.x - g.w / 2 - 8, g.L.y - 8 * g.k - 8], [g.L.x + g.w / 2 + 8, g.L.y + 8 * g.k + 8]); });
  return pts;
}
function fit() {
  const r = svg.getBoundingClientRect();
  if (!r.width) return;
  const pts = boundsPoints();
  if (!pts.length) { view = { x: r.width / 2, y: r.height / 2, k: 1 }; return renderCanvas(); }
  const x0 = Math.min(...pts.map(p => p[0])), x1 = Math.max(...pts.map(p => p[0]));
  const y0 = Math.min(...pts.map(p => p[1])), y1 = Math.max(...pts.map(p => p[1]));
  const top = 58, gap = 18;
  const k = clamp(Math.min((r.width - 2 * gap) / (x1 - x0), (r.height - top - 58) / (y1 - y0)), .3, 1.3);
  view = { k, x: (r.width - (x1 - x0) * k) / 2 - x0 * k, y: top + (r.height - top - 58 - (y1 - y0) * k) / 2 - y0 * k };
  renderCanvas();
}
function zoomAt(factor, cx, cy) {
  const r = svg.getBoundingClientRect();
  cx ??= r.width / 2; cy ??= r.height / 2;
  const k = clamp(view.k * factor, .3, 2.5), q = k / view.k;
  view = { k, x: cx - (cx - view.x) * q, y: cy - (cy - view.y) * q };
  renderCanvas();
}

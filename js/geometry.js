'use strict';

/* Geometry of the diagram: where each arrow goes, where its label sits, and how the view fits the machine. */

const LABEL_CHAR_WIDTH = 7.6, LABEL_LINE_HEIGHT = 16, LOOP_REACH = 54, ARROW_LENGTH = 11, ARROW_HALF_WIDTH = 5;

const midpoint = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const pointAround = (center, radius, angle) => ({ x: center.x + radius * Math.cos(angle), y: center.y + radius * Math.sin(angle) });

/* A loop leaves the state a little before its angle and comes back a little after it, through two control points.
   `outward` is the direction where the label goes. */
function loopCurve(state, edge) {
  const angle = (edge.angle ?? -90) * Math.PI / 180, spread = .5;
  const start = pointAround(state, R, angle - spread), end = pointAround(state, R, angle + spread);
  const c1 = pointAround(state, R + LOOP_REACH, angle - spread * .8);
  const c2 = pointAround(state, R + LOOP_REACH, angle + spread * .8);
  return {
    path: `M${f(start)} C${f(c1)} ${f(c2)} ${f(end)}`,
    end,
    direction: unit(end.x - c2.x, end.y - c2.y),
    middle: { x: (start.x + 3 * c1.x + 3 * c2.x + end.x) / 8, y: (start.y + 3 * c1.y + 3 * c2.y + end.y) / 8 },
    outward: { x: Math.cos(angle), y: Math.sin(angle) },
    normal: null
  };
}

/* the side of an arrow where its label goes: the bulging side, or above it when the arrow is straight */
function labelSide(normal, bend) {
  if (bend) return bend > 0 ? 1 : -1;
  if (Math.abs(normal.y) > .3) return normal.y < 0 ? 1 : -1;
  return 1;
}

/* An arrow from one state to another. `bend` pushes the middle of the arrow sideways (0 is a straight line). */
function linkCurve(from, to, edge) {
  const u = unit(to.x - from.x, to.y - from.y), normal = { x: u.y, y: -u.x };
  const bend = edge.bend || 0, center = midpoint(from, to);
  const control = { x: center.x + normal.x * bend * 2, y: center.y + normal.y * bend * 2 };
  const toward = (state, c) => { const d = unit(c.x - state.x, c.y - state.y); return { x: state.x + d.x * R, y: state.y + d.y * R }; };
  const start = toward(from, control), end = toward(to, control);
  const side = labelSide(normal, bend);
  return {
    path: bend ? `M${f(start)} Q${f(control)} ${f(end)}` : `M${f(start)} L${f(end)}`,
    end,
    direction: unit(end.x - control.x, end.y - control.y),
    middle: { x: .25 * start.x + .5 * control.x + .25 * end.x, y: .25 * start.y + .5 * control.y + .25 * end.y },
    outward: { x: normal.x * side, y: normal.y * side },
    normal
  };
}

/* the three points of the arrow head, as an SVG polygon */
function arrowHead(tip, direction) {
  const back = { x: tip.x - direction.x * ARROW_LENGTH, y: tip.y - direction.y * ARROW_LENGTH };
  const wing = { x: -direction.y * ARROW_HALF_WIDTH, y: direction.x * ARROW_HALF_WIDTH };
  return [tip, { x: back.x + wing.x, y: back.y + wing.y }, { x: back.x - wing.x, y: back.y - wing.y }].map(f).join(' ');
}

/* the center of a label with `lines` lines and the given width, pushed away from the arrow */
function labelCenter(curve, lines, width) {
  const { outward, middle } = curve;
  const distance = 10 + Math.abs(outward.y) * (LABEL_LINE_HEIGHT / 2) * lines + Math.abs(outward.x) * width / 2;
  return { x: middle.x + outward.x * distance, y: middle.y + outward.y * distance };
}

/* Everything needed to draw one transition:
   path and arrow for the line, L and w and k for the label, nb for dragging the bend. */
function geom(e) {
  const from = S(e.from), to = S(e.to), lines = e.rules.length;
  const width = Math.max(...e.rules.map(r => ruleText(r).length)) * LABEL_CHAR_WIDTH;
  const curve = from === to ? loopCurve(from, e) : linkCurve(from, to, e);
  return { path: curve.path, arrow: arrowHead(curve.end, curve.direction), L: labelCenter(curve, lines, width), w: width, k: lines, nb: curve.normal, mid: curve.middle };
}

/* the state under a point of the diagram, if any (the last one drawn wins) */
function stateAt(p) {
  for (let i = M.states.length - 1; i >= 0; i--) {
    const s = M.states[i];
    if (Math.hypot(p.x - s.x, p.y - s.y) <= R + 4) return s;
  }
  return null;
}

/* from a mouse event to a point of the diagram (the inverse of pan and zoom) */
const world = e => {
  const r = svg.getBoundingClientRect();
  return { x: (e.clientX - r.left - view.x) / view.k, y: (e.clientY - r.top - view.y) / view.k };
};

/* ---------- fit and zoom ---------- */

/* the box that holds every state and label, or null for an empty diagram */
function diagramBounds() {
  const points = [];
  M.states.forEach(s => { points.push([s.x - R - 70, s.y - R - 12], [s.x + R + 12, s.y + R + 12]); });
  M.edges.forEach(e => {
    const g = geom(e);
    points.push([g.L.x - g.w / 2 - 8, g.L.y - 8 * g.k - 8], [g.L.x + g.w / 2 + 8, g.L.y + 8 * g.k + 8]);
  });
  if (!points.length) return null;
  const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
}

/* the pan and zoom that show the whole box, leaving room for the toolbar on top and a margin below */
function fittedView(rect, box) {
  const top = 58, bottom = 58, gap = 18, w = box.x1 - box.x0, h = box.y1 - box.y0;
  const k = clamp(Math.min((rect.width - 2 * gap) / w, (rect.height - top - bottom) / h), .3, 1.3);
  return { k, x: (rect.width - w * k) / 2 - box.x0 * k, y: top + (rect.height - top - bottom - h * k) / 2 - box.y0 * k };
}

function fit() {
  const rect = svg.getBoundingClientRect();
  if (!rect.width) return;
  const box = diagramBounds();
  view = box ? fittedView(rect, box) : { x: rect.width / 2, y: rect.height / 2, k: 1 };
  renderCanvas();
}

/* zoom around a point of the board (the center by default) */
function zoomAt(factor, cx, cy) {
  const r = svg.getBoundingClientRect();
  cx ??= r.width / 2; cy ??= r.height / 2;
  const k = clamp(view.k * factor, .3, 2.5), q = k / view.k;
  view = { k, x: cx - (cx - view.x) * q, y: cy - (cy - view.y) * q };
  renderCanvas();
}

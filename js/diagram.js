'use strict';

/* ---------- diagram drawing ---------- */
function renderCanvas() {
  let lines = '', labels = '', nodes = '', texts = '', init = '', gh = '';
  for (const e of M.edges) {
    const g = geom(e);
    const isSel = (sel && sel.kind === 'edge' && sel.id === e.id) || group.e.has(e.id);
    const act = run && run.last && run.last.e === e.id;
    const cls = (isSel ? ' sel' : '') + (act ? ' act' : '') + (M.nd && e.rules.every(r => r.f === 1) ? ' d1' : '');
    lines += `<g class="edge${cls}" data-kind="edge" data-id="${e.id}"><path class="hit" d="${g.path}"/><path class="line" d="${g.path}"/><polygon class="tip" points="${g.arrow}"/></g>`;
    const y0 = g.L.y - (g.k - 1) * 8 + 5;
    const tsp = e.rules.map((r, i) => `<tspan x="${g.L.x.toFixed(1)}"${i ? ' dy="16"' : ''}${act && run.last.r === i ? ' class="on"' : ''}>${esc(ruleText(r))}</tspan>`).join('');
    labels += `<g class="elabel${cls}" data-kind="edge" data-id="${e.id}"><rect x="${(g.L.x - g.w / 2 - 4).toFixed(1)}" y="${(g.L.y - 8 * g.k).toFixed(1)}" width="${(g.w + 8).toFixed(1)}" height="${16 * g.k}"/><text text-anchor="middle" y="${y0.toFixed(1)}">${tsp}</text></g>`;
  }
  const ini = initialState();
  if (ini) {
    const x0 = ini.x - R - 48, x1 = ini.x - R;
    init = `<g class="init"><path d="M${x0} ${ini.y} L${x1 - 8} ${ini.y}"/><polygon points="${x1},${ini.y} ${x1 - 11},${ini.y - 5} ${x1 - 11},${ini.y + 5}"/><text x="${x0 - 8}" y="${ini.y + 5}" text-anchor="end">${esc(tr('initial'))}</text></g>`;
  }
  for (const s of M.states) {
    let cls = '';
    if ((sel && sel.kind === 'state' && sel.id === s.id) || group.s.has(s.id)) cls += ' sel';
    if (run && run.state === s.id) cls += run.status === 'accepted' ? ' ok' : run.status === 'rejected' || run.status === 'limit' ? ' bad' : ' cur';
    if (pending === s.id) cls += ' pend';
    else if (hover === s.id && pending) cls += ' target';
    nodes += `<g class="state${cls}" data-kind="state" data-id="${s.id}" transform="translate(${s.x} ${s.y})">`
      + (cls.includes(' sel') ? `<circle class="selring" r="${R + 7}"/>` : '')
      + `<circle class="body" r="${R}"/>` + (s.final ? `<circle class="inner" r="${R - 5}"/>` : '') + '</g>';
    texts += `<text class="nm" x="${s.x}" y="${s.y + 7}" text-anchor="middle">${nameSvg(s.name)}</text>`;
  }
  if (pending && ghost) { const p = S(pending); if (p) gh = `<path class="ghost" d="M${p.x} ${p.y} L${ghost.x.toFixed(1)} ${ghost.y.toFixed(1)}"/>`; }
  let mq = '';
  if (drag && drag.type === 'marquee' && drag.moved) {
    const x = Math.min(drag.p0.x, drag.p1.x), y = Math.min(drag.p0.y, drag.p1.y);
    mq = `<rect class="marquee" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${Math.abs(drag.p1.x - drag.p0.x).toFixed(1)}" height="${Math.abs(drag.p1.y - drag.p0.y).toFixed(1)}"/>`;
  }
  vp.innerHTML = lines + init + gh + nodes + texts + labels + mq;
  vp.setAttribute('transform', `translate(${view.x.toFixed(1)} ${view.y.toFixed(1)}) scale(${view.k.toFixed(4)})`);
  const g = 22 * view.k;
  board.style.backgroundSize = `${g}px ${g}px`;
  board.style.backgroundPosition = `${view.x}px ${view.y}px`;
  board.dataset.tool = tool;
  const hints = { select: '', pan: tr('hint_pan'), state: tr('hint_state'), edge: pending ? tr('hint_edge_pending') : tr('hint_edge') };
  $('#hint').textContent = hints[tool];
}

'use strict';

/* What the side panel and the status line show for a non-deterministic run. */

/* a tape around its head, with the head cell in brackets: 01[1]0 */
function tapeView(tape) {
  const written = Object.keys(tape.cells).map(Number);
  let lo = Math.min(tape.head, ...written), hi = Math.max(tape.head, ...written);
  if (hi - lo > 11) { lo = Math.max(lo, tape.head - 5); hi = Math.min(hi, tape.head + 5); }
  let text = '';
  for (let i = lo; i <= hi; i++) {
    const symbol = tape.cells[i] ?? M.blank;
    text += i === tape.head ? `[${symbol}]` : symbol;
  }
  return text;
}

function branchItem(n) {
  const state = S(n.state), selected = n.id === selNode ? ' on' : '';
  return `<li><button type="button" class="link conf ${n.status}${selected}" data-node="${n.id}"><span class="cid">#${n.id}</span><span>${nameHtml(state?.name ?? '?')}</span><span class="ctape">${esc(tapeView(n.tapes[0]))}</span><span class="cst">${tr('nd_st_' + n.status)}</span></button></li>`;
}

/* the summary and a list of the leaves (the first 200); clicking one selects that branch */
function ndPanelHtml() {
  const leaves = nrun.nodes.filter(isLeaf), shown = leaves.slice(0, 200);
  const more = leaves.length > shown.length ? `<p class="note">${tr('nd_more', leaves.length - shown.length)}</p>` : '';
  return `<h2>${tr('nd_conf')}</h2>
    <p class="note">${tr('nd_summary', ndStats())}</p>
    <ul class="list confs">${shown.map(branchItem).join('')}</ul>
    ${more}`;
}

function ndStatusCode(stats, done) {
  if (!done) return playing ? 'playing' : 'paused';
  if (stats.accepted) return 'accepted';
  return nrun.capped ? 'limit' : 'rejected';
}

function renderStatusNd() {
  const stats = ndStats(), done = ndDone(), code = ndStatusCode(stats, done);
  const message = nrun.capped ? tr('nd_capped', MAXNODES, MAXLEVEL) : run ? run.msg : '';
  panel.dataset.status = code;
  $('#status').innerHTML = `<span class="pill ${code}">${tr('st_' + code)}</span>
    <span class="facts">${tr('nd_level')} <b>${nrun.level}</b> · ${tr('nd_nodes')} <b>${stats.nodes}</b> · ${tr('nd_leaves')} <b>${stats.leaves}</b> · ${tr('nd_accepting')} <b>${stats.accepted}</b> · ${tr('nd_active')} <b>${stats.active}</b></span>
    <p class="msg">${esc(message) || '&nbsp;'}</p>`;
  $('#b-run').textContent = tr(playing ? 'pause' : 'run');
  $('#b-step').disabled = done;
}

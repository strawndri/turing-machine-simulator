'use strict';

/* ---------- execution ---------- */
const halted = () => (M.nd && nrun ? ndDone() : run && ['accepted', 'rejected', 'limit'].includes(run.status));
function startRun() {
  const ini = initialState();
  run = { tapes: M.tapes.map(t => ({ cells: { ...t.cells }, head: t.head })), state: ini.id, steps: 0, status: 'ready', last: null, lastWrite: null, msg: '' };
}
function stepOnce() {
  if (!run) {
    if (!initialState()) { notice = tr('noInitial'); renderStatus(); return false; }
    startRun();
  }
  if (halted()) return false;
  const st = S(run.state), syms = run.tapes.map(t => symAt(t.cells, t.head));
  if (st.final) { run.status = 'accepted'; run.msg = tr('atFinal', st.name); return false; }
  const matches = [];
  for (const e of M.edges) {
    if (e.from !== run.state) continue;
    e.rules.forEach((r, ri) => {
      const ok = syms.every((c, i) => r.r[i] && inG(r.r[i]) && r.r[i] === c && (M.tapes[i].ro || (r.w[i] && inG(r.w[i]))));
      if (ok) matches.push([e, ri]);
    });
  }
  if (!matches.length) {
    run.status = 'rejected'; run.last = null;
    run.msg = tr('noRule', st.name, syms.join(', '));
    return false;
  }
  const [e, ri] = matches[0], r = e.rules[ri];
  run.lastWrite = [];
  run.tapes.forEach((tp, i) => {
    if (!M.tapes[i].ro) {
      if (r.w[i] === M.blank) delete tp.cells[tp.head]; else tp.cells[tp.head] = r.w[i];
      run.lastWrite[i] = tp.head;
    } else run.lastWrite[i] = null;
    tp.head += r.d[i] === 'L' ? -1 : r.d[i] === 'R' ? 1 : 0;
  });
  run.state = e.to; run.steps++; run.last = { e: e.id, r: ri };
  const wr = r.w.map((c, i) => (M.tapes[i].ro ? r.r[i] : c));
  run.msg = `δ(${st.name}, ${syms.join(', ')}) = (${S(e.to).name}, ${wr.join(', ')}, ${r.d.join(', ')})` + (matches.length > 1 ? tr('warnMulti', matches.length) : '');
  if (S(e.to).final) { run.status = 'accepted'; run.msg += tr('reachedFinal', S(e.to).name); return false; }
  if (run.steps >= LIMIT) { run.status = 'limit'; run.msg = tr('limitMsg', LIMIT); return false; }
  return true;
}
function afterStep() { renderCanvas(); renderTapes(); renderStatus(); scrollAll(true); }
function tick() {
  if (!playing) return;
  let more;
  if (M.nd) { more = stepLevel(); afterNd(); } else { more = stepOnce(); afterStep(); }
  if (!more) { playing = false; renderStatus(); return; }
  timer = setTimeout(tick, 1000 / speed);
}
function pause() { playing = false; clearTimeout(timer); }
function clearRun() { pause(); run = null; nrun = null; selNode = null; autoSel = true; treeAuto = true; }
function resetRun() { clearRun(); notice = ''; renderAll(); scrollAll(false); }
$('#b-reset').addEventListener('click', resetRun);
$('#b-step').addEventListener('click', () => {
  pause();
  if (M.nd) { stepLevel(); afterNd(); } else { stepOnce(); afterStep(); }
});
$('#b-run').addEventListener('click', () => {
  if (playing) { pause(); renderStatus(); return; }
  if (halted()) { clearRun(); }
  if (!run && !initialState()) { if (M.nd) stepLevel(); else stepOnce(); return; }
  playing = true; renderStatus(); tick();
});
$('#speed').addEventListener('input', ev => {
  speed = +ev.target.value; $('#speed-out').textContent = tr('speed_out', speed);
});

function renderStatus() {
  if (M.nd && nrun) return renderStatusNd();
  const st = run ? S(run.state) : initialState();
  const tps = M.tapes.map((_, t) => tapeData(t));
  const code = !run ? 'idle' : halted() ? run.status : playing ? 'playing' : 'paused';
  panel.dataset.status = code;
  const heads = tr(M.k > 1 ? 'lbl_heads' : 'lbl_head');
  $('#status').innerHTML = `<span class="pill ${code}">${tr('st_' + code)}</span>
    <span class="facts">${tr('lbl_state')} <b class="m">${st ? nameHtml(st.name) : '—'}</b> · ${tr('lbl_reading')} <b>${esc(tps.map(t => symAt(t.cells, t.head)).join(', '))}</b> · ${heads} <b>${tps.map(t => t.head).join(', ')}</b> · ${tr('lbl_steps')} <b>${run ? run.steps : 0}</b></span>
    <p class="msg">${esc(run ? run.msg : notice) || '&nbsp;'}</p>`;
  $('#b-run').textContent = tr(playing ? 'pause' : 'run');
  $('#b-step').disabled = !!halted();
}

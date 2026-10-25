'use strict';

/* The run controls (Step, Run, Reset, speed) and the status line under the tapes. */

function afterStep() {
  renderCanvas(); renderTapes(); renderStatus();
  scrollAll(true);
}

/* one step of the machine, or one level of the computation tree; true while there is more to do */
function advance() {
  const more = M.nd ? stepLevel() : stepOnce();
  if (M.nd) afterNd(); else afterStep();
  return more;
}

function tick() {
  if (!playing) return;
  if (!advance()) { playing = false; renderStatus(); return; }
  timer = setTimeout(tick, 1000 / speed);
}

function pause() {
  playing = false;
  clearTimeout(timer);
}

/* forgets the run (and the computation tree), so the next step starts from the initial tapes again */
function clearRun() {
  pause();
  run = null; nrun = null; selNode = null;
  autoSel = true; treeAuto = true;
}

function resetRun() {
  clearRun();
  notice = '';
  renderAll();
  scrollAll(false);
}

$('#b-reset').addEventListener('click', resetRun);
$('#b-step').addEventListener('click', () => { pause(); advance(); });
$('#b-run').addEventListener('click', () => {
  if (playing) { pause(); renderStatus(); return; }
  if (halted()) clearRun();
  if (!run && !initialState()) { if (M.nd) stepLevel(); else stepOnce(); return; }
  playing = true;
  renderStatus();
  tick();
});
$('#speed').addEventListener('input', ev => {
  speed = +ev.target.value;
  $('#speed-out').textContent = tr('speed_out', speed);
});

/* ---------- status line ---------- */

/* idle, playing, paused, or how the run ended */
function statusCode() {
  if (!run) return 'idle';
  if (halted()) return run.status;
  return playing ? 'playing' : 'paused';
}

function statusFacts() {
  const state = run ? S(run.state) : initialState();
  const tapes = M.tapes.map((_, t) => tapeData(t));
  const heads = tr(M.k > 1 ? 'lbl_heads' : 'lbl_head');
  return `<span class="facts">${tr('lbl_state')} <b class="m">${state ? nameHtml(state.name) : '—'}</b> · ${tr('lbl_reading')} <b>${esc(tapes.map(t => symAt(t.cells, t.head)).join(', '))}</b> · ${heads} <b>${tapes.map(t => t.head).join(', ')}</b> · ${tr('lbl_steps')} <b>${run ? run.steps : 0}</b></span>`;
}

function renderStatus() {
  if (M.nd && nrun) return renderStatusNd();
  const code = statusCode();
  panel.dataset.status = code;
  $('#status').innerHTML = `<span class="pill ${code}">${tr('st_' + code)}</span>
    ${statusFacts()}
    <p class="msg">${esc(run ? run.msg : notice) || '&nbsp;'}</p>`;
  $('#b-run').textContent = tr(playing ? 'pause' : 'run');
  $('#b-step').disabled = !!halted();
}

'use strict';

/* ---------- save / load and examples ---------- */
$('#btn-io').addEventListener('click', () => { $('#io-text').value = JSON.stringify(M, null, 1); $('#io-err').textContent = ''; $('#modal').hidden = false; $('#io-text').focus(); });
$('#io-close').addEventListener('click', () => { $('#modal').hidden = true; });
$('#modal').addEventListener('click', ev => { if (ev.target.id === 'modal') $('#modal').hidden = true; });
$('#io-copy').addEventListener('click', async () => {
  const ta = $('#io-text');
  try { await navigator.clipboard.writeText(ta.value); toast(tr('copied')); } catch (_) { ta.select(); toast(tr('copyFail')); }
});
$('#io-load').addEventListener('click', () => {
  let m = null;
  try { m = parseMachine(JSON.parse($('#io-text').value)); } catch (_) {}
  if (!m) { $('#io-err').textContent = tr('ioBad'); return; }
  applyMachine(m); $('#modal').hidden = true; toast(tr('loaded'));
});
function applyMachine(m) {
  checkpoint();
  M = m; sel = null; clearGroup(); pending = null; forceBuild = true;
  clearRun(); notice = '';
  renderAll(); fit(); save(); scrollAll(false);
}
$('#examples').addEventListener('change', ev => {
  const v = ev.target.value; ev.target.value = '';
  if (!v) return;
  applyMachine(v === 'vazio' ? blankMachine() : examples(v));
  toast(tr('exLoaded'));
});

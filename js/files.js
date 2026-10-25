'use strict';

/* Save / load as text (JSON), and the Examples menu. */

const dialog = $('#modal');
const openDialog = () => {
  $('#io-text').value = JSON.stringify(M, null, 1);
  $('#io-err').textContent = '';
  dialog.hidden = false;
  $('#io-text').focus();
};
const closeDialog = () => { dialog.hidden = true; };

/* replaces the machine and draws it from scratch; Ctrl+Z brings the old one back */
function applyMachine(m) {
  checkpoint();
  M = m; sel = null; pending = null; forceBuild = true;
  clearGroup();
  clearRun();
  notice = '';
  renderAll(); fit(); save(); scrollAll(false);
}

async function copyJson() {
  const box = $('#io-text');
  try { await navigator.clipboard.writeText(box.value); toast(tr('copied')); } catch (_) { box.select(); toast(tr('copyFail')); }
}

function loadJson() {
  let machine = null;
  try { machine = parseMachine(JSON.parse($('#io-text').value)); } catch (_) {}
  if (!machine) { $('#io-err').textContent = tr('ioBad'); return; }
  applyMachine(machine);
  closeDialog();
  toast(tr('loaded'));
}

$('#btn-io').addEventListener('click', openDialog);
$('#io-close').addEventListener('click', closeDialog);
dialog.addEventListener('click', ev => { if (ev.target.id === 'modal') closeDialog(); });
$('#io-copy').addEventListener('click', copyJson);
$('#io-load').addEventListener('click', loadJson);

/* choosing an example loads it, and the menu goes back to its title */
$('#examples').addEventListener('change', ev => {
  const name = ev.target.value;
  ev.target.value = '';
  if (!name) return;
  applyMachine(buildExample(name));
  toast(tr('exLoaded'));
});

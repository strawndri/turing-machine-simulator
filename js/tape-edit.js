'use strict';

/* Editing the tapes: typing in cells, moving the head, loading words, the blank symbol and the number of tapes. */

const tapeOfEvent = ev => { const b = ev.target.closest('.tape-block'); return b ? +b.dataset.t : -1; };

/* an empty symbol (or the blank) removes the cell; the tape being edited is the running one, if there is a run */
function setCell(t, i, symbol) {
  const { cells } = tapeData(t);
  if (!symbol || symbol === M.blank) delete cells[i]; else cells[i] = symbol;
}

function focusCell(t, i) {
  cursor[t] = i;
  renderTape(t);
  const cell = blocks[t].strip.querySelector(`.cell[data-i="${i}"]`);
  if (!cell) return;
  cell.focus({ preventScroll: true });
  cell.select();
  cell.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

function clearCell(t, i) {
  checkpoint('tape');
  setCell(t, i, '');
  save();
}

/* ---------- typing in a cell ---------- */

/* the last typed character goes into the cell and the cursor moves to the next one; symbols outside Γ are refused */
function typeInCell(el, ev) {
  const t = tapeOfEvent(ev), i = +el.dataset.i, typed = Array.from(el.value.trim());
  const symbol = typed.length ? typed[typed.length - 1] : '';
  if (symbol && !inG(symbol)) {
    toast(tr('notInGamma', symbol));
    el.value = tapeData(t).cells[i] ?? '';
    el.select();
    return;
  }
  checkpoint('tape');
  setCell(t, i, symbol);
  el.value = tapeData(t).cells[i] ?? '';
  save();
  if (typed.length || ev.data === ' ') focusCell(t, i + 1); else renderTape(t);
  renderStatus();
}

/* arrows move, Backspace and Delete erase, Space writes a blank, Enter leaves the cell */
function handleCellKey(ev, el) {
  const t = tapeOfEvent(ev), i = +el.dataset.i, hasSymbol = tapeData(t).cells[i] !== undefined;
  if (ev.key === 'ArrowLeft') { ev.preventDefault(); focusCell(t, i - 1); }
  else if (ev.key === 'ArrowRight') { ev.preventDefault(); focusCell(t, i + 1); }
  else if (ev.key === 'Backspace') {
    ev.preventDefault();
    if (hasSymbol) { clearCell(t, i); renderTape(t); el.select(); }
    else { clearCell(t, i - 1); focusCell(t, i - 1); }
  } else if (ev.key === 'Delete') { ev.preventDefault(); clearCell(t, i); renderTape(t); el.select(); }
  else if (ev.key === ' ') { ev.preventDefault(); clearCell(t, i); focusCell(t, i + 1); }
  else if (ev.key === 'Enter') el.blur();
}

tapesEl.addEventListener('focusin', ev => {
  if (!ev.target.classList.contains('cell')) return;
  cursor[tapeOfEvent(ev)] = +ev.target.dataset.i;
  ev.target.select();
});
tapesEl.addEventListener('input', ev => { if (ev.target.classList.contains('cell')) typeInCell(ev.target, ev); });
tapesEl.addEventListener('keydown', ev => {
  const el = ev.target;
  if (el.classList.contains('inp')) { if (ev.key === 'Enter') loadInput(tapeOfEvent(ev)); return; }
  if (el.classList.contains('cell')) handleCellKey(ev, el);
});

/* ---------- head, buttons and read-only ---------- */

function placeHead(t, i) {
  checkpoint('head');
  tapeData(t).head = i;
  save(); renderTape(t); renderStatus();
}

/* writes the word of the input box on the tape, with the head on its first symbol */
function loadInput(t) {
  const word = blocks[t].inp.value;
  const outside = [...new Set(Array.from(word).filter(c => c.trim() && !inG(c)))];
  if (outside.length) { toast(tr('loadOutside', outside.join(', '))); return; }
  checkpoint();
  setTape(M, word, t);
  clearRun(); notice = ''; cursor[t] = null;
  renderAll(); save();
  blocks[t].scroller.scrollLeft = 0;
}

function clearTape(t) {
  checkpoint();
  const tape = M.tapes[t];
  tape.cells = {};
  tape.head = 0;
  blocks[t].inp.value = '';
  clearRun(); notice = ''; cursor[t] = null;
  renderAll(); save();
}

function handleTapeButton(t, action) {
  if (action === 'pad-l') { pads[t].l += 8; renderTape(t); }
  else if (action === 'pad-r') { pads[t].r += 8; renderTape(t); blocks[t].scroller.scrollLeft = blocks[t].scroller.scrollWidth; }
  else if (action === 'load') loadInput(t);
  else if (action === 'clear') clearTape(t);
}

tapesEl.addEventListener('click', ev => {
  const t = tapeOfEvent(ev);
  if (t < 0) return;
  const slot = ev.target.closest('.slot');
  if (slot) return placeHead(t, +slot.dataset.i);
  const button = ev.target.closest('button[data-act]');
  if (button) handleTapeButton(t, button.dataset.act);
});

/* a read-only tape is never written, so every rule writes what it reads */
tapesEl.addEventListener('change', ev => {
  if (!ev.target.classList.contains('ro-cb')) return;
  const t = tapeOfEvent(ev), on = ev.target.checked;
  checkpoint();
  M.tapes[t].ro = on;
  if (on) M.edges.forEach(e => e.rules.forEach(r => { r.w[t] = r.r[t]; }));
  renderTape(t); renderInspector(); renderCanvas(); save();
});
$('#b-gohead').addEventListener('click', () => scrollAll(true));

/* ---------- blank symbol ---------- */

/* the new blank replaces the old one in Γ, and cells that held it are now empty */
$('#blank').addEventListener('input', ev => {
  const symbol = Array.from(ev.target.value.trim())[0];
  if (!symbol) return;
  checkpoint('blank');
  const old = M.blank;
  M.blank = symbol;
  M.gamma = [...new Set(M.gamma.map(c => (c === old ? symbol : c)))];
  [...M.tapes, ...(run ? run.tapes : [])].forEach(tape => {
    for (const index of Object.keys(tape.cells)) if (tape.cells[index] === symbol) delete tape.cells[index];
  });
  ev.target.value = symbol;
  renderGamma(); renderTapes(); renderInspector(); renderStatus(); save();
});

/* ---------- number of tapes ---------- */

/* new tapes start blank: old rules read and write the blank there and keep the head still */
function growTapes(k) {
  while (M.tapes.length < k) M.tapes.push(newTape());
  M.edges.forEach(e => e.rules.forEach(r => {
    while (r.r.length < k) { r.r.push(M.blank); r.w.push(M.blank); r.d.push('S'); }
  }));
}

function shrinkTapes(k) {
  M.tapes.length = k;
  M.edges.forEach(e => e.rules.forEach(r => { r.r.length = k; r.w.length = k; r.d.length = k; }));
  if (k === 1) M.tapes[0].ro = false;
}

function setK(k) {
  if (k < 1 || k > MAXK || k === M.k) return;
  checkpoint();
  clearRun(); notice = '';
  const grew = k > M.k;
  if (grew) growTapes(k); else shrinkTapes(k);
  M.k = k;
  forceBuild = true;
  renderAll(); save();
  if (grew) toast(tr('kGrew', k));
}
$('#k-plus').addEventListener('click', () => setK(M.k + 1));
$('#k-minus').addEventListener('click', () => setK(M.k - 1));

'use strict';

/* Draws the tapes: one block per tape, with a strip of cells, the head marker and the input box.
   Per-tape state lives in state.js: blocks (DOM), cursor, pads (extra cells) and ranges (cells drawn). */

const cellId = (t, i) => `cell_${t}_${i < 0 ? 'm' + -i : i}`;

/* ---------- building the blocks ---------- */

function tapeBlockHtml(t) {
  return `<div class="tape-block" data-t="${t}">
      <div class="tb-head">
        <span class="tb-name">${tr('tape_n', t + 1)}</span>
        <label class="check" for="ro-${t}"><input type="checkbox" class="ro-cb" id="ro-${t}"> ${tr('ro_label')}</label>
        <label class="sr" for="inp-${t}">${esc(tr('inp_sr', t + 1))}</label>
        <input type="text" class="inp" id="inp-${t}" autocomplete="off" spellcheck="false" placeholder="${esc(tr('inp_ph'))}">
        <button class="btn sm" type="button" data-act="load">${tr('load')}</button>
        <button class="btn sm" type="button" data-act="clear">${tr('clear')}</button>
      </div>
      <div class="tape-scroll"><button class="padbtn" type="button" data-act="pad-l">${tr('pad')}</button><div class="strip"></div><button class="padbtn" type="button" data-act="pad-r">${tr('pad')}</button></div>
    </div>`;
}

/* creates the blocks again, for example when the number of tapes or the language changes */
function buildTapes() {
  tapesEl.innerHTML = M.tapes.map((_, t) => tapeBlockHtml(t)).join('');
  tapesEl.classList.toggle('multi', M.k > 1);
  blocks = [...tapesEl.querySelectorAll('.tape-block')].map(el => ({
    el, strip: el.querySelector('.strip'), scroller: el.querySelector('.tape-scroll'), ro: el.querySelector('.ro-cb'), inp: el.querySelector('.inp')
  }));
  blocks.forEach((b, t) => { b.inp.value = tapeString(t); });
  cursor = Array(M.k).fill(null);
  pads = Array.from({ length: M.k }, () => ({ l: 0, r: 0 }));
  ranges = Array.from({ length: M.k }, () => [null, null]);
  builtK = M.k;
  forceBuild = false;
}

/* ---------- one tape ---------- */

/* the cells to draw: everything in use, the head and the cursor, plus some blank cells around */
function visibleRange(t) {
  const { cells, head } = tapeData(t), written = Object.keys(cells).map(Number), cur = cursor[t] ?? 0;
  return [
    Math.min(0, head, cur, ...written) - 7 - pads[t].l,
    Math.max(14, head, cur, ...written) + 7 + pads[t].r
  ];
}

/* a head marker above the cell, the cell itself and its number below */
function cellColumnHtml(t, i) {
  const marker = `<button type="button" class="slot" data-i="${i}" title="${esc(tr('slot_title'))}" aria-label="${esc(tr('slot_aria', t, i))}"><span class="chip"></span><span class="tri"></span></button>`;
  const cell = `<input class="cell" id="${cellId(t, i)}" data-i="${i}" maxlength="1" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="${esc(tr('cell_aria', t, i))}">`;
  return `<div class="col" data-i="${i}">${marker}${cell}<span class="idx">${i}</span></div>`;
}

/* the index of the cell that has focus inside this tape, or null */
function focusedCell(block) {
  const active = document.activeElement;
  const isCell = active && active.classList && active.classList.contains('cell') && block.el.contains(active);
  return isCell ? active.dataset.i : null;
}

/* draws the cells again; the focused cell keeps focus, and the scroll does not jump when cells are added on the left */
function rebuildStrip(t, lo, hi) {
  const block = blocks[t], [oldLo] = ranges[t], keep = focusedCell(block), oldScroll = block.scroller.scrollLeft;
  let html = '';
  for (let i = lo; i <= hi; i++) html += cellColumnHtml(t, i);
  block.strip.innerHTML = html;
  if (oldLo !== null && lo < oldLo) block.scroller.scrollLeft = oldScroll + (oldLo - lo) * COLW;
  ranges[t] = [lo, hi];
  if (keep !== null) {
    const cell = block.strip.querySelector(`.cell[data-i="${keep}"]`);
    if (cell) cell.focus({ preventScroll: true });
  }
}

/* writes the current symbols, the head and the last written cell into the cells that are already drawn */
function updateCells(t) {
  const { cells, head } = tapeData(t);
  const state = run ? S(run.state) : initialState();
  const chip = state ? nameHtml(state.name) : '?';
  const wrote = run && run.lastWrite ? run.lastWrite[t] : null;
  blocks[t].strip.querySelectorAll('.col').forEach(col => {
    const i = +col.dataset.i, input = col.querySelector('.cell'), symbol = cells[i] ?? '';
    if (input.value !== symbol) input.value = symbol;
    input.placeholder = M.blank;
    input.classList.toggle('out', symbol !== '' && !inG(symbol));
    col.classList.toggle('head', i === head);
    col.classList.toggle('wrote', i === wrote);
    if (i === head) col.querySelector('.chip').innerHTML = chip;
  });
}

function renderTape(t) {
  const block = blocks[t], [lo, hi] = visibleRange(t), [oldLo, oldHi] = ranges[t];
  block.ro.checked = !!M.tapes[t].ro;
  block.el.classList.toggle('ro', !!M.tapes[t].ro);
  if (lo !== oldLo || hi !== oldHi) rebuildStrip(t, lo, hi);
  updateCells(t);
}

/* ---------- all tapes ---------- */

function renderTapes() {
  if (forceBuild || builtK !== M.k) buildTapes();
  for (let t = 0; t < M.k; t++) renderTape(t);
  $('#k-out').textContent = tr('k_out', M.k);
  $('#k-minus').disabled = M.k <= 1;
  $('#k-plus').disabled = M.k >= MAXK;
  $('#tape-tag').textContent = tr('tag', M.k, !!run);
  $('#tape-tag').classList.toggle('live', !!run);
}

/* scrolls a tape so that its head is in the middle of the strip */
function scrollToHead(t, smooth) {
  const block = blocks[t];
  if (!block) return;
  const col = block.strip.querySelector(`.col[data-i="${tapeData(t).head}"]`);
  if (!col) return;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const left = col.offsetLeft + block.strip.offsetLeft - block.scroller.clientWidth / 2 + COLW / 2;
  block.scroller.scrollTo({ left, behavior: smooth && !reduceMotion ? 'smooth' : 'auto' });
}
const scrollAll = smooth => { for (let t = 0; t < M.k; t++) scrollToHead(t, smooth); };

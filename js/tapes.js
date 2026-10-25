'use strict';

/* ---------- tapes ---------- */
const cellId = (t, i) => `cell_${t}_${i < 0 ? 'm' + -i : i}`;

function buildTapes() {
  let h = '';
  for (let t = 0; t < M.k; t++) {
    h += `<div class="tape-block" data-t="${t}">
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
  tapesEl.innerHTML = h;
  tapesEl.classList.toggle('multi', M.k > 1);
  blocks = [...tapesEl.querySelectorAll('.tape-block')].map((el, t) => ({
    el, strip: el.querySelector('.strip'), scroller: el.querySelector('.tape-scroll'), ro: el.querySelector('.ro-cb'), inp: el.querySelector('.inp')
  }));
  blocks.forEach((b, t) => { b.inp.value = tapeString(t); });
  cursor = Array(M.k).fill(null);
  pads = Array.from({ length: M.k }, () => ({ l: 0, r: 0 }));
  ranges = Array.from({ length: M.k }, () => [null, null]);
  builtK = M.k; forceBuild = false;
}
function renderTapes() {
  if (forceBuild || builtK !== M.k) buildTapes();
  for (let t = 0; t < M.k; t++) renderTape(t);
  $('#k-out').textContent = tr('k_out', M.k);
  $('#k-minus').disabled = M.k <= 1;
  $('#k-plus').disabled = M.k >= MAXK;
  $('#tape-tag').textContent = tr('tag', M.k, !!run);
  $('#tape-tag').classList.toggle('live', !!run);
}
function renderTape(t) {
  const B = blocks[t], T = tapeData(t), cells = T.cells, head = T.head, strip = B.strip;
  const keys = Object.keys(cells).map(Number);
  const cur = cursor[t];
  const lo = Math.min(0, head, cur ?? 0, ...keys) - 7 - pads[t].l;
  const hi = Math.max(14, head, cur ?? 0, ...keys) + 7 + pads[t].r;
  const st = run ? S(run.state) : initialState();
  const chip = st ? nameHtml(st.name) : '?';
  const wrote = run && run.lastWrite ? run.lastWrite[t] : null;
  B.ro.checked = !!M.tapes[t].ro;
  B.el.classList.toggle('ro', !!M.tapes[t].ro);
  const [oldLo, oldHi] = ranges[t];
  if (lo !== oldLo || hi !== oldHi) {
    const act = document.activeElement, keep = act && act.classList && act.classList.contains('cell') && B.el.contains(act) ? act.dataset.i : null;
    const oldScroll = B.scroller.scrollLeft;
    let h = '';
    for (let i = lo; i <= hi; i++) {
      h += `<div class="col" data-i="${i}"><button type="button" class="slot" data-i="${i}" title="${esc(tr('slot_title'))}" aria-label="${esc(tr('slot_aria', t, i))}"><span class="chip"></span><span class="tri"></span></button>`
        + `<input class="cell" id="${cellId(t, i)}" data-i="${i}" maxlength="1" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="${esc(tr('cell_aria', t, i))}"><span class="idx">${i}</span></div>`;
    }
    strip.innerHTML = h;
    if (oldLo !== null && lo < oldLo) B.scroller.scrollLeft = oldScroll + (oldLo - lo) * COLW;
    ranges[t] = [lo, hi];
    if (keep !== null) { const n = strip.querySelector(`.cell[data-i="${keep}"]`); if (n) n.focus({ preventScroll: true }); }
  }
  strip.querySelectorAll('.col').forEach(col => {
    const i = +col.dataset.i, inp = col.querySelector('.cell');
    const v = cells[i] ?? '';
    if (inp.value !== v) inp.value = v;
    inp.placeholder = M.blank;
    inp.classList.toggle('out', v !== '' && !inG(v));
    col.classList.toggle('head', i === head);
    col.classList.toggle('wrote', i === wrote);
    if (i === head) col.querySelector('.chip').innerHTML = chip;
  });
}
function scrollToHead(t, smooth) {
  const B = blocks[t]; if (!B) return;
  const col = B.strip.querySelector(`.col[data-i="${tapeData(t).head}"]`);
  if (!col) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  B.scroller.scrollTo({ left: col.offsetLeft + B.strip.offsetLeft - B.scroller.clientWidth / 2 + COLW / 2, behavior: smooth && !reduce ? 'smooth' : 'auto' });
}
const scrollAll = smooth => { for (let t = 0; t < M.k; t++) scrollToHead(t, smooth); };
function setCell(t, i, ch) {
  const T = tapeData(t);
  if (!ch || ch === M.blank) delete T.cells[i]; else T.cells[i] = ch;
}
function focusCell(t, i) {
  cursor[t] = i; renderTape(t);
  const n = blocks[t].strip.querySelector(`.cell[data-i="${i}"]`);
  if (n) { n.focus({ preventScroll: true }); n.select(); n.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
}
const tapeOfEvent = ev => { const b = ev.target.closest('.tape-block'); return b ? +b.dataset.t : -1; };

tapesEl.addEventListener('focusin', ev => {
  if (ev.target.classList.contains('cell')) { cursor[tapeOfEvent(ev)] = +ev.target.dataset.i; ev.target.select(); }
});
tapesEl.addEventListener('input', ev => {
  const el = ev.target; if (!el.classList.contains('cell')) return;
  const t = tapeOfEvent(ev), i = +el.dataset.i, chars = Array.from(el.value.trim());
  const ch = chars.length ? chars[chars.length - 1] : '';
  if (ch && !inG(ch)) { toast(tr('notInGamma', ch)); el.value = tapeData(t).cells[i] ?? ''; el.select(); return; }
  checkpoint('tape');
  setCell(t, i, ch);
  el.value = tapeData(t).cells[i] ?? '';
  save();
  if (chars.length || ev.data === ' ') focusCell(t, i + 1); else renderTape(t);
  renderStatus();
});
tapesEl.addEventListener('keydown', ev => {
  const el = ev.target;
  if (el.classList.contains('inp')) { if (ev.key === 'Enter') loadInput(tapeOfEvent(ev)); return; }
  if (!el.classList.contains('cell')) return;
  const t = tapeOfEvent(ev), i = +el.dataset.i;
  if (ev.key === 'ArrowLeft') { ev.preventDefault(); focusCell(t, i - 1); }
  else if (ev.key === 'ArrowRight') { ev.preventDefault(); focusCell(t, i + 1); }
  else if (ev.key === 'Backspace') {
    ev.preventDefault(); checkpoint('tape');
    if (tapeData(t).cells[i] !== undefined) { setCell(t, i, ''); save(); renderTape(t); el.select(); }
    else { setCell(t, i - 1, ''); save(); focusCell(t, i - 1); }
  } else if (ev.key === 'Delete') { ev.preventDefault(); checkpoint('tape'); setCell(t, i, ''); save(); renderTape(t); el.select(); }
  else if (ev.key === ' ') { ev.preventDefault(); checkpoint('tape'); setCell(t, i, ''); save(); focusCell(t, i + 1); }
  else if (ev.key === 'Enter') el.blur();
});
tapesEl.addEventListener('click', ev => {
  const t = tapeOfEvent(ev); if (t < 0) return;
  const slot = ev.target.closest('.slot');
  if (slot) {
    checkpoint('head');
    tapeData(t).head = +slot.dataset.i;
    save(); renderTape(t); renderStatus();
    return;
  }
  const b = ev.target.closest('button[data-act]'); if (!b) return;
  const a = b.dataset.act;
  if (a === 'pad-l') { pads[t].l += 8; renderTape(t); }
  else if (a === 'pad-r') { pads[t].r += 8; renderTape(t); blocks[t].scroller.scrollLeft = blocks[t].scroller.scrollWidth; }
  else if (a === 'load') loadInput(t);
  else if (a === 'clear') {
    checkpoint(); const tp = M.tapes[t]; tp.cells = {}; tp.head = 0; blocks[t].inp.value = '';
    clearRun(); notice = ''; cursor[t] = null; renderAll(); save();
  }
});
tapesEl.addEventListener('change', ev => {
  if (!ev.target.classList.contains('ro-cb')) return;
  const t = tapeOfEvent(ev), on = ev.target.checked;
  checkpoint(); M.tapes[t].ro = on;
  if (on) M.edges.forEach(e => e.rules.forEach(r => { r.w[t] = r.r[t]; }));
  renderTape(t); renderInspector(); renderCanvas(); save();
});
$('#b-gohead').addEventListener('click', () => scrollAll(true));

function loadInput(t) {
  const str = blocks[t].inp.value;
  const bad = [...new Set(Array.from(str).filter(c => c.trim() && !inG(c)))];
  if (bad.length) { toast(tr('loadOutside', bad.join(', '))); return; }
  checkpoint();
  setTape(M, str, t);
  clearRun(); notice = ''; cursor[t] = null;
  renderAll(); save(); blocks[t].scroller.scrollLeft = 0;
}
$('#blank').addEventListener('input', ev => {
  const v = Array.from(ev.target.value.trim())[0];
  if (!v) return;
  checkpoint('blank');
  const old = M.blank;
  M.blank = v;
  M.gamma = [...new Set(M.gamma.map(c => c === old ? v : c))];
  [...M.tapes, ...(run ? run.tapes : [])].forEach(tp => { for (const k of Object.keys(tp.cells)) if (tp.cells[k] === v) delete tp.cells[k]; });
  ev.target.value = v;
  renderGamma(); renderTapes(); renderInspector(); renderStatus(); save();
});

function setK(k) {
  if (k < 1 || k > MAXK || k === M.k) return;
  checkpoint();
  clearRun(); notice = '';
  const grew = k > M.k;
  if (k > M.k) {
    while (M.tapes.length < k) M.tapes.push(newTape());
    M.edges.forEach(e => e.rules.forEach(r => { while (r.r.length < k) { r.r.push(M.blank); r.w.push(M.blank); r.d.push('S'); } }));
  } else {
    M.tapes.length = k;
    M.edges.forEach(e => e.rules.forEach(r => { r.r.length = k; r.w.length = k; r.d.length = k; }));
    if (k === 1) M.tapes[0].ro = false;
  }
  M.k = k; forceBuild = true;
  renderAll(); save();
  if (grew) toast(tr('kGrew', k));
}
$('#k-plus').addEventListener('click', () => setK(M.k + 1));
$('#k-minus').addEventListener('click', () => setK(M.k - 1));

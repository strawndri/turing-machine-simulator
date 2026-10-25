'use strict';

/* Edits made in the side panel: the name and flags of a state, and the rules of a transition. */

/* ---------- typing ---------- */

function renameState(input) {
  const s = S(sel.id), name = input.value.trim(), error = $('#insp-err');
  if (!name) { error.textContent = tr('err_name_empty'); return; }
  if (M.states.some(x => x !== s && x.name === name)) { error.textContent = tr('err_name_dup'); return; }
  error.textContent = '';
  checkpoint('name:' + s.id);
  s.name = name;
  insp.querySelector('.big').innerHTML = nameHtml(name);
  renderCanvas(); renderTapes(); renderStatus(); save();
}

/* keeps a single symbol that is inside Γ; anything else is refused with a message */
function cleanSymbol(input) {
  input.value = input.value.replace(/\s/g, '');
  if (input.value && !inG(input.value)) { toast(tr('notInGamma', input.value)); input.value = ''; }
  input.classList.toggle('bad', !!input.value && !inG(input.value));
}

/* after the read symbol, the cursor goes to the write field (or the next tape's read field) */
function focusNextField(ri, ti) {
  const write = $(`#rw-${ri}-${ti}`), nextRead = $(`#rr-${ri}-${ti + 1}`);
  const next = write && !write.disabled ? write : nextRead;
  if (next) { next.focus(); next.select(); }
}

function editRuleSymbol(input) {
  const row = input.closest('.rule'), ri = +row.dataset.ri, ti = +row.dataset.t, field = input.dataset.f;
  const e = E(sel.id), rule = e.rules[ri];
  checkpoint(`rule:${e.id}:${ri}:${ti}${field}`);
  cleanSymbol(input);
  rule[field][ti] = input.value;
  if (field === 'r' && M.tapes[ti].ro) {
    rule.w[ti] = input.value;
    const write = $(`#rw-${ri}-${ti}`);
    if (write) write.value = input.value;
  }
  renderCanvas(); save();
  if (field === 'r' && input.value) focusNextField(ri, ti);
}

insp.addEventListener('input', ev => {
  const t = ev.target;
  if (!sel) return;
  if (t.id === 'insp-name') renameState(t);
  else if (t.dataset.f === 'r' || t.dataset.f === 'w') editRuleSymbol(t);
});

/* ---------- choosing ---------- */

/* the initial flag belongs to one state only; the final flag can be on several */
function toggleStateFlag(checkbox) {
  const s = S(sel.id);
  checkpoint();
  if (checkbox.id === 'insp-initial') { M.states.forEach(x => { x.initial = false; }); s.initial = checkbox.checked; }
  else s.final = checkbox.checked;
  renderCanvas(); renderTapes(); renderStatus(); save();
}

function setRuleFunction(select) {
  const e = E(sel.id);
  checkpoint();
  e.rules[+select.id.slice(3)].f = +select.value;
  renderCanvas(); renderInspector(); save();
}

function setRuleMove(select) {
  const row = select.closest('.rule'), e = E(sel.id);
  checkpoint();
  e.rules[+row.dataset.ri].d[+row.dataset.t] = select.value;
  renderCanvas(); save();
}

insp.addEventListener('change', ev => {
  const t = ev.target;
  if (!sel) return;
  if (t.id === 'insp-initial' || t.id === 'insp-final') toggleStateFlag(t);
  else if (t.dataset.f === 'f') setRuleFunction(t);
  else if (t.dataset.f === 'd') setRuleMove(t);
});

/* ---------- buttons ---------- */

function addRule() {
  const e = E(sel.id);
  checkpoint();
  e.rules.push(newRule());
  renderInspector(); renderCanvas(); save();
  const first = $(`#rr-${e.rules.length - 1}-0`);
  if (first) first.focus();
}

function removeRule(index) {
  const e = E(sel.id);
  if (e.rules.length < 2) return;
  checkpoint();
  e.rules.splice(index, 1);
  if (run && run.last && run.last.e === e.id) run.last = null;
  renderInspector(); renderCanvas(); save();
}

insp.addEventListener('click', ev => {
  const button = ev.target.closest('button');
  if (!button) return;
  const d = button.dataset;
  if (d.node !== undefined) return selectNode(+d.node);
  if (d.go) { sel = { kind: 'edge', id: d.go }; renderInspector(); renderCanvas(); return; }
  if (d.act === 'delete') return deleteSel();
  if (d.act === 'add-rule') return addRule();
  if (d.delRule !== undefined) removeRule(+d.delRule);
});

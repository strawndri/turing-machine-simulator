'use strict';

/* The side panel: what it shows for each kind of selection. Every panel is a function that returns HTML. */

const badSymbol = c => (c && !inG(c) ? ' bad' : '');
const ariaFor = (key, multi, t, i) => esc(tr(key, multi, t, i));

/* ---------- rules of a transition ---------- */

function readInput(r, i, t, multi) {
  return `<input class="sym${badSymbol(r.r[t])}" id="rr-${i}-${t}" data-f="r" value="${esc(r.r[t])}" placeholder="?" maxlength="1" aria-label="${ariaFor('ariaRead', multi, t, i)}" autocomplete="off" spellcheck="false">`;
}

/* on a read-only tape the write field is disabled and shows the symbol that was read */
function writeInput(r, i, t, multi) {
  const readOnly = M.tapes[t].ro;
  const shown = readOnly ? r.r[t] : r.w[t], bad = readOnly ? '' : badSymbol(r.w[t]);
  const disabled = readOnly ? `disabled title="${esc(tr('ro_title'))}"` : '';
  return `<input class="sym${bad}" id="rw-${i}-${t}" data-f="w" value="${esc(shown)}" placeholder="?" maxlength="1" ${disabled} aria-label="${ariaFor('ariaWrite', multi, t, i)}" autocomplete="off" spellcheck="false">`;
}

function moveSelect(r, i, t, multi) {
  const options = ['L', 'R', 'S'].map(v => `<option value="${v}"${r.d[t] === v ? ' selected' : ''}>${tr('mv_' + v)}</option>`).join('');
  return `<select id="rd-${i}-${t}" data-f="d" aria-label="${ariaFor('ariaMove', multi, t, i)}">${options}</select>`;
}

/* only the first row of a rule has the button that removes it, and the last rule cannot be removed */
function deleteRuleButton(i, canDelete) {
  return `<button class="icon" type="button" data-del-rule="${i}" aria-label="${esc(tr('ariaDelRule', i))}" ${canDelete ? '' : 'disabled'}>×</button>`;
}

/* one row of a rule: read, write and move for tape t */
function ruleRow(r, i, t, canDelete) {
  const multi = M.k > 1;
  return `<div class="rule" data-ri="${i}" data-t="${t}">
      ${multi ? `<span class="tl">F${t + 1}</span>` : ''}
      ${readInput(r, i, t, multi)}
      ${writeInput(r, i, t, multi)}
      ${moveSelect(r, i, t, multi)}
      ${t === 0 ? deleteRuleButton(i, canDelete) : '<span></span>'}
    </div>`;
}

/* the δ0 / δ1 choice of a rule on a non-deterministic machine */
function functionSelect(r, i) {
  const options = `<option value="0"${r.f ? '' : ' selected'}>δ0</option><option value="1"${r.f ? ' selected' : ''}>δ1</option>`;
  return `<div class="fline"><label for="rf-${i}">${tr('fn_label')}</label><select id="rf-${i}" data-f="f" aria-label="${esc(tr('ariaFn', i))}">${options}</select></div>`;
}

/* a rule is one row per tape, in a card when there are several rows or a δ choice */
function ruleRows(r, i, canDelete) {
  const rows = M.tapes.map((_, t) => ruleRow(r, i, t, canDelete)).join('');
  if (M.k > 1 || M.nd) return `<div class="rcard">${M.nd ? functionSelect(r, i) : ''}${rows}</div>`;
  return rows;
}

/* ---------- the panels ---------- */

function groupPanel() {
  return `<h2>${tr('h_group')}</h2><p class="big">${tr('group_counts', group.s.size, group.e.size)}</p><p class="note">${tr('group_note')}</p><button class="btn danger" type="button" data-act="delete">${tr('del_group')}</button>`;
}

/* what to do when nothing is selected: how to use, and the shortcuts */
function helpPanel() {
  const shortcuts = tr('shortcuts').map(([keys, action]) => `<tr><td>${esc(keys)}</td><td>${esc(action)}</td></tr>`).join('');
  const steps = tr('help').map(h => `<li>${h}</li>`).join('');
  return `<h2>${tr('how_title')}</h2><ol class="help">${steps}</ol><h2>${tr('shortcuts_title')}</h2><table class="keys">${shortcuts}</table><p class="note">${tr('saved_note')}</p>`;
}

/* a button that selects a transition, with its rules as text */
function transitionLink(e) {
  return `<li><button type="button" class="link" data-go="${e.id}">${nameHtml(S(e.from).name)} → ${nameHtml(S(e.to).name)} <span>${esc(e.rules.map(ruleText).join(' '))}</span></button></li>`;
}

function transitionList(titleKey, edges) {
  if (!edges.length) return '';
  return `<div class="field"><span>${tr(titleKey)}</span><ul class="list">${edges.map(transitionLink).join('')}</ul></div>`;
}

function statePanel(s) {
  const outgoing = M.edges.filter(e => e.from === s.id);
  const incoming = M.edges.filter(e => e.to === s.id && e.from !== s.id);
  return `<h2>${tr('h_state')}</h2>
      <p class="big">${nameHtml(s.name)}</p>
      <label class="field" for="insp-name"><span>${tr('f_name')}</span><input type="text" id="insp-name" value="${esc(s.name)}" maxlength="6" autocomplete="off" spellcheck="false"></label>
      <p class="err" id="insp-err"></p>
      <label class="check" for="insp-initial"><input type="checkbox" id="insp-initial" ${s.initial ? 'checked' : ''}> ${tr('chk_initial')}</label>
      <label class="check" for="insp-final"><input type="checkbox" id="insp-final" ${s.final ? 'checked' : ''}> ${tr('chk_final')}</label>
      ${transitionList('outs', outgoing)}
      ${transitionList('ins', incoming)}
      <button class="btn danger" type="button" data-act="delete">${tr('del_state')}</button>`;
}

function ruleTableHead(multi) {
  return `<div class="rule head">${multi ? `<span>${tr('col_tape')}</span>` : ''}<span>${tr('col_read')}</span><span>${tr('col_write')}</span><span>${tr('col_move')}</span><span></span></div>`;
}

function edgePanel(e) {
  const multi = M.k > 1, canDelete = e.rules.length > 1;
  const rules = e.rules.map((r, i) => ruleRows(r, i, canDelete)).join('');
  const conflict = M.nd && fnConflict(e) ? `<p class="err">${tr('fn_conflict')}</p>` : '';
  return `<h2>${tr('h_edge')}</h2>
    <p class="big">${nameHtml(S(e.from).name)} → ${nameHtml(S(e.to).name)}</p>
    <div class="rules${multi ? ' multi' : ''}">
      ${ruleTableHead(multi)}
      ${rules}
    </div>
    ${conflict}
    <button class="btn" type="button" data-act="add-rule">${tr('add_rule')}</button>
    <p class="note">${tr('edge_note', multi, esc(M.blank))}</p>
    <button class="btn danger" type="button" data-act="delete">${tr('del_edge')}</button>`;
}

function currentPanel() {
  if (hasGroup()) return groupPanel();
  if (!sel) return M.nd && nrun ? ndPanelHtml() : helpPanel();
  return sel.kind === 'state' ? statePanel(S(sel.id)) : edgePanel(E(sel.id));
}

function renderInspector() {
  if (sel && !(sel.kind === 'state' ? S(sel.id) : E(sel.id))) sel = null;
  insp.innerHTML = currentPanel();
}

'use strict';

/* ---------- side panel ---------- */
function ruleRows(r, i) {
  const k = M.k, multi = k > 1;
  const canDel = M.edges.find(x => x.id === sel.id).rules.length > 1;
  let rows = '';
  for (let t = 0; t < k; t++) {
    const ro = M.tapes[t].ro, bad = c => (c && !inG(c) ? ' bad' : '');
    rows += `<div class="rule" data-ri="${i}" data-t="${t}">
      ${multi ? `<span class="tl">F${t + 1}</span>` : ''}
      <input class="sym${bad(r.r[t])}" id="rr-${i}-${t}" data-f="r" value="${esc(r.r[t])}" placeholder="?" maxlength="1" aria-label="${esc(tr('ariaRead', multi, t, i))}" autocomplete="off" spellcheck="false">
      <input class="sym${ro ? '' : bad(r.w[t])}" id="rw-${i}-${t}" data-f="w" value="${esc(ro ? r.r[t] : r.w[t])}" placeholder="?" maxlength="1" ${ro ? `disabled title="${esc(tr('ro_title'))}"` : ''} aria-label="${esc(tr('ariaWrite', multi, t, i))}" autocomplete="off" spellcheck="false">
      <select id="rd-${i}-${t}" data-f="d" aria-label="${esc(tr('ariaMove', multi, t, i))}">${['L', 'R', 'S'].map(v => `<option value="${v}"${r.d[t] === v ? ' selected' : ''}>${tr('mv_' + v)}</option>`).join('')}</select>
      ${t === 0 ? `<button class="icon" type="button" data-del-rule="${i}" aria-label="${esc(tr('ariaDelRule', i))}" ${canDel ? '' : 'disabled'}>×</button>` : '<span></span>'}
    </div>`;
  }
  const fsel = M.nd ? `<div class="fline"><label for="rf-${i}">${tr('fn_label')}</label><select id="rf-${i}" data-f="f" aria-label="${esc(tr('ariaFn', i))}"><option value="0"${r.f ? '' : ' selected'}>δ0</option><option value="1"${r.f ? ' selected' : ''}>δ1</option></select></div>` : '';
  return multi || M.nd ? `<div class="rcard">${fsel}${rows}</div>` : rows;
}
function renderInspector() {
  if (sel && !(sel.kind === 'state' ? S(sel.id) : E(sel.id))) sel = null;
  if (hasGroup()) {
    insp.innerHTML = `<h2>${tr('h_group')}</h2><p class="big">${tr('group_counts', group.s.size, group.e.size)}</p><p class="note">${tr('group_note')}</p><button class="btn danger" type="button" data-act="delete">${tr('del_group')}</button>`;
    return;
  }
  if (!sel && M.nd && nrun) { insp.innerHTML = ndPanelHtml(); return; }
  if (!sel) {
    const rows = tr('shortcuts').map(([k, a]) => `<tr><td>${esc(k)}</td><td>${esc(a)}</td></tr>`).join('');
    insp.innerHTML = `<h2>${tr('how_title')}</h2><ol class="help">${tr('help').map(h => `<li>${h}</li>`).join('')}</ol><h2>${tr('shortcuts_title')}</h2><table class="keys">${rows}</table><p class="note">${tr('saved_note')}</p>`;
    return;
  }
  if (sel.kind === 'state') {
    const s = S(sel.id);
    const outs = M.edges.filter(e => e.from === s.id), ins = M.edges.filter(e => e.to === s.id && e.from !== s.id);
    const li = e => `<li><button type="button" class="link" data-go="${e.id}">${nameHtml(S(e.from).name)} → ${nameHtml(S(e.to).name)} <span>${esc(e.rules.map(ruleText).join(' '))}</span></button></li>`;
    insp.innerHTML = `<h2>${tr('h_state')}</h2>
      <p class="big">${nameHtml(s.name)}</p>
      <label class="field" for="insp-name"><span>${tr('f_name')}</span><input type="text" id="insp-name" value="${esc(s.name)}" maxlength="6" autocomplete="off" spellcheck="false"></label>
      <p class="err" id="insp-err"></p>
      <label class="check" for="insp-initial"><input type="checkbox" id="insp-initial" ${s.initial ? 'checked' : ''}> ${tr('chk_initial')}</label>
      <label class="check" for="insp-final"><input type="checkbox" id="insp-final" ${s.final ? 'checked' : ''}> ${tr('chk_final')}</label>
      ${outs.length ? `<div class="field"><span>${tr('outs')}</span><ul class="list">${outs.map(li).join('')}</ul></div>` : ''}
      ${ins.length ? `<div class="field"><span>${tr('ins')}</span><ul class="list">${ins.map(li).join('')}</ul></div>` : ''}
      <button class="btn danger" type="button" data-act="delete">${tr('del_state')}</button>`;
    return;
  }
  const e = E(sel.id), a = S(e.from), b = S(e.to), multi = M.k > 1;
  insp.innerHTML = `<h2>${tr('h_edge')}</h2>
    <p class="big">${nameHtml(a.name)} → ${nameHtml(b.name)}</p>
    <div class="rules${multi ? ' multi' : ''}">
      <div class="rule head">${multi ? `<span>${tr('col_tape')}</span>` : ''}<span>${tr('col_read')}</span><span>${tr('col_write')}</span><span>${tr('col_move')}</span><span></span></div>
      ${e.rules.map(ruleRows).join('')}
    </div>
    ${M.nd && fnConflict(e) ? `<p class="err">${tr('fn_conflict')}</p>` : ''}
    <button class="btn" type="button" data-act="add-rule">${tr('add_rule')}</button>
    <p class="note">${tr('edge_note', multi, esc(M.blank))}</p>
    <button class="btn danger" type="button" data-act="delete">${tr('del_edge')}</button>`;
}

insp.addEventListener('input', ev => {
  const t = ev.target;
  if (!sel) return;
  if (t.id === 'insp-name') {
    const s = S(sel.id), v = t.value.trim(), err = $('#insp-err');
    if (!v) { err.textContent = tr('err_name_empty'); return; }
    if (M.states.some(x => x !== s && x.name === v)) { err.textContent = tr('err_name_dup'); return; }
    err.textContent = '';
    checkpoint('name:' + s.id); s.name = v;
    insp.querySelector('.big').innerHTML = nameHtml(v);
    renderCanvas(); renderTapes(); renderStatus(); save();
  } else if (t.dataset.f === 'r' || t.dataset.f === 'w') {
    const row = t.closest('.rule'), ri = +row.dataset.ri, ti = +row.dataset.t, fld = t.dataset.f, e = E(sel.id);
    checkpoint('rule:' + e.id + ':' + ri + ':' + ti + fld);
    t.value = t.value.replace(/\s/g, '');
    if (t.value && !inG(t.value)) { toast(tr('notInGamma', t.value)); t.value = ''; }
    t.classList.toggle('bad', !!t.value && !inG(t.value));
    e.rules[ri][fld][ti] = t.value;
    if (fld === 'r' && M.tapes[ti].ro) {
      e.rules[ri].w[ti] = t.value;
      const wi = $(`#rw-${ri}-${ti}`); if (wi) wi.value = t.value;
    }
    renderCanvas(); save();
    if (fld === 'r' && t.value) {
      const n = $(`#rw-${ri}-${ti}`), nx = $(`#rr-${ri}-${ti + 1}`);
      const target = n && !n.disabled ? n : nx;
      if (target) { target.focus(); target.select(); }
    }
  }
});
insp.addEventListener('change', ev => {
  const t = ev.target;
  if (!sel) return;
  if (t.id === 'insp-initial' || t.id === 'insp-final') {
    const s = S(sel.id); checkpoint();
    if (t.id === 'insp-initial') { M.states.forEach(x => { x.initial = false; }); s.initial = t.checked; }
    else s.final = t.checked;
    renderCanvas(); renderTapes(); renderStatus(); save();
  } else if (t.dataset.f === 'f') {
    const e = E(sel.id);
    checkpoint(); e.rules[+t.id.slice(3)].f = +t.value;
    renderCanvas(); renderInspector(); save();
  } else if (t.dataset.f === 'd') {
    const row = t.closest('.rule'), e = E(sel.id);
    checkpoint(); e.rules[+row.dataset.ri].d[+row.dataset.t] = t.value; renderCanvas(); save();
  }
});
insp.addEventListener('click', ev => {
  const b = ev.target.closest('button'); if (!b) return;
  if (b.dataset.node !== undefined) return selectNode(+b.dataset.node);
  if (b.dataset.go) { sel = { kind: 'edge', id: b.dataset.go }; renderInspector(); renderCanvas(); return; }
  if (b.dataset.act === 'delete') return deleteSel();
  if (b.dataset.act === 'add-rule') {
    const e = E(sel.id); checkpoint(); e.rules.push(newRule());
    renderInspector(); renderCanvas(); save();
    const el = $(`#rr-${e.rules.length - 1}-0`); if (el) el.focus();
  } else if (b.dataset.delRule !== undefined) {
    const e = E(sel.id); if (e.rules.length < 2) return;
    checkpoint(); e.rules.splice(+b.dataset.delRule, 1);
    if (run && run.last && run.last.e === e.id) run.last = null;
    renderInspector(); renderCanvas(); save();
  }
});

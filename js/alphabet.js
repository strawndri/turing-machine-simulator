'use strict';

/* ---------- alphabet Γ ---------- */
function renderGamma() {
  $('#g-chips').innerHTML = M.gamma.map(c => c === M.blank
    ? `<span class="gchip blank" title="${esc(tr('gamma_blank_title'))}">${esc(c)}</span>`
    : `<span class="gchip">${esc(c)}<button type="button" data-rm="${esc(c)}" aria-label="${esc(tr('gamma_rm', c))}">×</button></span>`).join('');
}
function addGamma() {
  const inp = $('#g-add');
  const add = [...new Set(Array.from(inp.value).filter(c => c.trim() && !M.gamma.includes(c)))];
  inp.value = '';
  if (!add.length) return;
  checkpoint(); M.gamma.push(...add);
  renderGamma(); renderTapes(); renderInspector(); save();
}
$('#g-btn').addEventListener('click', addGamma);
$('#g-add').addEventListener('keydown', ev => { if (ev.key === 'Enter') addGamma(); });
$('#g-fill').addEventListener('click', () => {
  const miss = usedSymbols(M).filter(c => !M.gamma.includes(c));
  if (!miss.length) { toast(tr('gammaAllIn')); return; }
  checkpoint(); M.gamma.push(...miss);
  renderGamma(); renderTapes(); renderInspector(); save();
});
$('#g-chips').addEventListener('click', ev => {
  const b = ev.target.closest('button[data-rm]'); if (!b) return;
  checkpoint(); M.gamma = M.gamma.filter(c => c !== b.dataset.rm);
  renderGamma(); renderTapes(); renderInspector(); renderStatus(); save();
});

'use strict';

/* The tape alphabet Γ: the list of symbols, adding and removing them. The blank symbol is always in Γ. */

function gammaChip(symbol) {
  if (symbol === M.blank) return `<span class="gchip blank" title="${esc(tr('gamma_blank_title'))}">${esc(symbol)}</span>`;
  return `<span class="gchip">${esc(symbol)}<button type="button" data-rm="${esc(symbol)}" aria-label="${esc(tr('gamma_rm', symbol))}">×</button></span>`;
}

function renderGamma() {
  $('#g-chips').innerHTML = M.gamma.map(gammaChip).join('');
}

/* adds symbols to Γ and redraws what depends on it */
function addToGamma(symbols) {
  checkpoint();
  M.gamma.push(...symbols);
  renderGamma(); renderTapes(); renderInspector(); save();
}

/* every character typed in the box that is not in Γ yet (several can be added at once) */
function addTypedSymbols() {
  const input = $('#g-add');
  const symbols = [...new Set(Array.from(input.value).filter(c => c.trim() && !M.gamma.includes(c)))];
  input.value = '';
  if (symbols.length) addToGamma(symbols);
}

/* every symbol used by a rule or a tape that is missing from Γ */
function addUsedSymbols() {
  const missing = usedSymbols(M).filter(c => !M.gamma.includes(c));
  if (missing.length) addToGamma(missing); else toast(tr('gammaAllIn'));
}

function removeFromGamma(symbol) {
  checkpoint();
  M.gamma = M.gamma.filter(c => c !== symbol);
  renderGamma(); renderTapes(); renderInspector(); renderStatus(); save();
}

$('#g-btn').addEventListener('click', addTypedSymbols);
$('#g-add').addEventListener('keydown', ev => { if (ev.key === 'Enter') addTypedSymbols(); });
$('#g-fill').addEventListener('click', addUsedSymbols);
$('#g-chips').addEventListener('click', ev => {
  const button = ev.target.closest('button[data-rm]');
  if (button) removeFromGamma(button.dataset.rm);
});

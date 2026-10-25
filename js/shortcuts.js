'use strict';

/* Keyboard shortcuts. They are ignored while you type in a field. */

const TOOL_KEYS = { v: 'select', e: 'state', t: 'edge', h: 'pan' };

const isTypingTarget = ev => ['input', 'textarea', 'select'].includes((ev.target.tagName || '').toLowerCase());

/* Ctrl+Z, Ctrl+Shift+Z and Ctrl+Y; true when the key was one of them */
function handleHistoryKey(ev) {
  const key = ev.key.toLowerCase();
  if (key === 'z') { ev.shiftKey ? redo() : undo(); return true; }
  if (key === 'y') { redo(); return true; }
  return false;
}

/* Esc leaves the current tool; with nothing to leave, it clears the selection */
function handleEscape() {
  if (tool !== 'select' || pending) return setTool('select');
  if (sel || hasGroup()) { sel = null; clearGroup(); renderInspector(); renderCanvas(); }
}

document.addEventListener('keydown', ev => {
  if (isTypingTarget(ev)) return;
  if (ev.ctrlKey || ev.metaKey) {
    if (handleHistoryKey(ev)) ev.preventDefault();
    return;
  }
  if (ev.altKey) return;
  const key = ev.key.toLowerCase();
  if (ev.key === 'Delete' || ev.key === 'Backspace') {
    if (sel || hasGroup()) { ev.preventDefault(); deleteSel(); }
  } else if (ev.key === 'Escape') handleEscape();
  else if (TOOL_KEYS[key]) setTool(TOOL_KEYS[key]);
});

/* holding Shift shows the grab cursor: Shift + drag moves the view */
const setShiftCursor = on => board.classList.toggle('shift-pan', on);
document.addEventListener('keydown', ev => { if (ev.key === 'Shift') setShiftCursor(true); });
document.addEventListener('keyup', ev => { if (ev.key === 'Shift') setShiftCursor(false); });
window.addEventListener('blur', () => setShiftCursor(false));

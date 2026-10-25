'use strict';

/* Undo, redo and saving the machine in the browser. */

const snap = () => JSON.stringify(M);

/* Remembers the machine before a change. Calls with the same key within 1.2 s count as one change (typing). */
function checkpoint(key) {
  const now = Date.now();
  if (key && key === lastKey && now - lastT < 1200) { lastT = now; return; }
  lastKey = key || null;
  lastT = now;
  undoStack.push(snap());
  if (undoStack.length > 80) undoStack.shift();
  redoStack = [];
  renderToolbar();
}

/* puts a remembered machine back and draws everything again */
function restore(json) {
  M = JSON.parse(json);
  clearGroup();
  clearRun();
  notice = ''; pending = null; lastKey = null; forceBuild = true;
  if (sel && !(sel.kind === 'state' ? S(sel.id) : E(sel.id))) sel = null;
  renderAll(); save();
}

function undo() {
  if (!undoStack.length) return;
  redoStack.push(snap());
  restore(undoStack.pop());
}

function redo() {
  if (!redoStack.length) return;
  undoStack.push(snap());
  restore(redoStack.pop());
}

/* the browser may refuse storage (private windows), so both functions fail quietly */
function save() {
  try { localStorage.setItem(KEY, snap()); } catch (_) {}
}

function loadSaved() {
  try {
    const text = localStorage.getItem(KEY);
    if (text) return parseMachine(JSON.parse(text));
  } catch (_) {}
  return null;
}

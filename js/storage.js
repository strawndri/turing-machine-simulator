'use strict';

/* ---------- history and persistence ---------- */
const snap = () => JSON.stringify(M);
function checkpoint(key) {
  const now = Date.now();
  if (key && key === lastKey && now - lastT < 1200) { lastT = now; return; }
  lastKey = key || null; lastT = now;
  undoStack.push(snap());
  if (undoStack.length > 80) undoStack.shift();
  redoStack = [];
  renderToolbar();
}
function restore(json) {
  M = JSON.parse(json);
  clearGroup();
  clearRun(); notice = ''; pending = null; lastKey = null; forceBuild = true;
  if (sel && !(sel.kind === 'state' ? S(sel.id) : E(sel.id))) sel = null;
  renderAll(); save();
}
function undo() { if (!undoStack.length) return; redoStack.push(snap()); restore(undoStack.pop()); }
function redo() { if (!redoStack.length) return; undoStack.push(snap()); restore(redoStack.pop()); }
function save() { try { localStorage.setItem(KEY, snap()); } catch (_) {} }
function loadSaved() {
  try { const t = localStorage.getItem(KEY); if (t) return parseMachine(JSON.parse(t)); } catch (_) {}
  return null;
}

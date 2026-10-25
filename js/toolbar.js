'use strict';

/* The toolbar over the diagram: tools, history, zoom, view switch and PNG export buttons. */

function setTool(t) {
  tool = t; pending = null; ghost = null; hover = null;
  renderToolbar();
  renderCanvas();
}

const pressed = (selector, isOn) => document.querySelectorAll(selector).forEach(b => b.setAttribute('aria-pressed', String(isOn(b))));

function renderToolbar() {
  pressed('#toolbar [data-tool]', b => b.dataset.tool === tool);
  document.querySelector('#toolbar [data-act="undo"]').disabled = !undoStack.length;
  document.querySelector('#toolbar [data-act="redo"]').disabled = !redoStack.length;
  board.classList.toggle('nd', !!M.nd);
  board.dataset.view = M.nd ? ndView : 'diagram';
  pressed('#toolbar [data-view]', b => b.dataset.view === board.dataset.view);
  $('#nd').checked = !!M.nd;
}

/* undo, redo and zoom act on the diagram, or on the computation tree when it is on screen */
function handleToolbarAction(action) {
  const onTree = board.dataset.view === 'tree';
  if (action === 'undo') undo();
  else if (action === 'redo') redo();
  else if (action === 'fit') { if (onTree) { treeAuto = true; treeFit(); } else fit(); }
  else if (action === 'zoomin') { if (onTree) treeZoom(1.2); else zoomAt(1.2); }
  else if (action === 'zoomout') { if (onTree) treeZoom(1 / 1.2); else zoomAt(1 / 1.2); }
}

$('#toolbar').addEventListener('click', ev => {
  const button = ev.target.closest('button');
  if (!button) return;
  if (button.dataset.tool) return setTool(button.dataset.tool);
  if (button.dataset.view) return setView(button.dataset.view);
  handleToolbarAction(button.dataset.act);
});

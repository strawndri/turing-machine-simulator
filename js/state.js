'use strict';

/* The page elements and the values that change while the app runs.
   They are plain globals on purpose: every file reads them, and the files that change them say so. */

/* ---------- page elements ---------- */
const svg = $('#svg'), vp = $('#vp'), board = $('#board'), insp = $('#inspector');
const tapesEl = $('#tapes'), panel = $('#tape-panel');

/* ---------- the machine ---------- */
let M;                                   // the machine being edited (see model.js)

/* ---------- selection and tools ---------- */
let sel = null;                          // the selected item: { kind: 'state' | 'edge', id } or null
let group = { s: new Set(), e: new Set() };   // a rectangle selection: ids of states and edges
const hasGroup = () => group.s.size + group.e.size > 0;
const clearGroup = () => { group = { s: new Set(), e: new Set() }; };
let tool = 'select';                     // 'select', 'state', 'edge' or 'pan'
let pending = null, hover = null, ghost = null;   // a transition being created: its first state, the state under the mouse, the mouse point

/* ---------- diagram view and mouse ---------- */
let view = { x: 0, y: 0, k: 1 };         // pan (x, y) and zoom (k) of the diagram
let drag = null;                         // what the mouse is doing right now (see pointer.js)
let ignoreUp = false;                    // skip the next pointer release
let fitted = false;                      // true after the first automatic fit

/* ---------- running ---------- */
let run = null;                          // the running copy of the machine (see run.js)
let playing = false, timer = 0, speed = 4;
let notice = '';                         // a message shown when there is no run

/* ---------- non-deterministic runs ---------- */
let nrun = null;                         // the computation tree: { nodes, level, capped } (see branches.js)
let selNode = null;                      // the branch shown on the tapes and in the diagram
let ndView = 'diagram';                  // 'diagram' or 'tree'
let tview = { x: 0, y: 0, k: 1 };        // pan and zoom of the tree
let treeAuto = true;                     // keep the tree fitted until the user moves it

/* ---------- tapes ---------- */
let blocks = [];                         // the DOM of each tape
let builtK = 0, forceBuild = true;       // the number of tapes drawn, and a request to draw them again
let cursor = [], pads = [], ranges = []; // per tape: the selected cell, extra cells added by the user, the cells drawn

/* ---------- history ---------- */
let undoStack = [], redoStack = [], lastKey = null, lastT = 0;

'use strict';

const svg = $('#svg'), vp = $('#vp'), board = $('#board'), insp = $('#inspector');
const tapesEl = $('#tapes'), panel = $('#tape-panel');

/* ---------- model ---------- */
let M, sel = null, tool = 'select', pending = null, hover = null, ghost = null;
let group = { s: new Set(), e: new Set() };
const hasGroup = () => group.s.size + group.e.size > 0;
const clearGroup = () => { group = { s: new Set(), e: new Set() }; };
let view = { x: 0, y: 0, k: 1 }, drag = null, ignoreUp = false, fitted = false;
let run = null, playing = false, timer = 0, speed = 4, notice = '';
let nrun = null, selNode = null, ndView = 'diagram', tview = { x: 0, y: 0, k: 1 }, treeAuto = true;
let blocks = [], builtK = 0, forceBuild = true, cursor = [], pads = [], ranges = [];
let undoStack = [], redoStack = [], lastKey = null, lastT = 0;

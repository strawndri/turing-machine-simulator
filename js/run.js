'use strict';

/* Running a deterministic machine, one step at a time. `run` is the running copy: its own tapes, the current
   state, the step count, a status ('ready', 'accepted', 'rejected' or 'limit') and the last rule used. */

const MOVE = { L: -1, R: 1, S: 0 };

const halted = () => (M.nd && nrun ? ndDone() : run && ['accepted', 'rejected', 'limit'].includes(run.status));

function startRun() {
  run = {
    tapes: copyTapes(M.tapes),
    state: initialState().id, steps: 0, status: 'ready', last: null, lastWrite: null, msg: ''
  };
}

const readSymbols = tapes => tapes.map(t => symAt(t.cells, t.head));

/* a rule fits when every tape shows the symbol it reads, and every symbol it uses is in Γ */
function ruleFits(rule, symbols) {
  return symbols.every((symbol, i) => {
    const readsIt = rule.r[i] && inG(rule.r[i]) && rule.r[i] === symbol;
    return readsIt && (M.tapes[i].ro || (rule.w[i] && inG(rule.w[i])));
  });
}

/* every [edge, rule index] that leaves the state and fits what the tapes show */
function matchingRules(state, symbols) {
  const matches = [];
  for (const e of M.edges) {
    if (e.from !== state.id) continue;
    e.rules.forEach((rule, i) => { if (ruleFits(rule, symbols)) matches.push([e, i]); });
  }
  return matches;
}

/* writes a symbol under the head (the blank removes the cell) and returns where it was written */
function writeUnderHead(tape, symbol) {
  if (symbol === M.blank) delete tape.cells[tape.head]; else tape.cells[tape.head] = symbol;
  return tape.head;
}

/* tape i writes (unless it is read only) and moves its head; returns where it wrote, or null */
function stepTape(tape, rule, i) {
  const wrote = M.tapes[i].ro ? null : writeUnderHead(tape, rule.w[i]);
  tape.head += MOVE[rule.d[i]];
  return wrote;
}

function applyRule(rule) {
  run.lastWrite = run.tapes.map((tape, i) => stepTape(tape, rule, i));
}

/* δ(q0, a) = (q1, X, R) */
function stepMessage(from, symbols, edge, rule) {
  const written = rule.w.map((c, i) => (M.tapes[i].ro ? rule.r[i] : c));
  return `δ(${from.name}, ${symbols.join(', ')}) = (${S(edge.to).name}, ${written.join(', ')}, ${rule.d.join(', ')})`;
}

/* ends the run with a status and a message; false means "nothing more to do" */
function finish(status, message) {
  run.status = status;
  run.msg = message;
  return false;
}

/* One step. Returns true while the machine can go on.
   The machine accepts on reaching a final state, and rejects when no rule fits. */
function stepOnce() {
  if (!run) {
    if (!initialState()) { notice = tr('noInitial'); renderStatus(); return false; }
    startRun();
  }
  if (halted()) return false;
  const state = S(run.state), symbols = readSymbols(run.tapes);
  if (state.final) return finish('accepted', tr('atFinal', state.name));
  const matches = matchingRules(state, symbols);
  if (!matches.length) { run.last = null; return finish('rejected', tr('noRule', state.name, symbols.join(', '))); }

  const [edge, index] = matches[0], rule = edge.rules[index];
  applyRule(rule);
  run.state = edge.to; run.steps++; run.last = { e: edge.id, r: index };
  run.msg = stepMessage(state, symbols, edge, rule) + (matches.length > 1 ? tr('warnMulti', matches.length) : '');
  if (S(edge.to).final) { run.msg += tr('reachedFinal', S(edge.to).name); run.status = 'accepted'; return false; }
  if (run.steps >= LIMIT) return finish('limit', tr('limitMsg', LIMIT));
  return true;
}

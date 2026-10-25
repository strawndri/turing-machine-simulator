'use strict';

/* Ready-made machines for the Examples menu. Each one is built by its own small function. */

/* A tiny helper to describe a machine without repeating ids and rule objects.
   A rule is [read, write, move] or [read, write, move, 1] when it belongs to δ1.
   On several tapes, read, write and move are arrays with one value per tape. */
function machineBuilder() {
  const m = blankMachine();
  const state = (name, x, y, opts = {}) => {
    const s = { id: 's' + m.seq++, name, x, y, initial: !!opts.initial, final: !!opts.final };
    m.states.push(s);
    return s.id;
  };
  const toRule = ([r, w, d, f]) => ({ r: [].concat(r), w: [].concat(w), d: [].concat(d), f: f === 1 ? 1 : 0 });
  const edge = (from, to, rules, opts = {}) => {
    m.edges.push({ id: 'e' + m.seq++, from, to, bend: opts.bend || 0, angle: opts.angle ?? -90, rules: rules.map(toRule) });
  };
  return { m, state, edge };
}

/* [['Y','Y','R'], ['a','a','R']] from ['Y', 'a'] and 'R': symbols that are read and written back unchanged */
const keep = (symbols, move) => symbols.map(s => [s, s, move]);

function exampleAbc() {
  const { m, state, edge } = machineBuilder();
  const q0 = state('q0', 130, 180, { initial: true }), q1 = state('q1', 340, 180);
  const qN = state('qN', 550, 180), q2 = state('q2', 780, 180);
  const q3 = state('q3', 130, 370), qM = state('qM', 340, 370), q4 = state('q4', 550, 370, { final: true });
  edge(q0, q1, [['a', 'X', 'R']]);
  edge(q1, q1, keep(['Y', 'a'], 'R'));
  edge(q1, qN, [['b', 'Y', 'R']]);
  edge(qN, qN, keep(['Z', 'b'], 'R'));
  edge(qN, q2, [['c', 'Z', 'L']]);
  edge(q2, q2, keep(['Z', 'b', 'Y', 'a'], 'L'));
  edge(q2, q0, [['X', 'X', 'R']], { bend: 110 });
  edge(q0, q3, [['Y', 'Y', 'R']]);
  edge(q3, q3, keep(['Y'], 'R'), { angle: 90 });
  edge(q3, qM, [['Z', 'Z', 'R']]);
  edge(qM, qM, keep(['Z'], 'R'), { angle: 90 });
  edge(qM, q4, [['B', 'B', 'R']]);
  setTape(m, 'aabbcc');
  m.gamma = ['a', 'b', 'c', 'X', 'Y', 'Z', 'B'];
  return m;
}

function exampleIncrement() {
  const { m, state, edge } = machineBuilder();
  const q0 = state('q0', 160, 200, { initial: true }), q1 = state('q1', 430, 200), q2 = state('q2', 700, 200, { final: true });
  edge(q0, q0, keep(['0', '1'], 'R'));
  edge(q0, q1, [['B', 'B', 'L']]);
  edge(q1, q1, [['1', '0', 'L']]);
  edge(q1, q2, [['0', '1', 'S'], ['B', '1', 'S']]);
  setTape(m, '1011');
  m.gamma = ['0', '1', 'B'];
  return m;
}

function exampleCopy() {
  const { m, state, edge } = machineBuilder();
  const q0 = state('q0', 120, 230, { initial: true }), q1 = state('q1', 360, 70), q2 = state('q2', 600, 150);
  const q3 = state('q3', 360, 390), q4 = state('q4', 600, 310);
  const q5 = state('q5', 120, 540), q6 = state('q6', 400, 540), q7 = state('q7', 660, 540, { final: true });
  const all = ['0', '1', 'D', 'E'];
  edge(q0, q1, [['0', 'A', 'R']]);
  edge(q1, q1, keep(all, 'R'));
  edge(q1, q2, [['B', 'D', 'L']]);
  edge(q2, q2, keep(all, 'L'), { angle: 0 });
  edge(q2, q0, keep(['A', 'C'], 'R'));
  edge(q0, q3, [['1', 'C', 'R']]);
  edge(q3, q3, keep(all, 'R'), { angle: 90 });
  edge(q3, q4, [['B', 'E', 'L']]);
  edge(q4, q4, keep(all, 'L'), { angle: 0 });
  edge(q4, q0, keep(['A', 'C'], 'R'));
  edge(q0, q5, keep(['D', 'E', 'B'], 'S'));
  edge(q5, q5, keep(['D', 'E'], 'R'), { angle: 90 });
  edge(q5, q6, [['B', 'B', 'L']]);
  edge(q6, q6, [['D', '0', 'L'], ['E', '1', 'L'], ['A', '0', 'L'], ['C', '1', 'L']], { angle: 90 });
  edge(q6, q7, [['B', 'B', 'R']]);
  setTape(m, '0110');
  m.gamma = ['0', '1', 'A', 'C', 'D', 'E', 'B'];
  return m;
}

/* tape 1 is read only and is copied to tape 2 */
function exampleCopyTwoTapes() {
  const { m, state, edge } = machineBuilder();
  const q0 = state('q0', 220, 190, { initial: true }), q1 = state('q1', 560, 190, { final: true });
  edge(q0, q0, [[['0', 'B'], ['0', '0'], ['R', 'R']], [['1', 'B'], ['1', '1'], ['R', 'R']]]);
  edge(q0, q1, [[['B', 'B'], ['B', 'B'], ['S', 'S']]]);
  m.k = 2;
  m.tapes = [newTape(), newTape()];
  m.tapes[0].ro = true;
  setTape(m, '0110', 0);
  m.gamma = ['0', '1', 'B'];
  return m;
}

/* adds two binary numbers written as a#b on tape 1, and leaves the sum on tape 2 */
function exampleAddition() {
  const { m, state, edge } = machineBuilder();
  const q0 = state('q0', 100, 160, { initial: true }), q1 = state('q1', 360, 160), q2 = state('q2', 620, 160);
  const q3 = state('q3', 420, 400), q4 = state('q4', 800, 400), qf = state('qf', 610, 570, { final: true });
  const bits = ['0', '1'];
  const rule = (read, write, move) => [read, write, move];
  edge(q0, q0, bits.map(a => rule([a, 'B'], [a, 'B'], ['R', 'S'])));
  edge(q0, q1, [rule(['#', 'B'], ['#', 'B'], ['R', 'S'])]);
  edge(q1, q1, bits.map(a => rule([a, 'B'], [a, a], ['R', 'R'])));
  edge(q1, q2, [rule(['B', 'B'], ['B', 'B'], ['L', 'L'])]);
  edge(q2, q2, bits.flatMap(a => bits.map(b => rule([a, b], [a, b], ['L', 'S']))));
  edge(q2, q3, bits.map(b => rule(['#', b], ['#', b], ['L', 'S'])));
  edge(q3, q3, [rule(['0', '0'], ['0', '0'], ['L', 'L']), rule(['0', '1'], ['0', '1'], ['L', 'L']), rule(['1', '0'], ['1', '1'], ['L', 'L'])], { angle: 180 });
  edge(q3, q4, [rule(['1', '1'], ['1', '0'], ['L', 'L'])], { bend: 40 });
  edge(q4, q3, [rule(['0', '0'], ['0', '1'], ['L', 'L'])], { bend: 40 });
  edge(q4, q4, [rule(['0', '1'], ['0', '0'], ['L', 'L']), rule(['1', '0'], ['1', '0'], ['L', 'L']), rule(['1', '1'], ['1', '1'], ['L', 'L'])], { angle: 0 });
  edge(q3, qf, [rule(['B', 'B'], ['B', 'B'], ['S', 'R'])]);
  edge(q4, qf, [rule(['B', 'B'], ['B', '1'], ['S', 'S'])]);
  m.k = 2;
  m.tapes = [newTape(), newTape()];
  setTape(m, '10#11', 0);
  m.gamma = ['0', '1', '#', 'B'];
  return m;
}

/* non-deterministic: it guesses (with δ1) where a "11" starts */
function exampleContains11() {
  const { m, state, edge } = machineBuilder();
  const q0 = state('q0', 160, 200, { initial: true }), q1 = state('q1', 430, 200), q2 = state('q2', 700, 200, { final: true });
  edge(q0, q0, keep(['0', '1'], 'R'));
  edge(q0, q1, [['1', '1', 'R', 1]]);
  edge(q1, q2, [['1', '1', 'R']]);
  m.nd = true;
  setTape(m, '0110');
  m.gamma = ['0', '1', 'B'];
  return m;
}

const EXAMPLES = {
  abc: exampleAbc,
  inc: exampleIncrement,
  copy: exampleCopy,
  copy2: exampleCopyTwoTapes,
  soma: exampleAddition,
  nd: exampleContains11
};

/* the machine for a menu name; "vazio" (or anything unknown) gives an empty machine */
function buildExample(name) {
  return EXAMPLES[name] ? EXAMPLES[name]() : blankMachine();
}

'use strict';

function examples(name) {
  const m = blankMachine();
  const st = (nm, x, y, o = {}) => { const s = { id: 's' + m.seq++, name: nm, x, y, initial: !!o.initial, final: !!o.final }; m.states.push(s); return s.id; };
  const ed = (a, b, rules, o = {}) => m.edges.push({
    id: 'e' + m.seq++, from: a, to: b, bend: o.bend || 0, angle: o.angle ?? -90,
    rules: rules.map(([r, w, d, f]) => ({ r: [].concat(r), w: [].concat(w), d: [].concat(d), f: f === 1 ? 1 : 0 }))
  });
  if (name === 'abc') {
    const q0 = st('q0', 130, 180, { initial: true }), q1 = st('q1', 340, 180), qN = st('qN', 550, 180), q2 = st('q2', 780, 180);
    const q3 = st('q3', 130, 370), qM = st('qM', 340, 370), q4 = st('q4', 550, 370, { final: true });
    ed(q0, q1, [['a', 'X', 'R']]);
    ed(q1, q1, [['Y', 'Y', 'R'], ['a', 'a', 'R']]);
    ed(q1, qN, [['b', 'Y', 'R']]);
    ed(qN, qN, [['Z', 'Z', 'R'], ['b', 'b', 'R']]);
    ed(qN, q2, [['c', 'Z', 'L']]);
    ed(q2, q2, [['Z', 'Z', 'L'], ['b', 'b', 'L'], ['Y', 'Y', 'L'], ['a', 'a', 'L']]);
    ed(q2, q0, [['X', 'X', 'R']], { bend: 110 });
    ed(q0, q3, [['Y', 'Y', 'R']]);
    ed(q3, q3, [['Y', 'Y', 'R']], { angle: 90 });
    ed(q3, qM, [['Z', 'Z', 'R']]);
    ed(qM, qM, [['Z', 'Z', 'R']], { angle: 90 });
    ed(qM, q4, [['B', 'B', 'R']]);
    setTape(m, 'aabbcc');
    m.gamma = ['a', 'b', 'c', 'X', 'Y', 'Z', 'B'];
  } else if (name === 'inc') {
    const q0 = st('q0', 160, 200, { initial: true }), q1 = st('q1', 430, 200), q2 = st('q2', 700, 200, { final: true });
    ed(q0, q0, [['0', '0', 'R'], ['1', '1', 'R']]);
    ed(q0, q1, [['B', 'B', 'L']]);
    ed(q1, q1, [['1', '0', 'L']]);
    ed(q1, q2, [['0', '1', 'S'], ['B', '1', 'S']]);
    setTape(m, '1011');
    m.gamma = ['0', '1', 'B'];
  } else if (name === 'copy') {
    const q0 = st('q0', 120, 230, { initial: true }), q1 = st('q1', 360, 70), q2 = st('q2', 600, 150);
    const q3 = st('q3', 360, 390), q4 = st('q4', 600, 310);
    const q5 = st('q5', 120, 540), q6 = st('q6', 400, 540), q7 = st('q7', 660, 540, { final: true });
    ed(q0, q1, [['0', 'A', 'R']]);
    ed(q1, q1, [['0', '0', 'R'], ['1', '1', 'R'], ['D', 'D', 'R'], ['E', 'E', 'R']]);
    ed(q1, q2, [['B', 'D', 'L']]);
    ed(q2, q2, [['0', '0', 'L'], ['1', '1', 'L'], ['D', 'D', 'L'], ['E', 'E', 'L']], { angle: 0 });
    ed(q2, q0, [['A', 'A', 'R'], ['C', 'C', 'R']]);
    ed(q0, q3, [['1', 'C', 'R']]);
    ed(q3, q3, [['0', '0', 'R'], ['1', '1', 'R'], ['D', 'D', 'R'], ['E', 'E', 'R']], { angle: 90 });
    ed(q3, q4, [['B', 'E', 'L']]);
    ed(q4, q4, [['0', '0', 'L'], ['1', '1', 'L'], ['D', 'D', 'L'], ['E', 'E', 'L']], { angle: 0 });
    ed(q4, q0, [['A', 'A', 'R'], ['C', 'C', 'R']]);
    ed(q0, q5, [['D', 'D', 'S'], ['E', 'E', 'S'], ['B', 'B', 'S']]);
    ed(q5, q5, [['D', 'D', 'R'], ['E', 'E', 'R']], { angle: 90 });
    ed(q5, q6, [['B', 'B', 'L']]);
    ed(q6, q6, [['D', '0', 'L'], ['E', '1', 'L'], ['A', '0', 'L'], ['C', '1', 'L']], { angle: 90 });
    ed(q6, q7, [['B', 'B', 'R']]);
    setTape(m, '0110');
    m.gamma = ['0', '1', 'A', 'C', 'D', 'E', 'B'];
  } else if (name === 'copy2') {
    const q0 = st('q0', 220, 190, { initial: true }), q1 = st('q1', 560, 190, { final: true });
    ed(q0, q0, [[['0', 'B'], ['0', '0'], ['R', 'R']], [['1', 'B'], ['1', '1'], ['R', 'R']]]);
    ed(q0, q1, [[['B', 'B'], ['B', 'B'], ['S', 'S']]]);
    m.k = 2; m.tapes = [newTape(), newTape()];
    m.tapes[0].ro = true;
    setTape(m, '0110', 0);
    m.gamma = ['0', '1', 'B'];
  } else if (name === 'soma') {
    const q0 = st('q0', 100, 160, { initial: true }), q1 = st('q1', 360, 160), q2 = st('q2', 620, 160);
    const q3 = st('q3', 420, 400), q4 = st('q4', 800, 400), qf = st('qf', 610, 570, { final: true });
    const bits = ['0', '1'];
    ed(q0, q0, bits.map(a => [[a, 'B'], [a, 'B'], ['R', 'S']]));
    ed(q0, q1, [[['#', 'B'], ['#', 'B'], ['R', 'S']]]);
    ed(q1, q1, bits.map(a => [[a, 'B'], [a, a], ['R', 'R']]));
    ed(q1, q2, [[['B', 'B'], ['B', 'B'], ['L', 'L']]]);
    ed(q2, q2, bits.flatMap(a => bits.map(b => [[a, b], [a, b], ['L', 'S']])));
    ed(q2, q3, bits.map(b => [['#', b], ['#', b], ['L', 'S']]));
    ed(q3, q3, [[['0', '0'], ['0', '0'], ['L', 'L']], [['0', '1'], ['0', '1'], ['L', 'L']], [['1', '0'], ['1', '1'], ['L', 'L']]], { angle: 180 });
    ed(q3, q4, [[['1', '1'], ['1', '0'], ['L', 'L']]], { bend: 40 });
    ed(q4, q3, [[['0', '0'], ['0', '1'], ['L', 'L']]], { bend: 40 });
    ed(q4, q4, [[['0', '1'], ['0', '0'], ['L', 'L']], [['1', '0'], ['1', '0'], ['L', 'L']], [['1', '1'], ['1', '1'], ['L', 'L']]], { angle: 0 });
    ed(q3, qf, [[['B', 'B'], ['B', 'B'], ['S', 'R']]]);
    ed(q4, qf, [[['B', 'B'], ['B', '1'], ['S', 'S']]]);
    m.k = 2; m.tapes = [newTape(), newTape()];
    setTape(m, '10#11', 0);
    m.gamma = ['0', '1', '#', 'B'];
  } else if (name === 'nd') {
    const q0 = st('q0', 160, 200, { initial: true }), q1 = st('q1', 430, 200), q2 = st('q2', 700, 200, { final: true });
    ed(q0, q0, [['0', '0', 'R'], ['1', '1', 'R']]);
    ed(q0, q1, [['1', '1', 'R', 1]]);
    ed(q1, q2, [['1', '1', 'R']]);
    m.nd = true;
    setTape(m, '0110');
    m.gamma = ['0', '1', 'B'];
  }
  return m;
}

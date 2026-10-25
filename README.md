# Turing Machine Simulator

[Português](README.pt-BR.md)

An interactive Turing machine simulator that runs in the browser.
Use it to learn a little more about the theory of computation :)

Live demo: https://strawndri.github.io/turing-machine-simulator/

## Features

- Draw the state diagram: add states, drag from one to another to create transitions, bend them and rotate loops; select several items with a rectangle to move or delete them at once;
- Rules in the `[read; write; move]` format, with `L` (left), `R` (right) and `S` (stay) moves;
- From 1 to 4 tapes, each one can be read only; rules become `[a, b; a, b; R, S]`;
- Define the tape alphabet Γ and the blank symbol;
- Non-deterministic machines with δ0 and δ1: step through the computation tree level by level, see every branch and its tape, and draw the tree, with the same pan and zoom as the diagram;
- Step by step or continuous run, with speed control; the current state and rule are highlighted;
- Undo and redo, save and load as JSON, save or copy the diagram and the computation tree as PNG, and ready-made examples;
- Portuguese and English interface, and two themes (light and dark).

The machine you draw is saved in your browser (localStorage).

## Quick start

1. Pick an example from the menu, or use `+ State` and `Transition` to draw your own;
2. Click a transition to edit its rules;
3. Click a tape cell and type, or write a word in the input box and press `Load`;
4. Press `Step` or `Run`.

## Non-deterministic machines

1. Tick `Non-deterministic` next to the tapes. Each rule gets a `δ0` or `δ1` selector, and `δ1` arrows are dashed;
2. `Step` goes one level down the computation tree. `Run` explores every branch, up to 2000 nodes;
3. Use `Tree` to see the tree. Click a node, or a branch in the side list, to see its state and tape;
4. `Save PNG` and `Copy PNG` export what you see, the diagram or the tree.

## Shortcuts

| Shortcut | Action |
| --- | --- |
| `V` | Select |
| `E` | New state |
| `T` | New transition |
| `H` | Pan the view |
| `Shift` + drag | Pan the view (diagram and tree) |
| Two-finger scroll (touchpad) | Pan the view (diagram and tree) |
| Drag on an empty spot | Select several items |
| `Delete` | Delete the selection |
| `Ctrl+Z` / `Ctrl+Shift+Z` | Undo / redo |
| `Ctrl` + mouse wheel, or pinch on the touchpad | Zoom (diagram and tree) |
| `Esc` | Cancel |

## License

[MIT](LICENSE). Copyright © 2026 Andrieli Gonçalves.

Made by: Andrieli Gonçalves (alg24@inf.ufpr.br)

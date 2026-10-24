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
- Step by step or continuous run, with speed control; the current state and rule are highlighted;
- Undo and redo, save and load as JSON, and ready-made examples;
- Portuguese and English interface, and six themes (auto, light, dark, blueprint, terminal and sepia).

The machine you draw is saved in your browser (localStorage).

## Quick start

1. Pick an example from the menu, or use `+ State` and `Transition` to draw your own;
2. Click a transition to edit its rules;
3. Click a tape cell and type, or write a word in the input box and press `Load`;
4. Press `Step` or `Run`.

## Shortcuts

| Shortcut | Action |
| --- | --- |
| `V` | Select |
| `E` | New state |
| `T` | New transition |
| `H` | Pan the view |
| `Space` + drag | Pan the view |
| Two-finger scroll (touchpad) | Pan the view |
| Drag on an empty spot | Select several items |
| `Delete` | Delete the selection |
| `Ctrl+Z` / `Ctrl+Shift+Z` | Undo / redo |
| `Ctrl` + mouse wheel, or pinch on the touchpad | Zoom |
| `Esc` | Cancel |

## License

[MIT](LICENSE)

Made by: Andrieli Gonçalves

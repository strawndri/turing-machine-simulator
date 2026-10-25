# Turing Machine Simulator

[Português](README.pt-BR.md)

An interactive Turing machine simulator that runs in the browser.
Use it to learn a little more about the theory of computation :)

Live demo: https://strawndri.github.io/turing-machine-simulator/

## Features

- Draw state diagrams: add states, link them, bend arrows and move groups;
- Rules as `[read; write; move]`, with `L` (left), `R` (right) and `S` (stay);
- 1 to 4 tapes, and each one can be read only;
- Editable tape alphabet Γ and blank symbol;
- Non-deterministic machines (δ0 and δ1) with a computation tree;
- Step by step or continuous run, with speed control;
- Undo and redo, JSON save and load, PNG export, and ready-made examples;
- Portuguese and English, light and dark themes.

The machine you draw is saved in your browser (localStorage).

## Quick start

1. Pick an example from the menu, or use `+ State` and `Transition` to draw your own;
2. Click a transition to edit its rules;
3. Click a tape cell and type, or write a word in the input box and press `Load`;
4. Press `Step` or `Run`.

## Options

- **Top bar:** examples, language, theme and `Save / load`;
- **Diagram toolbar:** tools, undo and redo, zoom and PNG export;
- **Side panel:** edit the selected state or transition;
- **Tapes panel:** number of tapes, blank symbol, alphabet Γ and tape input;
- **Non-deterministic:** a box to use `δ0` and `δ1`, and the `Diagram` and `Tree` views;
- **Run controls:** `Step`, `Run`, `Reset` and speed.

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

Licensed under the [MIT License](LICENSE).

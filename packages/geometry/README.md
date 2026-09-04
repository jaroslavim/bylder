# @bylder/geometry

Room/wall polygon math, snapping, and hit-testing helpers used by the canvas layer in `apps/web`. Owned by the `canvas-geometry` agent. See [WORKPLAN.md](../../WORKPLAN.md).

## Canvas contract

Canvas coordinates are millimetres. `snapPoint` uses a 100mm grid by default. Pointer gestures may mutate SVG attributes during pointermove, but the owning model must be updated only on pointerup. Use `applyTransform` and `inverseTransform` at the SVG viewport boundary and keep geometry helpers pure.

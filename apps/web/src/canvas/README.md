# Canvas interactions

The heating canvas uses plain SVG. Pointer moves update SVG attributes directly during an active gesture; the room, wall, and component models are committed when the pointer is released.

## Interaction states

- **Snap on/off:** `Snap: on` rounds component, vertex, and resize releases to the current grid. `Snap: off` keeps freehand coordinates.
- **Grid:** the grid input accepts 10-500 mm and drives both visual grid spacing and snapping.
- **Room editing:** `Draw room` creates and selects a rectangle. `Add vertex` inserts a point; drag orange vertex handles to reshape the closed polygon. Drag the corner handle to resize the original rectangle.
- **Walls:** hover/selection styling identifies each wall. Wall labels show live geometry-derived dimensions. The wall tools appear when one or more walls are selected.
- **Marquee:** drag on empty canvas to select walls whose endpoints are inside the rectangle. Shift-click walls to add or remove individual walls.
- **Bulk actions:** selected walls share a thickness input and support `Copy selected` and `Delete selected`.

Component dragging, rotation, zoom, and the heating loop preview remain available while editing rooms.
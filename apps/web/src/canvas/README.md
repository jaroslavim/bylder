# Canvas interactions

The heating canvas uses plain SVG. Pointer moves update SVG attributes directly during an active gesture; the room, wall, and component models are committed when the pointer is released.

## Interaction states

- **Snap on/off:** `Snap: on` rounds component, vertex, and resize releases to the current grid. `Snap: off` keeps freehand coordinates. Vertex moves also snap nearby X/Y alignments to right-angle walls; configure the millimetre tolerance with `Right-angle`.
- **Grid:** the grid input accepts 10-500 mm and drives both visual grid spacing and snapping.
- **Room editing:** `Draw room` creates and selects a rectangle. `Add vertex` inserts a point; drag orange vertex handles to reshape the closed polygon. Drag the corner handle to resize the original rectangle.
- **Walls:** hover/selection styling identifies each wall. Endpoint and midpoint handles are shown only for hovered or selected walls. Wall labels show live geometry-derived dimensions.
- **Marquee:** drag on empty canvas to select walls whose endpoints are inside the rectangle. Shift-click walls to add or remove individual walls.
- **Wall context menu:** right-click a wall to set thickness in mm, add a midpoint, delete a point and merge adjacent walls, delete the wall, or copy it. Shift-right-clicking a selected wall applies actions to the current multi-selection. Pressing `Cancel` closes the accessible `Wall actions` menu.

Component dragging, rotation, zoom, and the heating loop preview remain available while editing rooms.
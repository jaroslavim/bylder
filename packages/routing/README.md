# @bylder/routing

Shared routing primitives for installation plans: obstacle maps, orthogonal A* paths, route simplification, and discipline-specific constraints. Generic path search belongs here; electrical code rules and water/sewage slope constraints remain in their owning calculation packages. See [WORKPLAN.md](../../WORKPLAN.md).

## Canvas contract

`generateHeatingLoop` returns a deterministic polyline in millimetres. It is a preview route only: the canvas renders it as an SVG path and does not persist generated points as editable components. Recompute the preview from the current room, manifold, and zone count after a committed edit.

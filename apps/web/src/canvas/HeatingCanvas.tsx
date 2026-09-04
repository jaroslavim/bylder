import {
  marqueeSelectWalls,
  polygonWalls,
  resizeRectangle,
  snapPoint,
  snapValue,
  wallLength,
  type Point,
  type Rect,
  type Wall,
} from '@bylder/geometry';
import { generateHeatingLoop } from '@bylder/routing';
import { useRef, useState } from 'react';
import './canvas.css';

type ComponentKind = 'manifold' | 'zone';
type Component = { id: string; kind: ComponentKind; x: number; y: number; rotation: number };
type Room = { id: string; label: string; floorColor: string; points: Point[]; thickness: number };
type Gesture =
  | { type: 'component'; id: string; start: Point; startClient: Point; origin: Component; moved: boolean }
  | { type: 'resize'; id: string; start: Point; origin: Rect }
  | { type: 'vertex'; roomId: string; index: number; start: Point; origin: Point }
  | { type: 'marquee'; start: Point };

type Viewport = { x: number; y: number; scale: number };

const VIEWBOX = { width: 1200, height: 700 };
const starterRoom: Room = { id: 'room-0', label: 'Living room', floorColor: '#FFF8E8', points: [{ x: 160, y: 100 }, { x: 960, y: 100 }, { x: 960, y: 560 }, { x: 160, y: 560 }], thickness: 100 };
const starterComponents: Component[] = [
  { id: 'manifold-1', kind: 'manifold', x: 240, y: 150, rotation: 0 },
  { id: 'zone-1', kind: 'zone', x: 360, y: 230, rotation: 0 },
  { id: 'zone-2', kind: 'zone', x: 600, y: 230, rotation: 0 },
  { id: 'zone-3', kind: 'zone', x: 820, y: 230, rotation: 0 },
];

function pathFromPoints(points: Point[], close = false): string {
  return `${points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')}${close ? ' Z' : ''}`;
}

export function HeatingCanvas() {
  const svgRef = useRef<SVGSVGElement>(null);
  const layerRef = useRef<SVGGElement>(null);
  const gestureRef = useRef<Gesture | null>(null);
  const [rooms, setRooms] = useState<Room[]>([starterRoom]);
  const [components, setComponents] = useState<Component[]>(starterComponents);
  const [selectedId, setSelectedId] = useState('');
  const [selectedWalls, setSelectedWalls] = useState<string[]>([]);
  const [copiedWalls, setCopiedWalls] = useState<Wall[]>([]);
  const [gridSize, setGridSize] = useState(100);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [marquee, setMarquee] = useState<Rect | null>(null);
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, scale: 1 });

  const snap = (point: Point) => snapEnabled ? snapPoint(point, gridSize) : point;
  const allWalls = rooms.flatMap((room) => polygonWalls(room.points, room.thickness, room.id));
  const roomForWall = (id: string) => rooms.find((room) => id.startsWith(`${room.id}-`));

  const worldPoint = (event: { clientX: number; clientY: number }): Point => {
    const bounds = svgRef.current?.getBoundingClientRect();
    if (!bounds) return { x: 0, y: 0 };
    return {
      x: ((event.clientX - bounds.left) / bounds.width * VIEWBOX.width - viewport.x) / viewport.scale,
      y: ((event.clientY - bounds.top) / bounds.height * VIEWBOX.height - viewport.y) / viewport.scale,
    };
  };

  const beginComponentDrag = (event: React.PointerEvent<SVGGElement>, component: Component) => {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedId(component.id);
    gestureRef.current = { type: 'component', id: component.id, start: worldPoint(event), startClient: { x: event.clientX, y: event.clientY }, origin: component, moved: false };
  };

  const beginResize = (event: React.PointerEvent<SVGCircleElement>, room: Room) => {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    gestureRef.current = { type: 'resize', id: room.id, start: worldPoint(event), origin: { x: room.points[0].x, y: room.points[0].y, width: room.points[1].x - room.points[0].x, height: room.points[3].y - room.points[0].y } };
  };

  const beginVertexDrag = (event: React.PointerEvent<SVGCircleElement>, roomId: string, index: number, point: Point) => {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    gestureRef.current = { type: 'vertex', roomId, index, start: worldPoint(event), origin: point };
  };

  const beginPan = (event: React.PointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) return;
    setSelectedId(''); setSelectedWalls([]);
    event.currentTarget.setPointerCapture(event.pointerId);
    gestureRef.current = { type: 'marquee', start: worldPoint(event) };
  };

  const moveGesture = (event: React.PointerEvent<SVGSVGElement>) => {
    const gesture = gestureRef.current;
    if (!gesture) return;
    const pointer = worldPoint(event);
    if (gesture.type === 'component') {
      gesture.moved = event.buttons === 1 && Math.hypot(event.clientX - gesture.startClient.x, event.clientY - gesture.startClient.y) > 5;
      if (!gesture.moved) return;
      const component = { ...gesture.origin, ...snap({ x: gesture.origin.x + pointer.x - gesture.start.x, y: gesture.origin.y + pointer.y - gesture.start.y }) };
      document.querySelector(`[data-component-id="${gesture.id}"]`)?.setAttribute('transform', `translate(${component.x} ${component.y}) rotate(${component.rotation})`);
      return;
    }
    if (gesture.type === 'resize') {
      const rect = resizeRectangle(gesture.origin, { right: pointer.x - gesture.start.x, bottom: pointer.y - gesture.start.y });
      const roomNode = document.querySelector(`rect.room-shape[data-room-model-id="${gesture.id}"]`);
      roomNode?.setAttribute('x', String(rect.x));
      roomNode?.setAttribute('y', String(rect.y));
      roomNode?.setAttribute('width', String(rect.width));
      roomNode?.setAttribute('height', String(rect.height));
      document.querySelector(`[data-room-resize="${gesture.id}"]`)?.setAttribute('cx', String(rect.x + rect.width));
      document.querySelector(`[data-room-resize="${gesture.id}"]`)?.setAttribute('cy', String(rect.y + rect.height));
      return;
    }
    if (gesture.type === 'vertex') {
      const point = snap({ x: gesture.origin.x + pointer.x - gesture.start.x, y: gesture.origin.y + pointer.y - gesture.start.y });
      document.querySelector(`[data-vertex="${gesture.roomId}-${gesture.index}"]`)?.setAttribute('cx', String(point.x));
      document.querySelector(`[data-vertex="${gesture.roomId}-${gesture.index}"]`)?.setAttribute('cy', String(point.y));
      return;
    }
    setMarquee({ x: Math.min(gesture.start.x, pointer.x), y: Math.min(gesture.start.y, pointer.y), width: Math.abs(pointer.x - gesture.start.x), height: Math.abs(pointer.y - gesture.start.y) });
  };

  const finishGesture = (event: React.PointerEvent<SVGSVGElement>) => {
    const gesture = gestureRef.current;
    if (!gesture) return;
    const pointer = worldPoint(event);
    if (gesture.type === 'component') {
      if (!gesture.moved) {
        gestureRef.current = null;
        return;
      }
      const delta = { x: pointer.x - gesture.start.x, y: pointer.y - gesture.start.y };
      const moved = snap({ x: gesture.origin.x + delta.x, y: gesture.origin.y + delta.y });
      setComponents((current) => current.map((component) => component.id === gesture.id ? { ...component, ...moved } : component));
    } else if (gesture.type === 'resize') {
      const resized = resizeRectangle(gesture.origin, { right: pointer.x - gesture.start.x, bottom: pointer.y - gesture.start.y });
      const snapped = {
        x: snapValue(resized.x, gridSize),
        y: snapValue(resized.y, gridSize),
        width: Math.max(gridSize, snapValue(resized.width, gridSize)),
        height: Math.max(gridSize, snapValue(resized.height, gridSize)),
      };
      setRooms((current) => current.map((room) => room.id === gesture.id ? { ...room, points: [{ x: snapped.x, y: snapped.y }, { x: snapped.x + snapped.width, y: snapped.y }, { x: snapped.x + snapped.width, y: snapped.y + snapped.height }, { x: snapped.x, y: snapped.y + snapped.height }] } : room));
    } else if (gesture.type === 'vertex') {
      const point = snap({ x: gesture.origin.x + pointer.x - gesture.start.x, y: gesture.origin.y + pointer.y - gesture.start.y });
      setRooms((current) => current.map((room) => room.id === gesture.roomId ? { ...room, points: room.points.map((item, index) => index === gesture.index ? point : item) } : room));
    } else {
      const bounds = { x: Math.min(gesture.start.x, pointer.x), y: Math.min(gesture.start.y, pointer.y), width: Math.abs(pointer.x - gesture.start.x), height: Math.abs(pointer.y - gesture.start.y) };
      if (bounds.width > 10 && bounds.height > 10) setSelectedWalls(marqueeSelectWalls(allWalls, bounds));
      setMarquee(null);
    }
    gestureRef.current = null;
  };

  const zoomCanvas = (event: React.WheelEvent<SVGSVGElement>) => {
    event.preventDefault();
    const nextScale = Math.min(2, Math.max(0.6, viewport.scale * (event.deltaY < 0 ? 1.1 : 0.9)));
    setViewport((current) => ({ ...current, scale: nextScale }));
  };

  const rotateSelected = () => {
    setComponents((current) => current.map((component) => component.id === selectedId ? { ...component, rotation: component.rotation + 90 } : component));
  };

  const addRoom = () => {
    const id = `room-${rooms.length}`;
    setRooms((current) => [...current, { id, label: `Room ${rooms.length + 1}`, floorColor: '#EEF7F3', points: [{ x: 300, y: 180 }, { x: 800, y: 180 }, { x: 800, y: 480 }, { x: 300, y: 480 }], thickness: 100 }]);
    setSelectedId(id);
  };
  const addVertex = () => setRooms((current) => current.map((room) => room.id === selectedId ? { ...room, points: [...room.points.slice(0, 1), { x: (room.points[0].x + room.points[1].x) / 2, y: room.points[0].y + 100 }, ...room.points.slice(1)] } : room));
  const addComponent = (kind: ComponentKind) => {
    const id = `${kind}-${components.length + 1}`;
    const position = snap({ x: 300 + components.length * 80, y: 180 + components.length * 40 });
    setComponents((current) => [...current, { id, kind, ...position, rotation: 0 }]);
    setSelectedId(id);
  };
  const changeThickness = (value: number) => setRooms((current) => current.map((room) => selectedWalls.some((id) => id.startsWith(`${room.id}-`)) ? { ...room, thickness: value } : room));
  const selectedRoom = rooms.find((room) => room.id === selectedId);
  const updateSelectedRoom = (changes: Partial<Room>) => setRooms((current) => current.map((room) => room.id === selectedId ? { ...room, ...changes } : room));
  const copyWalls = () => setCopiedWalls(allWalls.filter((wall) => selectedWalls.includes(wall.id)));
  const deleteWalls = () => { setRooms((current) => current.map((room) => { const ids = new Set(selectedWalls.filter((id) => id.startsWith(`${room.id}-`))); if (!ids.size || room.points.length <= 3) return room; return { ...room, points: room.points.filter((_, index) => !ids.has(`${room.id}-${index}`)) }; })); setSelectedWalls([]); };

  const manifold = components.find((component) => component.kind === 'manifold') ?? starterComponents[0];
  const zones = components.filter((component) => component.kind === 'zone');

  return (
    <section className="heating-editor" aria-label="Heating layout editor">
      <header className="canvas-toolbar">
        <div>
          <span className="canvas-kicker">HTG-01 / PHASE 1</span>
          <h1>Floor heating layout</h1>
        </div>
        <div className="canvas-actions">
          <button type="button" onClick={addRoom}>Draw room</button>
          <button type="button" onClick={addVertex} disabled={!rooms.find((room) => room.id === selectedId)}>Add vertex</button>
          <button type="button" onClick={() => setSnapEnabled((value) => !value)} aria-pressed={snapEnabled}>{snapEnabled ? 'Snap: on' : 'Snap: off'}</button>
          <label>Grid <input aria-label="Grid size" type="number" min="10" max="500" step="10" value={gridSize} onChange={(event) => setGridSize(Math.max(10, Math.min(500, Number(event.target.value) || 10)))} /></label>
          <button type="button" onClick={() => addComponent('manifold')}>+ Manifold</button>
          <button type="button" onClick={() => addComponent('zone')}>+ Zone</button>
          <button type="button" onClick={rotateSelected} disabled={!selectedId} aria-label="Rotate selected component">Rotate 90°</button>
        </div>
      </header>
      <div className="canvas-status"><span>Grid {gridSize} mm</span><span>{snapEnabled ? 'SNAP ON' : 'FREEHAND'}</span><span>{rooms.length} rooms</span><span>{selectedWalls.length} walls selected</span><span className="status-live">LIVE PREVIEW</span></div>
      {selectedRoom && <div className="room-tools"><strong>Room</strong><label>Name <input aria-label="Room label" value={selectedRoom.label} onChange={(event) => updateSelectedRoom({ label: event.target.value })} /></label><label>Floor <input aria-label="Floor color" type="color" value={selectedRoom.floorColor} onChange={(event) => updateSelectedRoom({ floorColor: event.target.value })} /></label></div>}
      {selectedWalls.length > 0 && <div className="wall-tools"><strong>{selectedWalls.length} walls</strong><label>Thickness <input aria-label="Wall thickness" type="number" min="10" value={roomForWall(selectedWalls[0])?.thickness ?? 100} onChange={(event) => changeThickness(Math.max(10, Number(event.target.value) || 10))} /></label><button type="button" onClick={copyWalls}>Copy selected</button><button type="button" onClick={deleteWalls}>Delete selected</button></div>}
      <div className="svg-frame">
        <svg ref={svgRef} viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`} role="application" aria-label="Heating layout canvas" onPointerDown={beginPan} onPointerMove={moveGesture} onPointerUp={finishGesture} onPointerCancel={finishGesture} onWheel={zoomCanvas}>
          <defs>
            <pattern id="canvas-grid" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse"><path d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`} fill="none" stroke="rgba(80, 98, 94, .18)" strokeWidth="2" /></pattern>
          </defs>
          <rect width="1200" height="700" fill="url(#canvas-grid)" onPointerDown={(event) => beginPan(event as unknown as React.PointerEvent<SVGSVGElement>)} onPointerUp={(event) => finishGesture(event as unknown as React.PointerEvent<SVGSVGElement>)} />
          <g ref={layerRef} transform={`translate(${viewport.x} ${viewport.y}) scale(${viewport.scale})`}>
            {rooms.map((room, index) => { const bounds = { x: room.points[0].x, y: room.points[0].y, width: room.points[1].x - room.points[0].x, height: room.points[3].y - room.points[0].y }; const walls = polygonWalls(room.points, room.thickness, room.id); return <g key={room.id} data-room-id={room.id}>
                <rect className="room-shape" data-room-id={index.toString()} data-room-model-id={room.id} x={bounds.x} y={bounds.y} width={bounds.width} height={bounds.height} fill={room.floorColor} onPointerDown={(event) => { event.stopPropagation(); setSelectedId(room.id); }} />
                <path className="room-outline" d={pathFromPoints(room.points, true)} fill={room.floorColor} onPointerDown={(event) => { event.stopPropagation(); setSelectedId(room.id); }} />
                {walls.map((wall) => <g key={wall.id} data-wall-id={wall.id} className={`wall ${selectedWalls.includes(wall.id) ? 'is-selected' : ''}`} onPointerDown={(event) => { event.stopPropagation(); setSelectedWalls((current) => event.shiftKey ? current.includes(wall.id) ? current.filter((id) => id !== wall.id) : [...current, wall.id] : [wall.id]); }}><line x1={wall.start.x} y1={wall.start.y} x2={wall.end.x} y2={wall.end.y} strokeWidth={Math.max(6, wall.thickness / 12)} /><text x={(wall.start.x + wall.end.x) / 2} y={(wall.start.y + wall.end.y) / 2 - 10} textAnchor="middle">{Math.round(wallLength(wall))} mm</text></g>)}
                <text className="room-label" x={room.points[0].x + 20} y={room.points[0].y + 36}>{room.label}</text>
                {room.points.map((point, pointIndex) => <circle key={pointIndex} className="vertex-handle" data-vertex={`${room.id}-${pointIndex}`} cx={point.x} cy={point.y} r="9" onPointerDown={(event) => beginVertexDrag(event, room.id, pointIndex, point)} />)}
                <circle className="resize-handle" data-resize-handle={index.toString()} data-room-resize={room.id} cx={room.points[1].x} cy={room.points[2].y} r="10" onPointerDown={(event) => beginResize(event, room)} />
              </g>; })}
            {copiedWalls.map((wall, index) => <line key={`copy-${index}`} className="copied-wall" x1={wall.start.x + 20} y1={wall.start.y + 20} x2={wall.end.x + 20} y2={wall.end.y + 20} />)}
            {zones.map((zone, index) => <path key={`loop-${zone.id}`} className="heating-loop" d={pathFromPoints(generateHeatingLoop({ x: rooms[0].points[0].x, y: rooms[0].points[0].y, width: rooms[0].points[1].x - rooms[0].points[0].x, height: rooms[0].points[3].y - rooms[0].points[0].y }, manifold, index, zones.length).points)} />)}
            {components.map((component) => <g key={component.id} data-component-id={component.id} className={`component ${selectedId === component.id ? 'is-selected' : ''}`} transform={`translate(${component.x} ${component.y}) rotate(${component.rotation})`} onPointerDown={(event) => beginComponentDrag(event, component)} onPointerMove={moveGesture} onPointerUp={finishGesture} onPointerCancel={finishGesture}>
              {component.kind === 'manifold' ? <><rect className="manifold" x="-34" y="-24" width="68" height="48" rx="4" /><path d="M -20 -12 H 20 M -20 0 H 20 M -20 12 H 20" /></> : <><circle className="zone" r="32" /><text textAnchor="middle" y="5">ZONE</text></>}
              <title>{component.kind === 'manifold' ? 'Manifold' : 'Heating zone'}</title>
            </g>)}
            {marquee && <rect className="marquee" x={marquee.x} y={marquee.y} width={marquee.width} height={marquee.height} />}
          </g>
        </svg>
        <div className="zoom-readout">{Math.round(viewport.scale * 100)}%</div>
      </div>
      <footer className="canvas-footer"><span>Drag component to move</span><span>Drag vertex or corner to edit</span><span>Shift-click or drag empty canvas to select walls</span><span>Wall labels show dimensions</span></footer>
    </section>
  );
}

import {
  resizeRectangle,
  snapPoint,
  snapValue,
  type Point,
  type Rect,
} from '@bylder/geometry';
import { generateHeatingLoop } from '@bylder/routing';
import { useRef, useState } from 'react';
import './canvas.css';

type ComponentKind = 'manifold' | 'zone';
type Component = { id: string; kind: ComponentKind; x: number; y: number; rotation: number };
type Gesture =
  | { type: 'component'; id: string; start: Point; startClient: Point; origin: Component; moved: boolean }
  | { type: 'resize'; id: string; start: Point; origin: Rect }
  | { type: 'pan'; start: Point; origin: Point };

type Viewport = { x: number; y: number; scale: number };

const VIEWBOX = { width: 1200, height: 700 };
const starterRoom: Rect = { x: 160, y: 100, width: 800, height: 460 };
const starterComponents: Component[] = [
  { id: 'manifold-1', kind: 'manifold', x: 240, y: 150, rotation: 0 },
  { id: 'zone-1', kind: 'zone', x: 360, y: 230, rotation: 0 },
  { id: 'zone-2', kind: 'zone', x: 600, y: 230, rotation: 0 },
  { id: 'zone-3', kind: 'zone', x: 820, y: 230, rotation: 0 },
];

function pathFromPoints(points: Point[]): string {
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
}

export function HeatingCanvas() {
  const svgRef = useRef<SVGSVGElement>(null);
  const layerRef = useRef<SVGGElement>(null);
  const gestureRef = useRef<Gesture | null>(null);
  const [rooms, setRooms] = useState<Rect[]>([starterRoom]);
  const [components, setComponents] = useState<Component[]>(starterComponents);
  const [selectedId, setSelectedId] = useState('');
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, scale: 1 });

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

  const beginResize = (event: React.PointerEvent<SVGCircleElement>, room: Rect, id: string) => {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    gestureRef.current = { type: 'resize', id, start: worldPoint(event), origin: room };
  };

  const beginPan = (event: React.PointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) return;
    setSelectedId('');
    event.currentTarget.setPointerCapture(event.pointerId);
    gestureRef.current = { type: 'pan', start: { x: event.clientX, y: event.clientY }, origin: { x: viewport.x, y: viewport.y } };
  };

  const moveGesture = (event: React.PointerEvent<SVGSVGElement>) => {
    const gesture = gestureRef.current;
    if (!gesture) return;
    const pointer = worldPoint(event);
    if (gesture.type === 'component') {
      gesture.moved = event.buttons === 1 && Math.hypot(event.clientX - gesture.startClient.x, event.clientY - gesture.startClient.y) > 5;
      if (!gesture.moved) return;
      const component = { ...gesture.origin, x: gesture.origin.x + pointer.x - gesture.start.x, y: gesture.origin.y + pointer.y - gesture.start.y };
      document.querySelector(`[data-component-id="${gesture.id}"]`)?.setAttribute('transform', `translate(${component.x} ${component.y}) rotate(${component.rotation})`);
      return;
    }
    if (gesture.type === 'resize') {
      const rect = resizeRectangle(gesture.origin, { right: pointer.x - gesture.start.x, bottom: pointer.y - gesture.start.y });
      const roomNode = document.querySelector(`rect.room-shape[data-room-id="${gesture.id}"]`);
      roomNode?.setAttribute('x', String(rect.x));
      roomNode?.setAttribute('y', String(rect.y));
      roomNode?.setAttribute('width', String(rect.width));
      roomNode?.setAttribute('height', String(rect.height));
      document.querySelector(`[data-resize-handle="${gesture.id}"]`)?.setAttribute('cx', String(rect.x + rect.width));
      document.querySelector(`[data-resize-handle="${gesture.id}"]`)?.setAttribute('cy', String(rect.y + rect.height));
      return;
    }
    const nextViewport = {
      x: gesture.origin.x + (event.clientX - gesture.start.x) / 1.2,
      y: gesture.origin.y + (event.clientY - gesture.start.y) / 1.2,
    };
    layerRef.current?.setAttribute('transform', `translate(${nextViewport.x} ${nextViewport.y}) scale(${viewport.scale})`);
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
      const moved = snapPoint({ x: gesture.origin.x + delta.x, y: gesture.origin.y + delta.y });
      setComponents((current) => current.map((component) => component.id === gesture.id ? { ...component, ...moved } : component));
    } else if (gesture.type === 'resize') {
      const resized = resizeRectangle(gesture.origin, { right: pointer.x - gesture.start.x, bottom: pointer.y - gesture.start.y });
      const snapped = {
        x: snapValue(resized.x),
        y: snapValue(resized.y),
        width: Math.max(100, snapValue(resized.width)),
        height: Math.max(100, snapValue(resized.height)),
      };
      setRooms((current) => current.map((room, index) => index.toString() === gesture.id ? snapped : room));
    } else {
      const nextViewport = {
        x: gesture.origin.x + (event.clientX - gesture.start.x) / 1.2,
        y: gesture.origin.y + (event.clientY - gesture.start.y) / 1.2,
      };
      setViewport((current) => ({ ...current, ...nextViewport }));
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

  const addRoom = () => setRooms((current) => [...current, { x: 300, y: 180, width: 500, height: 300 }]);
  const addComponent = (kind: ComponentKind) => {
    const id = `${kind}-${components.length + 1}`;
    const position = snapPoint({ x: 300 + components.length * 80, y: 180 + components.length * 40 });
    setComponents((current) => [...current, { id, kind, ...position, rotation: 0 }]);
    setSelectedId(id);
  };

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
          <button type="button" onClick={addRoom}>+ Room</button>
          <button type="button" onClick={() => addComponent('manifold')}>+ Manifold</button>
          <button type="button" onClick={() => addComponent('zone')}>+ Zone</button>
          <button type="button" onClick={rotateSelected} disabled={!selectedId} aria-label="Rotate selected component">Rotate 90°</button>
        </div>
      </header>
      <div className="canvas-status"><span>Grid 100 mm</span><span>{rooms.length} rooms</span><span>{components.length} components</span><span className="status-live">LIVE PREVIEW</span></div>
      <div className="svg-frame">
        <svg ref={svgRef} viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`} role="application" aria-label="Heating layout canvas" onPointerDown={beginPan} onPointerMove={moveGesture} onPointerUp={finishGesture} onPointerCancel={finishGesture} onWheel={zoomCanvas}>
          <defs>
            <pattern id="canvas-grid" width="100" height="100" patternUnits="userSpaceOnUse"><path d="M 100 0 L 0 0 0 100" fill="none" stroke="rgba(80, 98, 94, .18)" strokeWidth="2" /></pattern>
          </defs>
          <rect width="1200" height="700" fill="url(#canvas-grid)" />
          <g ref={layerRef} transform={`translate(${viewport.x} ${viewport.y}) scale(${viewport.scale})`}>
            {rooms.map((room, index) => {
              const id = index.toString();
              return <g key={id} data-room-id={id}>
                <rect className="room-shape" data-room-id={id} x={room.x} y={room.y} width={room.width} height={room.height} onPointerDown={(event) => { event.stopPropagation(); setSelectedId(`room-${id}`); }} />
                <text className="room-label" x={room.x + 20} y={room.y + 36}>ROOM {index + 1}</text>
                <circle className="resize-handle" data-resize-handle={id} cx={room.x + room.width} cy={room.y + room.height} r="10" onPointerDown={(event) => beginResize(event, room, id)} />
              </g>;
            })}
            {zones.map((zone, index) => <path key={`loop-${zone.id}`} className="heating-loop" d={pathFromPoints(generateHeatingLoop(rooms[0], manifold, index, zones.length).points)} />)}
            {components.map((component) => <g key={component.id} data-component-id={component.id} className={`component ${selectedId === component.id ? 'is-selected' : ''}`} transform={`translate(${component.x} ${component.y}) rotate(${component.rotation})`} onPointerDown={(event) => beginComponentDrag(event, component)} onPointerMove={moveGesture} onPointerUp={finishGesture} onPointerCancel={finishGesture}>
              {component.kind === 'manifold' ? <><rect className="manifold" x="-34" y="-24" width="68" height="48" rx="4" /><path d="M -20 -12 H 20 M -20 0 H 20 M -20 12 H 20" /></> : <><circle className="zone" r="32" /><text textAnchor="middle" y="5">ZONE</text></>}
              <title>{component.kind === 'manifold' ? 'Manifold' : 'Heating zone'}</title>
            </g>)}
          </g>
        </svg>
        <div className="zoom-readout">{Math.round(viewport.scale * 100)}%</div>
      </div>
      <footer className="canvas-footer"><span>Drag to move</span><span>Corner handle to resize</span><span>Select then rotate</span><span>Pan on empty canvas</span></footer>
    </section>
  );
}

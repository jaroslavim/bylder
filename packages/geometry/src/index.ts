export interface Point {
	x: number;
	y: number;
}

export interface Vector {
	x: number;
	y: number;
}

export interface Segment {
	start: Point;
	end: Point;
}

export interface Rect {
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface Wall {
	id: string;
	start: Point;
	end: Point;
	thickness: number;
}

export interface CoordinateTransform {
	translation: Vector;
	scale: Vector;
}

export interface ResizeDelta {
	left?: number;
	right?: number;
	top?: number;
	bottom?: number;
}

export function distance(first: Point, second: Point): number {
	return Math.hypot(second.x - first.x, second.y - first.y);
}

export function boundingBox(points: readonly Point[]): Rect {
	if (points.length === 0) {
		throw new RangeError('Cannot calculate a bounding box for an empty collection');
	}

	let minX = points[0].x;
	let maxX = points[0].x;
	let minY = points[0].y;
	let maxY = points[0].y;

	for (const point of points.slice(1)) {
		minX = Math.min(minX, point.x);
		maxX = Math.max(maxX, point.x);
		minY = Math.min(minY, point.y);
		maxY = Math.max(maxY, point.y);
	}

	return {
		x: minX,
		y: minY,
		width: maxX - minX,
		height: maxY - minY,
	};
}

export function pointInRectangle(point: Point, rectangle: Rect): boolean {
	return (
		point.x >= rectangle.x &&
		point.x <= rectangle.x + rectangle.width &&
		point.y >= rectangle.y &&
		point.y <= rectangle.y + rectangle.height
	);
}

export function applyTransform(
	point: Point,
	transform: CoordinateTransform,
): Point {
	return {
		x: point.x * transform.scale.x + transform.translation.x,
		y: point.y * transform.scale.y + transform.translation.y,
	};
}

export function inverseTransform(
	point: Point,
	transform: CoordinateTransform,
): Point {
	if (transform.scale.x === 0 || transform.scale.y === 0) {
		throw new RangeError('A transform with zero scale cannot be inverted');
	}

	return {
		x: (point.x - transform.translation.x) / transform.scale.x,
		y: (point.y - transform.translation.y) / transform.scale.y,
	};
}

export function snapValue(value: number, gridSize = 100): number {
	if (gridSize <= 0) {
		throw new RangeError('Grid size must be positive');
	}

	return Math.round(value / gridSize) * gridSize;
}

export function snapPoint(point: Point, gridSize = 100): Point {
	return { x: snapValue(point.x, gridSize), y: snapValue(point.y, gridSize) };
}

export function polygonWalls(points: readonly Point[], thickness = 100, idPrefix = 'wall'): Wall[] {
	if (points.length < 2) return [];
	return points.map((start, index) => ({
		id: `${idPrefix}-${index}`,
		start,
		end: points[(index + 1) % points.length],
		thickness,
	}));
}

export function wallLength(wall: Pick<Wall, 'start' | 'end'>): number {
	return distance(wall.start, wall.end);
}

export function marqueeSelectWalls(walls: readonly Wall[], marquee: Rect): string[] {
	return walls
		.filter((wall) => pointInRectangle(wall.start, marquee) && pointInRectangle(wall.end, marquee))
		.map((wall) => wall.id);
}

export function updateWallThickness(walls: readonly Wall[], wallIds: readonly string[], thickness: number): Wall[] {
	if (thickness <= 0) throw new RangeError('Wall thickness must be positive');
	const selected = new Set(wallIds);
	return walls.map((wall) => selected.has(wall.id) ? { ...wall, thickness } : wall);
}

export function rotatePoint(point: Point, center: Point, angleDegrees: number): Point {
	const angle = (angleDegrees * Math.PI) / 180;
	const cosine = Math.cos(angle);
	const sine = Math.sin(angle);
	const offsetX = point.x - center.x;
	const offsetY = point.y - center.y;

	return {
		x: center.x + offsetX * cosine - offsetY * sine,
		y: center.y + offsetX * sine + offsetY * cosine,
	};
}

export function resizeRectangle(
	rectangle: Rect,
	delta: ResizeDelta,
	minimumSize = 100,
): Rect {
	const left = rectangle.x + (delta.left ?? 0);
	const right = rectangle.x + rectangle.width + (delta.right ?? 0);
	const top = rectangle.y + (delta.top ?? 0);
	const bottom = rectangle.y + rectangle.height + (delta.bottom ?? 0);
	const nextLeft = Math.min(left, right - minimumSize);
	const nextTop = Math.min(top, bottom - minimumSize);

	return {
		x: nextLeft,
		y: nextTop,
		width: Math.max(minimumSize, right - nextLeft),
		height: Math.max(minimumSize, bottom - nextTop),
	};
}

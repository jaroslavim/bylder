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

export interface CoordinateTransform {
	translation: Vector;
	scale: Vector;
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

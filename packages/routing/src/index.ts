import type { Point, Rect } from '@bylder/geometry';

export interface HeatingLoop {
	points: Point[];
}

export function generateHeatingLoop(
	room: Rect,
	manifold: Point,
	zoneIndex: number,
	zoneCount: number,
): HeatingLoop {
	const count = Math.max(1, zoneCount);
	const laneWidth = room.width / (count + 1);
	const laneX = room.x + laneWidth * (zoneIndex + 1);
	const laneTop = room.y + room.height * 0.2;
	const laneBottom = room.y + room.height * 0.8;
	const points: Point[] = [manifold, { x: laneX, y: manifold.y }];

	for (let lane = 0; lane < 5; lane += 1) {
		const y = laneTop + ((laneBottom - laneTop) * lane) / 4;
		points.push({ x: laneX, y });
		points.push({ x: room.x + room.width * (0.12 + zoneIndex * 0.02), y });
		points.push({ x: room.x + room.width * (0.88 - zoneIndex * 0.02), y });
	}

	points.push({ x: laneX, y: room.y + room.height });
	return { points };
}

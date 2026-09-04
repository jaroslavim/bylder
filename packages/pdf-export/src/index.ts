import { ProjectV1Schema, type ProjectV1 } from '@bylder/project-schema';

export type InstallationReport = {
	metadata: {
		title: string;
		preparedBy: string;
		generatedAt: string;
		units: 'SI';
	};
	heatLossSheet: {
		rooms: Array<{ roomId: string; roomName: string; heatLoss: number }>;
		totalHeatLoss: number;
	};
	loopManifoldSchedule: Array<{
		loopId: string;
		loopName: string;
		manifoldId: string;
		manifoldName: string;
		roomId: string;
		length: number;
		designFlow: number;
		calculatedHeatOutput: number;
	}>;
	layout: Array<{ floorId: string; floorName: string; roomId: string; roomName: string }>;
	warnings: ProjectV1['warnings'];
};

export function createInstallationReport(input: unknown): InstallationReport {
	const project = ProjectV1Schema.parse(input);
	const rooms = new Map(project.floors.flatMap((floor) => floor.rooms).map((room) => [room.id, room]));
	const manifolds = new Map(project.manifolds.map((manifold) => [manifold.id, manifold]));

	return {
		metadata: {
			title: project.export.projectTitle,
			preparedBy: project.export.preparedBy,
			generatedAt: project.export.generatedAt,
			units: project.export.units,
		},
		heatLossSheet: {
			rooms: [...project.heatingRooms]
				.sort((left, right) => left.roomId.localeCompare(right.roomId))
				.map((room) => ({ roomId: room.roomId, roomName: rooms.get(room.roomId)?.name ?? room.roomId, heatLoss: room.designHeatLoss })),
			totalHeatLoss: project.calculation.totalHeatLoss,
		},
		loopManifoldSchedule: [...project.loops]
			.sort((left, right) => left.id.localeCompare(right.id))
			.map((loop) => ({
				loopId: loop.id,
				loopName: loop.name,
				manifoldId: loop.manifoldId,
				manifoldName: manifolds.get(loop.manifoldId)?.name ?? loop.manifoldId,
				roomId: loop.roomId,
				length: loop.length,
				designFlow: loop.designFlow,
				calculatedHeatOutput: loop.calculatedHeatOutput,
			})),
		layout: project.floors.flatMap((floor) => floor.rooms.map((room) => ({ floorId: floor.id, floorName: floor.name, roomId: room.id, roomName: room.name })))
			.sort((left, right) => left.roomId.localeCompare(right.roomId)),
		warnings: [...project.warnings],
	};
}

import { migrateProject, type ProjectV1 } from '@bylder/project-schema';

export interface ProjectRepository {
	getProject(): Promise<ProjectV1>;
}

const localProject = migrateProject({
	version: 0,
	id: 'project-1',
	name: 'Example house',
	floors: [
		{
			id: 'floor-ground',
			name: 'Ground floor',
			elevation: 0,
			rooms: [
				{
					id: 'room-living', name: 'Living room', polygon: [{ x: 0, y: 0 }, { x: 5, y: 0 }, { x: 5, y: 4 }, { x: 0, y: 4 }], walls: [],
					components: [{ id: 'loop-living', position: { x: 2, y: 2 }, rotation: 0, discipline: 'heating', type: 'loop-terminal', props: { loopId: 'loop-1' } }],
				},
				{
					id: 'room-kitchen', name: 'Kitchen', polygon: [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 3 }, { x: 0, y: 3 }], walls: [],
					components: [{ id: 'loop-kitchen', position: { x: 2, y: 1.5 }, rotation: 0, discipline: 'heating', type: 'loop-terminal', props: { loopId: 'loop-2' } }],
				},
			],
		},
		{ id: 'floor-upper', name: 'Upper floor', elevation: 2.8, rooms: [] },
	],
});

export const localProjectRepository: ProjectRepository = {
	async getProject() {
		return localProject;
	},
};

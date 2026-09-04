import { z } from 'zod';

export const SCHEMA_VERSION = 0 as const;

export const CoordinateSchema = z.object({
	x: z.number().finite(),
	y: z.number().finite(),
});

export const RotationSchema = z.number().finite();

const IdSchema = z.string().min(1);

export const OpeningSchema = z.object({
	id: IdSchema,
	type: z.enum(['door', 'window']),
	wallId: IdSchema,
	offset: z.number().finite().nonnegative(),
	width: z.number().finite().positive(),
	height: z.number().finite().positive(),
});

export const WallSchema = z.object({
	id: IdSchema,
	start: CoordinateSchema,
	end: CoordinateSchema,
	thickness: z.number().finite().positive(),
	openings: z.array(OpeningSchema),
});

const HeatingManifoldPropsSchema = z.object({
	loopCount: z.number().int().positive(),
});

const HeatingLoopTerminalPropsSchema = z.object({
	loopId: IdSchema,
});

const ElectricalSocketPropsSchema = z.object({
	outletKind: z.enum(['single', 'double']),
});

const ElectricalSwitchPropsSchema = z.object({
	switchKind: z.enum(['single', 'double', 'two-way']),
});

const ElectricalLightPropsSchema = z.object({
	fixtureKind: z.enum(['ceiling', 'wall']),
});

const ElectricalJunctionBoxPropsSchema = z.object({});
const WaterFixturePropsSchema = z.object({
	fixtureKind: z.enum(['tap', 'sink', 'shower', 'toilet']),
});
const SewageDrainPropsSchema = z.object({
	fixtureKind: z.enum(['floor-drain', 'toilet']),
});

const ComponentBaseSchema = z.object({
	id: IdSchema,
	position: CoordinateSchema,
	rotation: RotationSchema,
});

export const ComponentSchema = z.union([
	ComponentBaseSchema.extend({
		discipline: z.literal('heating'),
		type: z.literal('manifold'),
		props: HeatingManifoldPropsSchema,
	}),
	ComponentBaseSchema.extend({
		discipline: z.literal('heating'),
		type: z.literal('loop-terminal'),
		props: HeatingLoopTerminalPropsSchema,
	}),
	ComponentBaseSchema.extend({
		discipline: z.literal('electrical'),
		type: z.literal('socket'),
		props: ElectricalSocketPropsSchema,
	}),
	ComponentBaseSchema.extend({
		discipline: z.literal('electrical'),
		type: z.literal('switch'),
		props: ElectricalSwitchPropsSchema,
	}),
	ComponentBaseSchema.extend({
		discipline: z.literal('electrical'),
		type: z.literal('light'),
		props: ElectricalLightPropsSchema,
	}),
	ComponentBaseSchema.extend({
		discipline: z.literal('electrical'),
		type: z.literal('junction-box'),
		props: ElectricalJunctionBoxPropsSchema,
	}),
	ComponentBaseSchema.extend({
		discipline: z.literal('water'),
		type: z.literal('fixture'),
		props: WaterFixturePropsSchema,
	}),
	ComponentBaseSchema.extend({
		discipline: z.literal('sewage'),
		type: z.literal('drain'),
		props: SewageDrainPropsSchema,
	}),
]);

export const RoomSchema = z.object({
	id: IdSchema,
	name: z.string().min(1),
	polygon: z.array(CoordinateSchema).min(3),
	walls: z.array(WallSchema),
	components: z.array(ComponentSchema),
});

export const FloorSchema = z.object({
	id: IdSchema,
	name: z.string().min(1),
	elevation: z.number().finite(),
	rooms: z.array(RoomSchema),
});

export const ProjectSchema = z.object({
	version: z.literal(SCHEMA_VERSION),
	id: IdSchema,
	name: z.string().min(1),
	floors: z.array(FloorSchema),
});

export type Coordinate = z.infer<typeof CoordinateSchema>;
export type Opening = z.infer<typeof OpeningSchema>;
export type Wall = z.infer<typeof WallSchema>;
export type Component = z.infer<typeof ComponentSchema>;
export type Room = z.infer<typeof RoomSchema>;
export type Floor = z.infer<typeof FloorSchema>;
export type Project = z.infer<typeof ProjectSchema>;

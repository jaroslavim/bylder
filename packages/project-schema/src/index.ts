import { z } from 'zod';

export const V0_SCHEMA_VERSION = 0 as const;
export const V1_SCHEMA_VERSION = 1 as const;
export const SCHEMA_VERSION = 2 as const;
export const PROJECT_FILE_VERSION = SCHEMA_VERSION;

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

export const ProjectV0Schema = z.object({
	version: z.literal(V0_SCHEMA_VERSION),
	id: IdSchema,
	name: z.string().min(1),
	floors: z.array(FloorSchema),
});

export const ConstructionLayerSchema = z.object({
	id: IdSchema,
	name: z.string().min(1),
	thickness: z.number().finite().nonnegative(),
	conductivity: z.number().finite().positive(),
});

export const DesignConditionsSchema = z.object({
	indoorTemperature: z.number().finite(),
	outdoorTemperature: z.number().finite(),
	flowTemperature: z.number().finite(),
	returnTemperature: z.number().finite(),
});

export const HeatingRoomSchema = z.object({
	roomId: IdSchema,
	constructionLayers: z.array(ConstructionLayerSchema),
	designConditions: DesignConditionsSchema,
	designHeatLoss: z.number().finite().nonnegative(),
});

export const HeatingManifoldSchema = z.object({
	id: IdSchema,
	name: z.string().min(1),
	floorId: IdSchema,
	roomId: IdSchema,
	loopIds: z.array(IdSchema),
});

export const HeatingLoopSchema = z.object({
	id: IdSchema,
	name: z.string().min(1),
	roomId: IdSchema,
	manifoldId: IdSchema,
	length: z.number().finite().positive(),
	designFlow: z.number().finite().nonnegative(),
	calculatedHeatOutput: z.number().finite().nonnegative(),
});

export const CalculationResultSchema = z.object({
	calculatedAt: z.string().min(1),
	totalHeatLoss: z.number().finite().nonnegative(),
	roomHeatLoss: z.record(IdSchema, z.number().finite().nonnegative()),
});

export const WarningSchema = z.object({
	code: IdSchema,
	message: z.string().min(1),
	severity: z.enum(['info', 'warning', 'error']),
});

export const ExportMetadataSchema = z.object({
	projectTitle: z.string().min(1),
	preparedBy: z.string().min(1),
	generatedAt: z.string().min(1),
	units: z.literal('SI'),
});

export const ProjectV1Schema = z.object({
	version: z.literal(V1_SCHEMA_VERSION),
	id: IdSchema,
	name: z.string().min(1),
	floors: z.array(FloorSchema),
	heatingRooms: z.array(HeatingRoomSchema),
	manifolds: z.array(HeatingManifoldSchema),
	loops: z.array(HeatingLoopSchema),
	calculation: CalculationResultSchema,
	warnings: z.array(WarningSchema),
	export: ExportMetadataSchema,
});

const JsonValueSchema: z.ZodType<unknown> = z.lazy(() => z.union([
	z.string(), z.number().finite(), z.boolean(), z.null(),
	z.array(JsonValueSchema), z.record(JsonValueSchema),
]));

export const DashboardDataSchema = z.object({
	heating: z.record(JsonValueSchema),
	electrical: z.record(JsonValueSchema),
	water: z.record(JsonValueSchema),
	sewage: z.record(JsonValueSchema),
	calculations: z.record(JsonValueSchema),
	reports: z.record(JsonValueSchema),
	settings: z.record(JsonValueSchema),
});

export const ImportedSourceMetadataSchema = z.object({
	id: IdSchema,
	name: z.string().min(1),
	mediaType: z.string().min(1),
	importedAt: z.string().min(1),
	checksum: z.string().min(1).optional(),
	metadata: z.record(JsonValueSchema),
});

export const ProjectV2Schema = ProjectV1Schema.extend({
	version: z.literal(PROJECT_FILE_VERSION),
	dashboardData: DashboardDataSchema,
	importedSources: z.array(ImportedSourceMetadataSchema),
});

// Accepts persisted files from every supported version. Use ProjectV1Schema for latest-only APIs.
export const ProjectSchema = z.union([ProjectV0Schema, ProjectV1Schema, ProjectV2Schema]);

export type Coordinate = z.infer<typeof CoordinateSchema>;
export type Opening = z.infer<typeof OpeningSchema>;
export type Wall = z.infer<typeof WallSchema>;
export type Component = z.infer<typeof ComponentSchema>;
export type Room = z.infer<typeof RoomSchema>;
export type Floor = z.infer<typeof FloorSchema>;
export type ProjectV0 = z.infer<typeof ProjectV0Schema>;
export type DashboardData = z.infer<typeof DashboardDataSchema>;
export type ImportedSourceMetadata = z.infer<typeof ImportedSourceMetadataSchema>;
export type ProjectV2 = z.infer<typeof ProjectV2Schema>;
export type ProjectV1 = z.infer<typeof ProjectV1Schema> | (Omit<ProjectV2, 'version'> & { version: 1 | 2 });
export type Project = ProjectV2;

export function migrateProject(input: unknown): ProjectV2 {
	const parsed = ProjectSchema.parse(input);
	if (parsed.version === PROJECT_FILE_VERSION) {
		return parsed;
	}

	const rooms = parsed.floors.flatMap((floor) => floor.rooms);
	return ProjectV2Schema.parse({
		...parsed,
		version: PROJECT_FILE_VERSION,
		heatingRooms: rooms.map((room) => ({
			roomId: room.id,
			constructionLayers: [],
			designConditions: {
				indoorTemperature: 20,
				outdoorTemperature: -10,
				flowTemperature: 35,
				returnTemperature: 28,
			},
			designHeatLoss: 0,
		})),
		manifolds: [],
		loops: [],
		calculation: { calculatedAt: '1970-01-01T00:00:00.000Z', totalHeatLoss: 0, roomHeatLoss: {} },
		warnings: [],
		export: { projectTitle: parsed.name, preparedBy: 'Bylder', generatedAt: '1970-01-01T00:00:00.000Z', units: 'SI' },
		dashboardData: {
			heating: {}, electrical: {}, water: {}, sewage: {}, calculations: {}, reports: {}, settings: {},
		},
		importedSources: [],
	});
}

function sortJson(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(sortJson);
	if (value !== null && typeof value === 'object') {
		return Object.fromEntries(Object.keys(value as Record<string, unknown>).sort().map((key) => [key, sortJson((value as Record<string, unknown>)[key])]));
	}
	return value;
}

export function serializeProject(input: unknown): string {
	return JSON.stringify(sortJson(ProjectV2Schema.parse(migrateProject(input))), null, 2) + '\n';
}

export function parseProject(fileText: string): ProjectV2 {
	let value: unknown;
	try {
		value = JSON.parse(fileText);
	} catch {
		throw new Error('Invalid project file JSON');
	}
	return migrateProject(value);
}

export const exportProject = serializeProject;
export const importProject = parseProject;

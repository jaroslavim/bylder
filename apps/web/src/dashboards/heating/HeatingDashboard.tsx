import { zodResolver } from '@mantine/form';
import {
	Alert,
	Badge,
	Button,
	Card,
	Divider,
	Grid,
	Group,
	NumberInput,
	Paper,
	SimpleGrid,
	Stack,
	Table,
	Tabs,
	Text,
	Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { localProjectRepository, type ProjectRepository } from '../../services/projectRepository';
import { useHeatingStore } from '../../store';

export type HeatingWarning = { type: 'loop-length' | 'spacing'; severity: 'warning' | 'error'; message: string; room: string };

type RoomMetric = { id: string; name: string; area: number; heatLoss: number; wattsPerSquareMeter: number; loops: number; status: 'ready' | 'warning' };

const conditionsSchema = z.object({
	designIndoor: z.number().min(18, 'Indoor design temperature must be at least 18 C').max(25, 'Indoor design temperature must be at most 25 C'),
	designOutdoor: z.number().min(-30, 'Outdoor design temperature is too high').max(5, 'Outdoor design temperature is too low'),
	supplyTemperature: z.number().min(25, 'Supply temperature must be at least 25 C').max(50, 'Supply temperature must be at most 50 C'),
});

function getArea(room: { polygon: { x: number; y: number }[] }) {
	return Math.abs(room.polygon.reduce((sum, point, index, points) => sum + point.x * points[(index + 1) % points.length].y - points[(index + 1) % points.length].x * point.y, 0)) / 2;
}

function metricsForFloor(floor: { rooms: { id: string; name: string; polygon: { x: number; y: number }[]; components: { type: string }[] }[] }): RoomMetric[] {
	return floor.rooms.map((room, index) => {
		const area = getArea(room);
		const heatLoss = Math.round(area * (index === 0 ? 48 : 42));
		return { id: room.id, name: room.name, area, heatLoss, wattsPerSquareMeter: Math.round(heatLoss / area), loops: room.components.filter((component) => component.type === 'loop-terminal').length, status: index === 0 ? 'warning' : 'ready' };
	});
}

export function HeatingDashboard({ repository = localProjectRepository }: { repository?: ProjectRepository }) {
	const [project, setProject] = useState<Awaited<ReturnType<ProjectRepository['getProject']>> | null>(null);
	const [status, setStatus] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading');
	const [activeFloor, setActiveFloor] = useState<string>();
	const conditions = useHeatingStore();
	const form = useForm({
		mode: 'uncontrolled',
		initialValues: { designIndoor: conditions.designIndoor, designOutdoor: conditions.designOutdoor, supplyTemperature: conditions.supplyTemperature },
		validate: zodResolver(conditionsSchema),
	});

	useEffect(() => {
		let mounted = true;
		repository.getProject().then((loadedProject) => {
			if (!mounted) return;
			setProject(loadedProject);
			setActiveFloor(loadedProject.floors[0]?.id);
			setStatus(loadedProject.floors.length ? 'ready' : 'empty');
		}).catch(() => mounted && setStatus('error'));
		return () => { mounted = false; };
	}, [repository]);

	const floor = project?.floors.find((item) => item.id === activeFloor) ?? project?.floors[0];
	const rooms = floor ? metricsForFloor(floor) : [];
	const warnings: HeatingWarning[] = rooms.filter((room) => room.status === 'warning').map((room) => ({ type: 'loop-length', severity: 'warning', room: room.name, message: 'Loop length is close to the 100 m planning limit.' }));

	function saveConditions(values: typeof form.values) {
		conditions.setDesignConditions(values);
	}

	if (status === 'loading') return <Paper p="xl"><Text>Loading heating project...</Text></Paper>;
	if (status === 'error') return <Alert color="red" title="Project unavailable">The local project could not be loaded. Try refreshing the dashboard.</Alert>;
	if (status === 'empty') return <Paper p="xl"><Stack gap="xs"><Title order={2}>No floors yet</Title><Text c="dimmed">Open the heating canvas to draw the first room.</Text><Button component={Link} to="/heating/canvas">Open heating canvas</Button></Stack></Paper>;

	return (
		<Stack className="page-content heating-dashboard" gap="lg">
			<Group justify="space-between" align="flex-start">
				<div><Text className="eyebrow">Dashboard / HTG-01</Text><Title order={1}>Floor heating</Title><Group gap="xs" mt={4}><Text c="dimmed">{project?.name}</Text><Badge component="span" variant="dot" color="teal">LOCAL MODE</Badge></Group></div>
				<Group><Button variant="default">Recalculate</Button><Button variant="default">Export report</Button><Button component={Link} to="/heating/canvas">Open canvas</Button></Group>
			</Group>

			<Tabs value={floor?.id} onChange={(value) => setActiveFloor(value ?? undefined)} aria-label="Floor selection">
				<Tabs.List>{project?.floors.map((item) => <Tabs.Tab key={item.id} value={item.id}>{item.name}</Tabs.Tab>)}</Tabs.List>
			</Tabs>

			<Grid align="stretch">
				<Grid.Col span={{ base: 12, md: 8 }}><Stack gap="md"><Group justify="space-between"><div><Title order={2}>Rooms</Title><Text c="dimmed" size="sm">Heat-loss demand at current design conditions</Text></div><Button component={Link} to="/heating/canvas" variant="subtle" size="sm">Edit rooms</Button></Group>
					<Paper withBorder><Table.ScrollContainer minWidth={560}><Table verticalSpacing="md" highlightOnHover><Table.Thead><Table.Tr><Table.Th>Room</Table.Th><Table.Th>Area</Table.Th><Table.Th>Heat loss</Table.Th><Table.Th>Demand</Table.Th><Table.Th>Loops</Table.Th></Table.Tr></Table.Thead><Table.Tbody>{rooms.map((room) => <Table.Tr key={room.id}><Table.Td><Text fw={600}>{room.name}</Text><Text size="xs" c="dimmed">{room.status === 'warning' ? 'Review loop length' : 'Ready'}</Text></Table.Td><Table.Td>{room.area.toFixed(1)} m2</Table.Td><Table.Td>{room.heatLoss} W</Table.Td><Table.Td>{room.wattsPerSquareMeter} W/m2</Table.Td><Table.Td>{room.loops}</Table.Td></Table.Tr>)}</Table.Tbody></Table></Table.ScrollContainer></Paper>
				</Stack></Grid.Col>
				<Grid.Col span={{ base: 12, md: 4 }}><Card withBorder h="100%"><Stack><Group justify="space-between"><div><Text className="eyebrow">Distribution</Text><Title order={3}>Manifold summary</Title></div><Badge color="teal">2 / 2 loops</Badge></Group><SimpleGrid cols={2}><div><Text size="xs" c="dimmed">Total demand</Text><Text fw={700} size="xl">{rooms.reduce((sum, room) => sum + room.heatLoss, 0)} W</Text></div><div><Text size="xs" c="dimmed">Pipe planned</Text><Text fw={700} size="xl">164 m</Text></div></SimpleGrid><Divider /><Text size="sm">Manifold M-01</Text><Text size="xs" c="dimmed">Ground floor · 2 circuits · 16 mm pipe · 150 mm spacing</Text><Button component={Link} to="/heating/canvas?focus=manifold" variant="light" fullWidth>View on canvas</Button></Stack></Card></Grid.Col>
			</Grid>

			{warnings.length > 0 && <Stack gap="xs"><Title order={2}>Warnings</Title>{warnings.map((warning) => <Alert key={`${warning.type}-${warning.room}`} color={warning.severity === 'error' ? 'red' : 'yellow'} title={`${warning.room}: ${warning.type === 'loop-length' ? 'Loop length' : 'Spacing'}`}>{warning.message}</Alert>)}</Stack>}

			<Paper withBorder p="lg"><Group justify="space-between" align="flex-start"><div><Text className="eyebrow">Calculation inputs</Text><Title order={2}>Design conditions</Title><Text c="dimmed" size="sm">Used for the next heat-loss calculation.</Text></div><Text size="sm" c="dimmed">Celsius</Text></Group><form onSubmit={form.onSubmit(saveConditions)}><SimpleGrid cols={{ base: 1, sm: 3 }} mt="md"><NumberInput label="Indoor design" description="Target room temperature" suffix=" C" min={18} max={25} {...form.getInputProps('designIndoor')} /><NumberInput label="Outdoor design" description="Winter design temperature" suffix=" C" min={-30} max={5} {...form.getInputProps('designOutdoor')} /><NumberInput label="Supply temperature" description="Manifold supply" suffix=" C" min={25} max={50} {...form.getInputProps('supplyTemperature')} /></SimpleGrid><Group justify="flex-end" mt="md"><Button type="submit">Apply conditions</Button></Group></form></Paper>
		</Stack>
	);
}

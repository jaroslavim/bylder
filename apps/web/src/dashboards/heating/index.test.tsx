import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { afterEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { HeatingDashboard } from './index';
import type { ProjectRepository } from '../../services/projectRepository';
import { migrateProject, type ProjectV1 } from '@bylder/project-schema';

const project: ProjectV1 = migrateProject({ version: 0, id: 'test', name: 'Test house', floors: [{ id: 'floor', name: 'Ground floor', elevation: 0, rooms: [{ id: 'room', name: 'Office', polygon: [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 3 }, { x: 0, y: 3 }], walls: [], components: [] }] }] });
const repository: ProjectRepository = { getProject: async () => project };
const renderDashboard = (value: ProjectRepository = repository) => render(<MantineProvider><MemoryRouter><HeatingDashboard repository={value} /></MemoryRouter></MantineProvider>);

describe('HeatingDashboard', () => {
	afterEach(() => cleanup());

	it('renders room metrics, manifold summary, and typed warnings', async () => {
		renderDashboard();
		expect(await screen.findByRole('heading', { name: 'Rooms' })).toBeTruthy();
		expect(screen.getByText('Office')).toBeTruthy();
		expect(screen.getByRole('heading', { name: 'Manifold summary' })).toBeTruthy();
		expect(screen.getByText('Office: Loop length')).toBeTruthy();
	});

	it('shows repository error and empty states', async () => {
		const failing: ProjectRepository = { getProject: async () => { throw new Error('offline'); } };
		renderDashboard(failing);
		expect(await screen.findByText('Project unavailable')).toBeTruthy();
		cleanup();
		const empty: ProjectRepository = { getProject: async () => ({ ...project, floors: [] }) };
		renderDashboard(empty);
		expect(await screen.findByRole('heading', { name: 'No floors yet' })).toBeTruthy();
	});

	it('shows a loading state while the repository resolves', () => {
		const loading: ProjectRepository = { getProject: () => new Promise(() => undefined) };
		renderDashboard(loading);
		expect(screen.getByText('Loading heating project...')).toBeTruthy();
	});

	it('validates design conditions before applying them', async () => {
		renderDashboard();
		await screen.findByRole('heading', { name: 'Design conditions' });
		const indoor = screen.getByRole('textbox', { name: /Indoor design/i });
		fireEvent.change(indoor, { target: { value: '30' } });
		fireEvent.click(screen.getByRole('button', { name: 'Apply conditions' }));
		expect(await screen.findByText('Indoor design temperature must be at most 25 C')).toBeTruthy();
	});

	it('links dashboard actions into the heating canvas', async () => {
		renderDashboard();
		await waitFor(() => expect(screen.getByRole('link', { name: 'Open canvas' }).getAttribute('href')).toBe('/heating/canvas'));
		expect(screen.getByRole('link', { name: 'View on canvas' }).getAttribute('href')).toBe('/heating/canvas?focus=manifold');
	});
});
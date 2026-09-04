import { describe, expect, it } from 'vitest';
import { localProjectRepository } from './projectRepository';

describe('localProjectRepository project files', () => {
	it('saves, exports, imports, and opens validated project files locally', async () => {
		const original = await localProjectRepository.getProject();
		const saved = await localProjectRepository.save!({ ...original, name: 'Saved house' });
		const exported = await localProjectRepository.export!();

		expect(saved.name).toBe('Saved house');
		expect(exported).toContain('"version": 2');
		expect((await localProjectRepository.getProject()).name).toBe('Saved house');

		const imported = await localProjectRepository.import!(exported);
		expect(imported).toEqual(saved);
		const opened = await localProjectRepository.open!(exported);
		expect(opened).toEqual(saved);
	});

	it('rejects invalid imported files', async () => {
		await expect(localProjectRepository.import!('{')).rejects.toThrow('Invalid project file JSON');
	});
});
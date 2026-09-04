import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark';

interface UiState {
	theme: Theme;
	toggleTheme: () => void;
}

interface HeatingState {
	designIndoor: number;
	designOutdoor: number;
	supplyTemperature: number;
	setDesignConditions: (conditions: Pick<HeatingState, 'designIndoor' | 'designOutdoor' | 'supplyTemperature'>) => void;
}

export const useUiStore = create<UiState>()(
	persist(
		(set) => ({
			theme: 'light',
			toggleTheme: () =>
				set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
		}),
		{ name: 'bylder-ui' },
	),
);

export const useHeatingStore = create<HeatingState>()((set) => ({
	designIndoor: 21,
	designOutdoor: -12,
	supplyTemperature: 35,
	setDesignConditions: (conditions) => set(conditions),
}));

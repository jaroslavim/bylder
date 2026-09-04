import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { App } from './App';
import { useUiStore } from './store';

function renderApp() {
  return render(
    <MantineProvider>
      <App />
    </MantineProvider>,
  );
}

describe('Phase 0 app shell', () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    window.history.pushState({}, '', '/');
    useUiStore.setState({ theme: 'light' });
  });

  it('navigates between the persistent discipline routes', () => {
    renderApp();

    fireEvent.click(screen.getByRole('link', { name: 'Electrical' }));

    expect(screen.getByRole('heading', { name: 'Electrical' })).toBeTruthy();
    expect(window.location.pathname).toBe('/electrical');
  });

  it('toggles the theme preference', () => {
    renderApp();

    fireEvent.click(screen.getByRole('button', { name: 'Toggle color theme' }));

    expect(useUiStore.getState().theme).toBe('dark');
    expect(screen.getByRole('button', { name: 'Toggle color theme' }).textContent).toContain('Light theme');
  });
});

import React from 'react';
import ReactDOM from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';
import { App } from './App';
import { useUiStore } from './store';

function Root() {
  const theme = useUiStore((state) => state.theme);

  return (
    <MantineProvider defaultColorScheme={theme} forceColorScheme={theme}>
      <App />
    </MantineProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);

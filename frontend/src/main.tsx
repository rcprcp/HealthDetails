import '@mantine/core/styles.css';
import '@mantine/charts/styles.css';
import './styles.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MantineProvider, createTheme } from '@mantine/core';
import { HashRouter } from 'react-router-dom';
import { App } from './App';

const theme = createTheme({
  primaryColor: 'teal',
  defaultRadius: 'md',
  fontFamily:
    'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  headings: {
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontWeight: '700',
  },
});

const container = document.getElementById('root');

if (!container) {
  throw new Error('Root element not found');
}

createRoot(container).render(
  <StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="auto">
      <HashRouter>
        <App />
      </HashRouter>
    </MantineProvider>
  </StrictMode>,
);

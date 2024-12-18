import React from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import {ThemeProvider} from 'styled-components';
import {GlobalStyles} from './styles/GlobalStyles';
import {theme} from './styles/theme';

const container = document.getElementById('root');
if (!container) throw new Error('Failed to find the root element');
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <GlobalStyles />
      <App />
    </ThemeProvider>
  </React.StrictMode>,
);

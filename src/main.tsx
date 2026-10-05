import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/ovo';
import '@fontsource/cinzel-decorative/700.css';
import '@fontsource/sacramento';
import { App } from './ui/App';
import './ui/page.css';
import './ui/styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

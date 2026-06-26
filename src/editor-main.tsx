import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { EditorShell } from './editor/EditorShell';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <EditorShell />
  </StrictMode>,
);

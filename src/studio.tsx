import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './studio.css';
import { App } from './studio/App.js';

const container = document.getElementById('studioMount');
if (container) {
    createRoot(container).render(
        <StrictMode>
            <App />
        </StrictMode>
    );
}

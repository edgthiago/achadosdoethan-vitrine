import React from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';
import './conversion.css';

const initialProductId = document.getElementById('root')?.dataset.product || null;
const root = document.getElementById('root');
if (root.hasChildNodes() && root.querySelector('.wrap')) {
  hydrateRoot(root, <App initialProductId={initialProductId}/>);
} else {
  createRoot(root).render(<App initialProductId={initialProductId}/>);
}

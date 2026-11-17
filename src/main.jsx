import React from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';
import './conversion.css';

const root = document.getElementById('root');
const initialProductId = root?.dataset.product || null;
const notFound = root?.dataset.notFound === 'true';
if (root.hasChildNodes() && root.querySelector('.wrap')) {
  hydrateRoot(root, <App initialProductId={initialProductId} notFound={notFound}/>);
} else {
  createRoot(root).render(<App initialProductId={initialProductId} notFound={notFound}/>);
}

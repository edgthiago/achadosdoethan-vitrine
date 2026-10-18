import React from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

const root = document.getElementById('root');
if (root.hasChildNodes() && root.querySelector('.wrap')) {
  hydrateRoot(root, <App/>);
} else {
  createRoot(root).render(<App/>);
}

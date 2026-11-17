import React from 'react';
import { renderToString } from 'react-dom/server';
import App from './App.jsx';

export function render(initialProductId = null, notFound = false) {
  return renderToString(<App initialProductId={initialProductId} notFound={notFound}/>);
}

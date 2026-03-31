/**
 * Application entry point for the React Vite SPA example.
 *
 * Mounts the root {@link App} component into the `#root` DOM element.
 *
 * @module main
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootEl = document.getElementById('root');

if (rootEl === null) {
  throw new Error('Root element #root not found in the document.');
}

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

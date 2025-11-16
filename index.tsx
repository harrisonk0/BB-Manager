/**
 * @file index.tsx
 * @description This is the main entry point for the React application.
 * It finds the root DOM element and renders the main App component into it.
 * The React.StrictMode wrapper is used to highlight potential problems in the app during development.
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './src/index.css'; // Import the new global CSS file

// Find the root HTML element where the React app will be mounted.
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Create a React root for the main DOM element.
const root = ReactDOM.createRoot(rootElement);
// Render the main App component.
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
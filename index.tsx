/**
 * @file index.tsx
 * @description This is the main entry point for the React application.
 * It finds the root DOM element and renders the main App component into it.
 * The React.StrictMode wrapper is used to highlight potential problems in the app during development.
 */
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { captureSetupLink } from "./services/portal";
import { NativeAppProvider } from "./components/ui";
import { KeyboardViewport } from "./components/shell/KeyboardViewport";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./index.css"; // Utilities load before semantic design-system overrides
import "./styles/design-system.css";
import "./styles/application-states.css";

// Find the root HTML element where the React app will be mounted.
const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Capture and scrub setup credentials exactly once, before StrictMode and Framework7.
const initialSetup = captureSetupLink();

// Create a React root for the main DOM element.
const root = ReactDOM.createRoot(rootElement);
// Render the main App component.
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <NativeAppProvider>
        <KeyboardViewport />
        <App initialSetup={initialSetup} />
      </NativeAppProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);

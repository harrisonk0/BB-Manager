# 1. Project Structure

This document provides a detailed breakdown of the file and folder structure for the BB Manager application. The project is organized to separate concerns, making it easier to navigate, understand, and maintain.

```
/
├── components/         # Reusable React components
├── docs/               # All project documentation files
├── services/           # Business logic, API calls, and data management
├── App.tsx             # Root React component
├── firestore.rules     # Security rules for the Firestore database
├── index.html          # Main HTML entry point
├── index.tsx           # React DOM renderer
├── manifest.json       # PWA manifest
├── metadata.json       # AI Studio project metadata
├── sw.js               # Service Worker
├── types.ts            # Centralized TypeScript type definitions
└── README.md           # Main project README
```

---

### Root Directory

| File / Folder     | Description                                                                                                                                                                                             |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/`     | Contains all React components that make up the user interface. Each component is responsible for a specific piece of the UI, such as a page, a form, or a button. See the Component Library documentation for more details. |
| `docs/`           | Contains all markdown documentation files for the project, including this one.                                                                                                                            |
| `services/`       | This directory holds the application's business logic. It handles all data fetching, manipulation, and interaction with external services like Firebase and the local IndexedDB. See the Data & Services documentation for details. |
| `App.tsx`         | The main entry point for the React application. It manages global state (like the current user and active section), handles routing between pages, and orchestrates the initial data loading and offline synchronization. |
| `firestore.rules` | The security rules for the Firestore database. These are deployed to Firebase to protect your data from unauthorized access.                                                                               |
| `index.html`      | The single HTML file for the application. It sets up the root DOM element for React, includes the Tailwind CSS CDN, defines the **Import Map** for buildless dependency management, and registers the Service Worker. |
| `index.tsx`       | This file takes the root `App` component and renders it into the DOM.                                                                                                                                       |
| `manifest.json`   | The Web App Manifest file. It provides the browser with metadata about the PWA, such as its name, icons, and theme colors, which is essential for the "Add to Home Screen" functionality.                 |
| `metadata.json`   | Configuration file for the Google AI Studio environment, defining the project name and description.                                                                                                        |
| `sw.js`           | The **Service Worker** file. It's the heart of the PWA's offline capabilities, intercepting network requests to serve cached content when the user is offline. See the PWA & Offline documentation for details. |
| `types.ts`        | A central file for all TypeScript type definitions. Defining types here ensures consistency across the entire application and improves code quality and maintainability. See the Data Types documentation for details. |
| `README.md`       | The main project README file, which serves as the entry point to this documentation.                                                                                                                     |

### `/components` Directory

This directory contains all UI elements of the application.

-   **Page Components**: `HomePage.tsx`, `WeeklyMarksPage.tsx`, `DashboardPage.tsx`, `AuditLogPage.tsx`, `SettingsPage.tsx`, `HelpPage.tsx`, `LoginPage.tsx`, `SectionSelectPage.tsx`, `SignupPage.tsx`. These are top-level components that represent a full view or "page" within the app.
-   **UI Components**: `Header.tsx`, `Modal.tsx`, `Icons.tsx`. These are smaller, reusable components used across multiple pages.
-   **Form Components**: `BoyForm.tsx`. These components are specifically for handling user input.
-   **Feedback Components**: `SkeletonLoaders.tsx`, `Toast.tsx`. These are used to improve the user experience during data loading states and for action feedback.
-   **Visualization Components**: `BarChart.tsx`. Custom components for displaying data graphically.

### `/services` Directory

This directory contains the application's business logic and data interaction layers.

-   **`db.ts`**: The main data abstraction layer, unifying interactions with Firestore and IndexedDB.
-   **`offlineDb.ts`**: A low-level wrapper for IndexedDB operations.
-   **`firebase.ts`**: Handles Firebase SDK initialization and provides instances of Firestore and Auth.
-   **`settings.ts`**: Manages section-specific application settings.
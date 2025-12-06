# 1. Project Structure

This document provides a detailed breakdown of the file and folder structure for the BB Manager application. The project is organized to separate concerns, making it easier to navigate, understand, and maintain.

```
/
├── components/         # Reusable React components
├── docs/               # All project documentation files
├── hooks/              # Custom React hooks for reusable logic
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
| `hooks/`          | Contains custom React hooks (`useToastNotifications`, `useAuthAndRole`, `useSectionManagement`, `useAppData`, `useUnsavedChangesProtection`) that encapsulate reusable stateful logic. |
| `services/`       | This directory holds the application's business logic. It handles all data fetching, manipulation, and interaction with external services like Supabase and the local IndexedDB. It also manages user roles and invite codes. See the Data & Services documentation for details. |
| `App.tsx`         | The main entry point for the React application. It orchestrates global state (current user, user role, active section, data, settings), handles routing, initial data loading, offline synchronization, and the global toast notification system. It also integrates custom hooks for managing these concerns. |
| (removed) `firestore.rules` | Previously tracked Firestore security rules; Supabase now uses Row Level Security policies for protection. |
| `index.html`      | The single HTML file for the application. It sets up the root DOM element for React, includes the Tailwind CSS CDN, defines the **Import Map** for buildless dependency management, and registers the Service Worker. |
| `index.tsx`       | This file takes the root `App` component and renders it into the DOM.                                                                                                                                       |
| `manifest.json`   | The Web App Manifest file. It provides the browser with metadata about the PWA, such as its name, icons, and theme colors, which is essential for the "Add to Home Screen" functionality.                 |
| `metadata.json`   | Configuration file for the Google AI Studio environment, defining the project name and description.                                                                                                        |
| `sw.js`           | The **Service Worker** file. It's the heart of the PWA's offline capabilities, intercepting network requests to serve cached content when the user is offline. See the PWA & Offline documentation for details. |
| `types.ts`        | A central file for all TypeScript type definitions, including core data models (`Boy`, `Mark`, `AuditLog`, `InviteCode`, `SectionSettings`), enumerated types (`Section`, `UserRole`, `AuditLogActionType`), and UI-specific types. Defining types here ensures consistency across the entire application and improves code quality and maintainability. See the Data Types documentation for details. |
| `README.md`       | The main project README file, which serves as the entry point to this documentation.                                                                                                                     |

### `/components` Directory

This directory contains all UI elements of the application.

-   **Page Components**: `HomePage.tsx`, `WeeklyMarksPage.tsx`, `DashboardPage.tsx`, `AuditLogPage.tsx`, `SettingsPage.tsx`, `GlobalSettingsPage.tsx`, `AccountSettingsPage.tsx`, `HelpPage.tsx`, `LoginPage.tsx`, `SectionSelectPage.tsx`, `SignupPage.tsx`. These are top-level components that represent a full view or "page" within the app.
-   **UI Components**: `Header.tsx`, `Modal.tsx`, `Icons.tsx`, `DatePicker.tsx`. These are smaller, reusable components used across multiple pages.
-   **Form Components**: `BoyForm.tsx`. These components are specifically for handling user input.
-   **Feedback Components**: `SkeletonLoaders.tsx`, `Toast.tsx`. These are used to improve the user experience during data loading states and for action feedback.
-   **Visualization Components**: `BarChart.tsx`. Custom components for displaying data graphically.

### `/services` Directory

This directory contains the application's business logic and data interaction layers.

-   **`db.ts`**: The main data abstraction layer, unifying interactions with Supabase and IndexedDB, and handling synchronization. It also manages user roles and invite codes.
-   **`offlineDb.ts`**: A low-level wrapper for IndexedDB operations, including managing the `pending_writes` queue, and now also caching user roles.
-   **`supabaseClient.ts`**: Handles Supabase client initialization and provides a shared instance for Auth and database access.
-   **`settings.ts`**: Manages section-specific application settings.
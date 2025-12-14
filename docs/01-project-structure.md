# 1. Project Structure

This document provides a detailed breakdown of the file and folder structure for the BB Manager application. The project is organized to separate concerns, making it easier to navigate, understand, and maintain.

```
/
├── components/         # React components (pages + UI)
├── docs/               # Documentation (deep dives + runbooks)
├── hooks/              # Custom React hooks
├── services/           # Supabase client + data services
├── src/                # Global styles/assets
├── supabase/           # Supabase CLI project (config + migrations)
├── AGENTS.md           # Repo rules and operational guidance
├── ARCHITECTURE.md     # Canonical system model
├── App.tsx             # App orchestrator / view state
├── index.html          # HTML shell (mounts React)
├── index.tsx           # React entry point
├── server.js           # Optional static server (SPA fallback)
├── Dockerfile          # Container build + static serving
├── vercel.json         # SPA rewrites for Vercel
├── vite.config.ts      # Vite config (aliases, plugins)
├── tsconfig.json       # TypeScript config
├── tailwind.config.js  # Tailwind config
├── postcss.config.js   # PostCSS config
├── package.json        # Dependencies and scripts
├── types.ts            # Shared TypeScript types
└── README.md           # Project overview / doc index
```

---

### Root Directory

| File / Folder     | Description                                                                                              |
| ----------------- | ------------------------------------------------------------------------------------------------------- |
| `components/`     | Contains all React components that make up the user interface. See [`docs/05-component-library.md`](./05-component-library.md). |
| `docs/`           | Contains all markdown documentation files for the project, including this one.                                                                |
| `hooks/`          | Contains custom React hooks (`useToastNotifications`, `useAuthAndRole`, `useSectionManagement`, `useAppData`, `useUnsavedChangesProtection`) that encapsulate reusable stateful logic. |
| `services/`       | The data/service layer for Supabase access. See [`docs/06-data-and-services.md`](./06-data-and-services.md). |
| `supabase/`       | Supabase CLI project containing `config.toml` and `migrations/` (authoritative schema/permissions history). See [`docs/09-database-and-migrations.md`](./09-database-and-migrations.md). |
| `AGENTS.md`       | Repo rules and operational guidance (human + agent guardrails). See [`AGENTS.md`](../AGENTS.md). |
| `ARCHITECTURE.md` | Canonical system model (components, data flow, invariants, trade-offs). See [`ARCHITECTURE.md`](../ARCHITECTURE.md). |
| `App.tsx`         | Orchestrates auth gating, section selection, view routing, data loading, and global UI state. |
| `index.html`      | HTML shell with the root element; loads `index.tsx`. > TODO: Confirm whether the import map is still required under Vite. |
| `index.tsx`       | This file takes the root `App` component and renders it into the DOM.                                                                         |
| `metadata.json`   | Tooling metadata file. > TODO: Document which tool/environment consumes this and whether it is required. |
| `types.ts`        | Central TypeScript type definitions. See [`docs/08-types.md`](./08-types.md). |
| `README.md`       | The main project README file, which serves as the entry point to this documentation.                                                          |

### `/components` Directory

This directory contains all UI elements of the application.

-   **Page Components**: `HomePage.tsx`, `WeeklyMarksPage.tsx`, `DashboardPage.tsx`, `AuditLogPage.tsx`, `SettingsPage.tsx`, `GlobalSettingsPage.tsx`, `AccountSettingsPage.tsx`, `HelpPage.tsx`, `LoginPage.tsx`, `SectionSelectPage.tsx`, `SignupPage.tsx`. These are top-level components that represent a full view or "page" within the app.
-   **UI Components**: `Header.tsx`, `Modal.tsx`, `Icons.tsx`, `DatePicker.tsx`. These are smaller, reusable components used across multiple pages.
-   **Form Components**: `BoyForm.tsx`. These components are specifically for handling user input.
-   **Feedback Components**: `SkeletonLoaders.tsx`, `Toast.tsx`. These are used to improve the user experience during data loading states and for action feedback.
-   **Visualization Components**: `BarChart.tsx`. > TODO: `LineChart.tsx` exists but is currently empty/unused.

### `/services` Directory

This directory contains the application's business logic and data interaction layers.

-   **`db.ts`**: The main data abstraction layer, unifying interactions with Supabase. It also manages user roles and invite codes.
-   **`supabaseClient.ts`**: Handles Supabase client initialization and provides a shared instance for Auth and database access.
-   **`supabaseAuth.ts`**: Wraps common Supabase Auth operations (sign-in, sign-up, sign-out).
-   **`settings.ts`**: Manages section-specific application settings.

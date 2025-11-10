<div align="center">
  <img src="https://i.postimg.cc/FHrS3pzD/full-colour-boxed-logo.png" alt="Boys' Brigade Logo" width="150"/>
  <h1>BB Manager</h1>
  <p>A Progressive Web App to manage Boys' Brigade members, squads, and weekly marks, with full offline capabilities.</p>
</div>

---

## Table of Contents

1.  [Overview](#overview)
2.  [Key Features](#key-features)
3.  [Tech Stack](#tech-stack)
4.  [Project Structure](#project-structure)
5.  [Core Architecture](#core-architecture)
    -   [Offline-First Strategy](#offline-first-strategy)
    -   [Data Synchronization](#data-synchronization)
    -   [Multi-Section Support](#multi-section-support)
    -   [Audit Logging & Reversion](#audit-logging--reversion)
6.  [Getting Started](#getting-started)
    -   [Prerequisites](#prerequisites)
    -   [Firebase Setup](#firebase-setup)
    -   [Running Locally](#running-locally)
7.  [Deployment](#deployment)

---

## Overview

BB Manager is a modern, responsive web application designed to streamline the administration of a Boys' Brigade section. It provides officers with the tools to manage member rosters, organize squads, and record weekly marks efficiently.

The application is built as a **Progressive Web App (PWA)**, with a core focus on an **offline-first** architecture. This ensures that all features are fully functional even with an unstable or non-existent internet connection, making it perfectly suited for use during parade nights where connectivity may be a challenge. All data is stored locally in the browser and automatically synchronized with a central Firebase database whenever a connection is available.

## Key Features

-   **Member Management**: Full CRUD (Create, Read, Update, Delete) functionality for member records.
-   **Squad Organization**: Group members into squads and designate Squad Leaders.
-   **Multi-Section Support**: Manage **Company Section** and **Junior Section** data completely separately within the same app.
-   **Weekly Mark Recording**: A dedicated interface for quickly entering attendance and scores for all members on a given date, with different marking schemes for each section.
-   **Offline Functionality**: The app is 100% functional offline. All changes are saved locally and synced automatically when the user goes online.
-   **Dashboard Reporting**: A high-level dashboard that summarizes member marks by month, providing a clear overview of performance.
-   **Detailed Member History**: View and correct the complete mark history for any individual member.
-   **Audit Logging & Reversion**: Every significant action is logged. Accidental deletions or incorrect updates can be easily reverted, providing a safety net for all users.
-   **Secure Authentication**: User access is managed through Firebase Authentication.

## Tech Stack

This project is built using a modern, buildless frontend stack.

-   **UI Framework**: [React](https://reactjs.org/)
-   **Language**: [TypeScript](https://www.typescriptlang.org/)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/) (via CDN)
-   **Backend & Database**: [Firebase](https://firebase.google.com/)
    -   **Firestore**: For the central, cloud-based database.
    -   **Authentication**: For secure user sign-in.
-   **Offline Storage**: [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
-   **PWA Functionality**: [Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
-   **Module Loading**: [Import Maps](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type/importmap) (enables a buildless development environment)

## Project Structure

The project follows a standard feature-oriented structure, separating UI components from business logic and services.

```
/
├── components/         # Reusable React components
│   ├── AuditLogPage.tsx
│   ├── BoyForm.tsx
│   ├── BoyMarksPage.tsx
│   ├── DashboardPage.tsx
│   ├── Header.tsx
│   ├── HelpPage.tsx
│   ├── HomePage.tsx
│   ├── Icons.tsx
│   ├── LoginPage.tsx
│   ├── Modal.tsx
│   ├── SectionSelectPage.tsx
│   ├── SettingsPage.tsx
│   ├── SkeletonLoaders.tsx
│   └── WeeklyMarksPage.tsx
│
├── services/           # Business logic, API calls, and data management
│   ├── config.ts       # Firebase configuration keys
│   ├── db.ts           # Core data layer (abstracts Firestore & IndexedDB)
│   ├── firebase.ts     # Firebase initialization and service getters
│   └── offlineDb.ts    # IndexedDB wrapper and schema management
│
├── App.tsx             # Root React component, handles global state and routing
├── index.html          # Main HTML entry point with import map
├── index.tsx           # React DOM renderer
├── manifest.json       # PWA manifest
├── sw.js               # Service Worker for caching and offline support
├── types.ts            # Centralized TypeScript type definitions
└── README.md           # This file
```

## Core Architecture

### Offline-First Strategy

The application is architected to prioritize local data, providing a seamless and fast user experience regardless of network status.

1.  **App Shell Caching**: On the first visit, the Service Worker (`sw.js`) caches the core application assets (HTML, JS, icons). Subsequent visits load instantly from the cache. The strategy is **stale-while-revalidate**, meaning the user gets the cached version immediately while the app fetches updates in the background for the next visit.
2.  **Local Database**: All application data (members, audit logs, etc.) is stored in the browser's **IndexedDB** via the `services/offlineDb.ts` wrapper.
3.  **UI Interaction**: The React UI exclusively reads from and writes to IndexedDB. This makes all operations, like filtering the member list or editing a mark, instantaneous.
4.  **Pending Writes Queue**: When a user performs a write operation (create, update, delete) while offline, the action is not lost. It is added to a special `pending_writes` store in IndexedDB.

### Data Synchronization

The synchronization logic is the bridge between the local offline database and the central Firestore database.

-   **Trigger**: Synchronization is attempted on application load and whenever the browser's `online` event fires.
-   **Process**: The `syncPendingWrites()` function in `services/db.ts` is the core of this process.
    1.  It reads all items from the `pending_writes` queue in IndexedDB.
    2.  It iterates through these actions and constructs a single **Firestore Write Batch**. Using a batch ensures that all pending operations succeed or fail together, maintaining data integrity.
    3.  The batch is committed to Firestore.
    4.  If the commit is successful, the `pending_writes` queue in IndexedDB is cleared.
-   **Offline ID Handling**: When a new member is created offline, they are given a temporary UUID (e.g., `offline_...`). This allows the user to interact with the new member immediately. During synchronization, a new document is created in Firestore, which generates a permanent ID. The sync process then updates the local IndexedDB record, replacing the temporary ID with the real Firestore ID.

### Multi-Section Support

The app keeps data for the Company and Junior sections completely separate.

-   The active section is stored in `localStorage` and managed by the root `App.tsx` component.
-   This active section is used to dynamically generate collection names for both Firestore and IndexedDB. For example, if the active section is `company`, the app will interact with the `company_boys` and `company_audit_logs` collections/stores. This provides simple and effective data segregation.

### Audit Logging & Reversion

This is a critical feature for data integrity and user confidence.

-   **Logging**: Every significant write operation is coupled with the creation of an `AuditLog` document. This log contains a human-readable description of the change, the user who performed it, a timestamp, and crucially, a `revertData` payload.
-   **Revert Data**: The `revertData` field stores a snapshot of the data *before* the change occurred.
    -   For an **update**, it stores the entire object before it was modified.
    -   For a **delete**, it stores the entire object that was deleted.
    -   For a **create**, it stores the ID of the newly created object.
-   **Reversion Process**: When a user clicks "Revert" on an action in the Audit Log, the `handleRevert()` function in `AuditLogPage.tsx` uses the `revertData` to perform the inverse operation:
    -   Reverting a `DELETE` triggers a recreate/`set` operation with the saved data.
    -   Reverting a `CREATE` triggers a `delete` operation on the saved ID.
    -   Reverting an `UPDATE` triggers an `update` operation using the old saved data.

## Getting Started

Because this project uses import maps and serves dependencies via a CDN, there is **no build step or `npm install` required**.

### Prerequisites

-   A modern web browser (Chrome, Firefox, Edge).
-   A simple local web server to serve the files.

### Firebase Setup

1.  **Create a Firebase Project**: Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project.
2.  **Create a Web App**: Inside your project, add a new Web App. Give it a name and register it.
3.  **Get Config Keys**: After registering, Firebase will provide you with a configuration object. Copy this object.
4.  **Update `config.ts`**: Paste your Firebase configuration into the `services/config.ts` file.
5.  **Enable Firestore**: In the Firebase Console, go to the "Firestore Database" section and create a new database in Production mode.
6.  **Enable Authentication**: Go to the "Authentication" section, click "Get started", and enable the **Email/Password** sign-in provider.
7.  **Set Security Rules**: Go to the "Firestore Database" -> "Rules" tab. Paste in the following rules to ensure only authenticated users can access data. **This is a critical security step.**

    ```
    rules_version = '2';
    service cloud.firestore {
      match /databases/{database}/documents {
        // Allow read/write access to any document only for authenticated users
        match /{document=**} {
          allow read, write: if request.auth != null;
        }
      }
    }
    ```

### Running Locally

You can use any local static file server. If you have Python installed, you can run the following command from the project's root directory:

```bash
# For Python 3
python -m http.server

# For Python 2
python -m SimpleHTTPServer
```

Then, open your browser and navigate to `http://localhost:8000`.

Alternatively, you can use a VS Code extension like [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer).

## Deployment

This is a fully static application, so it can be deployed to any static hosting provider like Firebase Hosting, Vercel, Netlify, or GitHub Pages.

**Firebase Hosting** is a natural choice. After installing the Firebase CLI, you can deploy with these simple commands:

```bash
# First time setup
firebase login
firebase init hosting

# Deploy changes
firebase deploy
```

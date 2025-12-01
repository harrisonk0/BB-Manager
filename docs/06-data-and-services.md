# 6. Data & Services

The `/services` directory contains the core business logic of the application. It acts as a bridge between the UI (components) and the data persistence layers (Supabase/Postgres and IndexedDB), ensuring that components remain focused on presentation while the services handle the complexities of data management.

### Data Flow

The general data flow for read and write operations is designed to be robust and offline-first.

-   **Read Operations (e.g., `fetchBoys`)**:
    1.  The UI component calls a function in `services/db.ts`.
    2.  `db.ts` first attempts to retrieve the data from IndexedDB via `services/offlineDb.ts`.
    3.  The cached data is returned to the UI immediately for a fast response.
    4.  If the device is online, `db.ts` *also* makes a background request to Supabase to get the latest data.
    5.  When the fresh data arrives, it is **deeply compared** with the existing cached data.
    6.  **Only if the data has actually changed**, the local IndexedDB cache is updated, and a `datarefreshed` (or `logsrefreshed`, `userrolerefresh`) event is dispatched to notify the UI to refresh itself.

-   **Write Operations (e.g., `createBoy`)**:
    1.  The UI component calls a function in `services/db.ts`.
    2.  `db.ts` checks the network status.
    3.  **If Online**: It sends the write request directly to Supabase. Upon success, it also updates the local IndexedDB cache to keep it in sync.
    4.  **If Offline**: It adds the operation to the `pending_writes` queue in IndexedDB and applies the change to the local data in IndexedDB. The UI updates immediately based on this local change. The operation will be synced to Supabase later by `syncPendingWrites`.

---

### File Breakdown

#### `db.ts` - The Main Data Abstraction Layer

This is the most important file in the services directory. It provides a simple, unified API for all data operations. Components should **only** interact with this file for their data needs.

**Key Responsibilities**:
-   Abstracting away the dual data sources (Supabase/Postgres and IndexedDB).
-   Implementing the cache-first, intelligent read strategy with deep data comparison.
-   Handling the online/offline logic for write operations.
-   Containing the `syncPendingWrites()` function, the core of the offline-to-online data synchronization process.
-   Generating dynamic table names (e.g., `company_boys`) based on the active section.
-   **User Management**: Handles fetching, updating, approving, and denying user roles, including calling the secure Supabase Edge Function for permanent user deletion.
-   **Data Validation**: Includes `validateBoyMarks` to ensure data integrity before saving.

**Exported Functions**:
-   `syncPendingWrites()`: The core sync logic.
-   `createBoy()`, `fetchBoys()`, `fetchBoyById()`, `updateBoy()`, `recreateBoy()`, `deleteBoyById()`: Full CRUD operations for member data.
-   `createAuditLog()`, `fetchAuditLogs()`, `deleteOldAuditLogs()`, `clearAllAuditLogs()`: CRUD and cleanup operations for audit log data.
-   `fetchUserRole()`, `fetchAllUserRoles()`, `updateUserRole()`, `deleteUserRole()`, `approveUser()`, `denyUser()`: Functions for managing user roles and the pending approval flow.
-   `clearAllLocalData()`: Function to clear all local IndexedDB data.

#### `offlineDb.ts` - IndexedDB Wrapper

This file is a low-level service that provides a clean, Promise-based API for interacting with the browser's IndexedDB.

**Key Responsibilities**:
-   Opening and initializing the IndexedDB database (`BBManagerDB`).
-   Managing the database schema and handling version migrations.
-   Providing simple, async functions for all basic database operations (`get`, `getAll`, `put`, `delete`, `clear`).
-   Managing the `pending_writes` object store, which is critical for offline functionality.
-   Managing the `user_roles` object store for caching user role and section access information.

#### `settings.ts` - Section Settings Management

This is a small, focused service for managing section-specific settings, which are stored in a separate `settings` table in Supabase.

**Key Responsibilities**:
-   `getSettings(section)`: Fetches the settings for a given section, returning defaults if none exist.
-   `saveSettings(section, settings, userRole)`: Saves a settings object to Supabase, including client-side permission checks.
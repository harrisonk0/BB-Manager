# 6. Data & Services

The `/services` directory contains the core business logic of the application. It acts as a bridge between the UI (components) and the data persistence layers (Firestore and IndexedDB), ensuring that components remain focused on presentation while the services handle the complexities of data management.

### Data Flow

The general data flow for read and write operations is designed to be robust and offline-first.

-   **Read Operations (e.g., `fetchBoys`)**:
    1.  The UI component calls a function in `services/db.ts`.
    2.  `db.ts` first attempts to retrieve the data from IndexedDB via `services/offlineDb.ts`.
    3.  The cached data is returned to the UI immediately for a fast response.
    4.  If the device is online, `db.ts` *also* makes a background request to Firestore to get the latest data.
    5.  When the fresh data arrives, it is **deeply compared** with the existing cached data.
    6.  **Only if the data has actually changed**, the local IndexedDB cache is updated, and a `datarefreshed` (or `logsrefreshed`, `inviteCodesRefreshed`, `userrolerefresh`) event is dispatched to notify the UI to refresh itself. This intelligent check prevents unnecessary updates and performance issues.

-   **Write Operations (e.g., `createBoy`)**:
    1.  The UI component calls a function in `services/db.ts`.
    2.  `db.ts` checks the network status.
    3.  **If Online**: It sends the write request directly to Firestore. Upon success, it also updates the local IndexedDB cache to keep it in sync.
    4.  **If Offline**: It adds the operation to the `pending_writes` queue in IndexedDB and applies the change to the local data in IndexedDB. The UI updates immediately based on this local change. The operation will be synced to Firestore later.

---

### File Breakdown

#### `db.ts` - The Main Data Abstraction Layer

This is the most important file in the services directory. It provides a simple, unified API for all data operations. Components should **only** interact with this file for their data needs.

**Key Responsibilities**:
-   Abstracting away the dual data sources. A component calling `fetchBoys` doesn't need to know or care if the data is coming from the local cache or the remote server.
-   Implementing the cache-first, intelligent read strategy with deep data comparison.
-   Handling the online/offline logic for write operations.
-   Containing the `syncPendingWrites()` function, the core of the offline-to-online data synchronization process.
-   Generating dynamic collection names (e.g., `company_boys`) based on the active section, and managing global collections (`invite_codes`, `user_roles`).
-   **Data Validation**: Includes `validateBoyMarks` to ensure data integrity before saving.
-   **Automatic Cleanup**: Includes `deleteOldAuditLogs` which now also cleans up old, used, or revoked invite codes from both Firestore and IndexedDB.

**Exported Functions**:
-   `syncPendingWrites()`: The core sync logic, now also handling `UPDATE_USER_ROLE` pending writes.
-   `createBoy()`, `fetchBoys()`, `fetchBoyById()`, `updateBoy()`, `recreateBoy()`, `deleteBoyById()`: Full CRUD operations for member data.
-   `createAuditLog()`, `fetchAuditLogs()`, `deleteOldAuditLogs()`, `clearAllAuditLogs()`: Full CRUD and cleanup operations for audit log data, including admin-only clear. `createAuditLog` now supports `UPDATE_USER_ROLE`, `CLEAR_AUDIT_LOGS`, `CLEAR_USED_REVOKED_INVITE_CODES`, `CLEAR_LOCAL_DATA` action types.
-   `createInviteCode()`, `fetchInviteCode()`, `updateInviteCode()`, `revokeInviteCode()`, `fetchAllInviteCodes()`, `clearAllUsedRevokedInviteCodes()`: CRUD and management operations for invite codes, including admin-only clear. `createInviteCode` now includes `defaultUserRole` and `expiresAt`.
-   `fetchUserRole()`, `fetchAllUserRoles()`, `setUserRole()`, `updateUserRole()`: Functions for managing user roles, including caching in IndexedDB and client-side permission checks.
-   `clearAllLocalData()`: Admin-only function to clear all local IndexedDB data for a section, including all invite codes and user roles.

#### `offlineDb.ts` - IndexedDB Wrapper

This file is a low-level service that provides a clean, Promise-based API for interacting with the browser's IndexedDB. The rest of the application should not interact with IndexedDB directly; it should use the functions exported from this file.

**Key Responsibilities**:
-   Opening and initializing the IndexedDB database.
-   Managing the database schema and handling version migrations via the `onupgradeneeded` event. This is where object stores (like tables in a traditional DB) are created.
-   Providing simple, async functions for all basic database operations: `get`, `getAll`, `put` (for create/update), `delete`, and `clear`.
-   Managing the `pending_writes` object store, which is critical for offline functionality. The `PendingWrite` type now includes `UPDATE_USER_ROLE`.
-   **Invite Code Management**: Provides specific functions for `saveInviteCodeToDB`, `getInviteCodeFromDB`, `getAllInviteCodesFromDB`, `deleteInviteCodeFromDB`, `deleteInviteCodesFromDB`, `clearUsedRevokedInviteCodesFromDB`, and `clearAllInviteCodesFromDB`.
-   **User Role Management**: Provides `saveUserRoleToDB`, `getUserRoleFromDB`, `deleteUserRoleFromDB`, `clearAllUserRolesFromDB` for caching user roles.
-   **Development Controls**: Provides `clearAllSectionDataFromDB` for clearing all local data for a section.

#### `supabaseClient.ts` - Supabase Initialization

This file creates a singleton Supabase client using the project URL and anon key from environment variables.

**Key Responsibilities**:
-   Reading `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from the environment.
-   Creating a shared Supabase client instance for Auth and database calls.
-   Surfacing configuration errors early if required env vars are missing.

#### `settings.ts` - Section Settings Management

This is a small, focused service for managing section-specific settings, which are stored in the `settings` table in Supabase.

**Key Responsibilities**:
-   `getSettings(section)`: Fetches the settings for a given section. If no settings row exists in Supabase (e.g., for a new section), it returns a set of hard-coded default values. This ensures the app always has a valid settings object to work with.
-   `saveSettings(section, settings, userRole)`: Saves a settings object to Supabase for the specified section, including client-side permission checks based on `userRole`.
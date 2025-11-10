# 6. Data & Services

The `/services` directory contains the core business logic of the application. It acts as a bridge between the UI (components) and the data persistence layers (Firestore and IndexedDB), ensuring that components remain focused on presentation while the services handle the complexities of data management.

### Data Flow

The general data flow for read and write operations is designed to be robust and offline-first.

-   **Read Operations (e.g., `fetchBoys`)**:
    1.  The UI component calls a function in `services/db.ts`.
    2.  `db.ts` first attempts to retrieve the data from IndexedDB via `services/offlineDb.ts`.
    3.  The cached data is returned to the UI immediately for a fast response.
    4.  If the device is online, `db.ts` *also* makes a background request to Firestore to get the latest data.
    5.  When the fresh data arrives, it is used to update the IndexedDB cache, ensuring the local data is kept up-to-date for the next time the app is used.

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
-   Implementing the cache-first read strategy.
-   Handling the online/offline logic for write operations.
-   Containing the `syncPendingWrites()` function, the core of the offline-to-online data synchronization process.
-   Generating dynamic collection names (e.g., `company_boys`) based on the active section.

**Exported Functions**:
-   `syncPendingWrites()`: The core sync logic.
-   `createBoy()`, `fetchBoys()`, `fetchBoyById()`, `updateBoy()`, `recreateBoy()`, `deleteBoyById()`: Full CRUD operations for member data.
-   `createAuditLog()`, `fetchAuditLogs()`, `updateAuditLog()`, `deleteOldAuditLogs()`: Full CRUD and cleanup operations for audit log data.

#### `offlineDb.ts` - IndexedDB Wrapper

This file is a low-level service that provides a clean, Promise-based API for interacting with the browser's IndexedDB. The rest of the application should not interact with IndexedDB directly; it should use the functions exported from this file.

**Key Responsibilities**:
-   Opening and initializing the IndexedDB database.
-   Managing the database schema and handling version migrations via the `onupgradeneeded` event. This is where object stores (like tables in a traditional DB) are created.
-   Providing simple, async functions for all basic database operations: `get`, `getAll`, `put` (for create/update), `delete`, and `clear`.
-   Managing the `pending_writes` object store, which is critical for offline functionality.

#### `firebase.ts` - Firebase Initialization

This file uses a singleton pattern to ensure that the Firebase SDK is only initialized once during the application's lifecycle.

**Key Responsibilities**:
-   Defining the `initializeFirebase()` function, which takes the configuration from `config.ts` and initializes the Firebase app.
-   Providing getter functions, `getDb()` and `getAuthInstance()`, which allow other services to access the Firestore database and Authentication instances without needing to manage the app instance themselves.
-   Throwing errors if services are requested before initialization is complete.

#### `settings.ts` - Section Settings Management

This is a small, focused service for managing section-specific settings, which are stored in a separate `settings` collection in Firestore.

**Key Responsibilities**:
-   `getSettings(section)`: Fetches the settings for a given section. If no settings document exists in Firestore (e.g., for a new section), it returns a set of hard-coded default values. This ensures the app always has a valid settings object to work with.
-   `saveSettings(section, settings)`: Saves a settings object to Firestore for the specified section.

# 2. Core Architecture

This document provides an in-depth look at the architectural principles that govern the BB Manager application. The architecture is designed to be robust, scalable, and resilient, with a strong emphasis on providing a seamless user experience, especially in low-connectivity environments.

### Core Principles

1.  **Offline-First**: The application must be fully functional without an internet connection. The UI should be fast and responsive, interacting primarily with a local data source.
2.  **Stateless UI / Centralized State**: React components are kept as stateless as possible. Global state (user, active section, data) is managed by the root `App.tsx` component and passed down via props.
3.  **Data Abstraction**: The UI should not be concerned with where data comes from (local cache or remote server). The `services/db.ts` file acts as a single source of truth for all data operations, abstracting away the complexity of managing two data sources.
4.  **Data Integrity**: All data changes must be durable. Actions taken offline are queued and synced reliably. The audit log and revert mechanism provide a safety net against user error.

---

### Offline-First Strategy

The offline-first approach is the cornerstone of this application's architecture. It ensures a consistent and reliable user experience, which is critical for an app intended for use in locations with potentially poor Wi-Fi, like a church hall.

**Data Flow Diagram:**

```
[ User Action ] -> [ React Component ] -> [ services/db.ts ] -> [ services/offlineDb.ts (IndexedDB) ]
       ^                                                                          |
       |                                                                          | (If online)
       +--- [ UI Update (Local) ] <------------------------------------------------+
                                                                                    |
                                                                                    v
       ^------------------------- [ UI Update (Remote) ] <--- [ Event Listener ] <- [ Firestore Sync ]
```

1.  **App Shell Caching**: The Service Worker (`sw.js`) pre-caches the main application shell (HTML, JS, manifest). This makes the initial load nearly instantaneous on subsequent visits.
2.  **Local Database (IndexedDB)**: `services/offlineDb.ts` sets up and manages a local IndexedDB database. This is the primary data source for the entire application. All `Boy` records, `AuditLog` entries, `InviteCode` entries, and other data are stored here.
3.  **UI Interaction**: When a user views a list of members or edits a mark, the React UI is reading from and writing to IndexedDB. This is why the interface feels incredibly fast—there are no network requests blocking the user's actions.
4.  **Pending Writes Queue**: When a write operation (create, update, delete) occurs, it is immediately applied to the local IndexedDB. Simultaneously, a record of this operation is added to a special `pending_writes` store. This queue acts as a durable log of all changes that have not yet been saved to the central server.
5.  **Event-Driven UI Refresh**: When the background sync successfully fetches new data from Firestore, it dispatches a custom browser event (e.g., `datarefreshed`, `logsrefreshed`, `inviteCodesRefreshed`). The root `App` component listens for this event and triggers a data refresh in the UI. This ensures the user sees the latest data without needing to manually reload the page after coming online.

---

### Data Synchronization

Synchronization is the process of reconciling the local data with the remote Firestore database.

-   **Trigger**: The `syncPendingWrites()` function in `services/db.ts` is called on initial app load and whenever the browser detects an internet connection (via the `online` event).
-   **Process**:
    1.  The function first checks if there is an online connection and if the `pending_writes` queue in IndexedDB is empty. If so, it does nothing.
    2.  It reads all pending operations from the queue.
    3.  It constructs a single **Firestore Write Batch**. A batch is a set of write operations that are executed as a single atomic unit. This is crucial for data integrity—either all offline changes are saved, or none are. This prevents the database from ending up in a partially updated state.
    4.  The batch is committed to Firestore.
    5.  **Only upon a successful commit**, the `pending_writes` queue in IndexedDB is cleared. If the commit fails (e.g., due to a temporary network blip or a permissions error), the queue remains intact, and the sync will be re-attempted later.

-   **Intelligent Cache Updates**: When fetching data from Firestore to update the local cache, the application performs an intelligent **deep comparison** between the fresh data and the cached data. An update to the local cache (and the subsequent UI refresh) is only triggered if the data has *actually changed*. This prevents unnecessary writes and avoids performance issues like infinite refresh loops.

-   **Offline ID Handling**: A key challenge in offline creation is handling object IDs.
    -   When a new member is created offline, a temporary, unique ID is generated (e.g., `offline_...`).
    -   The `syncPendingWrites` function recognizes this. For a `CREATE_BOY` action, it doesn't use the temporary ID. Instead, it asks Firestore to generate a new, permanent document ID.
    -   After the sync is successful, a final local operation is performed: the member record in IndexedDB is updated to replace the temporary ID with the real Firestore ID.

---

### Multi-Section Support

The app keeps data for the **Company Section** and **Junior Section** completely separate and isolated.

-   The user's choice of section is stored in `localStorage` and managed as state in `App.tsx`.
-   This `activeSection` variable is passed down to all relevant components and service functions.
-   The data service functions in `db.ts` and `offlineDb.ts` use this variable to dynamically determine which database collections to use. For example, `fetchBoys('company')` will target the `company_boys` Firestore collection and the `company_boys` IndexedDB object store.
-   This design is simple and scalable. Adding a new section in the future would be as simple as adding a new value to the `Section` type and ensuring the UI allows for its selection.

---

### User Roles & Invite Codes

The application implements a robust user management system:

-   **User Roles**: Each user is assigned a `UserRole` (Admin, Captain, Officer) stored in a global `user_roles` Firestore collection. This role determines their permissions within the application, such as who can manage settings, generate invite codes, or clear audit logs. Roles are fetched on login and used for client-side permission checks.
-   **Invite Codes**: New users sign up using a one-time `InviteCode` generated by an administrator. These codes are stored in a global `invite_codes` Firestore collection and locally in IndexedDB. The `SignupPage` validates and marks codes as used, and administrators can revoke unused codes.

---

### Audit Logging & Reversion

This feature provides a robust safety net against user error.

-   **Logging**: Every service function that performs a significant write operation (`createBoy`, `deleteBoyById`, `updateBoy`, `saveSettings`, `createInviteCode`, `updateInviteCode`, `updateUserRole`, `clearAllAuditLogs`, `clearAllUsedRevokedInviteCodes`, `clearAllLocalData`) is also responsible for creating a corresponding `AuditLog` entry.
-   **The `revertData` Payload**: This is the most critical part of the audit log. It contains the necessary information to undo the action.
    -   `DELETE_BOY`: Stores a complete JSON copy of the `Boy` object that was deleted.
    -   `CREATE_BOY`: Stores the `id` of the `Boy` that was just created.
    -   `UPDATE_BOY`: Stores a complete JSON copy of the `Boy` object *before* the update was applied.
    -   `GENERATE_INVITE_CODE`: Stores the `id` of the `InviteCode` that was generated.
    -   `UPDATE_USER_ROLE`: Stores the `uid`, `oldRole`, and `newRole` for the user.
-   **Reversion Process**: The `handleRevert` function in `AuditLogPage.tsx` is a powerful state-reversal machine.
    -   It reads the `actionType` and `revertData` from the log entry being reverted.
    -   It calls the appropriate *inverse* data service function. For example, to revert a `DELETE_BOY` action, it calls `recreateBoy()` using the saved `Boy` object from `revertData`. To revert a `GENERATE_INVITE_CODE`, it calls `revokeInviteCode()`.
    -   After a successful revert, it creates a *new* `REVERT_ACTION` log to record the fact that a revert occurred, linking it to the original log.
-   **Automatic Cleanup**: Audit logs and used/revoked invite codes older than 14 days are automatically deleted from both local IndexedDB and remote Firestore to manage storage space. This cleanup runs on app startup.
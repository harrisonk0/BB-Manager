# 7. PWA & Offline Capabilities

The BB Manager application is built as a Progressive Web App (PWA) with a core focus on offline functionality. This ensures a reliable and fast experience for users, regardless of their network connection. This is achieved through two key browser technologies: **Service Workers** and **IndexedDB**.

---

### Service Worker (`sw.js`)

The Service Worker is a script that the browser runs in the background, separate from the web page. It acts as a programmable network proxy, allowing the app to intercept and handle network requests.

**Key Responsibilities**:
1.  **App Shell Caching**: Makes the app load instantly on repeat visits.
2.  **Offline Access**: Enables the app to work without an internet connection by serving cached assets.

**Caching Strategies Implemented in `sw.js`**:

-   **Install Phase (`install` event)**: When the Service Worker is first registered, it opens a named cache (e.g., `bb-manager-cache-v2`) and pre-caches a list of essential "app shell" files (`index.html`, `manifest.json`, etc.). This ensures the basic application can always be loaded.
-   **Activation Phase (`activate` event)**: When a *new* Service Worker is activated (e.g., after a code update that changes the cache version name), this event is used to clean up old, outdated caches. This prevents the user's device from accumulating old files.

-   **Fetch Interception (`fetch` event)**: This is where the caching logic happens. Every network request from the app is intercepted, and the Service Worker decides how to respond.
    -   **Strategy 1: Network First (for Navigation)**: When the user navigates to the app's main page, the Service Worker first tries to fetch the latest `index.html` from the network. This ensures they always get the most recent version of the app if they are online. If the network request fails (i.e., they are offline), it falls back to serving the cached version from the app shell.
    -   **Strategy 2: Stale-While-Revalidate (for Assets)**: For all other assets (like JavaScript modules from the CDN), this strategy is used.
        1.  The Service Worker immediately returns the cached version of the asset if it exists, making the app feel very fast.
        2.  Simultaneously, it makes a network request in the background to fetch the latest version of that asset.
        3.  If the fetch is successful, it updates the cache with the new version.
        This means the user gets an instant response, and the app "heals" its cache in the background, so the *next* visit will have the updated asset.

---

### IndexedDB (`services/offlineDb.ts`)

IndexedDB is a low-level, transactional database system built into modern browsers. It's used as the primary local data store for all application data, making the offline-first architecture possible.

**Database Schema (`onupgradeneeded` event)**:

The database schema is defined and migrated in the `openDB` function within `services/offlineDb.ts`. The database, named `BBManagerDB`, contains several "object stores" (similar to tables).

-   `company_boys`: Stores all `Boy` objects for the Company Section. The `id` property is the key.
-   `company_audit_logs`: Stores all `AuditLog` objects for the Company Section. The `id` property is the key.
-   `junior_boys`: Stores all `Boy` objects for the Junior Section.
-   `junior_audit_logs`: Stores all `AuditLog` objects for the Junior Section.
-   `invite_codes`: Stores all `InviteCode` objects. The `id` property is the key.
-   `pending_writes`: This is the crucial store for offline operations.
    -   It has an `autoIncrement` key, meaning each new entry gets a unique, sequential ID.
    -   It stores `PendingWrite` objects, which contain the type of operation (`CREATE_BOY`, `UPDATE_BOY`, etc.), the data payload, and the relevant section.

**The Offline-to-Online Flow**:
The combination of these technologies creates a seamless experience:
1.  User makes changes offline. All changes are saved to IndexedDB.
2.  User comes back online. The `online` event triggers `syncPendingWrites()`.
3.  `syncPendingWrites()` sends all queued changes to Firestore.
4.  Simultaneously, `fetchBoys()` runs a background fetch. It detects that the server data may be newer than the local cache.
5.  After fetching, it compares the new data with the old. If changes are found, it updates the local IndexedDB cache.
6.  This update dispatches a `datarefreshed` event, which the main `App` component is listening for.
7.  The `App` component re-fetches data from the (now updated) IndexedDB and re-renders the UI, showing the user the latest information from all sources without requiring a manual page refresh.

**Schema Migration**:

The database version is managed by the `DB_VERSION` constant. If a developer needs to change the database schema (e.g., add a new object store or an index), they must:
1.  Increment the `DB_VERSION` constant.
2.  Add the schema modification logic inside the `request.onupgradeneeded` event handler, often within an `if (event.oldVersion < NEW_VERSION)` block.

When a user opens the app after an update, the browser will detect the new version number and automatically trigger the `onupgradeneeded` event, safely migrating their local database to the new schema. The migration from v1 to v2 in the existing code is a practical example of this, where generic `boys` and `audit_logs` stores were replaced with section-specific ones, and v2 to v3 added the `invite_codes` store.
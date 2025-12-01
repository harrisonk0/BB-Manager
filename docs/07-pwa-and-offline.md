# 7. PWA & Offline Capabilities

The BB Manager application is built as a Progressive Web App (PWA) with a core focus on offline functionality. This ensures a reliable and fast experience for users, regardless of their network connection. This is achieved through two key browser technologies: **Service Workers** and **IndexedDB**.

---

### Service Worker (`sw.js`)

The Service Worker is a script that the browser runs in the background, separate from the web page. It acts as a programmable network proxy, allowing the app to intercept and handle network requests.

**Key Responsibilities**:
1.  **App Shell Caching**: Makes the app load instantly on repeat visits.
2.  **Offline Access**: Enables the app to work without an internet connection by serving cached assets.

**Caching Strategies Implemented in `sw.js`**:

-   **Install Phase**: Pre-caches essential "app shell" files (`index.html`, `manifest.json`, etc.).
-   **Activation Phase**: Cleans up old, outdated caches.
-   **Fetch Interception**: Uses a **Network-First** strategy for navigation (ensuring the latest app version is loaded when online) and a **Stale-While-Revalidate** strategy for assets (providing instant load times from cache while updating the cache in the background).

---

### IndexedDB (`services/offlineDb.ts`)

IndexedDB is a low-level, transactional database system built into modern browsers. It's used as the primary local data store for all application data, making the offline-first architecture possible.

**Database Schema**:

The database schema is defined and migrated in the `openDB` function within `services/offlineDb.ts`. The database, named `BBManagerDB`, contains several "object stores" (similar to tables):

-   `company_boys`, `junior_boys`: Stores all `Boy` objects for each section.
-   `company_audit_logs`, `junior_audit_logs`, `global_audit_logs`: Stores all `AuditLog` objects.
-   `user_roles`: Stores `UserRoleInfo` objects, keyed by `uid`.
-   `pending_writes`: Stores `PendingWrite` objects, which log all offline operations waiting to be synced to Supabase.

**The Offline-to-Online Flow**:
The combination of these technologies creates a seamless experience:
1.  User makes changes offline. All changes are saved to IndexedDB.
2.  User comes back online. The `online` event triggers `syncPendingWrites()`.
3.  `syncPendingWrites()` sends all queued changes to Supabase (Postgres).
4.  Upon successful sync, background fetches run to update the local cache with the latest data from Supabase.
5.  If changes are detected, a custom event (`datarefreshed`, `logsrefreshed`, `userrolerefresh`) is dispatched, triggering the main `App` component to re-render with the synchronized data.
# AI Rules for BB Manager Application

This document outlines the core technologies and specific library usage guidelines for the BB Manager application. Adhering to these rules ensures consistency, maintainability, and leverages the strengths of the chosen tech stack.

## Tech Stack Overview

The BB Manager is a Progressive Web App (PWA) built with a strong emphasis on offline functionality and a responsive user experience.

*   **Frontend Framework**: React (using TypeScript for type safety).
*   **Styling**: Tailwind CSS (integrated via CDN for a utility-first approach).
*   **Backend & Database**: Supabase (PostgreSQL for the primary database, Supabase Authentication for user management, and Supabase Edge Functions for secure server-side logic).
*   **Offline Capabilities**: Service Workers for app shell caching and IndexedDB for robust local data storage.
*   **Data Abstraction Layer**: A custom `services/db.ts` module that unifies interactions with both Supabase and IndexedDB.
*   **Build Tool**: Vite (used for development and bundling).
*   **Package Management**: npm.
*   **Icons**: Custom SVG icons (defined in `components/Icons.tsx`).
*   **Routing**: Currently uses a custom state-based routing system.
*   **Hosting**: Designed for static hosting.

## Library Usage Rules

To maintain a consistent and efficient codebase, please adhere to the following guidelines when developing or modifying the application:

*   **UI Components**:
    *   All user interface elements must be built using **React** and styled exclusively with **Tailwind CSS** classes.
    *   For new UI components, prioritize using existing custom components or creating new ones following the project's established style.
    *   **Important**: For future component development, leverage the **shadcn/ui** library components where applicable, as they are pre-installed and align with the project's design principles.
*   **Icons**:
    *   Use the custom SVG icons provided in `components/Icons.tsx`. If a required icon is not available, add it to this file. The `lucide-react` package is available for additional icons if needed.
*   **State Management**:
    *   Utilize **React's built-in hooks** (`useState`, `useEffect`, `useCallback`, `useMemo`) for managing both component-level and global application state.
*   **Data Persistence & API Calls**:
    *   All interactions with the database (Supabase/Postgres and IndexedDB) **must** be routed through the abstraction layer in `services/db.ts`. Do not directly call Supabase SDK or IndexedDB API methods from UI components.
*   **Authentication**:
    *   **Supabase Authentication** is the sole authentication provider. All authentication logic should be handled via the Supabase client in `src/integrations/supabase/client.ts` and managed by the `useAuthAndRole` hook.
*   **Routing**:
    *   The application currently employs a custom state-based routing system managed within `App.tsx`. For any future extensions or refactoring of routing, **React Router** should be used as per project guidelines, with routes defined in `App.tsx`.
*   **Notifications**:
    *   For all user feedback and notifications, use the existing `Toast` component and the `showToast` function provided by `App.tsx`.
*   **Modals**:
    *   Use the generic `Modal.tsx` component for all dialogs and pop-ups to ensure a consistent user experience.
# 5. Component Library

This document serves as a reference for all the React components used in the BB Manager application. The components are organized by their function and location within the `/components` directory.

---

### Root Component

#### `App.tsx`

The root component of the entire application. It doesn't render much UI directly but is responsible for orchestrating the entire application flow.

-   **Responsibilities**:
    -   Manages global state: `currentUser`, `activeSection`, `boys`, `settings`, `isLoading`, `error`, `hasUnsavedChanges`.
    -   Initializes Firebase and listens for authentication state changes (`onAuthStateChanged`).
    -   Handles the main "routing" logic by deciding which page component to render based on the `view` state.
    -   Orchestrates data fetching (`refreshData`) and offline synchronization (`syncPendingWrites`).
    -   Manages the "unsaved changes" confirmation modal.
    -   Manages and renders the global toast notification system.
-   **Key Props**: None.

---

### Page Components

These components represent the main views or "pages" of the application. They are rendered by `App.tsx`.

#### `HomePage.tsx`

The main landing page after login, displaying the member roster.

-   **Responsibilities**:
    -   Displays a list of all members, grouped and sorted by squad.
    -   Calculates and displays squad-level and individual-level statistics (total marks, attendance).
    -   Implements advanced search, filtering (by squad/year), and sorting (by name/marks/attendance) via a modal interface.
    -   Features a modern UI with toggleable icon buttons for accessing page controls.
    -   Handles user interactions for adding, editing, and deleting members.
    -   Navigates to the `BoyMarksPage` when a member's chart icon is clicked.
-   **Key Props**: `boys`, `setView`, `refreshData`, `activeSection`, `showToast`.

#### `WeeklyMarksPage.tsx`

The interface for entering weekly attendance and scores for all members.

-   **Responsibilities**:
    -   Displays all members grouped by squad.
    -   Displays real-time squad attendance statistics as marks are entered.
    -   Implements a read-only (locked) mode for past dates to prevent accidental edits, which can be unlocked by the user.
    -   Manages a date selector, defaulting to the next meeting day based on settings.
    -   Tracks unsaved changes and communicates this to the `App` component.
    -   Saves all changes for the selected date in a single batch operation.
-   **Key Props**: `boys`, `refreshData`, `setHasUnsavedChanges`, `activeSection`, `settings`, `showToast`.

#### `BoyMarksPage.tsx`

A detailed view showing the entire mark history for a single member.

-   **Responsibilities**:
    -   Fetches and displays the data for a single member based on the `boyId` prop.
    -   Lists all historical mark entries, sorted by date.
    -   Allows for editing of past scores, changing attendance status, and deleting mark entries.
    -   Tracks unsaved changes by performing a deep comparison between the original and edited marks.
    -   Saves all corrections and creates an audit log entry.
-   **Key Props**: `boyId`, `refreshData`, `setHasUnsavedChanges`, `activeSection`, `showToast`.

#### `DashboardPage.tsx`

A visual summary report view of member and squad performance.

-   **Responsibilities**:
    -   Renders a visual dashboard with key performance indicators.
    -   Displays a "Top 5 Members" leaderboard based on total marks.
    -   Shows a bar chart comparing the total marks accumulated by each squad.
    -   Presents an attendance trend heatmap, showing each squad's attendance percentage for every recorded date.
    -   Includes a detailed "Marks Breakdown by Month" table for granular reporting.
-   **Key Props**: `boys`, `activeSection`.

#### `AuditLogPage.tsx`

Displays a chronological history of all actions taken in the app.

-   **Responsibilities**:
    -   Fetches and displays all audit log entries.
    -   Provides the UI for reverting actions.
    -   Manages the state for the revert confirmation modal.
    -   Handles the `handleRevert` logic, which calls the appropriate inverse data service functions.
-   **Key Props**: `refreshData`, `activeSection`, `showToast`.

#### `SettingsPage.tsx`

Allows users to configure application settings.

-   **Responsibilities**:
    -   Displays form inputs for available settings (e.g., meeting day).
    -   Handles saving the settings to Firestore.
    -   Creates an audit log entry when settings are changed.
-   **Key Props**: `activeSection`, `currentSettings`, `onSettingsSaved`, `showToast`.

#### `HelpPage.tsx`

A static user guide for the application.

-   **Responsibilities**:
    -   Displays a structured help document with a table of contents and detailed sections.
    -   Uses small, non-interactive "preview" components to visually demonstrate UI elements.
-   **Key Props**: None.

#### `LoginPage.tsx` & `SectionSelectPage.tsx`

These components manage the initial user flow before the main application is accessible.

-   `LoginPage.tsx`: Handles user authentication with Firebase.
-   `SectionSelectPage.tsx`: Allows the authenticated user to choose which section (Company or Junior) to manage.

---

### UI & Form Components

#### `Header.tsx`

The main navigation bar at the top of the application.

-   **Responsibilities**:
    -   Provides navigation links to all main pages.
    -   Displays the currently logged-in user's email.
    -   Handles sign-out and switch-section actions.
    -   Dynamically changes its color scheme based on the `activeSection`.
    -   Manages its own state for the mobile menu (`isMenuOpen`).
-   **Key Props**: `setView`, `user`, `onSignOut`, `activeSection`, `onSwitchSection`.

#### `BoyForm.tsx`

A versatile form used for both creating and editing a member.

-   **Responsibilities**:
    -   Renders form inputs for a member's name, squad, year, and squad leader status.
    -   Adapts the available options (squads, years) based on the `activeSection`.
    -   Populates its fields with existing data when in "edit" mode (`boyToEdit` prop is provided).
    -   Handles form submission, validation, and calls the appropriate data service (`createBoy` or `updateBoy`).
-   **Key Props**: `boyToEdit`, `onSave`, `onClose`, `activeSection`.

#### `Modal.tsx`

A generic, reusable modal/dialog component.

-   **Responsibilities**:
    -   Renders a semi-transparent overlay and a centered content box.
    -   Controls its visibility based on the `isOpen` prop.
    -   Provides a consistent structure with a title and a close button.
-   **Key Props**: `isOpen`, `onClose`, `title`, `children`.

#### `Icons.tsx`

A collection of simple, stateless SVG icon components.

-   **Responsibilities**:
    -   Exports multiple functional components, each rendering a specific SVG icon.
    -   Accepts an optional `className` prop for easy styling with Tailwind CSS.

---

### Feedback & Visualization Components

#### `SkeletonLoaders.tsx`

Components used to provide a better loading experience.

-   **Responsibilities**:
    -   `HomePageSkeleton` and `BoyMarksPageSkeleton` render placeholder UIs that mimic the layout of their respective pages.
    -   This reduces layout shift and perceived wait time while data is being fetched.
-   **Key Props**: None.

#### `Toast.tsx`

A component for displaying a single, self-dismissing notification.

-   **Responsibilities**:
    -   Renders a toast message with a corresponding icon (success, error, info).
    -   Automatically dismisses itself after a set duration.
    -   Provides a close button for manual dismissal.
-   **Key Props**: `toast`, `removeToast`.

#### `BarChart.tsx`

A simple, reusable SVG bar chart.

-   **Responsibilities**:
    -   Renders a bar chart based on a given data set.
    -   Includes labels for each bar and its value.
    -   Used on the Dashboard to visualize squad performance.
-   **Key Props**: `data`.

# 5. Component Library

This document serves as a reference for all the React components used in the BB Manager application. The components are organized by their function and location within the `/components` directory.

---

### Root Component

#### `App.tsx`

The root component of the entire application. It doesn't render much UI directly but is responsible for orchestrating the entire application flow.

-   **Responsibilities**:
    -   Manages orchestration state via hooks: `currentUser`, `userRole`, `activeSection`,
        `boys`, `settings`, `authLoading`, `dataLoading`, `dataError`, `noRoleError`, `view`.
    -   Subscribes to Supabase auth changes via `useAuthAndRole` and loads the user's role from
        `profiles`.
    -   Handles view switching by deciding which page component to render based on the `view` state.
    -   Orchestrates data fetching (`refreshData`).
    -   Manages the "unsaved changes" confirmation modal.
    -   Manages and renders the global toast notification system.
    -   Integrates custom hooks: `useToastNotifications`, `useAuthAndRole`, `useSectionManagement`, `useAppData`, `useUnsavedChangesProtection`.
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
    -   Saves all corrections directly through the data service layer.
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

#### `SettingsPage.tsx`

Allows users to configure application settings specific to the currently active section.

-   **Responsibilities**:
    -   Displays form inputs for available section settings (e.g., meeting day).
    -   Handles saving the settings to Supabase, with client-side permission checks based on `userRole`.
    -   Provides a link to navigate to `AccountSettingsPage`.
    -   Persists section settings through the data service layer.
-   **Key Props**: `activeSection`, `currentSettings`, `onSettingsSaved`, `showToast`, `userRole`, `onNavigateToAccountSettings`.

#### `AccountSettingsPage.tsx`

Allows the currently logged-in user to manage their personal account settings.

-   **Responsibilities**:
    -   Provides a form for changing the user's password.
    -   Updates the password with Supabase Authentication.
    -   Displays user-friendly error messages for password changes.
-   **Key Props**: `showToast`, `activeSection`.

#### `LoginPage.tsx`

Handles user authentication with Supabase.

-   **Responsibilities**:
    -   Provides a form for email and password sign-in.
-   **Key Props**: none.

#### `SectionSelectPage.tsx`

Allows the authenticated user to choose which section (Company or Junior) to manage.

-   **Responsibilities**:
    -   Displays buttons for selecting Company or Junior sections.
    -   Provides actions for Sign Out.
-   **Key Props**: `onSelectSection`, `onSignOut`.

---

### UI & Form Components

#### `Header.tsx`

The main navigation bar at the top of the application.

-   **Responsibilities**:
    -   Provides navigation links to all main pages.
    -   Displays the currently logged-in user's email.
    -   Handles sign-out and switch-section actions.
    -   Dynamically changes its color scheme based on the `activeSection`.
    -   Conditionally renders navigation items based on `userRole`.
    -   Includes a profile dropdown menu for `Account Settings`, `Switch Section`, and `Log Out`.
    -   Manages its own state for the mobile menu (`isMenuOpen`).
-   **Key Props**: `setView`, `onSignOut`, `activeSection`, `onSwitchSection`.

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
    -   Includes accessibility features like focus trapping and Escape key dismissal.
-   **Key Props**: `isOpen`, `onClose`, `title`, `children`.

#### `Icons.tsx`

A collection of simple, stateless SVG icon components.

-   **Responsibilities**:
    -   Exports multiple functional components, each rendering a specific SVG icon.
    -   Includes icons for Plus, Pencil, Trash, Chart Bar, Undo, Clock, Search, Menu, X, Save, Cog, Switch Horizontal, Clipboard, Clipboard Document List, Check, Star, Check Circle, X Circle, Info Circle, Filter, Lock Closed, Lock Open, User Circle, Log Out, Calendar.
    -   Accepts an optional `className` prop for easy styling with Tailwind CSS.

#### `DatePicker.tsx`

A component for selecting dates, wrapping a native HTML `input type="date"`.

-   **Responsibilities**:
    -   Provides a date input field.
    -   Relies on the browser's native date picker functionality when the input is clicked.
    -   Accepts `value`, `onChange`, `disabled`, `ariaLabel`, and `accentRingClass` props for customization.
-   **Key Props**: `value`, `onChange`, `disabled`, `ariaLabel`, `accentRingClass`.

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
    -   Includes a progress bar indicating time until auto-dismissal.
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

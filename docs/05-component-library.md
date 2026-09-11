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
    -   On the live origin, blocks the app until a passkey exists, then turns off password sign-in.
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
    -   Features a modern UI with toggleable icon buttons for accessing page controls. On a phone, Import and Add Boy collapse to icons; an empty roster keeps those actions in the empty state instead of the header.
    -   Handles user interactions for adding, editing, deleting, and importing members from a past session.
    -   Navigates to the `BoyMarksPage` when a member's chart icon is clicked.
-   **Key Props**: `boys`, `setView`, `refreshData`, `activeSection`, `showToast`, `settings`.

#### `WeeklyMarksPage.tsx`

The interface for entering weekly attendance and scores for all members.

-   **Responsibilities**:
    -   Displays all members grouped by squad.
    -   Displays real-time squad attendance statistics as marks are entered. Unmarked rows are excluded from the percentage.
    -   Defaults new rows to Not recorded rather than Present.
    -   Implements a read-only (locked) mode for past dates to prevent accidental edits, which can be unlocked by the user.
    -   Manages a date selector, defaulting to the next meeting day based on settings.
    -   Tracks unsaved changes and communicates this to the `App` component.
    -   Saves all changes for the selected date in a single batch operation using a labelled save bar.
-   **Key Props**: `boys`, `refreshData`, `setHasUnsavedChanges`, `activeSection`, `settings`, `showToast`.

#### `BoyMarksPage.tsx`

A detailed view showing the entire mark history for a single member.

-   **Responsibilities**:
    -   Fetches and displays the data for a single member based on the `boyId` prop.
    -   Lists all historical mark entries, sorted by date.
    -   Allows for editing of past scores, changing attendance status, and deleting mark entries.
    -   Tracks unsaved changes by performing a deep comparison between the original and edited marks.
    -   Saves all corrections directly through the data service layer.
-   **Key Props**: `boyId`, `refreshData`, `setHasUnsavedChanges`, `activeSection`, `showToast`, `onBack`.

#### `DashboardPage.tsx`

A visual summary report view of member and squad performance.

-   **Responsibilities**:
    -   Renders a visual dashboard with key performance indicators.
    -   Displays a "Top 5 Members" leaderboard based on total marks.
    -   Shows a bar chart comparing the total marks accumulated by each squad.
    -   Presents an attendance trend heatmap, showing each squad's attendance percentage for every recorded date.
    -   Includes a detailed "Marks Breakdown by Month" table for granular reporting.
    -   Opens the Master Session PDF export modal.
-   **Key Props**: `boys`, `activeSection`, `settings`.

#### `ArchivesPage.tsx`

Read-only view of closed BB years.

-   **Responsibilities**:
    -   Lists archived sessions newest first.
    -   Loads that session's members and marks for the active section.
    -   Reuses `SessionReportModal` so staff can regenerate a Master PDF from archived data.
    -   Offers import into the current year’s live roster, with school year moved on by one.
-   **Key Props**: `activeSection`, `showToast`, `liveBoys`, `settings`, `refreshData`.

#### `SettingsPage.tsx`

Allows users to configure application settings specific to the currently active section.

-   **Responsibilities**:
    -   Displays form inputs for available section settings (e.g., meeting day).
    -   Lets captains and admins add, rename, and remove squads for the active section.
    -   Handles saving the settings to Supabase, with client-side permission checks based on `userRole`.
    -   Lets captains and admins archive both sections and start a new BB session.
    -   Provides a link to navigate to `AccountSettingsPage`.
    -   Persists section settings through the data service layer.
-   **Key Props**: `activeSection`, `currentSettings`, `onSettingsSaved`, `showToast`, `userRole`, `onNavigateToAccountSettings`, `refreshData`, `onNavigateToArchives`, `boys`.

#### `SquadsSettingsCard.tsx`

CRUD UI for the active section’s squad list, embedded in Section Settings.

-   **Responsibilities**:
    -   Lists configured squad numbers and optional nicknames.
    -   Adds the next unused squad number, renames on blur, and deletes empty squads.
    -   Refuses to delete the last squad or a squad that still has members.
-   **Key Props**: `activeSection`, `currentSettings`, `boys`, `userRole`, `canEdit`, `onSettingsSaved`, `showToast`.

#### `ImportFromSessionModal.tsx`

Lets staff copy returning boys from a closed BB year onto the live roster.

-   **Responsibilities**:
    -   Loads archived members for a chosen past session (no marks).
    -   Bumps school year by one, promotes Junior P7 into Company Year 8, and excludes Year 14 leavers.
    -   Creates live members with empty marks and records `imported_from_archived_member_id`.
-   **Key Props**: `isOpen`, `onClose`, `activeSection`, `liveBoys`, `destinationSquads`, `showToast`, `refreshData`, `initialSessionId`.

#### `AccountSettingsPage.tsx`

Allows the currently logged-in user to manage their personal account settings.

-   **Responsibilities**:
    -   Lets staff add, rename, and remove passkeys. The last live passkey cannot be removed.
    -   Hides the lasting password form on the live origin. Recovery mode still accepts a temporary password.
    -   Provides a form for changing the user's password on localhost, including the current password.
    -   Reauthenticates, then updates the password with Supabase Authentication.
    -   Can run in recovery mode after a reset-email session.
    -   Displays user-friendly error messages for password changes.
-   **Key Props**: `showToast`, `activeSection`, `recoveryMode`, `onRecoveryComplete`.

#### `PasskeysCard.tsx`

Passkey enrollment and management used by Account Settings.

-   **Responsibilities**:
    -   Lists the signed-in user's passkeys.
    -   Registers a new passkey through the WebAuthn ceremony.
    -   Renames or removes an existing passkey. On the live origin, the last passkey cannot be removed.
-   **Key Props**: `activeSection`, `showToast`.

#### `PasskeyEnrollmentGate.tsx`

Full-screen one-time migration shown on `bb-manager.vercel.app` after password sign-in when the account has no passkey.

-   **Responsibilities**:
    -   Requires creating a passkey before the rest of the app is usable.
    -   Replaces the old password so it no longer works.
    -   Offers Sign out if the browser cannot complete WebAuthn.
-   **Key Props**: `onComplete`, `onSignOut`.

#### `LoginPage.tsx`

Handles user authentication with Supabase.

-   **Responsibilities**:
    -   Offers passkey sign-in as the primary action when the browser supports WebAuthn.
    -   On the live origin, treats email/password as a one-time migration or lost-passkey recovery.
    -   Provides a form for email and password sign-in for localhost, CI, and that one-time live migration.
    -   Offers a Forgot password action that emails a reset link.
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
    -   Provides navigation links to all main pages, including Archives.
    -   Displays the currently logged-in user's email.
    -   Handles sign-out and switch-section actions.
    -   Dynamically changes its color scheme based on the `activeSection`.
    -   Conditionally renders navigation items based on `userRole`.
    -   Includes a profile dropdown menu for `Account Settings`, `Switch Section`, and `Log Out`.
    -   Manages its own state for the mobile menu (`isMenuOpen`).
-   **Key Props**: `setView`, `onSignOut`, `activeSection`, `onSwitchSection`, `currentUser`, `userRole`, `currentPage`.

#### `BoyForm.tsx`

A versatile form used for both creating and editing a member.

-   **Responsibilities**:
    -   Renders form inputs for a member's name, squad, year, and squad leader status.
    -   Adapts the available options (squads, years) based on the `activeSection` and configured squad list.
    -   Populates its fields with existing data when in "edit" mode (`boyToEdit` prop is provided).
    -   Handles form submission, validation, and calls the appropriate data service (`createBoy` or `updateBoy`).
-   **Key Props**: `boyToEdit`, `onSave`, `onClose`, `activeSection`, `squads`.

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
    -   Includes icons for Plus, Pencil, Trash, Chart Bar, Undo, Clock, Search, Menu, X, Save, Cog, Switch Horizontal, Clipboard, Clipboard Document List, Archive Box, Arrow Down Tray, Key, Check, Star, Check Circle, X Circle, Info Circle, Filter, Lock Closed, Lock Open, User Circle, Log Out, Calendar.
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

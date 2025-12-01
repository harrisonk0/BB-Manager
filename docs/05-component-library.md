# 5. Component Library

This document serves as a reference for all the React components used in the BB Manager application. The components are organized by their function and location within the `/components` directory.

---

### Root Component

#### `App.tsx`

The root component of the entire application. It doesn't render much UI directly but is responsible for orchestrating the entire application flow.

-   **Responsibilities**:
    -   Manages global state using custom hooks: `currentUser`, `userRoleInfo` (including role and sections), `activeSection`, `boys`, `settings`, `isLoading`, `error`, `noRoleError`, `hasUnsavedChanges`.
    -   Initializes Supabase and listens for authentication state changes (`onAuthStateChange`), including fetching the user's role and assigned sections.
    -   Handles the main "routing" logic by deciding which page component to render based on the `view` state, including special handling for unauthenticated users (Login, Signup, Password Reset), users without an assigned role (`noRoleError`), and users awaiting approval (`PendingApprovalPage`).
    -   Orchestrates data fetching (`refreshData`) and offline synchronization (`syncPendingWrites`).
    -   Manages the "unsaved changes" confirmation modal and the global toast notification system.
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
    -   Provides the UI for reverting actions (only available to Admins/Captains).
    -   Manages the state for the revert confirmation modal.
    -   Handles the `handleRevert` logic, which calls the appropriate inverse data service functions.
    -   Displays action-specific icons and colors for better readability.
-   **Key Props**: `refreshData`, `activeSection`, `showToast`, `userRole`.

#### `SettingsPage.tsx`

Allows users to configure application settings specific to the currently active section.

-   **Responsibilities**:
    -   Displays form inputs for available section settings (e.g., meeting day).
    -   Handles saving the settings to Supabase, with client-side permission checks based on `userRole`.
    -   Provides links to navigate to the `GlobalSettingsPage` and `AccountSettingsPage`.
    -   Creates audit log entries for all significant changes.
-   **Key Props**: `activeSection`, `currentSettings`, `onSettingsSaved`, `showToast`, `userRole`, `onNavigateToGlobalSettings`, `onNavigateToAccountSettings`.

#### `GlobalSettingsPage.tsx`

Provides administrative controls for managing user roles and approving new users.

-   **Responsibilities**:
    -   Displays a list of users with 'pending' status and allows Admins/Captains to approve (assign role/sections) or deny (delete account) access.
    -   Displays a list of all approved users with their assigned roles and sections, allowing Admins/Captains to update roles and section access (with restrictions, e.g., cannot change own role).
    -   Handles permanent user deletion via a Supabase Edge Function.
    -   Creates audit log entries for all significant changes.
-   **Key Props**: `activeSection`, `showToast`, `userRole`, `refreshData`, `currentUser`.

#### `AccountSettingsPage.tsx`

Allows the currently logged-in user to manage their personal account settings.

-   **Responsibilities**:
    -   Provides a form for changing the user's password using Supabase Auth.
    -   Creates an audit log entry for the password change.
-   **Key Props**: `showToast`.

#### `HelpPage.tsx`

A static user guide for the application.

-   **Responsibilities**:
    -   Displays a structured help document with a table of contents and detailed sections.
    -   Uses small, non-interactive "preview" components to visually demonstrate UI elements.
-   **Key Props**: None.

#### `LoginPage.tsx`

Handles user authentication with Supabase.

-   **Responsibilities**:
    -   Provides a form for email and password sign-in.
    -   Handles password reset requests via Supabase Auth.
    -   Navigates to the `SignupPage` for new user registration.
-   **Key Props**: `onNavigateToHelp`, `showToast`, `onNavigateToSignup`.

#### `SignupPage.tsx`

Allows new users to sign up.

-   **Responsibilities**:
    -   Provides a form for email and password entry.
    -   Creates a new Supabase user, who is automatically assigned the 'pending' role via a database trigger.
    -   Navigates to the `PendingApprovalPage` upon successful signup.
-   **Key Props**: `onNavigateToHelp`, `showToast`, `onNavigateBack`, `onSignupSuccess`.

#### `PendingApprovalPage.tsx`

A static page displayed immediately after signup, informing the user that their account is awaiting administrator approval.

-   **Responsibilities**:
    -   Displays a message and a sign-out button.
-   **Key Props**: None.

#### `PasswordResetPage.tsx`

A page displayed when a user clicks the password reset link in their email, allowing them to set a new password.

-   **Responsibilities**:
    -   Provides a form to set a new password using Supabase Auth.
    -   Signs the user out after a successful reset.
-   **Key Props**: `showToast`.

#### `SectionSelectPage.tsx`

Allows the authenticated user to choose which section (Company or Junior) to manage.

-   **Responsibilities**:
    -   Displays buttons for selecting Company or Junior sections.
    -   **Conditionally disables/greys out sections** if the user's role (`officer`) does not grant them access to that specific section.
    -   Persists the selected section in `localStorage`.
    -   Provides navigation to `HelpPage`, `GlobalSettingsPage`, and a `Sign Out` button.
    -   Conditionally renders "Global Settings" based on `userRole`.
-   **Key Props**: `onSelectSection`, `onOpenHelpModal`, `onNavigateToGlobalSettings`, `userRoleInfo`, `onSignOut`, `showToast`.

---

### UI & Form Components

#### `Header.tsx`

The main navigation bar at the top of the application.

-   **Responsibilities**:
    -   Provides navigation links to all main pages.
    -   Displays the currently logged-in user's email.
    -   Handles sign-out and switch-section actions.
    -   Dynamically changes its color scheme based on the `activeSection`.
    -   Conditionally renders navigation items based on `userRole` (e.g., Audit Log only for Admin/Captain).
-   **Key Props**: `setView`, `user`, `onSignOut`, `activeSection`, `onSwitchSection`, `userRole`, `onOpenHelpModal`.

#### `BoyForm.tsx`

A versatile form used for both creating and editing a member.

-   **Responsibilities**:
    -   Renders form inputs for a member's name, squad, year, and squad leader status.
    -   Adapts the available options (squads, years) based on the `activeSection`.
    -   Handles form submission, validation, and calls the appropriate data service (`createBoy` or `updateBoy`).
-   **Key Props**: `boyToEdit`, `onSave`, `onClose`, `activeSection`, `allBoys`.

#### `Modal.tsx`

A generic, reusable modal/dialog component with accessibility features.

-   **Key Props**: `isOpen`, `onClose`, `title`, `children`.

#### `Icons.tsx`

A collection of simple, stateless SVG icon components.

-   **Key Props**: `className`.

#### `DatePicker.tsx`

A component for selecting dates, wrapping a native HTML `input type="date"`.

-   **Key Props**: `value`, `onChange`, `disabled`, `ariaLabel`, `accentRingClass`.

---

### Feedback & Visualization Components

#### `SkeletonLoaders.tsx`

Components used to provide a better loading experience.

-   **Key Props**: None.

#### `Toast.tsx`

A component for displaying a single, self-dismissing notification.

-   **Key Props**: `toast`, `removeToast`.

#### `BarChart.tsx`

A simple, reusable SVG bar chart.

-   **Key Props**: `data`.
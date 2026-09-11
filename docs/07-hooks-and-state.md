# 7. Hooks & State

This document summarises the app's custom hook layer.

## Hook Inventory

### `useAuthAndRole`

- Subscribes to Supabase auth changes
- Maps the auth user into the app's `AppUser` shape
- Loads the current role from `profiles`
- Treats a missing or invalid role as Access Denied
- Surfaces password-recovery sessions so Account Settings can set a new password. On the live origin that password is temporary until a passkey is created.

### `useSectionManagement`

- Persists the active section in `localStorage` after validating `company` | `junior`
- Exposes helpers for switching or clearing section context

`hooks/sectionStorage.ts` and `hooks/rosterFilters.ts` hold the storage helpers. Roster search/sort persist in `sessionStorage` per section.

### `useAppData`

- Loads members and settings (meeting day and squads) for the active section
- Exposes loading, error, and refresh state

### `useUnsavedChangesProtection`

- Blocks navigation, section switches, or sign-out when forms are dirty
- Hooks browser unload protection

### `useToastNotifications`

- Stores and removes transient toast messages

## State Sources

- Supabase Auth session
- Supabase data (`profiles`, `members`, `marks`, `settings`, `bb_sessions`, `archived_members`, `archived_marks`)
- `localStorage['activeSection']` (validated)
- `sessionStorage` roster filters
- React state held in hooks and components

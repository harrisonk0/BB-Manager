# 7. Hooks & State

This document summarises the app's custom hook layer.

## Hook Inventory

### `useAuthAndRole`

- Subscribes to Supabase auth changes
- Maps the auth user into the app's `AppUser` shape
- Loads the current role from `profiles`
- Tracks password-recovery state

### `useSectionManagement`

- Persists the active section in `localStorage`
- Exposes helpers for switching or clearing section context

### `useAppData`

- Loads members and settings for the active section
- Exposes loading, error, and refresh state

### `useUnsavedChangesProtection`

- Blocks navigation, section switches, or sign-out when forms are dirty
- Hooks browser unload protection

### `useToastNotifications`

- Stores and removes transient toast messages

## State Sources

- Supabase Auth session
- Supabase data (`profiles`, `members`, `marks`, `settings`, `invite_codes`, `audit_logs`)
- `localStorage['activeSection']`
- React state held in hooks and components

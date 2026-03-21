# 6. Data & Services

This document describes how the app talks to Supabase.

## Service Modules

- `services/supabaseClient.ts`: shared Supabase client
- `services/supabaseAuth.ts`: sign-in, sign-out, password update, auth subscription
- `services/db.ts`: members, marks, profiles, and role-guardrail helpers
- `services/settings.ts`: section settings

## Live Table Mapping

The current app talks to these tables:

- `profiles`: email and application role
- `settings`: section-level settings
- `members`: core member records
- `marks`: normalized attendance and score rows
- `invite_codes`: legacy invite-code records retained for compatibility only
- `audit_logs`: legacy table retained for historical data only

## Data Flow

1. A component calls a service function.
2. The service validates inputs and shapes payloads for Supabase.
3. Supabase returns rows or errors.
4. The component or hook updates UI state and feedback.

## Important Notes

- The UI-facing `Boy` model is assembled from `members` and `marks`.
- Role information is loaded from `profiles`, not from a separate `user_roles` table.
- The active UI no longer writes audit-log entries or uses client-side error reporting.

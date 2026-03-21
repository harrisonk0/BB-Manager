# 6. Data & Services

This document describes how the app talks to Supabase.

## Service Modules

- `services/supabaseClient.ts`: shared Supabase client
- `services/supabaseAuth.ts`: sign-in, sign-up, sign-out, password reset, auth subscription
- `services/db.ts`: members, marks, profiles, invite codes, audit logs
- `services/settings.ts`: section settings
- `services/errorMonitoring.ts`: operational error reporting

## Live Table Mapping

The current app talks to these tables:

- `profiles`: email and application role
- `settings`: section-level settings
- `members`: core member records
- `marks`: normalized attendance and score rows
- `invite_codes`: role-scoped signup codes
- `audit_logs`: append-only operational history

## Data Flow

1. A component calls a service function.
2. The service validates inputs and shapes payloads for Supabase.
3. Supabase returns rows or errors.
4. The component or hook updates UI state and feedback.

## Important Notes

- The UI-facing `Boy` model is assembled from `members` and `marks`.
- Role information is loaded from `profiles`, not from a separate `user_roles` table.
- Invite-code signup is finalised through the `claim_invite_code` database function so role assignment and code consumption stay in sync.
- Audit-log writes happen alongside important data mutations.

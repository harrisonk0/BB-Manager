# 6. Data & Services

This document describes how the app talks to Supabase.

## Service Modules

- `services/supabaseClient.ts`: shared Supabase client
- `services/supabaseAuth.ts`: sign-in, sign-out, password update, password reset, auth subscription
- `services/db.ts`: members and marks
- `services/reporting/sessionReport.ts`: pure session-report aggregation for dashboard PDF export
- `services/settings.ts`: section settings for the seeded `company` and `junior` rows
- `services/observability.ts`: `reportError` used by the root error boundary
- `services/appUrl.ts`: Auth redirect base URL

## Live Table Mapping

The current app talks to these tables:

- `profiles`: email and application role
- `settings`: section-level settings, one seeded row per section
- `members`: core member records
- `marks`: normalized attendance and score rows

## Data Flow

1. A component calls a service function.
2. The service validates inputs and shapes payloads for Supabase.
3. Supabase returns rows or errors.
4. The component or hook updates UI state and feedback.

## Important Notes

- The UI-facing `Boy` model is assembled from `members` and `marks`.
- Role information is loaded from `profiles`, not from a separate `user_roles` table.
- Section settings are updated in place; missing `settings` rows throw `SettingsUnavailableError` instead of inventing a Friday meeting day.
- The active UI is limited to member management, marks entry, dashboard reporting, session PDF export, and section settings.

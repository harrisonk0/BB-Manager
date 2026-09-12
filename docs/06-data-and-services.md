# 6. Data & Services

This document describes how the app talks to Supabase.

## Service Modules

- `services/supabaseClient.ts`: shared Supabase client
- `services/supabaseAuth.ts`: passkey sign-in/registration, password sign-in, password reset, one-time live password retirement after passkey enrollment (sends `current_password` because hosted Auth requires it)
- `services/passkeyMigration.ts`: live-origin gate rules and in-memory password used only to turn password sign-in off
- `services/db.ts`: members and marks
- `services/sessions.ts`: closed BB years, archived members/marks, and `start_new_bb_session`
- `services/sessionArchiveModel.ts`: mapping archived rows onto the live `Boy` model
- `services/reporting/sessionReport.ts`: pure session-report aggregation for dashboard PDF export
- `services/settings.ts`: section settings for the seeded `company` and `junior` rows, including the squad list
- `services/sectionSquads.ts`: parse/validate squad JSON, display names, and colours
- `services/importFromSession.ts`: school-year bump rules and live-roster import from archived members
- `services/observability.ts`: `reportError` used by the root error boundary
- `services/appUrl.ts`: Auth redirect base URL

## Live Table Mapping

The current app talks to these tables:

- `profiles`: email and application role
- `settings`: section-level settings, one seeded row per section
- `members`: core member records
- `marks`: normalized attendance and score rows
- `bb_sessions`: closed BB years
- `archived_members` / `archived_marks`: snapshots copied when a captain or admin starts a new session

## Data Flow

1. A component calls a service function.
2. The service validates inputs and shapes payloads for Supabase.
3. Supabase returns rows or errors.
4. The component or hook updates UI state and feedback.

## Important Notes

- Weekly Marks saves the selected date through `save_weekly_marks_snapshot`. If that RPC is rejected, the client retries with a direct `marks` delete of cleared rows and an upsert of the remaining snapshot.
- Role information is loaded from `profiles`, not from a separate `user_roles` table.
- Section settings are updated in place; missing `settings` rows throw `SettingsUnavailableError` instead of inventing a Friday meeting day.
- Captains and admins edit the `settings.squads` JSON list from Section Settings. Members store the squad number; nicknames are optional.
- Importing a boy from Past Sessions creates a new live `members` row with empty marks, school year moved on by one, and `imported_from_archived_member_id` set so the same archive row cannot be imported twice.
- The active UI includes member management, marks entry, dashboard reporting, session PDF export, past-session archives, section settings, passkey sign-in, and a one-time live password-to-passkey migration.

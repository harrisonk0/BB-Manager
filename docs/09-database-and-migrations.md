# 9. Database and Migrations

This repo relies on a live Supabase project as the database source of truth.

## Verified Current Shape

Verified on 2026-09-11:

- Tables: `profiles`, `settings` (including `squads` JSON), `members` (including `imported_from_archived_member_id`), `marks`, `bb_sessions`, `archived_members`, `archived_marks`, plus leftover `invite_codes` and `audit_logs`
- RLS: enabled on all of them
- `profiles.role` is nullable; new Auth users do not receive `officer` by default
- Leftover invite RPCs exist but client `EXECUTE` is revoked
- Captains and admins can close a BB year with `start_new_bb_session`
- Remediation SQL: `supabase/migrations/20260911120000_audit_remediations.sql`
- Session archive SQL: `supabase/migrations/20260911140000_bb_sessions.sql`
- Section squads and import SQL: `supabase/migrations/20260911170000_section_squads_and_import.sql`
- Marks save RPC fix: `supabase/migrations/20260912100000_fix_marks_save_rpcs.sql` (`save_weekly_marks_snapshot` and `save_member_marks_patch` run as `SECURITY DEFINER` after checking `current_app_role()`, and replace a date’s rows with DELETE then INSERT instead of `ON CONFLICT DO UPDATE`)
- Generated client types: `types/database.ts`

The current app depends on `profiles`, `settings`, `members`, `marks`, `bb_sessions`, `archived_members`, and `archived_marks`.
The live project also contains legacy invite-code and audit-log objects, but they are outside the current app surface.

## Workflow

- Treat the live Supabase schema as authoritative.
- Inspect schema and policies with Supabase MCP tools before making assumptions.
- Apply schema changes through Supabase migrations or MCP-driven database changes, not ad-hoc dashboard edits.
- Update app code and docs in the same change when table names, functions, or permissions change.
- Keep `members`, `marks`, and `settings` policies tied to valid app roles from `profiles`, not merely `auth.role() = 'authenticated'`.
- Keep one seeded `settings` row per section and treat missing rows as a bootstrap error that should be corrected, not created lazily from the browser.
- `settings.squads` is a JSON array of `{number, label}` objects. Company defaults to 1–3 and Junior to 1–4.
- `members.imported_from_archived_member_id` uniquely records which archived member a live boy was imported from.
- `npm run check:db-contract` is the fast live-backend check for the client contract: sign-in, `current_app_role()`, the seeded `settings` rows for `company` and `junior`, and readable `bb_sessions`.
- `npm run check:auth-config` confirms public signup is disabled and passkeys are enabled.
- Isolated Playwright can validate the client contract against live data, but it cannot prove live RLS policy shape without privileged Supabase inspection.
- `save_weekly_marks_snapshot` and `save_member_marks_patch` must keep an authorization check (`current_app_role()` in `admin` / `captain` / `officer`) because they run as `SECURITY DEFINER`. Apply `supabase/migrations/20260912100000_fix_marks_save_rpcs.sql` on the hosted project before relying on that behavior.
- The current app no longer exposes invite-code provisioning. Do not call leftover invite RPCs from the client.

## Important Historical Note

Older docs and archived audits may refer to legacy tables such as `user_roles` or `boys`. The current app and live database use `profiles`, `members`, and `marks` instead.

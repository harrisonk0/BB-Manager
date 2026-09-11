# 9. Database and Migrations

This repo relies on a live Supabase project as the database source of truth.

## Verified Current Shape

Verified on 2026-09-11:

- Tables: `profiles`, `settings`, `members`, `marks`, `bb_sessions`, `archived_members`, `archived_marks`, plus leftover `invite_codes` and `audit_logs`
- RLS: enabled on all of them
- `profiles.role` is nullable; new Auth users do not receive `officer` by default
- Leftover invite RPCs exist but client `EXECUTE` is revoked
- Captains and admins can close a BB year with `start_new_bb_session`
- Remediation SQL: `supabase/migrations/20260911120000_audit_remediations.sql`
- Session archive SQL: `supabase/migrations/20260911140000_bb_sessions.sql`
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
- `npm run check:db-contract` is the fast live-backend check for the client contract: sign-in, `current_app_role()`, the seeded `settings` rows for `company` and `junior`, and readable `bb_sessions`.
- `npm run check:auth-config` confirms public signup is disabled.
- Isolated Playwright can validate the client contract against live data, but it cannot prove live RLS policy shape without privileged Supabase inspection.
- The current app no longer exposes invite-code provisioning. Do not call leftover invite RPCs from the client.

## Important Historical Note

Older docs and archived audits may refer to legacy tables such as `user_roles` or `boys`. The current app and live database use `profiles`, `members`, and `marks` instead.

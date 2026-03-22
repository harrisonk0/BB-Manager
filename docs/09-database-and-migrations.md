# 9. Database and Migrations

This repo relies on a live Supabase project as the database source of truth.

## Verified Current Shape

Verified on 2026-03-22:

- Tables: `profiles`, `settings`, `members`, `marks`, `invite_codes`, `audit_logs`
- RLS: enabled on all of them

The current app only depends on `profiles`, `settings`, `members`, and `marks`.
The live project also contains legacy invite-code and audit-log objects, but they are outside the current app surface.

Latest migrations visible in the live project at the time of verification:

- `20260322185938 replace_transactional_mark_write_rpcs`
- `20260322192041 fix_save_weekly_marks_snapshot_member_alias`

## Workflow

- Treat the live Supabase schema as authoritative.
- Inspect schema and policies with Supabase MCP tools before making assumptions.
- Apply schema changes through Supabase migrations or MCP-driven database changes, not ad-hoc dashboard edits.
- Update app code and docs in the same change when table names, functions, or permissions change.
- Keep `members`, `marks`, and `settings` policies tied to valid app roles from `profiles`, not merely `auth.role() = 'authenticated'`.
- Keep one seeded `settings` row per section and treat missing rows as a bootstrap error that should be corrected, not created lazily from the browser.
- `npm run check:db-contract` is the fast live-backend check for the client contract: sign-in, `current_app_role()`, and the seeded `settings` rows for `company` and `junior`.
- CI and browser smoke tests can validate the client contract against live data, but they cannot prove live RLS policy shape without privileged Supabase inspection.
- The current app no longer exposes invite-code provisioning, recovery, or audit-log flows.

## Important Historical Note

Older docs and archived audits may refer to legacy tables such as `user_roles` or `boys`. The current app and live database use `profiles`, `members`, and `marks` instead.

# 9. Database and Migrations

This repo relies on a live Supabase project as the database source of truth.

## Verified Current Shape

Verified on 2026-03-21:

- Tables: `profiles`, `settings`, `members`, `marks`, `invite_codes`, `audit_logs`
- RLS: enabled on all of them
- Helper functions present:
  - `current_app_role`
  - `validate_invite_code`
  - `claim_invite_code`
  - `cleanup_old_invite_codes`

Latest migration visible in the live project at the time of verification:

- `20260320190925 repair_live_schema_for_app_compatibility_v2`

## Workflow

- Treat the live Supabase schema as authoritative.
- Inspect schema and policies with Supabase MCP tools before making assumptions.
- Apply schema changes through Supabase migrations or MCP-driven database changes, not ad-hoc dashboard edits.
- Update app code and docs in the same change when table names, functions, or permissions change.
- The current app no longer exposes invite-code provisioning, recovery, or audit-log flows, even though legacy invite-code objects still exist in the live project.

## Important Historical Note

Older docs and archived audits may refer to legacy tables such as `user_roles` or `boys`. The current app and live database use `profiles`, `members`, and `marks` instead.

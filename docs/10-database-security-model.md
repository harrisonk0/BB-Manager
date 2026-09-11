# 10. Database Security Model

This is the current high-level security summary for the live Supabase project used by BB Manager.

## Live Security Facts

Verified on 2026-09-11:

- RLS is enabled on `profiles`, `settings`, `members`, `marks`, `invite_codes`, and `audit_logs`.
- Public signup is disabled.
- `anon` table privileges and leftover invite RPC `EXECUTE` are revoked from client roles.

The active UI only relies on `profiles`, `settings`, `members`, and `marks`.
The live database also retains legacy invite-code and audit-log objects for compatibility.

## Security Principles

- Browser code only receives public client credentials.
- Authorization must be enforced in Supabase, not in React components.
- App roles are derived from `profiles`.
- Access to `members`, `marks`, and `settings` requires a valid app role from `profiles`; authenticated Supabase users without a matching profile row should not be able to use core app tables.
- `npm run check:db-contract` and isolated Playwright can catch broken client assumptions, missing seeded rows, and failed writes, but they are not a substitute for inspecting live RLS policies.
- Manual account provisioning is the supported path; public signup is disabled.
- Password changes require the current password (or a recovery session from a reset email).

## Role Model

The app recognises three roles:

- `officer`
- `captain`
- `admin`

The UI uses those roles to shape workflows, but the database remains the enforcement boundary.

## Sensitive Areas

- `profiles` controls application access
- `settings` is seeded with one row for `company` and one row for `junior`, and settings updates modify those rows in place
- `invite_codes` and `audit_logs` are legacy history data and are not written by the current app

Changes that affect any of those areas should be treated as security-sensitive and reflected in both code and docs.

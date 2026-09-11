# 10. Database Security Model

This is the current high-level security summary for the live Supabase project used by BB Manager.

## Live Security Facts

Verified on 2026-09-11:

- RLS is enabled on `profiles`, `settings`, `members`, `marks`, `bb_sessions`, `archived_members`, `archived_marks`, `invite_codes`, and `audit_logs`.
- Public signup is disabled.
- Passkey authentication is enabled for relying party `bb-manager.vercel.app`.
- `anon` table privileges and leftover invite RPC `EXECUTE` are revoked from client roles.
- `start_new_bb_session` is executable by authenticated captains and admins only; the function itself checks `current_app_role()`.

The active UI relies on `profiles`, `settings`, `members`, `marks`, `bb_sessions`, `archived_members`, and `archived_marks`.
The live database also retains legacy invite-code and audit-log objects for compatibility.

## Security Principles

- Browser code only receives public client credentials.
- Authorization must be enforced in Supabase, not in React components.
- App roles are derived from `profiles`.
- Access to `members`, `marks`, and `settings` requires a valid app role from `profiles`; authenticated Supabase users without a matching profile row should not be able to use core app tables.
- `npm run check:db-contract` and isolated Playwright can catch broken client assumptions, missing seeded rows, and failed writes, but they are not a substitute for inspecting live RLS policies.
- Manual account provisioning is the supported path; public signup is disabled.
- Staff sign in with a passkey on the live site. The next password sign-in there is a one-time migration: the app requires a passkey, then replaces the password so it no longer works. Email and password remain for localhost, CI, and lost-passkey recovery.
- Lost-passkey recovery uses a reset email. The new password is temporary; the user must add a passkey, after which password sign-in is turned off again.

## Role Model

The app recognises three roles:

- `officer`
- `captain`
- `admin`

The UI uses those roles to shape workflows, but the database remains the enforcement boundary.

## Sensitive Areas

- `profiles` controls application access
- `settings` is seeded with one row for `company` and one row for `junior`, and settings updates modify those rows in place
- `bb_sessions`, `archived_members`, and `archived_marks` are append-only from the client: staff can SELECT, and captains/admins start a new year through `start_new_bb_session`
- `invite_codes` and `audit_logs` are legacy history data and are not written by the current app

Changes that affect any of those areas should be treated as security-sensitive and reflected in both code and docs.

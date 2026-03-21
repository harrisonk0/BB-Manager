# 10. Database Security Model

This is the current high-level security summary for the live Supabase project used by BB Manager.

## Live Security Facts

Verified on 2026-03-21:

- RLS is enabled on `profiles`, `settings`, `members`, `marks`, `invite_codes`, and `audit_logs`.

The active UI only relies on `profiles`, `settings`, `members`, and `marks`.
The live database also retains legacy invite-code and audit-log objects for compatibility.

## Security Principles

- Browser code only receives public client credentials.
- Authorization must be enforced in Supabase, not in React components.
- App roles are derived from `profiles`.
- Manual account provisioning is the supported path; the UI no longer exposes invite-code signup or recovery flows.

## Role Model

The app recognises three roles:

- `officer`
- `captain`
- `admin`

The UI uses those roles to shape workflows, but the database remains the enforcement boundary.

## Sensitive Areas

- `profiles` controls application access
- `invite_codes` and `audit_logs` are legacy history data and are not written by the current app

Changes that affect any of those areas should be treated as security-sensitive and reflected in both code and docs.

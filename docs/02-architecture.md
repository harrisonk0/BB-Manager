# 2. Architecture

[`ARCHITECTURE.md`](../ARCHITECTURE.md) is the canonical system overview. This document is the shorter companion focused on how the client integrates with Supabase.

## Summary

- BB Manager is a browser-only React SPA.
- Vercel serves the static assets.
- Supabase handles auth, storage, and authorization.
- There is no in-repo Express backend or API layer.

## Live Data Model

The app currently maps to these public tables:

- `profiles`
- `settings`
- `members`
- `marks`

`services/db.ts` translates between the UI-facing `Boy` model and the normalized `members` + `marks` tables used in Supabase.

## Integration Pattern

```text
React component -> hook -> services/* -> Supabase
```

- Auth flows live in `services/supabaseAuth.ts`.
- Section settings live in `services/settings.ts`.
- CRUD and role-guardrail helpers live in `services/db.ts`.

## Security Notes

- The client uses only public Supabase credentials.
- RLS is enabled on all live application tables.
- Role checks in the UI are convenience checks only; enforcement lives in Supabase.
- Manual account provisioning lives in Supabase; the UI covers sign-in, section selection, roster management, marks entry, dashboard, settings, and account password changes.

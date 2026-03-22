# 4. Deployment

BB Manager is deployed as a static SPA on Vercel.

## Required Environment Variables

Set these in the Vercel project for Preview and Production:

```bash
VITE_SUPABASE_URL="https://<your-project-ref>.supabase.co"
VITE_SUPABASE_ANON_KEY="<your-public-anon-key>"
```

## Vercel Settings

- Framework preset: `Vite`
- Build command: `npm run build`
- Output directory: `dist`

`vercel.json` already rewrites all routes to `/` so the SPA can handle navigation client-side.

## Supabase Auth Settings

In Supabase Auth URL configuration:

- Set `Site URL` to the canonical production URL.
- Add local development and preview URLs to `Additional Redirect URLs` as needed.

## Deployment Checklist

1. Confirm Vercel env vars are present for the target environment.
2. Deploy from the main branch or the intended release branch.
3. Run `npm run check:db-contract` against the target environment credentials or confirm the CI run passed with the intended deployment inputs.
4. Verify sign-in works for manually provisioned users.
5. Verify the production users have the expected roles in `profiles`.
6. Verify `settings` has seeded rows for both `company` and `junior`.
7. Smoke-test auth, section settings persistence, member CRUD, marks entry, and dashboard behavior against the live backend.
8. Treat CI smoke results as client-contract checks only; use Supabase inspection for live RLS policy verification.

# 4. Deployment

BB Manager is deployed as a static SPA on Vercel.

## Required Environment Variables

Set these in the Vercel project for Preview and Production:

```bash
VITE_SUPABASE_URL="https://<your-project-ref>.supabase.co"
VITE_SUPABASE_ANON_KEY="<your-public-anon-key>"
VITE_APP_URL="https://<your-production-domain>"
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
3. Verify sign-in, sign-up, invite-code claim, and password reset flows.
4. Verify the production users have the expected roles in `profiles`.
5. Smoke-test member CRUD, marks entry, settings, invite codes, and audit logs.

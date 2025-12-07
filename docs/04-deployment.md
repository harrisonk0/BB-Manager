# 4. Deployment

BB Manager is a static React application that consumes Supabase Auth and database APIs. You can deploy the built assets to any static host (e.g., Vercel, Netlify, Cloudflare Pages, or Supabase Storage + CDN) as long as the Supabase environment variables are configured at build time.

## Prerequisites
- Supabase project with the required tables, RLS enabled, and production credentials (Project URL and anon key).
- Node.js/npm to run the production build (`npm run build`).

## Build
1. Set environment variables for the build step:
   ```
   VITE_SUPABASE_URL="https://<your-project-ref>.supabase.co"
   VITE_SUPABASE_ANON_KEY="<public-anon-key>"
   ```
2. Run `npm install` (or your preferred package manager).
3. Run `npm run build` to produce the `dist/` folder.

## Deploy to Vercel (example)
1. Push your repo to GitHub.
2. Create a new Vercel project from the repo.
3. Add the two environment variables above in Vercel project settings (apply to Preview and Production).
4. Trigger a deploy; Vercel will build with Vite and host the static output.

## Other Hosts
- **Netlify/Cloudflare Pages**: Point to `npm run build` as the build command and `dist/` as the publish directory; add the same env vars.
- **Supabase Storage + CDN**: Upload the `dist/` contents to a public bucket and serve via the Supabase CDN.

## Post-deploy Checklist
- Confirm Supabase Auth sign-in/sign-up works in production.
- Verify `user_roles` contains the production users and roles.
- Test CRUD flows (boys, audit logs, invite codes, settings) against the production Supabase instance.

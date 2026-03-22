# BB Manager

BB Manager is a Vite-powered React SPA for managing Boys' Brigade members, marks, and section settings against a Supabase backend.

## Production Shape

- Frontend: React 19 + TypeScript
- Build tool: Vite
- Styling: Tailwind CSS
- Backend: Supabase Auth + Postgres
- Deployment: Vercel

There is no in-repo Express server or Docker runtime. The app is built as a static SPA and deployed on Vercel with SPA rewrites via [`vercel.json`](./vercel.json).

## Quick Start

1. Install dependencies with `npm install`.
2. Create a local `.env` from [`.env.example`](./.env.example).
3. Start the dev server with `npm run dev`.
4. Run `npm run check:db-contract`, `npm run typecheck`, `npm run test:run`, and `npm run build` before shipping changes.

## Testing

- `npm run check:db-contract` reads `.env` and `.env.local`, signs in with the smoke-test user, resolves `current_app_role()`, and confirms the seeded `settings` rows for `company` and `junior` are readable through the published client credentials.
- `npm run test:run` runs the lean automated suite used by CI on every push and pull request.
- `npm run test:coverage` reports coverage for the same suite.
- `npm run test:e2e` reads `.env` and `.env.local` and runs the browser smoke suite against a real Supabase-backed environment. It requires `E2E_TEST_EMAIL` and `E2E_TEST_PASSWORD`.
- `tests/e2e/` contains manual Supabase-backed smoke-test runbooks for auth, section settings, member CRUD, and marks workflows.

The CI smoke suite expects the test account to have a valid app role, seeded `settings` rows for both sections, and at least one member in the Company section so the settings and weekly-marks save flows have real data to exercise.
It verifies the client-visible contract only; it does not prove every live RLS restriction without privileged Supabase inspection.

## Environment Variables

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `E2E_TEST_EMAIL`
- `E2E_TEST_PASSWORD`

## Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md): canonical system overview
- [AGENTS.md](./AGENTS.md): contributor and agent operating guide
- [docs/03-getting-started.md](./docs/03-getting-started.md): local setup
- [docs/04-deployment.md](./docs/04-deployment.md): Vercel deployment runbook
- [docs/user-guide.md](./docs/user-guide.md): handout for new users

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

- `npm run check:auth-config` confirms hosted Auth has public signup disabled.
- `npm run check:db-contract` reads `.env` and `.env.local`, signs in with the test user, resolves `current_app_role()`, confirms the seeded `settings` rows for `company` and `junior`, and confirms `bb_sessions` is readable through the published client credentials.
- `npm run test:run` runs the lean automated suite used by CI on every push and pull request.
- `npm run test:coverage` reports coverage for the same suite.
- `npm run test:e2e` reads `.env` and `.env.local` and runs isolated Playwright flows that create/delete a `ZZZ-E2E-*` sentinel member. It requires `E2E_TEST_EMAIL` and `E2E_TEST_PASSWORD`.
- `tests/e2e/smoke.e2e.ts` mutates live Company settings and an existing member’s marks. It is ignored unless `E2E_ALLOW_PRODUCTION_MUTATION=1`.
- `tests/e2e/` also contains manual Supabase-backed smoke-test runbooks for auth, section settings, member CRUD, and marks workflows.

The isolated Playwright suite expects the test account to have a valid app role and seeded `settings` rows for both sections.
It verifies the client-visible contract only; it does not prove every live RLS restriction without privileged Supabase inspection.

## Environment Variables

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_APP_URL`
- `E2E_TEST_EMAIL`
- `E2E_TEST_PASSWORD`

## Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md): canonical system overview
- [AGENTS.md](./AGENTS.md): contributor and agent operating guide
- [docs/03-getting-started.md](./docs/03-getting-started.md): local setup
- [docs/04-deployment.md](./docs/04-deployment.md): Vercel deployment runbook
- [docs/11-audit-remediation.md](./docs/11-audit-remediation.md): 2026-09-11 finding closeout
- [docs/user-guide.md](./docs/user-guide.md): handout for new users

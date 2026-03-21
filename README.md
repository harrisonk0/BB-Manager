# BB Manager

BB Manager is a Vite-powered React SPA for managing Boys' Brigade members, marks, settings, invite codes, and audit logs against a Supabase backend.

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
4. Run `npm run typecheck`, `npm run build`, and `npm run test:run` before shipping changes.

## Environment Variables

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_APP_URL`

## Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md): canonical system overview
- [AGENTS.md](./AGENTS.md): contributor and agent operating guide
- [docs/01-project-structure.md](./docs/01-project-structure.md): repo map
- [docs/02-architecture.md](./docs/02-architecture.md): Supabase integration summary
- [docs/03-getting-started.md](./docs/03-getting-started.md): local setup
- [docs/04-deployment.md](./docs/04-deployment.md): Vercel deployment runbook
- [docs/05-component-library.md](./docs/05-component-library.md): component reference
- [docs/06-data-and-services.md](./docs/06-data-and-services.md): services and data layer
- [docs/07-hooks-and-state.md](./docs/07-hooks-and-state.md): hook/state coordination
- [docs/08-types.md](./docs/08-types.md): TypeScript type reference
- [docs/09-database-and-migrations.md](./docs/09-database-and-migrations.md): live database workflow
- [docs/10-database-security-model.md](./docs/10-database-security-model.md): current security model

Historical material lives under [`docs/archive/`](./docs/archive/).

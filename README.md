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
4. Run `npm run typecheck`, `npm run build`, and `npm run test:run` before shipping changes.

## Environment Variables

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md): canonical system overview
- [AGENTS.md](./AGENTS.md): contributor and agent operating guide
- [docs/03-getting-started.md](./docs/03-getting-started.md): local setup
- [docs/04-deployment.md](./docs/04-deployment.md): Vercel deployment runbook
- [docs/user-guide.md](./docs/user-guide.md): handout for new users

Historical material lives under [`docs/archive/`](./docs/archive/).

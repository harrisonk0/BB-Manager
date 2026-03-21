# BB-Manager Agent Guide

## Purpose

This file is the working guide for contributors and coding agents making changes in this repo.
Keep it aligned with the actual codebase, deployment model, and live Supabase shape.

## Current Stack

- Frontend: React 19 + TypeScript + Vite
- Styling: Tailwind CSS via PostCSS
- Backend: Supabase Auth + Postgres
- Deployment: Vercel static deployment
- Runtime model: browser SPA talking directly to Supabase; no custom app server in this repo

## Verified Live Database Shape

Verified against Supabase on 2026-03-21:

Active app tables:

- `profiles`
- `settings`
- `members`
- `marks`

Legacy retained database objects from the pre-PR-13 system:

- `invite_codes`
- `audit_logs`

RLS is enabled on all of those tables.

Active database functions used by the current app:

- `current_app_role`

Legacy retained database functions from the pre-PR-13 system:

- `claim_invite_code`
- `cleanup_old_invite_codes`
- `validate_invite_code`

Rules for legacy retained objects:

- Do not build new features on `invite_codes`, `audit_logs`, or legacy invite-code functions.
- Do not treat legacy retained objects as part of the active app surface, even if they still exist in the live Supabase project.
- Keep new schema, RLS, documentation, and app code focused on the active app tables (`profiles`, `settings`, `members`, `marks`) unless the operator explicitly requests legacy cleanup work.

## Key Repository Areas

- `components/`: UI and page components
- `hooks/`: cross-cutting React hooks
- `services/`: Supabase access, auth helpers, and settings
- `docs/`: active documentation and runbooks
- `tests/`: Playwright smoke specs and manual E2E runbooks
- `.github/workflows/`: CI and operational workflows

## Commands

```sh
npm install
npm run dev
npm run build
npm run preview
npm run typecheck
npm run test
npm run test:run
npm run test:coverage
npm run test:e2e
```

## Environment Variables

Client-side variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_APP_URL` for auth redirect URLs in deployed environments

CI/browser smoke-test variables:

- `E2E_TEST_EMAIL`
- `E2E_TEST_PASSWORD`

Rules:

- Never put privileged secrets in `VITE_*` variables.
- `.env` and `.env.local` must stay untracked.
- Keep `.env.example` limited to variables that are actually used by the app or workflows.

## Deployment Rules

- Production deploys go through Vercel.
- Keep `vercel.json` aligned with SPA routing requirements.
- Do not reintroduce local Express or Docker serving paths unless there is a real deployment need.

## Git Workflow Rules

- Do all change work on a git branch, not directly on `main`.
- Create or switch to an appropriate branch before making repo changes.
- When the task is complete, open a pull request for that branch before asking for final operator action.
- After the pull request exists, ask the operator whether they want the PR merged to `main` and the branch deleted.
- Do not merge to `main` or delete the branch without explicit operator approval.

## Database Change Rules

- Treat the live Supabase project as the source of truth for schema and RLS.
- Prefer MCP Supabase migrations and inspection tools for schema work.
- Use Supabase MCP only for BB Manager database inspection, backup, restore testing, migrations, and policy changes unless the operator explicitly approves another path.
- Do not rely on the local Supabase CLI as authoritative for this repo unless it has been explicitly validated against the same live project in the current task.
- Before any database schema, RLS, function, trigger, or data migration change, create a full database dump in a local gitignored `db-backups/` folder using a timestamped filename.
- Do not apply database changes until that dump has been tested by restoring it safely into a scratch database or disposable Supabase development branch.
- Document any schema or permission change in the relevant docs.
- Keep app code and docs aligned with the live schema names (`profiles`, `members`, `marks`), not legacy names.
- Do not reintroduce or depend on legacy database objects removed from the active app surface in merged PR 13.

## Documentation Rules

- `ARCHITECTURE.md` is the canonical system overview.
- `AGENTS.md` is the operational guide for contributors/agents.
- `docs/` contains subordinate runbooks and references.

When changing behavior:

- Update docs in the same pass if the change affects setup, deployment, schema, permissions, or user workflows.
- Remove stale references instead of leaving TODOs for already-decided systems.

## Cleanup Expectations

- Prefer deleting dead files over documenting unused paths.
- Keep dependencies aligned with actual runtime usage.
- Remove legacy terminology when the underlying system has changed.

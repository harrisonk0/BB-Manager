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

- `profiles`
- `settings`
- `members`
- `marks`
- `invite_codes`
- `audit_logs`

RLS is enabled on all of those tables.

Important database functions present in the live project:

- `claim_invite_code`
- `cleanup_old_invite_codes`
- `current_app_role`
- `validate_invite_code`

## Key Repository Areas

- `components/`: UI and page components
- `hooks/`: cross-cutting React hooks
- `services/`: Supabase access, auth helpers, and settings
- `docs/`: active documentation and runbooks
- `tests/`: manual E2E runbooks
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
```

## Environment Variables

Client-side variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_APP_URL` for auth redirect URLs in deployed environments

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
- Document any schema or permission change in the relevant docs.
- Keep app code and docs aligned with the live schema names (`profiles`, `members`, `marks`), not legacy names.

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

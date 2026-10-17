# BB-Manager Agent Guide

## Purpose

This file is the working guide for contributors and coding agents making changes in this repo.
Keep it aligned with the actual codebase, deployment model, and live Supabase shape.

## Current Stack

- Frontend: React 19 + TypeScript + Vite
- Styling: Framework7 v9 React iOS theme + shared semantic CSS; Tailwind CSS v3 utilities via PostCSS
- Backend: Supabase Auth + Postgres
- Deployment: Vercel static deployment
- Runtime model: browser SPA talking directly to Supabase; trusted portal operations run in the `company-portal` Supabase Edge Function; no custom app server

## Verified Live Database Shape

Verified against Supabase on 2026-09-11:

- `profiles`
- `settings`
- `members`
- `marks`
- `bb_sessions`
- `archived_members`
- `archived_marks`
- `invite_codes`
- `audit_logs`
- Company portal/calendar/push tables documented in [docs/12-company-portal.md](docs/12-company-portal.md)

RLS is enabled on all of those tables.

Important database functions present in the live project:

- `current_app_role`
- `save_weekly_marks_snapshot`
- `save_member_marks_patch`
- `start_new_bb_session`

`save_weekly_marks_snapshot` and `save_member_marks_patch` should run as `SECURITY DEFINER` with an app-role check after `supabase/migrations/20260912100000_fix_marks_save_rpcs.sql` is applied on the hosted project.

Leftover invite helpers (`claim_invite_code`, `cleanup_old_invite_codes`, `validate_invite_code`) still exist but client roles can no longer execute them.

## Key Repository Areas

- `components/`: UI and page components
- `hooks/`: cross-cutting React hooks
- `services/`: Supabase access, auth helpers, and settings
- `supabase/`: applied SQL and CLI config (hosted project remains authoritative)
- `docs/`: active documentation and runbooks
- `tests/`: Playwright specs and manual E2E runbooks
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
npm run test:frontend
npm run check:design-system
npm run test:e2e
npm run check:db-contract
npm run check:auth-config
```

## Environment Variables

Client-side variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_APP_URL` for auth redirect URLs in deployed environments

CI/browser test variables:

- `E2E_TEST_EMAIL`
- `E2E_TEST_PASSWORD`

`npm run test:e2e` runs isolated sentinel flows by default. `tests/e2e/smoke.e2e.ts` mutates live settings/marks and is ignored unless `E2E_ALLOW_PRODUCTION_MUTATION=1`.

Even the isolated sentinel suite creates/deletes its member fixtures. Run credential-dependent browser/SQL mutation tests only against an explicitly designated non-production staging project; UI verification must never mutate real member records. Automatic CI uses synthetic HTTP fixtures; authenticated staging checks require explicit manual opt-in and a distinct allowlisted staging target.

See [docs/11-audit-remediation.md](./docs/11-audit-remediation.md) for the 2026-09-11 finding closeout.

Passkeys are required on hosted Auth for relying party `bb-manager.vercel.app`. The next live password sign-in must create a passkey, after which that password is replaced and no longer works. Email/password remains for recovery, localhost, and CI.

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
- After the pull request exists, report the review link. Ask about merging and branch deletion only when the operator has not explicitly deferred or prohibited those actions.
- Do not merge to `main` or delete the branch without explicit operator approval.

## Database Change Rules

- Treat the live Supabase project as the source of truth for schema and RLS.
- Prefer MCP Supabase migrations and inspection tools for schema work. The Supabase Management API is the fallback when CLI direct Postgres access is unavailable.
- Portal identities never receive staff roles. Keep core roster/marks policies staff-only, and use the scoped portal summary RPC for boys. Only current, active Company squad leaders receive own-squad dated marks through that RPC; ordinary boys receive no teammate statistics. Preserve deletion/reset revocation and the server-side passkey check.
- Keep VAPID and worker credentials in server secrets/Vault; do not rotate existing push keys during routine deployments.
- Optional NCO rank is independent of squad leadership and app roles. Keep Year 11–14/Company eligibility enforced in the browser and database, and preserve rank in archives/imports and scoped portal identity data.
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


## Frontend Design System & UI/UX Standards

Framework7 Native (Framework7 v9 React, iOS theme) is BB-Manager’s approved frontend foundation, with an iOS 26-inspired, mobile-first visual and interaction language. Follow [the canonical design system](docs/design-system/README.md) and [contribution contracts](docs/design-system/contributing.md). The iPhone portrait experience is primary; adapt to an iPad-style workspace at 768px and productive desktop content at 1024px. Preserve official Boys’ Brigade branding and Company/Junior distinctions.

- Use shared `components/ui` primitives and semantic `--bb-*` tokens from `styles/design-system.css`. Reuse established components before adding variants. One coherent shell and hierarchy take precedence over an isolated component’s aesthetics. Do not introduce competing navigation, modal or visual libraries without a scoped, reviewed architectural exception.
- Typography: `-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`; platform system fonts only. Large titles approximately34px/700, section headings20px/600, body17px, secondary15px; avoid text below13px. Use tabular numerals for scores/statistics. Do not redistribute Apple fonts/symbols.
- Colour: semantic accent/surface/text/separator/status tokens; section identity comes from Company/Junior context. No arbitrary unrelated palettes. Normal text contrast >=4.5:1, large text and essential controls >=3:1. Status requires text or shape as well as colour.
- Layout: shared content containers,16px phone gutters, safe-area-aware navigation, bottom content clearance and keyboard-friendly forms. Start at390px and validate320/375/390/430/768/1024/1440px. Use native navigation/header patterns; never squeeze desktop toolbars onto phones.
- Components: use Framework7 through documented adapters. Maintain real native disabled semantics, React19 Toggle synchronisation and 44px touch targets. Shared sheets handle names, containment, scroll, dismissal and focus restoration. Keep attendance’s present/absent/unrecorded semantics, accessible score labels, real Save accessories and canonical empty/loading/error/retry patterns.
- Interaction: use the single shell navigation owner; preserve deep links, browser Back/Forward, place/scroll and dirty-change protection. Restore meaningful focus after closing dialogs or removing rows. Keep inputs >=16px, support keyboard navigation, announce save/error feedback, and respect reduced motion. Animate hierarchy/feedback purposefully without delaying data entry.
- Avoid generic SaaS dashboards, unnecessary card nesting, random gradients, arbitrary radii, one-off buttons, duplicate form primitives, unapproved libraries, giant glass data containers, microtypography, unnecessary animation and desktop-first composition. Do not remove functionality for visual simplicity.
- Accessibility and performance are first-class requirements. Glass belongs primarily to navigation/overlays, never at the expense of data readability or browser support. Authentication, role permissions, sensitive-token handling and backend contracts may never be weakened for design convenience. Protected views/data must be cleared when identity/role/section changes; do not introduce persistent member-data caching or offline queues without a reviewed security design.

**Any future UI change must conform to the approved design system and be validated against relevant mobile, accessibility and visual regression checks before completion.** Follow source-backed parity requirements and retain the audit acceptance register. Report actual verification separately from staging, physical-device or assistive-technology checks still pending.

### Multi-agent frontend workflow

Where supported, delegate independent feature ownership after defining component interfaces. One owner edits dependency files, app entry points, router, global styles and this guide; coordinate changes to shared files. Prefer separate worktrees for conflicting work; disjoint file ownership is acceptable in a shared worktree. Another agent reviews substantial implementations and a testing agent independently exercises them. Record implementer/reviewer, files, commands, browser evidence, design/accessibility/security/parity findings, remediation and lead acceptance in `docs/design-system/review-register.md`. A fix is not closed until reverified. If subagents are unavailable, use separated implementation and review passes and explicitly record that independence limitation. Never claim synthetic UI tests establish server RLS.

Instruction precedence: system/developer and user instructions govern first; root AGENTS applies repository-wide, nested AGENTS narrows its own directory and complements this guide. Canonical design documentation describes code contracts; historical audit/prototype guidance is reference material, not permission to bypass current security or workflow rules.

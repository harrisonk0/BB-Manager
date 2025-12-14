# Project Overview
BB Manager is a React + TypeScript web app for managing Boys' Brigade members, squads, and
weekly marks. The UI reads and writes directly to Supabase (Auth + Postgres tables) via a
small services layer, with audit logging and role-based access for sensitive operations.

## Documentation Roles
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) is the single source of truth for the system model and
  architectural decisions.
- [`AGENTS.md`](./AGENTS.md) is the single source of truth for repo rules and operational guidance.
- [`docs/`](./docs/) contains deep dives and runbooks; it should not contradict `ARCHITECTURE.md`.

## Repository Structure
- `components/` — React page and UI components.
  - Page views: `HomePage.tsx`, `WeeklyMarksPage.tsx`, `BoyMarksPage.tsx`,
    `DashboardPage.tsx`, `AuditLogPage.tsx`, `SettingsPage.tsx`, `GlobalSettingsPage.tsx`,
    `AccountSettingsPage.tsx`, `SectionSelectPage.tsx`, `LoginPage.tsx`, `SignupPage.tsx`,
    `HelpPage.tsx`
  - Forms: `BoyForm.tsx`
  - Reusable UI: `Header.tsx`, `Modal.tsx`, `DatePicker.tsx`, `Toast.tsx`,
    `SkeletonLoaders.tsx`, `Icons.tsx`
  - Charts: `BarChart.tsx`, `LineChart.tsx`
- `docs/` — Project documentation (architecture, getting started, deployment, etc.).
  - `00-documentation-audit.md`, `01-project-structure.md`, `02-architecture.md`,
    `03-getting-started.md`, `04-deployment.md`, `05-component-library.md`,
    `06-data-and-services.md`, `07-hooks-and-state.md`, `08-types.md`
- `hooks/` — Custom React hooks for auth, data loading, navigation protection, and toasts.
  - `useAuthAndRole.ts`, `useAppData.ts`, `useSectionManagement.ts`,
    `useToastNotifications.ts`, `useUnsavedChangesProtection.ts`
- `services/` — Supabase client setup and data/service functions.
  - `supabaseClient.ts`, `supabaseAuth.ts`, `db.ts`, `settings.ts`
- `src/` — Global styles and shared assets (currently `src/index.css`).
- Root files
  - `README.md` — Project overview and doc index.
  - `package.json`, `package-lock.json` — Node dependencies and scripts.
  - `.gitignore` — Git ignore rules (note: `AI_RULES.md` is ignored; use `AGENTS.md` instead).
  - `ARCHITECTURE.md` — Canonical system model and key decisions.
  - `App.tsx` — App orchestrator and view routing.
  - `index.tsx` — React entry point; renders `App`.
  - `index.html` — HTML shell; includes an import map and mounts `index.tsx`.
  - `types.ts` — Shared TypeScript types (domain + UI state).
  - `vite.config.ts`, `tsconfig.json`, `vite-env.d.ts` — Tooling configuration.
  - `tailwind.config.js`, `postcss.config.js`, `src/index.css` — Tailwind + PostCSS setup.
  - `server.js` — Express static server for `dist/` (SPA fallback).
  - `Dockerfile` — Builds `dist/` and serves it via `serve`.
  - `vercel.json` — SPA rewrite configuration for Vercel.
  - `*.json` (e.g., `company_boys.json`, `user_roles.json`) — Data exports/samples; may contain
    sensitive/PII and are not used by the runtime app.

## Build & Development Commands
### Install
```sh
npm install
```

### Run (dev)
```sh
npm run dev
```

### Type-check
```sh
npx tsc -p tsconfig.json --noEmit
```

### Build (production)
```sh
npm run build
```

### Preview build (Vite)
```sh
npm run preview
```

### Serve build (Express)
```sh
npm run build
npm run start
```

### Debug (Express server)
```sh
npm run build
node --inspect server.js
```

### Deploy (static hosting)
```sh
npm run build
```
1. Upload `dist/` to your static host (Vercel/Netlify/Cloudflare Pages/etc.).
2. Ensure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set for the build step.

### Data migration (one-off)
> TODO: No migration script is checked into this repo. If adding one, keep service-role keys
> out of the client bundle and document the workflow in a dedicated runbook under `docs/`.

### Lint
> TODO: No lint tooling/config found (no ESLint/Prettier configs or `npm run lint` script).
```sh
# TODO: add eslint/prettier and a `npm run lint` script
```

### Tests
> TODO: No automated test runner/config found in this repo.
```sh
# TODO: add unit/e2e tests and CI wiring
```

## Code Style & Conventions
- TypeScript + React function components; keep shared types in `types.ts`.
- File naming: components use `PascalCase.tsx`; hooks use `useThing.ts`; services use
  descriptive names (e.g., `supabaseClient.ts`).
- Imports: prefer the `@/` alias for root-relative imports (configured in `tsconfig.json` and
  `vite.config.ts`).
- Formatting: follow existing patterns (2-space indentation, single quotes, semicolons).
- Styling: Tailwind utilities; custom colors live in `tailwind.config.js`.
- Lint/format config:
  > TODO: Standardize formatting/linting (e.g., Prettier + ESLint) and document the commands.
- Commit messages:
  > TODO: No enforced commit convention found.
  Suggested template:
  ```
  <type>(<scope>): <summary>

  Why:
  - <reason>

  Notes:
  - <optional>
  ```

## Testing Strategy
> TODO: No unit/integration/e2e test suite is present; add tooling and CI coverage.

Current validation options:
1. Run a type-check (`npx tsc -p tsconfig.json --noEmit`).
2. Build and smoke-test the app (`npm run build` + `npm run preview`).
3. Manually verify core flows: auth, section selection, CRUD, marks entry, invite codes,
   user roles, audit log + revert.

## Security & Compliance
- Secrets live in environment variables; do not hardcode keys in the client bundle.
  - Client-required: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (embedded at build time).
  - Migration-only: `SUPABASE_SERVICE_ROLE_KEY` (never put behind `VITE_`).
  - Server: `PORT` (used by `server.js`).
- `.env` handling:
  > TODO: Ensure `.env` is ignored and document a checked-in `.env.example`.
- Treat the root `*.json` export/sample files as sensitive; they may contain PII (names/emails).
- Dependency/secret scanning:
  > TODO: Add automated scanning (e.g., Dependabot, `npm audit` in CI, secret scanning).
- Licensing:
  > TODO: Add a `LICENSE` file and note third-party license requirements as needed.

## Agent Guardrails
- Do not modify or quote the contents of data/PII export files (`company_boys.json`,
  `junior_boys.json`, `user_roles.json`, `invite_codes.json`, `global_audit_logs.json`) unless a
  human explicitly requests it.
- Never introduce new client-side secrets (`VITE_*` variables are shipped to browsers).
- Keep changes small and localized; avoid repo-wide rewrites without explicit approval.
- Prefer extending `services/*` for data access and keeping UI components focused on rendering.
- If you add new env vars, update docs (and add `.env.example`) in the same change.
- Nested `AGENTS.md` files (if added later) override instructions for their subtrees.
- Rationale for security-related guardrails: see `ARCHITECTURE.md` (Security Model, Invariants & Guardrails).

## Extensibility Hooks
- New data operations: add functions to `services/db.ts` (and keep Supabase queries there).
- New pages/views: add a component in `components/`, extend `Page`/`View` in `types.ts`, and
  wire routing in `App.tsx` and navigation in `components/Header.tsx`.
- New per-section settings: extend `SectionSettings` in `types.ts` and update
  `services/settings.ts` + the settings UI.
- Environment variables:
  - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (required for app runtime).
  - `PORT` (Express server only).
  > TODO: If adding migration tooling, use non-`VITE_` secrets such as `SUPABASE_SERVICE_ROLE_KEY`.

## Further Reading
- [`README.md`](./README.md)
- [`ARCHITECTURE.md`](./ARCHITECTURE.md)
- [`docs/01-project-structure.md`](./docs/01-project-structure.md)
- [`docs/02-architecture.md`](./docs/02-architecture.md)
- [`docs/03-getting-started.md`](./docs/03-getting-started.md)
- [`docs/04-deployment.md`](./docs/04-deployment.md)
- [`docs/05-component-library.md`](./docs/05-component-library.md)
- [`docs/06-data-and-services.md`](./docs/06-data-and-services.md)
- [`docs/07-hooks-and-state.md`](./docs/07-hooks-and-state.md)
- [`docs/08-types.md`](./docs/08-types.md)
- [`docs/00-documentation-audit.md`](./docs/00-documentation-audit.md)

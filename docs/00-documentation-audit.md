# Documentation Audit

This file records documentation roles, resolved drift, and open TODOs to prevent future
contradictions.

## Canonical Sources

- `AGENTS.md`: repo rules and operational guidance (the "how we work" contract).
- `ARCHITECTURE.md`: canonical system model (components, data flow, invariants, trade-offs).
- `docs/`: subordinate deep dives and runbooks (must not contradict `ARCHITECTURE.md`).

## Deep Dives / Runbooks

- `docs/01-project-structure.md`: repo map and where code lives.
- `docs/02-architecture.md`: supplemental notes on Supabase integration.
- `docs/03-getting-started.md`: local setup runbook.
- `docs/04-deployment.md`: deployment runbook.
- `docs/05-component-library.md`: component responsibilities and props.
- `docs/06-data-and-services.md`: services layer and Supabase operations.
- `docs/07-hooks-and-state.md`: custom hooks and state coordination.
- `docs/08-types.md`: `types.ts` reference.

## Drift Resolved (2025-12-14)

- Removed dead link to `AI_RULES.md` from `README.md` (file is gitignored and not present).
- Corrected Tailwind/build tooling docs (no Tailwind CDN; Vite + PostCSS build).
- Removed/flagged legacy Firestore/IndexedDB references in docs (current backend is Supabase).
- Fixed `docs/08-types.md` to match `types.ts` and repaired broken Markdown fences.
- Removed references to a non-existent `migrate.js` script from `AGENTS.md`.
- Added missing deep-dive coverage for custom hooks (`docs/07-hooks-and-state.md`).

## Open TODOs

> TODO: Check in (or link to) the Supabase SQL schema and RLS policies so setup is reproducible.

> TODO: Confirm whether the `index.html` import map is still required under Vite.

> TODO: Document retention/cleanup for audit logs and invite codes (14-day cleanup is referenced
> in UI/docs, but no mechanism is in-repo).

> TODO: Resolve known inconsistencies called out in `ARCHITECTURE.md` (e.g., invite code expiry
> copy vs implementation, audit log action type mismatches).


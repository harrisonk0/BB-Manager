# BB-Manager Agent Guide

## Current State

**Status:** Active remediation - Critical security issues identified

**Phase:** Phase 1 of 5 (Critical Security)
**Progress:** 0% - Planning stage
**Last Updated:** 2026-01-21

The application is in a **broken state with security issues**. RLS is documented but not enforced, leaving GRANT-based access insufficient for UK GDPR compliance.

## Core Value

Secure (UK law compliant) and functional management of boy marks and attendance data.

## Critical Guardrails

### Database
- **Migrations only:** Schema/GRANTs/RLS via `supabase/migrations/`
- **No ad-hoc edits:** No Supabase UI changes
- **Immutable history:** Never modify baseline migrations (`*_remote_schema.sql`)

### Security
- **Never client secrets:** `VITE_*` variables are browser-accessible
- **PII protection:** Treat data JSON files as sensitive
- **No repo-wide rewrites** without explicit approval

### Code Changes
- **Small and localized**
- **Services layer first:** Extend `services/*` before UI
- **Docs sync required:** Update docs with every change (see Maintenance section)

## Critical Issues (Phase 1)

| Issue | Location |
|-------|----------|
| RLS not enforced | Database |
| TypeScript error | services/db.ts:514 |
| search_path not hardened | 3 security functions |
| audit_logs_insert RLS | Database |
| Service role key exposure | Client code |

## Repository Structure

```
├── components/          # React UI components
├── services/           # Supabase data layer
├── hooks/              # Custom React hooks
├── supabase/           # Database migrations
├── docs/               # Deep dives
├── .planning/          # Roadmap & requirements
├── ARCHITECTURE.md     # Canonical model
├── CLAUDE.md           # This file
└── App.tsx             # App orchestrator
```

## Build Commands

```sh
npm install     # Install dependencies
npm run dev     # Development server
npx tsc         # Type-check
npm run build   # Production build
npm run start   # Serve build
```

## Documentation Maintenance

### What to Update When

| Change | Update |
|--------|--------|
| Component changes | `docs/05-component-library.md` |
| Service changes | `docs/06-data-and-services.md` |
| Type changes | `docs/08-types.md` |
| Environment variables | `CLAUDE.md`, `.env.example` |
| Completed issue | Remove from `CLAUDE.md` Known Issues |
| Phase progress | Update `.planning/STATE.md` |

### Consistency Rule

**Never** let docs contradict `ARCHITECTURE.md` or `CLAUDE.md`. Flag contradictions for review.

## Key Commands Reference

| Category | Command | Purpose |
|----------|---------|---------|
| Testing | `npx tsc -p tsconfig.json --noEmit` | Type-checking (until tests implemented) |
| Build | `npm run build && npm run preview` | Smoke-test build |
| Manual | Verify auth, CRUD, marks, roles | Core flows (until E2E tests) |

---

**See full docs:**
- `ARCHITECTURE.md` - System model and decisions
- `.planning/` - Roadmap and requirements
- `docs/` - Deep dives and runbooks
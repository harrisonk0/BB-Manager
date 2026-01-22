# BB-Manager Agent Guide

## Current State

**Status:** Phase 2 ready - Performance optimization

**Phase:** Phase 2 of 5 (Performance)
**Progress:** Ready to begin
**Last Updated:** 2026-01-22

Phase 1 (Critical Security) complete. All RLS policies enforced, security functions hardened with search_path mitigation, and audit logging properly secured.

## Core Value

Secure (UK law compliant) and functional management of boy marks and attendance data.

## Critical Guardrails

### Database
- **Changes via MCP tools:** Use `mcp__supabase__executeSQL` to run DDL/DML directly on remote database
- **No ad-hoc edits:** No Supabase UI changes
- **Document all changes:** Schema changes must be documented in `.planning/` with rationale

### Security
- **Never client secrets:** `VITE_*` variables are browser-accessible
- **PII protection:** Treat data JSON files as sensitive
- **No repo-wide rewrites** without explicit approval

### Code Changes
- **Small and localized**
- **Services layer first:** Extend `services/*` before UI
- **Docs sync required:** Update docs with every change (see Maintenance section)

## Repository Structure

```
├── components/          # React UI components
├── services/           # Supabase data layer
├── hooks/              # Custom React hooks
├── docs/               # Deep dives
├── .planning/          # Roadmap & requirements
│   └── archive/migrations/  # Historical migration reference
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

## Database Operations

All database changes use MCP Supabase tools (not local migration files):

- `mcp__supabase__executeSQL`: Run DDL/DML directly on remote database
- `mcp__supabase__listTables`: List all tables
- `mcp__supabase__describeTable`: Get table schema

Schema reference:
- See `.planning/archive/migrations/` for historical migration context
- Current live schema is source of truth


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
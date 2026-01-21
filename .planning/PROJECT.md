# BB-Manager

## What This Is

A Boys' Brigade member management application - React/TypeScript frontend with Supabase backend for tracking member attendance, marks, and information. Currently broken with security issues. Goal: audit and fix to reach operational state.

## Core Value

Secure (UK law compliant) and functional management of boy marks and attendance data.

## Requirements

### Validated

- ✓ React/TypeScript SPA with Vite build system
- ✓ Supabase backend (PostgreSQL + Auth)
- ✓ Boy/member CRUD operations (names, sections, marks)
- ✓ Weekly marks entry and viewing
- ✓ Section-based organization (Company, Junior sections)
- ✓ Authentication and role-based access (leaders, officers)

### Active

- [ ] **Phase 1: Comprehensive Audit** — Identify all security issues, broken features, and technical debt
- [ ] **Phase 2: Security Remediation** — Fix RLS, auth flows, minors data protection (UK law)
- [ ] **Phase 3: Core Functionality** — Fix broken marks/info CRUD and weekly marks operations
- [ ] **Phase 4: Stabilization** — Address critical technical debt, remove cut features

### Out of Scope

- **Analytics/Reporting** — Cuts complexity; marks viewing is sufficient
- **Audit Trails** — Change history not essential for operations
- **Admin Features** — Invite codes, advanced role management deprioritized
- **Testing/CI/CD** — Defer to post-operational work

## Context

**Existing Codebase:**
- React 19.2.0, TypeScript 5.8.2, Vite 6.2.0
- Supabase 2.48.0 for auth and database
- Express 4.18.2 for production server
- Tailwind CSS for styling

**Known Issues (from codebase map):**
- RLS not fully enforced; GRANT-based access model
- Service role key exposure risk
- No testing framework or CI/CD
- 47 TODO markers, inconsistent console logging
- Large files (GlobalSettingsPage.tsx: 737 lines, db.ts: 693 lines, WeeklyMarksPage.tsx: 617 lines)
- Empty/unused LineChart.tsx component

**Data Sensitivity:**
- Stores personal information about minors
- UK law compliance required (GDPR, data protection)

## Constraints

- **Timeline**: Pressure to reach operational state quickly
- **Legal**: UK law compliance for minors' data is non-negotiable
- **Technical**: Must preserve existing Supabase schema and data

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Comprehensive audit first | Current issues unknown; fixing blindly risks wasted effort | — Pending |
| Cut analytics/reporting | Reduces complexity; core value is marks entry/viewing | — Pending |
| Cut audit trails | Not essential for operations; reduces technical debt | — Pending |
| Cut admin features | Invite codes, advanced role management deprioritized | — Pending |
| Remove unused LineChart.tsx | Dead code found in audit; cleanup required | — Pending |

---
*Last updated: 2026-01-21 after initialization*

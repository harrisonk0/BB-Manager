# Codebase Concerns

**Analysis Date:** 2026-01-21

## Security

**Critical:**
- **RLS not fully enforced** - Current database access model is primarily GRANT-based; Row Level Security policies are documented but not yet enforced
  - Location: `docs/09-database-and-migrations.md`, `docs/10-database-security-model.md`
  - Impact: Users may have broader data access than intended
  - References: ARCHITECTURE.md:339, ARCHITECTURE.md:342

**Medium:**
- **Service role key exposure risk** - Documentation warns `service_role` must never be shipped client-side
  - Location: `docs/10-database-security-model.md:591`
- **Cross-section access controls** - Database-level constraints for section isolation not fully enforced
  - Location: ARCHITECTURE.md:315

## Technical Debt

**High:**
- **No testing framework** - No test runner, assertions, or coverage detected
  - Impact: No automated verification of functionality
  - References: AGENTS.md:110, AGENTS.md:112, AGENTS.md:139

- **No CI/CD pipeline** - No automated testing, linting, or deployment
  - Impact: Manual processes, higher risk of bugs in production
  - References: AGENTS.md:126, docs/todo-triage-report.md

- **No linting/formatting tools** - No ESLint or Prettier configuration
  - Impact: Inconsistent code style, potential bugs
  - References: AGENTS.md:104, AGENTS.md:106, ARCHITECTURE.md:304

**Medium:**
- **47 TODO markers in documentation** - Indicates incomplete features or documentation gaps
  - Location: Throughout `docs/` and `ARCHITECTURE.md`
  - Reference: `docs/todo-triage-report.md`

- **Legacy "Firestore" references** - Documentation still references old backend technology
  - Impact: Confusion for developers
  - Reference: ARCHITECTURE.md:358

## Code Quality

**Large Files (>500 lines):**
- `components/GlobalSettingsPage.tsx` (737 lines) - Consider splitting into smaller components
- `services/db.ts` (693 lines) - Large service file, could be modularized
- `components/WeeklyMarksPage.tsx` (617 lines) - Consider extracting components
- `components/HelpPage.tsx` (554 lines) - Large for documentation page

**Console Logging in Production:**
- 33 instances of `console.log`/`console.error` in application code
- Should be replaced with proper logging framework for production

## Fragile Areas

**Error Handling:**
- Error states present but inconsistent UX for transient failures
- Reference: ARCHITECTURE.md:236

**Role Management:**
- Role fetching queries `user_roles` directly via supabaseClient
- Reference: `docs/07-hooks-and-state.md:38`, ARCHITECTURE.md:311

**Data Cleanup:**
- "Cleanup after 14 days" described in UI/docs but no scheduler/trigger implemented
- Reference: ARCHITECTURE.md:347

## Missing Infrastructure

- No `.env.example` checked in (environment variables not documented)
- No LICENSE file
- No Supabase CLI workflow runbook
- No type-check script for CI
- No documented threat model
- No automated dependency scanning (Dependabot, npm audit)

## Observable Inconsistencies

From `docs/todo-triage-report.md`:
- Invite code expiry behavior inconsistencies
- Audit log action type duplication
- `index.html` import map purpose unclear (React CDN + Vite?)
- `LineChart.tsx` exists but is empty/unused

---

*Concerns analysis: 2026-01-21*

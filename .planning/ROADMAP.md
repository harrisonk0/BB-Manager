# Roadmap: BB-Manager Security Remediation

## Overview

BB-Manager is a broken Boys' Brigade member management application requiring security remediation to reach operational state. This roadmap addresses 20 v1 requirements across 5 phases: critical security fixes, performance optimization, code quality cleanup, configuration setup, and functionality validation. Each phase delivers verifiable progress toward UK law-compliant handling of minors' data, with testing integrated throughout.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Critical Security** - Fix critical security vulnerabilities (RLS, auth, key exposure) and set up testing foundation
- [ ] **Phase 2: Performance** - Optimize RLS policies, remove unused indexes, and test security functions
- [ ] **Phase 3: Code Quality** - Remove console statements, dead code, fix vulnerabilities, and test core services
- [ ] **Phase 4: Configuration** - Environment setup, migration sync, and CI pipeline
- [ ] **Phase 5: Functionality Validation** - Verify core CRUD and auth operations with E2E tests

## Phase Details

### Phase 1: Critical Security

**Goal**: Critical security vulnerabilities are fixed; application no longer has known security holes; testing foundation is in place

**Depends on**: Nothing (first phase)

**Requirements**: SEC-01, SEC-02, SEC-03, SEC-04, SEC-05, TEST-01

**Success Criteria** (what must be TRUE):
1. TypeScript error in services/db.ts line 514 is resolved (code compiles without type errors)
2. All 3 security functions (get_user_role, can_access_section, can_access_audit_logs) have hardened search_path
3. audit_logs_insert RLS policy prevents unauthorized INSERT operations
4. Service role key is verified absent from client-side code
5. Leaked password protection is enabled in Supabase Auth settings
6. Vitest is configured and can run tests successfully (npm run test executes)

**Plans**: 6 plans in 1 wave

Plans:
- [x] 01-01-PLAN.md — Fix TypeScript error in services/db.ts and enable exhaustiveness checking
- [x] 01-02-PLAN.md — Create security functions with hardened search_path
- [x] 01-03-PLAN.md — Fix audit_logs_insert RLS policy
- [x] 01-04-PLAN.md — Verify service_role key isolation from client code
- [x] 01-05-PLAN.md — Enable leaked password protection in Supabase Auth (DEFERRED - Pro Plan required)
- [x] 01-06-PLAN.md — Set up Vitest with TypeScript configuration

### Phase 2: Performance

**Goal**: Database queries are optimized with efficient RLS policies and clean indexes; security functions are tested

**Depends on**: Phase 1

**Requirements**: PERF-01, PERF-02, TEST-02

**Success Criteria** (what must be TRUE):
1. All 16 RLS policies use `(select auth.uid())` subquery pattern instead of direct `auth.uid()`
2. Three unused indexes are dropped from database (idx_audit_logs_timestamp_desc, idx_invite_codes_* variations)
3. Unit tests exist for all 3 security functions and pass (get_user_role, can_access_section, can_access_audit_logs)
4. Tests cover both happy path and unauthorized access scenarios

**Plans**: TBD

Plans:
- [ ] 02-01: Optimize RLS policies with auth.uid() subquery
- [ ] 02-02: Drop unused database indexes
- [ ] 02-03: Write unit tests for get_user_role function
- [ ] 02-04: Write unit tests for can_access_section function
- [ ] 02-05: Write unit tests for can_access_audit_logs function

### Phase 3: Code Quality

**Goal**: Codebase is clean with no debug logging, dead code, or known vulnerabilities; core services have test coverage

**Depends on**: Phase 1

**Requirements**: CODE-01, CODE-02, CODE-03, TEST-03

**Success Criteria** (what must be TRUE):
1. All console.log and console.error statements are removed from codebase (0 instances remain)
2. Empty LineChart.tsx component file is deleted
3. npm audit shows 0 high-severity vulnerabilities
4. Unit tests exist for core service functions in db.ts and settings.ts
5. Tests mock database dependencies appropriately and assert expected behavior

**Plans**: TBD

Plans:
- [ ] 03-01: Remove all console statements
- [ ] 03-02: Delete empty LineChart.tsx component
- [ ] 03-03: Fix npm vulnerabilities
- [ ] 03-04: Write unit tests for db.ts service functions
- [ ] 03-05: Write unit tests for settings.ts service functions

### Phase 4: Configuration

**Goal**: Local development environment is properly configured with migrations synced; CI pipeline runs tests on every push

**Depends on**: Phase 1

**Requirements**: CFG-01, CFG-02, CI-01

**Success Criteria** (what must be TRUE):
1. .env file exists with required environment variables populated
2. Local migrations directory matches Supabase (20 migrations present locally)
3. GitHub Actions workflow file exists in .github/workflows/
4. CI pipeline runs on push and successfully executes all tests
5. CI pipeline shows pass/fail status in GitHub pull requests

**Plans**: TBD

Plans:
- [ ] 04-01: Create .env file from .env.example
- [ ] 04-02: Sync local migrations with Supabase
- [ ] 04-03: Create GitHub Actions workflow file
- [ ] 04-04: Configure CI to install dependencies and run tests
- [ ] 04-05: Verify CI pipeline runs on push

### Phase 5: Functionality Validation

**Goal**: Core application features are verified working end-to-end with automated E2E test coverage

**Depends on**: Phase 1, Phase 4

**Requirements**: FUNC-01, FUNC-02, FUNC-03, TEST-04

**Success Criteria** (what must be TRUE):
1. Users can create, read, update, and delete boy/member records successfully
2. Users can enter weekly marks and view marks history without errors
3. Users can log in and access appropriate features based on role (admin, captain, officer)
4. E2E tests cover login flow (valid/invalid credentials)
5. E2E tests cover boy/member CRUD operations
6. E2E tests cover weekly marks entry and viewing

**Plans**: TBD

Plans:
- [ ] 05-01: Verify boy/member CRUD operations
- [ ] 05-02: Verify weekly marks entry and viewing
- [ ] 05-03: Verify authentication and role-based access
- [ ] 05-04: Write E2E test for login flow
- [ ] 05-05: Write E2E test for boy/member CRUD
- [ ] 05-06: Write E2E test for weekly marks entry

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Critical Security | 6/6 | Complete ✓ | 2026-01-22 |
| 2. Performance | 0/5 | Not started | - |
| 3. Code Quality | 0/5 | Not started | - |
| 4. Configuration | 0/5 | Not started | - |
| 5. Functionality Validation | 0/6 | Not started | - |

**Overall Progress:** 6/27 plans complete (22%)

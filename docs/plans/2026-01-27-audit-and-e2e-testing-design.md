# Comprehensive Audit & E2E Testing Implementation

**Date:** 2026-01-27
**Status:** Approved
**Goal:** Transform legacy BB-Manager codebase into production-ready state through comprehensive audit and testing

## Overview

Two-phase approach to audit and validate the 4 critical workflows: auth/roles, invite codes, member CRUD, and weekly marks entry. Phase 1 conducts systematic code and database audit, fixing critical issues immediately. Phase 2 implements E2E tests using Playwright MCP to validate all fixes and catch integration issues.

**Critical Path:** Invite users → signup/auth → manage members → enter weekly marks

## Phase 1: Comprehensive Code & Database Audit

### Database Layer (via Supabase MCP)

**Schema & Structure Check:**
- List all tables (`boys`, `settings`, `user_roles`, `invite_codes`, `audit_logs`)
- Describe columns, types, constraints, indexes
- Verify RLS policies are correctly configured

**Data Integrity Check:**
- Query for orphaned records, invalid mark values, malformed dates
- Check invite codes (expired unexpectedly, incorrect usage flags)
- Verify user_roles integrity (users without roles, roles without users)
- Sample boys records for mark data structure issues

**Security Function Verification:**
- Test security functions (`current_app_role()`, `can_access_audit_logs()`)
- Verify search_path mitigation
- Check RLS policy enforcement

### Frontend Code Audit

**1. Auth & Roles** (`services/supabaseAuth.ts`, `hooks/useAuthAndRole.ts`)
- Session management, auth state subscription
- Role loading from `user_roles`
- Error handling on auth failures
- Missing role checks, broken flows, session expiration issues

**2. Invite Codes** (`services/db.ts` invite functions, signup flow)
- Code generation, validation during signup
- Expiration logic, marking codes as used
- Validation failures, race conditions, expiration bugs

**3. Member CRUD** (`services/db.ts` boy operations, `RosterPage.tsx`)
- Create, update, delete operations
- Validation, section isolation, error handling
- Missing validation, broken updates/deletes, data corruption

**4. Weekly Marks Entry** (`WeeklyMarksPage.tsx`, mark validation)
- Mark loading, validation (score ranges, date formats)
- Update logic, audit log creation
- Validation failures, broken updates, incorrect calculations

### Remediation Strategy

- **Critical issues:** Fix immediately (complete workflow breakage)
- **Low priority:** Document only (edge cases, poor error messages, inefficient code)
- **Fix philosophy:** Minimal changes that preserve existing architecture

## Phase 2: E2E Testing with Playwright MCP

### Test Suite Structure

**Suite 1: Auth & Signup Workflow**
- Login with valid credentials (test@example.com / abc)
- Login with invalid credentials
- Session persistence across page reloads
- Role loading verification after auth

**Suite 2: Invite Code Workflow**
- Navigate to signup flow
- Test signup with invalid/expired invite code
- Test signup with valid code
- Verify user role assignment after signup

**Suite 3: Member CRUD**
- Create new boy member
- Edit existing member details
- Delete a member
- Verify section isolation (company vs junior)

**Suite 4: Weekly Marks Entry**
- Load weekly marks page
- Enter marks for multiple boys (test validation boundaries)
- Verify marks persist after save
- Check audit log creation

### Execution Approach

- Run tests manually via Playwright MCP tools during audit
- Capture screenshots of failures
- Record console errors
- Document network request failures
- Compare actual vs. expected behavior

## Deliverables

### 1. Audit Report (`docs/audit-2026-01-27.md`)
- **Critical Issues Fixed:** List with before/after code snippets
- **Low Priority Issues:** Organized by category (security, validation, error handling, code quality, performance)
- **Test Results:** Pass/fail status with failure details

### 2. Test Scripts (`tests/e2e/`)
- Individual test files for each suite
- Execution instructions via Playwright MCP
- Expected vs. actual results for failures

### 3. Applied Fixes
- All critical bugs fixed during audit
- Minimal, targeted changes
- Commits reference audit report

### 4. Recommendations (Out of Scope)
- Future improvements and technical debt
- Suggestions for hardening codebase

## Success Criteria

- All 4 critical workflows functional end-to-end
- Critical bugs fixed and documented
- E2E tests covering happy paths + common error scenarios
- Comprehensive audit report with prioritized findings
- Test artifacts executable via Playwright MCP

## Timeline & Approach

- Code audit first (efficient - no app startup needed)
- Database inspection via MCP before frontend code review
- Fix critical blockers immediately
- Document low-priority issues for later
- Validate fixes with Playwright E2E tests
- Keep changes minimal and localized

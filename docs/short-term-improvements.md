# Short-Term Improvements

**Date:** 2026-01-27
**Status:** Historical

This document describes the short-term improvements that were explored after the comprehensive audit. Several items have since been removed from the codebase as part of the lean-up branch.

---

## 1. Invite Code Cleanup

This branch removes the invite-code cleanup workflow and the public signup flow. Manual account provisioning in Supabase is the supported path now.

### What Was Implemented

- Deleted the invite-code cleanup workflow file from `.github/workflows/`
- Removed the signup and password-recovery UI paths
- Kept account provisioning manual in Supabase

---

## 2. CI/CD Infrastructure Checks

### What Was Implemented

**GitHub Actions Workflow:**
- File: `.github/workflows/ci-infrastructure.yml`
- Runs on push to `main` and pull requests
- **What it validates:**
  - ✅ TypeScript type-checking passes
  - ✅ Dependencies install correctly
  - ✅ Dev server starts successfully
- **What it does NOT do:**
  - ❌ Does NOT run automated E2E tests
  - ⚠️ Manual E2E testing is still required

**Test Helper Script:**
- File: `scripts/run-e2e-tests.sh`
- Starts dev server locally
- Provides testing instructions

### How to Use

**Automatic:** Runs on every push to main and PR

**Local Testing:**
```bash
./scripts/run-e2e-tests.sh
```

Then follow manual test steps in:
- `tests/e2e/01-auth-workflow.md`
- `tests/e2e/03-member-crud-workflow.md`
- `tests/e2e/04-weekly-marks-workflow.md`

### Required Secrets

- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key

### Clarification: CI vs E2E Testing

**CI Infrastructure workflow** validates code quality and app startup. It does NOT run automated E2E tests.

**Why not full automation?**
- Full E2E automation requires Playwright browser automation in CI
- The manual E2E tests we created during the audit use Playwright MCP
- Playwright MCP is not available in GitHub Actions
- Setting up browser automation in CI is a separate, larger project (8-12 hours)

**What this provides:**
- Confidence that code type-checks
- Confidence that app can start
- Links to manual E2E test documentation
- Foundation for future automation work

**Future E2E automation** would require:
- Writing automated Playwright test scripts
- Setting up browser automation in GitHub Actions
- Much more development effort

---

## 3. Error Monitoring with ntfy.sh

This was removed from the app. The current codebase no longer ships `services/errorMonitoring.ts`, the global window error handlers, or any ntfy integration.

---

## Maintenance

### CI/CD Infrastructure
- Review workflow runs for failures
- Keep type-checking passing
- Keep credentials in sync

### Error Monitoring
- No longer used in the app

---

## Future Improvements

These improvements provide a foundation for:
- **Full E2E test automation** - Requires Playwright browser automation in CI (8-12 hours effort)
- Performance monitoring
- Usage analytics

---

## Related Documents

- Audit Report: `docs/archive/audit-2026-01-27.md`
- Design Doc: `docs/archive/plans-2026-01/2026-01-27-short-term-improvements-design.md`
- Implementation Plan: `docs/archive/plans-2026-01/2026-01-27-short-term-improvements.md`
- E2E Tests: `tests/e2e/*.md`
- Current user handout: `docs/user-guide.md`

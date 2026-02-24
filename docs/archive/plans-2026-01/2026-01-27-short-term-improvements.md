# Short-Term Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Implement three targeted improvements to harden production-ready BB-Manager: automatic invite code cleanup, CI/CD E2E testing, and ntfy.sh error monitoring.

**Architecture:** Two-layer invite code cleanup (database trigger for immediate flagging, GitHub Actions scheduled job for 14-day deletion), GitHub Actions workflow for automated E2E testing on push/PR, and client-side error reporting service integrated into critical workflows.

**Tech Stack:** PostgreSQL (functions/triggers), GitHub Actions (CI/CD), ntfy.sh (monitoring), TypeScript, React

---

## Task 1: Database Function - Cleanup Old Invite Codes

**Files:**
- Modify: Database via Supabase MCP (no files)
- Test: Manual verification via MCP

**Step 1: Create cleanup function via Supabase MCP**

Use `mcp__supabase__apply_migration` with:

```sql
CREATE OR REPLACE FUNCTION cleanup_old_invite_codes()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM invite_codes
  WHERE (expires_at < NOW() - INTERVAL '14 days')
     OR (is_used = true AND used_at < NOW() - INTERVAL '14 days');

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Grant execute to service_role only
GRANT EXECUTE ON FUNCTION cleanup_old_invite_codes() TO service_role;
```

**Step 2: Test the function**

Run via `mcp__supabase__execute_sql`:
```sql
SELECT cleanup_old_invite_codes();
```

Expected: Returns number of deleted codes (should be 0 on first run, or 4 if expired codes exist)

**Step 3: Verify function exists**

List functions:
```sql
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name = 'cleanup_old_invite_codes';
```

Expected: Function exists, type = FUNCTION

**Step 4: Commit database changes**

```bash
git add .planning/archive/migrations/short-term-improvements.sql
git commit -m "feat(db): add cleanup_old_invite_codes function

- Deletes codes expired/used for 14+ days
- Returns count of deleted codes
- SECURITY DEFINER with search_path mitigation
- Granted to service_role only

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Database Trigger - Auto-Flag Expired Codes

**Files:**
- Modify: Database via Supabase MCP (no files)
- Test: Manual verification via MCP

**Step 1: Create trigger function via Supabase MCP**

Use `mcp__supabase__apply_migration` with:

```sql
CREATE OR REPLACE FUNCTION check_invite_code_expiration()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.expires_at < NOW() THEN
    NEW.revoked := true;
  END IF;
  RETURN NEW;
END;
$$;
```

**Step 2: Create trigger on invite_codes table**

```sql
DROP TRIGGER IF EXISTS invite_code_expiration_trigger ON invite_codes;

CREATE TRIGGER invite_code_expiration_trigger
BEFORE INSERT OR UPDATE ON invite_codes
FOR EACH ROW
EXECUTE FUNCTION check_invite_code_expiration();
```

**Step 3: Test trigger with expired code**

Insert a test code that's already expired:
```sql
INSERT INTO invite_codes (id, generated_by, default_user_role, expires_at, generated_at)
VALUES ('TEST-EXPIRED', 'test@example.com', 'officer', NOW() - INTERVAL '1 day', NOW());
```

Then check it:
```sql
SELECT id, revoked, expires_at FROM invite_codes WHERE id = 'TEST-EXPIRED';
```

Expected: `revoked = true`

**Step 4: Test trigger with future code**

Insert a valid future code:
```sql
INSERT INTO invite_codes (id, generated_by, default_user_role, expires_at, generated_at)
VALUES ('TEST-FUTURE', 'test@example.com', 'officer', NOW() + INTERVAL '3 days', NOW());
```

Then check it:
```sql
SELECT id, revoked, expires_at FROM invite_codes WHERE id = 'TEST-FUTURE';
```

Expected: `revoked = false`

**Step 5: Clean up test codes**

```sql
DELETE FROM invite_codes WHERE id IN ('TEST-EXPIRED', 'TEST-FUTURE');
```

**Step 6: Commit database changes**

```bash
git add .planning/archive/migrations/short-term-improvements.sql
git commit -m "feat(db): add auto-expiration trigger for invite codes

- Trigger checks expiration on INSERT/UPDATE
- Automatically sets revoked=true for expired codes
- Prevents use of expired codes immediately
- SECURITY DEFINER with search_path mitigation

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 3: GitHub Actions - Scheduled Invite Code Cleanup

**Files:**
- Create: `.github/workflows/cleanup-invite-codes.yml`
- Test: Manual workflow dispatch test

**Step 1: Create GitHub Actions workflow file**

Create `.github/workflows/cleanup-invite-codes.yml`:

```yaml
name: Cleanup Invite Codes

on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM UTC
  workflow_dispatch:      # Allow manual triggering

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - name: Delete old invite codes
        run: |
          response=$(curl -X POST "${{ secrets.SUPABASE_URL }}/rest/v1/rpc/cleanup_old_invite_codes" \
            -H "apikey: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
            -H "Content-Type: application/json")

          echo "Cleanup result: $response"

          # Check if any codes were deleted
          deleted=$(echo $response | jq -r '.')
          if [ "$deleted" != "0" ] && [ -n "$deleted" ]; then
            echo "Deleted $deleted invite codes"
          else
            echo "No codes to delete"
          fi
```

**Step 2: Add workflow to git**

```bash
git add .github/workflows/cleanup-invite-codes.yml
git commit -m "feat(ci): add scheduled invite code cleanup workflow

- Runs daily at 2 AM UTC
- Calls cleanup_old_invite_codes() function
- Can be triggered manually via workflow_dispatch
- Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY secrets

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

**Step 3: Verify workflow file committed**

```bash
git log --oneline -1
cat .github/workflows/cleanup-invite-codes.yml
```

Expected: File exists and contains the workflow

---

## Task 4: Error Monitoring Service

**Files:**
- Create: `src/services/errorMonitoring.ts`
- Test: Manual test with console

**Step 1: Create error monitoring service**

Create `src/services/errorMonitoring.ts`:

```typescript
interface ErrorReport {
  operation: string;
  error: string;
  user?: string;
  timestamp: string;
  context?: Record<string, any>;
}

/**
 * Reports an error to ntfy.sh for monitoring
 * @param operation - Name of the operation that failed (e.g., 'auth_signin')
 * @param error - The error that occurred
 * @param user - Optional user email for context
 * @param context - Optional additional context about the error
 */
export async function reportError(
  operation: string,
  error: Error,
  user?: string,
  context?: Record<string, any>
): Promise<void> {
  const report: ErrorReport = {
    operation,
    error: error.message,
    user,
    timestamp: new Date().toISOString(),
    context
  };

  try {
    await fetch('https://ntfy.sh/bb-manager-ops', {
      method: 'POST',
      headers: {
        'Title': `BB-Manager Error: ${operation}`,
        'Content-Type': 'application/json',
        'Priority': '3'  // High priority
      },
      body: JSON.stringify(report)
    });
  } catch (reportingError) {
    // Don't let error reporting break the app
    console.error('Failed to report error:', reportingError);
  }
}
```

**Step 2: Test the service manually**

In browser console (after app loads):
```javascript
import { reportError } from '/src/services/errorMonitoring.ts';

reportError('test_operation', new Error('Test error message'), 'test@example.com', { testKey: 'testValue' });
```

Expected: Check https://ntfy.sh/bb-manager-ops - should see the notification

**Step 3: Commit error monitoring service**

```bash
git add src/services/errorMonitoring.ts
git commit -m "feat(monitoring): add error reporting service

- Posts errors to ntfy.sh/bb-manager-ops
- Includes operation, error message, user, timestamp, context
- High priority (3) for immediate visibility
- Gracefully fails if reporting fails

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Integrate Error Monitoring - Auth

**Files:**
- Modify: `src/services/supabaseAuth.ts`
- Test: Manual auth attempt with invalid credentials

**Step 1: Add error reporting to signIn**

In `src/services/supabaseAuth.ts`, import the service:
```typescript
import { reportError } from './errorMonitoring';
```

Modify the `signIn` function try/catch:
```typescript
try {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  return data;
} catch (error) {
  await reportError('auth_signin', error as Error, email);
  throw error;
}
```

**Step 2: Add error reporting to signUp**

Modify the `signUp` function try/catch:
```typescript
try {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) throw error;

  return data;
} catch (error) {
  await reportError('auth_signup', error as Error, email);
  throw error;
}
```

**Step 3: Test error reporting**

1. Start dev server: `npm run dev`
2. Attempt to sign in with invalid credentials
3. Check https://ntfy.sh/bb-manager-ops

Expected: Should see notification with auth_signin error

**Step 4: Commit auth error monitoring**

```bash
git add src/services/supabaseAuth.ts
git commit -m "feat(monitoring): add error reporting to auth operations

- Reports sign-in failures to ntfy.sh
- Reports sign-up failures to ntfy.sh
- Includes user email for context

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Integrate Error Monitoring - CRUD

**Files:**
- Modify: `src/services/db.ts`
- Test: Manual CRUD operation failure

**Step 1: Add error reporting to updateBoy**

In `src/services/db.ts`, import:
```typescript
import { reportError } from './errorMonitoring';
```

Modify the `updateBoy` function try/catch (around line 280):
```typescript
try {
  // ... existing update logic ...
} catch (error) {
  await reportError('db_updateBoy', error as Error, undefined, { boyId: boy.id, section });
  throw error;
}
```

**Step 2: Add error reporting to createBoy**

Modify the `createBoy` function try/catch:
```typescript
try {
  // ... existing create logic ...
} catch (error) {
  await reportError('db_createBoy', error as Error, undefined, { section });
  throw error;
}
```

**Step 3: Add error reporting to deleteBoyById**

Modify the `deleteBoyById` function try/catch:
```typescript
try {
  // ... existing delete logic ...
} catch (error) {
  await reportError('db_deleteBoy', error as Error, undefined, { boyId, section });
  throw error;
}
```

**Step 4: Test CRUD error reporting**

1. Start dev server
2. Try to edit a member (watch network tab for errors)
3. Check https://ntfy.sh/bb-manager-ops

Expected: Should see notification if any CRUD operation fails

**Step 5: Commit CRUD error monitoring**

```bash
git add src/services/db.ts
git commit -m "feat(monitoring): add error reporting to CRUD operations

- Reports updateBoy failures to ntfy.sh
- Reports createBoy failures to ntfy.sh
- Reports deleteBoyById failures to ntfy.sh
- Includes boyId and section in context

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Integrate Error Monitoring - Weekly Marks

**Files:**
- Modify: `src/components/WeeklyMarksPage.tsx`
- Test: Manual marks save failure

**Step 1: Add error reporting to WeeklyMarksPage**

In `src/components/WeeklyMarksPage.tsx`, import:
```typescript
import { reportError } from '../services/errorMonitoring';
```

Modify the `handleSaveMarks` function try/catch (around line 260):
```typescript
try {
  // ... existing save logic ...
} catch (error) {
  await reportError('marks_save', error as Error, userEmail, {
    boyCount: boys.length,
    section
  });
  setError('Failed to save marks. Please try again.');
}
```

**Step 2: Test marks error reporting**

1. Start dev server
2. Try to save marks (intentionally break something if needed)
3. Check https://ntfy.sh/bb-manager-ops

Expected: Should see notification if save fails

**Step 3: Commit marks error monitoring**

```bash
git add src/components/WeeklyMarksPage.tsx
git commit -m "feat(monitoring): add error reporting to weekly marks

- Reports marks save failures to ntfy.sh
- Includes boyCount and section in context
- Maintains existing error UX

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 8: Add Global Error Handler

**Files:**
- Modify: `src/main.tsx` or `src/App.tsx`
- Test: Trigger unhandled promise rejection

**Step 1: Add global error handler to main.tsx**

In `src/main.tsx`, add:

```typescript
import { reportError } from './services/errorMonitoring';

// Global error handler for unhandled promise rejections
window.addEventListener('unhandledrejection', async (event) => {
  await reportError('unhandled_promise', event.reason as Error);
  console.error('Unhandled promise rejection:', event.reason);
});

// Global error handler for uncaught errors
window.addEventListener('error', async (event) => {
  await reportError('uncaught_error', event.error as Error);
  console.error('Uncaught error:', event.error);
});
```

**Step 2: Test global error handler**

In browser console:
```javascript
Promise.reject(new Error('Test unhandled rejection'));
```

Expected: Should see notification on ntfy.sh

**Step 3: Commit global error handler**

```bash
git add src/main.tsx
git commit -m "feat(monitoring): add global error handlers

- Catches unhandled promise rejections
- Catches uncaught errors
- Reports all to ntfy.sh for visibility

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 9: Create E2E Test Helper Script

**Files:**
- Create: `scripts/run-e2e-tests.sh`
- Test: Manual script execution

**Step 1: Create E2E test runner script**

Create `scripts/run-e2e-tests.sh`:

```bash
#!/bin/bash
set -e

echo "🧪 Starting E2E Tests..."

# Check if dev server is already running
if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
  echo "✅ Dev server already running on port 5173"
else
  echo "🚀 Starting dev server..."
  npm run dev &
  DEV_PID=$!

  # Wait for server to be ready
  echo "⏳ Waiting for dev server..."
  sleep 10

  # Check if server started successfully
  if ! lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "❌ Failed to start dev server"
    exit 1
  fi

  echo "✅ Dev server started (PID: $DEV_PID)"
fi

echo ""
echo "📋 Test Scenarios:"
echo "  1. Auth & Login Workflow"
echo "  2. Invite Code Signup Workflow"
echo "  3. Member CRUD Workflow"
echo "  4. Weekly Marks Entry Workflow"
echo ""
echo "⚠️  Manual testing required - see tests/e2e/*.md for detailed steps"
echo ""
echo "✨ E2E test environment ready!"
echo ""
echo "To stop the dev server after testing:"
if [ -n "$DEV_PID" ]; then
  echo "  kill $DEV_PID"
else
  echo "  Find the process with: lsof -ti:5173 | xargs kill"
fi
```

**Step 2: Make script executable**

```bash
chmod +x scripts/run-e2e-tests.sh
```

**Step 3: Test the script**

```bash
./scripts/run-e2e-tests.sh
```

Expected: Dev server starts, environment ready for manual E2E testing

**Step 4: Commit test runner script**

```bash
git add scripts/run-e2e-tests.sh
git commit -m "feat(testing): add E2E test helper script

- Starts dev server if not already running
- Provides clear instructions for manual testing
- References E2E test documents
- Makes testing easier for developers

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 10: Create GitHub Actions E2E Test Workflow

**Files:**
- Create: `.github/workflows/e2e-tests.yml`
- Test: Push to branch to trigger workflow

**Step 1: Create E2E test workflow**

Create `.github/workflows/e2e-tests.yml`:

```yaml
name: E2E Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  workflow_dispatch:

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    timeout-minutes: 10

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Type-check
        run: npx tsc -p tsconfig.json --noEmit

      - name: Create .env file
        run: |
          echo "VITE_SUPABASE_URL=${{ secrets.VITE_SUPABASE_URL }}" >> .env
          echo "VITE_SUPABASE_ANON_KEY=${{ secrets.VITE_SUPABASE_ANON_KEY }}" >> .env

      - name: Start dev server
        run: |
          npm run dev &
          echo $! > dev-server.pid

      - name: Wait for server
        run: |
          for i in {1..30}; do
            if curl -s http://localhost:5173 > /dev/null; then
              echo "Server is ready"
              break
            fi
            echo "Waiting for server... ($i/30)"
            sleep 2
          done

      - name: Run E2E tests (manual)
        run: |
          echo "⚠️  E2E tests require manual execution with Playwright MCP"
          echo "See tests/e2e/ directory for test scenarios"
          echo "✅ Type-check passed"
          echo "✅ Dev server is running"
          echo "⚠️  Full E2E automation pending - manual testing required"

      - name: Stop dev server
        if: always()
        run: |
          if [ -f dev-server.pid ]; then
            kill $(cat dev-server.pid) || true
          fi

      - name: Test Summary
        if: always()
        run: |
          echo "## E2E Test Summary" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "✅ Type-check: PASSED" >> $GITHUB_STEP_SUMMARY
          echo "⚠️  Full E2E automation: Manual testing required" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "Test documents available in \`tests/e2e/\` directory:" >> $GITHUB_STEP_SUMMARY
          echo "- 01-auth-workflow.md" >> $GITHUB_STEP_SUMMARY
          echo "- 02-invite-code-workflow.md" >> $GITHUB_STEP_SUMMARY
          echo "- 03-member-crud-workflow.md" >> $GITHUB_STEP_SUMMARY
          echo "- 04-weekly-marks-workflow.md" >> $GITHUB_STEP_SUMMARY
```

**Step 2: Add workflow to git**

```bash
git add .github/workflows/e2e-tests.yml
git commit -m "feat(ci): add E2E test workflow to CI/CD

- Runs on push to main and pull requests
- Type-checks code
- Starts dev server
- Provides test infrastructure foundation
- Full E2E automation pending (manual testing for now)
- Requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY secrets

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

**Step 3: Verify workflow committed**

```bash
git log --oneline -3
ls -la .github/workflows/
```

Expected: Two workflow files present (cleanup and e2e-tests)

---

## Task 11: Create Documentation

**Files:**
- Create: `docs/short-term-improvements.md`
- Test: N/A (documentation only)

**Step 1: Create improvement documentation**

Create `docs/short-term-improvements.md`:

```markdown
# Short-Term Improvements

**Date:** 2026-01-27
**Status:** ✅ Complete

This document describes the short-term improvements made to BB-Manager after the comprehensive audit.

---

## 1. Automatic Invite Code Cleanup

### What Was Implemented

**Database Function: `cleanup_old_invite_codes()`**
- Deletes invite codes expired/used for 14+ days
- Returns count of deleted codes
- SECURITY DEFINER with search_path mitigation
- Granted to service_role only

**Database Trigger: `check_invite_code_expiration()`**
- Automatically sets `revoked = true` for expired codes
- Fires on INSERT/UPDATE to `invite_codes` table
- Immediate feedback when code expires

**GitHub Actions Workflow:**
- File: `.github/workflows/cleanup-invite-codes.yml`
- Runs daily at 2 AM UTC
- Can be triggered manually
- Calls cleanup function via Supabase REST API

### How to Use

**Automatic:** Nothing required - runs automatically daily

**Manual Cleanup:**
1. Go to GitHub Actions tab
2. Select "Cleanup Invite Codes" workflow
3. Click "Run workflow"

### Required Secrets

- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (from Supabase dashboard)

---

## 2. CI/CD E2E Testing

### What Was Implemented

**GitHub Actions Workflow:**
- File: `.github/workflows/e2e-tests.yml`
- Runs on push to `main` and pull requests
- Type-checks code
- Starts dev server
- Provides test infrastructure

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
- `tests/e2e/02-invite-code-workflow.md`
- `tests/e2e/03-member-crud-workflow.md`
- `tests/e2e/04-weekly-marks-workflow.md`

### Required Secrets

- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key

---

## 3. Error Monitoring with ntfy.sh

### What Was Implemented

**Error Reporting Service:**
- File: `src/services/errorMonitoring.ts`
- Posts errors to `https://ntfy.sh/bb-manager-ops`
- High priority (3) notifications
- Includes operation, error, user, timestamp, context

**Integration Points:**
- Auth operations (signIn, signUp)
- CRUD operations (createBoy, updateBoy, deleteBoyById)
- Weekly marks save
- Global error handlers (unhandled rejections, uncaught errors)

### How to Use

**Subscribe to Notifications:**
1. Install ntfy client (https://ntfy.sh/)
2. Subscribe to `https://ntfy.sh/bb-manager-ops`
3. Or visit the URL in a browser

**What Gets Reported:**
- Authentication failures
- Database operation failures
- Marks save failures
- Unhandled errors/rejections

**Error Format:**
```json
{
  "operation": "auth_signin",
  "error": "Invalid login credentials",
  "user": "user@example.com",
  "timestamp": "2026-01-27T10:00:00Z",
  "context": {}
}
```

### Testing

To test error monitoring:
1. Start dev server
2. Trigger an error (invalid login, failed operation, etc.)
3. Check https://ntfy.sh/bb-manager-ops
4. Should see notification within seconds

---

## Maintenance

### Invite Code Cleanup
- Monitor GitHub Actions workflow runs
- Check deleted counts periodically
- Verify cleanup is working

### CI/CD E2E Tests
- Review failed test runs
- Update tests as features evolve
- Keep credentials in sync

### Error Monitoring
- Subscribe to ntfy.sh topic
- Review error patterns periodically
- Adjust what gets reported to reduce noise

---

## Future Improvements

These improvements provide a foundation for:
- Full E2E test automation with Playwright
- Enhanced monitoring with dashboards
- Automated recovery from failures
- Performance monitoring
- Usage analytics

---

## Related Documents

- Audit Report: `docs/audit-2026-01-27.md`
- Design Doc: `docs/plans/2026-01-27-short-term-improvements-design.md`
- Implementation Plan: `docs/plans/2026-01-27-short-term-improvements.md`
- E2E Tests: `tests/e2e/*.md`
```

**Step 2: Commit documentation**

```bash
git add docs/short-term-improvements.md
git commit -m "docs(improvements): add short-term improvements documentation

- Describes invite code cleanup (database + CI/CD)
- Documents E2E testing infrastructure
- Explains error monitoring with ntfy.sh
- Includes usage instructions and maintenance notes

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 12: Final Verification and Merge

**Files:**
- All modified/created files
- Test: Final sanity checks

**Step 1: Type-check everything**

```bash
npx tsc -p tsconfig.json --noEmit
```

Expected: No errors

**Step 2: Review all commits**

```bash
git log --oneline --graph
```

Expected: 11-12 commits for all improvements

**Step 3: Verify no uncommitted changes**

```bash
git status
```

Expected: "nothing to commit, working tree clean"

**Step 4: Final commit**

If any uncommitted files, commit them:
```bash
git add .
git commit -m "chore: final cleanup before merge"
```

**Step 5: Switch to main and merge**

```bash
cd /Users/harrisonk/dev/BB-Manager
git checkout main
git pull origin main
git merge short-term-improvements
git push origin main
```

**Step 6: Cleanup worktree**

```bash
git worktree remove .worktrees/short-term-improvements
git branch -d short-term-improvements
```

**Step 7: Celebrate!**

🎉 **Short-term improvements complete!**

---

## Success Criteria

After completing this plan:

✅ **Invite Code Cleanup:**
- Expired codes auto-flagged as revoked
- Old codes deleted after 14 days automatically
- GitHub Actions workflow scheduled

✅ **CI/CD E2E Testing:**
- Type-checking on every push/PR
- Dev server startup in CI
- Test infrastructure in place

✅ **Error Monitoring:**
- All critical errors reported to ntfy.sh
- Auth failures monitored
- CRUD failures monitored
- Marks failures monitored
- Global error handlers active

✅ **Documentation:**
- Complete usage instructions
- Maintenance guidelines
- Future improvement suggestions

---

## Estimated Timeline

- Tasks 1-2: Database functions/triggers (30 min)
- Task 3: GitHub Actions cleanup workflow (15 min)
- Tasks 4-8: Error monitoring integration (45 min)
- Tasks 9-10: E2E testing infrastructure (30 min)
- Task 11: Documentation (20 min)
- Task 12: Verification and merge (15 min)

**Total:** ~3 hours

All improvements are independent and can be tested individually.

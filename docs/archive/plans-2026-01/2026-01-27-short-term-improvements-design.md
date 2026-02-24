# Short-Term Improvements Design

**Date:** 2026-01-27
**Status:** Approved
**Goal:** Three targeted improvements to harden production-ready BB-Manager

---

## Overview

Three targeted improvements to harden the production-ready BB-Manager: (1) automatic cleanup of expired invite codes via database trigger + scheduled GitHub Actions job, (2) GitHub Actions CI/CD workflow to run E2E tests on every push, and (3) ntfy.sh integration for operation failure notifications.

---

## Improvement 1: Invite Code Automatic Cleanup

### Problem
Expired and used invite codes accumulate in the database indefinitely, causing clutter and potential confusion. The audit found 4 expired/revoked codes that should be cleaned up.

### Solution
Two-layer approach: immediate flagging + scheduled deletion

**Layer 1: Immediate Expiration Flagging (Database Trigger)**
- Trigger function on `invite_codes` table
- Fires on INSERT/UPDATE
- Checks if `expires_at < NOW()`
- Automatically sets `revoked = true` for expired codes
- Provides immediate feedback that code is invalid

**Layer 2: Scheduled Deletion (GitHub Actions)**
- PostgreSQL function `cleanup_old_invite_codes()`
- Deletes codes where:
  - `expires_at < NOW() - INTERVAL '14 days'` (expired 14+ days ago)
  - OR `is_used = true AND used_at < NOW() - INTERVAL '14 days'` (used 14+ days ago)
- GitHub Actions workflow runs daily at 2 AM UTC
- Calls cleanup function via Supabase REST API with service role key
- Requires `SUPABASE_SERVICE_ROLE_KEY` in GitHub Secrets

### Implementation Details

**Database Function:**
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

-- Grant execute to service role only
GRANT EXECUTE ON FUNCTION cleanup_old_invite_codes() TO service_role;
```

**Database Trigger:**
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

CREATE TRIGGER invite_code_expiration_trigger
BEFORE INSERT OR UPDATE ON invite_codes
FOR EACH ROW
EXECUTE FUNCTION check_invite_code_expiration();
```

**GitHub Actions Workflow:**
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
          curl -X POST "${{ secrets.SUPABASE_URL }}/rest/v1/rpc/cleanup_old_invite_codes" \
            -H "apikey: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}"
```

### Files Modified/Created
- Database: `check_invite_code_expiration()` function
- Database: `cleanup_old_invite_codes()` function
- Database: Trigger on `invite_codes` table
- `.github/workflows/cleanup-invite-codes.yml` - New file

---

## Improvement 2: CI/CD E2E Testing

### Problem
No automated testing to catch regressions when code changes. The E2E tests are manual documents that must be run by hand.

### Solution
GitHub Actions workflow that automatically runs E2E tests on every push to `main` and on pull requests.

### Implementation Details

**Workflow File:** `.github/workflows/e2e-tests.yml`

**Triggers:**
- Push to `main` branch
- Pull requests to `main`
- Manual workflow dispatch

**Test Execution:**
1. Checkout code
2. Setup Node.js
3. Install dependencies
4. Create `.env` file from GitHub Secrets
5. Start dev server in background
6. Wait for server to be ready
7. Run E2E tests using Playwright MCP or manual test execution
8. Shutdown dev server
9. Upload test results/screenshots as artifacts

**Environment Variables Required:**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `TEST_USER_EMAIL` (test@example.com)
- `TEST_USER_PASSWORD` (abc)

**Test Scenarios:**
1. Auth & Login workflow (4 tests)
2. Invite Code Signup workflow (7 tests)
3. Member CRUD workflow (4 tests)
4. Weekly Marks Entry workflow (6 tests)

**Total Runtime:** ~5 minutes

**Failure Behavior:**
- Workflow fails if any critical test fails
- Blocks PR merge until tests pass
- Screenshots uploaded for debugging

### Workflow Example
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
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Create .env file
        run: |
          echo "VITE_SUPABASE_URL=${{ secrets.VITE_SUPABASE_URL }}" >> .env
          echo "VITE_SUPABASE_ANON_KEY=${{ secrets.VITE_SUPABASE_ANON_KEY }}" >> .env

      - name: Start dev server
        run: npm run dev &
        env:
          CI: true

      - name: Wait for server
        run: sleep 10

      - name: Run E2E tests
        run: # Execute E2E test scripts

      - name: Upload screenshots
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: e2e-screenshots
          path: tests/e2e/screenshots/
```

### Files Modified/Created
- `.github/workflows/e2e-tests.yml` - New file
- `scripts/run-e2e-tests.sh` - Helper script to run tests (optional)
- GitHub Secrets configuration required

---

## Improvement 3: Failure Monitoring with ntfy.sh

### Problem
When operations fail in production, there's no visibility into what's going wrong. Errors only appear in user's browser console, which they don't report.

### Solution
Client-side error monitoring that POSTs failure notifications to `https://ntfy.sh/bb-manager-ops` for immediate visibility.

### Implementation Details

**Error Monitoring Service:** `services/errorMonitoring.ts`

```typescript
interface ErrorReport {
  operation: string;
  error: string;
  user?: string;
  timestamp: string;
  context?: Record<string, any>;
}

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

**Integration Points:**

**1. Auth Errors** (`services/supabaseAuth.ts`):
```typescript
try {
  // ... auth operation
} catch (error) {
  await reportError('auth_signin', error as Error, email);
  throw error; // Re-throw for UI to handle
}
```

**2. CRUD Errors** (`services/db.ts`):
```typescript
try {
  // ... CRUD operation
} catch (error) {
  await reportError('db_updateBoy', error as Error, userEmail, {
    boyId: boy.id,
    section
  });
  throw error;
}
```

**3. Marks Save Errors** (`components/WeeklyMarksPage.tsx`):
```typescript
try {
  await handleSaveMarks();
} catch (error) {
  await reportError('marks_save', error as Error, userEmail, {
    boyCount: marks.length,
    section
  });
  // Show error to user
}
```

**4. Network Errors** (Global error handler):
```typescript
window.addEventListener('unhandledrejection', async (event) => {
  await reportError('unhandled_promise', event.reason as Error);
});
```

### Notification Format

**ntfy.sh Message:**
```
Title: BB-Manager Error: auth_signin

{
  "operation": "auth_signin",
  "error": "Invalid login credentials",
  "user": "user@example.com",
  "timestamp": "2026-01-27T10:00:00Z"
}
```

**Priority Levels:**
- 3 (High): Auth failures, data loss risks
- 2 (Normal): CRUD failures, validation errors
- 1 (Low): UI errors, non-critical issues

### Files Modified/Created
- `services/errorMonitoring.ts` - New file
- `services/supabaseAuth.ts` - Add error reporting
- `services/db.ts` - Add error reporting
- `components/WeeklyMarksPage.tsx` - Add error reporting
- `src/main.tsx` or `App.tsx` - Global error handler

---

## Success Criteria

After implementing these improvements:

1. ✅ **Invite codes auto-cleanup:**
   - Expired codes immediately flagged as revoked
   - Old codes deleted after 14 days automatically
   - No manual intervention needed

2. ✅ **Automated E2E testing:**
   - Tests run on every push/PR
   - Regressions caught before merge
   - CI/CD provides confidence in changes

3. ✅ **Error monitoring:**
   - All critical errors reported to ntfy.sh
   - Immediate visibility into production issues
   - Context-rich error reports for debugging

---

## Implementation Order

1. **Invite Code Cleanup** (database + GitHub Actions)
2. **Error Monitoring** (client-side integration)
3. **CI/CD E2E Tests** (GitHub Actions workflow)

Each improvement is independent and can be deployed separately.

---

## Maintenance Notes

**Invite Code Cleanup:**
- Monitor GitHub Actions workflow runs
- Check `cleanup_old_invite_codes()` return counts
- Verify deletion is working as expected

**CI/CD E2E Tests:**
- Review failed test runs
- Update tests as features evolve
- Keep test credentials in sync

**Error Monitoring:**
- Subscribe to `https://ntfy.sh/bb-manager-ops`
- Set up filters/priorities in ntfy client
- Periodically review error patterns
- Adjust what gets reported to reduce noise

---

## Estimated Effort

- Invite code cleanup: 1-2 hours
- Error monitoring: 1 hour
- CI/CD E2E tests: 2-3 hours
- **Total:** 4-6 hours

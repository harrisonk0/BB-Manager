# Phase 2: Performance - Research

**Researched:** 2026-01-22
**Domain:** PostgreSQL RLS performance optimization, index maintenance, Vitest unit testing
**Confidence:** HIGH

## Summary

This phase addresses three performance and reliability improvements: (1) optimizing 16 RLS policies to use `(select auth.uid())` subquery pattern for caching, (2) dropping 3 unused indexes to reduce write overhead, and (3) adding unit test coverage for 3 security functions (get_user_role, can_access_section, can_access_audit_logs).

The RLS optimization is based on Supabase's official performance guidance, which shows that wrapping `auth.uid()` calls in a subquery triggers PostgreSQL's `initPlan` optimization, caching the result instead of calling the function on every row. This can provide 10-100x performance improvements on queries with RLS enabled. Index cleanup uses PostgreSQL's `pg_stat_user_indexes` view to identify truly unused indexes via `idx_scan` counts.

For testing, Vitest is already configured in the project (Phase 1). The standard approach for testing security functions is to mock the Supabase client entirely using `vi.mock()`, creating predictable return values for database operations without connecting to the actual database.

**Primary recommendation:** Use `(select auth.uid())` subquery pattern in all RLS policies referencing `auth.uid()`, verify unused indexes with `pg_stat_user_indexes` before dropping, and test security functions with mocked Supabase calls using `vi.mock()`.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vitest | ^4.0.17 | Unit test framework (already installed) | Native Vite integration, TypeScript-first, fastest for Vite projects |
| @vitest/ui | ^4.0.17 | Optional test UI (already installed) | Improved developer experience for test debugging |

### Database Performance Tools
| Tool | Purpose | Why Standard |
|------|---------|--------------|
| pg_stat_user_indexes | Postgres system view for index usage stats | Official PostgreSQL method to detect unused indexes |
| EXPLAIN ANALYZE | PostgreSQL query plan analysis tool | Verify index usage and measure query performance |
| initPlan optimization | PostgreSQL subquery caching | Key to auth.uid() performance in RLS policies |

### Testing Utilities
| Library | Purpose | When to Use |
|---------|---------|-------------|
| vi.mock() | Full module mocking | Database client mocking (preferred over vi.spyOn) |
| vi.fn() | Mock function creation | Creating mock implementations |
| vi.clearAllMocks() | Reset mock state | Cleanup between tests |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| vi.mock() | vi.spyOn() | Partial mocks can be harmful to test suite health (community consensus) |
| (select auth.uid()) | Adding user_id index only | Subquery pattern provides 10-100x improvement; index alone provides ~100x but only for simple equality |

**Installation:**
```bash
# Already installed - no new packages required
npm install  # Ensures existing dependencies are available
```

## Architecture Patterns

### Recommended Project Structure
```
tests/
├── unit/
│   ├── database/
│   │   ├── get_user_role.test.ts
│   │   ├── can_access_section.test.ts
│   │   └── can_access_audit_logs.test.ts
│   └── services/         # Existing (from Phase 1)
├── setup.ts              # Already exists with Supabase mock
└── example.test.ts       # Already exists (verification test)
```

### Pattern 1: RLS Policy auth.uid() Subquery Optimization

**What:** Wrap `auth.uid()` calls in `(select ...)` to enable PostgreSQL's `initPlan` optimization, which caches the result instead of calling the function on every row.

**When to use:** All RLS policies that reference `auth.uid()`, `auth.jwt()`, or security-definer functions.

**Example:**
```sql
-- Source: https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv
-- BEFORE (slow - function called on every row):
CREATE POLICY boys_select_officer_plus
ON public.boys
FOR SELECT
TO authenticated
USING (public.current_app_role() IN ('officer','captain','admin'));

-- AFTER (fast - function result cached via initPlan):
CREATE POLICY boys_select_officer_plus
ON public.boys
FOR SELECT
TO authenticated
USING ((select public.current_app_role()) IN ('officer','captain','admin'));

-- For direct auth.uid() usage:
-- BEFORE:
auth.uid()::text = uid

-- AFTER:
(select auth.uid())::text = uid
```

**Performance impact:** Supabase benchmarks show 94.74% performance improvement on RLS queries with this pattern.

### Pattern 2: Unused Index Detection

**What:** Query `pg_stat_user_indexes` to identify indexes that haven't been used, then verify with `EXPLAIN ANALYZE` before dropping.

**When to use:** Regular index maintenance; before dropping any index.

**Example:**
```sql
-- Source: Community best practices for PostgreSQL index maintenance
-- Step 1: Find potentially unused indexes
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan AS index_scans,
    idx_tup_read AS tuples_read,
    idx_tup_fetch AS tuples_fetched
FROM pg_stat_user_indexes
WHERE idx_scan = 0  -- Never used since stats reset
ORDER BY schemaname, tablename, indexname;

-- Step 2: Before dropping, verify with EXPLAIN ANALYZE
-- Run a typical query with RLS enabled:
SET SESSION ROLE authenticated;
SET request.jwt.claims TO '{"role":"authenticated", "sub":"test-user-id"}';

EXPLAIN ANALYZE SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 50;

-- Step 3: Check if the index appears in the query plan
-- If "Index Scan" or "Index Only Scan" appears, the index IS being used
-- If only "Seq Scan" appears and idx_scan=0, the index is safe to drop
```

### Pattern 3: Testing Security Functions with Vitest

**What:** Mock the Supabase client to test security function logic without database connection.

**When to use:** Unit testing service-layer functions that call Supabase.

**Example:**
```typescript
// Source: Vitest official mocking guide
// File: tests/unit/database/get_user_role.test.ts

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { supabase } from '@/services/supabaseClient';

// Mock the Supabase client (hoisted to top of file)
vi.mock('@/services/supabaseClient', () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

describe('get_user_role security function', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return role for valid user', async () => {
    // Arrange
    const mockData = { role: 'captain' };
    vi.mocked(supabase.rpc).mockResolvedValueOnce({
      data: mockData,
      error: null,
    });

    // Act
    const result = await supabase.rpc('get_user_role', { user_uid: 'test-uid' });

    // Assert
    expect(supabase.rpc).toHaveBeenCalledWith('get_user_role', { user_uid: 'test-uid' });
    expect(result.data).toEqual(mockData);
    expect(result.error).toBeNull();
  });

  it('should return null for non-existent user', async () => {
    // Arrange
    vi.mocked(supabase.rpc).mockResolvedValueOnce({
      data: null,
      error: null,
    });

    // Act
    const result = await supabase.rpc('get_user_role', { user_uid: 'unknown-uid' });

    // Assert
    expect(result.data).toBeNull();
  });
});
```

### Anti-Patterns to Avoid

- **vi.spyOn for database mocking:** Partial mocks can lead to fragile tests; prefer vi.mock() for full module replacement
- **Dropping indexes without verification:** Always check EXPLAIN ANALYZE output and pg_stat_user_indexes
- **Forgetting to clear mocks:** Always call vi.clearAllMocks() in beforeEach to prevent test interference
- **Testing with real database in unit tests:** Use mocks for unit tests; reserve integration tests for separate test suite

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Test database connection | Custom Supabase test instance | vi.mock() + mock implementations | Faster, predictable, no external dependencies |
| Index usage detection | Custom query logging | pg_stat_user_indexes view | PostgreSQL built-in, accurate, standard |
| Mock function factories | Manual mock object creation | vi.fn() + vi.mocked() type helper | Type-safe, standard Vitest pattern |
| Test isolation | Manual state management | beforeEach + vi.clearAllMocks() | Standard pattern, prevents test leakage |

**Key insight:** Unit tests for database functions should mock the client, not connect to a real database. Integration tests (if needed) should be separate and use Supabase CLI's local testing features.

## Common Pitfalls

### Pitfall 1: RLS Policy Function Called on Every Row

**What goes wrong:** RLS policies using `auth.uid()` directly cause the function to be called for every row in the table, resulting in 100ms+ query times even on small tables.

**Why it happens:** PostgreSQL doesn't automatically cache `auth.uid()` results in RLS policies, treating each row evaluation as a separate function call.

**How to avoid:** Wrap `auth.uid()` in a subquery: `(select auth.uid())`. This triggers the `initPlan` optimization which caches the result for the query.

**Warning signs:** EXPLAIN ANALYZE shows "Filter" or "SubPlan" with high execution time (100ms+); `auth.uid()` appears in the query plan multiple times.

### Pitfall 2: Dropping Indexes That ARE Used

**What goes wrong:** Dropping an index that appears unused but is actually needed for specific query patterns, causing performance regression.

**Why it happens:** `pg_stat_user_indexes` only tracks usage since last stats reset; low-traffic indexes may not show usage even when needed. Also, EXPLAIN ANALYZE increments index counters.

**How to avoid:** 1) Run `pg_stat_reset()` at start of observation period, 2) Wait sufficient time (at least one week of production traffic), 3) Verify with EXPLAIN ANALYZE on typical queries before dropping, 4) Check for "Index Scan" in query plans.

**Warning signs:** Queries become slower after index drop; EXPLAIN shows "Seq Scan" on large tables where "Index Scan" was previously used.

### Pitfall 3: Mock State Leaking Between Tests

**What goes wrong:** Tests pass individually but fail when run together; mock return values from previous tests affect later tests.

**Why it happens:** Vitest mocks persist across test runs; vi.mock() is hoisted and state isn't automatically reset between tests.

**How to avoid:** Always call `vi.clearAllMocks()` in beforeEach hook. For vi.stubGlobal() or vi.stubEnv(), enable config options `unstubGlobals: true` and `unstubEnvs: true` in vitest config.

**Warning signs:** Tests pass in isolation but fail in suite; tests fail when run in different order.

### Pitfall 4: Wrong Scope for auth.uid() Subquery Pattern

**What goes wrong:** Wrapping the entire policy expression in subquery instead of just the function call, breaking the logic.

**Why it happens:** Misunderstanding of the pattern - only the volatile function needs wrapping.

**How to avoid:** Wrap only `auth.uid()` or the security-definer function call, not the entire comparison.

```sql
-- WRONG: Wraps entire expression
(select auth.uid()::text = uid)  -- Returns boolean, breaks RLS

-- CORRECT: Wraps only the function
(select auth.uid())::text = uid  -- Returns uid to compare
```

**Warning signs:** Policy allows all rows or denies all rows unexpectedly; policy returns boolean instead of filtering.

## Code Examples

Verified patterns from official sources:

### RLS Policy Optimization Pattern
```sql
-- Source: https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv
-- The subquery pattern for caching auth.uid()

-- Pattern for SELECT policies:
CREATE POLICY boys_select_officer_plus
ON public.boys
FOR SELECT
TO authenticated
USING (
  (select public.current_app_role()) IN ('officer','captain','admin')
);

-- Pattern for INSERT policies:
CREATE POLICY audit_logs_insert_officer_plus
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE uid = (select auth.uid())::text
  )
  AND user_email = coalesce((auth.jwt() ->> 'email'), '')
  AND created_at > NOW() - INTERVAL '5 minutes'
  AND created_at <= NOW() + INTERVAL '1 minute'
);

-- Pattern for UPDATE/DELETE policies:
CREATE POLICY boys_update_officer_plus
ON public.boys
FOR UPDATE
TO authenticated
USING ((select public.current_app_role()) IN ('officer','captain','admin'))
WITH CHECK ((select public.current_app_role()) IN ('officer','captain','admin'));
```

### Index Usage Verification
```sql
-- Source: PostgreSQL pg_stat_user_indexes documentation
-- Combined with Supabase EXPLAIN pattern

-- 1. Check index usage statistics
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE indexname LIKE 'idx_audit_logs%'
   OR indexname LIKE 'idx_invite_codes%'
ORDER BY idx_scan ASC;

-- 2. Verify query doesn't need the index
SET SESSION ROLE authenticated;
SET request.jwt.claims TO '{"role":"authenticated", "sub":"test-user-id"}';

EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM audit_logs
ORDER BY timestamp DESC
LIMIT 50;

-- 3. Look for:
-- - "Index Scan using idx_audit_logs_timestamp" = index IS used, DON'T DROP
-- - "Seq Scan on audit_logs" = sequential scan, index may be unused
-- - "Sort" with high cost = may benefit from index

-- 4. Safe to drop if:
-- - idx_scan = 0 (or very low)
-- - EXPLAIN shows no index scan
-- - Table is small or query patterns don't use the index
```

### Vitest Test for Security Function
```typescript
// Source: Vitest official mocking guide
// File: tests/unit/database/can_access_audit_logs.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/services/supabaseClient';

vi.mock('@/services/supabaseClient', () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

describe('can_access_audit_logs security function', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return true for captain role', async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({
      data: true,
      error: null,
    });

    const result = await supabase.rpc('can_access_audit_logs', {
      user_uid: 'captain-uid',
    });

    expect(result.data).toBe(true);
    expect(result.error).toBeNull();
    expect(supabase.rpc).toHaveBeenCalledTimes(1);
  });

  it('should return true for admin role', async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({
      data: true,
      error: null,
    });

    const result = await supabase.rpc('can_access_audit_logs', {
      user_uid: 'admin-uid',
    });

    expect(result.data).toBe(true);
  });

  it('should return false for officer role', async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({
      data: false,
      error: null,
    });

    const result = await supabase.rpc('can_access_audit_logs', {
      user_uid: 'officer-uid',
    });

    expect(result.data).toBe(false);
  });

  it('should return false for user without role', async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({
      data: false,
      error: null,
    });

    const result = await supabase.rpc('can_access_audit_logs', {
      user_uid: 'unknown-uid',
    });

    expect(result.data).toBe(false);
  });
});
```

### RLS Policy Migration Pattern
```sql
-- Source: Phase 1 remediation pattern (01-07-remediation.sql)
-- Adapted for RLS policy updates

BEGIN;

-- 1. Drop existing policy
DROP POLICY IF EXISTS boys_select_officer_plus ON public.boys;

-- 2. Recreate with subquery optimization
CREATE POLICY boys_select_officer_plus
ON public.boys
FOR SELECT
TO authenticated
USING ((select public.current_app_role()) IN ('officer','captain','admin'));

-- 3. Verify the policy was created
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  SELECT policyname, cmd
  INTO policy_record
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'boys'
    AND policyname = 'boys_select_officer_plus';

  IF FOUND THEN
    RAISE NOTICE 'Policy verified: %', policy_record.policyname;
  ELSE
    RAISE EXCEPTION 'Policy creation failed';
  END IF;
END $$;

COMMIT;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Direct auth.uid() in RLS | (select auth.uid()) subquery pattern | Supabase docs updated 2025-12 | 94% performance improvement on RLS queries |
| Manual index guessing | pg_stat_user_indexes + EXPLAIN ANALYZE | PostgreSQL 9.1+ | Data-driven index maintenance decisions |
| Jest manual setup | Vitest with Vite config sharing | 2023+ | Faster tests, unified configuration |
| vi.spyOn for mocking | vi.mock() for database clients | Community consensus 2024+ | More reliable tests, less fragility |

**Deprecated/outdated:**
- Direct `auth.uid()` calls in RLS without subquery wrapping - documented performance anti-pattern
- Manual index usage tracking - replaced by pg_stat_user_indexes view
- Anon role RLS policies without `TO authenticated` - causes anon queries to be processed

## Open Questions

### Question 1: Current RLS Policy State

**What we know:** Phase 1 implemented RLS policies but the exact current state of all 16 policies needs verification. The security model document defines the target policies.

**What's unclear:** Which of the 16 policies currently use `auth.uid()` directly vs. the subquery pattern. Some policies may use `public.current_app_role()` which also needs subquery wrapping.

**Recommendation:** Start by querying `pg_policies` to catalog all current RLS policies and their USING/WITH CHECK expressions, then identify which need the subquery pattern applied.

### Question 2: Index Usage Since Statistics Reset

**What we know:** The `idx_scan` counter in `pg_stat_user_indexes` resets when `pg_stat_reset()` is called or when the database restarts.

**What's unclear:** When statistics were last reset. If recent, the indexes may appear unused when they're actually needed for certain query patterns.

**Recommendation:** Before dropping indexes, run `EXPLAIN ANALYZE` on typical application queries to verify the index isn't used. Consider keeping indexes if there's any uncertainty.

### Question 3: Testing Security Functions vs Testing Their Callers

**What we know:** The security functions (`get_user_role`, `can_access_section`, `can_access_audit_logs`) exist in the database. The requirements say to write unit tests FOR these functions.

**What's unclear:** Should we test the database functions directly (requires database connection) or test the TypeScript service layer that calls these functions (mocked)?

**Recommendation:** Test at the service layer with mocked Supabase calls. The functions are simple (already verified in Phase 1), and testing the RPC call pattern validates integration. Database-level tests would be integration tests, not unit tests.

## Sources

### Primary (HIGH confidence)
- [Supabase RLS Performance and Best Practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv) - Official Supabase documentation, verified (select auth.uid()) pattern with benchmark results
- [Vitest Mocking Guide](https://vitest.dev/guide/mocking) - Official Vitest documentation, verified mocking patterns for database clients
- [PostgreSQL EXPLAIN Documentation](https://www.postgresql.org/docs/current/sql-explain.html) - Official PostgreSQL documentation for query plan analysis

### Secondary (MEDIUM confidence)
- [Finding Unused Indexes in PostgreSQL (PGDash)](https://pgdash.io/blog/finding-unused-indexes-in-postgresql.html) - Community best practices for index usage analysis, verified pg_stat_user_indexes pattern
- [PostgreSQL Index Usage Analysis (Stack Overflow)](https://stackoverflow.com/questions/3318727/postgresql-index-usage-analysis) - Community consensus on index maintenance approaches
- [vi.spyOn vs vi.mock Discussion (Vitest GitHub)](https://github.com/vitest-dev/vitest/discussions/4224) - Community guidance on mocking best practices
- [Effective Unit Testing with Vitest](https://medium.com/@ryanmambou/effective-unit-testing-using-mocks-in-vitest-4737f63f88c3) - Verified mocking patterns

### Tertiary (LOW confidence)
- [How to mock Supabase in Vitest (Reddit)](https://www.reddit.com/r/Supabase/comments/1ck80js/how_to_mock_supabase_in_vitest_tests/) - Community discussion, needs validation in project context
- [Testing React and Supabase with MSW](https://nygaard.dev/blog/testing-supabase-rtl-msw) - MSW approach may be overkill for unit tests; vi.mock() preferred

## Metadata

**Confidence breakdown:**
- RLS optimization pattern: HIGH - Supabase official docs with benchmarks, clearly documented
- Index detection methods: HIGH - Standard PostgreSQL system views, well-documented
- Vitest testing patterns: HIGH - Official Vitest docs, Phase 1 established the patterns
- Security function signatures: HIGH - Functions exist in migrations, Phase 1 verified them
- Current policy state: MEDIUM - Need to query pg_policies to verify current state
- Index drop safety: MEDIUM - Requires EXPLAIN ANALYZE verification before each drop

**Research date:** 2026-01-22
**Valid until:** 90 days (PostgreSQL patterns stable; Vitest APIs mature; Supabase RLS guidance recently updated Dec 2025)

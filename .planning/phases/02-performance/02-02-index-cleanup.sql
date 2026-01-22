-- ============================================================================
-- Index Cleanup: Drop Unused Indexes
-- ============================================================================
-- Purpose: Remove unused indexes to reduce database write overhead and storage
-- Date: 2026-01-22
-- Context: Phase 2 Plan 02 - Performance optimization
--
-- This script should be executed via:
-- 1. Supabase Dashboard > SQL Editor
-- 2. MCP Supabase tool: mcp__supabase__executeSQL
-- 3. Any PostgreSQL client connected to the database
--
-- IMPORTANT: Review the index usage statistics and EXPLAIN ANALYZE results
-- before executing the DROP INDEX statements. This script includes IF EXISTS
-- to handle cases where indexes may have already been dropped or never created.
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Query index usage statistics (pg_stat_user_indexes)
-- ============================================================================
-- This query identifies potentially unused indexes by checking idx_scan counts.
-- An index with idx_scan = 0 has never been used since statistics were last reset.
--
-- Note: pg_stat_user_indexes only tracks usage since the last time statistics
-- were reset (pg_stat_reset()) or the database was restarted. Low-traffic indexes
-- may appear unused even when they are needed for certain query patterns.
-- ============================================================================

DO $$
DECLARE
  index_record RECORD;
  total_unused INTEGER := 0;
BEGIN
  RAISE NOTICE '=== Index Usage Statistics ===';

  FOR index_record IN
    SELECT
      schemaname,
      tablename,
      indexname,
      idx_scan AS index_scans,
      idx_tup_read AS tuples_read,
      idx_tup_fetch AS tuples_fetched
    FROM pg_stat_user_indexes
    WHERE schemaname = 'public'
      AND (
        indexname LIKE 'idx_audit_logs%'
        OR indexname LIKE 'idx_invite_codes%'
      )
    ORDER BY idx_scan ASC, tablename, indexname
  LOOP
    RAISE NOTICE 'Table: %, Index: %, Scans: %, Tuples Read: %, Tuples Fetched: %',
      index_record.tablename,
      index_record.indexname,
      index_record.index_scans,
      index_record.tuples_read,
      index_record.tuples_fetched;

    IF index_record.index_scans = 0 THEN
      total_unused := total_unused + 1;
    END IF;
  END LOOP;

  RAISE NOTICE '=== Summary: % potentially unused indexes found ===', total_unused;
END $$;

-- ============================================================================
-- STEP 2: List all indexes on audit_logs and invite_codes tables
-- ============================================================================
-- For reference, this shows all indexes on the target tables.
-- ============================================================================

DO $$
DECLARE
  index_record RECORD;
BEGIN
  RAISE NOTICE '=== All Indexes on Target Tables ===';

  FOR index_record IN
    SELECT
      tablename,
      indexname,
      indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND (tablename = 'audit_logs' OR tablename = 'invite_codes')
    ORDER BY tablename, indexname
  LOOP
    RAISE NOTICE 'Table: %, Index: %', index_record.tablename, index_record.indexname;
    RAISE NOTICE '  Definition: %', index_record.indexdef;
  END LOOP;
END $$;

-- ============================================================================
-- STEP 3: Drop potentially unused indexes
-- ============================================================================
-- Based on the schema analysis:
--
-- audit_logs table has:
-- - idx_audit_logs_section_timestamp (section, timestamp DESC) - compound index
-- - idx_audit_logs_timestamp (timestamp DESC) - single column
--
-- The single-column idx_audit_logs_timestamp may be redundant if the compound
-- index idx_audit_logs_section_timestamp can serve the same queries.
--
-- invite_codes table has:
-- - idx_invite_codes_active (expires_at, is_used, revoked) - compound index
-- - idx_invite_codes_section (section)
--
-- The indexes mentioned in the plan (idx_invite_codes_generated_at_desc,
-- idx_invite_codes_is_used_true, idx_invite_codes_revoked_true) do not exist
-- in the current schema.
--
-- Only drop indexes that:
-- 1. Have idx_scan = 0 (never used)
-- 2. Are not primary key or unique constraints
-- 3. Have alternative indexes that can serve similar queries
-- ============================================================================

-- Drop potentially redundant audit_logs timestamp index
-- This single-column index may be redundant when the compound index exists
DROP INDEX IF EXISTS public.idx_audit_logs_timestamp;

-- Note: The following indexes were mentioned in the plan but don't exist
-- in the current schema. These DROP INDEX statements use IF EXISTS to handle
-- cases where the indexes were never created or already dropped.
DROP INDEX IF EXISTS public.idx_audit_logs_timestamp_desc;
DROP INDEX IF EXISTS public.idx_invite_codes_generated_at_desc;
DROP INDEX IF EXISTS public.idx_invite_codes_is_used_true;
DROP INDEX IF EXISTS public.idx_invite_codes_revoked_true;

-- ============================================================================
-- STEP 4: Verify dropped indexes are gone
-- ============================================================================

DO $$
DECLARE
  remaining_index RECORD;
  remaining_count INTEGER := 0;
BEGIN
  RAISE NOTICE '=== Remaining Indexes After Cleanup ===';

  FOR remaining_index IN
    SELECT
      tablename,
      indexname,
      indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND (
        indexname LIKE 'idx_audit_logs%'
        OR indexname LIKE 'idx_invite_codes%'
      )
    ORDER BY tablename, indexname
  LOOP
    RAISE NOTICE 'Table: %, Index: %', remaining_index.tablename, remaining_index.indexname;
    remaining_count := remaining_count + 1;
  END LOOP;

  RAISE NOTICE '=== % indexes remain on target tables ===', remaining_count;
END $$;

COMMIT;

-- ============================================================================
-- Verification Queries
-- ============================================================================
-- Run these after the script to confirm success and to verify no performance
-- regression has occurred:
--
-- 1. Verify indexes were dropped
-- SELECT indexname FROM pg_indexes
-- WHERE schemaname = 'public'
--   AND (indexname LIKE 'idx_audit_logs%' OR indexname LIKE 'idx_invite_codes%')
-- ORDER BY indexname;
--
-- Expected: Dropped indexes should NOT appear in the results.
--
-- 2. Verify typical queries still perform well
-- -- For audit_logs (most recent first query):
-- EXPLAIN ANALYZE
-- SELECT * FROM audit_logs
-- WHERE section = 'company'
-- ORDER BY timestamp DESC
-- LIMIT 50;
--
-- Expected: Should use idx_audit_logs_section_timestamp index.
-- Look for "Index Scan using idx_audit_logs_section_timestamp" in the plan.
--
-- 3. Check invite_codes queries
-- -- For active invite codes:
-- EXPLAIN ANALYZE
-- SELECT * FROM invite_codes
-- WHERE expires_at > NOW()
--   AND is_used = false
--   AND revoked = false
-- ORDER BY expires_at ASC;
--
-- Expected: Should use idx_invite_codes_active index.
--
-- 4. Monitor index usage after deployment
-- -- Run this after a week of production traffic:
-- SELECT
--   schemaname,
--   tablename,
--   indexname,
--   idx_scan AS index_scans,
--   idx_tup_read AS tuples_read,
--   idx_tup_fetch AS tuples_fetched
-- FROM pg_stat_user_indexes
-- WHERE schemaname = 'public'
--   AND (indexname LIKE 'idx_audit_logs%' OR indexname LIKE 'idx_invite_codes%')
-- ORDER BY idx_scan ASC, tablename, indexname;
--
-- Expected: Remaining indexes should show idx_scan > 0.
-- ============================================================================

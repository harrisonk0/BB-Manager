# Phase 2: Performance - Context

**Gathered:** 2026-01-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Optimize database performance by refactoring 16 RLS policies to use `(select auth.uid())` subquery pattern, dropping 3 unused indexes, and adding unit test coverage for the 3 security functions (get_user_role, can_access_section, can_access_audit_logs).

</domain>

<decisions>
## Implementation Decisions

### RLS Policy Refactoring

- **Migration strategy:** Table-by-table migrations (separate migration per table)
- **Policy update method:** Drop and recreate policies with new subquery pattern
- **Deployment target:** Apply directly to production
- **Verification:** Test each policy after creation with verification queries
- **Documentation:** Brief summary of changes per table (Claude's discretion)

### Index Cleanup Verification

- **Verification method:** Run EXPLAIN ANALYZE on queries before dropping to confirm unused
- **Drop strategy:** Drop indexes one at a time with verification between
- **Documentation:** No detailed documentation needed (Claude's discretion)

### Test Coverage Depth

- **Coverage scope:** Happy path + basic unauthorized + cross-role restrictions
- **Database approach:** Mock database calls (don't use MCP Supabase tools in tests)
- **Test organization:** Single vs separate test files (Claude's discretion)

### Claude's Discretion

- **RLS documentation:** Brief or detailed based on complexity of each table's changes
- **Index analysis documentation:** Whether to keep analysis results
- **Test file organization:** Separate test files per function or single comprehensive suite
- **Test describe block structure:** Group by function or by scenario
- **Assertion messages:** Whether to include custom error messages
- **Test documentation style:** Inline comments, minimal self-documenting, or external docs

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard performance optimization and testing best practices.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 02-performance*
*Context gathered: 2026-01-22*

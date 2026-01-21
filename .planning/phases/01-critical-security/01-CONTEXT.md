# Phase 1: Critical Security - Context

**Gathered:** 2026-01-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix critical security vulnerabilities (RLS, auth, key exposure) and set up testing foundation. This phase delivers hardened security functions, fixed RLS policies, verified service role key isolation, enabled leaked password protection, and a working Vitest setup. New capabilities belong in other phases.

</domain>

<decisions>
## Implementation Decisions

### Testing approach
- Test coverage: Happy path + errors (main success cases + expected error scenarios)
- Database mocking: Use @supabase/supabase-js test utilities when available
- Test file location: Separate __tests__/ or tests/ directory (not co-located)
- Security function tests: Basic unauthorized scenarios (wrong user, no auth, wrong role) — not comprehensive edge cases

### Security hardening
- search_path hardening: Claude's discretion (choose industry best practice for security functions)
- Logging for suspicious access: No logging — silent failures only (don't leak info to attackers)
- Service role key scan: Broad scan — search for common patterns (service_role, SERVICE_ROLE, serviceRole) plus env var usage and base64-like strings
- Service role key found in client code: Fail phase — treat as blocker, phase incomplete until removed

### RLS policy strategy (audit_logs_insert)
- Policy allows: All authenticated users can INSERT audit logs
- Validation: Basic validation of required fields (user_id, action, table_name)
- Impersonation prevention: user_id must match auth.uid() — prevents spoofing
- Database-level CHECK constraint: Timestamp check — ensure created_at is within reasonable range of now()

### TypeScript fix (db.ts line 514)
- Action type mismatch: Claude's discretion — choose based on consistency with rest of codebase
- Type mismatch prevention: Enable TypeScript's exhaustiveness checking for discriminated unions
- Scope: Full audit — check all AuditLogActionType references for consistency, not just line 514

### Claude's Discretion
- search_path hardening approach (SET LOCAL vs function-level vs defense in depth)
- Action type resolution for CREATE_INVITE_CODE vs GENERATE_INVITE_CODE

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard security best practices

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-critical-security*
*Context gathered: 2026-01-21*

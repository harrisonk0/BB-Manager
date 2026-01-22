# Phase 1: Critical Security - Research

**Researched:** 2026-01-22
**Domain:** Database security (PostgreSQL/Supabase), TypeScript type safety, Vitest testing
**Confidence:** HIGH

## Summary

This phase addresses five critical security issues and establishes a testing foundation. The primary security concerns are: (1) PostgreSQL `search_path` hardening for security-definer functions, (2) RLS policy enforcement for audit log inserts, (3) service role key exposure verification, (4) Supabase Auth leaked password protection, and (5) TypeScript type mismatch for audit log actions.

The standard approach for PostgreSQL security-definer functions is to explicitly set `search_path` at function creation time using `SET search_path = public` or stricter alternatives. For RLS policies, the recommended pattern is to validate user identity via `auth.uid()` checks. Vitest is the de facto standard for Vite-based projects, offering native TypeScript support and configuration reuse with `vite.config.ts`.

**Primary recommendation:** Use `SET search_path = public` in all security-definer functions; change `CREATE_INVITE_CODE` to `GENERATE_INVITE_CODE` for consistency; install Vitest with `npm install -D vitest @vitest/ui` and add `/// <reference types="vitest/config" />` to vite.config.ts.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vitest | latest (2.x) | Test framework for Vite projects | Native Vite config sharing, fastest test runner for Vite, TypeScript-first |
| @vitest/ui | latest | Optional UI for test results | Improves developer experience, optional but recommended |

### Database Security (Supabase/PostgreSQL)
| Tool | Purpose | Why Standard |
|------|---------|--------------|
| Supabase Dashboard | Auth configuration, leaked password protection | Official Supabase management interface |
| PostgreSQL SECURITY DEFINER | Privileged execution context | Standard PostgreSQL security mechanism |
| search_path hardening | Prevent search_path attacks | CVE-2018-1058 mitigation |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vi | (built-in) | Vitest assertion library | Default; replaces Jest's expect |
| @supabase/supabase-js | ^2.48.0 | Already in project | For test mocking/faking |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Vitest | Jest | Slower, requires separate config, less Vite integration |
| `SET search_path = public` | `SET search_path = ''` | Requires fully-qualified names everywhere, more verbose |

**Installation:**
```bash
# Testing framework
npm install -D vitest @vitest/ui

# For React component testing (future phases)
npm install -D @testing-library/react @testing-library/jest-dom happy-dom
```

## Architecture Patterns

### Recommended Project Structure
```
tests/
├── unit/                 # Unit tests for individual functions
│   ├── services/         # Test services layer
│   │   ├── db.test.ts
│   │   └── settings.test.ts
│   └── database/         # Database function tests (Phase 2)
├── setup.ts              # Test setup file (global mocks, etc.)
└── vitest.config.ts      # Optional separate Vitest config
```

### Pattern 1: Vitest Configuration (Single File)
**What:** Extend existing `vite.config.ts` with Vitest test configuration
**When to use:** Standard Vite projects - avoids duplication
**Example:**
```typescript
// Source: https://vitest.dev/guide/
// File: vite.config.ts

/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
    },
  },
});
```

### Pattern 2: PostgreSQL search_path Hardening
**What:** Explicitly set search_path in SECURITY DEFINER functions
**When to use:** All security-definer functions that access application tables
**Example:**
```sql
-- Source: https://supabase.com/docs/guides/database/database-advisors
-- Recommended: set explicit search_path at function level

CREATE FUNCTION public.current_app_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public  -- Explicit, secure path
AS $$
  SELECT ur.role
  FROM public.user_roles ur
  WHERE ur.uid = auth.uid()::text
  LIMIT 1
$$;
```

### Pattern 3: TypeScript Discriminated Union Exhaustiveness
**What:** Use TypeScript to enforce handling all union type cases
**When to use:** When switching on discriminated unions like `AuditLogActionType`
**Example:**
```typescript
// Source: TypeScript handbook pattern
// File: services/db.ts or similar

type AuditLogActionType =
  | 'CREATE_BOY'
  | 'UPDATE_BOY'
  | 'DELETE_BOY'
  | 'REVERT_ACTION'
  | 'UPDATE_SETTINGS'
  | 'GENERATE_INVITE_CODE'  // Not CREATE_INVITE_CODE
  | 'USE_INVITE_CODE'
  | 'REVOKE_INVITE_CODE'
  | 'UPDATE_INVITE_CODE'
  | 'UPDATE_USER_ROLE'
  | 'DELETE_USER_ROLE'
  | 'CLEAR_AUDIT_LOGS'
  | 'CLEAR_USED_REVOKED_INVITE_CODES';

// Enable exhaustiveness checking
function handleAction(action: AuditLogActionType): string {
  switch (action) {
    case 'CREATE_BOY':
      return 'Created a boy';
    case 'GENERATE_INVITE_CODE':
      return 'Generated invite code';
    // ... other cases ...
    default:
      const _exhaustiveCheck: never = action;
      return _exhaustiveCheck;
  }
}
```

### Anti-Patterns to Avoid
- **SET LOCAL search_path**: Only affects current transaction; does not harden function definition
- **Implicit search_path**: Leaving search_path default (`$user, public`) is vulnerable to CVE-2018-1058
- **Client-side service_role keys**: Never use service_role in browser code; it bypasses RLS
- **String literal action types**: Always reference the defined type, not arbitrary strings

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Test runner | Custom scripts with npx tsc | Vitest | Faster, watch mode, coverage, IDE integration |
| Mocking Supabase | Manual mock objects | vi.mock() + factory functions | Standard Vitest mocking, handles edge cases |
| search_path protection | Custom schema validation | SET search_path at function level | PostgreSQL built-in, CVE-proven |
| Service role detection | Manual grep + analysis | Automated secret scanner patterns | Pre-built patterns for common key formats |

**Key insight:** Supabase provides built-in security advisors that flag unsecured search_path in functions. Rely on database-level enforcement rather than building custom validation middleware.

## Common Pitfalls

### Pitfall 1: search_path Not Hardened in Security Functions
**What goes wrong:** SECURITY DEFINER functions without explicit `search_path` inherit the caller's search_path, allowing privilege escalation via object creation in public schemas.
**Why it happens:** Default PostgreSQL behavior uses `$user, public` search_path; malicious users can create malicious objects in schemas they can write to.
**How to avoid:** Always include `SET search_path = public` (or stricter) in SECURITY DEFINER function definitions.
**Warning signs:** Supabase Database Advisor warning "0011_function_search_path_mutable"

### Pitfall 2: Service Role Key in Client Code
**What goes wrong:** Service role key bypasses all RLS policies; if exposed in client bundle, anyone can perform any database operation.
**Why it happens:** Developers may accidentally commit service role key to `.env` file with VITE_ prefix, or hardcode it for debugging.
**How to avoid:** 1) Scan for patterns: `service_role`, `SERVICE_ROLE`, `serviceRole` 2) Never use `VITE_SERVICE_ROLE_*` variables 3) Audit imports to services files only.
**Warning signs:** Browser network tab shows service_role in requests, bundle contains service_role string.

### Pitfall 3: RLS Policy Without Identity Verification
**What goes wrong:** RLS policies that check `auth.uid()` are correct, but INSERT policies may allow spoofing `user_id` fields.
**Why it happens:** Policy may validate row existence but not enforce that `user_id` matches authenticated user.
**How to avoid:** Include `user_id = auth.uid()` check in INSERT policy USING/WITH CHECK clauses.
**Warning signs:** Users can create audit logs claiming to be someone else.

### Pitfall 4: Type Mismatches in AuditLogActionType
**What goes wrong:** Code uses `'CREATE_INVITE_CODE'` but type defines `'GENERATE_INVITE_CODE'`, causing TypeScript errors.
**Why it happens:** Type was renamed but not all usages were updated; lack of exhaustiveness checking.
**How to avoid:** 1) Use discriminated union exhaustiveness pattern 2) Run `npx tsc -noEmit` before commits.
**Warning signs:** TypeScript compilation errors, audit log icons not displaying for certain actions.

### Pitfall 5: Vitest Not Picking Up Vite Config
**What goes wrong:** Tests fail to run or can't resolve modules, path aliases don't work.
**Why it happens:** Missing `/// <reference types="vitest/config" />` directive or conflicting test config files.
**How to avoid:** Add reference comment, avoid creating separate `vitest.config.ts` unless necessary.
**Warning signs:** "Cannot find module" errors in test files, aliases like `@/` not resolving.

## Code Examples

Verified patterns from official sources:

### Vitest Basic Configuration
```typescript
// Source: https://vitest.dev/guide/
// File: vite.config.ts

/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    // Add test configuration here
  },
});
```

### Running Tests
```bash
# Source: https://vitest.dev/guide/
# Add to package.json scripts:
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

### PostgreSQL Security Function with Hardened search_path
```sql
-- Source: https://supabase.com/docs/guides/database/database-advisors
-- Pattern: lint 0011_function_search_path_mutable

-- CORRECT: Hardened search_path
CREATE OR REPLACE FUNCTION public.get_user_role(user_uid text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE uid = user_uid LIMIT 1;
$$;

-- INCORRECT: Vulnerable to search_path attacks
CREATE OR REPLACE FUNCTION public.get_user_role_vulnerable(user_uid text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
-- Missing: SET search_path = public
AS $$
  SELECT role FROM user_roles WHERE uid = user_uid LIMIT 1;
$$;
```

### RLS Policy with Identity Verification
```sql
-- Pattern for audit_logs_insert policy
CREATE POLICY audit_logs_insert_authenticated
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND user_id = auth.uid()::text  -- Prevent spoofing
  AND created_at > NOW() - INTERVAL '5 minutes'  -- Reasonable timestamp check
);
```

### Vitest Test Example for Service Function
```typescript
// Source: Vitest documentation
// File: tests/unit/services/db.test.ts

import { describe, it, expect, vi } from 'vitest';
import { fetchUserRole } from '@/services/db';

// Mock the Supabase client
vi.mock('@/services/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('fetchUserRole', () => {
  it('should return role for valid user', async () => {
    // Test implementation
  });

  it('should return null for non-existent user', async () => {
    // Test implementation
  });
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Jest with separate config | Vitest with shared Vite config | 2023+ | Faster tests, better TypeScript, unified configuration |
| Default search_path | Explicit SET search_path | Post-CVE-2018-1058 | Mandatory for security functions |
| Type assertions | Exhaustiveness checking | TypeScript 2.x+ | Catch missing union cases at compile time |
| Password strength only | Leaked password protection (HaveIBeenPwned) | 2025 | Supabase Auth built-in integration |

**Deprecated/outdated:**
- Implicit search_path in SECURITY DEFINER functions: CVE-2018-1058 vulnerability; must use explicit `SET search_path`
- Manual test runners: Vitest provides superior DX for Vite projects
- Anon-key for admin operations: Use service role (server-side only) for privileged operations

## Open Questions

### Security Functions Need Creation
**What we know:** The requirements mention hardening search_path on `get_user_role`, `can_access_section`, and `can_access_audit_logs` functions. These functions do not yet exist in migrations - only `current_app_role()` is documented in `docs/10-database-security-model.md`.

**What's unclear:**
1. Should Phase 1 create these three security functions, or are they documented elsewhere?
2. The docs reference `current_app_role()` as the canonical role resolution function - is this a replacement for the three named functions?

**Recommendation:** Phase 1 should create the three security functions (`get_user_role`, `can_access_section`, `can_access_audit_logs`) following the pattern documented for `current_app_role()`, all with `SECURITY DEFINER` and `SET search_path = public`. Clarify whether `current_app_role()` is a helper or replacement.

### TypeScript Strict Mode
**What we know:** Current `tsconfig.json` lacks strict type checking options like `strict`, `noImplicitReturns`, `noFallthroughCasesInSwitch`.

**What's unclear:** Should enabling strict mode be part of Phase 1 (catches the type mismatch), or deferred to a code quality phase?

**Recommendation:** Enable `noFallthroughCasesInSwitch` in Phase 1 to catch the exhaustiveness bug for `AuditLogActionType`. Defer full strict mode to Phase 3 (code quality) to avoid scope creep.

### Supabase Dashboard Configuration for Leaked Passwords
**What we know:** Leaked password protection is configured in Supabase Dashboard under Authentication > Settings > Password Security.

**What's unclear:** Can this be enabled via migration/CLI, or is it dashboard-only?

**Recommendation:** This is a manual configuration step. Document as a verification step in the phase; cannot be automated via migration.

## Sources

### Primary (HIGH confidence)
- [Vitest Getting Started](https://vitest.dev/guide/) - Official Vitest documentation, verified configuration patterns
- [Password Security | Supabase Docs](https://supabase.com/docs/guides/auth/password-security) - Official Supabase documentation, verified leaked password protection feature
- [PostgreSQL CVE-2018-1058 Guide](https://wiki.postgresql.org/wiki/A_Guide_to_CVE-2018-1058%3A_Protect_Your_Search_Path) - Official PostgreSQL documentation on search_path security

### Secondary (MEDIUM confidence)
- [Supabase Database Advisors: search_path](https://supabase.com/docs/guides/database/database-advisors) - Verified Supabase lint rule 0011_function_search_path_mutable
- [Abusing SECURITY DEFINER functions](https://www.cybertec-postgresql.com/en/abusing-security-definer-functions/) - Industry best practices for PostgreSQL security functions

### Tertiary (LOW confidence)
- WebSearch results for Vitest + Supabase testing patterns - Community approaches, need validation in project context

## Metadata

**Confidence breakdown:**
- Standard stack (Vitest): HIGH - Official Vitest docs, clear standard for Vite projects
- Architecture patterns (search_path hardening): HIGH - CVE-2018-1058 is well-documented, Supabase has built-in linting
- Pitfalls (service role exposure): HIGH - Well-understood security principle, clear patterns to follow
- Pitfalls (type mismatch): HIGH - Visible in codebase, clear fix path
- RLS policy patterns: MEDIUM - Need to verify exact policy structure for audit_logs_insert against Supabase project state
- Security functions existence: LOW - Functions referenced in requirements but not found in migrations

**Research date:** 2026-01-22
**Valid until:** 90 days (PostgreSQL patterns stable; Vitest APIs mature; Supabase Auth features stable)

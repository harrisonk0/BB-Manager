# Architecture Patterns: Secure Supabase + React Apps

**Domain:** Boys' Brigade Member Management App (BB-Manager)
**Researched:** 2026-01-21
**Mode:** Security Architecture Remediation
**Overall Confidence:** HIGH

## Executive Summary

BB-Manager currently uses a client-side React SPA with direct Supabase client access. The primary security issue is **Row Level Security (RLS) not being enforced**, with authorization checks implemented in client-side code only. The role fetching pattern (`supabase.from('user_roles').select()`) is vulnerable because the database does not enforce access controls.

**Recommended Architecture:** A "Defense in Depth" approach where RLS policies at the database layer provide the primary security boundary, with the React service layer providing UX-driven validation and a clean API abstraction. The client-side should never be trusted for authorization decisions.

### Key Architectural Shift Required

| Aspect | Current State | Target State |
|--------|---------------|--------------|
| Authorization | Client-side checks only | RLS policies as primary enforcement |
| Role Resolution | Direct `user_roles` table queries | Database function (`current_app_role()`) |
| Sensitive Data | Direct table access | Views/RPCs with column-level security |
| Service Role Key | (Not exposed, but risk exists) | Server-side only (Edge Functions for admin ops) |

---

## 1. Client vs Server-Side Data Operations

### 1.1 Current Problem: The "Trusted Client" Anti-Pattern

**Current Architecture Flow:**
```
React Component
      |
      v
Custom Hook (useAuthAndRole)
      |
      v
Service Layer (db.ts)
      |
      v
Supabase Client (anon key) --[NO RLS]--> Database
```

**Security Issue:** The `user_roles` table is queried directly via `supabase.from('user_roles').select()` in `useAuthAndRole.ts:29`. Without RLS enabled, any authenticated user can query all roles.

### 1.2 Recommended Architecture: Database-First Security

**Target Architecture Flow:**
```
React Component
      |
      v
Custom Hook (useAuthAndRole)
      |
      v
Service Layer (db.ts) --[now RPC calls]--> Supabase Client (anon key)
                                                    |
                                                    v
                                    Database --[RLS ENFORCED]--> Tables
```

**Key Principle:** Client-side operations use the `anon` key for all user-facing data. RLS policies enforce what each authenticated user can access based on their role.

### 1.3 When to Use Client vs Server

| Operation Type | Client (anon key + RLS) | Server (service_role) |
|----------------|-------------------------|----------------------|
| User's own data reading | YES | NO |
| CRUD operations within role scope | YES | NO |
| Invite code validation | YES (via RPC) | NO |
| Invite claim/role assignment | YES (via RPC) | NO |
| Cross-user audit log reading | YES (via view) | NO |
| Admin revert data access | YES (via admin-only RPC) | NO |
| Scheduled audit log cleanup | NO | YES (cron/Edge Function) |
| Bulk administrative operations | NO | YES (Edge Function) |

### 1.4 Service Layer Pattern: RPCs Over Direct Table Access

**Anti-Pattern (Current):**
```typescript
// DON'T: Direct table access without RLS
const { data } = await supabase
  .from('user_roles')
  .select('role')
  .eq('uid', user.id)
  .single();
```

**Recommended Pattern:**
```typescript
// DO: Use database function with SECURITY DEFINER
// This function runs with elevated privileges but explicitly checks auth.uid()
const { data } = await supabase.rpc('get_my_role');
```

**Database Function (with RLS):**
```sql
create function public.get_my_role()
returns table (role text)
language sql
stable
security definer
set search_path = public
as $$
  select ur.role
  from public.user_roles ur
  where ur.uid = auth.uid()::text
    -- RLS on user_roles would also enforce this
$$;

grant execute on function public.get_my_role() to authenticated;
```

### 1.5 Service Role Key: Server-Side Only

**Critical Rule:** The `service_role` key must **never** be shipped client-side. It bypasses RLS and grants full database access.

**When to use service_role:**
- Scheduled jobs (e.g., audit log retention cleanup)
- Administrative operations via Edge Functions
- Data migrations and bulk operations
- Emergency break-glass access

**Example: Edge Function for Admin Operations**
```typescript
// supabase/functions/admin-revert-data/index.ts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, // Server-side only
  { auth: { persistSession: false } }
)

Deno.serve(async (req) => {
  // Verify the requestor has admin rights via JWT
  const authHeader = req.headers.get('Authorization')!
  const { data: { user }, error } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))

  if (!user || error) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Check admin role via database function (RLS enforced)
  const { data: roleData } = await supabase.rpc('current_app_role')
  if (roleData !== 'admin') {
    return new Response('Forbidden', { status: 403 })
  }

  // Perform admin operation with service_role privileges
  // ...
})
```

---

## 2. Authentication Flow Patterns

### 2.1 Current Authentication Flow

**Current Flow (useAuthAndRole.ts):**
```
1. App initializes
2. getCurrentUser() checks session
3. loadUserRole() queries user_roles directly
4. State updates with user + role
```

**Problem:** Step 3 bypasses database-enforced security.

### 2.2 Recommended Authentication Flow

**Phase 1: Initial Session Setup**
```
1. App initializes
2. supabase.auth.getSession() or auth.onAuthStateChange()
3. Once authenticated, call RPC: get_my_role()
4. If no role, show "contact administrator" message
5. State updates with user + role (from trusted source)
```

**Phase 2: Invite-Based Signup (New Flow)**
```
1. User enters invite code
2. Call RPC: validate_invite_code(code)
3. Supabase Auth signup (email/password)
4. On success, call RPC: claim_invite_code(code)
5. Database atomically: marks invite used + inserts user_roles row
6. Role now available via get_my_role()
```

**Key Security Improvements:**
- Invite validation happens server-side (via RPC) before revealing role info
- Role assignment is atomic and database-enforced
- No client-side trust for authorization decisions

### 2.3 Auth State Management Pattern

**Recommended Hook Structure:**
```typescript
export const useAuthAndRole = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  useEffect(() => {
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);

        if (session?.user) {
          // Fetch role via RPC (not direct table access)
          const { data } = await supabase.rpc('get_my_role');
          setUserRole(data?.role);
        } else {
          setUserRole(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return { session, userRole };
};
```

### 2.4 Server-Side Auth Verification (for Future SSR)

If migrating to Next.js or adding SSR, use `@supabase/ssr`:

```typescript
// Server-side auth verification
const { data: { user } } = await supabase.auth.getUser();

// Always verify on server for sensitive operations
// getSession() is insecure on server - use getUser() instead
```

---

## 3. Service Layer Patterns for Security

### 3.1 Service Layer Responsibilities

The service layer should:
1. **Abstract database operations** - Provide clean API for hooks
2. **Handle RPC calls** - Not direct table access
3. **Provide UX validation** - Input validation, business rules
4. **NOT enforce authorization** - That's RLS's job

### 3.2 Service Layer Organization

**Recommended Structure:**
```
services/
├── supabaseClient.ts      # Singleton anon client (existing)
├── supabaseAuth.ts        # Auth helpers (existing)
├── db/                     # Domain-specific modules
│   ├── index.ts
│   ├── boys.ts            # Boy CRUD via RPCs
│   ├── roles.ts           # Role management via RPCs
│   ├── invites.ts         # Invite operations via RPCs
│   ├── settings.ts        # Settings via RPCs
│   └── audit.ts           # Audit log writes via RPCs
└── admin/                  # Admin-only operations
    ├── client.ts          # Service role client (server-only)
    └── operations.ts      # Admin bulk operations
```

### 3.3 RPC-Based Service Pattern

**Before (Direct Access - Insecure without RLS):**
```typescript
export const fetchUserRole = async (uid: string): Promise<UserRole | null> => {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('uid', uid)
    .single();

  return data?.role as UserRole;
};
```

**After (RPC with Security):**
```typescript
export const fetchMyRole = async (): Promise<UserRole | null> => {
  const { data, error } = await supabase.rpc('get_my_role');

  if (error) {
    // Handle specific error cases
    if (error.code === '42501') { // permission_denied
      return null; // No role assigned
    }
    throw new Error(error.message);
  }

  return data as UserRole;
};
```

**Database Function:**
```sql
create function public.get_my_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.user_roles where uid = auth.uid()::text
$$;

-- RLS policy on user_roles ensures users can only read their own role
create policy user_roles_select_self
on public.user_roles
for select
to authenticated
using (uid = auth.uid()::text);
```

### 3.4 Typed RPC Calls

**Generate TypeScript types from database schema:**
```bash
supabase gen types typescript --project-id <project-id> > src/types/database.ts
```

**Use typed RPC signatures:**
```typescript
import { Database } from '../types/database';

type RpcFunction = Database['public']['Functions'];

// Type-safe RPC call
const { data } = await supabase.rpc('get_my_role');
```

---

## 4. Component Boundaries for Sensitive Data

### 4.1 Component Security Zones

**Zone 1: Public (No Auth Required)**
- Landing page
- Login/signup forms
- Invite code validation

**Zone 2: Authenticated (Any Role)**
- Dashboard (role-aware rendering)
- Profile display

**Zone 3: Officer+**
- Boy CRUD
- Marks entry
- Section-specific views

**Zone 4: Captain+**
- Settings management
- Officer role management
- Invite code generation (Officers only)
- Audit log viewing (redacted)

**Zone 5: Admin Only**
- Captain role management
- Audit log revert data
- Full audit log access

### 4.2 Boundary Enforcement Pattern

**Route-Level Guards:**
```typescript
const ProtectedRoute = ({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}) => {
  const { userRole } = useAuthAndRole();

  if (!userRole || !allowedRoles.includes(userRole)) {
    return <div>Access Denied</div>;
  }

  return <>{children}</>;
};
```

**Component-Level Guards:**
```typescript
// In component
const { userRole } = useAuthAndRole();

if (userRole !== 'admin') {
  return null; // Don't render admin UI
}
```

**Critical:** These client-side guards are for UX only. RLS must enforce the actual security.

### 4.3 Sensitive Data Component Patterns

**Audit Log Viewing (Captain+ but Admin-only revert_data):**

```typescript
// Component uses RPC to get redacted audit logs
const { data: auditLogs } = useQuery({
  queryKey: ['audit-logs'],
  queryFn: () => supabase.from('audit_logs_read').select()
  // This view excludes revert_data column
});

// Admin component fetches revert data separately
const { data: revertData } = useQuery({
  queryKey: ['revert-data', logId],
  queryFn: () => supabase.rpc('audit_log_revert_data', { log_id: logId }),
  enabled: userRole === 'admin' // Only fetch for admins
});
```

### 4.4 Data Flow Boundaries

**Read Flow:**
```
Component
   | (request data)
   v
Hook
   | (call service)
   v
Service Layer
   | (RPC call)
   v
Supabase Client (anon key)
   | (with JWT)
   v
Database
   | (RLS policy check)
   v
Data returned
```

**Write Flow:**
```
Component
   | (user action)
   v
Hook
   | (call service)
   v
Service Layer (validation + RPC call)
   | (insert/update/delete via RPC)
   v
Supabase Client (anon key)
   | (with JWT)
   v
Database
   | (RLS policy check + trigger for audit log)
   v
Result returned
```

---

## 5. RLS Integration Throughout the Stack

### 5.1 RLS as Primary Security Boundary

**Principle:** RLS policies are the **single source of truth** for authorization. Client checks are purely UX enhancements.

**Current State:** RLS policies are documented in `docs/10-database-security-model.md` but **not enabled**.

### 5.2 Role Resolution Function

**Critical Helper (from security model doc):**
```sql
create function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select ur.role
  from public.user_roles ur
  where ur.uid = auth.uid()::text
  limit 1
$$;
```

**Usage in RLS Policies:**
```sql
create policy boys_select_officer_plus
on public.boys
for select
to authenticated
using (public.current_app_role() in ('officer','captain','admin'));
```

### 5.3 Per-Table RLS Policies Summary

**From `docs/10-database-security-model.md`:**

| Table | Select | Insert | Update | Delete | Notes |
|-------|--------|--------|--------|--------|-------|
| `boys` | Officer+ | Officer+ | Officer+ | Officer+ | Section not a security boundary |
| `settings` | Officer+ | Captain+ | Captain+ | - | No delete policy |
| `user_roles` | Self or manage | - | Per hierarchy | Per hierarchy | No client inserts |
| `invite_codes` | Captain+/Admin | Captain+/Admin | Captain+/Admin | - | Captain: Officers only |
| `audit_logs` | Write only for app roles | Officer+ | - | - | Read via view |

### 5.4 Special Case: Column-Level Security

**Problem:** `audit_logs.revert_data` must be admin-only, but Postgres RLS cannot restrict individual columns when using the `authenticated` role.

**Solution:**
1. Revoke direct SELECT on `audit_logs` from `authenticated`
2. Create view `audit_logs_read` excluding `revert_data`
3. Create admin-only RPC `audit_log_revert_data(log_id)`

```sql
-- Step 1: Revoke direct access
revoke select on table public.audit_logs from authenticated;

-- Step 2: Create redacted view
create view public.audit_logs_read as
select
  id, section, timestamp, user_email,
  action_type, description, reverted_log_id, created_at
from public.audit_logs
where public.current_app_role() in ('captain','admin');

grant select on table public.audit_logs_read to authenticated;

-- Step 3: Admin-only RPC
create function public.audit_log_revert_data(log_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select al.revert_data
  from public.audit_logs al
  where al.id = log_id
    and public.current_app_role() = 'admin'
$$;

grant execute on function public.audit_log_revert_data(uuid) to authenticated;
```

---

## 6. Remediation Order

Based on dependencies and risk, the recommended remediation sequence:

### Phase 1: Database Security Foundation (Highest Priority)

**Why First:** RLS is the foundation. Without it, all other security is cosmetic.

1. **Create helper functions**
   - `public.current_app_role()`
   - Add unique index for single captain
   - `public.validate_invite_code()`
   - `public.claim_invite_code()`

2. **Create RLS policies** (not enabled yet)
   - All policies from `docs/10-database-security-model.md`
   - Create `audit_logs_read` view
   - Create `audit_log_revert_data()` RPC

3. **Update service layer to use RPCs**
   - Change direct table access to RPC calls
   - Update `useAuthAndRole` to use `get_my_role()` RPC
   - Update invite flow to use `validate_invite_code()` and `claim_invite_code()`

4. **Test in staging environment**
   - Verify all operations work with RLS policies disabled
   - Test with each role type

### Phase 2: Enable RLS (Critical Threshold)

**Why Second:** This is the point of no return. Once RLS is enabled, the database enforces security.

1. **Enable RLS on all tables**
   - `ALTER TABLE public.boys ENABLE ROW LEVEL SECURITY;`
   - Repeat for all application tables

2. **Tighten GRANTs**
   - Revoke broad permissions from `anon` and `authenticated`
   - Apply minimal GRANTs from security model

3. **Deploy app changes first**
   - Ensure service layer RPC calls are in production
   - Then apply database migrations

4. **Monitor for errors**
   - Watch for `permission_denied` errors
   - Have break-glass recovery ready

### Phase 3: Security Hardening

1. **Add scheduled job for audit log retention**
   - Supabase Edge Function with cron
   - Uses service_role key (server-side only)

2. **Add admin operations via Edge Functions**
   - Any operation requiring service_role
   - Proper JWT verification before using elevated privileges

3. **Add security monitoring**
   - Log all authorization failures
   - Alert on repeated permission denied errors

### Phase 4: Validation & Testing

1. **End-to-end testing per role**
   - Officer: CRUD boys, marks; no settings/roles/audit
   - Captain: Officer capabilities + settings + officer roles + audit (redacted)
   - Admin: All capabilities including revert data

2. **Penetration testing**
   - Attempt to access data outside role scope
   - Test invite code enumeration prevention

3. **Document break-glass procedures**
   - How to disable RLS in emergency
   - Service role key usage for recovery

---

## 7. Security Boundary Summary

### 7.1 Layered Security Model

```
+-----------------------------------+
|         Client-Side UI            |
|    (Component guards for UX)      |
+-----------------------------------+
           | (never trust alone)
           v
+-----------------------------------+
|         Service Layer             |
|    (Input validation, RPC calls)  |
+-----------------------------------+
           | (anon key + JWT)
           v
+-----------------------------------+
|      Supabase PostgREST API       |
|     (adds auth.uid() context)     |
+-----------------------------------+
           | (authenticated role)
           v
+-----------------------------------+
|         Database RLS              |
|    (PRIMARY SECURITY BOUNDARY)    |
+-----------------------------------+
           | (service_role only)
           v
+-----------------------------------+
|      Raw Data (Tables)            |
+-----------------------------------+
```

### 7.2 Key Security Principles

1. **Never trust the client** - All authorization must be enforceable at the database layer
2. **RLS is the source of truth** - Client checks are UX only, not security
3. **Service role stays server-side** - Never ship to client, use only in Edge Functions
4. **RPCs over direct access** - Provides audit trail and controlled interface
5. **Principle of least privilege** - Each role gets minimum required access

### 7.3 What Changes and What Stays

**Stays the Same:**
- React component structure
- Service layer pattern (db.ts)
- Hook-based state management
- Auth flow (Supabase Auth)

**Changes:**
- Service layer uses RPCs instead of direct table access
- `useAuthAndRole` calls `get_my_role()` RPC
- Invite flow uses database functions
- RLS enabled on all tables
- GRANTs tightened to minimum

**Adds:**
- Edge Functions for admin operations
- Scheduled job for audit log cleanup
- Security monitoring and alerting

---

## 8. Sources

- [Supabase JavaScript API Reference](https://supabase.com/docs/reference/javascript/auth-client-installation) - Official auth client documentation (HIGH confidence)
- [Supabase Security 2025 Retro](https://supabase.com/blog/supabase-security-2025-retro) - Official security update (HIGH confidence)
- [CVE-2025-48757 Analysis](https://mattpalmer.io/posts/2025/05/CVE-2025-48757/) - RLS vulnerability details (MEDIUM confidence)
- [Supabase Service & Hooks Architecture Guide](https://javascript.plainenglish.io/the-supabase-services-hooks-guide-that-will-transform-your-data-layer-architecture-301b79a8c411) - Service layer patterns (MEDIUM confidence)
- [Harden Your Supabase: Real-World Pentests](https://www.pentestly.io/blog/supabase-security-best-practices-2025-guide) - Security best practices (MEDIUM confidence)
- [Supabase Best Security Practices](https://www.supadex.app/blog/best-security-practices-in-supabase-a-comprehensive-guide) - Security guide (MEDIUM confidence)
- [Defense in Depth for MCP](https://supabase.com/blog/defense-in-depth-mcp) - RLS clarification (HIGH confidence)
- [Understanding API Keys](https://supabase.com/docs/guides/api/api-keys) - Key management (HIGH confidence)

### Project-Specific Sources

- `.planning/codebase/ARCHITECTURE.md` - Current architecture analysis
- `.planning/codebase/CONCERNS.md` - Security concern catalog
- `docs/10-database-security-model.md` - Comprehensive RLS policy design (HIGH confidence)
- `hooks/useAuthAndRole.ts` - Current auth/role implementation
- `services/db.ts` - Current service layer patterns

---

*Architecture research: 2026-01-21*
*Focus: Secure Supabase + React architecture for BB-Manager remediation*

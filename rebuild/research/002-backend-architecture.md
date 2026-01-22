# Backend Architecture Research

**Researched:** 2026-01-22
**Domain:** Database and Authentication Architecture
**Confidence:** MEDIUM

## Summary

This research evaluates backend architecture options for the BB-Manager rebuild, focusing on the decision between staying with Supabase or migrating to a self-hosted solution. The analysis considers UK GDPR compliance for children's data, resource constraints (Raspberry Pi/VPS hosting), development complexity, and long-term maintainability.

**Primary recommendation:** Stay with Supabase hosted service for v1 rebuild. Consider self-hosted PostgreSQL + Lucia Auth for v2 only if hosting costs or privacy concerns become blockers.

**Key findings:**
- Supabase provides comprehensive security (RLS, auth) that would require significant effort to replicate
- Self-hosting on Raspberry Pi has compatibility issues and resource constraints
- UK GDPR requirements apply equally to hosted and self-hosted solutions
- Authentication libraries (Lucia, Auth.js) add significant development overhead
- Migration path from Supabase to self-hosted is straightforward but feature loss is likely

---

## Standard Stack Comparison

### Option 1: Stay with Supabase (Recommended)

| Component | Version | Purpose | Why Standard |
|-----------|---------|---------|--------------|
| Supabase Postgres | Latest | Data persistence | Managed service with RLS, backups, auto-scaling |
| Supabase Auth | - | Email/password auth | Battle-tested, secure session management |
| @supabase/supabase-js | 2.48.0+ | TypeScript client | Type-safe queries, real-time support |
| Supabase RLS | - | Authorization | Database-level security enforcement |

**Installation:**
```bash
npm install @supabase/supabase-js
```

**Pros:**
- Auth handled (signup, signin, password reset, sessions)
- RLS security already implemented and battle-tested
- Admin UI for database management
- Automatic backups and updates
- Real-time capabilities available if needed
- Low development overhead

**Cons:**
- Vendor lock-in (Supabase-specific RLS functions)
- Hosted service (data stored on Supabase servers)
- Costs at scale (Free tier: 500MB, 1GB bandwidth/month)
- Privacy concerns for student data on third-party servers

### Option 2: Self-Hosted PostgreSQL + Lucia Auth

| Component | Version | Purpose | Why Standard |
|-----------|---------|---------|--------------|
| PostgreSQL | 15+ | Data persistence | Industry-standard, mature, reliable |
| Lucia | Latest | Authentication | Modern, framework-agnostic, TypeScript-first |
| Drizzle ORM | Latest | Database access | Lightweight, SQL-transparent, good DX |
| pg_dump/pg_restore | - | Backup/restore | Native PostgreSQL tools |

**Installation:**
```bash
npm install lucia @lucia-auth/adapter-postgresql drizzle-orm postgres
npm install -D drizzle-kit
```

**Pros:**
- Full control over data location (UK GDPR compliance)
- No vendor lock-in
- Runs on own hardware (Raspberry Pi, VPS)
- No ongoing costs (only hosting)
- Can optimize for specific use case

**Cons:**
- Must implement auth manually (signup, signin, password reset, sessions)
- Must manage backups, updates, security patches
- Must implement RLS equivalent at application layer
- No admin UI (must use pgAdmin, direct SQL, or build custom UI)
- Higher development overhead
- Raspberry Pi compatibility issues reported
- Resource requirements: 4-8GB RAM recommended

### Option 3: Supabase Self-Hosted (Docker)

| Component | Version | Purpose | Why Standard |
|-----------|---------|---------|--------------|
| Supabase Docker | Latest | Full stack | Auth, Postgres, Realtime, Storage in one |
| Docker Compose | - | Orchestration | Standard container management |

**Installation:**
```bash
git clone https://github.com/supabase/supabase
cd supabase/docker
docker compose up
```

**Pros:**
- Get all Supabase features (Auth, RLS, Realtime, Storage, admin UI)
- Data sovereignty (host on own hardware)
- No vendor lock-in (self-hosted)
- Familiar development patterns from current app

**Cons:**
- **Raspberry Pi 5 compatibility issues reported** (ARM vs x86_64)
- High resource requirements (8GB RAM recommended for development)
- Must manage updates, backups, security patches
- More complex than pure PostgreSQL
- Docker overhead on resource-constrained hardware

---

## Architecture Patterns

### Recommended Architecture: Stay with Supabase

```
┌─────────────────────────────────────────────────────────┐
│                    Static Hosting                        │
│  (Vercel, Netlify, GitHub Pages, or custom VPS)          │
│                                                          │
│  ┌────────────────────────────────────────────────┐     │
│  │  Browser (React SPA)                           │     │
│  │  - Components                                   │     │
│  │  - Custom Hooks                                 │     │
│  │  - Services Layer                               │     │
│  └────────────────────────────────────────────────┘     │
└───────────────┬─────────────────────────────────────────┘
                │ HTTPS
                ▼
┌─────────────────────────────────────────────────────────┐
│                   Supabase Cloud                         │
│  ┌──────────────┐  ┌────────────────────────────────┐  │
│  │ Supabase     │  │  Supabase Postgres              │  │
│  │ Auth         │  │  - RLS policies (role-based)    │  │
│  │ - Sessions   │  │  - Security functions           │  │
│  │ - Email/PW   │  │  - Automatic backups            │  │
│  │ - Reset      │  │  - Managed updates              │  │
│  └──────────────┘  └────────────────────────────────┘  │
│                         ▲                                │
│                         │ Supabase Admin UI              │
└─────────────────────────┴────────────────────────────────┘
```

### Alternative Architecture: Self-Hosted PostgreSQL + Lucia

```
┌─────────────────────────────────────────────────────────┐
│              Self-Hosted VPS / Raspberry Pi              │
│                                                          │
│  ┌────────────────────────────────────────────────┐     │
│  │  Node.js Backend (Optional API Layer)           │     │
│  │  - Lucia Auth middleware                        │     │
│  │  - Authorization checks                         │     │
│  │  - API endpoints (if needed)                    │     │
│  └────────────────────────────────────────────────┘     │
│                          │                                │
│  ┌──────────────────────┴──────────────────────────┐    │
│  │  PostgreSQL 15+                                 │    │
│  │  - Tables: boys, settings, user_roles, etc.     │    │
│  │  - Application-level auth (no RLS)              │    │
│  │  - pg_dump backups to S3/local storage          │    │
│  └─────────────────────────────────────────────────┘    │
│                                                          │
│  ┌────────────────────────────────────────────────┐     │
│  │  Static File Server (serve, nginx, or Apache)   │     │
│  │  - React SPA build output                      │     │
│  └────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────┘
         ▲
         │ HTTPS
         │
┌────────┴─────────────────────────────────────────────────┐
│  Browser (React SPA)                                      │
│  - Direct PostgreSQL connection via Drizzle              │
│  - Or API calls to Node.js backend                       │
└──────────────────────────────────────────────────────────┘
```

### Security Architecture Comparison

#### Supabase (Current - RLS-Based)

**Enforcement Point:** Database layer (authoritative)

```sql
-- Example: RLS Policy
CREATE POLICY boys_select_officer_plus
ON public.boys
FOR SELECT
TO authenticated
USING (
  public.current_app_role() IN ('officer', 'captain', 'admin')
);
```

**Security benefits:**
- Client-side checks can be bypassed, database enforces security
- Policies are centralized and testable
- Defense in depth: app + database layers
- Harder to introduce security bugs

**Implementation complexity:** LOW (already done)

#### Self-Hosted (Application-Level Auth)

**Enforcement Point:** Application layer (must be perfect)

```typescript
// Example: Application-level check
export async function getBoys(section: string, userRole: string) {
  // MUST check authorization before query
  if (!['officer', 'captain', 'admin'].includes(userRole)) {
    throw new Error('Unauthorized');
  }

  // Only THEN query database
  return db.select().from(boys).where(eq(boys.section, section));
}
```

**Security risks:**
- Any bug in auth check = data leak
- Must audit every data access point
- No database-level backstop
- Higher testing burden

**Implementation complexity:** HIGH (must implement perfectly)

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| **Password hashing** | Custom bcrypt/argon2 | Lucia (built-in) | Proper salt, timing attack protection, proven implementation |
| **Session management** | Custom JWT/cookie handling | Lucia (built-in) | CSRF protection, secure defaults, rotation |
| **Authorization framework** | Custom role checks | Supabase RLS (if using Supabase) | Database-level enforcement, centralized policies |
| **Database migrations** | Custom SQL scripts | Drizzle Kit or Supabase migrations | Version control, rollback, type safety |
| **Backup automation** | Custom cron scripts | Databasus or pg_back_web | S3 integration, scheduling, web UI |
| **Password reset** | Custom email flows | Lucia or Supabase Auth | Secure token generation, expiration handling |

**Key insight:** Authentication and authorization are security-critical. Custom implementations are a major source of vulnerabilities. Use battle-tested libraries.

---

## Common Pitfalls

### Pitfall 1: Underestimating Auth Complexity

**What goes wrong:**
- "We'll just add a password field and a login form"
- 3 months later: still handling password reset edge cases, session expiration, CSRF attacks

**Why it happens:**
- Auth looks simple (email + password)
- Edge cases are numerous and security-critical
- Standards change (password hashing algorithms, cookie security)

**How to avoid:**
- Use Supabase Auth or Lucia from day one
- Never build custom password hashing
- Never build custom session management

**Warning signs:**
- Writing custom JWT code
- Storing passwords as plain strings or simple hashes
- Manual cookie handling

### Pitfall 2: Confusing Client and Server Security

**What goes wrong:**
- "We check user role in the React component, so data is secure"
- User bypasses React and calls API directly → data leak

**Why it happens:**
- Client-side checks are for UX only
- Any client-side code can be bypassed
- Browser debugging tools expose all logic

**How to avoid:**
- **Supabase:** RLS policies enforce security at database level
- **Self-hosted:** All auth checks on server, never trust client
- Never rely on client-side checks for security

**Warning signs:**
- Authorization logic in React components
- "This page is admin-only" enforced by routing only
- No server-side verification of user identity

### Pitfall 3: Raspberry Pi Resource Constraints

**What goes wrong:**
- "We'll self-host on Raspberry Pi to save money"
- Docker crashes, OOM errors, slow queries, poor UX

**Why it happens:**
- Supabase Docker requires 8GB RAM for dev environment
- Raspberry Pi 5 has compatibility issues (ARM vs x86_64)
- PostgreSQL + Node.js + application needs significant resources

**How to avoid:**
- Test on target hardware early
- Monitor RAM usage during development
- Consider low-cost VPS instead ($5-10/month)
- Use pure PostgreSQL (not full Supabase Docker) if resource-constrained

**Warning signs:**
- Swap usage > 50%
- Container restarts due to OOM
- Query timeouts > 5 seconds

### Pitfall 4: Backup Neglect

**What goes wrong:**
- "We'll set up backups later"
- Hard drive fails, no backups, all data lost

**Why it happens:**
- Backups are invisible until needed
- Manual backups are easily forgotten
- Testing restores is tedious

**How to avoid:**
- **Supabase:** Automatic backups included
- **Self-hosted:** Set up automated backups from day one (Databasus, pg_back_web, or cron)
- Document restore procedure
- Test restore quarterly

**Warning signs:**
- No backup script in repository
- Last backup date unknown
- Never performed test restore

### Pitfall 5: UK GDPR Compliance Gaps

**What goes wrong:**
- "We're self-hosted, so we're GDPR-compliant"
- Missing parental consent, data subject rights, retention policies

**Why it happens:**
- GDPR is about process, not hosting location
- Children's data has additional requirements
- Compliance is ongoing, not one-time

**How to avoid:**
- **All options:** Implement Children's Code requirements
- Parental consent for under-13s
- Data retention policies (audit logs: 14 days)
- Data subject access requests (export user data)
- Document lawful basis for processing

**Warning signs:**
- No privacy policy
- No parental consent mechanism
- No data retention enforcement
- No way to export/delete user data on request

---

## Code Examples

### Supabase Auth (Current Pattern)

```typescript
// services/supabaseAuth.ts
import { supabase } from './supabaseClient';

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;
}
```

**Source:** Current BB-Manager implementation, [Supabase Auth Docs](https://supabase.com/docs/guides/auth)

### Lucia Auth with PostgreSQL

```typescript
// services/luciaAuth.ts
import { lucia } from "lucia";
import { postgres } from "@lucia-auth/adapter-postgresql";
import pg from "postgres";

const pool = pg("postgres://user:pass@localhost/db");

export const auth = lucia({
  adapter: postgres(pool, {
    user: "auth_user",
    session: "user_session",
    key: "user_key"
  }),
  sessionCookie: {
    expires: false
  }
});

// Sign up
export async function signUp(email: string, password: string) {
  const user = await auth.createUser({
    key: {
      providerId: "email",
      providerUserId: email,
      password
    },
    attributes: {
      email
    }
  });
  return user;
}

// Sign in
export async function signIn(email: string, password: string) {
  const key = await auth.useKey("email", email, password);
  const session = await auth.createSession(key.userId);
  return session;
}

// Middleware for protected routes
export async function validateRequest(request: Request) {
  const session = await auth.validateRequest(request);
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}
```

**Source:** [Lucia Documentation](https://lucia-auth.com/), [PostgreSQL Adapter Guide](https://lucia-auth.com/database-adapters/postgresql)

### Drizzle ORM (Self-Hosted Alternative)

```typescript
// services/db.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const client = postgres('postgres://user:pass@localhost/db');
export const db = drizzle(client, { schema });

// Type-safe queries
export async function getBoys(section: string) {
  return db.select()
    .from(schema.boys)
    .where(eq(schema.boys.section, section));
}

export async function createBoy(data: NewBoy) {
  return db.insert(schema.boys)
    .values(data)
    .returning();
}
```

**Source:** [Drizzle ORM Docs](https://orm.drizzle.team/)

### Application-Level Authorization (Self-Hosted Pattern)

```typescript
// services/authorization.ts
import { db } from './db';
import * as schema from './schema';

export async function requireRole(userId: string, requiredRoles: string[]) {
  const userRole = await db.query.userRoles.findFirst({
    where: eq(schema.userRoles.uid, userId)
  });

  if (!userRole || !requiredRoles.includes(userRole.role)) {
    throw new Error('Unauthorized');
  }

  return userRole;
}

// Example usage
export async function getAuditLogs(userId: string) {
  // MUST check authorization first
  await requireRole(userId, ['captain', 'admin']);

  // Only then query database
  return db.select().from(schema.auditLogs);
}
```

**Warning:** This pattern is vulnerable to bugs. If `requireRole` is not called consistently, data leaks occur.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Passport.js | Lucia / Auth.js | 2023-2024 | Simpler, TypeScript-first, fewer dependencies |
| Prisma | Drizzle ORM | 2024-2025 | Smaller bundle, more SQL control, better type inference |
| Custom auth | Supabase Auth / Lucia | 2022-2023 | Security best practices, no vendor lock-in (Lucia) |
| Application-level auth only | Defense in depth (app + RLS) | 2020+ | Database-level enforcement, harder to bypass |

**Deprecated/outdated:**
- **Everyauth** (unmaintained, use Lucia/Auth.js)
- **Passport.js strategies** (complex, 500+ strategies, prefer modern alternatives)
- **Custom JWT implementations** (use Lucia for session management)
- **Custom password hashing** (use Lucia or bcrypt/argon2 directly)

---

## Migration Path

### Phase 1: Rebuild with Supabase (Recommended)

**Timeline:** 4-6 weeks
**Complexity:** LOW
**Risk:** LOW

1. Keep current Supabase backend
2. Migrate frontend to new architecture
3. Re-implement features with improved UI/UX
4. Add comprehensive tests

**Benefits:**
- Fast iteration on features
- Security already handled
- Focus on product, not infrastructure

### Phase 2: Evaluate Self-Hosting (Optional)

**Timeline:** 2-4 weeks
**Complexity:** MEDIUM
**Risk:** MEDIUM

**Decision matrix:**

| Factor | Stay Supabase | Migrate Self-Hosted |
|--------|---------------|---------------------|
| Hosting cost | $0-25/month (Pro tier) | $0-10/month (VPS) |
| Development time | 0 weeks | 4-8 weeks |
| Security risk | LOW (handled by Supabase) | MEDIUM (must implement perfectly) |
| Data privacy | THIRD-PARTY hosting | FULL control |
| Maintenance | Automatic | Manual updates, backups |
| Scalability | Auto-scales | Must manage manually |

**Only migrate if ALL true:**
1. Hosting costs are prohibitive (>£50/month)
2. Privacy concerns require on-premise hosting
3. Team has capacity for 4-8 weeks auth/security implementation
4. Comfortable managing server security, updates, backups

### Phase 3: Migration Execution (If Chosen)

**Step 1: Export from Supabase**
```bash
# Via Supabase Dashboard
# 1. Export schema (DDL)
# 2. Export data (SQL dump or CSV)
# 3. Document RLS policies (convert to app-level checks)
```

**Step 2: Set up PostgreSQL**
```bash
# Install PostgreSQL 15+
sudo apt install postgresql-15

# Create database
createdb bbmanager

# Restore schema
psql bbmanager < schema.sql

# Restore data
psql bbmanager < data.sql
```

**Step 3: Implement Lucia Auth**
```typescript
// See Lucia code examples above
// Migrate auth.users table to Lucia schema
// Implement password reset flow
```

**Step 4: Replace RLS with Application Checks**
```typescript
// For each RLS policy, add app-level check
// Example: "boys_select_officer_plus"
// → Add requireRole(userId, ['officer', 'captain', 'admin'])
// → Wrap all boys queries in this check
```

**Step 5: Update Environment Variables**
```bash
# Old (Supabase)
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...

# New (Self-hosted)
DATABASE_URL=postgres://user:pass@localhost/bbmanager
SESSION_SECRET=... # Generate with crypto.randomBytes(32)
```

**Step 6: Testing**
- Test all auth flows (signup, signin, reset, logout)
- Test authorization for all roles (officer, captain, admin)
- Test data access controls (section isolation)
- Perform security audit
- Load test with realistic data volume

---

## Open Questions

### 1. UK GDPR Data Residency

**What we know:**
- UK GDPR applies regardless of hosting location
- Children's Code requires specific protections
- Data must be processed lawfully, transparently, securely

**What's unclear:**
- Does hosting with Supabase (EU servers) vs self-hosted (UK servers) materially impact compliance?
- Are there specific auditor requirements for data location?

**Recommendation:**
- Consult legal counsel if unsure
- Document lawful basis for processing (legitimate interests for youth org administration)
- Implement privacy by design (either hosting option)

### 2. Raspberry Pi Feasibility

**What we know:**
- Supabase Docker has Raspberry Pi 5 compatibility issues
- PostgreSQL itself runs on ARM (Raspberry Pi)
- Resource requirements unclear for production workload

**What's unclear:**
- Can PostgreSQL + app run reliably on Raspberry Pi 4/5 with 4-8GB RAM?
- What is the realistic maximum roster size before performance degrades?

**Recommendation:**
- Prototype on target hardware early if self-hosting
- Monitor RAM, CPU, disk I/O during development
- Have backup plan (VPS) if Pi is insufficient

### 3. Lucia Maintenance Mode

**What we know:**
- Lucia entered maintenance mode in 2025
- No new features, bug fixes only
- Still secure and functional

**What's unclear:**
- Long-term viability (will it be abandoned?)
- Migration path if Lucia becomes unsupported

**Recommendation:**
- Lucia is still viable for v1
- Consider Auth.js if needing active development
- Monitor project status quarterly

---

## Sources

### Primary (HIGH confidence)

### Secondary (MEDIUM confidence)
- [Self-Hosted Authentication: Lucia vs Auth.js 2026](https://www.linkedin.com/pulse/self-hosted-authentication-alternatives-2026-lucia-vs-authjs/) - Auth library comparison
- [Drizzle vs Prisma: Choosing the Right TypeScript ORM in 2026](https://medium.com/@codabu/drizzle-vs-prisma-choosing-the-right-typescript-orm-in-2026-deep-dive-63abb6aa882b) - ORM comparison for 2026
- [Why Prisma ORM Checks Types Faster Than Drizzle](https://www.prisma.io/blog/why-prisma-orm-checks-types-faster-than-drizzle) - Performance benchmark (Sept 2025)
- [Drizzle vs Prisma: the Better TypeScript ORM in 2025](https://www.bytebase.com/blog/drizzle-vs-prisma/) - Detailed ORM comparison
- [Node.js ORMs in 2025: Choosing Between Prisma, Drizzle](https://thedataguy.pro/blog/2025/12/nodejs-orm-comparison-2025/) - ORM ecosystem overview
- [Supabase Docker Documentation](https://supabase.com/docs/guides/self-hosting/docker) - Official self-hosting guide
- [Supabase Raspberry Pi Issue #30640](https://github.com/supabase/supabase/issues/30640) - ARM compatibility discussion
- [UK ICO Children's Code Guidance](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/protecting-childrens-privacy-online-our-childrens-code-strategy/) - Official UK GDPR children's data requirements
- [PostgreSQL Security Best Practices (Percona)](https://www.percona.com/blog/postgresql-database-security-what-you-need-to-know/) - Database hardening guide
- [PostgreSQL Backup and Restore 101 (Percona)](https://www.percona.com/blog/postgresql-101-simple-backup-restore/) - Backup strategies
- [Databasus - Self-Hosted Backup Tool](https://databasus.com/) - Open-source backup automation
- [PG Back Web Overview](https://palark.com/blog/ufo-backup-pg-back-web-overview/) - GUI backup management

### Tertiary (LOW confidence)
- [How to Backup Self Hosted Postgres Instance (Reddit)](https://www.reddit.com/r/selfhosted/comments/1f414es/how_to_backup_self_hosted_postgres_instance_and/) - Community discussion (unverified)

---

## Metadata

**Confidence breakdown:**
- Standard stack: MEDIUM - Based on 2025 sources, Lucia maintenance mode introduces uncertainty
- Architecture: MEDIUM - General patterns well-understood, specific implementation details vary
- Pitfalls: HIGH - Security and backup risks are well-documented
- Migration path: LOW - No specific Supabase export guides found, general PostgreSQL migration pattern used

**Research date:** 2026-01-22
**Valid until:** 2026-02-22 (30 days - authentication landscape changes rapidly)

**Recommendations for planner:**
1. Assume Supabase for v1 rebuild (LOW risk, fast iteration)
2. Create decision gate after v1: evaluate hosting costs, privacy concerns, team capacity
3. If migrating to self-hosted: allocate 4-8 weeks for auth/security implementation
4. Prototype on target hardware (Raspberry Pi/VPS) early to validate resource constraints
5. Schedule legal review for UK GDPR compliance regardless of hosting choice

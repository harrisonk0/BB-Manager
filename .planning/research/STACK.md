# Technology Stack: Secure Member Management (UK Minors' Data)

**Project:** BB-Manager (Boys' Brigade member management)
**Researched:** 2026-01-21
**Domain:** Youth organization member management with minors' personal data
**Focus:** Supabase security, UK GDPR compliance, authentication patterns

---

## Executive Summary

BB-Manager manages personal information about minors (names, attendance, marks) for a UK youth organization. The stack is fundamentally sound (React 19 + Supabase 2.48), but **security implementation requires remediation** before it can be considered UK-GDPR compliant for minors' data.

**Critical Finding:** The app currently uses GRANT-based access control without Row Level Security (RLS) enabled. This is a fundamental security gap that must be addressed for compliance.

---

## Recommended Security Stack (2025)

### Core Technologies

| Technology | Version | Status | Purpose |
|------------|---------|--------|---------|
| React | 19.2.0 | KEEP | UI library |
| TypeScript | 5.8.2 | KEEP | Type safety |
| Vite | 6.2.0 | KEEP | Build tool |
| Supabase | 2.48.0 | KEEP | Auth + Database (with RLS hardening) |
| Supabase Auth | Latest | KEEP | Authentication (with MFA enforcement) |
| Node.js | 20 | KEEP | Runtime |

### Security-Critical Additions

| Technology | Purpose | Why Required |
|------------|---------|--------------|
| Supabase RLS Policies | Database-layer authorization | **MANDATORY** for minors' data protection |
| Supabase MFA Enforcement | Multi-factor authentication | Organization-level security requirement (2025) |
| Database Functions (SECURITY DEFINER) | Secure RPC endpoints | Prevent enumeration attacks (invite codes) |
| Supabase Scheduled Jobs | Automated data retention | GDPR data minimization requirements |
| Vault/Secrets Manager | Service role key storage | Never store service_role in client code |

---

## Supabase Row Level Security (RLS) Best Practices

### Current State (HIGH Priority Issue)

**Problem:** RLS is documented but **not enforced**. Access control relies on GRANTs, which is insufficient for minors' data.

```sql
-- Current state (from docs/10-database-security-model.md):
-- "Baseline migrations are permissive (broad GRANTs) and no Row Level Security (RLS) is enabled."
```

### Required RLS Implementation

Based on Supabase official guidance and the existing security model documentation:

**1. Enable RLS on All Tables**

```sql
-- Must execute for each application table:
ALTER TABLE public.boys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
```

**2. Create Role Resolution Function**

```sql
-- SECURITY DEFINER is critical: allows reading user_roles even when RLS is enabled
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

**3. Implement Policies (Authoritative Pattern from docs/10-database-security-model.md)**

The project already has well-designed RLS policies documented. These need to be implemented via migrations:

- **boys table:** Officer+ CRUD access across sections
- **settings table:** Officer+ read, Captain+ write
- **user_roles table:** Self-read, Captain manages Officers, Admin manages Captain+Officers
- **invite_codes table:** Captain manages Officer invites, Admin manages both
- **audit_logs table:** Insert-only for app roles, read for Captain+, revert_data admin-only

**4. Tighten GRANTs After RLS is Enabled**

```sql
-- Revoke broad permissions
revoke all on table public.boys from anon, authenticated;
revoke all on table public.settings from anon, authenticated;
revoke all on table public.user_roles from anon, authenticated;
revoke all on table public.invite_codes from anon, authenticated;
revoke all on table public.audit_logs from anon, authenticated;

-- Grant minimal required permissions
grant select, insert, update, delete on table public.boys to authenticated;
grant select, insert, update on table public.settings to authenticated;
grant select, update, delete on table public.user_roles to authenticated;
grant select, insert, update on table public.invite_codes to authenticated;
grant insert on table public.audit_logs to authenticated;
```

### RLS Performance Best Practices (2025)

From Supabase documentation:

- **Index columns used in RLS policies** (e.g., `user_roles.uid`, `boys.section`)
- **Use `STABLE` functions** for role resolution (not `VOLATILE`)
- **Avoid complex subqueries** in policy predicates
- **Test negative cases** (ensure unauthorized access is denied)

---

## Service Role Key Security: Critical Anti-Patterns

### What is service_role?

The `service_role` key in Supabase is a **bypass-all key** that:
- Bypasses Row Level Security (RLS)
- Bypasses all GRANT restrictions
- Has full database access
- Can read/write any data

**MEDIUM Confidence (Official Supabase docs)**

### Anti-Patterns: What NOT to Do

| Anti-Pattern | Why It's Critical | Consequence |
|--------------|------------------|-------------|
| **Never use service_role client-side** | Client bundles can be inspected/extracted | Full database exposed to anyone who downloads the app |
| **Never prefix with VITE_** | Vite embeds VITE_ variables into browser bundle | Service role key visible in page source |
| **Never commit to git** | Keys in repository history are permanently exposed | Even if deleted later, git history contains the key |
| **Never share in screenshots/docs** | Accidental disclosure vectors | Key compromise requires immediate rotation |
| **Never use for "convenient" queries** | Bypasses security architecture | Defeats purpose of RLS entirely |

### Correct: Service Role Usage Pattern

**Server-side only, for privileged operations:**

```typescript
// ❌ WRONG - Client code (services/supabaseClient.ts)
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(url, service_role_key); // NEVER DO THIS

// ✅ CORRECT - Server-side only (Edge function or separate server)
const serviceRoleClient = createClient(
  process.env.SUPABASE_URL!,  // Not VITE_ prefixed
  process.env.SUPABASE_SERVICE_ROLE_KEY!,  // Not VITE_ prefixed
  { auth: { persistSession: false } }
);

// Use only for:
// 1. Audit log retention cleanup (14-day deletion)
// 2. Break-glass recovery operations
// 3. Admin operations that cannot use RLS
```

### Required Verification for BB-Manager

**Current state appears correct** (from `.env.example`):

```bash
# Client (Vite) environment variables
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY

# No VITE_SUPABASE_SERVICE_ROLE_KEY present ✓
```

**Action item:** Verify that `service_role` key is never used in client code via grep:

```bash
grep -r "service_role" --exclude-dir=node_modules --exclude-dir=.git .
grep -r "SUPABASE.*ROLE" --exclude-dir=node_modules --exclude-dir=.git .
```

---

## UK Law Compliance for Minors' Data

### Legal Framework (2025)

**MEDIUM Confidence** (ICO and UK Government sources)

| Regulation | Key Requirement | Relevance to BB-Manager |
|------------|----------------|-------------------------|
| **UK GDPR** | Age of consent: 16 for data processing | Parental consent required for under-16s |
| **UK GDPR Article 8** | Information society services: parental authorization for under-16s | Online membership requires parent/guardian consent |
| **Data (Use and Access) Act 2025** | Statutory recognition of children's special status | Enhanced protection requirements |
| **Data Protection Act 2018** | DPIA required for high-risk processing | Membership database may require DPIA |

### Age of Consent Rules

**Age Thresholds:**
- **Under 13:** Cannot consent to data processing. Parental/guardian consent required.
- **13-15:** Cannot consent to "information society services" (online services). Parental/guardian authorization required.
- **16+:** Can consent to data processing themselves.

**Practical Implementation for BB-Manager:**

1. **Data Collection:**
   - Collect minimum necessary data (data minimization principle)
   - Store names, attendance, marks - but justify each data point
   - Consider: Do you need dates of birth? Addresses? Emergency contacts?

2. **Parental Consent:**
   - Members are likely under 16
   - **Parent/guardian consent is legally required**
   - Store consent records: who consented, when, for what

3. **Privacy Notice:**
   - Must be age-appropriate (plain language for children)
   - Separate notices may be needed for children vs parents
   - Explain: what data, why used, who shared with, rights

4. **Data Subject Rights (apply to children too):**
   - Right to access their data
   - Right to rectification
   - Right to erasure ("right to be forgotten")
   - Right to restrict processing

### Data Retention Requirements

**GDPR Principle:** Storage limitation - keep data no longer than necessary

**Recommended for BB-Manager:**

| Data Type | Retention Period | Justification |
|-----------|------------------|---------------|
| **Audit logs** | 14 days | Already documented; reasonable for security audit |
| **Invite codes** | 7 days (expires) | Already implemented; appropriate |
| **Member data (active)** | While member + reasonable period | Business necessity |
| **Member data (former)** | 7 years after leaving | Typical organizational record retention |
| **Attendance/marks** | 7 years | Educational records standard |

**Implementation Required:**

```sql
-- Scheduled job for audit log retention
delete from public.audit_logs
where created_at < now() - interval '14 days';
```

### Data Protection Impact Assessment (DPIA)

**HIGH Priority:** A DPIA may be required because:

- Processing children's personal data
- Systematic monitoring of attendance/behavior
- Potential high risk to rights and freedoms

**DPIA Checklist (ICO):**
- Describe processing purposes
- Assess necessity and proportionality
- Assess risks to individuals
- Identify mitigation measures
- Sign off and review dates

**Action Item:** Complete a formal DPIA document before processing personal data at scale.

---

## Authentication Patterns for Youth Organizations

### Supabase Auth Best Practices (2025)

**HIGH Confidence** (Supabase official documentation)

**1. Enable Email Verification**

```typescript
// During signup
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: `${window.location.origin}/auth/callback`,
  }
});
```

**Why:** Prevents fake account creation, confirms email ownership

**2. Enforce Strong Password Policies**

```typescript
// Supabase Auth allows password policy configuration
// Minimum length: 8+ characters
// Require: uppercase, lowercase, numbers, special chars
```

**3. Enable MFA at Organization Level (2025 Requirement)**

From Supabase docs: "With MFA enforcement enabled, all members of your organization must use multi-factor authentication to access any project or resource."

**Implementation:** Enable via Supabase Dashboard > Organization > Security > MFA Enforcement

**4. Session Management**

```typescript
// Current implementation (services/supabaseAuth.ts) is appropriate:
// - Uses onAuthStateChange for session monitoring
// - Implements signOut, password reset
```

### Youth-Specific Auth Patterns

**Pattern 1: Invite-Based Registration (Already Designed)**

The project has a well-designed invite code flow documented in `docs/10-database-security-model.md`:

```sql
-- Validation function (for unauthenticated)
create function public.validate_invite_code(code text)
returns table (is_valid boolean, section text, default_user_role text, expires_at timestamptz);

-- Claim function (for authenticated, atomic)
create function public.claim_invite_code(code text)
returns table (assigned_role text, section text);
```

**Benefits:**
- Prevents open registration
- Controls who can access the system
- Links registration to known trusted individuals (Officers/Captains)

**Pattern 2: Role Hierarchy Enforcement**

```
admin > captain > officer
```

**Security principle:** Higher roles cannot be self-assigned. Admin role is manually provisioned only.

**Pattern 3: Audit Trail**

All sensitive actions are logged (already implemented in `services/db.ts`):
- Role changes
- Invite code creation/revocation
- Data modifications
- Revert actions (admin-only)

---

## Required Security Remediations

### Priority 1: Enable RLS (Critical)

| Task | Effort | Impact |
|------|--------|--------|
| Implement documented RLS policies | Medium | High - enables database-layer security |
| Tighten GRANTs | Low | High - completes RLS implementation |
| Create role resolution function | Low | High - foundation for RLS policies |
| Enable RLS on all tables | Low | High - activates policies |

**Estimated Effort:** 2-3 days for safe rollout (including testing)

### Priority 2: Implement Invite Flow Functions (High)

| Task | Effort | Impact |
|------|--------|--------|
| Create `validate_invite_code()` function | Low | High - prevents enumeration |
| Create `claim_invite_code()` function | Medium | High - atomic signup flow |
| Update frontend to use RPC instead of direct SELECT | Medium | High - closes security gap |
| Create `audit_logs_read` view | Low | High - protects revert_data |

**Estimated Effort:** 3-4 days

### Priority 3: UK GDPR Compliance (High)

| Task | Effort | Impact |
|------|--------|--------|
| Complete DPIA document | Medium | High - legal compliance |
| Create privacy notice for children/parents | Medium | High - transparency requirement |
| Implement data retention scheduled job | Low | High - storage limitation principle |
| Add parental consent tracking (if required) | Medium | High - legal requirement for under-16s |
| Document data subject rights process | Low | Medium - operational compliance |

**Estimated Effort:** 1-2 weeks

### Priority 4: Operational Security (Medium)

| Task | Effort | Impact |
|------|--------|--------|
| Verify service_role key never in client code | Low | High - prevents catastrophic exposure |
| Enable MFA enforcement at org level | Low | High - account security |
| Add logging for security-relevant events | Low | Medium - audit capability |
| Document break-glass recovery procedures | Low | Medium - operational readiness |

**Estimated Effort:** 2-3 days

---

## Anti-Patterns Summary

### Security Anti-Patterns to Avoid

| Anti-Pattern | Correct Approach | Source |
|--------------|------------------|--------|
| Client-side service_role usage | Server-only, env var (not VITE_) | Supabase API keys docs |
| GRANT-only access control | RLS policies + tight GRANTs | Supabase secure data docs |
| Direct table access for invite codes | RPC function with validation | docs/10-database-security-model.md |
| Storing passwords in app code | Supabase Auth (hashed, salted) | Supabase auth docs |
| Hardcoded API keys | Environment variables | General best practice |
| Unlimited data retention | Defined retention + scheduled cleanup | GDPR storage limitation |
| Open registration | Invite-based, controlled signup | docs/10-database-security-model.md |

### Code Review Checklist

Before deploying to production:

- [ ] RLS enabled on all tables (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`)
- [ ] `service_role` key NOT prefixed with `VITE_` anywhere
- [ ] `service_role` key NOT used in any file under `src/` or `components/` or `services/`
- [ ] Invite code validation uses RPC, not direct SELECT
- [ ] Audit logs use `audit_logs_read` view, not direct table access
- [ ] Data retention job scheduled (14-day audit log cleanup)
- [ ] MFA enabled at organization level
- [ ] DPIA completed and documented
- [ ] Privacy notice created (age-appropriate)
- [ ] Parental consent mechanism documented/implemented

---

## Migration Path: Safe Rollout

From `docs/10-database-security-model.md`, the recommended sequence:

**Phase 1: Local Development**
1. Add helper functions (`current_app_role`, `validate_invite_code`, `claim_invite_code`)
2. Add RLS policies (but don't enable yet)
3. Create `audit_logs_read` view
4. Update app code to use new patterns

**Phase 2: Staging**
1. Verify role data correctness
2. Enable RLS on all tables
3. Run full E2E validation
4. Test all role permissions

**Phase 3: Production**
1. Deploy app changes first
2. Enable RLS via migration
3. Monitor for permission errors
4. Have break-glass recovery ready

---

## Confidence Levels

| Area | Confidence | Notes |
|------|------------|-------|
| Supabase RLS patterns | HIGH | Based on official Supabase docs + existing project documentation |
| Service role security | HIGH | Official Supabase documentation explicitly states requirements |
| UK GDPR age thresholds | MEDIUM | ICO and UK gov sources confirm 16-year threshold |
| Data retention periods | LOW | Industry standards cited; legal guidance varies by use case |
| MFA enforcement | HIGH | Supabase official documentation (2025) |
| DPIA requirements | MEDIUM | ICO guidance indicates likely required; consult legal advisor |

---

## Sources

### Supabase Security
- [Row Level Security | Supabase Docs](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Securing your data | Supabase Docs](https://supabase.com/docs/guides/database/secure-data)
- [Understanding API keys | Supabase Docs](https://supabase.com/docs/guides/api/api-keys)
- [Enforce MFA on Organization | Supabase Docs](https://supabase.com/docs/guides/platform/mfa/org-mfa-enforcement)
- [Best Practices for Supabase | Security, Scaling & More](https://www.leanware.co/insights/supabase-best-practices)
- [Best Security Practices in Supabase: A Comprehensive Guide](https://www.supadex.app/blog/best-security-practices-in-supabase-a-comprehensive-guide)

### UK Law / GDPR
- [Children and the UK GDPR | ICO](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/children-and-the-uk-gdpr/)
- [Data protection impact assessments | ICO](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/accountability-and-governance/guide-to-accountability-and-governance/data-protection-impact-assessments/)
- [Privacy information for children and young people under 18 | UK Government](https://www.gov.uk/government/publications/privacy-information-children-and-young-people-under-18/privacy-information-children-and-young-people-under-18)
- [Child online safety: Data protection and privacy | GOV.UK](https://www.gov.uk/guidance/child-online-safety-data-protection-and-privacy)
- [Data Protection Privacy Notice - Children and Young People | UK Youth](https://www.ukyouth.org/wp-content/uploads/2025/09/4.14-Data-Protection-Privacy-Notice-%E2%80%93-Children-and-Young-People.pdf)
- [Data Protection Policy | UK Youth](https://www.ukyouth.org/wp-content/uploads/2023/08/3.1-Data-Protection-Policy.pdf)

### Youth Organization Examples
- [Using children's information: a guide | ICO](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/using-childrens-information-a-guide/)

### Internal Documentation
- `/Users/harrisonk/dev/BB-Manager/docs/10-database-security-model.md` - Authoritative security model with RLS policy designs
- `/Users/harrisonk/dev/BB-Manager/.planning/codebase/CONCERNS.md` - Current security concerns
- `/Users/harrisonk/dev/BB-Manager/services/db.ts` - Current data access patterns
- `/Users/harrisonk/dev/BB-Manager/services/supabaseClient.ts` - Client initialization

---

*Research completed: 2026-01-21*
*Next phase: Roadmap creation based on security remediation priorities*

# Domain Pitfalls: Secure Member Management with Minors' Data

**Domain:** Youth organization member management (UK)
**Researched:** 2026-01-21
**Applicable Law:** UK GDPR, Data Protection Act 2018

---

## Critical Pitfalls

Mistakes that cause data breaches, regulatory penalties, or rewrites.

### Pitfall 1: Shipping Without RLS Enabled

**What goes wrong:**
- GRANT-based access allows any authenticated user to query entire tables
- Application-layer checks can be bypassed via direct Supabase client calls
- Personal data of all minors exposed to any user with valid credentials

**Why it happens:**
- RLS policies are complex and easy to misconfigure
- Developers may rely on client-side permission checks
- Testing may only cover happy paths, not unauthorized access attempts
- Development uses `service_role` which bypasses RLS, masking the issue

**Consequences:**
- Data breach of minors' personal information
- UK GDPR penalties (up to GBP 17.5 million or 4% of global turnover)
- Loss of trust from parents/guardians and organization leadership
- Potential mandatory notification to ICO and affected individuals
- **Horizontal privilege escalation** - Section A leaders seeing Section B's member data

**UK Law Implications:**
Violates GDPR Article 5(1)(f) - "integrity and confidentiality" principle. The Boys' Brigade's Data Protection Policy states: "only people who really need to use it as part of their work responsibilities will have access to it." Cross-section access fails this test.

**Prevention:**
```sql
-- MUST execute for each table containing personal data:
ALTER TABLE public.boys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Verify RLS is enabled:
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = true;
-- Should return 'true' for all user-facing tables
```

**Detection:**
- Audit queries show broader data access than expected
- Security penetration testing reveals data leakage
- Database permissions audit shows `rowsecurity = false`
- Testing with multiple user accounts reveals cross-section data access

**Phase to Address:** Phase 1 (Security Foundation) - This is a critical vulnerability noted in CONCERNS.md

---

### Pitfall 2: Service Role Key in Client Code

**What goes wrong:**
- Service role key embedded in browser bundle (via VITE_ prefix or direct import)
- Anyone who inspects the page source can extract the key
- Attacker gains full database access, bypassing all RLS policies

**Why it happens:**
- Convenience: service role key "just works" for all operations
- Misunderstanding: developers think bundling is safe because code is "minified"
- Copy-paste: using example code that includes service role for demonstration
- Adding to `.env` files that get imported in client code

**Consequences:**
- Complete database compromise
- All personal data exfiltratable (names, attendance, marks)
- Attacker can modify/delete data
- No audit trail for actions taken with service_role
- Key rotation required (complex operational task)

**UK Law Implications:**
Under UK GDPR, this constitutes a "personal data breach" requiring notification to ICO within 72 hours if risk to individuals is likely. Given this involves minors' data, risk is inherently high. Recent ICO fines include:
- TikTok: GBP 12.7 million for child data breaches (2025)
- Capita: GBP 14 million for failing to secure personal data

**Prevention:**
```bash
# CORRECT: .env.example pattern
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
# No service role key with VITE_ prefix

# WRONG: Never add this
VITE_SUPABASE_SERVICE_ROLE_KEY=xxx

# Service role key only in server environment:
SUPABASE_SERVICE_ROLE_KEY=xxx  # Used in Edge Functions or separate server
```

1. Add pre-commit hooks that reject any commit containing `service_role`
2. Use separate `.env` files: `.env.local` (never committed) vs `.env.example` (safe template)
3. Document that `service_role` bypasses ALL RLS policies

**Detection:**
```bash
# Regularly scan for service role exposure:
grep -r "service_role" --exclude-dir=node_modules --exclude-dir=.git .
grep -r "SUPABASE.*ROLE" --exclude-dir=node_modules --exclude-dir=.git .
grep -r "VITE_.*SERVICE" --exclude-dir=node_modules --exclude-dir=.git .
```

**Phase to Address:** Phase 1 (Security Foundation) - Must be fixed before any feature work

---

### Pitfall 3: Direct Client-Side Queries to user_roles Table

**What goes wrong:**
Client code directly queries `user_roles` table, exposing all system users and their roles to any authenticated user.

**Why it happens:**
- Convenience - direct queries are faster than building API endpoints
- Treating Supabase as a "database-as-API" without proper boundaries
- Not understanding that `anon` key is publicly visible in browser DevTools

**Consequences:**
- User enumeration - attackers can discover all user accounts
- Role revelation - knowing who has admin/leader privileges
- Data structure exposure - helps target further attacks
- No audit trail for who accessed what

**Current Codebase Status:**
CONCERNS.md notes: "Role fetching queries `user_roles` directly via supabaseClient"

**UK Law Implications:**
While not automatically a breach, this creates unnecessary data exposure. GDPR's data minimization principle (Article 5(1)(c)) states you should only process data "adequate, relevant and limited to what is necessary." Exposing `user_roles` to all clients fails this test.

**Prevention:**
```sql
-- Create security-definer function with explicit checks
CREATE OR REPLACE FUNCTION get_my_roles()
RETURNS TABLE (role text, section_id uuid) AS $$
  BEGIN
    RETURN QUERY
    SELECT ur.role, ur.section_id
    FROM user_roles ur
    WHERE ur.user_id = auth.uid();
  END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add RLS policy denying direct access
CREATE POLICY "No direct access to user_roles"
ON user_roles FOR SELECT
USING (false);
```

```typescript
// DON'T: Direct table access
const { data } = await supabase.from('user_roles').select('*')

// DO: Use security-definer function
const { data } = await supabase.rpc('get_my_roles')
```

**Detection:**
```bash
# Find direct table queries in client code
grep -r "supabase.from('user_roles')" client/
grep -r "supabase.from('section_leaders')" client/
```

**Phase to Address:** Phase 1 (Security Foundation)

---

### Pitfall 4: Console Logging in Production

**What goes wrong:**
Debug `console.log()` statements remain in production builds, potentially exposing sensitive member data, authentication tokens, or internal system details.

**Why it happens:**
- No build process that strips console statements
- Debugging aids left in code during development
- Not considering that browser console is visible to end users

**Consequences:**
- Member names, attendance data logged to console
- Error messages revealing internal system structure
- Authentication tokens visible in console output
- **CWE-532: Insertion of Sensitive Information into Log File**

**Current Codebase Status:**
CONCERNS.md notes: **33 instances** of `console.log`/`console.error` in application code

**UK Law Implications:**
GDPR-compliant logging requires sanitization of sensitive data. Logging children's personal information to console creates unnecessary data exposure. Under UK GDPR, this could be considered failure to implement "appropriate technical and organisational measures" (Article 32).

**Prevention:**
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
      },
    },
  },
});

// Use proper logging framework
const logger = import.meta.env.DEV
  ? { info: console.log, error: console.error }
  : { info: () => {}, error: logToService }; // Production logger
```

**Detection:**
```bash
# Find all console statements in source
grep -rn "console\." client/ --include="*.ts" --include="*.tsx"
```

**Phase to Address:** Phase 1 (Security Foundation)

---

### Pitfall 5: Missing Data Breach Response Plan

**What goes wrong:**
When a breach is discovered, the organisation doesn't know who to notify, what to document, or how to respond within the 72-hour ICO window.

**Why it happens:**
- No documented breach response procedure
- Staff don't know who the Data Protection Representative is
- No logging/audit trail to determine what was accessed
- Not knowing that ICO requires notification within 72 hours

**Consequences:**
- Missing the 72-hour ICO notification deadline
- Incomplete breach investigation
- Failure to notify affected individuals when required
- **Increased regulatory penalties** for failure to report

**UK Law Implications:**
UK GDPR Article 33 requires notification to ICO without undue delay and "where feasible" within 72 hours of becoming aware. For high-risk breaches (including minors' data), Article 34 requires notifying affected individuals. The [ICO 72-hour guide](https://ico.org.uk/for-organisations/advice-for-small-organisations/personal-data-breaches/72-hours-how-to-respond-to-a-personal-data-breach/) is mandatory reading.

**Prevention:**
1. Document breach response procedure:
   ```
   Step 1: Immediately contain the breach (revoke keys, shut down access)
   Step 2: Log the breach (what happened, when, what data)
   Step 3: Assess risk to individuals (likely/high thresholds)
   Step 4: Notify ICO within 72 hours if risk is "likely"
   Step 5: Notify individuals if risk is "high"
   Step 6: Document all actions taken
   ```

2. Designate a Data Protection Representative with contact info documented

3. Implement audit logging on sensitive operations:
   ```sql
   CREATE TABLE audit_log (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id uuid REFERENCES auth.users,
     action text NOT NULL,
     table_name text NOT NULL,
     record_id uuid,
     timestamp timestamptz DEFAULT now(),
     ip_address inet
   );
   ```

4. Add breach detection monitoring (unusual query patterns, failed auth attempts)

**Detection:**
- No breach response documentation exists
- No audit logging in database schema
- Staff unable to answer "Who do we call if we detect a breach?"

**Phase to Address:** Phase 2 (Compliance & Governance)

---

### Pitfall 6: Ignoring UK GDPR Age of Consent

**What goes wrong:**
- Processing children's data without proper legal basis
- Parental consent not obtained for under-13s (information society services)
- Privacy notices not age-appropriate
- Data retention not documented or enforced

**Why it happens:**
- Confusion about age thresholds (online vs offline services)
- Assumption that "organizational data" doesn't need consent
- Focus on functionality over legal compliance

**Consequences:**
- ICO enforcement action
- Civil liability from parents/guardians
- Inability to legally process member data
- Requirement to delete all data and restart with proper consent

**UK Law Implications:**
For children under 13, parental consent is required for "information society services" (GDPR Article 8). Even for non-digital services, the [ICO children's guidance](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/children-and-the-uk-gdpr/) emphasizes enhanced protections. The [Boys' Brigade Data Protection Policy](https://boys-brigade.org.uk/downloads/dataprotectionpolicy.pdf) explicitly commits to GDPR compliance for children's data.

**Prevention:**
- **Document lawful basis** for each type of data processing
- **Obtain parental consent** for members under 13 (digital services)
- **Create age-appropriate privacy notices** (separate for children vs parents)
- **Implement data retention** with scheduled cleanup
- **Track consent records** in database (who consented, when, for what)
- **Complete a DPIA** (Data Protection Impact Assessment)

**Detection:**
- Legal/compliance review identifies gaps
- Parent complaints about data processing
- ICO inquiry or audit
- No way to verify parental consent for any member

**Phase to Address:** Phase 2 (Compliance & Governance)

---

## Moderate Pitfalls

Mistakes that cause delays, technical debt, or operational issues.

### Pitfall 7: Invite Code Enumeration

**What goes wrong:**
- Unauthenticated users can query `invite_codes` table
- Attackers can enumerate valid invite codes
- Unauthorized registration possible

**Why it happens:**
- Direct `SELECT` from `invite_codes` table in client code
- RLS policy allows `anon` role to read table for validation
- Using client-side filtering instead of server-side validation

**Consequences:**
- Unauthorized account creation
- Invite code exhaustion
- Bypass of invitation-based access control

**Prevention:**
```sql
-- CORRECT: Use RPC function for validation
create function public.validate_invite_code(code text)
returns table (is_valid boolean, section text, default_user_role text, expires_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select
    (ic.id is not null) as is_valid,
    ic.section,
    ic.default_user_role,
    ic.expires_at
  from public.invite_codes ic
  where ic.id = code
    and ic.revoked = false
    and ic.is_used = false
    and ic.expires_at > now()
  limit 1
$$;

-- Grant only to anon role
grant execute on function public.validate_invite_code(text) to anon;

-- Revoke direct table access
revoke select on table public.invite_codes from anon;
```

**Detection:**
- Security testing reveals ability to enumerate codes
- Unexpected registrations without valid invitations
- Audit logs show invite code queries from unauthenticated users

**Phase to Address:** Phase 2 (Invite Flow Security)

---

### Pitfall 8: Missing Audit Log Retention

**What goes wrong:**
- Audit logs grow indefinitely
- Performance degrades over time
- Storage costs increase
- GDPR storage limitation violation

**Why it happens:**
- Retention mentioned in docs but not implemented
- No scheduled job for cleanup
- Unclear ownership for maintenance task

**Current Codebase Status:**
CONCERNS.md notes: "Cleanup after 14 days described in UI/docs but no scheduler/trigger implemented"

**Consequences:**
- Database performance degradation
- Increased storage costs
- GDPR non-compliance (data kept longer than necessary)

**UK Law Implications:**
GDPR Article 5(1)(e) - storage limitation: "personal data shall be kept in a form which permits identification of data subjects for no longer than is necessary." The Boys' Brigade policy states: "When we no longer need data we will destroy it in accordance with good data protection practice."

**Prevention:**
```sql
-- Create scheduled job (Supabase cron or pg_cron)
create or replace function cleanup_old_audit_logs()
returns void
language sql
security definer
as $$
  delete from public.audit_logs
  where created_at < now() - interval '14 days';
$$;

-- Schedule to run daily
select cron.schedule(
  'cleanup-audit-logs',
  '0 2 * * *',  -- 2 AM daily
  'select cleanup_old_audit_logs();'
);
```

**Detection:**
- Database size growing unexpectedly
- Audit log query performance degrading
- Manual audit log cleanup being performed

**Phase to Address:** Phase 3 (Data Lifecycle)

---

### Pitfall 9: Self-Lockout via Role Changes

**What goes wrong:**
- Captain/admin demotes themselves
- No one can perform admin operations
- Application becomes unusable

**Why it happens:**
- Client-side checks prevent self-demotion, but RLS doesn't enforce it
- Role changes performed via direct table update instead of controlled function
- No database constraint preventing self-role-modification

**Consequences:**
- Application lockout requiring service role intervention
- Operational disruption
- Need for break-glass recovery

**Prevention:**
```sql
-- In RLS policy or update function:
create policy user_roles_update_prevent_self_lockout
on public.user_roles
for update
to authenticated
using (
  uid <> auth.uid()::text  -- Cannot update own role via app
  or public.current_app_role() = 'admin'  -- Admins still need caution
)
with check (
  uid <> auth.uid()::text  -- Prevent self-lockout
  or (
    uid = auth.uid()::text
    and role = 'admin'  -- Can't demote self from admin
  )
);
```

**Detection:**
- Testing reveals ability to change own role
- User reports lockout after role change

**Phase to Address:** Phase 1 (Security Foundation)

---

### Pitfall 10: Inadequate Break-Glass Planning

**What goes wrong:**
- RLS misconfiguration causes app-wide lockout
- No recovery mechanism available
- Extended downtime while debugging

**Why it happens:**
- RLS policies tested only with valid credentials
- No documented recovery procedure
- Service role access not prepared for emergencies

**Consequences:**
- Extended downtime
- Emergency fixes may introduce new vulnerabilities
- Loss of confidence in system

**Prevention:**
```sql
-- Documented break-glass procedures:
-- 1. Have service role key available (secure storage, not client code)
-- 2. Create rollback migration before enabling RLS
-- 3. Test recovery procedure in staging
-- 4. Document escalation path

-- Break-glass function (use only in emergencies):
create or replace function emergency_disable_rls()
returns void
language sql
security definer
as $$
  alter table public.boys disable row level security;
  alter table public.settings disable row level security;
  alter table public.user_roles disable row level security;
  alter table public.invite_codes disable row level security;
  alter table public.audit_logs disable row level security;
$$;
```

**Detection:**
- Pre-mortem: Cannot answer "how do we recover if RLS locks everyone out?"
- Post-mortem: Actual lockout occurs

**Phase to Address:** Phase 4 (Operational Security)

---

## Minor Pitfalls

Mistakes that cause annoyance but are fixable.

### Pitfall 11: No Data Retention Policy

**What goes wrong:**
Data is kept indefinitely without any process for deletion when no longer needed.

**Why it happens:**
- No documented retention periods
- "We might need it someday" thinking
- No automated cleanup processes beyond audit logs

**Consequences:**
- Data kept longer than necessary violates GDPR
- Increased breach scope (more old data exposed)
- Storage costs grow unnecessarily

**UK Law Implications:**
GDPR Article 5(1)(e) - storage limitation. For attendance records, [UK government guidance](https://www.gov.uk/guidance/data-protection-in-schools/record-keeping-and-management) suggests keeping records for as long as needed, with schools commonly retaining attendance data for 6 years from last entry or until the pupil reaches age 25.

**Prevention:**
Define retention periods by data type:
- Active member data: While member is active
- Attendance records: 6 years from last entry (school standard)
- Past member data: Until age 25 or statutory period
- Invite codes: 14 days (as documented)

**Detection:**
- Check for tables without `deleted_at` or retention logic
- Review data ages - do you have records older than needed?

**Phase to Address:** Phase 3 (Data Lifecycle)

---

### Pitfall 12: No Records of Processing Activities (ROPA)

**What goes wrong:**
Not documenting what personal data is processed, why, and how - a GDPR Article 30 requirement.

**Consequences:**
- Unable to demonstrate compliance to ICO
- Confusion about lawful bases
- Scrambling during audits

**Prevention:**
Create ROPA documenting:
- Data categories processed (names, attendance, marks, etc.)
- Data subjects (members, leaders, parents)
- Purposes of processing
- Data recipients
- International transfers
- Retention periods
- Security measures

**Phase to Address:** Phase 2 (Compliance & Governance)

---

### Pitfall 13: Incomplete Privacy Notice

**What goes wrong:**
Privacy notice doesn't clearly explain to parents and children what data is collected and why.

**Prevention:**
Write age-appropriate privacy notices:
- For adults/parents: full legal notice
- For children: plain language explanation

**Phase to Address:** Phase 2 (Compliance & Governance)

---

### Pitfall 14: No Data Subject Access Request Process

**What goes wrong:**
No documented process for handling requests from individuals to see their data.

**Prevention:**
Document DSAR process:
1. Verify identity of requester
2. Locate all data held
3. Provide copy within one month (statutory requirement)
4. Document the request and response

**Phase to Address:** Phase 2 (Compliance & Governance)

---

### Pitfall 15: Missing Indexes on RLS Columns

**What goes wrong:**
- RLS queries are slow
- Database performance degrades with more data
- Every query scans entire table to apply RLS filter

**Why it happens:**
- RLS policies reference columns that aren't indexed
- Testing with small datasets doesn't reveal performance issue
- Performance testing not done with realistic data volume

**Consequences:**
- Slow page loads
- Poor user experience
- Database resource exhaustion

**Prevention:**
```sql
-- Create indexes on columns used in RLS policies:
create index idx_user_roles_uid on public.user_roles(uid);
create index idx_boys_section on public.boys(section);
create index idx_invite_codes_id on public.invite_codes(id);
create index idx_audit_logs_section on public.audit_logs(section);
create index idx_audit_logs_created_at on public.audit_logs(created_at);
```

**Detection:**
- `EXPLAIN ANALYZE` shows slow queries
- Database performance monitoring reveals high CPU usage
- User complaints about slowness

**Phase to Address:** Phase 1 (Security Foundation)

---

### Pitfall 16: Over-Collection of Personal Data

**What goes wrong:**
Collecting more data than necessary "just in case" it might be useful later.

**Why it happens:**
- Not practicing data minimization
- Adding fields without considering lawful basis
- Collecting data that seems useful but isn't needed for operations

**Consequences:**
- More data at risk if breach occurs
- GDPR compliance burden increases
- More complex data subject access requests

**UK Law Implications:**
GDPR Article 5(1)(c) - data minimization principle. The [ICO guidance](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-protection-principles/a-guide-to-the-data-protection-principles/data-minimisation/) states: "identify the minimum amount of personal data you need to fulfil your purpose. You should hold that much information, but no more."

**Prevention:**
1. Audit each data field: "What is the specific purpose for collecting this?"
2. Document lawful basis for each data category
3. Avoid special category data (health, religion, etc.) unless absolutely necessary
4. Review existing fields and remove unnecessary ones

**Phase to Address:** Phase 2 (Compliance & Governance)

---

### Pitfall 17: Third-Party Service Data Exposure

**What goes wrong:**
Sharing data with third parties (analytics, hosting, tools) without proper due diligence or data processing agreements.

**Why it happens:**
- Using free tools without reviewing data practices
- Not understanding that cloud providers process data
- No Data Processing Agreements (DPAs) in place

**Consequences:**
- Data processed outside intended scope
- Subprocessors breaching your data
- Liability for third-party failures

**UK Law Implications:**
GDPR Article 28 requires written contracts with data processors. The [ICO guidance on third-party sharing](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/how-to-use-our-guidance-for-standard-one-best-interests-of-the-child/best-interests-framework/data-sharing-with-a-third-party-organisation/) emphasizes due diligence. The Boys' Brigade policy: "Where data is being sent to an organisation...we will carry out due diligence."

**Prevention:**
1. Inventory all third-party services that handle data
2. Review each service's data processing location and practices
3. Execute DPAs with all processors (Supabase, hosting, analytics)
4. Avoid tools that don't offer UK/EU data processing or adequate safeguards

**Phase to Address:** Phase 2 (Compliance & Governance)

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Phase 1: RLS Foundation | Enable RLS before testing policies causes lockout | Create policies first, test in staging, then enable |
| Phase 1: RLS Foundation | Forgetting to enable RLS on all tables | Create checklist of all tables, verify with query |
| Phase 1: RLS Foundation | Service role key in client code | Pre-commit hooks, code review checklist |
| Phase 1: RLS Foundation | Direct user_roles queries | Replace with security-definer functions |
| Phase 1: RLS Foundation | Console logging | Drop console in production builds |
| Phase 2: Invite Flow | Direct SELECT still works, RPC not used | Remove direct SELECT access, force RPC usage |
| Phase 2: Invite Flow | Race conditions in signup | Use atomic `claim_invite_code()` function |
| Phase 2: Compliance | No breach response plan | Document procedure before Phase 2 complete |
| Phase 2: Compliance | Missing consent records | Add consent tracking to member onboarding |
| Phase 2: Compliance | No ROPA | Create documentation as part of Phase 2 |
| Phase 3: UK GDPR | Incomplete parental consent documentation | Consult legal expert, document consent flow |
| Phase 3: UK GDPR | No DPIA completed | Complete DPIA before processing personal data |
| Phase 3: Data Lifecycle | No retention enforcement | Implement automated cleanup triggers |
| Phase 3: Data Lifecycle | Data kept too long | Add retention schedules to all data types |
| Phase 4: Access Control | Section isolation bypass | Test with multi-user scenarios |
| Phase 4: Operational Security | No break-glass procedure documented | Document and test recovery before RLS enablement |
| Phase 5: Testing | Only testing happy paths | Test negative cases (unauthorized access denied) |

---

## Pre-Deployment Checklist

Before any production deployment with personal data:

**Security:**
- [ ] RLS enabled on all tables (verified with SQL query)
- [ ] Service role key NOT in client bundle (verified with grep)
- [ ] All invite code access via RPC (no direct SELECT)
- [ ] Console logging stripped from production builds

**Compliance:**
- [ ] DPIA completed and reviewed
- [ ] Privacy notices created (age-appropriate)
- [ ] Parental consent mechanism documented and implemented
- [ ] Data retention documented and enforced
- [ ] ROPA (Records of Processing Activities) completed
- [ ] Data breach response procedure documented

**Operational:**
- [ ] Audit log retention scheduled (cron job exists)
- [ ] MFA enabled at organization level
- [ ] Break-glass recovery documented and tested
- [ ] Data Processing Agreements in place with all third parties
- [ ] Data Protection Representative designated

**Testing:**
- [ ] Security penetration testing completed
- [ ] All negative test cases pass (unauthorized access denied)
- [ ] Multi-user section isolation verified
- [ ] Data subject access request process tested

---

## Sources

| Area | Sources | Confidence |
|------|---------|------------|
| Service role security | [Supabase API Keys Guide](https://supabase.com/docs/guides/api/api-keys), [Supabase Security Retro 2025](https://supabase.com/blog/supabase-security-2025-retro), [GitGuardian Service Role Leak Remediation](https://www.gitguardian.com/remediation/supabase-service-role-jwt) | HIGH |
| RLS best practices | [Supabase RLS Documentation](https://supabase.com/docs/guides/database/postgres/row-level-security), [Common RLS Mistakes](https://hrekov.com/blog/supabase-common-mistakes), [RLS Performance Guide](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv) | HIGH |
| UK GDPR children's data | [ICO Children and UK GDPR](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/children-and-the-uk-gdpr/), [Children's Code Strategy](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/protecting-childrens-privacy-online-our-childrens-code-strategy/) | HIGH |
| Data breach notification | [ICO Breach Notification Guide](https://ico.org.uk/for-organisations/report-a-breach/personal-data-breach/personal-data-breaches-a-guide/), [72-Hour Response Guide](https://ico.org.uk/for-organisations/advice-for-small-organisations/personal-data-breaches/72-hours-how-to-respond-to-a-personal-data-breach/) | HIGH |
| ICO enforcement | [TikTok GBP 12.7m Fine](https://www.iubenda.com/en/blog/tiktok-fined-12-7m-over-child-data-protection-breaches/), [ICO Enforcement Trends](https://www.bdo.co.uk/en-gb/insights/advisory/risk-and-advisory/trends-in-recent-ico-enforcement-action) | HIGH |
| Console logging risks | [Android Log Disclosure](https://developer.android.com/privacy-and-security/risks/log-info-disclosure), [Secure Console Alternatives](https://onboardbase.com/blog/secure-log), [GDPR-Compliant Logging](https://medium.com/bytehide/gdpr-compliant-logging-a-javascript-developers-checklist-b450d0716003) | MEDIUM |
| Data minimization | [ICO Data Minimization Guidance](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-protection-principles/a-guide-to-the-data-protection-principles/data-minimisation/) | HIGH |
| Third-party data sharing | [ICO Data Sharing Guidance](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/how-to-use-our-guidance-for-standard-one-best-interests-of-the-child/best-interests-framework/data-sharing-with-a-third-party-organisation/), [UK GDPR Due Diligence Guide](https://harperjames.co.uk/article/uk-gdpr-due-diligence-a-guide-for-data-controllers/) | HIGH |
| Attendance retention | [DfE Attendance Collection Privacy Notice](https://assets.publishing.service.gov.uk/media/66c8836399faef7c8c117816/DfE_privacy_notice_for_school_attendance_data_collection.pdf), [Schools Record Keeping Guidance](https://www.gov.uk/guidance/data-protection-in-schools/record-keeping-and-management) | MEDIUM |
| Boys' Brigade policy | [BB Data Protection Policy](https://boys-brigade.org.uk/downloads/dataprotectionpolicy.pdf), [BB GDPR Guidance](https://boys-brigade.org.uk/gdpr-and-data-protection/) | HIGH |
| Secrets management | [OWASP Secrets Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html), [Credential Leakage in Frontend](https://www.cremit.io/blog/credential-leakage-risks-hiding-in-frontend-code) | HIGH |
| Age of consent | [ICO ISS Consent Rules](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/protecting-childrens-privacy-online-our-childrens-code-strategy/), [GDPR Article 8](https://gdpr-info.eu/art-8-gdpr/) | HIGH |
| Codebase analysis | [CONCERNS.md](/.planning/codebase/CONCERNS.md) - 33 console logs, RLS not enforced, user_roles direct queries | HIGH |

---

*Pitfalls documented: 2026-01-21*
*Last updated: 2026-01-21*

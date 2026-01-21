# Feature Landscape: Youth Organization Member Management

**Domain:** Boys' Brigade member management (UK)
**Researched:** 2026-01-21

## Table Stakes

Features users expect. Missing = product feels incomplete.

| Feature | Why Expected | Complexity | Status |
|---------|--------------|------------|--------|
| **Member CRUD** | Core purpose: track boys/members in the organization | Low | **Implemented** in `services/db.ts` |
| **Weekly attendance tracking** | Essential for youth organization operations | Low | **Implemented** |
| **Marks/achievements recording** | Core to Boys' Brigade program (badges, awards) | Medium | **Implemented** with validation |
| **Section/age-group organization** | Company vs Junior sections have different rules | Low | **Implemented** (Company/Junior) |
| **Authentication** | Required for any access control | Low | **Implemented** via Supabase Auth |
| **Role-based access control** | Different permission levels (Officer, Captain, Admin) | High | **DESIGNED but NOT ENABLED** - RLS critical gap |
| **Audit logging** | Compliance requirement for personal data | Medium | **Implemented**; needs retention automation |
| **Invite-based registration** | Control who can access sensitive data | Medium | **DESIGNED; needs RPC implementation** |
| **Settings management** | Global and per-section configuration | Medium | **Implemented** |

## Differentiators

Features that set BB-Manager apart. Not expected, but valued.

| Feature | Value Proposition | Complexity | Status |
|---------|-------------------|------------|--------|
| **Section-specific scoring** | Company (0-10) vs Junior (uniform + behaviour) scores | Medium | **Implemented** in `validateBoyMarks()` |
| **Squad management** | Organizes boys into subgroups for leadership | Low | **Implemented** |
| **Squad leader tracking** | Leadership development tracking | Low | **Implemented** via `is_squad_leader` |
| **Audit log revert functionality** | Admin can undo mistakes; compliance-friendly | High | **DESIGNED**; `revert_data` needs admin-only RPC |
| **Invite code expiration** | Time-limited access codes for security | Low | **DESIGNED** (7-day expiry) |
| **Invite code revocation** | Emergency disable of compromised codes | Low | **Implemented** |

## Anti-Features

Features to explicitly NOT build. Common mistakes in this domain.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Direct minors' accounts** | UK GDPR: under-16s need parental consent; privacy issues | Parents/guardians manage accounts; officers manage member data |
| **Social login for minors** | Third-party data sharing complicates GDPR compliance | Email/password only |
| **Public member profiles** | Privacy risk for minors; GDPR violation | Member data only accessible to authorized officers |
| **Automated email to minors** | Direct communication with minors requires special consideration | Communicate via parents/guardians or organization channels |
| **Biometric data** | Special category data under GDPR; requires explicit consent | Avoid fingerprints, facial recognition |
| **Location tracking** | High-risk data; excessive for attendance/marks | Manual attendance only |
| **Open public registration** | Security risk; inappropriate for sensitive data | Invite-only registration |
| **Unlimited data retention** | GDPR storage limitation principle | Defined retention with automated cleanup |
| **Client-side permission checks only** | Can be bypassed; not GDPR-compliant | RLS at database layer |
| **Comprehensive analytics dashboards** | Bloated; most leaders need simple lists | Simple marks viewing is sufficient |
| **Social features** | Youth organizations have safeguarding concerns | Keep it administrative-only |
| **Over-engineered notifications** | Push/email fatigue; leaders ignore noisy apps | Simple in-app notifications only |
| **Excessive data collection** | GDPR/children's data protection requires minimization | Collect only what operations require |

## Feature Dependencies

```
Authentication --> Role Assignment --> Data Access Control
     |                  |                      |
     v                  v                      v
Supabase Auth    user_roles table        RLS policies
                  (exists)              (NOT ENABLED)
                                          |         |
                                          v         v
                                    Boys data   Settings/Logs

Invite Flow (CRITICAL - needs implementation):
validate_invite_code() --> signup --> claim_invite_code() --> user_roles
(UNIMPLEMENTED)        (exists)   (UNIMPLEMENTED)           (exists)

Audit Flow:
Data changes --> createAuditLog() --> audit_logs --> 14-day cleanup
(exists)         (exists)              (exists)        (NOT IMPLEMENTED)
```

## MVP Recommendation

For security remediation (current focus), prioritize:

**Phase 1 (Security Foundation):**
1. Enable RLS on all tables
2. Implement `current_app_role()` function
3. Deploy RLS policies from docs/10-database-security-model.md
4. Tighten GRANTs to minimal required

**Phase 2 (Invite Security):**
1. Implement `validate_invite_code()` RPC
2. Implement `claim_invite_code()` RPC
3. Update frontend to use RPC
4. Create `audit_logs_read` view

**Phase 3 (Compliance):**
1. Automated audit log cleanup (14-day retention)
2. Data export functionality (GDPR right to portability)
3. Privacy notices (age-appropriate)

**Defer to post-MVP:**
- Analytics/reporting dashboards: Marks viewing is sufficient
- Offline-first operation: Significant technical complexity
- Mobile app (native): Platform-specific development
- Parent/guardian portal: Requires additional auth model
- Financial tracking: Additional compliance burden
- Communication features: Independent subsystem

## Missing GDPR Features (HIGH Priority)

| GDPR Requirement | Feature Implementation | Status |
|------------------|----------------------|--------|
| **Lawful basis documentation** | Document and display legal basis | Missing |
| **Data minimization review** | Verify all data fields are necessary | Needs review |
| **Storage limitation** | Automated 14-day audit log retention | Not implemented |
| **Transparency** | Age-appropriate privacy notice | Missing |
| **Right to be informed** | Privacy notice for children/parents | Missing |
| **Right of access** | Formal process for data access requests | Missing |
| **Right to rectification** | Edit member data | Exists |
| **Right to erasure** | Delete member data with process | Partial |
| **Right to restrict processing** | Mark record as "do not process" | Missing |
| **Right to data portability** | Export data in machine-readable format | Missing |
| **Right to object** | Process objection requests | Missing |
| **Parental consent tracking** | For members under 16 | Missing |

## Complexity Notes

**Low Complexity (Safe for early phases):**
- CRUD operations on single entity
- Simple filtering and search
- Form-based data entry
- Basic authentication with fixed roles

**Medium Complexity (Evaluate carefully):**
- Cross-entity relationships (marks -> boys -> sections)
- Permission checks on every operation (RLS policies)
- Export functionality (CSV/Excel)
- RPC function creation

**High Complexity (Avoid in fix-up phase):**
- Offline/sync architecture
- Real-time collaboration
- Multi-tenant isolation
- External service integrations

## Youth Organization Specific Context

**Data Minimisation (GDPR for children):**
- Collect only what operations require
- Avoid nice-to-have demographic fields
- Purpose-limit all data storage
- Document legal basis for each data field

**Safeguarding implications:**
- No peer-to-peer communication features
- No public member directories
- Careful with photo/media storage
- Consider age-appropriate design

**Organizational constraints:**
- Small orgs (20-50 boys) can use simple tools
- Large orgs (100+ boys) need better filtering/search
- Volunteer leaders = low tolerance for complexity
- Seasonal operations (term-time only) affect usage patterns

## Sources

### Project Analysis
- `services/db.ts` - Existing feature implementations
- `services/supabaseAuth.ts` - Authentication patterns
- `docs/10-database-security-model.md` - Security model design
- `docs/00-documentation-audit.md` - Known TODOs and gaps
- `.planning/codebase/CONCERNS.md` - Current issues

### WebSearch (MEDIUM confidence)
- [Online Brigade Manager (OBM)](https://obm.boys-brigade.org.uk/) - Official BB management tool
- [Online Scout Manager (OSM)](https://www.onlinescoutmanager.co.uk/) - Badge/attendance tracking
- [Online Youth Manager](https://www.onlineyouthmanager.co.uk/) - Comprehensive example
- [6 Best Youth Sports Club Management Software](https://wod.guru/blog/youth-sports-club-management-software/)
- [Comparison of Boy Scout Troop Management Software](https://en.scoutwiki.org/Comparison_of_Boy_Scout_Troop_Management_Software)

### Official/Guidance (HIGH confidence)
- [ICO Data Minimisation Principle](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-protection-principles/a-guide-to-the-data-protection-principles/data-minimisation/)
- [Children and the UK GDPR | ICO](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/children-and-the-uk-gdpr/)

---

*Feature landscape documented: 2026-01-21*

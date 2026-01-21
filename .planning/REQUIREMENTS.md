# Requirements: BB-Manager Security Remediation

**Defined:** 2026-01-21
**Core Value:** Secure (UK law compliant) and functional management of boy marks and attendance data

## v1 Requirements

Requirements for operational state. Each maps to roadmap phases.

### Critical Security

- [ ] **SEC-01**: Fix TypeScript error in services/db.ts line 514 (wrong action type)
- [ ] **SEC-02**: Harden search_path on 3 security functions (get_user_role, can_access_section, can_access_audit_logs)
- [ ] **SEC-03**: Fix audit_logs_insert RLS policy (currently allows unrestricted INSERT)
- [ ] **SEC-04**: Verify service_role key is not exposed in client code
- [ ] **SEC-05**: Enable leaked password protection in Supabase Auth
- [ ] **TEST-01**: Set up Vitest testing framework with TypeScript support

### Performance

- [ ] **PERF-01**: Optimize 16 RLS policies to use `(select auth.uid())` instead of `auth.uid()`
- [ ] **PERF-02**: Drop 3 unused indexes (idx_audit_logs_timestamp_desc, idx_invite_codes_generated_at_desc, idx_invite_codes_is_used_true, idx_invite_codes_revoked_true)
- [ ] **TEST-02**: Write unit tests for security functions (get_user_role, can_access_section, can_access_audit_logs)

### Code Quality

- [ ] **CODE-01**: Remove all console.log/console.error statements (32 instances)
- [ ] **CODE-02**: Delete empty components/LineChart.tsx file
- [ ] **CODE-03**: Fix 4 high-severity npm vulnerabilities (npm audit fix)
- [ ] **TEST-03**: Write unit tests for core services (db.ts, settings.ts)

### Configuration

- [ ] **CFG-01**: Create .env file from .env.example (user action required)
- [ ] **CFG-02**: Sync local migrations with Supabase (20 migrations in Supabase vs 2 locally)
- [ ] **CI-01**: Set up GitHub Actions CI pipeline with test runs on push

### Core Functionality (Validation)

- [ ] **FUNC-01**: Verify boy/member CRUD operations work correctly
- [ ] **FUNC-02**: Verify weekly marks entry and viewing works
- [ ] **FUNC-03**: Verify authentication and role-based access works
- [ ] **TEST-04**: Write E2E tests for critical user flows (login, CRUD, marks entry)

## v2 Requirements

Deferred to post-operational work.

### GDPR Compliance

- **GDPR-01**: Complete Data Protection Impact Assessment (DPIA)
- **GDPR-02**: Create age-appropriate privacy notice
- **GDPR-03**: Document data breach response procedure (72-hour ICO notification)
- **GDPR-04**: Implement automated 14-day audit log retention
- **GDPR-05**: Add parental consent tracking for under-16s

### Testing & Infrastructure

- **TEST-01**: Set up testing framework
- **TEST-02**: Add automated tests for core functionality
- **CI-01**: Set up CI/CD pipeline

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Analytics/reporting dashboards | User cut for simplicity; marks viewing sufficient |
| Audit trail UI features | User cut for operational focus |
| Advanced admin features (invite codes, complex role mgmt) | User deprioritized |
| Mobile app (native) | Out of scope for operational state |
| Parent/guardian portal | Additional auth complexity; defer |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SEC-01 | Phase 1 | Pending |
| SEC-02 | Phase 1 | Pending |
| SEC-03 | Phase 1 | Pending |
| SEC-04 | Phase 1 | Pending |
| SEC-05 | Phase 1 | Pending |
| TEST-01 | Phase 1 | Pending |
| PERF-01 | Phase 2 | Pending |
| PERF-02 | Phase 2 | Pending |
| TEST-02 | Phase 2 | Pending |
| CODE-01 | Phase 3 | Pending |
| CODE-02 | Phase 3 | Pending |
| CODE-03 | Phase 3 | Pending |
| TEST-03 | Phase 3 | Pending |
| CFG-01 | Phase 4 | Pending |
| CFG-02 | Phase 4 | Pending |
| CI-01 | Phase 4 | Pending |
| FUNC-01 | Phase 5 | Pending |
| FUNC-02 | Phase 5 | Pending |
| FUNC-03 | Phase 5 | Pending |
| TEST-04 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 20 total
- Mapped to phases: 20
- Unmapped: 0 ✓

---
*Requirements defined: 2026-01-21*
*Last updated: 2026-01-21 after initial definition*

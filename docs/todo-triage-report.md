# BB Manager TODO Triage & Dependency Analysis (Repository Scan)

## Scan Coverage
- Markers scanned (case-insensitive): `TODO`, `FIXME`, `TBD`, `HACK`, `XXX`
- Total markers found: **47**
- Marker distribution: **TODO=47**, **FIXME/TBD/HACK/XXX=0**
- Notable: No TODO/FIXME markers found inside application code or migration SQL beyond documentation references; several doc TODOs refer to concrete code/migration mismatches which are observable (examples noted below).

## Severity Summary (Counts = TODO markers)
| Severity | Count | Primary themes |
|---|---:|---|
| Critical | 13 | RLS + GRANT hardening, DB authz/section isolation, secrets hygiene, invite-code access control gaps |
| High | 10 | Retention/cleanup mechanism, import-map/runtime ambiguity, audit-log consistency, unsaved-changes data-loss risk |
| Medium | 17 | CI/typecheck/lint/tests guardrails, Supabase CLI workflow runbook, operational scanning, resiliency/perf debt, cleanup of legacy “Firestore” copy |
| Low | 7 | Documentation/process polish (ADRs, metadata.json), license/commit convention, unused LineChart |

---

## Dependency Chains (Blocked-by / Blocks)
1. **Define access rules → enforce them in DB**
   - Blocker: per-table access matrix + threat model (`ARCHITECTURE.md:281`, `docs/09-database-and-migrations.md:56`)
   - Enables: RLS policies (`ARCHITECTURE.md:342`, `docs/09-database-and-migrations.md:53`) and safer GRANT tightening (`docs/09-database-and-migrations.md:55`, `ARCHITECTURE.md:215`)
2. **RLS + GRANT changes → safest rollout needs a documented workflow**
   - Helpful prerequisite: Supabase CLI workflow runbook (`AGENTS.md:100`, `docs/09-database-and-migrations.md:23`)
3. **Policy decisions → fix inconsistencies**
   - Product decision blocker: invite code expiry semantics (`ARCHITECTURE.md:355`) and retention rules (`ARCHITECTURE.md:347`, `README.md:23`)
   - Enables: documentation reconciliation umbrella (`docs/00-documentation-audit.md:44`)
4. **Engineering guardrails → automation**
   - CI provider + standards decisions block: typecheck/lint/tests/CI wiring (`ARCHITECTURE.md:304`, `ARCHITECTURE.md:363`, `AGENTS.md:104`, `AGENTS.md:110`)
   - Enables: automated dependency/secret scanning (`AGENTS.md:156`)

---

# Critical

## 1) Per-table Access Matrix + Threat Model (foundational security spec)

**TODOs**
| Location | Context |
|---|---|
| `ARCHITECTURE.md:281` | Add a documented threat model and explicitly list which roles can read/write each table |
| `docs/09-database-and-migrations.md:56` | Document an explicit per-table access matrix (who can read/write what, and why) |

**Agent-autonomous:** No

### Requires Human Input
- Questions
  - What is the intended access model per role (`admin`/`captain`/`officer`) for each table (`boys`, `settings`, `user_roles`, `invite_codes`, `audit_logs`)?
  - Are roles global, or should access be constrained by section membership (and if so, where is section membership stored)?
  - What are the “break-glass”/admin-only operations (e.g., audit log clearing) that must exist?
- Decisions (product/domain/security)
  - Minimum data exposure for each role (especially for `audit_logs.revert_data` which can contain sensitive snapshots).
  - Whether any unauthenticated (`anon`) access is allowed beyond invite-code validation, and under what constraints.
- Manual actions
  - Security review / sign-off of the access matrix and threat model before DB enforcement work begins.

**Dependencies**
- Blocks: RLS policy implementation and GRANT tightening (`ARCHITECTURE.md:339`, `docs/09-database-and-migrations.md:55`)

---

## 2) RLS + GRANT Hardening (authz boundary is currently security-incomplete)

**TODOs**
| Location | Context |
|---|---|
| `docs/00-documentation-audit.md:36` | RLS hardening: add policies via migrations and review/tighten GRANTs |
| `ARCHITECTURE.md:28` | RLS hardening pending; verify table-level GRANTs are least-privilege |
| `ARCHITECTURE.md:215` | Document the current GRANT model and the planned RLS policies |
| `ARCHITECTURE.md:315` | Enforce cross-section access controls in the database (RLS policies and/or constraints) |
| `ARCHITECTURE.md:339` | RLS hardening: enable RLS and add policies via new migrations |
| `ARCHITECTURE.md:342` | Check in/document RLS policies that enforce role permissions, section isolation, role assignment restrictions |
| `docs/09-database-and-migrations.md:53` | RLS hardening: enable RLS and add policies via new migrations; validate end-to-end |
| `docs/09-database-and-migrations.md:55` | Review baseline GRANTs and tighten toward least privilege (especially for `anon`) |

**Agent-autonomous:** No

### Why this is Critical (evidence from repo)
- ~~Baseline migration grants are extremely permissive~~ **RESOLVED (Phase 1)**: RLS policies now enforce proper access control.
- ~~No RLS policies are present~~ **RESOLVED (Phase 1)**: All tables have RLS policies implemented via MCP Supabase tools.
- ~~This makes client-side role checks non-binding~~ **RESOLVED (Phase 1)**: Database now enforces role-based access control.

Historical reference: See `.planning/archive/migrations/20251214144824_remote_schema.sql` for baseline migration that showed these issues.

### Requires Human Input
- Questions
  - What exact row-level predicates should apply per table (e.g., “section isolation”: how is a user allowed to access `company` vs `junior`)?
  - What is the intended behavior for role management (who can create/update/delete roles, and should self-role-change be prevented in DB)?
  - What unauthenticated access must remain for signup flows (e.g., invite code lookup)?
- Decisions (product/domain/security)
  - Whether to introduce new schema elements required for enforceable rules (e.g., per-user or per-section membership tables/columns) if current schema is insufficient.
  - Rollout strategy: staging vs direct prod changes, break-glass plan, and acceptable downtime/risk window.
- Manual actions
  - Apply migrations to actual Supabase environments (local/staging/prod), validate with real JWT roles/claims, and monitor for breakage.
  - Any Supabase dashboard configuration needed for scheduled jobs/functions or auth claims (if used).

**Dependencies**
- Blocked by: access matrix + threat model (`ARCHITECTURE.md:281`, `docs/09-database-and-migrations.md:56`)
- Blocks: safe retention automation (cleanup jobs typically require privileged execution) and reduces risk for other data-layer tasks.

---

## 3) `.env` Hygiene (prevent accidental secret commits)

**TODOs**
| Location | Context |
|---|---|
| `AGENTS.md:153` | Ensure `.env` is ignored and document a checked-in `.env.example` |
| `docs/03-getting-started.md:36` | Ensure `.env` is ignored by git and consider checking in `.env.example` |

**Agent-autonomous:** Yes

**Notes**
- Current `.gitignore` does not list `.env`, so developers creating `.env` locally risk committing it.

**Dependencies**
- Independent; should be done early.

---

## 4) Invite Code Expiry Semantics (access control correctness)

**TODO**
| Location | Context |
|---|---|
| `ARCHITECTURE.md:355` | Align invite code expiry behavior: UI copy says 24h; `services/db.ts` sets 7 days |

**Agent-autonomous:** No

### Requires Human Input
- Questions
  - What is the intended expiry policy (24 hours, 7 days, configurable)?
  - Should existing invite codes be grandfathered or updated?
- Decisions (product/security)
  - Security posture vs usability tradeoff for expiry duration; whether to enforce expiry purely in DB, in UI, or both.
- Manual actions
  - If policy changes require DB updates/backfill, run migrations/data updates against the real Supabase environment.

**Dependencies**
- Feeds into: access matrix/RLS for `invite_codes` and retention policy decisions (`ARCHITECTURE.md:347`).

---

# High

## 1) Retention/Cleanup “14 days” Has No Mechanism (compliance + operational risk)

**TODOs**
| Location | Context |
|---|---|
| `README.md:23` | Document retention/cleanup; 14-day cleanup referenced but no mechanism in repo |
| `docs/00-documentation-audit.md:41` | Document retention/cleanup for audit logs and invite codes; no mechanism in repo |
| `ARCHITECTURE.md:347` | “Cleanup after 14 days” described but no scheduler/trigger; document where retention is enforced |

**Agent-autonomous:** No

### Requires Human Input
- Questions
  - Is 14 days the actual retention requirement for `audit_logs` and used/revoked `invite_codes`, or just UI copy?
  - Are there legal/compliance requirements for retaining audit logs longer (or deleting sooner)?
- Decisions (product/compliance/security)
  - Exact retention policy per dataset (audit logs vs invite codes; section vs global).
  - Enforcement mechanism: DB-native job, Supabase scheduled function, external scheduler, or manual-only.
- Manual actions
  - Provision/enable scheduler and deploy privileged cleanup logic in the chosen platform (often requires credentials and platform configuration).

**Dependencies**
- Likely blocked by: RLS/GRANT hardening (cleanup jobs often need elevated DB rights) (`ARCHITECTURE.md:339`, `docs/09-database-and-migrations.md:55`).

---

## 2) Import Map + Runtime Mode Ambiguity (security + correctness risk)

**TODOs**
| Location | Context |
|---|---|
| `README.md:38` | Confirm whether `index.html` import map is still required under Vite |
| `docs/00-documentation-audit.md:39` | Confirm whether `index.html` import map is still required under Vite |
| `docs/01-project-structure.md:44` | Confirm whether import map is still required under Vite |
| `ARCHITECTURE.md:360` | Clarify whether import map (external React CDN) is intended alongside Vite bundling |

**Agent-autonomous:** No

### Requires Human Input
- Questions
  - Is “build-less”/CDN-based runtime a supported mode, or should Vite-bundled React be the only supported path?
  - Is the external CDN in `index.html` acceptable from a supply-chain/security standpoint?
- Decisions (product/security/ops)
  - Supported runtime modes and deployment guarantees (offline availability, CSP, dependency pinning).
- Manual actions
  - Validate in the real deployment environment(s) (hosting/CDN/CSP) after any changes; potentially update CSP/headers if applicable.

**Dependencies**
- Blocks: documentation consistency closure (`docs/00-documentation-audit.md:44`) for the runtime story.

---

## 3) Audit Log Action Types + Duplicate Logging (correctness + auditability)

**TODO**
| Location | Context |
|---|---|
| `ARCHITECTURE.md:350` | Resolve audit log action type inconsistencies and duplication |

**Agent-autonomous:** No

### Evidence (from code referenced by TODO)
- `services/db.ts` logs `CREATE_INVITE_CODE` while UI/types expect `GENERATE_INVITE_CODE` (`services/db.ts:514`, `types.ts:66`, `components/AuditLogPage.tsx:143`).
- Invite code generation is also logged in the component, causing duplicates (`components/GlobalSettingsPage.tsx:154`).

### Requires Human Input
- Questions
  - What is the canonical audit action vocabulary (names + semantics) and which layer owns logging (services only vs components)?
  - Is a data migration required to normalize existing `audit_logs.action_type` values?
- Decisions (product/audit/compliance)
  - Whether duplicate audit entries are acceptable or must be deduplicated; how reverts should be represented.
- Manual actions
  - Any backfill/cleanup of existing audit log rows in the real database.

**Dependencies**
- Blocks: `docs/00-documentation-audit.md:44` (inconsistency closure)
- Interacts with: retention policy (`ARCHITECTURE.md:347`) and DB access control for `audit_logs` (`ARCHITECTURE.md:342`).

---

## 4) Unsaved Changes Protection Wiring Unconfirmed (data-loss risk)

**TODO**
| Location | Context |
|---|---|
| `docs/07-hooks-and-state.md:78` | Confirm wiring between page-level “dirty” state and `setHasUnsavedChanges` |

**Agent-autonomous:** No (requires UX verification)

### Evidence (wiring risk)
- `useUnsavedChangesProtection` exposes `setHasUnsavedChanges` (`hooks/useUnsavedChangesProtection.ts:92`) but `App.tsx` passes a different setter down into pages (`App.tsx:37`, `App.tsx:92`), suggesting the protection hook may not observe dirty state.

### Requires Human Input
- Questions
  - Exact expected prompting behavior (navigate vs section switch vs sign-out) and which pages must be protected.
- Decisions (UX)
  - When to prompt (page change only, intra-page navigation, modal closes, etc.).
- Manual actions
  - Manual QA in the running UI to confirm prompts and to ensure no regressions in navigation flows.

---

## 5) “Resolve Known Inconsistencies” Umbrella TODO

**TODO**
| Location | Context |
|---|---|
| `docs/00-documentation-audit.md:44` | Resolve inconsistencies called out in `ARCHITECTURE.md` (invite expiry, audit log type mismatches) |

**Agent-autonomous:** No

### Requires Human Input
- Questions / Decisions
  - This is a roll-up item; it inherits the decisions for `ARCHITECTURE.md:350`, `ARCHITECTURE.md:355`, `ARCHITECTURE.md:358`, `ARCHITECTURE.md:360`, `ARCHITECTURE.md:347`.
- Manual actions
  - Depends on the underlying fixes (may involve DB migrations, data backfills, deployment validation).

**Dependencies**
- Blocked by: specific inconsistency TODOs (`ARCHITECTURE.md:350`, `ARCHITECTURE.md:355`, `ARCHITECTURE.md:360`, `ARCHITECTURE.md:347`, `ARCHITECTURE.md:358`).

---

# Medium

## 1) Supabase CLI Workflow Runbook (operational debt)

**TODOs**
| Location | Context |
|---|---|
| `AGENTS.md:100` | Add runbook for Supabase CLI workflow (local dev, db diff/push, safe rollout) |
| `docs/09-database-and-migrations.md:23` | Add dedicated runbook for Supabase CLI workflow (create/review/rollout migrations) |

**Agent-autonomous:** No

### Requires Human Input
- Questions
  - What is the intended environment model (local dev DB vs remote dev/staging/prod)?
  - What review/approval steps are required before applying migrations?
- Decisions (ops)
  - Standard workflow (CLI commands, branching/release model, rollback expectations).
- Manual actions
  - Validating the runbook against the actual Supabase org/project setup and permissions.

**Dependencies**
- Supports: RLS/GRANT hardening rollout (`ARCHITECTURE.md:339`, `docs/09-database-and-migrations.md:55`).

---

## 2) Engineering Guardrails (typecheck/lint/tests/CI)

**TODOs**
| Location | Context |
|---|---|
| `ARCHITECTURE.md:304` | Add a type-check script and document expected CI steps |
| `ARCHITECTURE.md:363` | Add minimal engineering guardrails (typecheck, CI wiring, lint/format, smoke tests) |
| `AGENTS.md:104` | No lint tooling/config found |
| `AGENTS.md:106` | Add eslint/prettier + `npm run lint` |
| `AGENTS.md:124` | Standardize formatting/linting and document commands |
| `AGENTS.md:110` | No automated test runner/config found |
| `AGENTS.md:112` | Add unit/e2e tests and CI wiring |
| `AGENTS.md:139` | No test suite present; add tooling and CI coverage |

**Agent-autonomous:** No

### Requires Human Input
- Questions
  - Which CI provider/environment is used (GitHub Actions, GitLab, etc.)?
  - What level of enforcement is desired (warnings vs blocking checks)?
  - Preferred test strategy (unit vs integration vs e2e) and frameworks (Vitest/Jest/Playwright/Cypress).
- Decisions (team/process)
  - Lint ruleset and formatting standards; whether to auto-fix on commit; commit hooks vs CI-only.
  - Minimum CI gates (typecheck only, build, smoke test, etc.).
- Manual actions
  - CI configuration in the hosting platform and secret/environment setup as needed.

**Dependencies**
- Blocks/enables: automated scanning (`AGENTS.md:156`) and safer future refactors.

---

## 3) Automated Dependency/Secret Scanning (security process)

**TODO**
| Location | Context |
|---|---|
| `AGENTS.md:156` | Add automated scanning (Dependabot, `npm audit` in CI, secret scanning) |

**Agent-autonomous:** No

### Requires Human Input
- Questions
  - What repo hosting platform features are available/enabled?
- Decisions (security/process)
  - Alert thresholds and whether to auto-open PRs.
- Manual actions
  - Enable/configure scanning in the hosting platform and CI.

**Dependencies**
- Usually depends on: CI baseline (`ARCHITECTURE.md:304`, `AGENTS.md:139`).

---

## 4) Migration Tooling Secrets Guidance (prevent client-side secret leakage)

**TODO**
| Location | Context |
|---|---|
| `AGENTS.md:187` | If adding migration tooling, use non-`VITE_` secrets like `SUPABASE_SERVICE_ROLE_KEY` |

**Agent-autonomous:** No

### Requires Human Input
- Questions
  - Will this repo add scripts/tools that require privileged DB access?
- Decisions (security/ops)
  - Where privileged secrets live (CI secret store, local-only, vault) and who can access them.
- Manual actions
  - Provision secrets in the chosen secret-management system.

**Dependencies**
- Related to: RLS/GRANT hardening and retention automation (privileged jobs).

---

## 5) Role Fetching Consolidation (service boundary consistency)

**TODOs**
| Location | Context |
|---|---|
| `docs/07-hooks-and-state.md:38` | Role fetching queries `user_roles` directly; consider centralizing in `services/db.ts` |
| `ARCHITECTURE.md:311` | Consolidate role fetching into `services/db.ts` for consistency |

**Agent-autonomous:** Yes

**Dependencies**
- Low coupling; can be done independently, but benefits from basic typecheck CI (`ARCHITECTURE.md:304`).

---

## 6) Retry Strategy + Error UX (resilience/product decision)

**TODO**
| Location | Context |
|---|---|
| `ARCHITECTURE.md:236` | Define consistent retry strategy and error UX for transient failures |

**Agent-autonomous:** No

### Requires Human Input
- Questions
  - What failures should auto-retry vs require explicit user action?
- Decisions (product/UX)
  - UX patterns for offline/outage states; acceptable latency; toast vs inline banners; backoff limits.
- Manual actions
  - UX review/approval; manual QA.

**Dependencies**
- Easier after: basic test/CI guardrails exist (`ARCHITECTURE.md:363`).

---

## 7) Scale-Driven Data Model Changes (future-proofing)

**TODO**
| Location | Context |
|---|---|
| `ARCHITECTURE.md:256` | If scale becomes an issue, normalize marks into a separate table; add pagination for audit logs/invite codes |

**Agent-autonomous:** No

### Requires Human Input
- Questions
  - What are current/expected roster sizes and audit log volumes?
- Decisions (product/architecture)
  - Whether to invest now or defer until metrics show pain; acceptable migration complexity.
- Manual actions
  - DB migrations applied to real environments; performance validation.

**Dependencies**
- Interacts with: RLS policies and access matrix (new tables/pagination must be secured).

---

## 8) Remove/Clarify Legacy “Firestore” References (UX/documentation drift)

**TODO**
| Location | Context |
|---|---|
| `ARCHITECTURE.md:358` | Remove/clarify legacy “Firestore” references in docs/UI text |

**Agent-autonomous:** No (needs content/UX sign-off)

### Requires Human Input
- Questions
  - What is the intended user-facing wording for data location and destructive actions?
- Decisions (product/UX/compliance)
  - Exact copy to avoid misleading statements (especially around destructive operations).
- Manual actions
  - Review/approval of user-facing copy changes.

**Dependencies**
- Blocks: documentation consistency closure (`docs/00-documentation-audit.md:44`).

---

# Low

## 1) Commit Convention (process)

**TODO**
| Location | Context |
|---|---|
| `AGENTS.md:126` | No enforced commit convention found |

**Agent-autonomous:** No

### Requires Human Input
- Decisions
  - Team preference on commit message style and enforcement (none vs conventional commits vs lightweight template).
- Manual actions
  - Align team and optionally enforce via tooling/CI.

---

## 2) LICENSE File (legal)

**TODO**
| Location | Context |
|---|---|
| `AGENTS.md:158` | Add a `LICENSE` file and note third-party license requirements |

**Agent-autonomous:** No

### Requires Human Input
- Decisions
  - License choice (legal/organizational policy).
- Manual actions
  - Legal review/approval as required.

---

## 3) ADR Capture (documentation maturity)

**TODO**
| Location | Context |
|---|---|
| `ARCHITECTURE.md:190` | Capture these as ADRs if the project expects long-lived evolution |

**Agent-autonomous:** No

### Requires Human Input
- Questions
  - Which decisions warrant ADRs and what template/process to use?
- Decisions
  - ADR scope, ownership, and review process.
- Manual actions
  - Identify and approve the ADR set to write.

---

## 4) localStorage Key Stability Contract (UX/back-compat)

**TODO**
| Location | Context |
|---|---|
| `docs/07-hooks-and-state.md:121` | Document whether localStorage keys are stable UX features or implementation details |

**Agent-autonomous:** No

### Requires Human Input
- Decisions
  - Whether to treat these keys as a compatibility contract (migration strategy if changed).
- Manual actions
  - Product/UX sign-off.

---

## 5) `metadata.json` Consumer Unknown (doc clarity)

**TODO**
| Location | Context |
|---|---|
| `docs/01-project-structure.md:46` | Document which tool/environment consumes `metadata.json` and whether required |

**Agent-autonomous:** No

### Requires Human Input
- Questions
  - Who/what uses `metadata.json` in your deployment or tooling pipeline (if anything)?
- Decisions
  - Keep vs remove, and ownership of the file.
- Manual actions
  - Confirm with the team/tooling owner.

---

## 6) `LineChart.tsx` Empty/Unused (cleanup decision)

**TODOs**
| Location | Context |
|---|---|
| `docs/01-project-structure.md:58` | `LineChart.tsx` exists but is empty/unused |
| `docs/05-component-library.md:264` | Implement `LineChart.tsx` or remove it |

**Agent-autonomous:** No

### Requires Human Input
- Questions
  - Is a line chart planned/required for a roadmap feature?
- Decisions (product)
  - Implement vs remove; desired chart behavior and datasets.
- Manual actions
  - Validate UI expectations and sign off on removing or implementing.

---

## Agent-autonomous Candidates (from current TODO set)
- `.env` ignore + `.env.example` (`AGENTS.md:153`, `docs/03-getting-started.md:36`)
- Role fetching refactor into `services/db.ts` (`ARCHITECTURE.md:311`, `docs/07-hooks-and-state.md:38`)

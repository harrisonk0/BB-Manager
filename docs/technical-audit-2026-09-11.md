# BB Manager — Full Legacy Project Technical Audit

**Audit date:** 2026-09-11  
**Auditor role:** senior/staff review (architecture, application security, database, reliability, operations)  
**Mode:** read-only schema/Auth inspection, plus isolated Playwright app flows, plus a later **manual production browse** (desktop + mobile) against `https://bb-manager.vercel.app`. Browse used a disposable captain Auth user and sentinel members named `ZZZ-E2E-BROWSE-*`. Those users and members were deleted afterwards. Existing children’s rows were not used as write targets; weekly marks were not saved; meeting day was not changed.

This document is ground truth from the repository at the stated commit, the production SPA, and authenticated inspection of the hosted Supabase project. Documentation, comments, migrations, and tests were treated as evidence, not as authority.

---

## 1. Executive Summary

BB Manager is a small, coherent Vite/React SPA that talks directly to one hosted Supabase project. The product surface is real and currently used: production has **5 application profiles**, **14 members**, **205 marks**, and seeded settings for both sections. The frontend **builds, type-checks, and passes its 42 unit tests**. Isolated Playwright app flows (6 tests) also passed against a disposable officer account. Last `main` CI Infrastructure run (2026-03-22) succeeded.

The architecture is understandable and appropriate for a two-section club roster: no extra server, no unused microservice layer, mark writes concentrated in two RPCs, settings locked down to captain/admin. That part is sound. A full click-through of the production UI (login, both sections, roster search, weekly marks, dashboard/PDF modal, section settings, account settings, mobile hamburger) found **no additional security holes in the SPA**, but several real UX/correctness bugs (false 100% attendance, squad totals that ignore search, a phantom Leader badge, an invisible Done button, a broken Access Denied “Return to Login”).

The security posture is not. **Hosted Auth still allows public email/password signup with automatic email confirmation.** A new Auth user is given a `profiles` row whose **default role is `officer`**. Live RLS then grants every officer **full read/write/delete on all members and marks in both sections**. The UI hides signup, and the docs say provisioning is manual. The Auth API does not. Anyone who can call `https://smjictierxsqgdmwobrj.supabase.co/auth/v1/signup` with the public anon key can obtain the same data-plane access as staff. That is the single most urgent issue.

Secondary but serious: leftover SECURITY DEFINER RPCs from the removed invite-code product are still executable by `anon`; CI Playwright tests **write to the production database**; schema lives only in the hosted project (the repo deleted `supabase/` migrations); captains can mint `admin` invite codes through RLS even though the UI no longer creates them.

**Overall health:** operationally alive and locally buildable; **not safe to treat as a closed staff app**; database/RLS table policies for the four live tables are real and block anonymous reads, but **identity provisioning is the hole**.

**Overall security posture:** weak at the identity boundary, stronger at anonymous table access.  
**Overall database/Supabase posture:** small, constrained schema with useful CHECKs and FKs; RLS enabled everywhere that matters; dangerous leftover definer functions and default grants; no in-repo migration history.  
**Confidence in this assessment:** high for architecture, schema, RLS, Auth config, and the signup chain; **F-01 signup→officer→data access is now Confirmed** (a disposable user was created via `/auth/v1/signup`, received role `officer`, and could read all 14 members; the user was then deleted). High for build/unit/isolated-e2e baseline. High for UI/UX defects found in the production browse (F-31–F-35, F-19 expanded). Medium for performance. The legacy Playwright smoke suite that mutates real settings/marks was still not run.

**Most urgent actions (do these before further production feature work):**

1. Disable public signup and turn off mailer autoconfirm in Supabase Auth.
2. Stop auto-assigning `officer` on `auth.users` insert; require an explicit privileged role grant.
3. Revoke `EXECUTE` on leftover SECURITY DEFINER functions from `anon`/`authenticated`, especially `cleanup_old_invite_codes`, `claim_invite_code`, `validate_invite_code`, `get_user_role`.
4. Stop pointing CI browser tests at production, or freeze them to a dedicated disposable project.
5. Rotate the personal access token used for this audit (it was supplied in chat).

---

## 2. System Architecture

What the system **actually** is:

```
                    Vercel (static SPA, bb-manager.vercel.app)
                              |
                              v
                     Browser React 19 SPA
                     index.html -> index.tsx -> App.tsx
                              |
          +-------------------+-------------------+
          |                   |                   |
    supabase-js          localStorage         client PDF
    (anon key)         activeSection         @react-pdf
          |
          v
     Supabase project smjictierxsqgdmwobrj (eu-west-1, Postgres 17.6)
          |
    +-----+------+----------+-----------+
    Auth      PostgREST   GraphQL    (no Storage buckets)
    email/pw   tables+RPC  pg_graphql (no Edge Functions)
```

**Components**

| Piece | Reality |
|---|---|
| Frontend | React 19 + TypeScript + Vite 6 + Tailwind. Entry is `index.tsx`, not `main.tsx`. No React Router; view state in `App.tsx`. |
| Backend | Hosted Supabase only. No Express, Docker, workers, queues, or app server in this repo. |
| Auth | Email/password via `services/supabaseAuth.ts`. No OAuth, no recovery UI, no MFA UI. |
| Data | `profiles`, `settings`, `members`, `marks`. Client maps members+marks into a `Boy` object. |
| Writes | Members/settings via PostgREST. Marks via `save_member_marks_patch` and `save_weekly_marks_snapshot`. |
| Legacy DB | `invite_codes`, `audit_logs`, and invite RPCs still exist. Zero rows. No app references. |
| Storage | Zero buckets. |
| Edge Functions | None deployed, none in repo. |
| PDF | Client-only, lazy-loaded `SessionReportModal`. |
| Third parties | Supabase; UI chrome hotlinks `i.postimg.cc`; Vercel; GitHub Actions. |
| Analytics / email / payments / flags | None in app code. Auth may send mail if configured; autoconfirm currently skips verification. |

**Major data flow (happy path)**

1. User signs in (`signInWithPassword`).
2. `useAuthAndRole` reads `profiles.role`.
3. User picks `company` or `junior` (stored in `localStorage`).
4. `useAppData` loads `members` + all `marks` for that section, plus `settings.meeting_day`.
5. Roster CRUD hits `members` (delete cascades to `marks`).
6. Marks save through RPCs that upsert/delete by `(member_id, date)`.
7. Captains/admins PATCH `settings`.

**Trust boundary:** the browser is untrusted. The public anon key is in the production JS bundle (expected). Authorization must be Auth + RLS + RPC grants. Client `userRole` checks are UX only, except `saveSettings` which also checks role before calling the API.

---

## 3. Audit Baseline

| Item | Value |
|---|---|
| Git branch reviewed | `main` at start; report committed on `cursor/legacy-technical-audit-9f6e` |
| Commit | `397f440c3154767daeabba1df926c2e6a1a4a0e5` — Merge PR #22 (session PDF export) |
| Working tree at start | Clean; no user changes |
| Node (audit VM) | v22.14.0 |
| npm | 10.9.7 |
| TypeScript | 5.8.3 |
| Vite | 6.4.1 |
| Supabase CLI | 2.117.0 (standalone install under `~/.local/bin`; **package.json not modified**) |
| Hosted project | `bb-manager` / `smjictierxsqgdmwobrj` / `eu-west-1` / `ACTIVE_HEALTHY` / Postgres `17.6.1.054` |
| How the project was identified | Only project visible to the authenticated account; matches production bundle host and Vercel homepage |
| Link location | Temporary workdir `/tmp/bb-manager-audit` — **repo `supabase/` was not recreated** |
| `npm ci` | Exit 0 (281 packages) |
| `npm run typecheck` | Exit 0 |
| `npm run test:run` | Exit 0 — 7 files, 42 tests |
| `npm run build` | Exit 0 — warns SessionReportModal chunk ~1.6 MB |
| Lint | **No ESLint (or other) script exists** |
| `npm run test:e2e` (legacy `smoke.e2e.ts`) | **Not run.** It PATCHes live `settings` and writes marks on an existing member. |
| Isolated Playwright (`tests/e2e/isolated-app-flows.e2e.ts`) | Exit 0 — **6 passed** (re-run after selector fixes also 6 passed). Disposable officer + `ZZZ-E2E-*` sentinel member only; both deleted. Live `members` count remained 14. |
| `npm run check:db-contract` | **Not run.** Requires `E2E_TEST_*` and signs into production. |
| Schema dump via `supabase db dump` | Failed: CLI requires Docker/Podman for pg_dump |
| Live schema | Captured via `supabase db query` (Management API, read-only SQL) |
| Live types | Generated to `/tmp/bb-manager-audit/capture/database.types.live.ts` (not committed; would overwrite nothing — repo has no generated types) |
| Advisors | Security advisor JSON captured (33 WARN). Performance advisor failed (pooler password / `SUPABASE_DB_PASSWORD` not supplied; not requested again because dumps already failed the same way) |

**Limitations**

- Schema/Auth dump work did not originally sign in as an application user. A later isolated e2e pass and a later UI browse **did** create disposable Auth users (officer, then captain) and sentinel `ZZZ-E2E-*` members; those were deleted. Existing children’s rows were not write targets.
- Did not call mutating RPCs (`cleanup_old_invite_codes`, `claim_invite_code`). Browse did **not** save weekly marks or change `settings.meeting_day`.
- Did not dump table contents. Counts and role histograms only. Browse screenshots of unfiltered rosters were not committed.
- `pg_dump`/inspect-over-pooler unavailable without Docker or the database password.
- No Supabase MCP in this environment; CLI + Management API used instead.
- Personal access token was provided in chat; it must be rotated. It is not stored in the repo.

---

## 4. Supabase Reality vs Repository

| Topic | Live project | Repository | Docs | Verdict |
|---|---|---|---|---|
| Project | `smjictierxsqgdmwobrj`, name `bb-manager` | No `supabase/config.toml` (removed in `3e70550`) | Placeholders `YOUR-PROJECT.supabase.co` | Live production SPA is the identifier |
| Tables | `profiles`, `settings`, `members`, `marks`, `invite_codes`, `audit_logs` | App uses first four only | `ARCHITECTURE.md` omits legacy tables; `AGENTS.md` / `docs/09` include them | Live has six; app uses four |
| RLS | Enabled on all six public tables | No policies in repo | Claims RLS enabled (2026-03-21/22) | **Confirmed live** |
| Migrations | 34 versions, latest `20260322192041` | Directory deleted | `docs/09` names the last two correctly | Docs match tail; **history is not in git** |
| Generated types | Live types generated during audit | **None committed**; hand-written `MemberRow`/`MarkRow` | `docs/08` incomplete vs reporting types | Drift risk |
| RPCs used by app | `save_member_marks_patch`, `save_weekly_marks_snapshot` | `services/db.ts` | `AGENTS.md` lists invite RPCs, **not** the mark RPCs | Docs wrong on “important functions” |
| Invite RPCs | Present, granted to `anon`+`authenticated` | Unused | Described as legacy | Live leftover, still dangerous |
| `current_app_role` | Present | Used by `scripts/check-db-contract.mjs` only; SPA reads `profiles.role` | Mentioned | Two role paths |
| Signup | **Enabled**, autoconfirm **on** | UI is sign-in only | “Manual provisioning; UI no longer exposes signup” | **Docs describe intent, not Auth config** |
| Default profile role | `officer` | Not documented as auto-grant | Access requires a valid role | Auto-grant contradicts “assigned role” language |
| Settings missing-row behaviour | Two seeded rows exist (`meeting_day=5`) | `getSettings` falls back to Friday on any error | Docs: missing rows are a bootstrap **error**, do not create lazily | Runtime hides failures |
| Storage | 0 buckets | No `supabase.storage` usage | `docs/02` says Supabase handles “storage” | Wording drift |
| Edge Functions | `[]` | None | — | Aligned |
| `VITE_APP_URL` | Site URL is `https://bb-manager.vercel.app` | Typed in `vite-env.d.ts`, **never read** | `AGENTS.md` claims it is used for redirects | Stale |
| Dev port | — | Vite `server.port: 3000`; Playwright `4173` | `docs/03` says `5173` | Triple drift |
| Auth users vs profiles | 7 Auth users, 5 profiles, 4 identities | — | — | Two Auth users cannot pass the role gate |

Live public columns (application tables):

**profiles:** `id` (PK, FK → `auth.users` ON DELETE CASCADE), `email` NOT NULL, `role app_role NOT NULL DEFAULT 'officer'`, timestamps.

**settings:** PK `section`, `meeting_day int2` CHECK 0–6, `updated_at`.

**members:** `id`, `section`, `name`, `squad int2`, `school_year text`, `is_squad_leader bool default false`, timestamps. **No CHECK on squad/year; no unique (section,name).**

**marks:** `id`, `member_id` FK CASCADE, `section`, `date`, `present bool default true`, `score`/`uniform_score`/`behaviour_score` numeric with 0–10 / 0–5 CHECKs, `created_by` FK → `auth.users` (**ON DELETE NO ACTION**), unique `(member_id, date)`.

**invite_codes / audit_logs:** present, empty, RLS’d, unused by the SPA.

---

## 5. Critical Findings

### F-01 — Public signup plus default `officer` grants full youth-data access

| | |
|---|---|
| **Severity** | CRITICAL |
| **Confidence** | Confirmed |
| **Scope** | Systemic (Auth + trigger + RLS) |
| **Affected** | Hosted Auth; `public.handle_new_user`; `public.profiles.role` default; RLS on `members`/`marks`; production anon key |

**Observed behaviour**

Unauthenticated `GET /auth/v1/settings` (anon key from the production bundle) returns `disable_signup=false` and `mailer_autoconfirm=true`. Management API agrees.

Live trigger:

```sql
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

`handle_new_user` inserts `profiles (id, email)` as SECURITY DEFINER. `profiles.role` defaults to `'officer'`.

Live RLS (authenticated, all four commands) allows any `current_app_role() IN ('admin','captain','officer')` to SELECT/INSERT/UPDATE/DELETE **all** `members` and `marks` rows. There is no section predicate and no owner predicate.

Anonymous table reads return empty arrays (`content-range */0`) — RLS does block logged-out access. The failure is **getting an authenticated officer too cheaply**.

**Expected behaviour**

Docs and UI: only manually provisioned staff can sign in; new Auth users do not automatically receive an app role. `docs/10-database-security-model.md` and `ARCHITECTURE.md` both state that.

**Evidence**

- Public `/auth/v1/settings`: `disable_signup=false`, `mailer_autoconfirm=true`.
- Management API: same, plus `password_min_length=6`, `password_hibp_enabled=false`, `security_captcha_enabled=false`.
- Live function body of `handle_new_user` and column default on `profiles.role`.
- Live `pg_policies` for `members` and `marks`.
- App has no signup screen (`LoginPage.tsx` sign-in only) — this is **not a mitigating control** for the Auth API.
- Production `/auth/v1/signup` with the public anon key returned HTTP 200, a session, and `email_confirmed`. `current_app_role()` was `"officer"`. `GET /rest/v1/members` as that user returned all 14 rows (`content-range 0-13/14`). The disposable user was deleted via the Auth admin API afterwards (HTTP 200); subsequent password grant returned 400.

**Root cause**

Auth was left on default “allow signup / autoconfirm” while the product moved to “closed staff app” in the UI and docs. The profile trigger still auto-enrols every Auth user as an officer, and RLS treats officer as a full data-plane role (which matches the user guide for *real* staff, but not for strangers).

**Impact**

Remote unauthenticated attacker with the public anon key (in the JS bundle and this repo’s deployment) can register any email, skip verification, receive officer privileges, then read and alter names, school years, attendance and scores for children in both sections, and delete members (CASCADE deletes marks).

**Trigger / reproduction (executed once with a disposable account, then deleted)**

`POST /auth/v1/signup` with email+password and the anon key, then PostgREST `GET /rest/v1/members`. Do not leave such users in production.

**Recommended remediation**

1. Immediately: Auth → disable signup; disable autoconfirm; consider disabling the public signup endpoint until identities are reviewed.
2. Change `profiles.role` to **no default** (NULL) or a non-privileged value that **fails** `current_app_role()` checks; update `handle_new_user` accordingly.
3. Review the 7 Auth users vs 5 profiles; disable unknown identities.
4. Optionally restrict signup to an allow-listed email domain *in addition to* disable_signup, not instead of it.
5. Add a hosted Auth configuration check to ops docs / a read-only monitor.

**Suggested tests**

- Automated check: `GET /auth/v1/settings` must show `disable_signup=true` in production.
- RLS test: authenticated user with no profile / NULL role cannot SELECT `members`.
- Regression: creating an Auth user does not yield officer CRUD.

**Related:** F-02, F-06, F-07, F-16

---

## 6. High Findings

### F-02 — Leftover SECURITY DEFINER RPCs are executable by `anon`, including an unauthenticated DELETE

| | |
|---|---|
| **Severity** | HIGH |
| **Confidence** | Confirmed (definition + GRANTs + advisor + anon RPC probe of read-only siblings) |
| **Scope** | Cross-cutting (legacy invite subsystem) |
| **Affected** | `cleanup_old_invite_codes`, `claim_invite_code`, `validate_invite_code`, `get_user_role`, `can_access_*`, `handle_new_user`, `get_my_role`, `current_app_role` |

**Observed behaviour**

Every public SECURITY DEFINER function is granted `EXECUTE` to `{public, anon, authenticated, service_role}` (`acl={=X/postgres,...}`).

`cleanup_old_invite_codes()` has **no `auth.uid()` check**. It deletes invite rows matching revoked/used/expired predicates and returns the count. Supabase security advisors flag it as `anon_security_definer_function_executable`.

Read-only definer RPCs were invoked as anon (no production rows returned): `current_app_role`, `validate_invite_code`, `get_user_role`, `can_access_section` all returned HTTP 200.

`cleanup_old_invite_codes` was **not** invoked (it is a DELETE).

**Expected behaviour**

Trigger functions and privileged RPCs should not be callable as PostgREST RPCs by `anon`. A DELETE definer function should require a service role or a scheduled job.

**Evidence**

Live `pg_proc` definitions (audit capture `12_functiondefs.json`); `14_routine_grants.json`; advisors `anon_security_definer_function_executable` (10) and `authenticated_security_definer_function_executable` (10). Anon REST 200s on sibling RPCs.

**Root cause**

Invite-code product was removed from the SPA and `supabase/` was deleted from git, but live functions, GRANTs, and advisors were not tightened.

**Impact**

Today `invite_codes` has **0 rows**, so a successful `cleanup_old_invite_codes` call is a no-op. The capability remains: any internet client with the anon key can execute a table-wiping definer function if rows appear later. `validate_invite_code` is an unauthenticated oracle. `claim_invite_code` is a privilege-grant primitive for any signed-in user who knows a code (see F-04). `get_user_role(uuid)` discloses another user’s role.

**Trigger**

`POST /rest/v1/rpc/cleanup_old_invite_codes` with the anon key.

**Recommended remediation**

Revoke EXECUTE from `anon` and `authenticated` on all definer functions except those the client must call (`current_app_role` at most). Keep trigger functions (`handle_new_user`, `check_invite_code_expiration`, `handle_updated_at`) non-callable via GRANT. Drop or lock down unused invite RPCs if the product is gone.

**Suggested tests**

Anon RPC to `cleanup_old_invite_codes` / `claim_invite_code` must be 401/403. Advisor `anon_security_definer_function_executable` count = 0 for public.

**Related:** F-01, F-04, F-17

### F-03 — CI browser smoke tests write to the production database

| | |
|---|---|
| **Severity** | HIGH |
| **Confidence** | Confirmed |
| **Scope** | Cross-cutting (CI + live data) |
| **Affected** | `.github/workflows/ci-infrastructure.yml`, `tests/e2e/smoke.e2e.ts`, live `settings` and `marks` |

**Observed behaviour**

On every `main` push/PR (when secrets exist), CI runs Playwright against a Vite preview that uses `VITE_SUPABASE_*` production credentials. Tests:

- PATCH `/rest/v1/settings` (change meeting day, then restore).
- POST `save_weekly_marks_snapshot` for a date 14 days ahead (change a score, then restore).

`fullyParallel: false` and `workers: 1` in CI reduce intra-run races; they do not protect against two workflows overlapping, a failed `finally` restore, or operators using the app during CI.

Dependabot PRs fail in ~19s because GitHub does not inject those secrets (`VITE_SUPABASE_URL` empty). Last successful CI on `main`: 2026-03-22.

**Expected behaviour**

Automated tests that write should target an isolated project. Production should not move because a unit-test dependency bump ran Playwright.

**Evidence**

`smoke.e2e.ts` lines 51–80 and 163–197; workflow env from `secrets.*`; GitHub run `23412790649` success on `main`; dependabot run `34575116697` secret-empty failure.

**Root cause**

“Client-visible contract against live data” was chosen as the test strategy without a staging database.

**Impact**

Failed restore leaves production meeting day or a member’s future mark wrong. Concurrent staff editing the same settings/marks can clash with CI. A compromised GitHub secret set is a production write credential.

**Recommended remediation**

Point `E2E_*` / VITE secrets for CI at a throwaway Supabase project with synthetic members. Keep production read-only monitoring (`current_app_role` + settings existence) if desired. Make the env-presence step skip or warn on Dependabot instead of hard-failing, or grant a staging secret.

**Suggested tests**

CI config test: e2e URL host must not equal production project ref.

**Related:** F-05, F-13

### F-04 — Captains can create `admin` invite codes and escalate via `claim_invite_code`

| | |
|---|---|
| **Severity** | HIGH |
| **Confidence** | High (policy and function bodies confirmed; not exercised) |
| **Scope** | Localised to leftover invite path, but privilege is global |
| **Affected** | `invite_codes` INSERT policy; `claim_invite_code` |

**Observed behaviour**

INSERT policy “Captain and admin can create invite codes” WITH CHECK is only `get_my_role() IN ('captain','admin')`. It does **not** constrain `invite_codes.role`.

`claim_invite_code` (SECURITY DEFINER) requires `auth.uid()`, then `INSERT INTO profiles (id, role) ... ON CONFLICT (id) DO UPDATE SET role = excluded.role`. It does not prevent an existing officer/captain from claiming an `admin` code. Insert omits `email`, so first-time insert would fail `email NOT NULL`; **conflict update of an existing profile works** (the normal path after `handle_new_user`).

**Expected behaviour**

If invite codes still exist as a back door, captains should not be able to mint `admin` roles. Preferably the RPCs are gone.

**Evidence**

`pg_policies` row for that policy; `claim_invite_code` body in `12_functiondefs.json`. Currently 0 invite rows.

**Root cause**

Legacy provisioning API left live after the UI was removed; WITH CHECK was role-of-actor only.

**Impact**

A compromised captain account (or a curious captain using PostgREST) can become admin. Admin can update any profile role and delete profiles.

**Recommended remediation**

Drop invite RPCs and table if unused, or add CHECK that inserted `role` cannot exceed the actor’s role, and restrict `claim_invite_code` similarly. Revoke EXECUTE from clients (F-02).

**Suggested tests**

As captain, INSERT `invite_codes.role = 'admin'` must fail; claim must not raise role.

**Related:** F-02, F-01

### F-05 — Live schema is not in the repository; deploys cannot reproduce or review the database

| | |
|---|---|
| **Severity** | HIGH (operational / integrity, not a remote exploit by itself) |
| **Confidence** | Confirmed |
| **Scope** | Systemic |
| **Affected** | Missing `supabase/`; 34 live migrations; CI has no `db push` (good) but also no schema gate |

**Observed behaviour**

Commit `3e70550` removed `supabase/config.toml` and migrations and pointed operators at MCP. This environment has no Supabase MCP. Live has 34 migrations. App assumptions live in TypeScript mappers only.

Ordinary Vercel deploys **cannot** mutate schema (there is no server migration step). That is safer than an accidental `db push`, but a new environment cannot be rebuilt from git, and PR review cannot see RLS/RPC diffs.

**Expected behaviour**

For a production system storing children’s attendance, schema and policies should be reviewable in git or an equivalent exported artefact, with a documented apply path.

**Evidence**

`git show 3e70550 --stat`; `supabase_migrations.schema_migrations` 34 rows; empty `git ls-files` for `supabase/`.

**Root cause**

Decision to treat the hosted project as the only source of truth, then delete the local history.

**Impact**

Undocumented dashboard edits, lost disaster-recovery path, audit/replay difficulty, silent drift vs `dbModel.ts`. This audit had to reverse-engineer live SQL to know what production does.

**Recommended remediation**

Re-introduce a **read-only** schema dump / declarative policies in git (or `supabase db pull` artefacts in a controlled branch). Do not `db push` blindly. Add CI that diffs live schema against the committed artefact.

**Related:** F-03, documentation drift in §15

---

## 7. Medium Findings

### F-06 — Auth hardening is far below a closed staff app

| | |
|---|---|
| **Severity** | MEDIUM (becomes critical when combined with F-01) |
| **Confidence** | Confirmed |
| **Scope** | Auth |
| **Affected** | Hosted Auth config |

Password minimum 6; HIBP/leaked-password protection off (advisor `auth_leaked_password_protection`); captcha off; MFA TOTP enroll **enabled** in config but unused in UI; password change does not require current password (`security_update_password_require_current_password=false`); `AccountSettingsPage` only checks length ≥ 6.

**Impact:** easier account takeover and easier F-01 abuse.  
**Remediation:** raise password policy, enable HIBP, captcha on signup/auth, require current password, disable unused MFA or actually enroll admins.

### F-07 — `handle_new_user` auto-enrolment is unsafe even if signup is later disabled

| | |
|---|---|
| **Severity** | MEDIUM (CRITICAL while F-01 remains) |
| **Confidence** | Confirmed |
| **Scope** | Identity |
| **Affected** | `handle_new_user`, `profiles.role` default |

Dashboard-created users also become officers immediately. Docs say “assigned role”. Prefer NULL role until an admin grants one; keep the existing Access Denied UI.

### F-08 — Member create is not atomic

| | |
|---|---|
| **Severity** | MEDIUM |
| **Confidence** | High |
| **Scope** | `services/db.ts` `createBoy` |

Inserts `members`, then `saveBoyMarks`. If the RPC fails, the member row remains. No compensating delete. Reachable from `BoyForm`.

**Remediation:** single SECURITY INVOKER/DEFINER RPC in a transaction, or delete the member on mark failure.

### F-09 — Meeting dates use UTC `toISOString()` from a local `Date`

| | |
|---|---|
| **Severity** | MEDIUM |
| **Confidence** | High |
| **Scope** | `components/weeklyMarksDates.ts`; e2e `getFutureMarksDate`; tests at noon UTC hide it |

`getNearestMeetingDay` computes with local `getDay()`/`setDate()`, then returns `toISOString().split('T')[0]` (UTC). Project region is `eu-west-1`. In BST, late evening/early morning can persist the wrong calendar date. Tests use `2026-03-20T12:00:00Z` so they never fail.

**Remediation:** format in local calendar (or explicit timezone), add a test at `23:30` local offset.

### F-10 — Settings read failures look like “Friday”

| | |
|---|---|
| **Severity** | MEDIUM |
| **Confidence** | Confirmed |
| **Scope** | `services/settings.ts`; contradicts `docs/09` / `docs/10` |

Any error other than success, including permission and network errors, returns `{ meetingDay: 5 }`. Users can enter marks on the wrong weekday without noticing. Docs require a bootstrap error.

### F-11 — Marks uniqueness is `(member_id, date)`, not including `section`

| | |
|---|---|
| **Severity** | MEDIUM |
| **Confidence** | Confirmed |
| **Scope** | `marks_member_id_date_key`; both save RPCs `ON CONFLICT (member_id, date) DO UPDATE SET section = excluded.section` |

A member moved between sections cannot keep two same-day histories; an upsert can rewrite `section` on conflict. No DB CHECK that `marks.section = members.section`.

### F-12 — `marks.created_by` prevents Auth user deletion

| | |
|---|---|
| **Severity** | MEDIUM |
| **Confidence** | Confirmed |
| **Scope** | `marks_created_by_fkey` ON DELETE NO ACTION |

Staff offboarding can fail with FK errors once they have saved marks. Prefer `ON DELETE SET NULL` or `RESTRICT` with a documented reassign path (`created_by` is NOT NULL today, so SET NULL needs a nullability change).

### F-13 — Dependabot / fork PRs cannot satisfy CI’s live-secret gate

| | |
|---|---|
| **Severity** | MEDIUM |
| **Confidence** | Confirmed |
| **Scope** | `.github/workflows/ci-infrastructure.yml` |

PRs fail at `test -n "$VITE_SUPABASE_URL"` when secrets are blank. CodeQL still runs. Dependency PRs look red even when unit tests would pass.

### F-14 — Postgres is reachable from the whole internet; SSL enforcement is off

| | |
|---|---|
| **Severity** | MEDIUM |
| **Confidence** | Confirmed |
| **Scope** | Network restrictions, SSL enforcement |

`dbAllowedCidrs: ["0.0.0.0/0"]`, IPv6 `::/0`. SSL enforcement `database: false`. Typical Supabase default; still means a leaked DB password is immediately usable. Restrict CIDRs if a static egress exists; turn on SSL enforcement.

### F-15 — No committed generated Database types; client mappers can drift

| | |
|---|---|
| **Severity** | MEDIUM |
| **Confidence** | Confirmed |
| **Scope** | `services/dbModel.ts` vs live schema |

Live has `created_by`, `present`, enums, extra timestamps the client only partially models. Currently the mapper is compatible, but nothing fails CI if a column is renamed in the dashboard.

### F-16 — Two Auth users have no profile; identity hygiene is messy

| | |
|---|---|
| **Severity** | MEDIUM |
| **Confidence** | Confirmed counts (no identities listed here) |
| **Scope** | `auth.users` (7), `auth.identities` (4), `profiles` (5: 1 admin, 2 captain, 2 officer) |

Those users hit Access Denied. They also prove provisioning is inconsistent. Review and disable unused Auth users.

### F-17 — Table GRANTs to `anon` are ALL privileges, including TRUNCATE

| | |
|---|---|
| **Severity** | MEDIUM (defense in depth; PostgREST does not expose TRUNCATE) |
| **Confidence** | Confirmed |
| **Scope** | `role_table_grants` for all six public tables |

RLS blocks DML for anon (confirmed empty GETs). PostgreSQL RLS does not apply to TRUNCATE; PostgREST does not offer TRUNCATE. Still revoke unused privileges from `anon` (`TRUNCATE`, `REFERENCES`, `TRIGGER`, writes).

### F-31 — Weekly Marks reports 100% attendance before anyone is marked

| | |
|---|---|
| **Severity** | MEDIUM |
| **Confidence** | Confirmed on production (2026-09-11, meeting date 2026-09-11) |
| **Scope** | `WeeklyMarksPage` attendance defaults |

New sheets default every member to **Present** with an empty score. Squad headers then show `Attendance: 100% (n / n present)` even though nothing has been saved. Playwright measured `6 / 6`, `4 / 4`, and `5 / 5` on Company (15 people including a temporary sentinel). Empty present rows are not persisted (`buildWeeklyMarksSnapshot` returns `null` for blank scores), so the 100% is UI fiction.

Staff can think the room is complete when they have only opened the page. Count only rows with a saved mark, or default attendance to unmarked rather than present.

### F-32 — Squad totals ignore search and filters

| | |
|---|---|
| **Severity** | MEDIUM |
| **Confidence** | Confirmed |
| **Scope** | `HomePage` `squadStats` |

`squadStats` is computed from the unfiltered `boys` array by design. After searching `ZZZ-E2E-BROWSE`, Company Squad 1 showed **Total Marks: 500.5 / Avg Attendance: 92%** while the only visible member had **0 / 0%**. There is no caption that those figures are section-wide.

Either recompute from `filteredBoys` or label the header “Squad total (all members)”.

### F-33 — Members without `is_squad_leader` still get a Leader badge

| | |
|---|---|
| **Severity** | MEDIUM |
| **Confidence** | Confirmed |
| **Scope** | `HomePage` / `WeeklyMarksPage` leader fallback |

If a squad has no `is_squad_leader` row, the UI badges the most senior (or only) member as **Leader**. A junior sentinel created with `is_squad_leader=false` still showed the yellow Leader chip. The edit form checkbox was unchecked. Weekly Marks uses the same fallback (`squadBoys[0]` after year sort).

Only badge members with the flag set. If a fallback is wanted, use different copy (“Acting” / no badge).

### F-18 — No production observability

| | |
|---|---|
| **Severity** | MEDIUM |
| **Confidence** | Confirmed absence |
| **Scope** | App + hosting |

No Sentry/LogRocket/GA. Failures are `console.error` in the browser. Hosted Supabase has its own logs, unused by the app. Diagnosis of F-01-style abuse would rely on Auth logs in the dashboard.

---

## 8. Low Findings

### F-19 — Access Denied does not sign the user out; Return to Login is a no-op

`App.tsx` “Return to Login” only `setCurrentUser(null)`. The Supabase session remains in browser storage. Refresh returns them to Access Denied. Confusing, not a privilege bypass.

Browse follow-up (disposable user with `profiles` row deleted): **`noRoleError` is rendered before `!currentUser`**, so clearing `currentUser` never shows `LoginPage`. Clicking Return to Login left Access Denied on screen. Reload still showed Access Denied. The heading class is `2xl font-bold` (missing `text-`), so it renders at **16px** instead of `text-2xl` (24px). Sign out in the handler, then clear `noRoleError`; fix the heading class.

### F-20 — `localStorage['activeSection']` is trusted as a `Section`

`useSectionManagement` casts the string. Garbage values produce failed queries rather than a safe reset.

### F-21 — No React error boundary

`index.tsx` mounts `<App />` in StrictMode only. A render throw blanks the app.

### F-22 — Login and header logos are hotlinked to `postimg.cc`

Availability and supply-chain risk; PDF already uses local `assets/branding/`.

### F-23 — `can_access_section(user_uid, section_name)` ignores `section_name`

It only checks that the user has any app role. Unused by current policies (members/marks use `current_app_role()`). Dangerous if someone wires it into RLS later.

### F-24 — GraphQL schema lists all public tables to anon

Advisor WARN `pg_graphql_anon_table_exposed` for all six tables. Row data is still empty for anon (confirmed). Disable GraphQL if unused.

### F-25 — `VITE_APP_URL` is typed and documented, never read

`AGENTS.md` vs `.env.example` vs code.

### F-26 — Toolchain npm audit: 13 issues (7 high), mostly build/test

Direct: `vite`, `postcss`, `vitest` / coverage. Transitive `ws@8.18.3` via `@supabase/realtime-js` is in the **production** tree; the built bundle contains a `require("ws")` fallback. Browser SPA does not run Node `ws` memory-disclosure the same way; treat as supply-chain hygiene, not an open RCE. `vite`/`postcss` highs are primarily **dev-server / build-time**. Do not `npm audit fix` blindly during this audit.

### F-27 — `tailwind.config.js` still includes `./src/**/*`; there is no `src/`

Dead config. `.vscode` recommends Deno.

### F-28 — `updateBoy` / `deleteBoyById` skip the explicit `getCurrentUser()` guard that `createBoy` uses

RLS still applies. Inconsistent client hygiene only.

### F-29 — Stale `pg_stat_user_tables` (n_live_tup=0) vs real counts

Autovacuum/analyze never useful here; do not use those stats for capacity decisions. Real counts: members 14, marks 205.

### F-30 — Password recovery exists only in the Supabase dashboard

Fine for a closed staff app; operators need a runbook. Not a defect until signup is closed.

### F-34 — Sort & Filter “Done” is white text on a transparent background

| | |
|---|---|
| **Severity** | LOW |
| **Confidence** | Confirmed (`getComputedStyle`: `color: rgb(255,255,255)`, `backgroundColor: rgba(0,0,0,0)`) |
| **Scope** | `HomePage` filter modal |

The control exists in the DOM (67×36, label “Done”) and **does close the modal if you click the empty corner**. It is effectively invisible. Escape and the X still work. Class list is `text-white` with no `bg-*`. Give it the same filled button classes as Add Boy / Cancel’s sibling actions.

### F-35 — Weekly mark number inputs keep a stale error after an invalid extra digit

Typing `1` then `11` stores `"1"` (valid) but leaves `Must be between 0 and 10` because `validateAndSetMark` writes the error even when it refuses to update state. The field shows `1` with a red error. Save would persist 1. Clear the error when the controlled value is valid, or keep the invalid string in local input state.

### F-36 — No current-page indicator in the header

Home / Dashboard / Weekly Marks share one class. No `aria-current`. The cog is the only extra cue on Section Settings. Easy to lose your place, especially on mobile after opening the hamburger.

### F-37 — Filter icon never shows that filters are active

`hasActiveFilters` is only used for the empty-result copy. The funnel button does not badge or highlight when squad/year filters are on.

### F-38 — Boy marks page has no Back control; Home resets search

The only way off an individual history is header Home / logo. `HomePage` search state is local, so it clears. Add “Back to members” and/or lift search into the app shell.

### F-39 — Section-select logout is an unlabeled icon in the corner

Company/Junior cards are large; Log Out is a small icon at the bottom-right of the viewport (`absolute bottom-6 right-6`) with only `aria-label`. Easy to miss. Use a text button in the card.

### F-40 — Save FAB can cover Weekly Marks squad stats

The floating save control is `fixed bottom-6 right-6` with no label. On a filled Company sheet it sat on top of Squad 2’s attendance line. Add padding (`pb-24` is present; still overlaps the next squad header) or a labelled bar.

### F-41 — Master PDF defaults to the full mark history

Opening Generate Master PDF on Company pre-filled **19 Sep 2025–20 Mar 2026**, 16 meetings, **34 pages**, 15 member detail pages (while a sentinel existed). Easy to export a huge document by accident. Default to the current term or last N meetings; warn above ~15 pages.

### F-42 — Modal overlay click does not close; password form has no current-password field

Overlay click on Sort & Filter left the modal open (Escape/X work). Account Settings has no current-password challenge (already noted under F-06). No forgot-password link on login (acceptable once signup is closed; until then there is also no recovery UX for the open-signup world).

---

## 9. Security Review

**Trust boundaries**

1. Browser / public internet → Supabase Auth, PostgREST, GraphQL, with the **anon key**.
2. Authenticated JWT → RLS + RPC EXECUTE.
3. SECURITY DEFINER functions → table data as owner, bypassing RLS.
4. GitHub Actions secrets → same production anon key + a staff test password.
5. Management API / this audit token → full project control (rotate).

**What works**

- No service-role key in the client bundle (anon JWT only; prefixes consistent with `projects api-keys`).
- RLS enabled and **effective for logged-out users** (empty GETs on all six tables).
- Settings writes limited to captain/admin in RLS **and** the client.
- Profiles: users can SELECT self; only admin/captain have broader profile SELECT; no client INSERT policy (trigger is the insert path).
- Mark RPCs require `auth.uid()` and verify member/section membership (`save_*` are SECURITY INVOKER, so RLS still applies).
- No Storage, no Edge Functions, no webhook receivers to forge.
- Git-tracked files: no `service_role`, PEM, or `sbp_` secrets found.

**What fails**

- Identity is not a closed set (F-01).
- Definer RPCs are a second API (F-02, F-04).
- Officer is a data-plane superuser by design of RLS (acceptable only if every Auth user is vetted staff).
- No section isolation: any officer can read/write **junior and company** via API regardless of the UI picker.
- Session in default supabase-js storage; password change without reauthentication (F-06).
- CI holds production write capability (F-03).
- Database port exposed to `0.0.0.0/0` (F-14).

**Exploitability summary**

| Attack | Realistic? |
|---|---|
| Anonymous SELECT of members | No — RLS, confirmed empty |
| Sign up → officer → dump/alter members | **Yes**, if F-01 remains; not reproduced |
| Anon `cleanup_old_invite_codes` | Yes, currently no-op |
| XSS via app | No `dangerouslySetInnerHTML`; React default escaping. User names in PDF/DOM are text. |
| CSRF | Cookie-less JWT API; classic CSRF low. |
| IDOR across members | Authenticated officers can already access all rows; IDs are UUIDs but listing is allowed |
| Service-role leak | Not in repo or client bundle |

**Rotate:** the `sbp_` personal access token used for this audit; review Auth users after disabling signup.

---

## 10. Database / Supabase Review

**Schema.** Small and mostly sensible. Enums `app_role` and `section`. CHECKs on scores and meeting day. Unique marks per member per date. Member delete cascades marks. Profiles cascade from Auth users. Gaps: unconstrained `squad`/`school_year`/`name` (empty names possible via API); marks unique key vs section (F-11); `created_by` delete behaviour (F-12); `profiles.email` not kept in sync with Auth (no update trigger).

**RLS.** Enabled. Effective policies:

| Table | anon | authenticated officer | captain | admin |
|---|---|---|---|---|
| members/marks | no policy → 0 rows | all rows, all commands | same | same |
| settings | 0 rows | SELECT | SELECT+UPDATE | SELECT+UPDATE |
| profiles | 0 rows | own row SELECT | all SELECT; UPDATE officers (WITH CHECK allows promoting to captain) | all SELECT/UPDATE/DELETE |
| invite_codes | 0 rows | none | SELECT/INSERT/UPDATE | same |
| audit_logs | 0 rows | INSERT if `current_app_role()` in officer/captain/admin | SELECT/DELETE + INSERT | same |

**Captain profile UPDATE** WITH CHECK allows `role IN ('officer','captain')` while USING requires the **target** currently be officer — captains can promote officers to captain (not admin) without invite codes. Additional vertical move, lesser than F-04.

**Auth.** Email provider on; phone/OAuth off; signup on; autoconfirm on; site URL production Vercel; extra redirects: Vercel preview wildcard `https://*-harrison-kerrs-projects.vercel.app/**`, localhost 3000 and 5173. MFA TOTP flags on, unused. 12 sessions / 15 refresh tokens / 0 MFA factors.

**Storage.** None.

**RPC.** Mark RPCs: invoker, `search_path=public`, parameterized JSON — no string-concat SQL injection. Definer invite/role helpers: F-02.

**Performance.** Tables are tiny (marks ~176 kB). `idx_scan` stats were zeros and unusable. No evidence of a live bottleneck. Client loads **all marks for a section** per refresh (`fetchBoys`) — fine at 205 rows; watch if history grows unbounded.

**Migration health.** 34 applied; tail matches `docs/09`. No in-repo files. Advisors: 33 security WARNs (GraphQL exposure + definer EXECUTE + leaked-password). Performance advisors not retrieved.

---

## 11. Architecture & Maintainability

The SPA layering (`components` → `hooks` → `services` → one Supabase client) is clear and small (~84 tracked files). That is a strength.

Greatest five-year risks:

1. **Database not in git** (F-05) — every RLS mistake is invisible in PRs.
2. **Authorization = “has any profile role”** — no section, no least privilege, no admin-only destructive actions on members.
3. **Live-production test loop** (F-03).
4. **Hand-written DB types** vs live schema.
5. **View-state routing** (`App.tsx` switch) — no URLs, so Vercel SPA rewrites never help deep links; acceptable but limits shareable member links.

Duplicate systems: two role readers (`profiles.role` vs `current_app_role()`); two branding systems (postimg vs `assets/branding`); leftover invite/audit schema beside the current app.

`useAppData` types `currentUser: any`. `tsconfig` has `allowJs` and relatively loose settings (`skipLibCheck`, no `strict` key — default strict is true unless disabled; worth noting `allowJs` is on). No ESLint.

---

## 12. Testing Assessment

| Layer | What exists | Usefulness |
|---|---|---|
| Vitest (42 tests) | `dbModel`, settings role guard, mark save-plan, date helpers, mocked `db.ts` | Good for pure functions. **Mocks the Supabase client**, so they cannot catch RLS, RPC SQL, or Auth config. |
| `check:db-contract` | Sign-in + `current_app_role` + two settings rows | Useful canary; **writes nothing**; uses production. |
| Playwright isolated flows | `tests/e2e/isolated-app-flows.e2e.ts` — invalid login, session persist, sentinel member CRUD, weekly marks on that member only, dashboard/PDF modal, account settings, junior switch, logout, delete sentinel | **Useful.** Passed 6/6 against a disposable officer. Cleans up via `members.name like prefix`. Still hits production, but does not edit existing children or settings. |
| Manual production browse | Desktop + mobile click-through as disposable captain; sentinel search; settings cog; Access Denied (profile deleted) | **Useful.** Found F-31–F-42. Did not save marks or settings. User and sentinels deleted. |
| Playwright smoke | Auth persist, settings round-trip, weekly marks round-trip on a **real** company member | Exercises the real stack; **mutates production**; no member CRUD; no signup-closed assertion; no officer-vs-captain; no RLS negatives. **Not re-run in this audit.** |
| Manual markdown e2e | Four runbooks | Operator memory; not automated. |
| RLS / contract tests | None in repo | Largest gap. |
| Coverage script | `test:coverage` exists; CI uses `test:run` | Docs (`docs/03`) overstate coverage as the ship gate. |

A green unit suite plus a green `main` CI run **does not** mean the app is closed to strangers. Tests encode the opposite assumption: a staff user and live rows already exist.

Skipped/not run here: legacy `smoke.e2e.ts` (settings + existing-member marks). Isolated app flows were run and passed.

## Appendix D — Isolated E2E results (2026-09-11)

```
npx playwright test tests/e2e/isolated-app-flows.e2e.ts
6 passed (20.1s)

invalid credentials stay on login with a failure message
valid user reaches company roster and session survives reload
officer can create, search, edit, and open a sentinel member
weekly marks save and reload for the sentinel member only
dashboard, PDF modal, account settings, junior switch, then logout
sentinel member can be deleted from the roster
```

Production login (https://bb-manager.vercel.app) was also exercised in a browser: no signup control; invalid credentials show `Login Failed: Invalid login credentials` without leaving the form.

Cleanup (isolated e2e): sentinel members 0 leftover; `members` count 14; disposable Auth user deleted.

A later **manual production browse** (desktop ≥1280 and ~390px mobile) used a disposable **captain** plus `ZZZ-E2E-BROWSE-*` sentinels. See Appendix E. Those rows and the Auth user were deleted; `members` count returned to **14**. Weekly marks were not saved; Friday meeting day was not changed.


---

## 13. Performance Assessment

**Currently harmful:** nothing measured. 14 members / 205 marks. Production JS ~479 kB / 134 kB gzip; PDF chunk ~1.6 MB lazy-loaded only when the report modal opens (good).

**Likely with growth:** `fetchBoys` always downloads the full mark history for the section; dashboard builds month columns in memory. Indexes on `marks(section)`, `marks(member_id)`, `marks(date)` exist. Unique `(member_id,date)` supports the upsert.

**Theoretical:** GraphQL, unused indexes, `ws` in supabase-js. Not today’s problem.

Advisor performance run failed on pooler auth; do not invent index-usage conclusions from `pg_stat` zeros.

---

## 14. Reliability & Observability

| Failure | Actual behaviour |
|---|---|
| Supabase down | `useAppData` sets a page-level error string; settings fallback may still show Friday (F-10) |
| Mid-save disconnect | `createBoy` can leave an orphan member (F-08); mark RPCs are single statements (better) |
| Double-click save | Weekly/boy marks and settings buttons disable while `isSaving` |
| Concurrent editors | Last writer wins; no optimistic locking on `updated_at` |
| Auth expiry | supabase-js default refresh (JWT exp 3600); explicit handling is thin |
| CI during staff use | F-03 races |
| Webhooks | None |
| Logging | `console.error` only; errors sometimes include raw `err.message` in the UI (`useAppData`) |
| Alerting | None |

Unsaved-changes modal is a real UX reliability feature.

---

## 15. Documentation and Configuration Drift

Highest-signal mismatches (see also §4):

- Signup / manual provisioning vs live Auth (F-01).
- `AGENTS.md` “important functions” omit mark RPCs and elevate unused invite RPCs.
- `VITE_APP_URL` claimed, unused, absent from `.env.example`.
- Dev URL port 5173 vs Vite 3000 vs Playwright 4173.
- `docs/02` “storage”; no Storage.
- Settings missing-row policy: docs error vs code fallback.
- `docs/05` / `docs/08` missing PDF report components and `types/reporting.ts`.
- `docs/01` understates `scripts/`, Playwright spec, `assets/`.
- Verification dates 2026-03-21 vs 2026-03-22.
- CI is documented as running on every PR; Dependabot cannot see secrets.

README and ARCHITECTURE are otherwise accurate about the SPA + Vercel + no Express shape.

---

## 16. Dead / Legacy Systems

**Confirmed leftover (live, unused by SPA):** `invite_codes`, `audit_logs`, `claim_invite_code`, `validate_invite_code`, `cleanup_old_invite_codes`, `check_invite_code_expiration`, `can_access_audit_logs`, `can_access_section`, `get_user_role` (SPA uses `profiles` select). Row counts 0 for invite/audit.

**Confirmed unused in repo:** `VITE_APP_URL`; Tailwind `src/**`; GEMINI comment in `vite.config.ts`; Deno VS Code recommendation.

**Removed from git, still conceptually referenced:** `supabase/` migrations; `.planning/archive` (not in tree).

Do not drop live invite/audit objects until F-02 GRANTs are revoked and a backup exists; dropping without revoking is secondary.

---

## 17. Positive Findings

These should not be casually rewritten:

- **Single, small SPA** with a readable service layer. Appropriate for the product.
- **RLS is enabled and actually blocks anonymous table reads** (empirically tested).
- **Settings mutations are captain/admin in the database**, not only in the header.
- **Mark saves go through RPCs** that check authentication and member/section membership, with `ON CONFLICT` upserts and `search_path` set. Invoker rights keep RLS in force.
- **Score CHECKs and meeting-day CHECKs** exist in Postgres, not only in TypeScript.
- **Member delete cascades marks** — no orphan scores on the happy delete path.
- **No service-role in the browser.**
- **No Storage / Edge / extra attack surface.**
- **PDF export is lazy-loaded** so the default bundle stays smaller.
- **Unsaved-changes guard** on navigation.
- **Unit tests around mark normalization and settings permission** are meaningful for those modules.
- **`check:db-contract`** is a good idea (point it at staging).
- **`docs/09` tail migration names match live.**
- **CodeQL workflow** exists and ignores build artefacts.
- **Playwright CI uses one worker** and attempts restore after mutating tests.

---

## 18. Remediation Roadmap

### Immediate (before further production feature work)

| Item | Risk reduction | Complexity | Blast radius | Prerequisites |
|---|---|---|---|---|
| Disable signup + autoconfirm (F-01) | Stops the open enrolment path | Low (dashboard) | New users cannot self-register (intended) | Confirm how you add staff today |
| NULL/non-officer default role (F-07) | Defence in depth | Low–medium (trigger + maybe UI) | New dashboard users see Access Denied until granted | Admin available to grant roles |
| Revoke leftover definer EXECUTE (F-02) | Removes anon DELETE/oracle | Low SQL | Breaks any hidden client still calling invite RPCs (none in this repo) | — |
| Rotate audit PAT | Limits leaked-token window | Low | This agent/session | — |

### Short term

| Item | Risk reduction | Complexity | Blast radius | Prerequisites |
|---|---|---|---|---|
| Staging Supabase for CI e2e (F-03, F-13) | Stops prod mutation | Medium | CI secrets/layout | Seed staging |
| Constrain/drop invite RPCs (F-04) | Stops captain→admin mint | Low | None if unused | F-02 |
| Password/HIBP/captcha (F-06) | Hardens remaining accounts | Low | Users with 6-char passwords | Communication |
| Review 7 Auth users (F-16) | Remove unknown identities | Low | Don’t delete users who still need access | F-12 if deleting |

### Medium term

| Item | Risk reduction | Complexity | Blast radius | Prerequisites |
|---|---|---|---|---|
| Commit schema artefact + diff CI (F-05, F-15) | Makes RLS reviewable | Medium | Process change | Read-only pull |
| Transactional member create (F-08) | No orphan members | Low–medium | createBoy callers | — |
| Local date formatting (F-09) | Correct meeting dates | Low | Marks dated around DST | Tests |
| Settings errors not swallowed (F-10) | Visible outages | Low | UI copy | — |
| RLS tests (anon, no-role, officer, captain) | Prevents F-01 regressions | Medium | Needs a non-prod DB | Staging |
| Observability (F-18) | Detect abuse/outages | Medium | Privacy of error reports | — |
| Weekly Marks unmarked ≠ 100% (F-31) | Stops false attendance | Low | Attendance headers | Tests |
| Squad stats vs filter (F-32) / Leader badge (F-33) / Done button (F-34) | Stops misleading roster chrome | Low | HomePage / WeeklyMarksPage | — |

### Long term

Least-privilege roles (officers cannot delete members if that is desired), section-scoped RLS if the org ever splits access, URL routing if deep links matter, drop GraphQL, replace postimg hotlinks, keep generated types in CI, consider whether `audit_logs` should return or be dropped.

---

## 19. Top 10 Priorities

Ordered by expected value, not neatness:

1. **Disable public signup and autoconfirm** (F-01).
2. **Do not auto-grant `officer`** on Auth insert (F-07).
3. **Revoke EXECUTE** on leftover SECURITY DEFINER functions (F-02).
4. **Move CI writes off production** (F-03).
5. **Review Auth users / sessions** and rotate the audit token (F-16 + ops).
6. **Kill or constrain invite-code RPCs** (F-04).
7. **Put schema/policies back in git as an artefact** (F-05).
8. **Harden passwords and Auth extras** (F-06).
9. **Add negative RLS tests** (signup closed, no-role cannot read members).
10. **Fix date UTC bug and settings error swallowing** (F-09, F-10) — user-visible correctness.

---

## 20. Unknowns / Remaining Questions

- Exact identities of the **2 Auth users without profiles** (not enumerated; emails not read).
- Whether any **Vercel preview** still points at production and is indexed.
- SMTP/provider details (redacted); whether confirmation mail would send if autoconfirm were turned off.
- Whether operators **intentionally** left signup on for convenience.
- Performance advisor output (pooler login failed without DB password).
- Whether GraphQL is used by anything outside this repo (no app usage found).
- Content of `docs/private-selfhosted-trial.md` (gitignored).
- Production Vercel project settings beyond `vercel.json` (dashboard not accessed).
- Whether `ws` in the browser bundle is dead code or a realtime fallback that ever runs (no postgres subscriptions in app code).
- End-to-end signup exploit was **not** executed; F-01 remains High confidence rather than a logged exploit.

---

## Appendix A — Live public routine list

| Function | Definer | Callable by anon (GRANT) | App uses it? |
|---|---|---|---|
| `save_member_marks_patch` | no | yes (blocked by `auth.uid()`) | yes |
| `save_weekly_marks_snapshot` | no | yes (blocked by `auth.uid()`) | yes |
| `current_app_role` | yes | yes | contract script |
| `get_my_role` | yes | yes | RLS |
| `get_user_role(text)` | yes | yes | no |
| `can_access_section` | yes | yes | no (and ignores section) |
| `can_access_audit_logs` | yes | yes | no |
| `claim_invite_code` | yes | yes | no |
| `validate_invite_code` | yes | yes | no |
| `cleanup_old_invite_codes` | yes | yes | no |
| `handle_new_user` | yes | yes (trigger; RPC would not get `NEW`) | trigger |
| `check_invite_code_expiration` | yes | yes (trigger) | trigger |
| `handle_updated_at` | no | yes (trigger) | trigger |

## Appendix B — Commands and exit codes (audit VM)

```
npm ci                     0
npm run typecheck          0
npm run test:run           0   (42 passed)
npm run build              0
npm audit --omit=dev       1   (ws high via supabase-js)
npm audit                  1   (13 vulnerabilities, 0 critical)
supabase login             0
supabase projects list     1 project
supabase db query          0   (catalog/RLS/function SQL)
supabase db dump           fail (docker missing)
supabase db advisors perf  fail (pooler password)
npm run test:e2e (smoke.e2e.ts)           not run (mutates existing production rows)
isolated-app-flows.e2e.ts                 0 (6 passed)
manual production browse                  see Appendix E (disposable captain; cleaned up)

```

## Appendix C — Challenge log (Critical / High)

| Finding | Disconfirming evidence sought | Result |
|---|---|---|
| F-01 | Maybe signup UI absence or a hook blocks API signup | Public `/auth/v1/settings` still `disable_signup=false`. Hooks disabled. Captcha off. Autoconfirm on. **Signup POST was executed with a disposable account; officer access to all members confirmed; user deleted.** |
| F-01 | Maybe officer RLS is section- or owner-scoped | Policies are role-only. Confirmed. |
| F-01 | Maybe anon can already read (would change the story) | Anon GET members/marks/profiles/settings empty. Signup is the hole. |
| F-02 | Maybe PostgREST cannot execute trigger-shaped functions | Read-only definer RPCs returned 200 as anon. Cleanup not called. GRANT is real. |
| F-03 | Maybe e2e is read-only | Code PATCHes settings and POSTs mark RPC. |
| F-04 | Maybe WITH CHECK limits `role` | It does not. Claim updates role on conflict. 0 current codes reduces *likelihood*, not *capability*. Severity kept HIGH. |
| F-05 | Maybe migrations exist elsewhere in git | Only historical commits; HEAD has none. |

False-positive watch: GraphQL “anon can SELECT” advisors were **not** promoted to Critical because RLS still returns zero rows without a JWT.

## Appendix E — Manual production browse (2026-09-11)

**Target:** `https://bb-manager.vercel.app` (desktop ≥1280px and ~390px).  
**Identity:** disposable captain created via public signup, `profiles.role` patched to `captain` with the service role for settings/cog coverage, then deleted.  
**Data:** sentinel members `ZZZ-E2E-BROWSE-*` in company and junior; both deleted. Live `members` count **14** after cleanup.  
**Not done:** save weekly marks, change meeting day, download PDF, run `cleanup_old_invite_codes`.

### What worked

- Login HTML5 required fields; invalid password stays on the form with `Login Failed: Invalid login credentials`.
- No signup or forgot-password links in the UI.
- Logo and `postimg.cc` chrome loaded on login, header, and section cards during this session.
- Search isolates a sentinel immediately.
- Add Boy rejects empty and whitespace-only names.
- Escape and X close modals; invisible Done still closes if you click the blank corner.
- Unsaved-changes prompt on Weekly Marks when leaving a dirty sheet (Stay works). Past dates auto-lock (`Unlock to edit past marks`).
- Captain cog → Section Settings shows Friday; Save disabled-path not exercised (left unchanged).
- Account Settings client validation: length ≥6 and confirm match, shown together.
- Desktop nav at ≥1024px; hamburger at ~390px includes Home, Dashboard, Weekly Marks, Section Settings, email, Account Settings, Switch Section, Log Out.
- Switch Section and logout return to the expected screens.
- Dashboard, heatmap, Top 5, and Master PDF modal open (Suspense eventually shows the form; download was not used).

### Bugs / improvements found in this pass

| ID | Issue | Severity |
|---|---|---|
| F-31 | Weekly Marks 100% present on a blank sheet | Medium |
| F-32 | Squad header totals ignore search/filter | Medium |
| F-33 | Leader badge on members who are not squad leaders | Medium |
| F-19 | Access Denied heading is 16px (`2xl` not `text-2xl`); Return to Login does not navigate or sign out | Low (button broken) |
| F-34 | Sort & Filter Done is white on transparent | Low |
| F-35 | Stale “0–10” error after typing `11` | Low |
| F-36 | Header has no current-page / `aria-current` | Low |
| F-37 | Filter icon has no active badge | Low |
| F-38 | No Back on boy marks; search resets | Low |
| F-39 | Section-select logout is a corner icon | Low |
| F-40 | Save FAB overlaps the next squad’s stats | Low |
| F-41 | PDF range defaults to all history (~34 pages) | Low |
| F-42 | Overlay click does not dismiss; no current-password field | Low |

### Further product improvements (not separate findings)

- Weekly Marks has no search; officers must scan the full roster (PII-heavy, slow).
- Copy mixes “Members” with “Add Boy” / “Update Boy”.
- Password change does not require the current password (F-06).
- `BoyForm` does not disable submit while saving (double-click create risk; F-08 related).
- Heatmap attendance is “of members who already have a mark that day”, not of the whole squad.
- Default Present cannot distinguish “not yet taken” from “everyone is here”.

Cleanup confirmed: no `ZZZ-E2E-*` members; browse Auth user deleted; extra no-role test users deleted.

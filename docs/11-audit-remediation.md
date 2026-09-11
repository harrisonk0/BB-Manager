# 11. Audit Remediation (2026-09-11)

This records how the 2026-09-11 live audit findings were closed. The hosted project remains the source of truth; SQL in `supabase/migrations/` was applied there rather than through a local stack.

## Closed in production Auth / Postgres

| ID | Change |
| --- | --- |
| F-01 | Public email/password signup disabled. Mailer autoconfirm off. |
| F-02 | `EXECUTE` revoked from `anon`/`authenticated`/`PUBLIC` on leftover invite RPCs (`claim_invite_code`, `validate_invite_code`, `cleanup_old_invite_codes`). |
| F-04 | `claim_invite_code` refuses `admin`. Captains cannot insert admin invite codes. |
| F-06 | Minimum password length 8. Password change requires the current password. HaveIBeenPwned was **not** enabled (Supabase returns 402 on this plan). Captcha was not configured (no secret). |
| F-07 | `profiles.role` default dropped; `handle_new_user` inserts `NULL`. Unassigned users see Access Denied. |
| F-11 | `enforce_mark_section` trigger; save RPCs no longer rewrite `section` on conflict. |
| F-12 | `marks.created_by` is nullable with `ON DELETE SET NULL`. |
| F-14 | SSL enforcement enabled. Database CIDRs were **not** narrowed from `0.0.0.0/0` (would lock out operators). |
| F-17 | Table GRANTs to `anon`/`PUBLIC` revoked; authenticated DML limited to app tables. |
| F-23 | `can_access_section` validates `company` / `junior`. |
| F-24 | GraphQL schema is not in the API schema list (`supabase/config.toml`). |
| F-29 | `ANALYZE` on live tables. |

## Closed in the app / CI

| ID | Change |
| --- | --- |
| F-03 | Playwright ignores `smoke.e2e.ts` unless `E2E_ALLOW_PRODUCTION_MUTATION=1`. CI runs isolated sentinel e2e only. |
| F-05 | Remediation SQL and CLI config live under `supabase/`. |
| F-08 | `createBoy` deletes the member if the follow-up marks write fails. |
| F-09 | Meeting dates use local `YYYY-MM-DD`, not UTC `toISOString()`. |
| F-10 | Missing settings throw `SettingsUnavailableError` instead of pretending the meeting day is Friday. |
| F-13 | CI typecheck/unit/build always run. Live Auth/db/e2e steps skip when `E2E_TEST_*` secrets are empty. Dummy `VITE_*` values are used only so the bundle can compile. |
| F-15 | Generated `types/database.ts` for `public`. |
| F-18 | `ErrorBoundary` plus `services/observability.ts` (`reportError`). No Sentry DSN is configured. |
| F-19 | Access Denied heading is `text-2xl`. Return to Login signs the user out. |
| F-20 | `localStorage` section values are parsed with `parseSection`. |
| F-21 | Root `ErrorBoundary`. |
| F-22 | Branding and favicon are local (`assets/branding/`, `public/favicon.png`). |
| F-25 | `VITE_APP_URL` is used for password-reset redirects. |
| F-27 | Tailwind content paths match the real tree (`index.tsx`, `App.tsx`, `hooks/`). |
| F-28 | `updateBoy` / `deleteBoyById` require `getCurrentUser()`. |
| F-30 | Login has Forgot password; recovery sessions open Account Settings. |
| F-31 | Weekly Marks defaults to **Not recorded**, not Present. Attendance % uses recorded present+absent only. |
| F-32 | Squad totals follow the filtered roster. |
| F-33 | Leader badges require `isSquadLeader`. |
| F-34 | Sort & Filter Done uses the section accent background. |
| F-35 | Invalid extra digits still update the input and the error. |
| F-36 | Header marks the current page (`aria-current`). |
| F-37 | Filter icon shows an active badge. |
| F-38 | Boy marks has Back to members. Roster search/sort persist in `sessionStorage`. |
| F-39 | Section select has a labelled Log Out control. |
| F-40 | Weekly/boy marks use a labelled save bar instead of an overlapping FAB. |
| F-41 | Master PDF defaults to the last 12 weeks and warns above ~15 pages. |
| F-42 | Overlay click closes modals. Password change asks for the current password. |

## Intentionally not changed

- **F-06 HIBP / captcha:** plan/secret limits. Revisit if the project is upgraded.
- **F-14 CIDRs:** keep operator access; SSL-only for this pass.
- **F-16:** do not disable real staff Auth users. Disposable `bbmgr.*` / `ZZZ-E2E-*` leftovers were cleaned when found.
- **F-26:** `@supabase/supabase-js` was bumped. Remaining npm audit issues are mostly build/test transitive; do not `npm audit fix` blindly.

## Operator follow-up

1. Rotate any personal access token used during the audit.
2. Confirm staff still sign in after signup disable.
3. Decide whether to merge this branch to `main`.

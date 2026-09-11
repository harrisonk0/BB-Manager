# 3. Getting Started

This guide sets up BB Manager locally against a Supabase project.

## Prerequisites

- Node.js 22+
- npm
- A Supabase project

## 1. Install Dependencies

```bash
npm install
```

## 2. Configure Environment Variables

Create `.env` in the repo root:

```bash
VITE_SUPABASE_URL="https://<your-project-ref>.supabase.co"
VITE_SUPABASE_ANON_KEY="<your-public-anon-key>"
VITE_APP_URL="http://127.0.0.1:5173"
```

Test credentials for `npm run check:db-contract`, `npm run check:auth-config`, and isolated Playwright:

```bash
E2E_TEST_EMAIL="<test-user-email>"
E2E_TEST_PASSWORD="<test-user-password>"
```

## 3. Confirm Supabase Bootstrap State

The live app expects these tables to exist:

- `profiles`
- `settings`
- `members`
- `marks`
- `bb_sessions`
- `archived_members`
- `archived_marks`

For local development, create users manually in Supabase Auth and make sure each user has a row in `profiles` with a valid `role` such as `admin`, `captain`, or `officer`.
Seed `settings` with one row for `company` and one row for `junior` before running the app; section settings are updated in place and are not created on demand.
The Playwright smoke suite depends on those seeded rows so it can verify settings writes and restore the original value after each run.

New-user handover material lives in [`docs/user-guide.md`](./user-guide.md).

## 4. Run the App

```bash
npm run dev
```

Open the printed local URL, usually `http://localhost:5173`.

## 5. Pre-Ship Checks

```bash
npm run check:db-contract
npm run typecheck
npm run test:coverage
npm run build
```

`npm run test:run` is the same automated suite CI runs on each push and pull request. The suite is intentionally small and focuses on business-critical logic rather than browser automation.

`npm run check:db-contract` is the fast live-backend smoke check. It reads `.env` and `.env.local`, requires `E2E_TEST_EMAIL` and `E2E_TEST_PASSWORD`, signs in with that test user, verifies `current_app_role()` resolves to a valid app role, confirms the seeded `settings` rows for `company` and `junior` are readable through the published client credentials, and confirms `bb_sessions` is readable.

`npm run check:auth-config` confirms hosted Auth has public signup disabled and passkeys enabled.

`npm run test:e2e` also reads `.env` and `.env.local` and uses the same `E2E_TEST_*` credentials. The default spec creates and deletes a `ZZZ-E2E-*` sentinel member. `tests/e2e/smoke.e2e.ts` mutates live settings and an existing member and is ignored unless `E2E_ALLOW_PRODUCTION_MUTATION=1`.

Neither check proves the entire live RLS policy graph. They confirm only the client-visible contract the SPA depends on.

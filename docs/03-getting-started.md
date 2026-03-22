# 3. Getting Started

This guide sets up BB Manager locally against a Supabase project.

## Prerequisites

- Node.js 20+
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
```

Optional browser smoke-test credentials for `npm run test:e2e`:

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

`npm run check:db-contract` is the fast live-backend smoke check. It signs in with the test user, verifies `current_app_role()` resolves to a valid app role, and confirms the seeded `settings` rows for `company` and `junior` are readable through the published client credentials.

`npm run test:e2e` runs the small Playwright smoke suite. It uses a real browser and real Supabase auth, so it requires a dedicated test user with a valid role, seeded `settings` rows, and at least one Company-section member already present.

Neither check proves the entire live RLS policy graph. They confirm only the client-visible contract the SPA depends on.

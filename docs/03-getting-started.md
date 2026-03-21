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

## 3. Confirm Supabase Bootstrap State

The live app expects these tables to exist:

- `profiles`
- `settings`
- `members`
- `marks`

For local development, create users manually in Supabase Auth and make sure each user has a row in `profiles` with a valid `role` such as `admin`, `captain`, or `officer`.

New-user handover material lives in [`docs/user-guide.md`](./user-guide.md).

## 4. Run the App

```bash
npm run dev
```

Open the printed local URL, usually `http://localhost:5173`.

## 5. Pre-Ship Checks

```bash
npm run typecheck
npm run test:coverage
npm run build
```

`npm run test:run` is the same automated suite CI runs on each push and pull request. The suite is intentionally small and focuses on business-critical logic rather than browser automation.

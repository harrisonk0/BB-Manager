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
VITE_APP_URL="http://localhost:5173"
```

`VITE_APP_URL` is used when the app generates auth redirect URLs, including password reset links.

## 3. Confirm Supabase Bootstrap State

The live app expects these tables to exist:

- `profiles`
- `settings`
- `members`
- `marks`
- `invite_codes`
- `audit_logs`

For local development, make sure the first privileged user has a row in `profiles` with a valid `role` such as `admin`, `captain`, or `officer`.

## 4. Run the App

```bash
npm run dev
```

Open the printed local URL, usually `http://localhost:5173`.

## 5. Pre-Ship Checks

```bash
npm run typecheck
npm run build
npm run test:run
```

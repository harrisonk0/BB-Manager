# 6. Data & Services

[`ARCHITECTURE.md`](../ARCHITECTURE.md) is the canonical system model for this repo. This document is a deeper
dive into the services layer and Supabase interactions.

This document explains how the application interacts with Supabase for data storage and
retrieval. All reads and writes happen online against Supabase tables; there is no local
IndexedDB cache.

## Database Schema & Migrations

Database schema and permissions are managed via Supabase migrations in `supabase/migrations/`
(baseline `*_remote_schema.sql` files are immutable history).

Security note: the current access model is primarily GRANT-based and does not yet enforce RLS,
so client-side role checks are UX only. See [`docs/09-database-and-migrations.md`](./09-database-and-migrations.md).

## General Data Flow

1. Components invoke functions in `services/db.ts`.
2. Those functions validate inputs and call Supabase.
3. Errors propagate back to the component so the UI can show connection or permission issues.

## Key Modules

- **`db.ts`**: Houses CRUD operations for boys, audit logs, invite codes, and user roles. Also contains validation helpers (e.g., mark validation) and audit log creation.
- **`supabaseClient.ts`**: Initializes the Supabase client.
- **`supabaseAuth.ts`**: Wraps Supabase Auth helpers.
- **`settings.ts`**: Fetches section-specific settings from Supabase.

## Audit Logging

Important changes (role updates, invite code changes, clears) are recorded through `createAuditLog`, providing a history of administrative actions directly in Supabase.

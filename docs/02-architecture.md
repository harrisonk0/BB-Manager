# 2. Architecture

[`ARCHITECTURE.md`](../ARCHITECTURE.md) is the canonical system model for this repo. This document is a short,
supplemental overview focused on how the UI integrates with Supabase.

BB Manager is a React + TypeScript application backed by Supabase for authentication and
data storage. The client retrieves data directly from Supabase and does not maintain an
offline cache.

## Core Principles

1. **Single Source of Truth**: Supabase (PostgreSQL) stores all member, audit log, invite code, and user role data.
2. **Role-Aware UX**: The UI and service layer perform role checks (admin, captain, officer) before performing sensitive actions. These checks are UX only; the current database access model is GRANT-based and RLS is not yet enforced (see [`docs/09-database-and-migrations.md`](./09-database-and-migrations.md)).
3. **Predictable Data Flows**: Components call service functions in `services/db.ts`, which wrap Supabase queries and mutations.
4. **Auditability**: Significant changes are logged via `createAuditLog`, providing traceability for administrative actions.

## High-Level Flow

```
[ User Action ] -> [ React Component ] -> [ services/db.ts ] -> [ Supabase ]
```

- **Authentication**: Managed via Supabase Auth (see `services/supabaseAuth.ts`).
- **Data Access**: CRUD operations live in `services/db.ts` and operate directly against Supabase tables.
- **Settings**: Section-level settings are fetched from Supabase through `services/settings.ts`.

## Error Handling

Errors from Supabase requests propagate to the calling components, allowing the UI to surface connection or permission issues without falling back to cached data.

See also: [`docs/06-data-and-services.md`](./06-data-and-services.md).

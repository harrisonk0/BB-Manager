# 9. Database, Migrations, and Access Control

This repo uses Supabase Postgres as the system of record. Database structure and permissions
are managed via MCP Supabase tools.

## Source of Truth

- The **live database schema** is the authoritative source for database structure and permissions
  (tables, indexes, constraints, GRANTs, and RLS policies).
- Historical migrations are preserved in `.planning/archive/migrations/` for reference.
  - These files document the evolution of the schema and security policies.
  - See `.planning/archive/migrations/README.md` for detailed migration history.

## How Schema Changes Are Made

All database changes are done via **MCP Supabase tools** (not local migration files):

- `mcp__supabase__executeSQL`: Execute DDL/DML directly on the remote database
- `mcp__supabase__listTables`: List all tables
- `mcp__supabase__describeTable`: Get table schema

Schema changes include:

- Schema changes (tables/columns/indexes/constraints)
- Permission changes (GRANT/REVOKE)
- Security hardening (RLS policies)

All schema changes must be:
1. Documented in a plan file under `.planning/phases/`
2. Explained with rationale in the commit message
3. Reflected in relevant documentation (CLAUDE.md, ARCHITECTURE.md, etc.)

## Current Access Model

The database access model uses **RLS policies with GRANTs** for defense-in-depth.

Security implementation:

- The browser ships a public anon key; client-side role checks are **not** a security boundary.
- RLS policies enforce row-level rules including:
  - per-user access
  - role-based restrictions (admin/captain/officer)
  - section isolation (`company` vs `junior`)
  - audit log access (Captain/Admin only)
- Table-level GRANTs provide baseline permissions
- Security functions use hardened search_path to mitigate CVE-2018-1058

Phase 1 (Critical Security) completed RLS implementation for all application tables.

> ~~RLS hardening~~ **Complete (Phase 1)**: All RLS policies implemented via MCP tools.
> See `.planning/phases/01-critical-security/` for implementation details.

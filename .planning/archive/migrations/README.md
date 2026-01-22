# Archived Database Migrations

This directory contains historical database migrations that were executed using Supabase CLI migration files. These migrations are preserved for reference purposes.

**Note:** As of 2026-01-22, this project uses MCP Supabase tools for database operations instead of local migration files. All future schema changes will be executed directly on the remote database using `mcp__supabase__executeSQL`.

## Migration Files

### 20251214144824_remote_schema.sql
**Created:** 2025-12-14
**Purpose:** Base schema initialization

This migration created the core database schema including:

- **Tables:**
  - `audit_logs` - Audit trail for all data modifications
  - `boys` - Boy marks and attendance records
  - `invite_codes` - Invitation code management
  - `settings` - Section-specific settings
  - `user_roles` - User role assignments

- **Indexes:** Performance indexes for common query patterns
- **Constraints:** CHECK constraints for enum-like column validation
- **GRANTs:** Base permissions for anon, authenticated, and service_role

**Phase:** Initial setup

### 20251214144110_remote_schema.sql
**Created:** 2025-12-14 (slightly later than base schema)
**Purpose:** Security functions with hardened search_path

This migration added SECURITY DEFINER functions to mitigate CVE-2018-1058:

- `get_user_role(user_uid)` - Get user role by UID
- `can_access_section(user_uid, section_name)` - Check section access
- `can_access_audit_logs(user_uid)` - Check audit log access (Captain/Admin only)

**Key Security Features:**
- All functions use `SET search_path = public` to prevent search_path manipulation attacks
- SECURITY DEFINER allows function execution even with RLS enabled
- Section is contextual, not a security boundary (all authenticated users can access both sections)

**Phase:** Phase 1 - Critical Security (Plan 01-02)

### 20250122085026_audit_logs_rls.sql
**Created:** 2025-01-22
**Purpose:** Enable Row Level Security on audit_logs table

This migration enabled RLS and created the `audit_logs_insert_officer_plus` policy:

- Enables RLS on `audit_logs` table
- Revokes INSERT from anon (unauthenticated users)
- Allows INSERT for authenticated users with roles (officer, captain, admin)
- REVERT_ACTION restricted to admin role only
- Email verification using `auth.jwt()` to prevent impersonation
- Timestamp validation (within 5 minutes past, 1 minute future)

**Key Security Features:**
- Email spoofing protection via JWT verification
- Time-bounded audit log creation
- Role-based action restrictions

**Phase:** Phase 1 - Critical Security (Plan 01-03)

## Migration Context

### Why These Were Migrated

The original approach used local SQL files with Supabase CLI to manage database schema. This required:

1. Maintaining migration files locally
2. Using `supabase db push` or `supabase migration up` to apply changes
3. Tracking migration order and dependencies

### Current Approach (MCP-Based)

As of 2026-01-22, all database operations use MCP Supabase tools:

1. **Direct SQL execution** via `mcp__supabase__executeSQL`
2. **Schema introspection** via `mcp__supabase__listTables` and `mcp__supabase__describeTable`
3. **No local migration files** needed

**Benefits:**
- Simplified repository structure
- Direct execution against remote database
- No migration file management overhead
- Schema changes documented in planning files

**Process for Schema Changes:**

1. Create plan in `.planning/phases/` describing the change
2. Use `mcp__supabase__executeSQL` to apply DDL/DML
3. Document the change rationale in the plan
4. Update relevant documentation (CLAUDE.md, ARCHITECTURE.md, etc.)

## Live Schema Reference

The current live database schema is the source of truth. To inspect:

- Use `mcp__supabase__listTables` to see all tables
- Use `mcp__supabase__describeTable` to get table schema details
- Check `ARCHITECTURE.md` for data model documentation

## Related Documentation

- `CLAUDE.md` - Database operations workflow
- `ARCHITECTURE.md` - System architecture and data model
- `.planning/phases/01-critical-security/` - Phase 1 security implementation details

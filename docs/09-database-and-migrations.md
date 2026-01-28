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

## Current Schema

### Tables Overview

The database has 5 application tables in the `public` schema:

1. **`boys`** - Member records with marks and squad assignments
2. **`settings`** - Per-section configuration (meeting day, etc.)
3. **`user_roles`** - User-to-role mappings for authorization
4. **`invite_codes`** - Signup invitation codes with expiry and usage tracking
5. **`audit_logs`** - Audit trail of significant actions with revert support

All tables have RLS enabled.

---

### Table: `boys`

Stores member records with weekly marks and squad assignments.

**Primary Key:** `id` (UUID)

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | Unique identifier |
| `name` | `text` | No | - | Member's full name |
| `squad` | `integer` | No | - | Squad number |
| `year` | `text` | No | - | Academic year (e.g., "2024-2025") |
| `section` | `text` | No | - | Section: `'company'` or `'junior'` |
| `marks` | `jsonb` | No | - | Weekly marks as JSON object |
| `is_squad_leader` | `boolean` | No | `false` | Squad leader flag |
| `created_at` | `timestamptz` | No | `now()` | Record creation timestamp |
| `updated_at` | `timestamptz` | No | `now()` | Last update timestamp |

**Constraints:**
- CHECK: `section IN ('company', 'junior')`

**Indexes:**
- PRIMARY KEY: `boys_pkey` on `(id)`
- `idx_boys_section_name` on `(section, name)`

**RLS Policies:**

| Policy | Command | Purpose |
|--------|---------|---------|
| `boys_select` | SELECT | Section-based access via `can_access_section()` |
| `boys_select_officer_plus` | SELECT | Officers+ can read all sections |
| `boys_insert` | INSERT | Section-based insert access |
| `boys_insert_officer_plus` | INSERT | Officers+ can insert to any section |
| `boys_update` | UPDATE | Section-based update access |
| `boys_update_officer_plus` | UPDATE | Officers+ can update any section |
| `boys_delete` | DELETE | Section-based delete access |
| `boys_delete_officer_plus` | DELETE | Officers+ can delete from any section |

**Policy Pattern:**
- Public policies use `can_access_section()` for section isolation
- Authenticated policies with `_officer_plus` suffix allow officers/captains/admins to bypass section restrictions
- Dual-policy structure ensures both unauthenticated and authenticated users have appropriate access

---

### Table: `settings`

Stores per-section configuration settings.

**Primary Key:** `section` (text)

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `section` | `text` | No | - | Section: `'company'` or `'junior'` |
| `meeting_day` | `integer` | No | - | Meeting day (0=Sunday, 6=Saturday) |
| `updated_at` | `timestamptz` | No | `now()` | Last update timestamp |

**Constraints:**
- CHECK: `section IN ('company', 'junior')`

**Indexes:**
- PRIMARY KEY: `settings_pkey` on `(section)`

**RLS Policies:**

| Policy | Command | Purpose |
|--------|---------|---------|
| `settings_select` | SELECT | Section-based access via `can_access_section()` |
| `settings_select_officer_plus` | SELECT | Officers+ can read all settings |
| `settings_insert` | INSERT | Section-based insert access |
| `settings_insert_captain_admin` | INSERT | Captains/Admins can insert settings |
| `settings_update` | UPDATE | Section-based update access |
| `settings_update_captain_admin` | UPDATE | Captains/Admins can update settings |
| `settings_delete` | DELETE | Section-based delete access |

**Policy Pattern:**
- Similar dual-policy structure to `boys` table
- More restrictive for INSERT/UPDATE (captain+ only)

---

### Table: `user_roles`

Maps authenticated users to application roles.

**Primary Key:** `uid` (text)

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `uid` | `text` | No | - | Supabase Auth user ID |
| `email` | `text` | No | - | User's email address |
| `role` | `text` | No | - | Role: `'admin'`, `'captain'`, or `'officer'` |
| `created_at` | `timestamptz` | No | `now()` | Record creation timestamp |
| `updated_at` | `timestamptz` | No | `now()` | Last update timestamp |

**Constraints:**
- CHECK: `role IN ('admin', 'captain', 'officer')`

**Indexes:**
- PRIMARY KEY: `user_roles_pkey` on `(uid)`

**RLS Policies:**

| Policy | Command | Purpose |
|--------|---------|---------|
| `user_roles_select` | SELECT | Admins or self-access only |
| `user_roles_select_self_or_manage` | SELECT | Users can see own role; captains see officers; admins see officers/captains |
| `user_roles_insert` | INSERT | Admins only |
| `user_roles_update` | UPDATE | Admins only |
| `user_roles_update_admin_manage_captain_officer` | UPDATE | Admins can manage captains/officers (not self) |
| `user_roles_update_captain_manage_officers` | UPDATE | Captains can manage officers only |
| `user_roles_delete` | DELETE | Admins only |
| `user_roles_delete_admin_manage_captain_officer` | DELETE | Admins can delete captains/officers (not self) |
| `user_roles_delete_captain_manage_officers` | DELETE | Captains can delete officers only |

**Policy Pattern:**
- Self-access: Users can always read their own role
- Role hierarchy: Admin > Captain > Officer
- Self-protection: Admins cannot modify/delete their own roles

---

### Table: `invite_codes`

Manages signup invitation codes with expiry and usage tracking.

**Primary Key:** `id` (text)

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `text` | No | - | Invite code string |
| `generated_by` | `text` | No | - | Email of user who created the code |
| `section` | `text` | Yes | - | Optional section association |
| `default_user_role` | `text` | No | - | Default role: `'admin'`, `'captain'`, or `'officer'` |
| `generated_at` | `timestamptz` | No | `now()` | Code creation timestamp |
| `expires_at` | `timestamptz` | No | - | Code expiry timestamp |
| `is_used` | `boolean` | No | `false` | Whether code has been used |
| `used_by` | `text` | Yes | - | Email of user who used the code |
| `used_at` | `timestamptz` | Yes | - | Timestamp when code was used |
| `revoked` | `boolean` | No | `false` | Whether code has been revoked |

**Constraints:**
- CHECK: `default_user_role IN ('admin', 'captain', 'officer')`

**Indexes:**
- PRIMARY KEY: `invite_codes_pkey` on `(id)`

**RLS Policies:**

| Policy | Command | Purpose |
|--------|---------|---------|
| `invite_codes_select` | SELECT | Admins only |
| `invite_codes_select_manage` | SELECT | Admins or captains managing officers |
| `invite_codes_insert` | INSERT | Admins only |
| `invite_codes_insert_manage` | INSERT | Captains can create officer codes only |
| `invite_codes_update` | UPDATE | Admins only |
| `invite_codes_update_manage` | UPDATE | Admins or captains managing officers |
| `invite_codes_delete` | DELETE | Admins only |

**Policy Pattern:**
- Admins have full control
- Captains can manage officer codes only (not admin/captain codes)
- Codes must be valid (not revoked, not expired, not used) for captain actions

---

### Table: `audit_logs`

Audit trail of significant actions with revert support.

**Primary Key:** `id` (UUID)

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | Unique identifier |
| `timestamp` | `timestamptz` | No | `now()` | Action timestamp |
| `created_at` | `timestamptz` | No | `now()` | Log creation timestamp |
| `section` | `text` | Yes | - | Section context (nullable for global actions) |
| `user_email` | `text` | No | - | Email of user who performed action |
| `action_type` | `text` | No | - | Action type (CREATE_BOY, UPDATE_SETTINGS, etc.) |
| `description` | `text` | No | - | Human-readable description |
| `revert_data` | `jsonb` | No | - | Snapshot data for revert functionality |
| `reverted_log_id` | `uuid` | Yes | - | ID of log entry that was reverted (if applicable) |

**Indexes:**
- PRIMARY KEY: `audit_logs_pkey` on `(id)`
- `idx_audit_logs_section_timestamp` on `(section, timestamp DESC)`

**RLS Policies:**

| Policy | Command | Purpose |
|--------|---------|---------|
| `audit_logs_select` | SELECT | Captain/Admin only via `can_access_audit_logs()` |
| `audit_logs_insert` | INSERT | Officers+ with email validation and timing restrictions |
| `audit_logs_insert_officer_plus` | INSERT | Authenticated officers+ with additional validation |
| `audit_logs_update` | UPDATE | Admins only |

**Policy Pattern:**
- Read access restricted to captains and admins
- Insert policies enforce:
  - Email matching `auth.jwt() ->> 'email'`
  - 5-minute window around `created_at` (prevents backdating)
  - REVERT_ACTION requires admin role
- Update policy allows admins to modify logs

---

## Security Functions

All security functions use `SECURITY DEFINER` with explicit `search_path` to mitigate CVE-2018-1058.

### Function: `get_user_role(uid text)`

Returns the role for a given user ID.

**Returns:** `text` ('admin', 'captain', or 'officer')

**Definition:**
```sql
CREATE OR REPLACE FUNCTION get_user_role(uid text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM user_roles WHERE user_roles.uid = uid;
$$;
```

**Usage in RLS:** Role lookup for permission checks

---

### Function: `current_app_role()`

Returns the current authenticated user's role.

**Returns:** `text` ('admin', 'captain', or 'officer')

**Definition:**
```sql
CREATE OR REPLACE FUNCTION current_app_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ur.role
  FROM public.user_roles ur
  WHERE ur.uid = auth.uid()::text
  LIMIT 1
$$;
```

**Usage in RLS:** Simplifies role checks in policies (avoiding subqueries)

---

### Function: `can_access_section(user_uid text, section_name text)`

Checks if a user can access a specific section.

**Returns:** `boolean`

**Definition:**
```sql
CREATE OR REPLACE FUNCTION can_access_section(user_uid text, section_name text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role = 'admin'
         OR (role = 'captain' AND section_name = 'company')
         OR (role = 'officer' AND section_name = 'junior')
  FROM user_roles
  WHERE uid = user_uid;
$$;
```

**Access Logic:**
- Admins: Access all sections
- Captains: Access `company` section only
- Officers: Access `junior` section only

**Usage in RLS:** Section isolation for `boys` and `settings` tables

---

### Function: `can_access_audit_logs(user_uid text, log_email text)`

Checks if a user can access audit logs.

**Returns:** `boolean`

**Definition:**
```sql
CREATE OR REPLACE FUNCTION can_access_audit_logs(user_uid text, log_email text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role = 'admin' OR email = log_email
  FROM user_roles
  WHERE uid = user_uid;
$$;
```

**Access Logic:**
- Admins: Access all audit logs
- Non-admins: Access only their own logs (email must match)

**Usage in RLS:** Audit log read restrictions

---

## RLS Policy Pattern: Subquery Optimization

### The Problem

RLS policies need efficient role lookups. Naive subqueries in every policy would be slow and complex.

### The Solution

**Hardened security functions** with `SECURITY DEFINER` and explicit `search_path`:

```sql
CREATE FUNCTION get_user_role(uid text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public  -- Critical: Prevents CVE-2018-1058
AS $$ SELECT role FROM user_roles WHERE user_roles.uid = uid; $$;
```

**Benefits:**
1. **Performance:** Function is simple and indexed on `user_roles.uid`
2. **Security:** `SECURITY DEFINER` + explicit `search_path` prevents search_path hijacking
3. **Maintainability:** Single source of truth for role lookups
4. **Readability:** Policies are clearer with function calls

### Dual-Policy Pattern

Most tables use **two policies per operation** (e.g., `boys_select` and `boys_select_officer_plus`):

1. **Public policy** (`boys_select`): Uses `can_access_section()` for section-based access
2. **Authenticated policy** (`boys_select_officer_plus`): Allows officers/captains/admins to bypass section restrictions

**Why two policies?**
- Public policies handle unauthenticated users and section-based access
- Authenticated policies provide elevated privileges for trusted roles
- Postgres ORs multiple PERMISSIVE policies together, allowing flexible access control

---

## Migration History

Historical migrations are preserved in `.planning/archive/migrations/`:

| Migration File | Date | Description |
|----------------|------|-------------|
| `20251214144110_remote_schema.sql` | 2025-12-14 | Initial remote schema capture |
| `20251214144824_remote_schema.sql` | 2025-12-14 | Schema snapshot with RLS |
| `20250122085026_audit_logs_rls.sql` | 2025-01-22 | Audit logs RLS policies |
| `short-term-improvements-cleanup-function.sql` | - | Utility function for cleanup |

**See also:** `.planning/archive/migrations/README.md` for detailed migration history.

---

## MCP Workflow

This database is managed via **MCP Supabase tools**, not local migration files.

### Common Operations

#### Query the database

```bash
# Using MCP Supabase execute_sql tool
mcp__supabase__execute_sql query="SELECT * FROM boys WHERE section = 'company';"
```

#### List tables

```bash
# Using MCP Supabase list_tables tool
mcp__supabase__list_tables schemas=["public"]
```

#### Create/modify RLS policies

```bash
# Using MCP Supabase execute_sql tool
mcp__supabase__execute_sql query="
CREATE POLICY boys_select ON boys
FOR SELECT TO public
USING (can_access_section(auth.uid()::text, section));
"
```

#### Apply schema changes

```bash
# Create index
mcp__supabase__execute_sql query="
CREATE INDEX idx_boys_section_name ON boys(section, name);
"
```

### Documentation

See `docs/10-mcp-workflow.md` for complete MCP Supabase workflow documentation.

---

## Security Considerations

### Threat Model

- **Untrusted client:** Browser ships anon key; client-side checks are UX-only
- **RLS enforcement:** All authorization enforced in database via RLS policies
- **Section isolation:** Captains access `company` only; officers access `junior` only
- **Audit log access:** Restricted to captains and admins
- **Role hierarchy:** Admin > Captain > Officer (with self-protection for admins)

### Known Limitations

- No automated audit log retention policy (cleanup is manual)
- No row-level versioning (only audit log snapshots for revert)
- Invite codes have 7-day expiry but UI mentions 24 hours (inconsistency)

### Hardening Applied (Phase 1)

- All security functions use `SECURITY DEFINER` with explicit `search_path`
- All tables have RLS enabled
- Dual-policy structure for flexible access control
- Email verification in audit log insert policies
- Timing restrictions to prevent backdating audit logs
- Self-protection for admins (cannot modify own role)

---

## Data Flow Examples

### Creating a Boy Record

1. Client calls `createBoy()` from `services/db.ts`
2. Service validates marks and authenticates user
3. Supabase INSERT operation with RLS check:
   - `boys_insert_officer_plus` policy allows officers+ to insert
   - `boys_insert` policy allows section-based access via `can_access_section()`
4. Audit log entry created (if not logged separately)
5. Success response or error

### Updating Settings

1. Client calls `saveSettings()` from `services/settings.ts`
2. Settings upserted to `settings` table
3. RLS policies:
   - `settings_update_captain_admin` allows captains/admins to modify
   - Regular users restricted by `can_access_section()`
4. Audit log entry created with `UPDATE_SETTINGS` action
5. Prior settings stored in `revert_data` for rollback

---

## Best Practices

### When Modifying Schema

1. **Always use MCP tools** - No direct Supabase UI changes
2. **Document changes** - Add rationale to commit message
3. **Update docs** - Keep this file and ARCHITECTURE.md in sync
4. **Test RLS** - Verify policies work as expected
5. **Back up first** - Export schema before destructive changes

### When Adding RLS Policies

1. **Use security functions** - Leverage `get_user_role()`, `can_access_section()`, etc.
2. **Set search_path** - Always include `SET search_path = public` in functions
3. **Consider dual policies** - Public + authenticated for flexible access
4. **Test with roles** - Verify each role (admin/captain/officer) has correct access
5. **Document intent** - Explain what the policy enforces in comments

### When Writing Queries

1. **Always filter by section** - Client-side queries should include `section` parameter
2. **Use indexes** - Leverage existing indexes for performance
3. **Avoid SELECT \*** - Specify columns to reduce payload size
4. **Use transactions** - For multi-step operations that must succeed together

---

## Troubleshooting

### Common Issues

**"Permission denied" errors:**
- Check RLS policies with `SELECT * FROM pg_policies WHERE tablename = 'your_table';`
- Verify user has role in `user_roles` table
- Ensure `auth.uid()` matches `user_roles.uid`

**Section access denied:**
- Verify `can_access_section()` logic matches your role and section
- Captains only access `company`, officers only access `junior`
- Admins should access all sections

**Audit log insert failures:**
- Check email matches `auth.jwt() ->> 'email'`
- Verify `created_at` is within 5 minutes of current time
- For `REVERT_ACTION`, ensure user is admin

**Performance issues:**
- Check query plans with `EXPLAIN ANALYZE`
- Ensure indexes exist (see table sections above)
- Consider pagination for large result sets

### Diagnostic Queries

```sql
-- Check current user's role
SELECT current_app_role();

-- Check if user can access a section
SELECT can_access_section(auth.uid()::text, 'company');

-- List all RLS policies on a table
SELECT * FROM pg_policies WHERE tablename = 'boys';

-- Check table indexes
SELECT * FROM pg_indexes WHERE tablename = 'boys';

-- View all security functions
SELECT routine_name, security_type
FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_name LIKE 'can_%';
```

---

## Related Documentation

- `ARCHITECTURE.md` - System architecture and data flow
- `CLAUDE.md` - Agent guide and database guardrails
- `docs/06-data-and-services.md` - Services layer implementation
- `docs/10-mcp-workflow.md` - MCP Supabase workflow guide
- `.planning/phases/01-critical-security/` - Phase 1 security implementation

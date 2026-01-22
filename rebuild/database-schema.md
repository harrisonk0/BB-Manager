# BB-Manager Database Schema

## Overview

BB-Manager uses PostgreSQL as the system of record. The database consists of application tables, Row Level Security (RLS) policies for access control, and security functions for authorization enforcement.

**Note:** This schema documents the data model from the previous implementation. For a greenfield rebuild, this serves as a reference but may be evolved during development based on new requirements.

## Application Tables

### 1. `boys`

Stores member records for both Company and Junior sections.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique identifier |
| `name` | text | NOT NULL | Member's full name |
| `squad` | integer | NOT NULL | Squad number (1-3 Company, 1-4 Junior) |
| `year` | text | NOT NULL | School year (8-14 or P4-P7) |
| `marks` | jsonb | DEFAULT '[]'::jsonb | Array of mark entries |
| `is_squad_leader` | boolean | DEFAULT false | Squad leader designation |
| `section` | text | NOT NULL, CHECK (section IN ('company', 'junior')) | Section assignment |
| `created_at` | timestamptz | DEFAULT now() | Record creation time |
| `updated_at` | timestamptz | DEFAULT now() | Last update time |

**Marks Array Structure**:
```json
[
  {
    "date": "2025-01-15",
    "score": 8,
    "uniformScore": 5,    // Junior section only
    "behaviourScore": 3   // Junior section only
  }
]
```

**Mark Validation Rules** (enforced in `services/db.ts`):
- `date` format: `YYYY-MM-DD`
- `score = -1` indicates absence
- Company: `score` in range `[0, 10]`
- Junior: `uniformScore` in `[0, 10]`, `behaviourScore` in `[0, 5]`
- Junior: `score = uniformScore + behaviourScore`
- Maximum 2 decimal places on all scores

**Indexes**:
- `idx_boys_section`: `(section)` for section-filtered queries
- `idx_boys_section_name`: `(section, name)` for roster display

**RLS Policies**:
- `boys_select_officer_plus`: Officer+ can read
- `boys_insert_officer_plus`: Officer+ can insert
- `boys_update_officer_plus`: Officer+ can update
- `boys_delete_officer_plus`: Officer+ can delete

### 2. `settings`

Stores per-section configuration.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique identifier |
| `section` | text | NOT NULL, UNIQUE, CHECK (section IN ('company', 'junior')) | Section identifier |
| `meeting_day` | integer | NOT NULL, CHECK (meeting_day >= 0 AND meeting_day <= 6) | Day of week (0=Sunday, 6=Saturday) |
| `created_at` | timestamptz | DEFAULT now() | Record creation time |
| `updated_at` | timestamptz | DEFAULT now() | Last update time |

**Indexes**:
- `settings_section_unique`: `(section)` - enforced by UNIQUE constraint

**RLS Policies**:
- `settings_select_officer_plus`: Officer+ can read
- `settings_insert_captain_admin`: Captain+ can insert
- `settings_update_captain_admin`: Captain+ can update
- **No DELETE policy** (settings are updated, not deleted)

### 3. `user_roles`

Maps Supabase Auth users to application roles.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `uid` | text | PRIMARY KEY | Supabase Auth user ID |
| `email` | text | NOT NULL | User email address |
| `role` | text | NOT NULL, CHECK (role IN ('admin', 'captain', 'officer')) | Application role |
| `created_at` | timestamptz | DEFAULT now() | Record creation time |
| `updated_at` | timestamptz | DEFAULT now() | Last update time |

**Role Hierarchy**: `admin > captain > officer`

**Special Constraints**:
- Only ONE `captain` role allowed (enforced by partial unique index)
- `admin` roles cannot be created via app (manual provisioning only)

**Indexes**:
- `user_roles_captain_unique`: `(role) WHERE role = 'captain'` - ensures single captain

**RLS Policies**:
- `user_roles_select_self_or_manage`: Users can read self; Captain+ can read managed roles
- `user_roles_update_captain_manage_officers`: Captains can update Officers only
- `user_roles_update_admin_manage_captain_officer`: Admins can manage Captain/Officer, not self
- `user_roles_delete_captain_manage_officers`: Captains can delete Officers only
- `user_roles_delete_admin_manage_captain_officer`: Admins can delete Captain/Officer, not self
- **No INSERT policy** (role assignment via `claim_invite_code()` or manual)

### 4. `invite_codes`

One-time-use codes for new user signup.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | text | PRIMARY KEY | Invite code string (6 random characters) |
| `generated_by` | text | NOT NULL | Email of code generator |
| `section` | text | | Target section (optional) |
| `default_user_role` | text | NOT NULL, CHECK (default_user_role IN ('admin', 'captain', 'officer')) | Assigned role |
| `is_used` | boolean | DEFAULT false, CHECK (is_used = false OR (is_used = true AND used_by IS NOT NULL AND used_at IS NOT NULL)) | Usage status |
| `used_by` | text | | Email of user who claimed code |
| `used_at` | timestamptz | | When code was claimed |
| `revoked` | boolean | DEFAULT false, CHECK (revoked = false OR revoked = true) | Revocation status |
| `expires_at` | timestamptz | NOT NULL | Expiration timestamp (7 days) |
| `created_at` | timestamptz | DEFAULT now() | When code was created |
| `generated_at` | timestamptz | DEFAULT now() | Alias for created_at |

**Constraints**:
- `is_used` monotonic: `false -> true` only
- `revoked` monotonic: `false -> true` only
- `expires_at` fixed at creation (7 days)
- `default_user_role` fixed at creation

**RLS Policies**:
- Unauthenticated: No access (use `validate_invite_code()` RPC)
- `invite_codes_select_manage`: Captain/Admin can view (Captains: Officer codes only)
- `invite_codes_insert_manage`: Captain/Admin can create (Captains: Officer only)
- `invite_codes_update_manage`: Captain/Admin can update (Captains: Officer only)

### 5. `audit_logs`

Chronological history of all significant actions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique identifier |
| `timestamp` | timestamptz | NOT NULL, DEFAULT now() | When action occurred |
| `user_email` | text | NOT NULL | Email of actor |
| `action_type` | text | NOT NULL | Type of action (see Action Types) |
| `description` | text | NOT NULL | Human-readable description |
| `revert_data` | jsonb | | Data for reversion (admin-sensitive) |
| `reverted_log_id` | uuid | | Reference to reverted log |
| `section` | text | | Associated section (null for global) |
| `created_at` | timestamptz | DEFAULT now() | Record creation time |

**Action Types**:
- `CREATE_BOY`, `UPDATE_BOY`, `DELETE_BOY`
- `UPDATE_SETTINGS`
- `GENERATE_INVITE_CODE`, `USE_INVITE_CODE`, `REVOKE_INVITE_CODE`, `UPDATE_INVITE_CODE`
- `UPDATE_USER_ROLE`, `DELETE_USER_ROLE`
- `CLEAR_AUDIT_LOGS`, `CLEAR_USED_REVOKED_INVITE_CODES`
- `REVERT_ACTION`

**Indexes**:
- `idx_audit_logs_section_timestamp`: `(section, timestamp DESC)` for section queries
- `idx_audit_logs_timestamp`: `(timestamp DESC)` for global queries

**RLS Policies**:
- `audit_logs_insert_officer_plus`: Officer+ can append (Admin-only for `REVERT_ACTION`)
- **No SELECT policy** on `audit_logs` table directly
- Use `audit_logs_read` view for reading (Captain/Admin only)
- **No UPDATE/DELETE** policies (append-only, retention via scheduled job)

**Retention**: 14 days (enforced by scheduled job, not RLS)

## Database Functions

### Security Functions (SECURITY DEFINER)

All functions use `SET search_path = public` to mitigate CVE-2018-1058.

#### `get_user_role()`

Returns the application role for the current authenticated user.

```sql
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TABLE (role text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ur.role
  FROM public.user_roles ur
  WHERE ur.uid = auth.uid()::text
  LIMIT 1;
$$;
```

#### `can_access_section(section text)`

Checks if the current user can access a specific section.

```sql
CREATE OR REPLACE FUNCTION public.can_access_section(section text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE uid = auth.uid()::text
    AND role IN ('officer', 'captain', 'admin')
  );
$$;
```

#### `can_access_audit_logs()`

Checks if the current user can read audit logs (Captain+ only).

```sql
CREATE OR REPLACE FUNCTION public.can_access_audit_logs()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE uid = auth.uid()::text
    AND role IN ('captain', 'admin')
  );
$$;
```

### Invite Code Functions

#### `validate_invite_code(code text)`

Validates an invite code without exposing PII. Exposed to `anon` role.

```sql
CREATE OR REPLACE FUNCTION public.validate_invite_code(code text)
RETURNS TABLE (
  is_valid boolean,
  section text,
  default_user_role text,
  expires_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (ic.id IS NOT NULL) AS is_valid,
    ic.section,
    ic.default_user_role,
    ic.expires_at
  FROM public.invite_codes ic
  WHERE ic.id = code
    AND ic.revoked = false
    AND ic.is_used = false
    AND ic.expires_at > now()
    AND ic.default_user_role IN ('officer', 'captain')
  LIMIT 1;
$$;
```

#### `claim_invite_code(code text)`

Atomically validates and claims an invite code, assigning the user role.

```sql
CREATE OR REPLACE FUNCTION public.claim_invite_code(code text)
RETURNS TABLE (
  assigned_role text,
  section text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ic record;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.uid = auth.uid()::text) THEN
    RAISE EXCEPTION 'Role already assigned';
  END IF;

  SELECT * INTO ic
  FROM public.invite_codes
  WHERE id = code
  FOR UPDATE;

  IF ic IS NULL
     OR ic.revoked = true
     OR ic.is_used = true
     OR ic.expires_at <= now()
     OR ic.default_user_role NOT IN ('officer', 'captain') THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;

  UPDATE public.invite_codes
  SET is_used = true,
      used_at = now(),
      used_by = COALESCE(auth.jwt() ->> 'email', auth.uid()::text)
  WHERE id = ic.id;

  INSERT INTO public.user_roles (uid, email, role)
  VALUES (auth.uid()::text, COALESCE(auth.jwt() ->> 'email', ''), ic.default_user_role);

  RETURN QUERY SELECT ic.default_user_role, ic.section;
END;
$$;
```

## Views

### `audit_logs_read`

Read interface for audit logs that excludes admin-sensitive `revert_data`.

```sql
CREATE OR REPLACE VIEW public.audit_logs_read AS
SELECT
  id,
  section,
  timestamp,
  user_email,
  action_type,
  description,
  reverted_log_id,
  created_at
FROM public.audit_logs
WHERE public.current_app_role() IN ('captain', 'admin');
```

### `audit_log_revert_data(log_id uuid)`

Admin-only function to fetch revert data for a specific log.

```sql
CREATE OR REPLACE FUNCTION public.audit_log_revert_data(log_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT al.revert_data
  FROM public.audit_logs al
  WHERE al.id = log_id
    AND public.get_user_role() = 'admin';
$$;
```

## Relationships

```
user_roles.uid -----> auth.users(id) (Supabase Auth)
audit_logs.user_email -----> user_roles.email (soft reference)
invite_codes.used_by -----> user_roles.email (soft reference)
invite_codes.generated_by -----> user_roles.email (soft reference)
boys.section -----> settings.section (soft reference)
audit_logs.section -----> boys.section (soft reference)
```

**Note**: Most relationships are "soft" (enforced by application logic) rather than foreign key constraints. This allows flexibility but requires careful validation.

## RLS Policy Pattern

All RLS policies follow this pattern:

1. Use `(SELECT auth.uid())` subquery instead of direct `auth.uid()` for performance
2. Reference `public.current_app_role()` or `public.get_user_role()` for role checks
3. Policies apply to `authenticated` role (not `anon`)
4. No direct table access for `anon` (use functions instead)

Example:
```sql
CREATE POLICY boys_select_officer_plus
ON public.boys
FOR SELECT
TO authenticated
USING (
  public.current_app_role() IN ('officer', 'captain', 'admin')
);
```

## Access Matrix

| Table | anon | Officer | Captain | Admin |
|-------|------|---------|---------|-------|
| `boys` | - | R/I/U/D | R/I/U/D | R/I/U/D |
| `settings` | - | R | R/I/U | R/I/U |
| `user_roles` | - | R (self) | R/I/U/D (Officers) | R/I/U/D (Captain+Officer) |
| `invite_codes` | - | - | R/I/U (Officers) | R/I/U (Officer+Captain) |
| `audit_logs` (table) | - | - | - | - |
| `audit_logs_read` (view) | - | - | R | R |
| `audit_log_revert_data()` | - | - | - | EXECUTE |

**Legend**: R=SELECT, I=INSERT, U=UPDATE, D=DELETE, EXECUTE=function call

## Performance Considerations

### Optimizations

1. **Subquery pattern for volatile functions**: `(SELECT auth.uid())` caches result
2. **Compound indexes**: On frequently queried column combinations
3. **Partial indexes**: For specific query patterns (e.g., single captain)

### Indexes

- `idx_boys_section`: `(section)`
- `idx_boys_section_name`: `(section, name)`
- `idx_audit_logs_section_timestamp`: `(section, timestamp DESC)`
- `user_roles_captain_unique`: `(role) WHERE role = 'captain'`
- `settings_section_unique`: `(section)` - UNIQUE constraint

## Schema Changes

**All schema changes are made via MCP Supabase tools**, not local migration files.

- `mcp__supabase__executeSQL`: Run DDL/DML directly on remote database
- `mcp__supabase__listTables`: List all tables
- `mcp__supabase__describeTable`: Get table schema

Documentation of changes:
1. Create plan file under `.planning/phases/`
2. Document rationale in commit message
3. Update relevant documentation (CLAUDE.md, ARCHITECTURE.md, etc.)

## Security Hardening (Phase 1 Complete)

The following security measures are implemented:

1. **RLS enabled** on all application tables
2. **Security functions** use `SECURITY DEFINER` with explicit `search_path`
3. **Invite validation** via function (not direct table access)
4. **Audit log access** restricted via view (not direct table)
5. **Revert data** protected by admin-only function
6. **No service role key** in client code

## References

- [docs/10-database-security-model.md](../docs/10-database-security-model.md) - Authoritative security model
- [docs/09-database-and-migrations.md](../docs/09-database-and-migrations.md) - Database operations
- [.planning/archive/migrations/](../.planning/archive/migrations/) - Historical migration context

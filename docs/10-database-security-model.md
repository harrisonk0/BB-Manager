# 10. Database Security Model

This document defines the **authoritative, design-only** database security model for BB Manager’s Supabase Postgres database.
It is intended to be implemented via future SQL migrations under `supabase/migrations/`.

Current state (authoritative):
- Baseline migrations are permissive (broad `GRANT`s) and **no Row Level Security (RLS)** is enabled.
- Application tables: `boys`, `settings`, `user_roles`, `invite_codes`, `audit_logs`.

## 1. Overview

### Purpose

- Define a least-privilege access model enforced by the database (RLS + `GRANT`s), aligned to the authoritative role/permission requirements.
- Specify how application roles are resolved server-side (do not trust client checks).
- Define how unauthenticated invite-code validation and invite-based signup work without exposing broader data.
- Define how audit logs are protected, including the admin sensitivity of `audit_logs.revert_data` and retention requirements.

### Non-goals

- Implementing any migrations, policies, functions, triggers, or code changes in this repo.
- Treating `section` as a security boundary (section isolation is **soft** and contextual).
- Redesigning the data model beyond what is required to enforce the stated security rules.

## 2. Role Model

### Roles

- **Officer**
  - View / edit / delete boys
  - Update marks
  - Operates across both sections
- **Captain**
  - Everything an Officer can do
  - Read all `audit_logs`
  - Manage global + section settings
  - Manage `user_roles` for Officers only
  - Create invite codes for Officers only
  - **One global Captain** (not section-bound)
- **Admin**
  - Everything
  - Revert audit log actions (Admins only)
  - Manage Captain + Officer roles
  - Admins cannot promote anyone to Admin
  - Admins are provisioned manually (no in-app promotion path)

### Hierarchy

Role hierarchy is strictly:

`admin > captain > officer`

Higher roles inherit lower-role permissions unless explicitly disallowed by the rules above (notably: no in-app Admin promotion).

### Section isolation

`section` is **contextual, not a security boundary**. Access controls must not assume section-based isolation for safety. (The app may still use section scoping for UX/performance.)

## 3. Per-Table Access Matrix

Legend: **R** = `SELECT`, **I** = `INSERT`, **U** = `UPDATE`, **D** = `DELETE`, **—** = not permitted via client DB API.

> Note: Signup and invite validation are handled via dedicated database functions (see §4) rather than direct table access for `anon` and pre-role users.

| Table | Officer | Captain | Admin |
|---|---|---|---|
| `boys` | R/I/U/D | R/I/U/D | R/I/U/D |
| `settings` | R | R/I/U | R/I/U |
| `user_roles` | R (self) | R/U/D (Officers only) | R/U/D (Captain+Officer only; no Admin promotion) |
| `invite_codes` | — | R/I/U (Officers only) | R/I/U (Officer+Captain only; never Admin) |
| `audit_logs` | I | R* / I | R / I |

Additional access rules (not expressible in the matrix alone):
- **Unauthenticated (`anon`)**: no access to application tables; only invite code validation (function).
- **Authenticated without an assigned application role**: no access to application tables; only invite-code claim/finalization (function).
- **`audit_logs.revert_data`**: admin-sensitive; Captains may read audit logs but must not be able to read `revert_data` (see §4.5).
- **Audit log retention**: 14 days (see §4.5 and §6).

\* Captain read access to audit logs must be **redacted** with respect to `revert_data`.

## 4. RLS Policy Design

This section describes the proposed RLS policy set and required supporting DB objects.

### 4.1 Role resolution (authoritative)

**Source of truth:** application roles live in `public.user_roles` (as they do today).

**Do not trust client-side checks.** All authorization decisions must be enforceable at the database layer based on the authenticated identity (`auth.uid()`) and the role mapping in `user_roles`.

Because Supabase client requests use shared Postgres roles (`anon` / `authenticated`), *application roles are not Postgres roles*. RLS must therefore evaluate application role membership explicitly.

**Proposed helper function (required):**

```sql
-- SECURITY DEFINER and owned by a BYPASSRLS-capable role (e.g., `postgres`)
-- so it can safely read `user_roles` even when RLS is enabled on `user_roles`.
create function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select ur.role
  from public.user_roles ur
  where ur.uid = auth.uid()::text
  limit 1
$$;
```

**Required schema addition (to enforce “one global captain”):**
- Add a **partial unique index** ensuring only one row may have `role = 'captain'`:
  - `unique (role) where role = 'captain'`

This is the only reliable, DB-enforced mechanism to guarantee “exactly one captain” over time.

**Recommended (but not strictly required) schema hardening:**
- Change `user_roles.uid` from `text` → `uuid` and add a FK to `auth.users(id)` for referential integrity and to avoid repeated casting (`auth.uid()::text`).

### 4.2 Shared authorization predicates

All RLS policies below use these (SQL-style) predicates:

- `public.current_app_role() IN ('officer','captain','admin')` (Officer+)
- `public.current_app_role() IN ('captain','admin')` (Captain+)
- `public.current_app_role() = 'admin'` (Admin)

### 4.3 `boys` table policies

Goal: Officers (and above) can read/write `boys` across both sections. Section is not a security boundary.

```sql
-- boys_select_officer_plus
create policy boys_select_officer_plus
on public.boys
for select
to authenticated
using (public.current_app_role() in ('officer','captain','admin'));

-- boys_insert_officer_plus
create policy boys_insert_officer_plus
on public.boys
for insert
to authenticated
with check (public.current_app_role() in ('officer','captain','admin'));

-- boys_update_officer_plus
create policy boys_update_officer_plus
on public.boys
for update
to authenticated
using (public.current_app_role() in ('officer','captain','admin'))
with check (public.current_app_role() in ('officer','captain','admin'));

-- boys_delete_officer_plus
create policy boys_delete_officer_plus
on public.boys
for delete
to authenticated
using (public.current_app_role() in ('officer','captain','admin'));
```

### 4.4 `settings` table policies

Goal: all authenticated roles can read settings; Captains/Admins manage settings.

```sql
-- settings_select_officer_plus
create policy settings_select_officer_plus
on public.settings
for select
to authenticated
using (public.current_app_role() in ('officer','captain','admin'));

-- settings_insert_captain_admin
create policy settings_insert_captain_admin
on public.settings
for insert
to authenticated
with check (public.current_app_role() in ('captain','admin'));

-- settings_update_captain_admin
create policy settings_update_captain_admin
on public.settings
for update
to authenticated
using (public.current_app_role() in ('captain','admin'))
with check (public.current_app_role() in ('captain','admin'));
```

Design note: no `DELETE` policy is defined (deny-by-default). Settings should be changed by `UPDATE`/`UPSERT`, not removed.

### 4.5 `audit_logs` table policies (including admin-sensitive `revert_data`)

Authoritative requirements:
- `audit_logs` readable by **Admins + Captain**
- Revert actions: **Admins only**
- Retention: **14 days**
- `audit_logs.revert_data` is **admin-sensitive**

#### 4.5.1 Write policy (insert-only for app roles)

All application roles that can change data need to be able to write audit logs. Audit logs must be **append-only** for client access (no update/delete).

```sql
-- audit_logs_insert_officer_plus
create policy audit_logs_insert_officer_plus
on public.audit_logs
for insert
to authenticated
with check (
  public.current_app_role() in ('officer','captain','admin')
  and (
    action_type <> 'REVERT_ACTION'
    or public.current_app_role() = 'admin'
  )
);
```

No `UPDATE`/`DELETE` policies are defined for `authenticated` (deny-by-default). Retention deletion is handled via a privileged job (see §4.5.3).

#### 4.5.2 Read access while protecting `revert_data`

Because Supabase clients share the `authenticated` Postgres role, **Postgres column privileges cannot distinguish Captain vs Admin**. RLS also cannot restrict a single column (`revert_data`) while allowing other columns.

To enforce “`revert_data` is admin-sensitive”, the read interface must not expose `revert_data` to Captains.

**Required schema additions (read interface):**

1. Revoke direct `SELECT` on `public.audit_logs` from API roles (`anon`, `authenticated`).
2. Add a view for Captain/Admin audit log reading **without** `revert_data`:

```sql
create view public.audit_logs_read as
select
  id,
  section,
  "timestamp",
  user_email,
  action_type,
  description,
  reverted_log_id,
  created_at
from public.audit_logs
where public.current_app_role() in ('captain','admin');
```

3. Add an admin-only RPC/function to fetch `revert_data` for a specific log:

```sql
create function public.audit_log_revert_data(log_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select al.revert_data
  from public.audit_logs al
  where al.id = log_id
    and public.current_app_role() = 'admin'
$$;
```

This satisfies:
- Captains can read audit logs via `audit_logs_read` but cannot access `revert_data`.
- Admins can read audit logs via `audit_logs_read` and can access `revert_data` via `audit_log_revert_data`.

#### 4.5.3 Retention enforcement (14 days)

Retention is not an RLS concern. Implement as a privileged scheduled job (e.g., Supabase scheduled function / cron) running with a role that bypasses RLS (service role) that executes:

```sql
delete from public.audit_logs
where created_at < now() - interval '14 days';
```

### 4.6 `invite_codes` table policies (including unauthenticated validation and signup)

Authoritative requirements:
- Unauthenticated access: none except invite code validation + signup with valid invite code
- Invite codes expire in **7 days**
- Expired or revoked codes are **hard-invalid everywhere**
- Captain can create invite codes for **Officers only**
- Admin can create invite codes for **Officers + Captain** only

#### 4.6.1 Unauthenticated validation (no table access)

RLS cannot prevent enumeration of valid invite codes if `anon` can `SELECT` from `invite_codes`. Therefore:

- `anon` must not have `SELECT` on `public.invite_codes`.
- Provide a narrowly-scoped validation function exposed to `anon`.

**Required schema addition (RPC):**

```sql
create function public.validate_invite_code(code text)
returns table (
  is_valid boolean,
  section text,
  default_user_role text,
  expires_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    (ic.id is not null) as is_valid,
    ic.section,
    ic.default_user_role,
    ic.expires_at
  from public.invite_codes ic
  where ic.id = code
    and ic.revoked = false
    and ic.is_used = false
    and ic.expires_at > now()
    and ic.default_user_role in ('officer','captain') -- never allow admin via invite
  limit 1
$$;
```

This function returns only what is needed for validation and does not expose generator/usage PII.

#### 4.6.2 Atomic invite claim + role assignment (authenticated)

To avoid non-atomic, bypassable multi-statement signup flows, role assignment must be finalized in the database as a single operation.

**Required schema addition (RPC):**

```sql
-- Called after Supabase Auth signup, while the user is authenticated.
-- Performs: validate invite -> mark invite as used -> insert user_roles row.
create function public.claim_invite_code(code text)
returns table (
  assigned_role text,
  section text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  ic record;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  -- Prevent re-claim / role switching.
  if exists (select 1 from public.user_roles ur where ur.uid = auth.uid()::text) then
    raise exception 'Role already assigned';
  end if;

  -- Lock the invite code row to prevent race conditions.
  select *
  into ic
  from public.invite_codes
  where id = code
  for update;

  if ic is null
     or ic.revoked = true
     or ic.is_used = true
     or ic.expires_at <= now()
     or ic.default_user_role not in ('officer','captain') then
    raise exception 'Invalid invite code';
  end if;

  -- Enforce “one global captain” (unique index will also enforce).
  if ic.default_user_role = 'captain' then
    -- This insert will fail if a captain already exists once the unique index is in place.
    null;
  end if;

  update public.invite_codes
  set
    is_used = true,
    used_at = now(),
    used_by = coalesce(auth.jwt() ->> 'email', auth.uid()::text)
  where id = ic.id;

  insert into public.user_roles (uid, email, role)
  values (auth.uid()::text, coalesce(auth.jwt() ->> 'email', ''), ic.default_user_role);

  return query select ic.default_user_role, ic.section;
end;
$$;
```

This flow ensures:
- Only valid, unexpired, unrevoked, unused codes can be claimed.
- Codes are single-use and become invalid immediately.
- Role assignment is DB-enforced and derived from the invite code.

#### 4.6.3 Management policies (Captain/Admin)

Captains/Admins can manage invite codes, with Captains restricted to **Officer** invite codes only.

```sql
-- invite_codes_select_manage
create policy invite_codes_select_manage
on public.invite_codes
for select
to authenticated
using (
  public.current_app_role() = 'admin'
  or (
    public.current_app_role() = 'captain'
    and default_user_role = 'officer'
  )
);

-- invite_codes_insert_manage
create policy invite_codes_insert_manage
on public.invite_codes
for insert
to authenticated
with check (
  public.current_app_role() in ('captain','admin')
  and default_user_role in ('officer','captain')
  and not revoked
  and not is_used
  and used_by is null
  and used_at is null
  and expires_at > now()
  and expires_at <= now() + interval '7 days'
  and (
    public.current_app_role() <> 'captain'
    or default_user_role = 'officer'
  )
);

-- invite_codes_update_manage
create policy invite_codes_update_manage
on public.invite_codes
for update
to authenticated
using (
  public.current_app_role() = 'admin'
  or (
    public.current_app_role() = 'captain'
    and default_user_role = 'officer'
  )
)
with check (
  default_user_role in ('officer','captain')
  and (
    public.current_app_role() <> 'captain'
    or default_user_role = 'officer'
  )
);
```

**Required schema additions to enforce “hard-invalid everywhere”:**

RLS cannot enforce “no un-revoke” / “no un-use” / “immutability of expiry/default role” because it cannot compare old vs new values. Add triggers (or constraints where possible) that enforce:
- `revoked` is monotonic: `false -> true` only
- `is_used` is monotonic: `false -> true` only
- `expires_at` is fixed at creation (7 days) and not modifiable
- `default_user_role` is fixed at creation

### 4.7 `user_roles` table policies

Goal: provide role lookup to the logged-in user; allow Captains/Admins to manage roles within constraints; prevent any in-app Admin promotion; keep Admin role provisioning manual-only.

```sql
-- user_roles_select_self_or_manage
create policy user_roles_select_self_or_manage
on public.user_roles
for select
to authenticated
using (
  uid = auth.uid()::text
  or (
    public.current_app_role() = 'captain'
    and role = 'officer'
  )
  or (
    public.current_app_role() = 'admin'
    and role in ('officer','captain')
  )
);

-- user_roles_update_captain_manage_officers
create policy user_roles_update_captain_manage_officers
on public.user_roles
for update
to authenticated
using (
  public.current_app_role() = 'captain'
  and role = 'officer'
)
with check (
  role = 'officer' -- captains can only keep officers as officers
);

-- user_roles_update_admin_manage_captain_officer
create policy user_roles_update_admin_manage_captain_officer
on public.user_roles
for update
to authenticated
using (
  public.current_app_role() = 'admin'
  and role in ('officer','captain')
  and uid <> auth.uid()::text -- prevent self-lockout via app
)
with check (
  role in ('officer','captain') -- no in-app promotion to admin
);

-- user_roles_delete_captain_manage_officers
create policy user_roles_delete_captain_manage_officers
on public.user_roles
for delete
to authenticated
using (
  public.current_app_role() = 'captain'
  and role = 'officer'
);

-- user_roles_delete_admin_manage_captain_officer
create policy user_roles_delete_admin_manage_captain_officer
on public.user_roles
for delete
to authenticated
using (
  public.current_app_role() = 'admin'
  and role in ('officer','captain')
  and uid <> auth.uid()::text -- prevent self-lockout via app
);
```

Intentionally absent:
- No `INSERT` policy for `authenticated`. Role assignment is performed by `claim_invite_code()` (and manual provisioning via service-role/SQL), not by direct client inserts.
- No ability for any client to insert/update/delete rows with `role = 'admin'`. Admins are provisioned manually and cannot promote anyone to Admin.

## 5. GRANT Tightening Plan

Baseline migrations currently grant broad privileges to `anon` and `authenticated` on all tables. These must be tightened after the RLS policies and required functions/views are in place.

### 5.1 Revoke broad baseline grants

For each application table, revoke unnecessary privileges from `anon` and `authenticated`:

```sql
revoke all on table public.boys from anon, authenticated;
revoke all on table public.settings from anon, authenticated;
revoke all on table public.user_roles from anon, authenticated;
revoke all on table public.invite_codes from anon, authenticated;
revoke all on table public.audit_logs from anon, authenticated;
```

Also revoke unneeded table privileges where present (`TRIGGER`, `TRUNCATE`, `REFERENCES`) for API roles.

### 5.2 Minimal grants (post-RLS)

Grant only what is required for the API surface (RLS still governs what each app role can do):

```sql
-- Core data operations (RLS restricts to Officer+)
grant select, insert, update, delete on table public.boys to authenticated;

-- Settings: readable by Officer+, writable by Captain+ (RLS)
grant select, insert, update on table public.settings to authenticated;

-- User roles: readable per policies; writable per policies (no client inserts)
grant select, update, delete on table public.user_roles to authenticated;

-- Invite code management: Captain+/Admin via RLS
grant select, insert, update on table public.invite_codes to authenticated;

-- Audit log writes only
grant insert on table public.audit_logs to authenticated;

-- Read surfaces for audit logs (redacted)
grant select on table public.audit_logs_read to authenticated;

-- Unauthenticated invite validation
grant execute on function public.validate_invite_code(text) to anon;

-- Authenticated invite claim/finalization
grant execute on function public.claim_invite_code(text) to authenticated;

-- Admin-only revert data RPC can be granted to authenticated because the function enforces role.
grant execute on function public.audit_log_revert_data(uuid) to authenticated;
```

Design note: `service_role` retains broad privileges and bypasses RLS. It is required for operational tasks like retention and must never be shipped client-side.

## 6. Rollout Strategy

Safe sequencing is required to avoid locking out legitimate users and to prevent a partially-deployed model from weakening security.

### 6.1 Local → staging → prod sequencing

1. **Local**
   - Add migrations that introduce helper functions/views (`current_app_role`, `validate_invite_code`, `claim_invite_code`, `audit_logs_read`, `audit_log_revert_data`) and the “single captain” unique index.
   - Add RLS policies but **do not enable RLS** yet (policies can be created before `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`).
   - Update the application to:
     - Validate invite codes via `validate_invite_code()` rather than direct `SELECT` on `invite_codes`.
     - Finalize signup via `claim_invite_code()` rather than directly writing `user_roles` / `invite_codes`.
     - Read audit logs via `audit_logs_read` and fetch `revert_data` via `audit_log_revert_data()` only when needed (Admin only).
2. **Staging**
   - Ensure role data is correct (exactly one Captain; Admin rows provisioned manually).
   - Enable RLS on all application tables.
   - Run an end-to-end manual validation of:
     - Officer: CRUD boys, update marks, cannot read audit logs, cannot manage settings/invites/roles.
     - Captain: Officer capabilities + read audit logs (redacted) + manage settings + manage officer roles + create officer invite codes.
     - Admin: Captain capabilities + admin-only revert data access + manage captain/officer roles.
     - Unauthenticated: only invite validation works; no data access.
     - New signup: validate invite → signup → claim invite → role appears → app access works.
3. **Production**
   - Deploy the app changes first (so it can operate under the new security model).
   - Apply migrations that enable RLS and tighten `GRANT`s.
   - Monitor error rates (`permission denied`, `RLS violation`) and be prepared to break-glass if necessary.

### 6.2 Break-glass / recovery

Break-glass is required because misconfigured RLS/`GRANT`s can cause full app lockout.

Recommended recovery options (operational):
- Use a server-side process with the Supabase **service role key** (never client-side) to:
  - Temporarily disable RLS on impacted tables, or
  - Restore minimal `GRANT`s, or
  - Manually repair `user_roles` (e.g., re-provision Captain/Admin).
- Maintain a “known-good” rollback migration path for the RLS/`GRANT` changes.

## 7. Open Questions & Risks

- **Settings read access for Officers**: this doc assumes Officers can read `settings`; confirm this is intended.
- **`audit_logs.revert_data` protection requires interface changes**: Captains cannot safely read `revert_data` under the shared `authenticated` DB role; the app must use `audit_logs_read` + admin-only `audit_log_revert_data()`.
- **Existing data may violate “single captain”**: production data must be audited and corrected before applying the unique captain constraint.
- **Invite code flow changes**: current multi-statement client signup must be replaced with `claim_invite_code()` to be enforceable and race-safe.
- **Retention mechanism**: a scheduled deletion job must exist and be monitored; it is not provided by RLS alone.

# Phase 4 Configuration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Configure local development environment, document MCP workflow and database schema, and enable automated unit testing in CI pipeline

**Architecture:** Phase 4 has three workstreams: (1) environment setup with `.env` configuration, (2) documentation covering MCP Supabase tools workflow and current database schema, and (3) CI enhancement to run unit tests on every push. No new features - pure configuration and documentation.

**Tech Stack:** Vite, TypeScript, Vitest, GitHub Actions, MCP Supabase tools, Markdown documentation

---

## Task 1: Complete .env.example Template

**Files:**
- Modify: `.env.example`

**Step 1: Search for all environment variable usage**

Run: `grep -r "import.meta.env" src/ --include="*.ts" --include="*.tsx"`
Expected: List of all VITE_ prefixed variables used in codebase

**Step 2: Compare against .env.example**

Read: `.env.example`
Verify: Every variable found in Step 1 is documented in `.env.example`

**Step 3: Add missing variables with documentation**

If any variables are missing from `.env.example`, add them with inline comments:

```bash
# Client (Vite) environment variables
# These are embedded into the browser bundle at build time.
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY

# Optional: Express server (server.js)
PORT=3000

# Optional: manual diagnostics (scripts/diagnostics/security-probe.ts)
# Used for security testing and validation
PROBE_OFFICER_EMAIL=officer@example.com
PROBE_OFFICER_PASSWORD=CHANGEME
PROBE_CAPTAIN_EMAIL=captain@example.com
PROBE_CAPTAIN_PASSWORD=CHANGEME
PROBE_EXPIRED_OR_REVOKED_INVITE_CODE=ABC123
```

**Step 4: Verify .gitignore contains .env**

Read: `.gitignore`
Confirm `.env` is present (add if missing):
```
.env
```

**Step 5: Commit**

```bash
git add .env.example .gitignore
git commit -m "docs(phase-4): complete and document .env.example template"
```

---

## Task 2: Create Local .env File

**Files:**
- Create: `.env` (gitignored)

**Step 1: Create .env from template**

Run: `cp .env.example .env`

**Step 2: Edit .env with real Supabase credentials**

Replace placeholder values with actual Supabase project credentials:
- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous/public key

Keep optional variables as placeholders or remove if not needed.

**Step 3: Verify dev server starts**

Run: `npm run dev`
Expected: Server starts on http://localhost:5173 without missing variable errors
Press Ctrl+C to stop

**Step 4: Verify .env is gitignored**

Run: `git check-ignore .env`
Expected: `.env` (returns the pattern, confirming it's ignored)

Run: `git status`
Expected: `.env` should NOT appear in untracked files

**Step 5: Commit (no .env file included)**

```bash
git add .gitignore  # Update if modified
git commit -m "docs(phase-4): ensure .env is gitignored"
```

---

## Task 3: Document MCP Supabase Workflow

**Files:**
- Create: `docs/10-mcp-workflow.md`

**Step 1: Create MCP workflow documentation**

Create comprehensive guide covering:

```markdown
# MCP Supabase Tools Workflow

## Overview

BB-Manager uses MCP (Model Context Protocol) Supabase tools for all database operations. This replaces traditional local migration files with direct database manipulation through MCP tools.

## Why MCP Tools?

- **Single source of truth:** Live database is authoritative
- **No drift:** Local files never become stale
- **Direct execution:** Changes applied immediately to remote database
- **Tool integration:** Claude Code can query and manipulate DB directly

## Available MCP Tools

### Core Tools

1. **mcp__supabase__execute_sql** - Run raw SQL queries
   - Use for: DML operations, SELECT queries, quick fixes
   - Not for: DDL operations (use apply_migration instead)

2. **mcp__supabase__apply_migration** - Apply DDL migrations
   - Use for: CREATE TABLE, ALTER TABLE, CREATE INDEX, RLS policies
   - Automatically names and tracks migrations

3. **mcp__supabase__list_tables** - List all tables in schema
   - Use for: Exploring structure, verifying changes

4. **mcp__supabase__list_migrations** - View migration history
   - Use for: Auditing changes, verifying deployment state

## Common Operations

### Creating a New Table

```
Use: mcp__supabase__apply_migration
Name: create_feature_table
Query:
  CREATE TABLE feature_table (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    section TEXT NOT NULL CHECK (section IN ('company', 'junior')),
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
```

### Adding RLS Policies

```
Use: mcp__supabase__apply_migration
Name: feature_table_rls_policies
Query:
  ALTER TABLE feature_table ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "Officers can read feature_table"
    ON feature_table FOR SELECT
    TO authenticated
    USING (
      EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('officer', 'captain', 'admin'))
      AND section = (SELECT section FROM user_roles WHERE user_id = auth.uid())
    );
```

### Creating Security Functions

```
Use: mcp__supabase__apply_migration
Name: create_security_function
Query:
  CREATE OR REPLACE FUNCTION can_do_thing(user_id UUID)
  RETURNS BOOLEAN AS $$
    SELECT EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = can_do_thing.user_id
      AND role IN ('captain', 'admin')
    );
  $$ SECURITY DEFINER SET search_path = public;
```

### Querying Data

```
Use: mcp__supabase__execute_sql
Query: SELECT * FROM boys WHERE section = 'company' LIMIT 5;
```

### Modifying Data

```
Use: mcp__supabase__execute_sql
Query: UPDATE boys SET name = 'New Name' WHERE id = 'uuid-here';
```

## Best Practices

### Security

- **ALWAYS use SECURITY DEFINER with search_path = public** for functions
- **Never use service role key** in client code
- **Use subquery pattern** for volatile functions in RLS: `(SELECT auth.uid())`
- **Test RLS policies** with different role contexts

### Migration Naming

- Use snake_case: `create_users_table`, `add_audit_logs_rls`
- Be descriptive: `fix_audit_logs_insert_policy` not `audit_fix`
- Group related changes: `boys_and_settings_rls_policies`

### DDL vs DML

- **DDL (Schema changes):** Use `apply_migration`
  - CREATE, ALTER, DROP
  - RLS policies
  - Functions, triggers

- **DML (Data changes):** Use `execute_sql`
  - INSERT, UPDATE, DELETE
  - SELECT queries
  - Data fixes

### Verification

After migrations, verify:

1. **Table structure:** Use `list_tables` to confirm
2. **RLS policies:** Query `pg_policies` system view
3. **Data integrity:** Test with sample queries
4. **Security:** Verify permissions with different roles

## Historical Context

Local migration files were used in early development. See `.planning/archive/migrations/` for historical reference. All future database changes use MCP tools directly.

## Related Documentation

- Database schema: `docs/09-database-and-migrations.md`
- Architecture: `ARCHITECTURE.md`
- Security model: `docs/02-architecture.md`
```

**Step 2: Validate documentation**

Read: `docs/10-mcp-workflow.md`
Verify: Content is clear, examples are accurate, follows project style

**Step 3: Commit**

```bash
git add docs/10-mcp-workflow.md
git commit -m "docs(phase-4): add MCP Supabase workflow guide"
```

---

## Task 4: Document Current Database Schema

**Files:**
- Modify or Create: `docs/09-database-and-migrations.md`

**Step 1: Query database for current schema**

Use MCP tools to gather schema information:

```
mcp__supabase__list_tables
  schemas: ["public"]

mcp__supabase__execute_sql
  query: SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname;

mcp__supabase__execute_sql
  query: SELECT routine_name, routine_type, data_type, security_type FROM information_schema.routines WHERE routine_schema = 'public' ORDER BY routine_name;
```

**Step 2: Create comprehensive schema documentation**

If `docs/09-database-and-migrations.md` exists, update it. Otherwise create new file with:

```markdown
# Database Schema and Migrations

## Current Schema

### Tables

#### boys
Stores boy/member records with marks history.

**Columns:**
- `id` (UUID, primary key, default gen_random_uuid())
- `name` (TEXT, not null)
- `section` (TEXT, not null, check: 'company' or 'junior')
- `marks` (JSONB, default '[]')
  - Array of mark entries with structure:
  ```typescript
  {
    date: string;        // YYYY-MM-DD format
    score?: number;      // Company: 0-10, Junior: sum of both
    uniformScore?: number;  // Junior: 0-10
    behaviourScore?: number; // Junior: 0-5
  }
  ```
- `squad` (TEXT)
- `createdAt` (TIMESTAMPTZ, default NOW())

**Indexes:**
- `idx_boys_section` on `section`

**RLS Policies:**
- `boys_select_own_section`: Officers/Captains/Admin can read boys in their section
- `boys_insert_officer_plus`: Officers/Captains/Admin can insert boys
- `boys_update_officer_plus`: Officers/Captains/Admin can update boys
- `boys_delete_captain_admin`: Captains/Admin can delete boys

#### settings
Per-section settings for marks configuration.

**Columns:**
- `section` (TEXT, primary key, 'company' or 'junior')
- `maxScore` (INTEGER)
- `maxUniformScore` (INTEGER)
- `maxBehaviourScore` (INTEGER)
- `dates` (JSONB, default '[]')

**RLS Policies:**
- `settings_select_own_section`: Authenticated users can read their section's settings
- `settings_update_captain_admin`: Captains/Admin can update settings

#### user_roles
Maps users to application roles and sections.

**Columns:**
- `userId` (UUID, primary key, references auth.users)
- `role` (TEXT, not null, check: 'admin', 'captain', 'officer')
- `section` (TEXT, not null, check: 'company', 'junior')

**Indexes:**
- `idx_user_roles_user_id` on `userId`

**RLS Policies:**
- `user_roles_select_own`: Users can read their own role
- `user_roles_select_captain_admin`: Captains/Admin can read all roles
- `user_roles_insert_captain_admin`: Captains/Admin can insert roles
- `user_roles_update_captain_admin`: Captains/Admin can update roles
- `user_roles_delete_captain_admin`: Captains/Admin can delete roles

#### invite_codes
Signup invitation codes with usage tracking.

**Columns:**
- `id` (UUID, primary key, default gen_random_uuid())
- `code` (TEXT, unique, not null)
- `role` (TEXT, not null)
- `section` (TEXT, not null)
- `createdAt` (TIMESTAMPTZ, default NOW())
- `expiresAt` (TIMESTAMPTZ)
- `used` (BOOLEAN, default false)
- `signupUserId` (UUID)

**Indexes:**
- `idx_invite_codes_code` on `code`
- `idx_invite_codes_expires_at` on `expiresAt`

**RLS Policies:**
- `invite_codes_select_captain_admin`: Captains/Admin can read invite codes
- `invite_codes_insert_admin`: Only Admin can insert codes
- `invite_codes_update_admin`: Only Admin can update codes
- `invite_codes_delete_admin`: Only Admin can delete codes

#### audit_logs
Audit trail of significant actions for compliance.

**Columns:**
- `id` (UUID, primary key, default gen_random_uuid())
- `userId` (UUID, not null)
- `userEmail` (TEXT, not null)
- `action` (TEXT, not null)
- `section` (TEXT)
- `timestamp` (TIMESTAMPTZ, default NOW())
- `revertData` (JSONB)
- `revertedLogId` (UUID)

**Indexes:**
- `idx_audit_logs_section_timestamp` on `section, timestamp DESC`
- `idx_audit_logs_timestamp` on `timestamp DESC`

**RLS Policies:**
- `audit_logs_select_own_section`: Officers can read their section's logs
- `audit_logs_select_captain_admin`: Captains/Admin can read all logs
- `audit_logs_insert_authenticated`: Authenticated users can insert logs
- `audit_logs_select_audit_log_access`: Function-based check for audit log access

### Security Functions

#### get_user_role(user_id UUID) RETURNS TEXT
Returns user's application role. Used in RLS policies for role checks.
```sql
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS TEXT AS $$
  SELECT role FROM user_roles WHERE user_roles.userId = get_user_role.user_id
$$ SECURITY DEFINER SET search_path = public;
```

#### can_access_section(user_id UUID, section TEXT) RETURNS BOOLEAN
Checks if user has access to specified section.
```sql
CREATE OR REPLACE FUNCTION can_access_section(user_id UUID, section TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.userId = can_access_section.user_id
    AND user_roles.section = can_access_section.section
  )
$$ SECURITY DEFINER SET search_path = public;
```

#### can_access_audit_logs(user_id UUID) RETURNS BOOLEAN
Checks if user can access audit logs (Captain/Admin only).
```sql
CREATE OR REPLACE FUNCTION can_access_audit_logs(user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.userId = can_access_audit_logs.user_id
    AND role IN ('captain', 'admin')
  )
$$ SECURITY DEFINER SET search_path = public;
```

### RLS Policy Pattern

All RLS policies use the subquery optimization pattern for volatile functions:

```sql
-- Instead of: auth.uid()
-- Use: (SELECT auth.uid())

USING (
  section = (SELECT section FROM user_roles WHERE user_id = (SELECT auth.uid()))
)
```

This prevents PostgreSQL from re-evaluating volatile functions for each row, providing 10-100x performance improvement.

## Migration History

See `.planning/archive/migrations/` for complete historical migration reference.

**Key migrations:**
- Initial schema: boys, settings, user_roles tables
- RLS enablement: All tables have RLS enabled
- Security functions: get_user_role, can_access_section, can_access_audit_logs
- Audit logging: audit_logs table with revert functionality
- Invite system: invite_codes with expiry tracking
- RLS hardening: All policies use subquery pattern (Phase 1)

## MCP Workflow

All database changes now use MCP Supabase tools. See `docs/10-mcp-workflow.md` for complete guide.
```

**Step 3: Cross-reference with existing docs**

Read: `ARCHITECTURE.md` and `CLAUDE.md`
Ensure: No contradictions with new schema documentation

**Step 4: Commit**

```bash
git add docs/09-database-and-migrations.md
git commit -m "docs(phase-4): document current database schema and RLS policies"
```

---

## Task 5: Add Unit Tests to CI Pipeline

**Files:**
- Modify: `.github/workflows/ci-infrastructure.yml`

**Step 1: Read existing CI workflow**

Read: `.github/workflows/ci-infrastructure.yml`
Understand: Current workflow structure and job steps

**Step 2: Add test execution step**

Add new step after "Type-check code" step:

```yaml
      - name: Type-check code
        run: npx tsc -p tsconfig.json --noEmit

      - name: Run unit tests
        run: npm run test:run

      - name: Create .env file
```

**Step 3: Update workflow summary documentation**

Modify the "E2E Test Documentation" step to mention unit tests:

```yaml
      - name: E2E Test Documentation
        run: |
          echo "## Manual E2E Test Instructions" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "### ✅ Checks Passed" >> $GITHUB_STEP_SUMMARY
          echo "- **Type-check:** Code is type-safe" >> $GITHUB_STEP_SUMMARY
          echo "- **Unit Tests:** All unit tests pass" >> $GITHUB_STEP_SUMMARY
          echo "- **Dev Server:** App starts successfully" >> $GITHUB_STEP_SUMMARY
```

**Step 4: Verify workflow YAML syntax**

Run: `yamllint .github/workflows/ci-infrastructure.yml` (if available)
Or: Use GitHub workflow validator

**Step 5: Commit**

```bash
git add .github/workflows/ci-infrastructure.yml
git commit -m "ci(phase-4): add unit test execution to CI pipeline"
```

---

## Task 6: Test CI Pipeline

**Files:**
- No files created/modified (verification task)

**Step 1: Create feature branch**

Run: `git checkout -b phase-4-ci-tests`

**Step 2: Push to remote**

Run: `git push -u origin phase-4-ci-tests`

**Step 3: Monitor GitHub Actions**

1. Navigate to GitHub repository
2. Click "Actions" tab
3. Find workflow run for phase-4-ci-tests branch
4. Verify "Run unit tests" step executes

**Step 4: Verify test results in workflow**

Expected:
- Type-check step: PASS
- Run unit tests step: PASS
- Dev server step: PASS

**Step 5: Create pull request**

1. Open PR from phase-4-ci-tests to main
2. Verify test results appear in PR checks
3. Merge PR after verification

**Step 6: Cleanup**

Run:
```bash
git checkout main
git pull
git branch -d phase-4-ci-tests
```

**Step 7: Commit (merge)**

```bash
# PR merge commit created by GitHub
```

---

## Task 7: Update Project Documentation

**Files:**
- Modify: `.planning/STATE.md`
- Modify: `.planning/ROADMAP.md`
- Modify: `CLAUDE.md`

**Step 1: Update STATE.md**

Modify `.planning/STATE.md`:

```
Current Position

Phase: 5 of 5 (Functionality Validation)
Plan: 0 of 6 in current phase
Status: Ready to begin - Phase 4 complete
Last activity: 2026-01-28 — Phase 4: Configuration complete

Progress: [████████████] 61%
```

**Step 2: Update ROADMAP.md**

Mark Phase 4 plans complete:

```markdown
### Phase 4: Configuration

**Goal:** Local development environment is properly configured with migrations synced; CI pipeline runs tests on every push

**Depends on:** Phase 1

**Requirements:** CFG-01, CFG-02, CI-01

**Success Criteria** (what must be TRUE):
1. .env file exists with required environment variables populated ✓
2. MCP workflow documentation exists in docs/ ✓
3. Database schema is documented with tables, RLS policies, and functions ✓
4. GitHub Actions workflow runs tests on push ✓
5. CI pipeline shows pass/fail status in GitHub pull requests ✓

**Plans**: 5 plans (revised from original)

Plans:
- [x] 04-01: Create .env file from .env.example and complete template
- [x] 04-02: Document MCP Supabase workflow and database schema
- [x] 04-03: Add unit test execution to CI workflow
- [x] 04-04: Configure CI to run tests successfully
- [x] 04-05: Verify CI pipeline runs on push and shows results
```

**Step 3: Update CLAUDE.md**

Update `CLAUDE.md` Current State section:

```markdown
## Current State

**Status:** Phase 5 ready - Functionality Validation

**Phase:** Phase 5 of 5 (Functionality Validation)
**Progress:** Ready to begin
**Last Updated:** 2026-01-28

Phase 4 (Configuration) complete. Local development environment configured, MCP workflow documented, database schema documented, and CI pipeline runs unit tests automatically.
```

**Step 4: Commit**

```bash
git add .planning/STATE.md .planning/ROADMAP.md CLAUDE.md
git commit -m "docs(phase-4): mark Phase 4 complete, ready for Phase 5"
```

---

## Task 8: Final Verification

**Files:**
- No files created/modified (verification task)

**Step 1: Verify all success criteria**

Check each Phase 4 success criterion:

1. ✓ `.env` file exists locally
   - Run: `ls -la .env`
   - Expected: File exists

2. ✓ `.env.example` is complete
   - Run: `grep -r "import.meta.env" src/`
   - Verify: All variables in `.env.example`

3. ✓ MCP workflow documentation exists
   - Run: `ls docs/10-mcp-workflow.md`
   - Expected: File exists

4. ✓ Database schema documented
   - Run: `ls docs/09-database-and-migrations.md`
   - Expected: File exists with schema details

5. ✓ CI runs tests
   - Check GitHub Actions tab
   - Verify: Latest run shows "Run unit tests" step

**Step 2: Smoke test local development**

Run:
```bash
npm run test:run
```
Expected: All tests pass

Run:
```bash
npm run build
```
Expected: Build completes without errors

**Step 3: Documentation consistency check**

Run: `grep -r "migration files" docs/ CLAUDE.md ARCHITECTURE.md`
Verify: Any references to migration files are updated or contextually accurate

**Step 4: Final commit**

```bash
git status
git add .  # Any remaining updates
git commit -m "chore(phase-4): final verification and cleanup"
```

---

## Summary

Phase 4 Configuration is complete when:
1. ✅ Local `.env` file configured and gitignored
2. ✅ `.env.example` template complete with all variables
3. ✅ MCP Supabase workflow documented in `docs/10-mcp-workflow.md`
4. ✅ Database schema documented in `docs/09-database-and-migrations.md`
5. ✅ CI pipeline runs `npm run test:run` on every push
6. ✅ CI test results visible in GitHub PR checks
7. ✅ Project documentation updated (STATE.md, ROADMAP.md, CLAUDE.md)

**Next Phase:** Phase 5 (Functionality Validation) - E2E testing of core CRUD operations, marks entry, and authentication flows.

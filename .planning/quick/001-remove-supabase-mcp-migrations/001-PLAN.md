---
phase: quick-001
plan: 001
type: execute
wave: 1
depends_on: []
files_modified:
  - supabase/
  - CLAUDE.md
  - .gitignore
autonomous: true
user_setup: []

must_haves:
  truths:
    - "supabase/ directory no longer exists in repository"
    - "CLAUDE.md documents MCP-based migration workflow"
    - "Migration history is preserved in .planning/archive/migrations/"
    - "No .gitignore patterns reference supabase/ directory"
  artifacts:
    - path: ".planning/archive/migrations/"
      provides: "Historical migration reference"
    - path: "CLAUDE.md"
      contains: "MCP", "database operations"
    - path: ".gitignore"
      contains: "!supabase"  # Should NOT contain supabase patterns
  key_links:
    - from: "CLAUDE.md"
      to: "MCP Supabase tools"
      via: "Documentation reference"
      pattern: "mcp.*supabase|MCP.*database"
---

<objective>
Remove local supabase/ directory and migrate to MCP-based database workflow

Purpose: Simplify repository by using MCP Supabase tools for all database operations instead of maintaining local migration files. The Supabase CLI tooling (config.toml, migrations/) is redundant when MCP tools can execute SQL directly against the remote database.

Output: Clean repository with MCP-based database workflow documented in CLAUDE.md
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/execute-plan.md
@~/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@CLAUDE.md

# Existing migrations to archive
- supabase/migrations/20251214144824_remote_schema.sql (base schema with tables, indexes, GRANTs)
- supabase/migrations/20250122085026_audit_logs_rls.sql (RLS policy from Phase 1)
- supabase/config.toml (Supabase CLI configuration)

# MCP tools available
- mcp__supabase__executeSQL: Execute SQL directly on remote database
- mcp__supabase__listTables, mcp__supabase__describeTable: Introspect schema
</context>

<tasks>

<task type="auto">
  <name>Archive existing migrations</name>
  <files>supabase/migrations/*, .planning/archive/migrations/</files>
  <action>
    1. Create archive directory: `.planning/archive/migrations/`
    2. Copy all migration files from `supabase/migrations/` to `.planning/archive/migrations/`
    3. Create `.planning/archive/migrations/README.md` documenting:
       - What each migration did
       - When it was created (from filename timestamps)
       - Phase 1 RLS policy reference
    4. DO NOT delete supabase/ yet - wait until CLAUDE.md is updated
  </action>
  <verify>ls -la .planning/archive/migrations/ shows .sql files and README.md</verify>
  <done>Migration history preserved in .planning/archive/migrations/</done>
</task>

<task type="auto">
  <name>Update CLAUDE.md for MCP workflow</name>
  <files>CLAUDE.md</files>
  <action>
    1. Replace "Database" section in Critical Guardrails:
       - Remove: "Migrations only: Schema/GRANTs/RLS via `supabase/migrations/`"
       - Add: "Database changes via MCP Supabase tools: execute SQL directly on remote database"
       - Remove: "Immutable history: Never modify baseline migrations"
       - Add: "Document all schema changes in .planning/ with rationale"
    2. Update "Repository Structure" section:
       - Remove: "supabase/           # Database migrations"
       - Add: ".planning/archive/migrations/  # Historical migration reference"
    3. Add new "Database Operations" section after "Build Commands":
       ```
       ## Database Operations

       All database changes use MCP Supabase tools (not local migration files):

       - `mcp__supabase__executeSQL`: Run DDL/DML directly on remote database
       - `mcp__supabase__listTables`: List all tables
       - `mcp__supabase__describeTable`: Get table schema

       Schema reference:
       - See `.planning/archive/migrations/` for historical migration context
       - Current live schema is source of truth
       ```
    4. Update "Current State" section - remove Phase 1 reference (it's complete)
    5. Remove "Critical Issues (Phase 1)" section - issues resolved in Phase 1
  </action>
  <verify>grep -q "MCP" CLAUDE.md && ! grep -q "supabase/migrations" CLAUDE.md</verify>
  <done>CLAUDE.md documents MCP workflow with no references to local migration files</done>
</task>

<task type="auto">
  <name>Remove supabase/ directory and update .gitignore</name>
  <files>supabase/, .gitignore</files>
  <action>
    1. Remove entire supabase/ directory:
       `rm -rf supabase/`
    2. Check .gitignore for any supabase-related patterns and remove them
    3. Verify no other files reference supabase/ directory:
       - grep -r "supabase/migrations" --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.planning
       - grep -r "supabase/config" --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.planning
    4. If any references found, update them to note MCP workflow instead
  </action>
  <verify>! [ -d "supabase" ] && ls -la | grep -q "supabase" && echo "Directory gone"</verify>
  <done>supabase/ directory removed, no references to local migration files remain</done>
</task>

</tasks>

<verification>
1. `ls supabase/` returns "No such file or directory"
2. `ls .planning/archive/migrations/` shows archived .sql files with README
3. `grep -i "mcp" CLAUDE.md` returns database workflow documentation
4. `grep -r "supabase/migrations" --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.planning` returns nothing
5. Type check passes: `npx tsc -p tsconfig.json --noEmit`
</verification>

<success_criteria>
- Repository no longer contains supabase/ directory
- CLAUDE.md documents MCP-based database workflow
- Historical migrations preserved in .planning/archive/migrations/
- No code references removed migration files
- Build/typecheck still works
</success_criteria>

<output>
After completion, create `.planning/quick/001-remove-supabase-mcp-migrations/001-SUMMARY.md`
</output>

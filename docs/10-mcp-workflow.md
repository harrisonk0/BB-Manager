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

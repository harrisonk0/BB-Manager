/**
 * Audit Logs RLS Policy Remediation Script
 *
 * Purpose: Apply the secure audit_logs INSERT policy to close security gap
 *
 * This script executes the SQL from migration 20250122085026_audit_logs_rls.sql
 * against the Supabase database using the Supabase client.
 *
 * Usage:
 *   1. Ensure .env.local has VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
 *      (For DDL operations, you may need SERVICE_ROLE_KEY instead)
 *   2. Run: npx tsx scripts/apply-remediation.ts
 *
 * NOTE: For DDL operations (CREATE/DROP POLICY), you typically need
 * service_role permissions, not anon key. This script is provided as
 * a template - the actual execution should be done via:
 *   - Supabase Dashboard SQL Editor
 *   - MCP Supabase tool: mcp__supabase__executeSQL
 */

import { createClient } from '@supabase/supabase-js';

// Read environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
                    process.env.SUPABASE_SERVICE_ROLE_KEY ||
                    process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing Supabase credentials.');
  console.error('Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// SQL to execute
const remediationSQL = `
-- Step 1: Drop existing permissive policy
DROP POLICY IF EXISTS audit_logs_insert ON public.audit_logs;
DROP POLICY IF EXISTS audit_logs_insert_officer_plus ON public.audit_logs;

-- Step 2: Ensure RLS is enabled
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Step 3: Revoke INSERT from anon
REVOKE INSERT ON TABLE public.audit_logs FROM anon;

-- Step 4: Create secure INSERT policy
CREATE POLICY audit_logs_insert_officer_plus
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE uid = auth.uid()::text
  )
  AND user_email = coalesce((auth.jwt() ->> 'email'), '')
  AND created_at > NOW() - INTERVAL '5 minutes'
  AND created_at <= NOW() + INTERVAL '1 minute'
  AND (
    action_type <> 'REVERT_ACTION'
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE uid = auth.uid()::text
      AND role = 'admin'
    )
  )
);
`;

async function executeRemediation() {
  console.log('Executing audit_logs RLS policy remediation...\n');

  try {
    // Use rpc() to execute SQL via a PostgreSQL function
    // Note: This requires a function that can execute dynamic SQL
    // Alternative: Use direct connection via pg library instead

    const { data, error } = await supabase.rpc('exec_sql', {
      sql: remediationSQL
    });

    if (error) {
      console.error('Error executing remediation:', error);
      console.error('\nNOTE: This script requires a service_role key and may need');
      console.error('a direct PostgreSQL connection via psql or Supabase Dashboard.\n');
      console.error('Recommended execution methods:');
      console.error('  1. Supabase Dashboard > SQL Editor');
      console.error('  2. MCP Supabase tool: mcp__supabase__executeSQL');
      console.error('  3. psql with connection string\n');
      console.error('The SQL to execute is in: .planning/phases/01-critical-security/01-07-remediation.sql');
      process.exit(1);
    }

    console.log('Remediation executed successfully!');
    console.log('\nVerifying new policy...');

    // Verify the policy was created
    const { data: policies, error: verifyError } = await supabase
      .rpc('get_policies', { table_name: 'audit_logs' });

    if (verifyError) {
      console.warn('Could not verify policy:', verifyError);
    } else {
      console.log('Current audit_logs INSERT policies:', policies);
    }

  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(1);
  }
}

// Instructions for manual execution
console.log(`
============================================================
AUDIT LOGS RLS POLICY REMEDIATION
============================================================

This script needs to execute DDL statements against the database.
For security reasons, Supabase client library (anon key) cannot
execute DDL statements directly.

RECOMMENDED EXECUTION METHODS:

1. Supabase Dashboard SQL Editor:
   - Go to https://app.supabase.com/project/[your-project]/sql
   - Copy and paste the contents of:
     .planning/phases/01-critical-security/01-07-remediation.sql
   - Click "Run"

2. MCP Supabase Tool (if available):
   - Use: mcp__supabase__executeSQL
   - Execute the SQL from 01-07-remediation.sql

3. psql command line:
   - psql "postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres"
   - Then run: \\i .planning/phases/01-critical-security/01-07-remediation.sql

The SQL file contains all necessary statements in a transaction
to ensure the policy is replaced atomically.

Press Ctrl+C to exit, or modify this script to use a direct
PostgreSQL connection (pg library) with service_role credentials.
============================================================
`);

// Uncomment to attempt execution (requires proper setup)
// executeRemediation();

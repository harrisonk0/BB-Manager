# Comprehensive Audit & E2E Testing Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform legacy BB-Manager codebase into production-ready state through comprehensive code/database audit and E2E testing validation.

**Architecture:** Two-phase approach: (1) Systematic code and database audit of 4 critical workflows (auth/roles, invite codes, member CRUD, weekly marks) with immediate critical fixes, (2) E2E test implementation using Playwright MCP to validate all workflows end-to-end.

**Tech Stack:** Supabase (Postgres + Auth), React, TypeScript, Playwright MCP for browser automation, MCP Supabase tools for database inspection

---

## Task 1: Database Schema Inspection

**Files:**
- Read: None (database inspection via MCP)
- Create: `docs/audit-2026-01-27.md` (audit findings document)

**Step 1: List all database tables**

Use MCP Supabase tool to inspect database structure:
```
mcp__supabase__list_tables with schemas: ["public"]
```

Expected: List of tables including `boys`, `settings`, `user_roles`, `invite_codes`, `audit_logs`

**Step 2: Document table schemas**

For each critical table, describe schema via MCP queries (store findings in audit doc):
- `boys` table: columns, types, constraints
- `user_roles` table: columns, types, constraints
- `invite_codes` table: columns, types, constraints
- `audit_logs` table: columns, types, constraints

**Step 3: Verify RLS policies**

Check that RLS policies exist and are enforced:
- Query to check RLS is enabled on tables
- Document policy names and functions they use
- Verify search_path mitigation is in place

**Step 4: Check for data integrity issues**

Run queries to find potential problems:
```sql
-- Check for orphaned user_roles (users without auth entries)
SELECT ur.* FROM user_roles ur
LEFT JOIN auth.users ON auth.users.id = ur.user_id
WHERE auth.users.id IS NULL;

-- Check for invalid mark values
SELECT id, name, marks FROM boys
WHERE marks IS NOT NULL
  AND NOT (marks->'scores' IS NULL OR jsonb_typeof(marks->'scores') = 'array');

-- Check for expired invite codes that are still marked unused
SELECT * FROM invite_codes
WHERE expires_at < NOW() AND used = false;

-- Check for malformed mark dates
SELECT id, name, marks
FROM boys
WHERE marks IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM jsonb_array_elements(marks->'scores') AS score
    WHERE score->>'date' !~ '^\d{4}-\d{2}-\d{2}$'
  );
```

**Step 5: Create initial audit document**

Create `docs/audit-2026-01-27.md` with:
- Database schema findings
- Data integrity observations
- Any obvious schema issues
- RLS policy verification results

**Step 6: Commit initial findings**

```bash
git add docs/audit-2026-01-27.md
git commit -m "audit: initial database schema inspection

- Documented table schemas
- Verified RLS policies
- Checked for data integrity issues
```

---

## Task 2: Auth & Roles Code Audit

**Files:**
- Read: `src/services/supabaseAuth.ts`, `src/hooks/useAuthAndRole.ts`
- Modify: As needed for critical fixes
- Test: N/A (code audit phase)

**Step 1: Read auth service implementation**

Read `src/services/supabaseAuth.ts` completely:
- Understand how `signIn`, `signUp`, `signOut` work
- Check error handling for each operation
- Verify session management
- Look for missing auth state handling

**Step 2: Read auth hook implementation**

Read `src/hooks/useAuthAndRole.ts`:
- Understand auth state subscription logic
- Check how role is loaded from `user_roles` table
- Verify error handling for missing roles
- Look for race conditions or missing states

**Step 3: Trace auth flow**

Map out the complete auth flow:
1. User enters credentials → 2. `signIn` called → 3. Supabase Auth → 4. Auth state changes → 5. Role loaded from DB → 6. User can access app

Look for gaps in this flow (e.g., what happens if role loading fails?).

**Step 4: Identify and categorize issues**

Update `docs/audit-2026-01-27.md` with auth findings:
- **Critical Issues:** Things that completely break auth (fix immediately)
- **Low Priority:** Poor error messages, missing edge case handling, inefficient code

**Step 5: Fix critical auth issues immediately**

If any critical issues found:
- Fix the code (minimal change)
- Test locally if possible
- Commit with descriptive message

**Step 6: Commit auth audit findings**

```bash
git add docs/audit-2026-01-27.md src/services/supabaseAuth.ts src/hooks/useAuthAndRole.ts
git commit -m "audit: auth and roles code review complete

[Findings documented in audit report]
[Critical issues fixed if any found]
```

---

## Task 3: Invite Codes Code Audit

**Files:**
- Read: `src/services/db.ts` (invite code functions)
- Modify: As needed for critical fixes
- Test: N/A (code audit phase)

**Step 1: Read invite code functions**

From `src/services/db.ts`, read and understand:
- `generateInviteCode` - how codes are created
- `fetchInviteCode` - how codes are validated
- `updateInviteCode` - how codes are marked used
- Signup flow integration

**Step 2: Trace invite code lifecycle**

Map out the complete invite code flow:
1. Admin generates code → 2. Code stored in DB → 3. User signs up with code → 4. Code validated → 5. User created in Auth → 6. Role assigned → 7. Code marked used

**Step 3: Check expiration logic**

Verify:
- How expiration is set (7 days vs UI's 24 hours)
- How expired codes are handled during signup
- Whether expiration validation works correctly

**Step 4: Identify and categorize issues**

Update `docs/audit-2026-01-27.md` with invite code findings:
- **Critical Issues:** Broken validation, expiration bugs, race conditions
- **Low Priority:** Inconsistent expiration times, poor error messages

**Step 5: Fix critical invite code issues immediately**

If any critical issues found:
- Fix the code (minimal change)
- Test against database if possible
- Commit with descriptive message

**Step 6: Commit invite code audit findings**

```bash
git add docs/audit-2026-01-27.md src/services/db.ts
git commit -m "audit: invite codes code review complete

[Findings documented in audit report]
[Critical issues fixed if any found]
```

---

## Task 4: Member CRUD Code Audit

**Files:**
- Read: `src/services/db.ts` (boy operations), `src/components/RosterPage.tsx`
- Modify: As needed for critical fixes
- Test: N/A (code audit phase)

**Step 1: Read member CRUD functions**

From `src/services/db.ts`, read and understand:
- `fetchBoys` - how members are loaded
- `createBoy` - how new members are created
- `updateBoy` - how members are updated
- `deleteBoyById` - how members are deleted
- Validation logic for member data

**Step 2: Read RosterPage component**

Read `src/components/RosterPage.tsx`:
- Understand how member list is displayed
- Check how create/edit/delete operations are called
- Verify error handling and user feedback
- Look for missing validation or edge cases

**Step 3: Trace CRUD operations**

Map out each operation:
- **Create:** Form data → validation → createBoy → database → refresh list
- **Update:** Form data → validation → updateBoy → database → refresh list
- **Delete:** Confirmation → deleteBoyById → database → refresh list

**Step 4: Verify section isolation**

Check that:
- All queries include `section` parameter
- Company and junior data don't mix
- No cross-section data leaks

**Step 5: Identify and categorize issues**

Update `docs/audit-2026-01-27.md` with member CRUD findings:
- **Critical Issues:** Broken CRUD ops, missing validation, data corruption
- **Low Priority:** Poor error messages, missing confirmations, UX issues

**Step 6: Fix critical member CRUD issues immediately**

If any critical issues found:
- Fix the code (minimal change)
- Test against database if possible
- Commit with descriptive message

**Step 7: Commit member CRUD audit findings**

```bash
git add docs/audit-2026-01-27.md src/services/db.ts src/components/RosterPage.tsx
git commit -m "audit: member CRUD code review complete

[Findings documented in audit report]
[Critical issues fixed if any found]
```

---

## Task 5: Weekly Marks Entry Code Audit

**Files:**
- Read: `src/components/WeeklyMarksPage.tsx`, `src/services/db.ts` (mark validation)
- Modify: As needed for critical fixes
- Test: N/A (code audit phase)

**Step 1: Read WeeklyMarksPage component**

Read `src/components/WeeklyMarksPage.tsx` completely:
- Understand how marks are loaded and displayed
- Check how mark entry works
- Verify validation logic (score ranges, date formats)
- Look for audit log creation
- Check how marks are saved (batch updates vs individual)

**Step 2: Read mark validation logic**

From `src/services/db.ts`, find and understand:
- Mark validation functions (score ranges, date formats)
- Company vs Junior mark differences
- How invalid marks are prevented

**Step 3: Trace marks entry flow**

Map out the complete flow:
1. Page loads → 2. Fetch boys with marks → 3. Display marks table → 4. User enters scores → 5. Validate → 6. Update marks → 7. Create audit log → 8. Refresh data

**Step 4: Verify score validation**

Check validation rules are enforced:
- **Company:** score in [0, 10]
- **Junior:** uniformScore in [0, 10], behaviourScore in [0, 5], total = sum
- **All:** Scores have ≤ 2 decimal places
- **Dates:** YYYY-MM-DD format

**Step 5: Check audit log creation**

Verify that:
- Audit log is created when marks are updated
- Old state is captured in `revertData`
- Log includes correct action type

**Step 6: Identify and categorize issues**

Update `docs/audit-2026-01-27.md` with weekly marks findings:
- **Critical Issues:** Validation failures, broken updates, missing audit logs
- **Low Priority:** Poor error messages, UX issues, inefficient updates

**Step 7: Fix critical weekly marks issues immediately**

If any critical issues found:
- Fix the code (minimal change)
- Test against database if possible
- Commit with descriptive message

**Step 8: Commit weekly marks audit findings**

```bash
git add docs/audit-2026-01-27.md src/components/WeeklyMarksPage.tsx src/services/db.ts
git commit -m "audit: weekly marks entry code review complete

[Findings documented in audit report]
[Critical issues fixed if any found]
```

---

## Task 6: Start Development Server for E2E Testing

**Files:**
- None (run commands only)

**Step 1: Start dev server in background**

```bash
npm run dev
```

Expected output: Server starts on http://localhost:5173

**Note:** Keep this server running for all subsequent E2E tests

---

## Task 7: E2E Test - Auth Workflow

**Files:**
- Create: `tests/e2e/01-auth-workflow.md`

**Step 1: Create test document**

Create `tests/e2e/01-auth-workflow.md` with test steps and expected results

**Step 2: Navigate to app**

Using Playwright MCP:
```
mcp__playwright__browser_navigate with url: "http://localhost:5173"
```

Expected: Login page loads

**Step 3: Take baseline screenshot**

```
mcp__playwright__browser_take_screenshot with filename: "tests/e2e/screenshots/01-login-page.png"
```

**Step 4: Test successful login**

Fill in login form:
```
mcp__playwright__browser_fill_form with fields: [
  { name: "email", type: "textbox", ref: "<email-field-ref>", value: "test@example.com" },
  { name: "password", type: "textbox", ref: "<password-field-ref>", value: "abc" }
]
```

Click login button:
```
mcp__playwright__browser_click with ref: "<login-button-ref>"
```

Expected: Redirect to dashboard/app, no errors

**Step 5: Verify user is logged in**

Check page state:
```
mcp__playwright__browser_snapshot
```

Expected: Shows dashboard/roster view, user menu visible

**Step 6: Test session persistence**

Navigate to a different page, then reload:
```
mcp__playwright__browser_navigate with url: "http://localhost:5173"
```

Expected: Still logged in, doesn't redirect to login

**Step 7: Document results**

Update `tests/e2e/01-auth-workflow.md` with:
- Screenshots of each step
- Any errors encountered
- Pass/fail status

**Step 8: Commit test results**

```bash
git add tests/e2e/01-auth-workflow.md tests/e2e/screenshots/
git commit -m "test(e2e): auth workflow test results

[Document pass/fail status]
```

---

## Task 8: E2E Test - Invite Code Workflow

**Files:**
- Create: `tests/e2e/02-invite-code-workflow.md`

**Step 1: Navigate to signup**

Using Playwright MCP:
```
mcp__playwright__browser_navigate with url: "http://localhost:5173/signup"
```

Expected: Signup page loads

**Step 2: Test signup with invalid code**

Attempt to signup with invalid invite code:
```
mcp__playwright__browser_fill_form with fields: [
  { name: "email", type: "textbox", ref: "<email-ref>", value: "newuser@example.com" },
  { name: "password", type: "textbox", ref: "<password-ref>", value: "testpass123" },
  { name: "inviteCode", type: "textbox", ref: "<code-ref>", value: "INVALID-CODE" }
]
```

Click signup:
```
mcp__playwright__browser_click with ref: "<signup-button-ref>"
```

Expected: Error message "Invalid invite code"

**Step 3: Generate valid invite code via database**

Use MCP Supabase to create a test invite code:
```sql
INSERT INTO invite_codes (code, created_by, expires_at)
VALUES ('TEST-CODE-123', 'test@example.com', NOW() + INTERVAL '7 days')
RETURNING code;
```

**Step 4: Test signup with valid code**

Fill form with valid code:
```
mcp__playwright__browser_fill_form with fields: [
  { name: "email", type: "textbox", ref: "<email-ref>", value: "test-signup-@example.com" },
  { name: "password", type: "textbox", ref: "<password-ref>", value: "testpass123" },
  { name: "inviteCode", type: "textbox", ref: "<code-ref>", value: "TEST-CODE-123" }
]
```

Click signup:
```
mcp__playwright__browser_click with ref: "<signup-button-ref>"
```

Expected: Successful signup, redirected to app

**Step 5: Verify user role was assigned**

Query database:
```sql
SELECT * FROM user_roles WHERE user_id = (SELECT id FROM auth.users WHERE email = 'test-signup-@example.com');
```

Expected: User has role assigned

**Step 6: Verify invite code marked used**

Query database:
```sql
SELECT * FROM invite_codes WHERE code = 'TEST-CODE-123';
```

Expected: `used = true`

**Step 7: Document results**

Update `tests/e2e/02-invite-code-workflow.md` with:
- Screenshots
- Any errors
- Pass/fail status

**Step 8: Commit test results**

```bash
git add tests/e2e/02-invite-code-workflow.md tests/e2e/screenshots/
git commit -m "test(e2e): invite code workflow test results

[Document pass/fail status]
```

---

## Task 9: E2E Test - Member CRUD Workflow

**Files:**
- Create: `tests/e2e/03-member-crud-workflow.md`

**Step 1: Navigate to roster page**

Ensure logged in, then:
```
mcp__playwright__browser_navigate with url: "http://localhost:5173"
```

Select Company section if not already:
```
mcp__playwright__browser_click with ref: "<section-selector>"
```

Expected: Roster page loads with member list

**Step 2: Test create new member**

Click "Add Member" button:
```
mcp__playwright__browser_click with ref: "<add-member-button>"
```

Fill in member form:
```
mcp__playwright__browser_fill_form with fields: [
  { name: "name", type: "textbox", ref: "<name-ref>", value: "Test Boy E2E" },
  { name: "age", type: "textbox", ref: "<age-ref>", value: "10" }
]
```

Click save:
```
mcp__playwright__browser_click with ref: "<save-button>"
```

Expected: New member appears in list, no errors

**Step 3: Test edit member**

Find and click edit on the created member:
```
mcp__playwright__browser_click with element: "Edit button for Test Boy E2E", ref: "<edit-button-ref>"
```

Update name:
```
mcp__playwright__browser_type with ref: "<name-field>", text: "Test Boy E2E Updated"
```

Click save:
```
mcp__playwright__browser_click with ref: "<save-button>"
```

Expected: Member name updated in list

**Step 4: Test delete member**

Find and click delete on the member:
```
mcp__playwright__browser_click with element: "Delete button for Test Boy E2E", ref: "<delete-button>"
```

Confirm deletion if prompted:
```
mcp__playwright__browser_handle_dialog with accept: true
```

Expected: Member removed from list, no errors

**Step 5: Verify section isolation**

Switch to Junior section:
```
mcp__playwright__browser_click with ref: "<junior-section>"
```

Expected: Different member list (or empty)

**Step 6: Document results**

Update `tests/e2e/03-member-crud-workflow.md` with:
- Screenshots of each operation
- Any errors encountered
- Pass/fail status

**Step 7: Commit test results**

```bash
git add tests/e2e/03-member-crud-workflow.md tests/e2e/screenshots/
git commit -m "test(e2e): member CRUD workflow test results

[Document pass/fail status]
```

---

## Task 10: E2E Test - Weekly Marks Entry Workflow

**Files:**
- Create: `tests/e2e/04-weekly-marks-workflow.md`

**Step 1: Navigate to marks page**

Ensure logged in and on Company section, then:
```
mcp__playwright__browser_navigate with url: "http://localhost:5173"
```

Click "Weekly Marks" in navigation:
```
mcp__playwright__browser_click with ref: "<marks-nav-link>"
```

Expected: Marks page loads with table of boys and scores

**Step 2: Test mark validation - invalid score**

Enter invalid score (e.g., 15 for Company section where max is 10):
```
mcp__playwright__browser_type with ref: "<first-boy-score-field>", text: "15"
```

Attempt to save:
```
mcp__playwright__browser_click with ref: "<save-button>"
```

Expected: Validation error "Score must be between 0 and 10"

**Step 3: Test valid score entry**

Enter valid score:
```
mcp__playwright__browser_type with ref: "<first-boy-score-field>", text: "7.5"
```

Enter score for another boy:
```
mcp__playwright__browser_type with ref: "<second-boy-score-field>", text: "8.0"
```

Click save:
```
mcp__playwright__browser_click with ref: "<save-button>"
```

Expected: Marks saved successfully, no errors

**Step 4: Verify marks persist**

Reload page:
```
mcp__playwright__browser_navigate with url: "http://localhost:5173"
```

Navigate back to marks page:
```
mcp__playwright__browser_click with ref: "<marks-nav-link>"
```

Expected: Entered scores still present

**Step 5: Check audit log was created**

Query database:
```sql
SELECT * FROM audit_logs
WHERE action = 'UPDATE_MARKS'
ORDER BY created_at DESC
LIMIT 1;
```

Expected: Audit log exists with `revertData` containing old marks

**Step 6: Test Junior section marks (different validation)**

Switch to Junior section:
```
mcp__playwright__browser_click with ref: "<junior-section>"
```

Navigate to marks:
```
mcp__playwright__browser_click with ref: "<marks-nav-link>"
```

Expected: Shows uniform and behaviour score fields (separate)

**Step 7: Document results**

Update `tests/e2e/04-weekly-marks-workflow.md` with:
- Screenshots of marks entry
- Validation error messages
- Any errors encountered
- Pass/fail status

**Step 8: Commit test results**

```bash
git add tests/e2e/04-weekly-marks-workflow.md tests/e2e/screenshots/
git commit -m "test(e2e): weekly marks entry workflow test results

[Document pass/fail status]
```

---

## Task 11: Compile Final Audit Report

**Files:**
- Modify: `docs/audit-2026-01-27.md`

**Step 1: Gather all findings**

Review all commits and test results from Tasks 1-10

**Step 2: Organize by category**

Update `docs/audit-2026-01-27.md` with sections:
1. **Summary** - High-level overview of audit
2. **Database Findings** - Schema, RLS, data integrity
3. **Auth & Roles** - Issues found and fixed
4. **Invite Codes** - Issues found and fixed
5. **Member CRUD** - Issues found and fixed
6. **Weekly Marks** - Issues found and fixed
7. **E2E Test Results** - Pass/fail for each workflow
8. **Low Priority Issues** - Documented but not fixed
9. **Recommendations** - Future improvements

**Step 3: Add severity ratings**

For each issue, tag with:
- 🔴 **CRITICAL** - Fixed during audit (broke workflows)
- 🟡 **MEDIUM** - Should fix soon (degrades UX, minor bugs)
- 🟢 **LOW** - Nice to have (code quality, optimizations)

**Step 4: Add test coverage summary**

Document:
- Which workflows were tested
- Test pass rate
- Any workflows that couldn't be tested

**Step 5: Final commit**

```bash
git add docs/audit-2026-01-27.md
git commit -m "docs(audit): complete comprehensive audit report

- Database schema and RLS verified
- All 4 critical workflows audited
- E2E tests executed and documented
- Critical issues fixed
- Low priority issues documented for future work

Test Coverage:
✓ Auth & login workflow
✓ Invite code generation & signup
✓ Member CRUD operations
✓ Weekly marks entry
```

---

## Task 12: Merge Audit Branch to Main

**Files:**
- None (git operations)

**Step 1: Switch to main branch**

```bash
git checkout main
```

**Step 2: Pull latest changes**

```bash
git pull origin main
```

**Step 3: Merge audit branch**

```bash
git merge audit-and-e2e-testing
```

**Step 4: Push merged changes**

```bash
git push origin main
```

**Step 5: Cleanup worktree (optional)**

```bash
git worktree remove .worktrees/audit-and-e2e
git branch -d audit-and-e2e-testing
```

**Step 6: Celebrate**

🎉 Audit complete! Codebase is now production-ready with validated critical workflows.

---

## Success Criteria

After completing this plan, you should have:

✅ **Database Audit:**
- All critical tables documented
- RLS policies verified
- Data integrity checked

✅ **Code Audit:**
- All 4 critical workflows reviewed
- Critical bugs fixed
- Low priority issues documented

✅ **E2E Testing:**
- Auth workflow validated
- Invite code flow validated
- Member CRUD validated
- Weekly marks entry validated

✅ **Documentation:**
- Comprehensive audit report
- E2E test results with screenshots
- Recommendations for future improvements

✅ **Code Quality:**
- All changes committed with clear messages
- Type-checking passes
- No regressions introduced

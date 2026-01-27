# E2E Test: Member CRUD Workflow

**Test Date:** 2026-01-27
**Tester:** Automated E2E Test (Playwright MCP)
**Environment:** http://localhost:3001
**Status:** ⚠️ PARTIAL FAILURE - Critical Bug Found

---

## Test Overview

This test verifies the complete CRUD (Create, Read, Update, Delete) workflow for member management in the Company Section.

### Test Scenarios

1. ✅ **Create Member** - Add a new boy to the roster
2. ❌ **Update Member** - Edit existing member details (CRITICAL BUG)
3. ✅ **Delete Member** - Remove a member from the roster
4. ✅ **Section Isolation** - Verify Company and Junior sections have separate data

---

## Test Execution

### 1. Navigate to Roster Page

**Status:** ✅ PASS

**Steps:**
1. Logged in with test@example.com / abc
2. Selected "Manage Company Section"
3. Roster page loaded successfully

**Screenshot:** `01-roster-page-initial.png`

**Observations:**
- Page loads with existing members displayed
- Members organized by squads (Squad 1, 2, 3)
- Each member shows: Name, Year, Total Marks, Attendance
- Action buttons available: View marks, Edit, Delete

---

### 2. Create New Member

**Status:** ✅ PASS

**Steps:**
1. Clicked "Add Boy" button
2. Filled in form:
   - Name: "Test Boy E2E"
   - School Year: Year 10
   - Squad: Squad 1 (default)
3. Clicked "Add Boy" to save

**Screenshot:** `03-member-created-success.png`

**Result:**
- ✅ Success notification displayed: "Added 'Test Boy E2E' successfully."
- ✅ New member appeared in Squad 1 list
- ✅ Member displayed with correct details:
  - Name: Test Boy E2E
  - Year: Year 10
  - Total Marks: 0
  - Attendance: 0%

**Screenshots:**
- `02-add-member-modal.png` - Form before submission
- `03-member-created-success.png` - After successful creation

---

### 3. Update Member

**Status:** ❌ CRITICAL BUG - FAIL

**Steps:**
1. Clicked "Edit" button for "Test Boy E2E"
2. Updated name from "Test Boy E2E" to "Test Boy E2E Updated"
3. Clicked "Update Boy" to save changes

**Screenshot:** `05-edit-error.png`

**Error Encountered:**
```
Failed to save boy: Error: Could not find the 'isSquadLeader' column of 'boys' in the schema cache
```

**Console Error:**
```javascript
[ERROR] Failed to load resource: the server responded with a status of 400 ()
@ https://smjictierxsqgdmwobrj.supabase.co/rest/v1/boys?id=eq.000ed954-d05c-459a-974f-9605cd9b0a62&section=eq.company&select=*:0

[ERROR] Failed to save boy: Error: Could not find the 'isSquadLeader' column of 'boys' in the schema cache
    at updateBoy (http://localhost:3001/services/db.ts:218:11)
    at async handleSubmit (http://localhost:3001/components/BoyForm.tsx:65:9)
    @ http://localhost:3001/components/BoyForm.tsx:78
```

**Root Cause Analysis:**

**File:** `/Users/harrisonk/dev/BB-Manager/.worktrees/audit-and-e2e/services/db.ts`

**Problem Location:** Lines 267-273 in `updateBoy` function

```typescript
export const updateBoy = async (boy: Boy, section: Section): Promise<Boy> => {
  validateBoyMarks(boy, section);
  const { id, ...boyData } = boy;
  const { data, error } = await supabase
    .from('boys')
    .update({
      ...boyData,  // ❌ BUG: Spreads isSquadLeader (camelCase) which Supabase doesn't recognize
      section,
      is_squad_leader: boyData.isSquadLeader ?? false,  // This is correct but gets overridden
    })
    .eq('id', id)
    .eq('section', section)
    .select()
    .single();
```

**Issue:**
- The TypeScript `Boy` interface uses camelCase: `isSquadLeader`
- The database column uses snake_case: `is_squad_leader`
- The spread operator `...boyData` includes `isSquadLeader` (camelCase)
- Supabase rejects the update because it doesn't recognize the `isSquadLeader` column name
- The explicit `is_squad_leader: boyData.isSquadLeader ?? false` is correct but the spread operator causes the error

**Impact:** ❌ CRITICAL
- Users cannot edit member details
- Any attempt to update a member fails with a schema error
- This is a complete blocker for the Update operation

**Screenshots:**
- `04-edit-modal-opened.png` - Edit form with member data
- `05-edit-error.png` - Error message displayed

---

### 4. Delete Member

**Status:** ✅ PASS

**Steps:**
1. Clicked "Delete" button for "Test Boy E2E"
2. Confirmed deletion in modal
3. Verified member was removed from list

**Screenshot:** `07-delete-success.png`

**Result:**
- ✅ Confirmation dialog displayed: "Are you sure you want to delete Test Boy E2E? This action cannot be undone directly, but can be reverted from the audit log."
- ✅ Success notification displayed: "'Test Boy E2E' was deleted."
- ✅ Member removed from Squad 1 list
- ✅ No errors in console

**Screenshots:**
- `06-delete-confirmation.png` - Delete confirmation dialog
- `07-delete-success.png` - After successful deletion

---

### 5. Section Isolation

**Status:** ✅ PASS

**Steps:**
1. Opened user menu
2. Clicked "Switch Section"
3. Selected "Manage Junior Section"
4. Verified Junior section roster is separate from Company section

**Screenshot:** `10-junior-section-empty.png`

**Result:**
- ✅ Section selection screen displayed correctly
- ✅ Junior Section has different branding (Junior Section Logo)
- ✅ Junior Section roster is empty ("Your Roster is Empty")
- ✅ Company Section members are NOT visible in Junior Section
- ✅ Data properly isolated by section

**Screenshots:**
- `08-user-menu.png` - User menu with "Switch Section" option
- `09-section-selection.png` - Section selection screen
- `10-junior-section-empty.png` - Empty Junior Section roster

---

## Test Results Summary

| Operation | Status | Details |
|-----------|--------|---------|
| Create Member | ✅ PASS | Member created successfully, appears in correct squad |
| Update Member | ❌ FAIL | CRITICAL: Schema mismatch between TypeScript interface and database column names |
| Delete Member | ✅ PASS | Member deleted with confirmation, success notification displayed |
| Section Isolation | ✅ PASS | Company and Junior sections maintain separate data |

**Overall Status:** ⚠️ PARTIAL FAILURE

---

## Critical Bug Details

### Bug: Member Update Fails with Schema Error

**Severity:** CRITICAL
**Priority:** P0 - Blocks core functionality

**Description:**
The `updateBoy` function in `services/db.ts` uses the spread operator on a TypeScript object containing camelCase properties, but Supabase expects snake_case column names. This causes all member update operations to fail.

**Affected Code:**
```typescript
// File: services/db.ts, Lines 267-273
const { id, ...boyData } = boy;
const { data, error } = await supabase
  .from('boys')
  .update({
    ...boyData,  // ❌ Spreads isSquadLeader (camelCase)
    section,
    is_squad_leader: boyData.isSquadLeader ?? false,
  })
```

**Fix Required:**
```typescript
const { id, isSquadLeader, name, squad, year, marks } = boy;
const { data, error } = await supabase
  .from('boys')
  .update({
    name,
    squad,
    year,
    marks,
    section,
    is_squad_leader: isSquadLeader ?? false,
  })
```

**Database Schema (verified):**
```sql
column_name     | data_type | is_nullable
----------------|-----------|-------------
is_squad_leader | boolean   | NO
```

**TypeScript Interface (current):**
```typescript
export interface Boy {
  isSquadLeader?: boolean;  // ❌ camelCase
}
```

---

## Recommendations

### Immediate Actions Required

1. **Fix Critical Bug** - Update `services/db.ts` `updateBoy` function to properly map TypeScript properties to database columns
2. **Review All CRUD Operations** - Audit `addBoy`, `updateBoy`, and `deleteBoy` functions for similar issues
3. **Add Integration Tests** - Create automated tests for member CRUD to catch this type of bug

### Long-term Improvements

1. **Type Safety Layer** - Consider using a type transformation layer to automatically convert between camelCase (TypeScript) and snake_case (database)
2. **Schema Validation** - Add runtime validation to catch schema mismatches early
3. **Better Error Messages** - Provide user-friendly error messages instead of raw schema errors

---

## Console Errors

### Non-Critical Warnings

```
[ERROR] Received `%s` for a non-boolean attribute `%s`.
```
- **Impact:** Low - React/JSX warning, doesn't affect functionality
- **Frequency:** Intermittent
- **Action:** Monitor, but not blocking

### Critical Errors

```
[ERROR] Failed to load resource: the server responded with a status of 400 ()
@ https://smjictierxsqgdmwobrj.supabase.co/rest/v1/boys?id=eq.000ed954-d05c-459a-974f-9605cd9b0a62&section=eq.company&select=*:0

[ERROR] Failed to save boy: Error: Could not find the 'isSquadLeader' column of 'boys' in the schema cache
```
- **Impact:** CRITICAL - Blocks member updates
- **Frequency:** Every update operation
- **Action:** Must fix immediately

---

## Test Environment

- **URL:** http://localhost:3001
- **Browser:** Playwright (Chromium)
- **Test User:** test@example.com
- **Sections Tested:** Company Section, Junior Section
- **Database:** Supabase (smjictierxsqgdmwobrj)

---

## Screenshots Reference

All screenshots saved to: `tests/e2e/screenshots/`

1. `01-roster-page-initial.png` - Initial roster page with existing members
2. `02-add-member-modal.png` - Add member form modal
3. `03-member-created-success.png` - Success message after creating member
4. `04-edit-modal-opened.png` - Edit form modal with member data
5. `05-edit-error.png` - Error message when trying to update member
6. `06-delete-confirmation.png` - Delete confirmation dialog
7. `07-delete-success.png` - Success message after deleting member
8. `08-user-menu.png` - User menu dropdown
9. `09-section-selection.png` - Section selection screen
10. `10-junior-section-empty.png` - Empty Junior Section roster

---

## Conclusion

The member CRUD workflow E2E test revealed a **CRITICAL BUG** in the update functionality. While create and delete operations work correctly, the update operation fails completely due to a schema mismatch between the TypeScript interface (camelCase) and the database schema (snake_case).

This bug must be fixed before the application can be considered production-ready for member management. The fix is straightforward but requires immediate attention.

**Next Steps:**
1. Fix the `updateBoy` function in `services/db.ts`
2. Re-run this E2E test to verify the fix
3. Consider adding similar fixes to other CRUD operations if needed
4. Add integration tests to prevent regression

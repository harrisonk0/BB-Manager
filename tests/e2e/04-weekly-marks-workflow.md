# E2E Test: Weekly Marks Entry Workflow

**Test Date:** 2026-01-27
**Tester:** Claude (E2E Audit Agent)
**Test Environment:** http://localhost:3001
**Status:** ❌ **FAILED - Critical Bug Discovered**

## Test Objective

Verify the weekly marks entry workflow for Company section, including:
- Navigation to marks page
- Score validation (0-10 range)
- Valid score entry and saving
- Marks persistence after reload
- Audit log creation
- Junior section marks handling

## Test Results Summary

| Test Step | Expected Result | Actual Result | Status |
|-----------|----------------|---------------|--------|
| Navigate to marks page | Marks page loads with boys list | ✅ Loaded successfully | PASS |
| Test invalid score (15) | Validation error "Must be between 0 and 10" | ✅ Error displayed immediately | PASS |
| Enter valid scores (7.5, 8) | Scores accepted in inputs | ✅ Scores entered successfully | PASS |
| Click "Save Marks" | Marks saved to database | ❌ **Error: Column name mismatch** | **FAIL** |
| Check audit logs | UPDATE_MARKS log created | ❌ No audit log created | FAIL |
| Verify marks persistence | Marks persist after reload | ⏸️ Not tested (save failed) | SKIPPED |
| Junior section marks | Separate uniform/behaviour scores | ⏸️ Not tested (no Junior boys) | SKIPPED |

## Critical Bug Discovered

### Issue: Column Name Mismatch Prevents Marks Save

**Error Message:**
```
Error: Could not find the 'isSquadLeader' column of 'boys' in the schema cache
    at updateBoy (http://localhost:3001/services/db.ts:218:11)
    at async Promise.all (index 0)
    at async handleSaveMarks (http://localhost:3001/components/WeeklyMarksPage.tsx:262:7)
```

**Root Cause:**
The code references `isSquadLeader` (camelCase) but the database column is `is_squad_leader` (snake_case).

**Evidence:**
1. Database schema shows column name: `is_squad_leader`
2. Code in `services/db.ts:218` tries to access: `isSquadLeader`
3. Error occurs when calling `updateBoy()` during marks save operation

**Impact:**
- **CRITICAL**: Marks cannot be saved for any boy
- All weekly marks entry functionality is broken
- Audit logs are not created (since save fails)
- User data loss risk (users enter marks but they don't persist)

## Test Execution Details

### Step 1: Navigate to Marks Page
✅ **PASS**
- Successfully switched from Junior to Company section
- Weekly Marks page loaded with 13 boys across 3 squads
- Date picker showed 2026-01-30 (correct meeting day - Friday)
- All boys initially marked as "Present"
- Score input fields displayed for each boy

**Screenshot:** `tests/e2e/screenshots/10-weekly-marks-03-company-marks-page.png`

### Step 2: Test Score Validation - Invalid Score
✅ **PASS**
- Entered score "15" for Ewan McIlroy (exceeds max of 10)
- Validation error appeared immediately: "Must be between 0 and 10"
- Error message displayed below the input field
- Input remained in invalid state
- No save attempted (validation prevents invalid saves)

**Screenshot:** `tests/e2e/screenshots/10-weekly-marks-04-validation-error.png`

### Step 3: Enter Valid Scores
✅ **PASS**
- Cleared invalid score (15) and entered "7.5" for Ewan McIlroy
- Entered "8" for Blake Arbuthnot
- Both scores accepted in input fields
- No validation errors displayed
- "Save Marks" button visible and clickable at bottom of page

**Screenshot:** `tests/e2e/screenshots/10-weekly-marks-05-valid-scores-entered.png`

### Step 4: Attempt to Save Marks
❌ **FAIL - Critical Bug**
- Clicked "Save Marks" button
- Error notification appeared: "Failed to save marks. Please try again."
- Console showed 400 errors for PATCH requests to `/rest/v1/boys`
- Root error: Column name mismatch (`isSquadLeader` vs `is_squad_leader`)
- No marks were saved to database
- No audit logs created

**Screenshot:** `tests/e2e/screenshots/10-weekly-marks-06-save-error.png`

**Console Errors:**
```javascript
[ERROR] Failed to load resource: the server responded with a status of 400 ()
    @ https://smjictierxsqgdmwobrj.supabase.co/rest/v1/boys?id=eq.3cjsyiS1TnjkYsA29h4z&section=eq.company&select=*

[ERROR] Failed to save marks Error: Could not find the 'isSquadLeader' column of 'boys' in the schema cache
    at updateBoy (http://localhost:3001/services/db.ts:218:11)
    at async Promise.all (index 0)
    at async handleSaveMarks (http://localhost:3001/components/WeeklyMarksPage.tsx:262:7)
```

### Step 5: Verify Database State
✅ **CONFIRMED - No Save Occurred**
- Queried database for boys' marks after attempted save
- No entry for 2026-01-30 in any boy's marks array
- Last marks entry was 2025-11-28 (old data)
- Confirms save operation failed completely

**Database Query Result:**
```sql
SELECT name, marks FROM boys WHERE section = 'company' ORDER BY name ASC LIMIT 5;
```
All boys show marks array ending with 2025-11-28, no 2026-01-30 entries.

### Step 6: Check Audit Logs
✅ **CONFIRMED - No Audit Log Created**
- Queried audit_logs table for UPDATE_MARKS action
- Result: Empty array
- Confirms that save operation failed before audit log creation
- Expected: Audit log with revert_data containing old marks
- Actual: No audit log created

**Database Query Result:**
```sql
SELECT * FROM audit_logs WHERE action_type = 'UPDATE_MARKS' ORDER BY timestamp DESC LIMIT 5;
```
Result: `[]` (no rows)

### Step 7: Test Junior Section
⏸️ **SKIPPED - No Junior Section Boys**
- Switched to Junior section
- No boys in Junior section roster
- Cannot test Junior-specific features:
  - Separate uniform score field (0-10 range)
  - Separate behaviour score field (0-10 range)
  - Different validation rules
- Would need to create Junior section boys to test fully

**Note:** Settings table also shows 406 error when loading Junior settings:
```
Failed to load resource: the server responded with a status of 406 ()
    @ https://smjictierxsqgdmwobrj.supabase.co/rest/v1/settings?select=meeting_day&section=eq.junior
```
This suggests Junior section may not have settings configured.

## Screenshots

1. **Section Settings** - `10-weekly-marks-01-section-settings.png`
   - Shows Company section with Friday meeting day configured

2. **Junior Empty Marks** - `10-weekly-marks-02-junior-empty.png`
   - Junior section with no boys to mark

3. **Company Marks Page** - `10-weekly-marks-03-company-marks-page.png`
   - 13 boys across 3 squads, all marked Present
   - Date picker showing 2026-01-30
   - Score input fields ready for entry

4. **Validation Error** - `10-weekly-marks-04-validation-error.png`
   - Invalid score (15) triggers validation
   - Error message: "Must be between 0 and 10"

5. **Valid Scores Entered** - `10-weekly-marks-05-valid-scores-entered.png`
   - Score 7.5 entered for Ewan McIlroy
   - Score 8 entered for Blake Arbuthnot
   - Ready to save

6. **Save Error** - `10-weekly-marks-06-save-error.png`
   - Error notification: "Failed to save marks. Please try again."
   - Red error indicator visible

## Recommendations

### 1. Fix Column Name Mismatch (CRITICAL)
**File:** `services/db.ts` (line 218)
**Issue:** Code uses `isSquadLeader` but database has `is_squad_leader`

**Fix Options:**
- **Option A:** Update code to use `is_squad_leader` (recommended - maintain snake_case convention in database layer)
- **Option B:** Rename database column to `is_squad_leader` (breaking change, requires migration)

**Recommended Fix:**
```typescript
// In services/db.ts
// Change from:
isSquadLeader: boy.isSquadLeader
// To:
is_squad_leader: boy.is_squad_leader
```

### 2. Add Integration Tests
Add E2E test coverage for:
- Marks save operation
- Audit log creation after save
- Marks persistence after page reload
- Junior section separate score fields

### 3. Database Schema Consistency
Audit all database column references to ensure:
- Database uses snake_case (PostgreSQL convention)
- Code properly maps between camelCase (TypeScript) and snake_case (PostgreSQL)
- Consider using a type-safe ORM or query builder to prevent mismatches

### 4. Error Handling Improvement
Current error message is generic: "Failed to save marks. Please try again."

**Recommended:**
- Display more specific error messages to users
- Log detailed errors for debugging
- Consider showing validation errors inline if save fails due to data issues

### 5. Complete Junior Section Testing
- Create test data for Junior section boys
- Test uniform score field (0-10)
- Test behaviour score field (0-10)
- Verify separate validation rules

## Additional Findings

### Settings Table Error
```
Failed to load resource: the server responded with a status of 406 ()
    @ https://smjictierxsqgdmwobrj.supabase.co/rest/v1/settings?select=meeting_day&section=eq.junior
```

This suggests the Junior section settings are not properly configured. The settings table has a composite primary key on `section`, but the query may be failing due to RLS policies or missing row for Junior section.

### Network Request Analysis
- GET requests to load boys: ✅ 200 OK
- PATCH requests to update boys: ❌ 400 Bad Request
- POST requests to audit_logs: ❌ Never reached (save failed first)

The 400 error on PATCH requests confirms the column name issue prevents database updates.

## Conclusion

The weekly marks entry workflow test revealed a **critical bug** that completely prevents marks from being saved. While the UI validation works correctly and the user experience is smooth up to the save point, the save operation fails due to a column name mismatch between the code and database.

**Severity:** CRITICAL
**Impact:** Users cannot save weekly marks - core feature is broken
**Priority:** Immediate fix required

**Test Status:** ❌ FAILED

**Next Steps:**
1. Fix column name mismatch in `services/db.ts`
2. Re-run this E2E test to verify fix
3. Complete Junior section testing
4. Add regression tests to prevent recurrence

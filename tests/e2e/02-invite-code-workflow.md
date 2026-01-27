# E2E Test: Invite Code Workflow

**Date:** 2026-01-27
**Tester:** Claude Code (Audit Agent)
**Environment:** http://localhost:3001
**Test Type:** Functional & Security Audit
**Status:** ❌ **CRITICAL FAILURE**

---

## Executive Summary

**CRITICAL SECURITY VULNERABILITY DISCOVERED**

The invite code signup workflow is **completely broken** due to Row-Level Security (RLS) policies blocking unauthenticated users from validating invite codes during signup.

**Impact:** Users cannot sign up using invite codes. This is a production-breaking bug that prevents new user registration.

**Severity:** CRITICAL - Complete feature failure

---

## Test Steps Performed

### 1. Navigate to Signup Page ✅
**Status:** PASS

- Navigated to: `http://localhost:3001/signup`
- Initially saw section selection screen (already logged in)
- Logged out to access public signup
- Clicked "Sign up with an invite code"
- Signup form loaded successfully

**Screenshot:** `02-invite-signup-form.png`

**Form Fields Verified:**
- Email address
- Password
- Confirm Password
- Invite Code

---

### 2. Test Invalid Invite Code ❌
**Status:** BLOCKED BY RLS POLICY

**Test Data:**
- Email: `newuser@example.com`
- Password: `testpass123`
- Invite Code: `INVALID-CODE`

**Expected Behavior:**
- User should see error: "Invalid invite code"

**Actual Behavior:**
- **Error displayed:** "Failed to create account"
- **Technical error:** "permission denied for table invite_codes"
- **HTTP Error:** Failed to load resource for `/rest/v1/invite_codes?select=*&id=eq.INVALID-CODE`

**Screenshot:** `02-invalid-code-filled.png` and `02-critical-rls-error.png`

**Console Errors:**
```
[ERROR] Failed to load resource: the server responded with a status of 403 (Forbidden)
[ERROR] Sign up error: Error: permission denied for table invite_codes
```

---

### 3. Database Schema Verification ✅
**Status:** PASS

**Invite Codes Table Schema:**
```sql
CREATE TABLE invite_codes (
  id TEXT PRIMARY KEY,
  generated_by TEXT NOT NULL,
  section TEXT,
  used_by TEXT,
  used_at TIMESTAMPTZ,
  default_user_role TEXT NOT NULL CHECK (default_user_role IN ('admin', 'captain', 'officer')),
  expires_at TIMESTAMPTZ NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT now(),
  is_used BOOLEAN DEFAULT false,
  revoked BOOLEAN DEFAULT false
);
```

**RLS Status:** Enabled ✅

---

### 4. Valid Invite Code Generation ✅
**Status:** PASS (Manual Database Operation)

**SQL Executed:**
```sql
INSERT INTO invite_codes (id, generated_by, expires_at, default_user_role)
VALUES ('TEST-CODE-123', 'test@example.com', NOW() + INTERVAL '3 days', 'officer')
RETURNING id, generated_by, expires_at, default_user_role;
```

**Result:**
```json
{
  "id": "TEST-CODE-123",
  "generated_by": "test@example.com",
  "expires_at": "2026-01-30 19:45:20.261903+00",
  "default_user_role": "officer"
}
```

✅ Valid invite code created successfully in database

---

### 5. Root Cause Analysis ❌

**RLS Policies on `invite_codes` Table:**

#### Policy 1: `invite_codes_select`
```sql
CREATE POLICY invite_codes_select ON invite_codes
  FOR SELECT
  TO public
  USING (get_user_role(auth.uid()::text) = 'admin'::text);
```

**Problem:** This policy requires:
- `auth.uid()` to be NOT NULL (user must be authenticated)
- `get_user_role()` to return 'admin'

**During signup:**
- User is NOT authenticated yet
- `auth.uid()` = NULL
- `get_user_role(NULL)` = NULL
- NULL != 'admin' ❌
- **ACCESS DENIED**

#### Policy 2: `invite_codes_select_manage`
```sql
CREATE POLICY invite_codes_select_manage ON invite_codes
  FOR SELECT
  TO authenticated
  USING (
    current_app_role() = 'admin'
    OR (current_app_role() = 'captain' AND default_user_role = 'officer')
  );
```

**Problem:** This policy requires:
- User to be `authenticated` role
- But during signup, user is `anon` role (not authenticated)

**Result:** **ACCESS DENIED**

#### Missing Policy: ❌
**There is NO RLS policy allowing unauthenticated users (anon role) to SELECT from invite_codes.**

---

## Critical Finding Details

### Vulnerability: RLS Policy Blocks Signup Workflow

**Issue:** The invite code validation query during signup is blocked by RLS policies.

**Code Location:** `components/SignupPage.tsx:92`

**Query Being Blocked:**
```typescript
// This query fails during signup:
const { data, error } = await supabase
  .from('invite_codes')
  .select('*')
  .eq('id', inviteCode)
  .single();
```

**Error:** `permission denied for table invite_codes`

**Root Cause:**
1. Signup is a public/anonymous operation (user not yet authenticated)
2. All RLS policies on `invite_codes` require authentication
3. Unauthenticated users cannot read invite codes to validate them
4. Signup fails completely

---

## Expected Behavior

**What Should Happen:**
1. Unauthenticated user visits signup page ✅
2. User enters email, password, and invite code ✅
3. **Frontend queries invite_codes to validate the code** ❌ BLOCKED
4. If code valid, create auth account ⬅️ Cannot reach this step
5. Assign role from code's `default_user_role` ⬅️ Cannot reach this step
6. Mark invite code as used ⬅️ Cannot reach this step
7. Redirect to app ⬅️ Cannot reach this step

**Where It Breaks:** Step 3 - RLS blocks SELECT on invite_codes

---

## Security vs Functionality Trade-off

**Current Design (BROKEN):**
- ❌ Blocks all SELECT operations on invite_codes
- ❌ No policy for `anon` role
- ❌ Signup completely non-functional
- ✅ Secure (but unusable)

**Security Concern:**
Allowing unauthenticated users to SELECT invite_codes could expose:
- Which invite codes exist (enumeration attack)
- Who generated them (via `generated_by` column)
- What roles they grant (via `default_user_role` column)

**Recommended Solution:**
Create a SECURITY DEFINER function that:
1. Takes an invite code as input
2. Validates it exists and is not expired/used
3. Returns ONLY: valid/invalid status (not full row data)
4. Can be called by unauthenticated users

This approach:
- ✅ Allows signup to work
- ✅ Minimizes information disclosure
- ✅ Prevents full table enumeration
- ✅ Follows principle of least privilege

---

## Additional Tests Not Performed

Due to the critical failure in step 2, the following tests could NOT be completed:

### ❌ Test 3: Valid Invite Code Signup
**Status:** SKIPPED - Cannot validate invite codes

**Planned Test:**
- Email: `test-signup@example.com`
- Password: `testpass123`
- Invite Code: `TEST-CODE-123` (valid, exists in DB)

**Expected:** Successful signup, user created, role assigned

**Actual:** Cannot test - validation query blocked by RLS

---

### ❌ Test 4: Verify User Role Assignment
**Status:** SKIPPED - User cannot be created

**Planned Query:**
```sql
SELECT * FROM user_roles
WHERE user_id = (
  SELECT id FROM auth.users
  WHERE email = 'test-signup@example.com'
);
```

**Expected:** User has role 'officer' (from `default_user_role`)

**Actual:** Cannot test - signup blocked

---

### ❌ Test 5: Verify Invite Code Marked as Used
**Status:** SKIPPED - Code cannot be used

**Planned Query:**
```sql
SELECT * FROM invite_codes
WHERE id = 'TEST-CODE-123';
```

**Expected:** `is_used = true`, `used_by = 'test-signup@example.com'`, `used_at = <timestamp>`

**Actual:** Cannot test - signup blocked

---

## Screenshots

### 1. Signup Form - Initial State
**File:** `02-invite-signup-form.png`
- Shows all form fields correctly rendered
- Email, Password, Confirm Password, Invite Code fields present
- Sign Up button visible

### 2. Invalid Code - Form Filled
**File:** `02-invalid-code-filled.png`
- Form filled with invalid code "INVALID-CODE"
- Ready to submit

### 3. Critical RLS Error
**File:** `02-critical-rls-error.png`
- **Error notification:** "Failed to create account."
- **Error message:** "Sign Up Failed: permission denied for table invite_codes"
- Red error alert clearly visible
- Form still shows submitted data

---

## Recommendations

### Immediate Actions Required:

1. **❌ CRITICAL:** Invite code signup is completely broken - must fix before any new users can register

2. **Create SECURITY DEFINER Function:**
```sql
CREATE OR REPLACE FUNCTION validate_invite_code(p_code TEXT)
RETURNS TABLE(
  valid BOOLEAN,
  default_role TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    NOT revoked AND NOT is_used AND expires_at > now() AS valid,
    default_user_role AS default_role
  FROM invite_codes
  WHERE id = p_code;
END;
$$;

-- Grant execute to anon role
GRANT EXECUTE ON FUNCTION validate_invite_code(TEXT) TO anon;
```

3. **Update Frontend:**
```typescript
// Instead of direct SELECT:
const { data, error } = await supabase
  .rpc('validate_invite_code', { p_code: inviteCode });

if (error || !data || data.length === 0 || !data[0].valid) {
  throw new Error('Invalid invite code');
}

const defaultRole = data[0].default_role;
```

4. **Test Thoroughly:**
- Re-run E2E test after fix
- Verify unauthenticated users can validate codes
- Verify information is minimized (only valid/role returned)
- Verify code enumeration is difficult

5. **Security Review:**
- Consider rate limiting on validation function
- Add logging for failed validation attempts
- Monitor for enumeration patterns
- Consider adding CAPTCHA for public signup

---

## Conclusion

**Test Status:** ❌ **CRITICAL FAILURE**

**Summary:**
- Successfully navigated to signup page ✅
- Attempted to test invite code validation ❌
- **Discovered critical RLS policy blocking signup** 🔴
- Invite code signup workflow is **completely non-functional**

**Severity Assessment:**
- **Functional Severity:** CRITICAL - No new users can sign up
- **Security Severity:** LOW - RLS is working too well (blocking legitimate access)
- **Business Impact:** HIGH - Cannot add new officers/captains to the system

**Next Steps:**
1. Create SECURITY DEFINER function to validate invite codes
2. Update frontend to use function instead of direct SELECT
3. Re-run this E2E test to verify fix
4. Proceed with remaining E2E tests (Member CRUD, Weekly Marks)

**Blocked Tests:**
- Cannot test valid signup flow
- Cannot test role assignment
- Cannot test invite code usage tracking

---

**Test Completed By:** Claude Code (Audit Agent)
**Date:** 2026-01-27
**Time:** ~19:45 UTC
**Duration:** ~10 minutes
**Dev Server:** http://localhost:3001

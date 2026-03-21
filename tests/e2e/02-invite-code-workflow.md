# E2E Runbook: Invite Code Workflow

Use this checklist to verify signup and invite-code lifecycle behavior.

## Preconditions

- App is running
- A valid unused invite code exists in `invite_codes`
- The code has a known role and section assignment

## Checks

1. Open the public signup flow.
2. Submit an obviously invalid code and confirm the UI rejects it.
3. Submit an expired or revoked code and confirm the UI rejects it.
4. Sign up with a valid invite code using a fresh email address.
5. Confirm the new user can sign in.
6. Verify the new user has the expected role in `profiles`.
7. Verify the invite code is marked used in `invite_codes`.
8. If the code was section-scoped, confirm the resulting user experience matches that scope.

## Suggested Verification Queries

```sql
select id, email, role
from profiles
where email = 'test-signup@example.com';
```

```sql
select code, role, used_at, used_by, revoked_at, section
from invite_codes
where code = 'TEST-CODE-123';
```

## Expected Outcome

- Invalid, expired, and revoked codes are rejected.
- A valid code creates a usable account.
- Role assignment and invite-code consumption stay in sync.

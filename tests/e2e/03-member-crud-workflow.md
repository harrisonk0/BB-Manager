# E2E Runbook: Member CRUD Workflow

Use this checklist to smoke-test the member management flow.

## Preconditions

- Signed in as a user allowed to manage members
- A target section is selected

## Checks

1. Create a new member with valid data.
2. Confirm the new member appears in the roster immediately after refresh/reload.
3. Edit the member's name, squad, year, or squad-leader flag.
4. Confirm the updated data appears in the roster and member detail view.
5. Delete the member.
6. Confirm the member disappears from the roster.

## Expected Outcome

- Member changes persist to Supabase.
- The roster refresh path stays consistent after each mutation.

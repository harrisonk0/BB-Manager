# E2E Runbook: Weekly Marks Workflow

Use this checklist to verify weekly marks entry and historical editing.

## Preconditions

- Signed in as a user allowed to edit marks
- A target section is selected
- At least one member exists in that section

## Checks

1. Open weekly marks for the selected section.
2. Enter valid marks for multiple members and save.
3. Reload the page and confirm the saved marks persist.
4. Open an individual member's mark history and confirm the saved date appears.
5. Edit a previous mark and save.
6. Delete a historical mark entry.
7. Review the dashboard and confirm aggregate stats still render.
8. Review the audit log and confirm mark-related actions were recorded.

## Expected Outcome

- Marks persist correctly for both create/update/delete paths.
- Historical editing works without corrupting totals.
- Audit logging remains intact for mark changes.

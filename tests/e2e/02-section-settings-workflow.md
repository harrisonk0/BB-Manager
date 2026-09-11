# E2E Runbook: Section Settings Workflow

Use this checklist to verify section settings persistence against a live Supabase-backed environment.

## Preconditions

- Signed in as a user allowed to edit section settings
- A target section is selected
- `settings` contains seeded rows for both `company` and `junior`

## Checks

1. Open the section settings page.
2. Change the weekly meeting day and save it.
3. Add a squad, rename it, then remove it if it has no members.
4. Save the meeting-day change and confirm the UI reports success.
5. Reload the page and confirm the meeting day and squad list persist.
6. Restore the original meeting day and original squads, save, reload, and confirm they persisted before leaving the page.

## Expected Outcome

- Section settings update in place rather than creating new rows.
- Missing seeded rows or broken writes fail the smoke check.
- The test run leaves the live settings value unchanged after cleanup and proves that restore step persisted.

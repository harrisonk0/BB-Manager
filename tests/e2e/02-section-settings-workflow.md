# E2E Runbook: Section Settings Workflow

Use this checklist to verify section settings persistence against a live Supabase-backed environment.

## Preconditions

- Signed in as a user allowed to edit section settings
- A target section is selected
- `settings` contains seeded rows for both `company` and `junior`

## Checks

1. Open the section settings page.
2. Change the weekly meeting day.
3. Save the change and confirm the UI reports success.
4. Reload the page and confirm the new value persists.
5. Restore the original meeting day value before leaving the page.

## Expected Outcome

- Section settings update in place rather than creating new rows.
- Missing seeded rows or broken writes fail the smoke check.
- The test run leaves the live settings value unchanged after cleanup.

# E2E Runbook: Auth Workflow

Use this checklist for a manual auth smoke test against local or preview environments.

## Preconditions

- App is running
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_APP_URL` are configured
- A test user exists in Supabase Auth
- That user has a valid role in `profiles`

## Checks

1. Open the app and confirm the login screen renders without console errors.
2. Sign in with a valid email/password pair.
3. Confirm the app reaches section selection or the authenticated app shell.
4. Refresh the page and confirm the session persists.
5. Sign out and confirm the app returns to the login screen.
6. Submit an invalid password and confirm the UI shows a failure state without crashing.
7. Trigger password reset and confirm the reset email uses the expected redirect URL.

## Expected Outcome

- Valid users can sign in and stay signed in across refreshes.
- Invalid credentials fail cleanly.
- Password reset uses the configured app URL.

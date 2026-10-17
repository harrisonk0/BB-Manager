# Frontend test scope

These tests render the real application against in-memory HTTP fixtures. Never substitute synthetic prototype components for production components or add runtime role bypasses to support tests.

- `fixtures/backend.ts` denies external network access and permits only the synthetic Supabase host; unexpected endpoints fail acceptance.
- No test may contact production or use real member data, credentials, setup tokens or push subscriptions.
- Fixture tests verify client behaviour, not RLS, Edge Function authorisation, passkey security or physical iPhone behaviour. Record those separately.
- Screenshot baseline updates require a reviewer, an explanation and visual inspection. Never automatically accept changed images in CI.
- Test meaningful user outcomes and service payloads, not copied implementation algorithms or CSS class presence.
- Keep root production build and dependencies independent of fixture execution. Consult `docs/design-system/testing-and-regressions.md`.

# Company boys’ portal

The portal is available to Company Section boys only. Officers, captains and admins manage access and events. Boys never receive a staff role.

## Giving boys access

1. Open Company Section → **Portal Access**.
2. Choose **Generate for boys without access**, or generate a link for one boy.
3. Copy each personal link and give it to the matching boy. New links are shown for the current page visit only; plaintext codes are not stored.
4. The boy opens his link on `bb-manager.vercel.app` and creates a passkey. His six-character uppercase alphanumeric code is consumed when the server confirms a passkey exists.
5. He then uses **Sign in with passkey** on the normal login page.

Unused links do not expire. **Reset access** creates a fresh link and deletes the previous Auth identity, passkeys, push subscriptions and calendar feed. Resetting requires an explicit confirmation. Bulk generation skips boys who already have access; it does not reset them.

Deleting a Company roster entry deletes its portal Auth account. Moving a member to Junior also removes access. Starting a new BB year deletes the old roster, so staff generate fresh access for the new roster. Old accounts do not follow an archived or imported member automatically.

Boys’ Auth accounts use internal, non-deliverable email aliases and random, undisclosed passwords; boys do not enter an email address or use email recovery. Staff supply a new setup link if access is lost. Public signup remains disabled, and the existing staff account provisioning and recovery flow stays in place.

## Boys’ screens

The home screen shows the next event (including an upcoming cancellation), personal marks and attendance, personal position within squad and Company by total marks, squad standings, and expandable weekly marks. Equal totals share a position. Attendance uses present / (present + absent); unrecorded nights do not count. A saved present score of zero counts as attendance. Statistics cover the current live roster/BB year.

Calendar and Account are the only additional destinations. Account provides passkey management, browser push controls and sign-out. Boys cannot read other boys’ individual marks, the staff roster, archives or setup-code hashes.

## Calendar and posters

Staff use **Calendar** → **Weekly nights for the BB year** to set first/last dates, normal start/end times and location. Generation uses the existing Company meeting weekday in Section Settings, with Europe/London times, including daylight-saving changes. Repeating generation adds missing dates only. Existing edited or cancelled nights are preserved. Changing normal times does not rewrite already generated nights; edit those events individually.

Staff can add individual events, edit title/date/times/location/details, and mark cancellations. Cancelled events stay visible. Concurrent edits are checked using the event revision; a stale save asks staff to reload instead of overwriting another staff member’s edit.

**Download poster PDF** creates an A4 portrait document with BB and Company branding, title, date, times, location and details. Cancelled events have a cancellation banner. Long details may continue onto another A4 page.

Boys create a private calendar subscription link from Calendar. **Open calendar app** uses `webcal:`; Google Calendar can use the copied HTTPS link with “From URL”. The feed contains calendar events only, never personal stats. Creating a new link revokes the previous one. Resets and roster deletion revoke feeds. The calendar app controls refresh frequency. Stable UIDs, revisions and cancellation status let apps update existing entries.

## Browser notifications

Boys explicitly enable notifications per browser/device. Push notifications cover new events, cancellation/uncancellation, and changes to start/end time or location. Title/description-only changes do not send notifications. On iPhone, add BB Manager to the Home Screen and open it there before enabling notifications. Permission and delivery are controlled by the browser/OS; no email, SMS or in-portal notification list is used.

A database outbox captures changes transactionally. `pg_cron` invokes the Edge Function every minute using a worker credential stored in Supabase Vault. Delivery claims are leased, processed in batches of 20 with up to five parallel requests, and retry failures up to five times at five-minute intervals. Gone subscriptions (404/410) are removed. New devices do not receive old queued notifications. Notification payloads contain event information only. Portal request logs do not include setup codes, feed tokens or subscription keys.

## Hosted deployment

The browser uses the normal public Supabase key. The `company-portal` Edge Function uses Supabase’s injected service-role credential. Never put server secrets in `VITE_*`.

Apply the reviewed SQL files in order through the Management API or SQL editor:

- `20261010090000_company_portal.sql`
- `20261010093000_portal_push_worker.sql`
- `20261010100000_portal_push_batch.sql`

Before scheduling the worker, generate a Web Push VAPID key pair and a random worker secret. Set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `PORTAL_WORKER_SECRET` as Edge Function secrets. Store the same worker secret in Supabase Vault under `portal_push_worker`. Keep the VAPID pair stable across deployments; rotating it requires browsers to subscribe again. The cron migration enables `pg_cron` and `pg_net` and targets this project’s existing function URL.

Deploy with:

```sh
supabase functions deploy company-portal --project-ref smjictierxsqgdmwobrj --use-api
```

`verify_jwt = false` is intentional: setup-code exchange and tokenised calendar feeds are public endpoints. Every private action verifies a Supabase access token server-side. Staff provisioning requires an officer/captain/admin profile; boy actions require a Company portal account, and data access requires completed passkey setup. Activation checks the live `auth.webauthn_credentials` table. Authentication role checks and row policies remain the authority.

Setup codes are bcrypt-hashed, with an unexposed fingerprint enforcing uniqueness among unused codes. Redemption is limited per username and connecting address. Accounts awaiting setup can read only their own non-secret identity fields. Core member/mark/archive policies remain staff-only; the summary RPC returns the authenticated boy’s individual data and anonymised squad totals/ranks.

The normal frontend ships through the feature PR and Vercel. Existing production passkey RP settings are preserved; previews and localhost cannot enrol passkeys for the production RP.

## Verification

- `npm run typecheck`, `npm run test:run`, and `npm run build` cover the frontend.
- `deno check --node-modules-dir=auto --config supabase/functions/company-portal/deno.json supabase/functions/company-portal/index.ts` checks the backend independently.
- Run `tests/sql/company-portal-contract.sql` as database owner. Its synthetic users/members/events roll back; it verifies personal-data isolation, pending access, zero-score attendance, officer calendar permissions, recurring exceptions and London daylight-saving times.
- `npm run check:portal` uses explicitly configured `PORTAL_TEST_SERVICE_ROLE_KEY`, `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. It creates only synthetic fixtures and cleans them up. Run with a trusted environment; this credential is server-only.
- The opt-in portal browser tests use the same server-side test key and a virtual WebAuthn authenticator for the production relying party. The production origin is routed to the local build; the tests never publish or alter the production frontend.

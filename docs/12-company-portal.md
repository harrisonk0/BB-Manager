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

The home screen shows the next event (including an upcoming cancellation), personal marks and attendance, personal position within squad and Company by total marks, squad standings, names, optional NCO rank chevrons and squad-leader badges for the other boys in their own Company squad, and expandable weekly marks. Teammates appear even if they have not set up portal access; names from other squads or Junior are excluded. Equal totals share a position. Attendance uses present / (present + absent); unrecorded nights do not count. A saved present score of zero counts as attendance. Statistics cover the current live roster/BB year.

All boys have Calendar and Account. Current squad leaders also have a **Squad dashboard** button on Home. Account provides passkey management, browser push controls and sign-out. Ordinary boys cannot read other boys’ individual marks. Squad leaders can read individual marks for their own current Company squad only, including themselves. No boy can read the staff roster, archives or setup-code hashes.

## Squad leader dashboard

Staff designate squad leaders using the existing **Squad leader** checkbox on the Company roster. No staff role or separate portal account is needed. Leaders open **Squad dashboard** from their portal Home screen.

The dashboard shows overall squad marks, Company squad position, attendance, average marks when present, a weekly marks chart, and Company squad standings. Choose any recorded meeting date (or select a chart bar) to see that night's marks and attendance. Every current squad member appears, including boys without portal access. Each row shows marks for the selected night, **Total so far** across the current BB year, overall squad rank, and year attendance. Selecting another week leaves running totals unchanged. Totals with equal marks share a rank; unrecorded boys have no rank yet.

Zero marks with a present record count as attended. Absent and Not recorded are distinct; attendance excludes unrecorded nights. Weekly statistics use saved meeting dates, matching Weekly Marks. Stats follow the current roster: a transferred boy's current-year marks count in his current squad, and archived/deleted members are excluded.

The existing `company_portal_summary` RPC determines leader status and squad membership on every request. Only active Company leaders receive `squadMembers`, containing current own-squad member IDs, names, optional NCO ranks, leader flags and dated scores; everyone else receives `null`. Other squads remain aggregate totals only. Demotion, transfer, reset and roster deletion take effect on the next request; open portals refresh every minute and on focus. Core roster/marks tables remain staff-only. This dashboard is read-only; leaders cannot record attendance or change marks.

## Calendar and posters

Staff use **Calendar** → **Weekly nights for the BB year** to set first/last dates, normal start/end times and location. Generation uses the existing Company meeting weekday in Section Settings, with Europe/London times, including daylight-saving changes. Repeating generation adds missing dates only. Existing edited or cancelled nights are preserved. Changing normal times does not rewrite already generated nights; edit those events individually.

Staff can add individual events, edit title/date/times/location/details, and mark cancellations. Cancelled events stay visible until the normal calendar expiry. Concurrent edits are checked using the event revision; a stale save asks staff to reload instead of overwriting another staff member’s edit.

Events clear from the staff and boys’ calendars and subscription feed 24 hours after their end time (including cancelled and multi-day events). Open calendars update within 30 seconds, and when the window regains focus. Records remain stored so generating weekly nights again preserves existing dates, edits and cancellations. Subscribed calendar apps remove expired entries when they next refresh; their refresh schedule is outside BB Manager’s control.

Calendar dates show dots for weekly nights and other events; cancelled events use a cancellation dot. Selecting a date shows that day's details.

**Download poster PDF** creates an A4 portrait document with a dark blue gradient, BB and Company branding, title, date, times, location and details. The poster uses the Company blue palette and embeds the bundled, licensed Open Sans fonts for consistent rendering. Cancelled events have a cancellation banner. Long details may continue onto another A4 page.

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
- `20261016160000_portal_squad_teammates.sql`
- `20261016170000_squad_leader_dashboard.sql`
- `20261016180000_member_ranks.sql` (apply before shipping the rank field/badges)

Before scheduling the worker, generate a Web Push VAPID key pair and a random worker secret. Set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `PORTAL_WORKER_SECRET` as Edge Function secrets. Store the same worker secret in Supabase Vault under `portal_push_worker`. Keep the VAPID pair stable across deployments; rotating it requires browsers to subscribe again. The cron migration enables `pg_cron` and `pg_net` and targets this project’s existing function URL.

Deploy with:

```sh
supabase functions deploy company-portal --project-ref smjictierxsqgdmwobrj --use-api
```

`verify_jwt = false` is intentional: setup-code exchange and tokenised calendar feeds are public endpoints. Every private action verifies a Supabase access token server-side. Staff provisioning requires an officer/captain/admin profile; boy actions require a Company portal account, and data access requires completed passkey setup. Activation checks the live `auth.webauthn_credentials` table. Authentication role checks and row policies remain the authority.

Setup codes are bcrypt-hashed, with an unexposed fingerprint enforcing uniqueness among unused codes. Redemption is limited per username and connecting address. Accounts awaiting setup can read only their own non-secret identity fields. Core member/mark/archive policies remain staff-only; the summary RPC returns the authenticated boy’s individual data and anonymised squad totals/ranks, plus only teammate names, optional NCO ranks and leader flags from his own Company squad. Ordinary boys receive no teammate IDs or marks. Current leaders additionally receive own-squad member IDs and dated scores through the summary, never school years or account details.

The normal frontend ships through the feature PR and Vercel. Existing production passkey RP settings are preserved; previews and localhost cannot enrol passkeys for the production RP.

## Verification

- `npm run typecheck`, `npm run test:run`, and `npm run build` cover the frontend.
- `deno check --node-modules-dir=auto --config supabase/functions/company-portal/deno.json supabase/functions/company-portal/index.ts` checks the backend independently.
- Run `tests/sql/company-portal-contract.sql` as database owner. Its synthetic users/members/events roll back; it verifies personal-data isolation, pending access, zero-score attendance, teammate scope and field restrictions, officer calendar permissions, recurring exceptions and London daylight-saving times.
- Run `tests/sql/squad-leader-dashboard-contract.sql` as database owner. Its fixtures roll back; it verifies leader-only weekly data, field restrictions, zero-score attendance, demotion, transfers, pending access and deletion revocation without granting staff/table access.
- Run `tests/sql/member-ranks-contract.sql` as database owner. Its fixtures roll back; it verifies staff assignment, all four ranks, Year 11–14 eligibility, blocked younger/Junior ranks, portal badges, and unchanged permissions.
- `npm run check:portal` uses explicitly configured `PORTAL_TEST_SERVICE_ROLE_KEY`, `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. It creates only synthetic fixtures and cleans them up. Run with a trusted environment; this credential is server-only.
- The opt-in portal browser tests use the same server-side test key and a virtual WebAuthn authenticator for the production relying party. The production origin is routed to the local build; the tests never publish or alter the production frontend.

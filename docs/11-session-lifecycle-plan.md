# Session Lifecycle Implementation Plan

## Purpose

This document defines the implementation plan for end-of-session reporting, archival, sleeping mode, and September session start-over in BB Manager.

The plan is intentionally biased toward simple code and low operational risk. It keeps the current live workflow intact for most of the year and adds session lifecycle behavior around it.

## Goals

- Allow Captain+ users to generate the end-of-session report before closing the session.
- Put the app into a global view-only state after the session is closed.
- Preserve historical session data after a new session starts.
- Start a new September session without threading session logic through every live data query.
- Enforce session state in Supabase RLS, not only in the client.

## Chosen Approach

Use a global `bb_sessions` table plus archive snapshot tables.

- Keep `members`, `marks`, and `settings` as the live working set for the current session.
- Generate the report from live data while the current session is still open.
- On close, copy the current live state into immutable session archive tables.
- During the closed period, keep the live data visible but make the app read-only.
- When the next session starts, archive is already complete, so clear only the live `marks` table and keep the roster/settings ready for the new year.

This is simpler than adding `session_id` to every live `marks` query and propagating session filtering through the whole app. The day-to-day workflow stays close to the existing code.

## Why This Model

The current app assumes:

- `marks` is the active working set for the selected section.
- dashboards and mark history aggregate directly over the live `marks` rows.
- there is no existing session identifier in the client or database model.

Adding `session_id` everywhere would touch most of the app and complicate every read/write path. Archiving on close keeps the current model for live operation and isolates session-history logic to a dedicated report/history path.

## Target Lifecycle

### 1. Active Session

- Exactly one `bb_sessions` row is marked as current and open.
- Live `members`, `marks`, and `settings` are editable.
- Captain+ can generate the report at any time from the live data.

### 2. Closed Current Session

- The current session remains selected as the current record but is marked closed.
- The app becomes view-only.
- The live roster and live marks remain visible so users can still inspect the just-finished session.
- Captain+ can still view or print the same report from the archived copy.

### 3. New Session Started

- The previous session is no longer current and stays available in history.
- A new current session is created and marked open.
- Live `marks` is cleared for a fresh start.
- Live `members` and `settings` remain in place unless a future roster-reset workflow is added.

## Database Design

### `bb_sessions`

Add a new table to track the global BB session lifecycle.

Suggested columns:

- `id uuid primary key default gen_random_uuid()`
- `label text not null unique`
- `starts_on date not null`
- `ends_on date not null`
- `status text not null check (status in ('active', 'closed'))`
- `is_current boolean not null default false`
- `closed_at timestamptz null`
- `closed_by uuid null references auth.users(id)`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Suggested constraints/indexes:

- partial unique index on `is_current` where `is_current = true`
- check that `starts_on <= ends_on`

Notes:

- Keep status values to `active` and `closed` only.
- "Sleeping mode" is not a separate database status.
- Sleeping mode is derived as: current session exists and its status is `closed`.

### `session_member_snapshots`

Archive roster state at close time.

Historical reporting must depend on these snapshots, not on the continued existence of the live `members` row.

Suggested columns:

- `id uuid primary key default gen_random_uuid()`
- `session_id uuid not null references bb_sessions(id) on delete cascade`
- `source_member_id uuid null`
- `section section not null`
- `name text not null`
- `squad smallint not null`
- `school_year text not null`
- `is_squad_leader boolean not null default false`
- `created_at timestamptz not null default now()`

Suggested constraints/indexes:

- unique (`session_id`, `source_member_id`) where `source_member_id is not null`
- index on (`session_id`, `section`)

### `session_mark_snapshots`

Archive marks for the closed session.

Historical reporting must read these archive rows, not the live `marks` table.

Suggested columns:

- `id uuid primary key default gen_random_uuid()`
- `session_id uuid not null references bb_sessions(id) on delete cascade`
- `member_snapshot_id uuid not null references session_member_snapshots(id) on delete cascade`
- `source_member_id uuid null`
- `section section not null`
- `date date not null`
- `score numeric null`
- `uniform_score numeric null`
- `behaviour_score numeric null`
- `present boolean not null`
- `created_by uuid null references auth.users(id)`
- `created_at timestamptz not null default now()`

Suggested constraints/indexes:

- unique (`session_id`, `member_snapshot_id`, `date`)
- index on (`session_id`, `section`, `date`)

### `session_settings_snapshots`

Archive the settings that shaped the session.

Suggested columns:

- `id uuid primary key default gen_random_uuid()`
- `session_id uuid not null references bb_sessions(id) on delete cascade`
- `section section not null`
- `meeting_day smallint not null`
- `created_at timestamptz not null default now()`

Suggested constraints/indexes:

- unique (`session_id`, `section`)

### Tables Not Changed for MVP

Keep these as the live working set:

- `members`
- `marks`
- `settings`

Do not add `session_id` to `marks` in the initial implementation.

## Required Database Functions

### `current_bb_session()`

Read helper returning the current session record, or `null` when no session exists.

Use cases:

- client bootstrap
- RLS helpers
- session banner state

### `close_current_bb_session()`

Security-definer RPC for Captain/Admin only.

Responsibilities:

- validate there is exactly one current active session
- copy live `members` into `session_member_snapshots`
- copy live `marks` into `session_mark_snapshots`
- copy live `settings` into `session_settings_snapshots`
- set current session status to `closed`
- set `closed_at` and `closed_by`

Behavior rules:

- must be atomic
- must fail if archive rows already exist for the target session
- must not delete live rows

### `start_new_bb_session(p_label text, p_starts_on date, p_ends_on date)`

Security-definer RPC for Captain/Admin only.

Responsibilities:

- validate there is no current active session
- set any current closed session to `is_current = false`
- create the new `bb_sessions` row as `status = 'active'` and `is_current = true`
- delete all rows from live `marks`

Behavior rules:

- require the current session to be closed before starting a new one
- leave live `members` in place
- leave live `settings` in place
- do not touch archive tables

### Optional Later: `reopen_current_bb_session()`

This is useful if a session was closed too early and no new session has started yet.

It is not required for MVP. Excluding it keeps the first release simpler.

## RLS Changes

The current live project allows broad authenticated writes on `members` and `marks`. That is not compatible with a reliable sleeping mode.

### Principles

- session state must be enforced in the database
- client-side disabled buttons are convenience only
- any write to live operational tables must require both a valid app role and an active current session

### Live Table Policy Direction

For `members` and `marks`:

- `SELECT`: allow authenticated users with a valid app role
- `INSERT`, `UPDATE`, `DELETE`: allow only when:
  - the caller has a valid app role from `profiles`
  - the current BB session exists
  - the current BB session status is `active`

For `settings`:

- keep Captain/Admin-only write permissions
- additionally require the current BB session to be `active`

For `bb_sessions` and snapshot tables:

- `SELECT`: authenticated users with a valid app role
- direct `INSERT`, `UPDATE`, `DELETE`: no general client policy
- changes should happen through security-definer RPCs

### Helper Functions

Add small helper functions to keep policies readable:

- `current_bb_session_status() returns text`
- `has_valid_app_role() returns boolean`
- optionally `can_edit_live_data() returns boolean`

## Reporting Design

### Report Generation Before Close

Generate the report from live data while the current session is still active.

Recommendation for MVP:

- add a print-friendly report page in the SPA
- use browser print to export to PDF
- do not build server-side PDF generation in the first version

Why:

- no extra backend runtime
- lowest complexity
- easy to verify visually

### Historical Reports After Close

After the session is closed, the same report page should load from archive snapshot tables instead of the live tables.

Result:

- active session report: from live tables
- historical session report: from snapshot tables

This keeps report rendering logic conceptually unified while keeping the live data model simple.

## Historical Session Viewing

Keep historical access focused and simple.

### MVP Scope

Add a dedicated historical reports page rather than making every screen session-aware.

Recommended behavior:

- `Home`, `Weekly Marks`, and member editing pages continue to operate on the live current session only
- a new `Session Reports` page allows users to choose any archived session and view a read-only report
- while the app is sleeping, standard live pages remain visible but read-only

This avoids threading historical-session selectors through roster management, weekly marks entry, and all current dashboards.

### Why Not Make Every Page Historical

Doing that would require:

- adding session filtering to most services
- duplicating member-history and dashboard logic for archive tables
- making edit pages context-aware for both live and archived data

That is unnecessary for the stated goal. The report/history view is the right place for past sessions.

## Frontend Changes

### New Types

Add types for session metadata and archive report loading.

Suggested additions:

- `BbSessionStatus = 'active' | 'closed'`
- `BbSession`
- `HistoricalSessionSummary`
- `SessionReportData`

### New Services

Create a dedicated `services/session.ts`.

Suggested responsibilities:

- fetch current BB session
- list archived sessions
- call `close_current_bb_session`
- call `start_new_bb_session`
- fetch historical report data from snapshot tables

Keep session logic out of `services/db.ts` as much as possible.

### New Hook

Add `hooks/useSessionState.ts`.

Suggested responsibilities:

- load current session metadata
- expose `isSleeping`
- expose session refresh method after close/start actions

This keeps session lifecycle state separate from the existing `useAppData` hook.

### App-Level Wiring

In `App.tsx`:

- load the current session state beside auth and current section
- pass an `isReadOnly` boolean into edit-capable pages
- surface a banner when the current session is closed
- add a new report/history page to the view union

### Page-Level Changes

### `HomePage`

- hide or disable add, edit, and delete actions when read-only
- show a short notice explaining why changes are unavailable

### `WeeklyMarksPage`

- disable all inputs and save actions when read-only
- keep the page visible for inspection

### `BoyMarksPage`

- disable historical mark edits and delete actions when read-only

### `SettingsPage`

- keep section settings read-only during sleeping mode
- add a Captain/Admin-only "Session Management" panel with:
  - view current session status
  - open current report
  - close session
  - start new session
  - open historical reports

### New `SessionReportsPage`

Create a single report-focused page for:

- current live session report
- archived historical session report
- browser print/PDF export

## Report Data Shape

The report page should present:

- session label and dates
- section-level totals
- member totals
- attendance summaries
- squad breakdowns
- junior/company section separation

Keep it report-first. Do not try to clone every dashboard widget.

## Operational Runbook

### Before Any Database Change

1. Create a full dump in local `db-backups/` with a timestamped filename.
2. Restore it into a scratch database or disposable Supabase development branch.
3. Confirm the restore is usable before applying migrations.

### Initial Backfill

At rollout time, create one current session covering the live season.

Because the current verified date is 2026-03-21, the initial session should be created as the 2025-2026 BB session unless live operators confirm a different label.

Suggested seed values:

- `label = '2025-2026'`
- `starts_on = '2025-09-01'`
- `ends_on = '2026-03-31'`
- `status = 'active'`
- `is_current = true`

### First Close Operation

1. Captain+ opens the live report and verifies totals.
2. Captain+ closes the session.
3. System snapshots live data and enters sleeping mode.
4. Users can continue viewing the live closed session and archived report.

### September Start

1. Captain+ starts the new session, for example `2026-2027`.
2. System creates the new active current session.
3. System clears live `marks`.
4. Historical reports remain available from the archive tables.

## Migration Order

1. Take and restore-test the full database backup.
2. Add `bb_sessions` and archive snapshot tables.
3. Add helper functions and lifecycle RPCs.
4. Seed the initial current session record.
5. Tighten RLS to require valid app role plus active current session for live writes.
6. Add client session-state loading and read-only gating.
7. Add the report/history page.
8. Add the Session Management UI.
9. Run automated tests and manual smoke checks.
10. Only then use the close/start controls in production.

## Testing Plan

### Database

- verify `close_current_bb_session()` creates archive rows exactly once
- verify live data remains present after close
- verify `start_new_bb_session()` clears live `marks` only
- verify archive rows remain readable after a new session starts
- verify writes to live `members`, `marks`, and `settings` fail when the current session is closed

### Client

- active session still allows member CRUD and marks entry
- closed current session disables all edit paths
- historical reports page loads archived sessions correctly
- new session start shows empty live marks with the roster intact

### Manual Smoke Tests

- generate report before close
- close session
- confirm sleeping-mode banner appears
- confirm save/delete/edit actions are unavailable
- start a new session
- confirm archived session report remains accessible

## Explicit Non-Goals for MVP

- server-side PDF generation
- per-page historical browsing across the whole app
- roster reset or promotion automation
- reopening closed sessions after a new session has already started
- changing invite-code or account provisioning workflows

## Recommended File-Level Implementation Order

1. Supabase migration for session/archive tables and helper functions
2. Supabase RLS migration
3. `types.ts` session types
4. new `services/session.ts`
5. new `hooks/useSessionState.ts`
6. `App.tsx` session wiring
7. `Header.tsx` navigation update
8. `SettingsPage.tsx` session management panel
9. new `SessionReportsPage.tsx`
10. read-only updates in `HomePage.tsx`, `WeeklyMarksPage.tsx`, and `BoyMarksPage.tsx`
11. docs and E2E runbooks

## Summary

The simplest maintainable implementation is:

- live tables stay focused on the current working session
- reports can be generated before close from live data
- closing a session snapshots the live state into dedicated archive tables
- sleeping mode is enforced by RLS
- historical viewing happens through a dedicated report/history page
- September startup creates a new current session and clears only live marks

This delivers the required behavior without forcing session-awareness through the entire current app.

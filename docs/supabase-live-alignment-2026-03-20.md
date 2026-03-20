# Supabase Live Alignment Snapshot

Captured at `2026-03-20T22:09:19Z`.

## Purpose

This file records the live schema state and row-count snapshot used while aligning the app to the production Supabase database on `2026-03-20`.

It is not a full logical backup. Supabase-managed backups and point-in-time restore remain the source of truth for disaster recovery.

## Live migration state

- Latest applied migration: `20260320190925 repair_live_schema_for_app_compatibility_v2`
- Earlier normalization migrations already present:
  - `20260221151547 001_wipe_legacy_schema`
  - `20260221151612 002_profiles_and_settings`
  - `20260221151722 003_members_marks_invite_codes`

## Row counts at capture time

- `profiles`: `2`
- `settings`: `2`
- `members`: `14`
- `marks`: `148`
- `invite_codes`: `1`
- `audit_logs`: `0`

## Schema shape after repair

- `profiles`
- `settings`
- `members`
- `marks`
- `invite_codes`
- `audit_logs`

## Repair notes

- Added `public.audit_logs` with RLS and indexes.
- Added nullable `section` to `public.invite_codes`.
- Replaced stale helper functions to read from `public.profiles`.
- Added `public.claim_invite_code(p_code text)` to atomically apply profile role and consume invite codes.

## Operational note

MCP does not expose a managed-backup creation API. Before any future production schema work, take or verify a Supabase Dashboard backup or PITR checkpoint in addition to keeping this local snapshot.

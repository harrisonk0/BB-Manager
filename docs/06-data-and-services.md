# 6. Data & Services

This document explains how the application interacts with Supabase for data storage and retrieval. All reads and writes happen online against Supabase tables; there is no local IndexedDB cache.

## General Data Flow

1. Components invoke functions in `services/db.ts`.
2. Those functions validate inputs and call Supabase.
3. Errors propagate back to the component so the UI can show connection or permission issues.

## Key Modules

- **`db.ts`**: Houses CRUD operations for boys, audit logs, invite codes, and user roles. Also contains validation helpers (e.g., mark validation) and audit log creation.
- **`supabaseClient.ts`**: Initializes the Supabase client.
- **`supabaseAuth.ts`**: Wraps Supabase Auth helpers.
- **`settings.ts`**: Fetches section-specific settings from Supabase.

## Audit Logging

Important changes (role updates, invite code changes, clears) are recorded through `createAuditLog`, providing a history of administrative actions directly in Supabase.

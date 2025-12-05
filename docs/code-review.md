# Code Review Notes

## Critical

### Volatile encryption key derived from JWT access tokens
- **Issue**: `deriveKeyFromToken` derives the encryption key directly from the current JWT access token, which rotates regularly. Cached offline data encrypted with a prior token becomes undecryptable after refresh/expiry, breaking offline reads and pending write replay across sessions. The derived key is also marked extractable, offering no benefit against exfiltration while still changing frequently.
- **Fix**: Derive the key from a stable secret (e.g., a persisted per-user key stored in IndexedDB/secure storage and wrapped with WebCrypto) instead of the transient access token. Keep the CryptoKey non-extractable to avoid leaking key material.

## High

### Audit logs lose section context, preventing stable cache comparisons
- **Issue**: Audit logs are saved and decrypted without a `section` field (`createAuditLog` builds `newLog` without it, and `mapLogFromDB` always returns `section: null`). Cache diffing in `fetchAuditLogs` filters by `log.section === sec`, so `cachedForSection` is always empty and the cache is rewritten on every fetch; section-specific views may also mix global logs.
- **Fix**: Persist the section on audit log objects both when creating (`newLog = { ...log, section, ... }`) and when mapping from Supabase (`mapLogFromDB` should accept the section context). Use that section to tag cached/decrypted logs so comparisons and display remain accurate.

## Medium

### Data load blocked by audit-log cleanup failures
- **Issue**: `useAppData` always calls `deleteOldAuditLogs` before fetching data. Non-admins or users offline will receive Supabase/RLS errors from the cleanup call, causing the entire load to fail and the UI to show an error even though the data fetch could succeed.
- **Fix**: Make the cleanup best-effort: wrap it in a try/catch that logs and continues, or gate it to roles allowed to prune audit logs. Do not block main data loading on this maintenance task.

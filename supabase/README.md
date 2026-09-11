# Supabase artefacts

The hosted project remains the live source of truth. This directory records:

- `migrations/` — SQL that was applied to production for the 2026-09-11 audit remediations
- `config.toml` — local/CLI project settings (GraphQL schema not exposed)

Do **not** run `supabase db push` blindly. Review each migration, then apply with `supabase db query -f <file>` against the linked project (or the SQL editor).

After applying schema changes, regenerate `types/database.ts` with:

```sh
supabase gen types typescript --linked --schema public > types/database.ts
```

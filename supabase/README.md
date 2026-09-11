# Supabase artefacts

The hosted project remains the live source of truth. This directory records:

- `migrations/` — SQL applied to production (audit remediations and BB session archives)
- `config.toml` — local/CLI project settings, including the documented passkey relying party (`bb-manager.vercel.app`)

Do **not** run `supabase db push` blindly. Review each migration, then apply with `supabase db query -f <file>` against the linked project (or the SQL editor).

Do **not** run `supabase config push` without reading `supabase config diff` first. A full push can overwrite hosted Auth redirect URLs.

Passkeys were enabled on the hosted Auth project for RP ID `bb-manager.vercel.app` and origin `https://bb-manager.vercel.app`. Changing that RP ID would invalidate enrolled passkeys.

After applying schema changes, regenerate `types/database.ts` with:

```sh
supabase gen types typescript --linked --schema public > types/database.ts
```

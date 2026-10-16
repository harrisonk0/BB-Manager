# Assembly — BB-Manager native iOS prototype

Isolated React/Vite application. Synthetic records only; no production imports, Supabase connection, authentication, environment access or service worker. Edits and saves are in memory and reset on reload. Role selection illustrates presentation, **not** authorization enforcement.

From the repository root:

```sh
npm ci
npx vite --config prototypes/native-ios/vite.config.mts
```

Open <http://127.0.0.1:4175/>. Use `?page=marks`, `?page=more`, `?page=squad&role=leader`, `?page=mine&role=boy`, or `?page=marks&section=junior`. Settings → About this design prototype exposes the role and simulated offline controls. No public preview is deployed.

Build separately:

```sh
npx vite build --config prototypes/native-ios/vite.config.mts
npx vite preview --config prototypes/native-ios/vite.config.mts --port 4176
```

The isolated output is `prototypes/native-ios/dist/` (ignored). It does not change the production build entry. The manifest and reused icons are scoped to this isolated origin. No offline caching or install prompt is registered.

Working interactions: persistent per-tab roster filters/search/scroll, browser Back/Forward, local member create/edit/remove, member history → dated marks, past-meeting unlock, three-state attendance, Company and Junior validation, explicit Save with pending/saved/failed/retry feedback, date/section draft protection, contextual sheets, chart/report week selection, own-squad presentation, settings switches and a synthetic event agenda.

Deliberately limited: no real login/passkey/push/subscription/logout, imports/PDF/rollover, durable storage, server saves, drag gestures or production dark theme. Those destinations explain the boundary instead of pretending to operate real services. Company saves update the local known-week report/history; Junior inputs demonstrate its separate score fields, while aggregate Junior reporting requires a dedicated production data adapter. Member detail, filters and sheets do not yet have independent deep links. See the [migration plan](../../docs/design-audit/native-ios/migration-roadmap.md).

## Reproduce browser validation

Install the official MCP tool and a compatible browser if unavailable. The script invokes the pinned official server through JSON-RPC; it requires no Python packages. Optional axe is supplied as an existing local file, not added to application dependencies.

```sh
PLAYWRIGHT_MCP_EXECUTABLE_PATH=/usr/bin/chromium \
PLAYWRIGHT_MCP_NO_SANDBOX=1 \
python3 prototypes/native-ios/verify.py --axe-path /absolute/path/to/axe.min.js
```

Use `--only members,marks,leader,settings` to restrict captures. All interaction checks still run. The seven widths are 320, 375, 390, 430, 768, 1024 and 1440px, at 844px viewport height. Captures include additional sheet/portal/Junior states. `evidence/` records actual results, not a declaration of production compliance. The harness removes the unload listener only when navigating between independent QA fixtures; draft protection is checked within the real prototype flow and listener registration is asserted. No iOS hardware is emulated by Chromium viewport resizing.

[Design/research and visual review](../../docs/design-audit/native-ios/README.md)

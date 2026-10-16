# BB Manager — iOS 26 experiments

Two isolated React 19/Vite prototypes. **Synthetic records only.** No production services, credentials, backend, authorisation or durable storage. Reload resets edits. The original Assembly prototype is preserved in `../native-ios`.

- `/framework7.html`: Framework7 9.2 iOS theme, real navigation stacks, native controls and sheets.
- `/native-plus.html`: Assembly React architecture, Konsta 5.5 iOS components and Vaul sheets.
- `/`: comparison landing page.

Both use the same fixture controller and task screens. Staff, leader and ordinary portal presentations are demonstrations, never security boundaries. Company and Junior marks retain distinct validation. NCO rank is optional for Company Years 11–14 and independent from squad leadership.

```sh
npm ci --prefix prototypes/ios26
npm run dev --prefix prototypes/ios26
npm run typecheck --prefix prototypes/ios26
npm run build --prefix prototypes/ios26
```

Open `http://127.0.0.1:4180`. The dedicated Vite/Tailwind 4/PostCSS configuration does not upgrade production Tailwind 3. Vite exposes only the `IOS26_` environment prefix; no backend variables are used.

For reproducible visual checks, serve the stable build (Vite HMR reacts to screenshot writes inside its project):

```sh
python3 -m http.server 4181 --bind 127.0.0.1 --directory prototypes/ios26/dist
PLAYWRIGHT_MCP_EXECUTABLE_PATH=/usr/bin/chromium PLAYWRIGHT_MCP_NO_SANDBOX=1 \
  python3 prototypes/ios26/verify.py --axe-path /absolute/path/to/axe.min.js
PLAYWRIGHT_MCP_EXECUTABLE_PATH=/usr/bin/chromium PLAYWRIGHT_MCP_NO_SANDBOX=1 \
  python3 prototypes/ios26/interactions.py
python3 prototypes/ios26/verify.py --browser webkit --axe-path /absolute/path/to/axe.min.js
python3 prototypes/ios26/interactions.py --browser webkit
python3 prototypes/ios26/verify.py --browser webkit --phone --widths 390 --axe-path /absolute/path/to/axe.min.js
python3 prototypes/ios26/interactions.py --browser webkit --phone
```

Scripts invoke **official Playwright MCP 0.0.83**, not a mocked browser. Install its matching browser and OS dependencies for WebKit. This environment needed local Debian library extraction and a local browser-launcher library-path adjustment; that is environment setup, not application code. It is not physical iPhone Safari. `--only` limits cases and `--variant` limits a variant; these overwrite their result JSON unless `--merge` is used to replace selected cases in an existing full matrix.

Manual tour: search/filter Members; open a member, edit/add an eligible NCO and confirm removal; enter attendance and a decimal score in Marks, then Save; choose a different meeting while dirty; switch Company/Junior; explore the dated Squad report; open Settings and its switches. Settings → Preview options exposes synthetic role links and failed-save simulation.

The two manifests permit separate standalone launch identities. There is no service worker, offline cold-start guarantee, durable offline save, real passkey or real notification implementation. On an iPhone, open the reviewed preview link in Safari, then Share → Add to Home Screen. Home Screen permissions/session retention and keyboard behaviour still require device review.

See [research, comparison and production strategy](../../docs/design-audit/ios26/README.md). No production migration is authorised by this prototype.

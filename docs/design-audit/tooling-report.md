# Design tooling setup report

Verified on 16 October 2026. Tooling is isolated from application dependencies: `package.json` and `package-lock.json` are unchanged, and no application component, style, service, business rule, deployment file or backend schema was modified.

## Outcome

| Requested tool | Installation/configuration | Functionality verified | Limitations/manual action |
| --- | --- | --- | --- |
| Official OpenAI frontend design skill | Installed **frontend-app-builder** from `openai/plugins`, the current destination linked by the now-deprecated `openai/skills` README. Installed with OpenAI's official skill-installer script, not an invented `frontend-design` path. | SKILL.md and companion files exist; frontmatter/content read. Applied typography, hierarchy, density, container and asset/icon consistency guidance to C01–C07 and M06–M09. | User explicitly requested audit only, so image-concept generation and implementation/fidelity workflow were not run. Automatic skill discovery refreshes on a new turn/session; this audit manually read the installed instructions. |
| Vercel Web Design Guidelines | Installed `skills/web-design-guidelines` from `vercel-labs/agent-skills` using the same supported GitHub skill installer. | Read SKILL.md and fetched the current canonical `vercel-labs/web-interface-guidelines/main/command.md`; applied labels/focus/forms/zoom/motion/navigation rules. Findings are mapped to actual files and browser evidence. | The user brief controls deliverable format and scope. The skill's terse output convention does not replace the eight requested documents. |
| Vercel React Best Practices | Installed directory `react-best-practices`; skill's internal name is `vercel-react-best-practices`. | Read SKILL.md and relevant `bundle-conditional` / `async-parallel` references. Reviewed page/report imports, existing parallel data reads, memoisation and the conditional-hook source risk in Dashboard. | Next.js, RSC/server-action and SSR-specific rules are inapplicable. No React/router/framework dependency was added. |
| Playwright MCP | Official `@playwright/mcp` **0.0.83**, resolved from npm's current version, pinned in `.codex/config.toml`. Also registered in this environment's user Codex config with the existing `/usr/bin/chromium` executable and container flags. | MCP initialize/tool list succeeds; browser launched, navigated real local login and the component harness; resized seven widths, clicked menus/dialogs/navigation, filled filters/fields, checked keyboard behaviour and saved screenshots/metrics. `evidence/mcp-verification.json` records server/tools. | The running chat cannot hot-load newly registered MCP tools. Calls were made through the official MCP stdio protocol and SDK using the server process. Restart/new session and project trust may be needed for native Codex tool discovery. Default portable config needs a compatible browser on each machine. |
| shadcn MCP | Official `shadcn` **4.22.0** `mcp` command, pinned in Codex config; read/research tools enabled. React/TypeScript/Tailwind stack is appropriate for research. No `shadcn init`, component install, `components.json`, CSS rewrite or library replacement. | MCP initialize and tools/list; `search_items_in_registries` finds dialog/alert-dialog; `view_items_in_registries` returns dialog, alert-dialog, button and field metadata. [Saved research](evidence/shadcn-research.json). | Current default registry references `new-york-v4` and dependencies such as radix-ui/cn. This Tailwind 3 application must not blindly install those components. Component adoption is a future compatibility decision. |
| 21st.dev MCP | Current official read-only URL configured as optional **disabled** server `twenty_first`. Bearer token is read from `TWENTY_FIRST_API_KEY`; no key embedded. | Unauthenticated initialize request to official endpoint returns **HTTP 401**, `Bearer realm="21st"`. Official auth document confirms credentials required. | Requires user-issued API key or OAuth consent. No credential was configured, so catalog/functionality was not tested. Plan quotas/charges depend on account; a paid subscription is not asserted as universally required. Nothing else was blocked. |

## Sources and reproducibility

Sources were consulted rather than assuming old setup commands:

- [OpenAI skills README and deprecation notice](https://github.com/openai/skills), [current frontend skill](https://github.com/openai/plugins/tree/main/plugins/build-web-apps/skills/frontend-app-builder), [official skill installer](https://github.com/openai/skills/tree/main/skills/.system/skill-installer).
- [Vercel agent skills installation and catalog](https://github.com/vercel-labs/agent-skills), [canonical web interface rules](https://github.com/vercel-labs/web-interface-guidelines/blob/main/command.md).
- [Microsoft Playwright MCP](https://github.com/microsoft/playwright-mcp), [official shadcn MCP configuration](https://ui.shadcn.com/docs/mcp).
- [21st.dev current setup](https://21st.dev/mcp), [21st.dev authentication contract](https://21st.dev/auth.md).

Pinned skill revisions and SKILL.md SHA-256 hashes are in [tool-versions.json](evidence/tool-versions.json):

```text
openai/plugins             0722921d5542fc593105c27bd52630babd8b8c2a
vercel-labs/agent-skills    063bee94c3f4df8453406c830b0a7df0f2860278
```

The helper [install-skills.py](../../scripts/design-audit/install-skills.py) downloads the pinned official installer and passes repository, revision and skill path. It installs to `$CODEX_HOME/skills` (default `~/.codex/skills`), outside app/runtime packages. The upstream installer refuses to overwrite existing skill directories. Reuse the current installations; on a fresh environment:

```sh
python scripts/design-audit/install-skills.py
```

Verify the three `SKILL.md` files exist and match the manifest hashes. Start a new Codex turn/session for automatic discovery. Installed third-party skills are not vendored into the repository; the manifest and installer make the current setup reproducible without adding a large skills/rules copy to application source.

## MCP configuration and network

[.codex/config.toml](../../.codex/config.toml) is portable project configuration. Its stdio server commands are the official `npx -y @playwright/mcp@0.0.83 …` and `npx -y shadcn@4.22.0 mcp`. TOML parsing and Codex `mcp get/list` succeeded. The running environment also has a user-level registration; trust/project loading and reload need to be checked on another machine.

The managed environment uses an enforced unrestricted HTTP policy through an inherited session proxy and CA trust. An initial shadcn registry call failed because the standalone SDK process did not inherit proxy variables; passing the inherited environment fixed it. The committed configuration explicitly forwards `HTTP_PROXY`, `HTTPS_PROXY`, `NO_PROXY` and `NODE_EXTRA_CA_CERTS`. It does not contain proxy credentials or bypass network policy/TLS checks.

On this container, Chromium already existed at `/usr/bin/chromium`; no browser/system install was necessary. `--no-sandbox` was used for the container MCP process only. On a normal machine use a supported installed browser and its normal sandbox. To select an executable, export `PLAYWRIGHT_MCP_EXECUTABLE_PATH`; the project config forwards it. If the browser is missing, follow the official Playwright MCP browser installation instructions for that machine. Do not assume this Linux path exists on macOS/Windows.

shadcn research requires network access to its registry, but no account/key for the public items inspected. Do not follow a returned add command during an audit. Registry discovery works without introducing `components.json`; creating that file now would misleadingly imply a component-library migration.

For optional 21st research later, create a key in the user's 21st account, expose it as `TWENTY_FIRST_API_KEY` in the host environment, and enable `mcp_servers.twenty_first` in the config. The current disabled config uses `https://21st.dev/api/mcp/readonly`. OAuth discovery begins at the full `https://21st.dev/api/mcp` endpoint per its auth document; its read-only endpoint does not supply that discovery metadata. Keep the read-only endpoint for this audit/research use. No interactive login was started and no purchase was made.

## Local browser inspection tooling

The existing E2E suite was inspected before execution. Its isolated flows need `E2E_TEST_EMAIL` / `E2E_TEST_PASSWORD`, create sentinel members/marks, and query live data. The portal suite also provisions identities/events and requires additional backend credentials. These were unsuitable for this data-minimising design audit; no available test login was invented and no real auth control was bypassed.

Instead, [scripts/design-audit](../../scripts/design-audit) contains a local component workbench:

- `harness.html` / `harness.tsx` mount existing components with synthetic props, **not `App` or its auth gates**.
- `fixtures.ts` supplies invented members/events; `fixture-client.ts` supplies local read responses and rejects auth/mutation methods.
- `vite.config.mts` is dedicated to this loopback server and aliases the Supabase client only there. The audit server rejects root app entry URLs so only the workbench is used there. The production Vite config, root HTML, app entry and services are unchanged.
- `capture.py` is a dependency-free Python MCP stdio client. It initializes the official Playwright MCP server, drives the harness, blocks browser requests outside loopback, records each case/width, takes full-page screenshots and optionally runs an existing axe script.

Start the production-like app only for unauthenticated local inspection, and the separate synthetic harness for component evidence:

```sh
npm run dev -- --host 127.0.0.1 --port 4173
```

In a second terminal:

```sh
npx vite --config scripts/design-audit/vite.config.mts
```

In a third terminal, on this container:

```sh
PLAYWRIGHT_MCP_EXECUTABLE_PATH=/usr/bin/chromium PLAYWRIGHT_MCP_NO_SANDBOX=1 python scripts/design-audit/capture.py
```

On another machine omit or change the executable environment variable and leave `PLAYWRIGHT_MCP_NO_SANDBOX` unset unless that container specifically requires it. For automated accessibility evidence, install/use **axe-core 4.14.0** in an isolated tooling directory, not application dependencies, and pass `--axe-path /absolute/path/to/axe.min.js`. Check the actual version recorded in the coverage summary before comparing results. `--only home,weekly` limits exploratory captures. The code fixes time to the audit date; change fixtures/date together for future reporting periods.

The capture script records failures and does not fail the entire command when a case fails. Inspect every case's `captureError`/`errors` and the coverage summary before treating a run as complete. There are no screenshot baseline assertions yet; the roadmap proposes turning approved evidence into proper regression tests. Its immediate error/empty/loading responses and small fixture roster do not measure backend latency, large-data performance or production layout shift.

## Validation and boundaries

`npm run typecheck` and `npm run build` passed with the new tooling files present. The existing build reports large chunks: app entry ~617.84kB and PDF renderer ~1,582.05kB uncompressed. These are existing architecture observations, not performance regressions introduced by application changes. PDF code already has lazy boundaries; actual mobile network/interaction profiling is deferred.

The audit's browser matrix covers the current components; actual authenticated navigation, auth recovery, passkey ceremony, RLS, saves, portal provisioning/revocation, subscriptions and notifications remain unverified. Test accounts and supported staging setup are needed for those checks after review. No production-mutating E2E or live contract scripts were run.

No new app dependency, migration, deployment or member record was created. Existing application components, CSS, business logic and auth rules are unchanged. The only repository additions are Codex/tooling configuration, local audit scripts and audit documentation/evidence. The audit and implementation plan still require operator approval before redesign work begins.

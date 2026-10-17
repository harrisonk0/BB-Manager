# Testing and regression standards

Frontend acceptance requires independent review of the integrated application. An implementer's passing tests are necessary evidence, not independent acceptance. Record the implementing, reviewing and testing contributors in the review register. A changed file does not close a finding until its reproduction passes again.

## Safe test layers

1. `npm run test:run` runs domain/service unit tests. Existing marks, archives, timezone, ranks and scoped reporting contracts remain authoritative.
2. `npm run typecheck` and `npm run build` validate the shipped graph.
3. `node scripts/design-system-check.mjs` parses TypeScript import syntax and runtime dependencies. Framework7 ownership belongs to shared UI/shell; static and literal dynamic competing component imports are blocked. Production imports of test fixtures/prototypes are rejected, including relative and `@/` paths through services and hooks. Mutation tests verify these checks fail for prohibited code and accept scoped, reviewed, unexpired exceptions. This deliberately does not guess visual quality from class names.
4. `npx playwright test --config tests/frontend/playwright.config.ts` renders the real application and its actual Supabase services/hooks against intercepted synthetic HTTP. All traffic outside the first local application origin and the fully intercepted synthetic Supabase host is denied; unimplemented fixture requests fail acceptance. No real credentials or database are required. Use the bundled pinned Chromium for visual baselines. Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` only for explicitly labelled supplemental checks with an installed compatible Chromium. The default port is 4192: 4190 is a restricted network port in WebKit. `FRONTEND_PORT` and `FRONTEND_OUTPUT_DIR` isolate parallel review runs and artifacts; each test server has its own Vite dependency cache with HMR disabled. `FRONTEND_WEBKIT=1` includes WebKit after its browser/dependencies are installed.
5. Credential-dependent `tests/e2e` and SQL contract tests provide separate authorised staging verification. Do not run them against production merely because they are labelled isolated. The sentinel suite creates and deletes member data. The smoke suite additionally changes settings/marks and requires a deliberate mutation opt-in.

Fixture browser contexts explicitly block service workers, which otherwise can bypass Playwright page HTTP routing. Worker lifecycle, push delivery and installed offline behaviour require their separate safe acceptance checks. Synthetic tests do not prove RLS, Edge Function scoping, passkey ceremony security, real push delivery or physical device behaviour. Keep those statuses explicit. Never claim a hidden menu verifies authorisation.

## Rendered acceptance

Review 320, 375, 390, 430, 768, 1024 and 1440 CSS-pixel widths. Include Company and Junior, long names, NCO ranks, empty/error states, thirty-member and hundred-member rosters. Check the lower portion of long pages, keyboard focus, save clearance and overlays. A document overflow assertion alone does not demonstrate usable mobile composition.

Inspect comparable screenshots across roster, marks, history, reporting, archives, calendar, portal, settings and authentication. Capture modal open/closed, filter, focused numeric input, saving/failed/saved and destructive confirmation states. Use synthetic information exclusively. Review against the approved Variant A reference rather than accepting an implementation simply because it renders.

Visual baseline changes must be reviewed; CI must never run `--update-snapshots`. Pixel thresholds require a documented reason, stable browser/OS/fonts and reduced-motion settings. Keep functional assertions alongside snapshots. Browser screenshots cannot reproduce the system keyboard or physical iPhone compositor.

## Core adapter contracts

- Disabled/busy `NativeButton` must disable the real HTML button and prevent activation.
- `NativeSwitch` must synchronise F7 instance, native checkbox and React state; native input remains keyboard-focusable and the touch target is comfortable.
- `TaskSheet` isolates background interaction, wraps focus in both directions, supports permitted Escape dismissal, blocks dismissal while busy and restores focus to a connected trigger or main fallback. Closed sheets must have no tabbable controls.
- F7-native tab lifecycle and browser history must preserve the user's location without parallel competing routers. Authentication/account/role changes clear protected views.
- Score/attendance tests assert payload semantics: absent, unrecorded, blank and zero remain distinct. Failed saves retain drafts; date/back/section/logout navigation protects dirty work.

## Accessible review

Combine axe scanning with manual keyboard and visual inspection. Verify labels, error associations, headings/landmarks, live feedback, contrast, focus visibility, reduced motion and 320px reflow. Audit C01–C22, M01–M12 and A01–A15 individually; an automated scan cannot automatically close all findings. Manual VoiceOver and physical iPhone keyboard/Home Screen checks remain a separate acceptance gate.

## Architectural exceptions

`architecture-exceptions.json` is the scoped exception register. Each entry specifies `file`, `rule`, a substantive `reason`, `reviewedBy` and an ISO `expires` date. Expired or incomplete exceptions do not suppress failures. Exceptions require independent review and cannot authorise weaker authentication, permissions or backend contracts. Do not use blanket directory exemptions or disable the check to accept a competing framework.

## CI separation

Run safe unit/type/build/architecture checks for frontend changes and browser fixtures without secrets. The current workflow runs browser visual checks on `ubuntu-latest` with Node 22 and the lockfile-selected Playwright browser revision. This is not a pinned operating-system container: runner/font changes can cause visual drift and require investigation rather than automatic baseline acceptance. A future pinned-image change must regenerate and independently review baselines in that exact image. Keep authorised staging/database checks distinct, clearly gated and unavailable to untrusted PR code with privileged credentials. Frontend-only fixture tests must never acquire production credentials.

## Maintained integrated browser suites

- `adapters.e2e.ts`: real Framework7 adapters under React StrictMode; disabled controls, native switch synchronisation, search/axe, focus wrapping/restoration including SVG/deleted origins, dynamic dismissal, initially open lazy sheets and repeated destruction/pointer cleanup. The fixture imports production shared components, not a second UI implementation.
- `app.e2e.ts`: seven-width actual roster reflow, 100-member search and real decimal marks service payload.
- `workflows.e2e.ts`: roster/NCO CRUD, dirty member editing, Company/Junior score/attendance semantics, failed save/retry, archive read failure/recovery, real PDF generation/download, London-local calendar payload, portal reset, setup URL scrubbing, typed session confirmation, deferred actual member/import/archive service calls, history correction/deletion and browser Back/Forward draft protection.
- `auth.e2e.ts`: actual localhost password form, client session reload and failed-sign-in/recovery presentation against intercepted Auth responses. This does not exercise hosted passkey ceremonies.
- `scope.e2e.ts`: delayed settings/member callbacks across Company→Junior and Company→Junior→Company transitions; obsolete mutation completions must not repopulate a newly entered workspace.
- `mobile.e2e.ts`: iPhone-emulated touch tabs/attendance/switches, ordinary/leader portal navigation and synthetic VisualViewport keyboard inset/pinch-zoom handling. Native iPhone keyboard and compositor acceptance remain separate.
- `security.e2e.ts`: independently authored deferred auth/data requests, cached view clearing, account/role changes, portal demotion/revocation/feed recovery and setup credentials. These client tests supplement separately required server enforcement tests.
- `visual.e2e.ts`: independently authored page-family matrix with reviewed Chromium baselines, WebKit captures, overflow, control geometry, lower-scroll content, axe and page errors.
- `performance.e2e.ts`: 30/100-member actual marks interactions; raw timing samples and environmental limitations are recorded, without representing them as field-device INP.

The fixture's fake session expiry is deliberately fixed far in the future so installing a deterministic screenshot clock cannot accidentally expire it. This is test-only data, not a relaxation of production sessions or a test of expiry security. Each browser context starts fresh; fixture seeding occurs once, so reloading after logout does not silently authenticate again.

# Framework7 Native production migration report

Functional baseline: production main `e060fcecb504a2c9b5d36fe40f304c4ce9f05877`. Approved design: PR #54 Variant A. Implementation branch: `feat/framework7-production`. This report records implementation separately from evidence and release acceptance. No production deployment, merge or member-data mutation is authorised or performed.

## Implementation and ownership

The production frontend now uses Framework7 9.2 React's iOS foundation across staff, Company/Junior marks, history, reporting, archives, administration, calendar, portal, Squad Leader, authentication and account pages. Production services, SQL/Edge functions, schemas, stored-score/date semantics and PDF document implementations remain unchanged. This is the real frontend connected to those services, not the synthetic prototype substituted for production.

Eight specialist responsibilities were assigned through actual supported subagents, with disjoint file ownership in the shared worktree; reviewers were independent of the slices they assessed. Shared entry/dependency/CI integration remained Lead-owned.

| Agent | Actual contribution | Independent assessment |
|---|---|---|
| A — foundation | Shared Framework7 provider, controls, sheets, lists, tokens and foundation documentation | F accessibility/visual; G security source; H adapter/lifecycle tests; Lead integration |
| B — staff | Roster/search/filter/actions, member editor/history, Company/Junior marks, NCO display and memoized marks rows | F/G review; H actual service-payload/workflow/performance tests |
| C — reporting | Dashboard/charts, archives, reports, imports, session and squad settings | F/G review; H export/mutation tests; C separately reviewed governance it did not implement |
| D — portal/calendar | Calendar/event management, portal administration, ordinary portal, leader reports and portal shell | F/G review; H calendar/role/lifecycle tests |
| E — auth/navigation | Authentication/passkeys/recovery, protected shell/history, workspace changes and PWA presentation | G/F review; H auth/security/history tests; E independently reviewed Lead scope guards |
| F — accessibility | Original 49-defect register, cross-family visual/axe/mobile reviews, Chromium baselines and WebKit inspection | Lead inspects captures; H independently exercises focus, sheets, mobile interactions |
| G — security/parity | Source-backed 53-row inventory, role/data/token/cache review, actual-App security cases, staging CI safety | H reproduces security tests and independently tests CI preflight; Lead diff review |
| H — testing/performance | Actual-App synthetic HTTP infrastructure, independent workflows/adapters/auth/mobile tests, architecture mutation tests, timing and bundle evidence | G reviews fixture boundaries/enforcement; F reviews rendered system; Lead integrates results |

G's final CI follow-up encountered an agent usage limit after its earlier review and CI changes were delivered. H independently reviewed and tested that preflight; the final report does not imply an additional G approval occurred afterward.

## Parity and user flows

The [complete 53-row source-backed matrix](feature-parity.md) identifies baseline sources, contracts, owners and exact acceptance limits. All rows have implementation/source assessment; broad rows intentionally do not imply every backend/device scenario was tested. [Independent review](review-register.md) and [security findings](security-review.md) distinguish the narrower automated evidence.

| Previous flow | Migrated flow | Preserved contract |
|---|---|---|
| Header/menu → roster cards → member actions | Native Members tab → grouped searchable roster → detail/More → shared editor/confirmation | Search/squad/year/sort, ranks, all CRUD/history/import actions |
| Weekly Marks form → date and rows → save | Marks tab → meeting control → three-state attendance and numeric fields → fixed Save accessory | Present/absent/unrecorded, blank/zero, Company decimals, Junior Behaviour maximum, lock/draft/retry |
| Dashboard/archives desktop sections and modal reports | Reports tab or Workspace → readable metrics/tables → adaptive report/import sheet | Original calculations, archived sessions, PDF contents and import rules |
| Separate calendar/portal/leader visual systems | Role-appropriate native tab/sidebar workspaces sharing tokens/controls/sheets | Existing scoped summaries, London dates, subscriptions, event tools and permissions |
| Menu settings/account/admin dialogs | Grouped Settings/Account rows and adaptive task sheets | Passkeys, meeting day, squad autosave, both-section typed new-session safeguard |

Additional destinations remain available through the role-aware workspace menu. Officer Section Settings remains unavailable as in the baseline. There is no standalone portal-revoke endpoint invented by the redesign: the existing reset/member-removal revocation behavior remains authoritative.

## Architecture, dependencies and governance

One provider registers Framework7's lightweight implementation and required modules. A protected staff or portal workspace owns one routed stack, not a separate persistent stack per primary tab. Principal/role/section changes destroy protected views. Initial/deep routes are validated; Framework7 owns normal history, with explicit dirty-navigation cancellation handling and workspace-boundary address reset. See [navigation](navigation.md) and [ADR](adr-framework7.md).

Runtime additions: matching `framework7`/`framework7-react` 9.2.0 and Lucide React 0.468.0. Axe is test-only. Production remains React 19/Vite/Tailwind 3; no Konsta/Vaul/Ionic/refraction framework is installed. Platform system fonts and legally usable icons retain Boys' Brigade assets/section identity. Third-party notices are in `public/ui-third-party-notices.txt`.

The [component catalogue](components.md) describes actual exports, props, states, accessibility contracts and consumers. [Foundations](foundations.md) records implemented tokens and layout/type/motion. Root AGENTS preserves existing security/domain rules and permanently mandates the approved iOS 26 direction, shared primitives, mobile/accessibility/visual checks, independent review and a fallback where subagents are unavailable. Scoped instructions cover shared UI, shell and frontend tests without duplicating the full system.

AST-based enforcement rejects competing foundations, Framework7 imports outside shared UI/shell, and production imports of tests/prototypes, including literal dynamic imports. Scoped reviewed expiring exceptions are explicit. It does not pretend to judge visual quality through string matching. CI runs safe contracts and both browser engines with reviewed Chromium pixel baselines; screenshot changes require review, never automatic acceptance. Credentialed sentinel/database checks are separately manual, allowlisted staging-only and fail closed before authentication. There is no staging available in this engagement.

## Reproduced defects and remediation

Independent testing returned defects rather than accepting changed code as proof. Important fixes include dynamic busy-sheet dismissal; Framework7 Toggle synchronization; missing sheet touch-listener teardown; background inert/focus across overlapping sheets; React portal ownership and modal registry cleanup on workspace destruction; stale initial/deep-route handling; browser Back cancellation; late principal/section callbacks including Company → Junior → Company; same-principal role/account revocation; feed-secret clearing; intercepted PDF downloads; tiny/low-contrast grouped footers; tablet history overflow; portal viewport height; crowded roster actions; and wide form readability. Final outcomes and remaining limits belong in the review/audit registers.

## Verification evidence

Local typecheck, architecture check, 20 unit suites /152 tests and build passed. H’s final coherent functional run passed118/118 across Chromium/WebKit, with14/14 additional long-name/report/name checks and four separately measured performance cases. F’s final corrective checks passed42/42 roster/leader cases and14/14 WebKit native-entry readiness repeats; the historical full matrix was250/254 and is not relabelled green. CI must pass at the final PR head.

Final local/CI counts and evidence are recorded in the [review register](review-register.md), [testing standard](testing-and-regressions.md), [audit register](audit-acceptance.md) and `tests/frontend/evidence/`. Browser tests render production components/hooks/services against fully intercepted synthetic HTTP, rejecting unknown external requests. They do not prove server authorization or actual persistence.

Visual coverage includes 17 page families at 320, 375, 390, 430, 768, 1024 and 1440px, top/lower scrolling content and eight representative integrated sheets. Chromium baselines live in `tests/frontend/visual.e2e.ts-snapshots/`; WebKit provides separate rendered compatibility/axe/interaction evidence. Playwright MCP was also used for direct inspection. All screenshots use synthetic information.

[Performance evidence](performance.md) separates initial JS/CSS, optional PDF chunks, shared-VM interaction timings and physical-device limitations. The unchanged lazy PDF engine remains the largest optional chunk. Native fidelity has an acknowledged Framework7 startup cost; timing improvements are measured rather than presumed.

## Cross-page visual references

Reviewed synthetic 390px Chromium baselines: [Members](../../tests/frontend/visual.e2e.ts-snapshots/members-390-chromium-linux.png), [Junior Members](../../tests/frontend/visual.e2e.ts-snapshots/junior-members-390-chromium-linux.png), [Marks](../../tests/frontend/visual.e2e.ts-snapshots/marks-390-chromium-linux.png), [History](../../tests/frontend/visual.e2e.ts-snapshots/history-390-chromium-linux.png), [Dashboard](../../tests/frontend/visual.e2e.ts-snapshots/dashboard-390-chromium-linux.png), [Calendar](../../tests/frontend/visual.e2e.ts-snapshots/calendar-390-chromium-linux.png), [Settings](../../tests/frontend/visual.e2e.ts-snapshots/settings-390-chromium-linux.png), [Ordinary portal](../../tests/frontend/visual.e2e.ts-snapshots/portal-390-chromium-linux.png), [Squad Leader](../../tests/frontend/visual.e2e.ts-snapshots/leader-390-chromium-linux.png), [Editor sheet](../../tests/frontend/visual.e2e.ts-snapshots/sheet-editor-390-chromium-linux.png). The same directory contains every target width and representative overlays; these are application captures, not marketing mockups.

## Review build and commits

[PR #55](https://github.com/harrisonk0/BB-Manager/pull/55) contains the migration. `c87dbe4` preserves approved audit/prototype references and `ccebf6a` contains the production foundation/features/governance; subsequent commits record final independent remediation/evidence. Review the PR commit list for final hashes and checks. No merge or production deployment was performed.

The repository's existing Vercel integration automatically created a [branch preview](https://bb-manager-git-feat-framework7-p-16aa34-harrison-kerrs-projects.vercel.app). Open it in iPhone Safari and authenticate to Vercel if prompted: an unauthenticated HTTP check returned the Vercel SSO redirect. The alias updates with this branch; it is not a dedicated staging backend. Its configured backend and normal application authorization still apply. Synthetic demonstrations/tests run locally through isolated HTTP fixtures, not through a production auth bypass on that preview. For local synthetic review, run `npm run test:frontend`; no backend credentials are required.

## Outstanding release acceptance

**No staging is available; the product owner explicitly requested that live verification remain pending.** No real-user/password/passkey/push/SQL/RLS test was run against production. Source review and synthetic role-boundary tests are not a substitute for backend contract execution. Current services and policies were preserved, not independently certified through a live project.

Physical iPhone Safari and Home Screen behavior, VoiceOver, actual system keyboard/compositor clearance, hardware passkey prompts, push permission/delivery, launch/resume, native font rendering and real-device responsiveness remain pending. Playwright WebKit is not physical iPhone Safari. Exact SwiftUI rendering, OS gestures and native keyboard accessories cannot be guaranteed in a web app.

### Physical-iPhone acceptance checklist

- Install from a safe preview; check icons, standalone launch/resume, status bar and all safe areas.
- Use Company and Junior with long names; mark attendance one-handed, enter zero/decimal scores and confirm real safe-project readback.
- Open the last numeric field and sheets with the keyboard; verify Save, scrolling, rotation and keyboard dismissal.
- Exercise detail Back, browser edge Back/Forward, dirty Stay/Leave, section switch and sign-out; confirm no old data after account/role change.
- Use VoiceOver and enlarged text through roster, marks, reports, errors and confirmations.
- Test platform passkey sign-in/enrollment/recovery and hosted last-key policy on authorised disposable accounts.
- Test installed push enable/disable, notification opening, revoked accounts and offline errors without offline persistence claims.
- Validate archives/imports/PDF/session safeguards against disposable fixtures in a designated safe backend before release.

Production readiness requires those explicit acceptance gates and reviewed CI evidence. The implementation is delivered for review; this document does not authorise merge or deployment.

# Independent review register

Baseline: production main `e060fce`; re-fetched unchanged during final integration. Lead/integration owner: root. This register records frontend acceptance separately from live backend, CI and physical-device release acceptance. User confirmed no staging is available; no production mutation is substituted for that missing gate.

## Ownership and acceptance

| Slice | Implementer | Independent reviewer | Independent tester | Affected functionality/files | Disposition |
| --- | --- | --- | --- | --- | --- |
| Foundation/adapters | A | F visual/accessibility; G source/security; Lead integration | H | `components/ui`, `styles/design-system.css`; native buttons/switches, lists, sheets | Implementation/source reviewed; final integrated browser evidence below |
| Staff roster/marks/history | B | F + G; Lead | H | HomePage/BoyForm/WeeklyMarks/BoyMarks and `components/staff` | Implementation/source reviewed; real service calls retained; final synthetic workflow evidence below |
| Reporting/archives/settings | C | F + G; Lead | H | Dashboard/BarChart/Archives/Import/SessionReport/Settings/Squads | Implementation/source reviewed; original computations/documents retained; final synthetic evidence below |
| Calendar/portal | D | F + G; Lead | H | Calendar/PortalAccess/PortalHome/SquadLeader/PortalShell | Implementation/source reviewed; scoped services retained; final synthetic evidence below |
| Auth/navigation/PWA | E + Lead | G security; F accessibility; E reviewed Lead data-scope guards | H | App, shell, auth/data/dirty hooks, login/account/passkeys/manifest | Source reviewed; final actual-App auth/history/security evidence below; hardware/hosted paths pending |
| Governance/integration | Lead, G staging CI; H test infrastructure | C independent governance; G fixture/import boundary; Lead CI review | H | AGENTS/docs, AST rule, CI, entry/dependencies | Architecture and staging preflight mutation tests passed; runtime/visual evidence below |

## Reproduced findings and independent remediation

| Finding | Implementer of remedy | Independent result |
|---|---|---|
| Framework7 React19 Toggle/disabled semantics | A | H exercises native checkbox, external state, keyboard and real disabled button |
| Busy dismissal policy captured only at sheet initialization | A | H verifies busy→idle and idle→busy Escape/backdrop/header behavior, plus actual slow member/import/session mutations |
| Global touch listeners survive Framework79.2 sheet destruction | A | G reviewed pinned framework lifecycle; H repeated destroy/remount/pointer scenario |
| Portal background still focusable, overlapping Workspace/Unsaved sheets release inert state early | A | F eight overlay axe/focus cases; H real dirty marks→Workspace→Unsaved→Stay handoffs in both engines |
| Framework7 reparents React-owned sheets and leaks modal bookkeeping on section destruction | A | Stable portal `containerEl`, before-destroy native close and callback suppression; H verifies real section-switch and delayed-callback workflows |
| Stale initial section/deep route competes with React home state | E + Lead | Validated initial route/catchall; reset only at new-workspace boundary; H unknown/forbidden bookmarks and section-switch scenarios |
| Canceling dirty browser Back desynchronizes cursor | E | H Stay/Leave/Forward actual browser-history workflow |
| Obsolete data/settings callback across Company→Junior→Company | Lead | E independently reviewed captured-owner identity; H delayed settings and member-save tests in both engines |
| Late auth/portal summary, revoked role/account and feed secret retained | E/D + Lead | G authored actual-App deferred/revocation cases; H final coherent security rerun |
| PDF anchors intercepted by Framework7 | C/D + Lead | H generates and downloads real synthetic session PDF and event poster |
| Roster actions obscure names; More import clipped by search layer | B | F cross-width visual review; H actual import selection and mutation |
| Tablet history input/delete overflow, zero-height portal, wide forms, low-contrast 12px footers | B/D/A + Lead | F measures/inspects seven widths, lower content, named scrollers and updated grouped-row contrast |
| Competing-framework/core import bypass and unsafe automatic credentialed CI | Lead/H; G | G/H AST mutation tests; H11 actual staging-preflight code cases, no network |

Changed code alone never closes a finding. Specific corrected workflows are rerun independently; historical failed artifacts remain traceable in review narratives rather than being called green runs.

## Verification checkpoint

- Lead final local commands: `npm run typecheck`, `npm run check:design-system`, `npm run test:run`, `npm run build` — passed; 20 unit files /152 tests. H separately re-executed architecture/staging-preflight suites after additional core-import mutation assertions (16/16).
- H final coherent functional Chromium/WebKit run: **in progress**; final sanitized evidence will replace this checkpoint.
- F final seven-width visual/accessibility comparison: **in progress**; reviewed Chromium baselines committed, separate WebKit compatibility captures.
- Source diff: no changes to `services/`, `supabase/`, `types.ts`, `types/`, PDF document source or push-only `public/portal-sw.js`.
- Performance: H quiet 30/100-member measurements and initial graph gzip evidence in `tests/frontend/evidence/`; see [performance](performance.md).

## Explicit release limits

No staging/live verification, database/RLS rollback-contract execution, hardware WebAuthn, real push delivery, physical iPhone Safari/Home Screen or VoiceOver acceptance is claimed. These remain separate release gates despite frontend implementation and synthetic checks. Playwright WebKit is not an actual iPhone. The [migration report](migration-report.md) provides the device checklist and final readiness assessment. No merge/deployment is authorised.

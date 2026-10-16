# Full application migration strategy

**Status: proposed after prototype review; not authorised for execution by this design stage.** Keep the verified audit findings as release gates. Do not replace business logic to make the new screens easier to build.

## Architecture and safe migration

Introduce one semantic token layer and shared primitives into the existing React/Vite application, then migrate page families incrementally. Preserve `useAuthAndRole`, section management, `useAppData`, `useUnsavedChangesProtection`, existing save-plan/date helpers, portal services and lazy PDF boundaries. The prototype’s `data.ts` and local save timer are not production service implementations.

Use one role-aware navigation configuration and a small route adapter appropriate to the existing SPA. Routing should own page/detail identity, browser Back/Forward, scroll/focus restoration and dirty-navigation guards. Preserve setup-link credential capture/removal before normal routing. Never persist setup codes, private calendar feeds, bearer tokens or account recovery credentials in routes. Deep-link filters/details carefully; the prototype only proves top-level history, not the complete route architecture.

Keep a reviewed component catalogue with loading, empty, error, focused, pressed, selected, disabled, busy and long-content variants. Semantic role names must distinguish identity, action and attendance. Retain and adapt existing `Icons`, `Modal`, `BoyForm`, `CompanyCalendar`, `PasskeysCard`, report/export components and toast provider; avoid a second parallel design framework.

Before any implementation starts, reconcile the approved design with **current main**, not only audit baseline `0f87392`. PR #52 subsequently added optional Company NCO ranks. The new shared name/identity row must preserve rank insignia and accessible rank labels across roster, marks, history, reports, portal, imports and archives. Year 11–14 eligibility, optional no-rank state, archive preservation and the fact that rank grants no permissions remain unchanged. Do not copy the older prototype fixture model into production types.

## Page-by-page order

| Phase | Views / work | Completion and regression gate |
| --- | --- | --- |
| 0 · Review | Select direction, exercise roster/marks/leader/settings prototype with officers on an iPhone. Compare Calendar versus Squad as a staff tab; try standing/one-handed attendance and long names. | Explicit design/prototype review before mass migration. Record agreed deltas; do not infer approval from this PR. |
| 1 · Foundations | Semantic tokens, system type, zoom, focus, shared control geometry, safe areas, named adaptive Modal/Sheet, status/error primitives, reduced motion. | Original defects C01–C10, C22 and relevant A findings covered. Test existing modal callers and changing-content focus traps before broad page work. |
| 2 · Shell / access | Staff header and tabs/sidebar, section chooser, More, ordinary portal shell, leader shell; route/history adapter. Login, setup, enrollment, recovery, checking, denied and fatal states use the same typography/controls. | Hosted passkey and local recovery paths unchanged. Boy identities never gain staff navigation/data. Setup query secrets consumed/removed. Refresh, Back, direct links, scroll restoration and unsaved guards all covered. |
| 3 · Members | Home roster, persistent search, filters, member detail/editor, NCO badge, add/remove and import entry. | Preserve search/sort/year/squad/leader/rank logic, create/edit/delete constraints and import actions. Test empty/no-results, 30/100-member fixture, long names and returning focus/position. No essential action removed for visual simplicity. |
| 4 · Weekly Marks | Company and Junior task layouts, meeting picker, historical lock, clear confirmation, explicit attendance/score family and shared Save accessory. | Existing snapshot RPC/SavePlan intact. Test present zero/blank, absent, unrecorded clearing, decimal/range errors, past unlock, dates/timezones, clear-before-save, invalid filtered row, in-flight edits and failed retry. Highest workflow gate; do not batch with unrelated data changes. |
| 5 · Individual history | BoyMarks, dated corrections/deletion, member summary, back context and dirty state. | Existing historical two-state record semantics and patch RPC retained. Junior two-field editor fits 320px. Same field/errors/save primitives as Weekly, adapted to existing-record rules. Dedicated deep link or full-screen route with correct Back; prototype sheets are not final routing. |
| 6 · Staff reporting | Dashboard overview, top-five, monthly comparison, heatmap and PDF launch. | Compact mobile summaries and expandable month detail; full comparison on larger screens or explicitly labelled alternate view. Fix conditional-hook risk first. Maintain all reporting values, ties and date ranges; preserve lazy PDF and print tokens. |
| 7 · Portal / leader | Ordinary portal personal progress, next event, permitted teammate identity/standings; Squad Leader report, dated own-squad roster and all-week reporting. | One visual language. Preserve server-scoped data: ordinary boys get no teammate statistics, active leaders get only their current squad’s dated records, other squads aggregate only. Transfer/demotion/deletion/reset revoke as today. Preserve average/attendance/ranking definitions; dates and zero/absent/unrecorded tested. |
| 8 · Calendar | CompanyCalendar shared staff/portal agenda-first phone presentation, month/tablet mode, event create/edit, generator, subscription and poster. | London scheduling/timezones/DST, audience gates, feed secrecy and poster exports retained. Errors distinct from no events; 44px event/day controls. Use the same sheet/fields in staff and portal. Junior still has no Company calendar. |
| 9 · Section administration | Settings, squad add/rename/remove, start BB year, Archives list/detail/import/PDF. | Existing captain/admin checks. Preserve typed confirmation and both-section archive warning, returning member rules, rank/archive snapshots and failure recovery. Clarify explicit save versus existing rename-on-blur; do not silently change persistence policy. |
| 10 · Account / portal administration | Account settings and PasskeysCard, notification controls, PortalAccess provision/refresh/copy/reset/revoke, sign out. | Hosted passkey migration, recovery, clipboard secret links, permission prompts, push and revocation unchanged. Never simulate success for real account operations. Test all busy/error/unsupported states. |
| 11 · PWA / rollout | Install assets/status theme, safe-area/keyboard tuning, resume/error states, performance budget and full regression. | Physical iPhone Safari + standalone, VoiceOver, iPad, Chromium/Firefox/WebKit coverage. Staged review of every role before production deployment. Remove old `.sd-*`/portal/staff visual rules only when all consumers migrate. |

## Production component inventory

Build/adapt `AppShell`, `TabBar`, `Sidebar`, `PageHeader`, contextual Back, `SectionPicker`, `GroupedList/Row`, `MemberIdentity/RankBadge`, `Button/IconButton`, `Segmented`, `Field/Input/Select`, `Switch/Checkbox/Radio`, `SearchField/FilterSheet`, `AttendanceField`, `ScoreField`, `MarksRow`, `SaveBar`, `AdaptiveDialog/Sheet`, `ConfirmDialog`, `ErrorState`, `EmptyState`, page-family skeleton, `StatusMessage/Toast`, `Metric`, `ReportTable/Disclosure`, `ChartSelection`, `Agenda/EventRow`, import selection rows and export/loading controls. Add a popover/context-menu only for a demonstrated task and with full keyboard semantics.

Examples of real reuse:

- `MemberIdentity` renders staff roster names, Weekly row names, portal own profile, leader member report and archive import rows, including the existing passive rank badge.
- `AttendanceField` and `ScoreField` render Weekly and dated corrections; their adapters preserve the distinct existing-record semantics.
- `AdaptiveDialog` powers staff filters, Junior editor, calendar event editor, portal account actions and archive confirmation. Typed destructive confirmation is a stronger variant, not a generic “OK.”
- `SettingRow` powers captain section settings, ordinary-boy account and leader preferences. Only the destination configuration and data permissions differ.
- `EventRow` and event detail are shared by staff calendar, portal agenda and next-event summary. `SaveBar` reserves the same safe-area/toast space in Company/Junior/history.

## PWA and interaction programme

Unify manifest, viewport, theme colour and visible canvas; preserve push worker scope and keys. Review supplied artwork at 192/512 and Apple touch-icon sizes, maskable safe zone, rounded-corner crops and light/dark launch presentation. Do not add a cropped/invented emblem just to resemble an iOS icon. Status-bar style and theme should match standalone and Safari states; launch splash remains OS-controlled.

Use document scrolling, `dvh`, safe-area insets and a bounded modal scroll body. Test keyboard scrolling/last input/footer, numeric keyboards, blur, focus restoration, browser chrome collapse, landscape, installed relaunch, auth expiry and route recovery. Use VisualViewport as enhancement, never a prerequisite. In-app-browser/unsupported states need understandable alternatives.

Keep short purposeful transitions and a static reduced-motion alternative; use solid surfaces for increased contrast or unsupported blur. Do not emulate native swipe navigation, add scroll hijacking or rely on iPhone haptics. Animate no score counters during entry. Preserve immediate touch response on modest devices; profile before adding transition libraries.

Present connectivity honestly. Shell caching may be considered after a cache/update/auth-clear design. Do not persist member data, silently queue marks, or call a failed save “saved offline” without an independently approved data/security/reconciliation design. Existing explicit-save and failure behaviour remains authoritative.

## Mandatory original-audit acceptance register

Every original finding remains tracked. The new visual direction supersedes its proposed aesthetics, not its verified facts. These are **future production gates**, not claims that the isolated prototype has repaired the live application.

| Finding IDs | Required acceptance evidence |
| --- | --- |
| C01–C06 | One semantic system, dependable system font, deliberate hierarchy/gutters/density; identity and status separate. All staff/portal/leader screens visually reviewed together. |
| C07–C09, M04, A05–A07, A10, A15 | Shared buttons/fields, explicit attendance, exact visible/accessible labels, linked errors/first-error focus, contrast pairs, 44px product targets and visible focus. Junior/name/date cases included. |
| C10, M10, A02–A03, A13 | Every dialog named; stable focus during parent updates; current enabled focusables, inert background, Escape/restoration, body scroll containment and keyboard-safe footer. |
| C11–C12, M05, M09, A04, A11 | Stable role-aware navigation, real history/deep links, selected states, disclosure semantics, Back/scroll/focus restoration, skip link and meaningful h1. No setup credentials in URLs. |
| C13–C15, A12 | Shared pending/success/error/empty/loading patterns. Persistent errors with retry, shell context retained, no failed load presented as empty, no unannounced lazy export blank. |
| C16, M01–M03, M06–M08, A08–A09 | Actual 320px reflow for populated, loading, empty, error and editor states. No ordinary-control overflow or concealed monthly columns. Readable leader data and named/focusable intentional scrollers. |
| C17–C18, M11–M12 | Dirty guards, clear/delete consequences, typed archive confirmation, pending count, safe-area Save/Toast contract, discoverable search/reset, stable filter focus and preserved position. |
| C19–C20, A14 | Consistent icons/date-only versus London event formatting, reduced-motion/static skeleton policy, purposeful transitions only. |
| C21 | Unconditional hooks through empty→populated transitions, preserve lazy PDF boundaries, profile actual route/field performance. |
| C22 | Palette source included in CSS generation or static semantic styles; computed colours correct for every configured squad in production build. |
| A01 | Zoom enabled; manual 200% text/400% reflow and large-content tests. No fixed viewport workaround or clipping of controls. |

References: [consistency findings](../consistency-audit.md), [mobile findings](../mobile-first-audit.md), [accessibility findings](../accessibility-audit.md). This register covers C01–C22, M01–M12 and A01–A15 without closing them prematurely.

## Testing, accessibility and release risk

- **Domain contracts:** retain existing unit tests for score/date/save-plan/squad calculations and hosted SQL/auth contracts. UI work must not change schemas, RLS, RPC names/payloads, permissions or score semantics. Exercise zero, absent, unrecorded, tied positions, partial failures, in-flight edit/date changes and archive/import data. Backend-mutating tests require the existing isolated/rollback discipline.
- **Component interaction:** keyboard and screen-reader naming, focus under changing content, dialog/selection/navigation behaviour, error correction and save-state persistence. Prefer meaningful workflow tests over snapshots that merely mirror JSX.
- **Visual:** role × Company/Junior × supported page states at the seven agreed widths. Include 30/100-member fixtures, long names, ranks, two-line labels, loading, empty, errors and restricted roles. Review full content, not only the first viewport. Baselines reflect approved design, not generated-image text or numbers.
- **Accessibility:** WCAG 2.2 AA target, checked contrast (4.5:1 ordinary text, 3:1 qualifying large text and meaningful controls), semantic headings/table scopes, visible focus not hidden by bars, linked field errors, one appropriate live announcement, bypass link and modal isolation. 44px is the product target; do not misstate it as WCAG’s universal 24px AA minimum. Manual VoiceOver, keyboard, zoom/text scaling, increased contrast and reduced-motion gates supplement axe.
- **Cross-browser/device:** Chromium automated checks plus Safari/WebKit and Firefox; real iPhone Safari and installed mode, software keyboard, VoiceOver, iPad split view/rotation and desktop input. Resizing Chromium is not iOS testing. No universal claim about haptics, safe areas or standalone resume without hardware evidence.
- **Performance:** preserve lazy PDF imports, measure input latency and scrolling on representative devices, avoid broad context rerenders during score entry, keep blur restricted to small functional layers, use stable keys/derived calculations, and justify any new package or virtualization with profiling.
- **Regression risks:** routing can bypass setup/recovery or discard drafts; shared modal changes affect every destructive flow; form refactors can alter zero/absent/unrecorded; role navigation is not authorization; caches can expose stale member information; new typography can damage PDF pagination; latest rank and archive features can be missed on the audit baseline. Validate these before releasing each family.

No production migration, merge or deployment is implied by the existence of this plan. First review the real prototype, then scope the first implementation phase against current main.

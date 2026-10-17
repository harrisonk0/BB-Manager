# Refined native design system and production strategy

This is a proposal for review. No production components, data contracts, authentication, permissions, schema or deployment target have been changed. Prototype controls are synthetic demonstrations, not a new authorisation system.

## Shared architecture

Use a role-aware application shell, a single token layer and a small set of BB task components. Keep data access and validated save plans outside UI adapters. The experiments demonstrate this separation: `model.tsx` supplies the same fixture controller; `screens.tsx` supplies the same tasks; each entry implements its own framework adapter.

For a Framework7 migration, a single router owns page stacks and URLs. Do not put independent production history handling underneath Framework7. The prototype's tab/query history and internal member stack are deliberately limited; deep linking, refresh and browser Back must be completed before production adoption. Use lazy route modules and preserve each tab's scroll/filter state. At >=768px, primary destinations become a sidebar; wider reporting can use split content. The prototype uses a sidebar with adaptive content, not a fully implemented persistent member split view.

The four-screen comparison gives staff a direct Squad tab so the two reports are easy to compare. The full navigation proposal must also retain Calendar: Company staff → Members / Marks / Calendar / More (Dashboard and squad reporting in More); squad leaders → Home / Squad / Calendar / More; ordinary boys → Home / Calendar / More. Junior navigation excludes the Company calendar. Validate these task priorities with officers before committing the production role configuration; no existing destination is removed.

Keep React 19, existing services/hooks, backend RPCs and permissions. Framework7 does not require a Tailwind upgrade. Native+ would require either an isolated compiled Konsta stylesheet or a separately approved Tailwind 4 migration; never let global reset/utilities accidentally restyle production pages.

## Foundations and inventory

| Component / token | Contract and variants | Reuse |
| --- | --- | --- |
| Canvas / surface / material | #f2f2f7 canvas, opaque white data surface; restrained glass functional layer; opaque preference | Every role |
| Identity | BB navy #202944, Company brand blue #224b8e, Junior accent #145091; official assets | Workspace, sidebar, section context, reporting |
| Text | Platform system font first; large title 34/700, body 17, secondary 13–15, metrics 23–46 with tabular numerals; 12px minimum metadata | Staff roster, portal history, squad report |
| Insets / geometry | 16px phone gutter; 26px grouped list corners; 30–36px floating controls/sheets; hairline inset separators | Shared lists and sheets |
| AppNavigation | Role-defined destinations, labels, selected shape, safe-area-aware floating tabs; sidebar adaptation | Staff, ordinary portal, leader portal |
| PageNavigation | Large/compact navbar, contextual back, named icon actions; state restoration | Roster → member, event → detail, archive → session |
| Group / DisclosureRow | Static, disclosure, value, switch, destructive; 17px primary labels | Settings, member history, portal events, squad standings |
| Search / SegmentedFilter | Search remains visible; grouped selector with pressed state; sheet filters | Roster, reporting, calendar agenda |
| AttendanceField / ScoreField | Explicit Not recorded / Present / Absent; labelled numeric inputs; disabled, invalid and busy states | Weekly marks and individual correction |
| SaveAccessory | Dirty count, saving, saved, persistent failure/retry; explicit Save | Weekly marks, history editor, explicit-save settings |
| TaskSheet | Filter, workspace, editor, action, confirmation; contained scrolling and focus; compact/full detents | All role-appropriate secondary tasks |
| MetricPanel / DatedRoster / Trend | Readable values, date context, aggregate comparisons; explicit focusable chart scrolling | Staff reporting and own-squad leader view |
| Feedback | Compact loading, actionable empty, persistent recoverable error, polite success | Same system in staff and portals |
| RankIndicator | Optional NCO insignia with accessible rank name; independent from squad leader star | Roster, member detail, applicable reports |

Lucide supplies legally redistributable icons; small custom chevrons reflect the production rank geometry. The current production `memberRank` values are `lance_corporal`, `corporal`, `sergeant`, `staff_sergeant`. They are eligible only in Company Years 11–14; Staff Sergeant has four upward chevrons, other ranks one to three downward chevrons. Prototype display labels are not a replacement backend enum. Map through the existing `services/memberRanks.ts` when migrating. No rank grants permissions.

## Interaction standards

- Frequent targets >=44×44 CSS px. Inputs >=16px text; score inputs 19px. No colour-only attendance distinction.
- Use the foundation's native page transitions; no extra animation library. Feedback must not delay typing or attendance changes. Respect OS reduced motion and the explicit prototype preference.
- Keep floating navigation separate from the Save task control; reserve bottom scroll space. Hide tabs when a real keyboard substantially reduces the visual viewport, while retaining the Save action. Real iPhone testing is required for keyboard resizing variants.
- Member editors keep Add/Save in the sheet header so the action remains reachable while the form scrolls. Modal tasks have an accessible name, background isolation, keyboard containment, close button, Escape where supported and restored focus. Detent dragging starts at the handle, never on arbitrary form content. Destructive operations require explicit confirmation.
- Use polite status announcements for saving/saved, persistent error + retry on failure, and first-invalid-field focus. Simulated 450ms saves demonstrate feedback only; production latency is driven by existing requests.
- No swipe gestures compete with browser Back. No mandatory long press. No optimistic claim that marks were saved before the existing request succeeds.

## Old flow → proposed flow

| Task | Existing flow (audit) | Proposed flow |
| --- | --- | --- |
| Find a member | Home roster, reveal search, stacked card actions | Members tab, visible search, compact grouped roster, filters sheet; tap row for history |
| Mark arrivals | Open staff menu → Weekly, small attendance control | Marks tab → current meeting, large labelled three-state controls; explicit Save above tabs |
| Correct a score | Separate individual/history form with different controls | Member history → dated meeting; reuse ScoreField/AttendanceField and SaveAccessory |
| Inspect a squad | Separate bespoke squad dashboard with tiny reporting text | Same app shell and typography; date and own-squad roster follow compact summary metrics |
| Switch section | Header selection | Named workspace control → official Company/Junior choices; unsaved-change protection |
| Administrative settings | Separate card/form conventions | Shared grouped settings and role-scoped editors; sensitive confirmations retained |
| Calendar/events | Company-specific page and visual language | Company calendar/agenda destination with shared navigation, search and event sheets (next phase, not implemented here) |
| Archives/export/import | Existing dedicated screens and PDF/import workflows | Keep capabilities and contracts; migrate surfaces and task feedback, retain full reports |

**Full feature parity is a production acceptance requirement, not a claim about these four-screen experiments.** Calendar editing, archives, PDF reports, CSV import, invites, passkeys, notifications, account recovery and complete administration remain in production. Some prototype settings rows explicitly explain that they are outside this demonstration. Neither experiment is ready to replace the whole application.

## Migration sequence after explicit design approval

1. Rebase/integrate against current production, including NCO ranks. Create a feature-parity matrix from the audit application inventory and current routes. Lock current behaviour with existing meaningful tests; add missing contract-level regression checks rather than copying UI implementation into tests.
2. Introduce tokens, typography, buttons, fields, feedback and adaptive shell behind an isolated route/feature flag. Establish one router ownership strategy and retain existing authentication gates. Validate Home Screen preview on a real iPhone before rolling out navigation.
3. Migrate Members, member details/editor and filters. Preserve search, grouping, import/add/edit/delete, NCO eligibility, keyboard focus and return-to-position.
4. Migrate Weekly Marks and individual history together. Preserve three attendance states, numeric precision/ranges, present-blank-zero semantics, past-meeting unlock, pending edits, save retries and every current dirty/date/navigation guard. Reuse production save helpers/RPCs; never copy the fixture controller into production.
5. Migrate ordinary portal and Squad Leader surfaces using the same lists, navigation and metrics. Ordinary boys get only their own data. Active squad leaders get dated own-squad data through the existing scoped server contract; other squads remain aggregate only. Deletion/reset and passkey revocation remain unchanged.
6. Migrate Dashboard/reporting, Company agenda/calendar and event editors. Preserve detailed tables, exports, editing permissions and date semantics; use disclosure/scrolling or larger layouts rather than microscopic type.
7. Migrate Settings, account, archives, imports and remaining administration. Keep typed/destructive confirmation semantics and both-section warnings. Migrate login/loading/error states into the same visual family without changing authentication.
8. Complete PWA polish, end-to-end regression, real-device review and staged rollout. Production deployment and merge require separate explicit approval.

## Mandatory acceptance gates

All verified findings **C01–C22**, **M01–M12**, **A01–A15** in the original [consistency](../consistency-audit.md), [mobile](../mobile-first-audit.md) and [accessibility](../accessibility-audit.md) audits remain mandatory. Their factual defects are retained even where their conservative styling prescriptions are superseded. Track each against the affected production page; prototype screenshots do not close production defects.

In particular: no 320px toolbar/history/loading overflow; no 6–11px squad report content; accurate attendance names/states; labelled errors; correct dialog naming/isolation/focus; visible keyboard focus; accessible menus and navigation; persistent retry feedback; safe-area Save/toast coordination; reachable calendar cells/agenda; preserved URLs/back state; and clear empty/loading/error states. Test 200% text zoom and 400% reflow, contrast >=4.5:1 normal text / 3:1 large text and essential controls, WCAG 2.2 AA, VoiceOver and keyboard navigation.

PWA gates include `viewport-fit=cover`, standalone manifest identity and launch URL, safe-area/status-bar/theme choices, correctly sized icons, no stale authenticated content after logout/resume, keyboard visibility, background/resume refresh, network-error distinction and safe update handling. The prototypes add standalone manifests but no service worker: offline cold launch and durable offline saves are **not implemented**. Production offline writes need a separately designed conflict/reconciliation model.

Regression risks: Framework7 router ownership and view caching; global framework CSS; duplicated React/module versions; keyboard/scroll stacking; sheet focus on removal; unsaved state during tab/date/section navigation; portal data scope; rank eligibility; date/time-zone semantics; and print/PDF fonts. Use page-family screenshot baselines, production sentinel flows and existing auth/data contract checks. Do not run live mutation smoke tests to validate a visual prototype.

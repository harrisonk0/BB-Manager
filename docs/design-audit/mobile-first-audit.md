# Mobile-first audit

The mobile target is the primary management experience: find a member, record attendance and scores, correct mistakes, and move between tasks without losing context. A desktop layout that happens to shrink is insufficient. Evidence and severity definitions are in the [README](README.md).

## Viewport coverage

Browser: system Chromium 154, driven by official Playwright MCP 0.0.83, 1× CSS screenshot scale, 900px viewport height. Fixtures contain six invented members, a long surname, three squads, three recorded dates and one calendar event. This is representative layout evidence, not a large-roster performance or real-device test. The reproduction script fixes time to 16 October 2026 for date-based controls.

| View/capture stem | 320 | 375 | 390 | 430 | 768 | 1024 | 1440 | State |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `login`, `sections` | B | B | B | B | B | B | B | Signed-out component / section choice |
| `home`, `junior-home` | B | B | B | B | B | B | B | Populated roster |
| `weekly`, `junior-weekly` | B | B | B | B | B | B | B | Populated dated sheet |
| `member`, `junior-member` | B | B | B | B | B | B | B | Existing dated marks |
| `dashboard`, `archives` | B | B | B | B | B | B | B | Performance / session list |
| `settings`, `account` | B | B | B | B | B | B | B | Captain settings / localhost account |
| `calendar`, `access` | B | B | B | B | B | B | B | Staff calendar / account provisioning list |
| `portal`, `portal-calendar`, `portal-account`, `squad` | B | B | B | B | B | B | B | Activated leader portal and subviews |
| `setup`, `passkey` | B | B | B | B | B | B | B | Onboarding/enrollment components |
| `empty-home`, `empty-weekly`, `empty-dashboard`, `empty-archives` | B | B | B | B | B | B | B | Empty data |
| `error-calendar`, `error-portal`, `loading-portal`, `skeleton` | B | B | B | B | B | B | B | Synthetic errors/loading and real skeleton markup |
| `add-dialog`, `filter-dialog`, `event-dialog`, `pdf-dialog`, `session-confirm` | B | B | B | B | B | B | B | Open overlays |
| `mobile-menu` | B | B | B | B | B | — | — | Open staff menu; desktop menu is a different control |
| Actual app `/` | — | — | L | — | — | — | — | Logged out; no credentials submitted |

For each stem, `screenshots/<stem>-<width>.png` is the capture and `evidence/<stem>.json` has the measurements and axe results. For example: [weekly 320](screenshots/weekly-320.png), [weekly 390](screenshots/weekly-390.png), [weekly 1440](screenshots/weekly-1440.png), [roster 768](screenshots/home-768.png), [roster 1024](screenshots/home-1024.png). The [machine-readable coverage summary](evidence/coverage-summary.json) records missing/error results, overflow and rule counts.

## Verified issues and mobile standards

| ID / severity / priority | Evidence and task impact | Recommended standard / reuse |
| --- | --- | --- |
| M01 · High · P1 · S+B | Weekly toolbar (`WeeklyMarksPage.tsx:389`) is a single `flex items-center space-x-4` row. At 320px, both Company and Junior document widths reach **370px**, with Clear All Marks beyond the viewport. The 375–1440px captures fit at document level. | Stack date navigation and secondary actions at the base breakpoint; date and arrows must remain visible at 320px. Move Clear into a separated secondary action with clear consequences. Share a mobile task toolbar. Do not hide the defect with body overflow clipping. |
| M02 · High · P1 · S+B | Junior history (`BoyMarksPage.tsx:269`) places attendance, two 80px fields and delete in one row. Document width is **326px at 320px**. The delete glyph reaches the right edge. | Two-row editor on narrow phones: status/name/date context, then labelled Uniform/Behaviour and secondary actions. Reuse `ScoreField`/`MarksRow`; do not shrink type or hit targets to preserve desktop columns. |
| M03 · High · P1 · S+B | `HomePageSkeleton` (`SkeletonLoaders.tsx:57`) combines a 256px skeleton text block with three fixed 40px actions. Document width is **424px at 320, 375 and 390px**, then fits at 430px and wider. App uses it during auth, passkey checks and data loading. | Make loading state mirror the actual mobile row, using bounded widths and stacked controls. A loading view must pass the same reflow gate as populated content. Reuse existing skeleton family, not a new animation package. |
| M04 · High · P1 · S+B | Roster mobile header actions are **36×36px**, hamburger **40×40px**, Weekly attendance **112×28px**, Company score **80×34px**, Junior score **64×34px**. Calendar day cells at 320px have narrow fractional widths in a seven-column grid. | Product minimum 44×44px target area for frequent controls, adequate separation, 44px field height. Day cells need sufficient target width/spacing or an agenda-first narrow view. These measurements alone do not establish every WCAG 2.5.8 violation; AA uses 24px plus spacing exceptions. |
| M05 · High · P1 · S+B | Staff menu sits above all routes, opens from top-right, and lists up to ten actions on Company captain view. No expanded state/control association, no Escape dismissal; long panel has no viewport-height scroll boundary. Portal has separate Home/Account buttons. | Stable mobile navigation: trial Members, Marks, Calendar (Company) and More; Junior omits Calendar. More contains Dashboard, Past sessions and role-specific administration. Reuse role checks; test task frequency before committing to a bottom bar. Bound and scroll More, restore focus, announce expansion. |
| M06 · High · P1 · S+B | Dashboard monthly table has at least **304px** of pinned columns before month data, exceeding 288px content at 320px. `overflow-x-auto` prevents document overflow but leaves only part of the comparison readable. [390px report](screenshots/dashboard-390.png). | Mobile member summary list with current totals and expandable month detail; retain full comparison table on larger screens or as explicit alternate view. If horizontal table remains, provide a labelled, focusable scroller, visible scroll cue and one pinned column at most. |
| M07 · High · P1 · S+B | Squad dashboard fits the viewport but reduces table/name/helper text to **6–11px** (`SquadLeaderDashboard.css:621` and later). Decorative hero/metrics precede the useful dated roster, increasing travel. [390px squad](screenshots/squad-390.png). | Keep mobile supporting text ≥12px, ordinary content 14–16px. Put meeting date and this-night summary near the top; condense decorative hero rather than shrinking the report. Preserve own-squad-only data. |
| M08 · Medium · P2 · S+B | At 390px, six roster members already create a ~1316px document; each mobile row places three 48px actions on a second line. Marks use a centred second row and generous vertical gaps. Real rosters may require much more scrolling. | Preserve tap comfort while moving secondary Edit/Delete into an accessible named action menu; make member name/detail action clear. Use compact group summaries and a clear return-to-position model. Large-roster effect is U; profile with synthetic 30/100-member fixtures before virtualization. |
| M09 · Medium · P2 · S+B | Staff gutters 16px vs portal 20px; staff title begins 32px below 80px header, portal starts 20px below a ~56px header. Calendar hero adds 24/32px padding, settings nests another 24/32px card inset. | Shared gutter and header rhythm; form content remains readable without unnecessary nested frame padding. Shared PageContainer and PageHeader should eliminate repeated alignment decisions. |
| M10 · Medium · P2 · S+B/U | Modal overlay p-4 plus body p-6 leaves **240px** form width at a 320px viewport. Standard dialog fits in the 900px capture; long confirmation/event forms use internal scrolling. Real software keyboard/short landscape behaviour was not tested. | Responsive dialog with full-width/sheet presentation on narrow screens, bounded `dvh`, scrollable body, visible action footer, safe-area padding and keyboard focus checks. Reuse Modal. Device keyboard testing remains required. |
| M11 · Medium · P2 · S | Weekly save bar includes `env(safe-area-inset-bottom)`; BoyMarks save bar does not. Global toasts are fixed at bottom with higher z-index. A toast can compete with the save action; actual overlap under device insets is U. | Shared SaveBar/Toast placement contract, reserved content scroll space, visible pending count and save/error state. Keep current dirty/date guards. Test last field and focus visibility with device keyboard. |
| M12 · Medium · P2 · S+B | Search is revealed by an icon; filter applies immediately but focus jumps to Close after selection. No-results state offers no clear/reset action. Some primary actions (Add/Import) become unlabeled glyphs on populated mobile roster while empty roster uses explicit text. | Show persistent mobile search where roster size warrants it; labelled Add member and visible active-filter summary/reset; stable focus and consistent apply semantics. Reuse current search/filter state helpers. |

## What works and should survive

The roster wraps the synthetic long surname without document overflow. At 768px it becomes two columns and at 1440px three, rather than compressing everything into one fixed table. Mark rows stack below `sm`, and native score/date inputs remain available. Home's empty state provides Add and Import. Weekly protects pending date changes and has a labelled save action with safe-area padding. CompanyCalendar/EventCard already work across staff and boy contexts. Preserve these strengths while fixing geometry and consistency.

## Responsive rules to adopt

- **320–430px:** single-column task hierarchy, 16px page gutters, 44px controls, 16px input text, no implicit multi-column editor. Secondary actions wrap or move into named menus. Calendar may use an agenda-first view while preserving month context.
- **640px (`sm`):** enhance action rows and form grids only when content actually fits. Current `sm` is also where mobile roster rows stop stacking; test long names and all three Junior controls at this boundary.
- **768px (`md`):** optional paired panels or roster columns. The current skeleton starts desktop fake navigation at md but the real Header waits for lg; standardise that mismatch.
- **1024px (`lg`):** desktop navigation only after all Company destinations, logos and account actions fit. Keep viewport tests with captain/admin and officer roles. Staff Header uses `container`, main uses max-w-7xl, so verify their inner edges together.
- **1280px (`xl`) and above:** permit three roster columns and richer comparisons; cap the main canvas at 80rem. Squad custom 1200px styling should migrate to shared breakpoints or a documented content-driven exception.

These are proposed contracts. Test breakpoint edges as well as the requested seven widths; this audit measured seven representative points, not every intermediate pixel.

## Remaining mobile validation

Authenticated route transitions, staff officer permissions, ordinary-boy payloads, passkey setup/recovery, actual subscriptions and push were not exercised. Real iOS Safari and Android Chrome must verify keyboard placement, date/number pickers, text autosizing, zoom, orientation, browser bars, notches and touch. Test 200% text/zoom and 400% reflow after removing the viewport restriction. Test one-handed task completion with staff users; bottom navigation is a proposed hypothesis, not a validated user preference.

Do not interpret the 900px-high browser captures as proof of comfortable phone use. Re-run on short viewports, touch devices, slow networks and realistic synthetic roster sizes before accepting the redesign.

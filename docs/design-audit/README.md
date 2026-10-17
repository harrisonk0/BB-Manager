# BB-Manager design audit

**Audit date:** 16 October 2026. **Source baseline:** `0f87392` (squad leader dashboard, PR #51). **Status:** tooling and assessment only; redesign requires operator review and approval.

BB-Manager has useful foundations: section branding, native form controls, a shared modal, explicit labels on many member actions, protected unsaved marks, and lazy-loaded PDF reporting. It does not yet have an application-wide design system. Repeated Tailwind class strings form one interface language; the calendar and portal add another; `SquadLeaderDashboard.css` introduces a third. The highest-return work is to standardise the foundations and shared interaction patterns before polishing individual pages.

## Findings that should drive the redesign

| Priority | Finding | Why it matters |
| --- | --- | --- |
| P1 | Weekly Marks overflows to **370px at 320px**, Junior history reaches **326px**, and loading expands to **424px** on narrow phones | Core attendance work loses controls off the right edge. See [mobile findings](mobile-first-audit.md). |
| P1 | Zoom is disabled in `index.html`; shared dialogs have no accessible name; attendance labels conflict with visible state | These affect the whole application or its primary workflow. See [accessibility findings](accessibility-audit.md). |
| P1 | Status colours and secondary text fail contrast | White on the Present green measures **3.29:1**; slate-500 on the staff background measures **3.86:1**, below the 4.5:1 normal-text requirement. |
| P1 | Mobile navigation has no expanded state or Escape dismissal; most pages exist only in React state | Users cannot reliably perceive menu state, use browser Back, bookmark a task, or resume after refresh. |
| P1 | Squad dashboard achieves fit partly with 6–11px text; mobile reporting tables hide key columns offscreen | Passing a width check does not make a readable, efficient mobile experience. |
| P2 | Headers, widths, gutters, card radii, actions, loading and error states vary by page family | Every new feature recreates basic design decisions. See [consistency audit](consistency-audit.md). |

Severity and priority are separate: **High** means a primary task or broad accessibility barrier; **Medium** means material friction or systemic inconsistency; **Low** means polish. **P1** is the first approved work, **P2** follows foundations, **P3** is later polish. No P0 emergency is asserted.

## Recommended direction

Keep the Boys’ Brigade assets and the Company `#222943` / Junior `#284e8b` identities. Use a quiet neutral canvas, white surfaces, one type scale, restrained borders, and a small set of control and card shapes. Convey squad identity with labelled accents rather than colouring member names as though they were success or error messages. Avoid expanding the portal gradients and mint dashboard treatment into another competing brand.

Design the primary attendance and member workflows at 320–430px first. Give frequent mobile actions 44px targets, explicit labels, a visible save state, and comfortable score fields. Use one shared page anatomy and role-aware navigation vocabulary, while preserving distinct staff, boy, squad-leader and calendar workflows. See the [design system proposal](design-system-proposal.md) for concrete tokens, dimensions, page templates and behaviour.

## Implementation order

1. Establish neutral/section/semantic tokens, typography and shared control contracts. Include contrast and zoom requirements from the start.
2. Improve shared primitives, especially dialogs, fields, status controls and feedback.
3. Consolidate shell/navigation and page templates; preserve role and passkey boundaries.
4. Refine marks, member forms and mobile data presentation, then migrate the remaining page families.
5. Validate each migrated slice at all seven widths with keyboard and accessibility checks; retain visual regression coverage in CI.

The [roadmap](implementation-roadmap.md) specifies files, dependencies, benefits, regression risks, verification and relative complexity for each phase. These are proposals, not implemented UI changes.

## Evidence and limits

**S — source verified:** all 31 TSX files under `components/` (including the two PDF documents), their CSS and helpers, `App.tsx`, entry/configuration, hooks, services and existing E2E setup were inventoried. [Machine-readable inventory](evidence/source-inventory.json).

**B — browser verified, synthetic components:** the dedicated [audit harness](../../scripts/design-audit/harness.tsx) renders the existing components with invented names and a local fixture client. The official Playwright MCP server drives it at **320, 375, 390, 430, 768, 1024 and 1440px**, using a 900px viewport height. Captures cover staff pages, both marks variants, portal subviews, dialogs, navigation, empty/loading/error states. [Coverage and exact measurements](mobile-first-audit.md#viewport-coverage). Every screenshot is current UI, not a proposed redesign.

**L — live local application:** the real unmodified app was launched at port 4173; the logged-out screen was inspected without sending credentials. [Actual login capture](screenshots/actual-app-login-390.png).

**U — unverified:** authenticated app orchestration and real backend behaviour were not browser-tested. `E2E_TEST_EMAIL` and `E2E_TEST_PASSWORD` were absent. The existing “isolated” tests write sentinel rows to a backend; the portal E2E also provisions identities and events. Neither suite was run. There was no production data access or backend mutation. The harness does not mount `App`, validate authentication, or prove RLS, passkeys, recovery, subscriptions or notification behaviour. It cannot establish iOS keyboard behaviour, VoiceOver/TalkBack support or WCAG conformance.

The harness uses the existing styles, but supplies its own HTML document with zoom enabled and a descriptive title. Therefore the production viewport restriction is a **source finding plus actual-app DOM check**, not a result from the harness axe scan. Fixed/sticky overlays in full-page screenshots are positioned for the original 900px viewport; the long image is not one large visible viewport.

## Read the audit

- [Application inventory](application-inventory.md): every application view, shared/page-specific components and duplicates.
- [Consistency audit](consistency-audit.md): systemic findings, cross-page comparison and standards.
- [Mobile-first audit](mobile-first-audit.md): measurements, coverage, task ergonomics and browser limitations.
- [Accessibility audit](accessibility-audit.md): WCAG 2.2 AA findings and manual follow-up.
- [Design system proposal](design-system-proposal.md): proposed visual and interaction contracts.
- [Implementation roadmap](implementation-roadmap.md): phased delivery and visual regression strategy.
- [Tooling report](tooling-report.md): installed skills, working MCP research, optional authentication and reproduction.

Start with these representative comparisons: [staff roster, 390px](screenshots/home-390.png), [marks, 320px](screenshots/weekly-320.png), [calendar, 390px](screenshots/calendar-390.png), [squad dashboard, 390px](screenshots/squad-390.png), [staff roster, 1440px](screenshots/home-1440.png).

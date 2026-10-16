# Proposed design system and direction

**Proposal only.** No tokens, styles, components, navigation or business logic in this document have been implemented. The direction responds to C01–C22, M01–M12 and A01–A15; approval of this strategy precedes implementation.

## Visual direction

A practical Boys’ Brigade management tool: recognisable navy section identity, a light neutral canvas, clearly separated white surfaces, readable names and scores, and calm controls. Preserve the existing BB, Company and Junior assets via `branding.ts`. Preserve Company `#222943` and Junior `#284e8b`; the problem is inconsistent application, not a need for a new logo or visual identity.

Remove decorative treatment that competes with task content: large gradient calendar/portal headers, many tiny dashboard metric decorations, repeated card nesting and mixed arbitrary radii. The squad dashboard's useful data structure can survive while its mint/ink palette and microtype converge with the staff/portal foundations. Use borders for ordinary grouping, shadows only for raised overlays and sticky surfaces where depth communicates function.

## Colour tokens

| Semantic role | Proposed value | Intended use |
| --- | --- | --- |
| `canvas` | `#f8fafc` | All role-specific application shells; removes staff/portal background mismatch. |
| `surface` / `surface-subtle` | `#ffffff` / `#f1f5f9` | Panels, fields, table emphasis and selected-neutral context. |
| `text` / `text-secondary` | `#0f172a` / `#475569` | Names/headings/body and supporting labels; neither changes with squad identity. |
| `text-muted` | `#64748b` | Small metadata only on surfaces with a verified 4.5:1 pair, not the old slate-200 background. |
| `border-subtle` | `#e2e8f0` | Decorative separators, not the sole boundary of a required input. |
| `border-control` | `#64748b` | Input/control boundary where needed for 3:1 non-text contrast against white. Refine apparent density during prototype review. |
| `brand-company` / `brand-junior` | `#222943` / `#284e8b` | Existing section identity. |
| `action-primary` / `on-action-primary` | Active section brand / `#ffffff` | Main button and selected navigation. Hover/pressed should use tested darkened variants rather than arbitrary brightness filters. |
| `success` / `success-subtle` | `#166534` / `#f0fdf4` | Present/saved status. White-on-success buttons replace insufficient white-on-green-600. |
| `danger` / `danger-subtle` | `#b91c1c` / `#fef2f2` | Destructive actions, failed saves and Absent where appropriate; always include a label. |
| `warning` / `warning-subtle` | `#92400e` / `#fffbeb` | Potential loss, historical editing, session/archive consequences. |
| `info` / `info-subtle` | `#1e40af` / `#eff6ff` | Neutral guidance and external-process status. |
| `focus` | `#284e8b` on light; white on brand | Common outline/ring, with offset from adjacent surface. |

These are proposed pairs, not a claim that any arbitrary combination passes. [Calculated pair checks](evidence/proposed-token-contrast.json) give white on Company 14.32:1, Junior 8.23:1, success 7.13:1 and danger 6.47:1; secondary text on canvas is 7.24:1. Validate hover/pressed/disabled/selected combinations as well. Do not use the pale border token as an accessible control boundary by itself.

Create a separate `squad.*` categorical palette from `services/sectionSquads.ts` for labelled dots, chart series and optional side accents. Keep numeric squad names/nicknames visible. Never reuse `success` or `danger` tokens to imply squad identity, and never distinguish squads solely by colour. Chart colours need distinguishable shapes/labels and meaningful contrast, rather than simply inheriting text colours.

Tailwind must scan the actual literal token/class locations. Its current content globs exclude `services/sectionSquads.ts`; some requested colour utilities therefore never reach generated CSS (C22). Prefer theme tokens consumed by shared components, or deliberately include static palette files in the content configuration. Do not rely on dynamic class construction.

## Typography

Use the existing system fallback stack as the dependable base. Futura may remain in brand assets and optional headings if availability/weight/licensing are resolved. The current local-only bold face cannot guarantee a consistent cross-device UI. Do not add a remote font dependency just for this audit.

| Role | Mobile size / line height | Desktop enhancement | Weight / use |
| --- | --- | --- | --- |
| Page title | 24 / 32px | 32 / 40px from lg | 700; one h1 per view. |
| Section title | 20 / 28px | Same | 600; h2, consistent across cards and open sections. |
| Subsection | 16 / 24px | Same | 600; h3 when hierarchy needs it. |
| Body / field value | 16 / 24px | Same | 400/500; retain 16px input text on mobile to avoid unwanted device zoom. |
| Label / secondary | 14 / 20px | Same | Label 500, secondary 400. |
| Metadata | 12 / 16px | Same | 400/500; dates, supplementary counts. No 6–10px primary UI. |
| Metric | 28 / 36px | 32 / 40px where useful | 700; tabular numerals for comparisons. |

Use semantic HTML to choose hierarchy and role tokens to choose visual treatment. A squad heading should not become more prominent than Members just because both currently use text-2xl. Standardise date and number formatting; score semantics and London event time remain unchanged. Remove undefined `text-md` and pseudo-form utilities that have no installed plugin, replacing each with an intentional role.

## Spacing, shape and elevation

Use Tailwind's existing 4px scale: 4, 8, 12, 16, 24, 32, 48px. Use 1px borders and 2–3px focus strokes as functional exceptions. Encode page gutter, field gap, row padding, section gap and card padding as named roles so a future adjustment affects every page family.

| Contract | Proposed default |
| --- | --- |
| Page gutters | 16px base, 24px sm, 32px lg. Align nav and content inner edges. |
| Page top/bottom space | 24px mobile, 32px desktop; reserve additional safe area/action space as needed. |
| Major section gap | 24px; 32px only for distinct page chapters. |
| Field row gap | 16px; label/help/error adjacency 4/8px. |
| Surface padding | 16px mobile, 24px desktop; avoid a second card wrapper around ordinary sections. |
| Control radius | 8px; small status badge 4px; major surface 12px; pill only for an actual status or count. |
| Elevation | Flat bordered normal surfaces; subtle sticky layer; one overlay/menu shadow. No shadow-md on every nested region. |
| Motion | 120–180ms opacity/colour where it helps; no routine translate/scale. Disable nonessential motion for reduced preference. |

## Components and dimensions

| Shared contract | Required variants and behaviour | Existing starting point |
| --- | --- | --- |
| Button / IconButton | Primary, secondary, quiet, danger; 44px target/height on mobile; icon 20px in a 44px target; label always for primary actions; disabled/busy/focus states; no duplicate submit | Existing button markup and `Icons.tsx`, consolidated rather than installed wholesale from a registry. |
| Input / Select / Field | 44px high, full width at base, 16px value; label/help/error association; valid input type/inputmode/name/autocomplete; first-error focus on submit | BoyForm/account association patterns; DatePicker native input. |
| Checkbox / RadioGroup | Native semantics and large shared label hit area; use fieldset/legend for groups | BoyForm and import controls, correcting nested label structure. |
| AttendanceField | Explicit Not recorded/Present/Absent state for weekly; existing-row two-state option; visible state in accessible name; no ambiguous pressed inversion | Weekly and BoyMarks semantics with shared presentation. |
| ScoreField / MarksRow | Company 0–10; Junior Uniform 0–10 and Behaviour 0–5; preserve allowed decimals and absent semantics; member/date-qualified labels; 44px fields | Weekly save-plan and existing validations; avoid changes to stored `-1` absence/clear rules. |
| Surface / Section / Metric | Flat/bordered/raised variants, title/action slots, shared numeric treatment | EventCard, PasskeysCard, staff cards and squad Stat. |
| Modal / Confirmation | Accessible name, focus enter/trap/return, Escape, busy close policy, inert background, scroll containment; mobile sheet/full-width form as appropriate | Existing Modal. Keep typed archive acknowledgement and scope warning. |
| Toolbar / FilterSheet | Persistent context and active filter summary, clear reset, stable focus; controls wrap intentionally | Home filter/search and Weekly date controls. |
| SaveBar | Pending state/count, explicit Save, busy/error/success, last-control clearance and bottom safe area | Weekly safe-area implementation; reuse in BoyMarks. |
| EmptyState / ErrorState / LoadingState | Page and compact-section variants; purposeful next action; errors persist and have retry where meaningful | Existing skeletons, roster empty actions and portal retry. |
| StatusMessage / Toast | Polite routine status, assertive critical errors only; persistent form errors; one live-region owner | `useToastNotifications` and Toast. |
| DataTable / MobileSummary | Semantic row/column headers, named keyboard scroller when needed, priority columns, no paired wide sticky edges on phone | Dashboard tables and squad roster; share rules, not necessarily one universal table component. |
| Back / NavigationItem | Destination language matches page title, selected state, real addresses when navigation is URL-enabled, focus restoration | Header and contextual Back controls. |

No library migration is required to establish these contracts. The shadcn research confirms useful dialog/alert-dialog/field/button pattern families, but its current default registry targets newer Tailwind conventions and adds primitives. Use it as reference for behaviour; evaluate dependency cost separately after audit approval.

## Page layouts and navigation

Use a shared `PageContainer`, `PageHeader` and optional contextual back/action/toolbar slots. Preserve these workflow-specific templates:

- **Collection:** Members and Past sessions. Title/action, search/filter context, grouped list, actionable empty state. Archive detail retains its report/import context.
- **Task/editor:** Weekly Marks. Date/context first, attendance and score controls, pending save/status. Mobile is deliberately one or two rows per member.
- **Detail:** Member marks. Back, member identity/squad, compact totals, date history and pending save. Preserve the selected roster position when returning.
- **Form/settings:** Section/Account settings. Narrow readable width, clear section headings and per-section persistence model. Password recovery uses the same field language in an auth frame.
- **Report:** Staff Dashboard and leader squad report. Summary, date/range, useful comparisons, accessible detail and export. Prioritise current task values on mobile over decorative statistics.
- **Calendar:** Shared month/agenda and EventCard; staff editor actions vs boy subscription actions remain distinct. Dates stay Europe/London-aware.
- **Auth/onboarding:** Login, setup and enrollment use the same framing/spacing, with clear step explanation and safe recovery. Do not collapse their security rules into one generic form.

Trial mobile staff navigation with **Members, Marks, Calendar, More** for Company; Junior uses Members, Marks and More. More contains Dashboard, Past sessions, account and allowed administration. Captains/admins see Section settings; officers do not gain new permissions. Calendar/portal access stay Company-only. Use labels and selected state, reserve bottom space and safe area, and test whether a labelled top-level alternative is preferable before finalising bottom navigation.

Portal navigation can remain smaller: Home, Calendar and Account, with a leader-only Squad entry. Reuse tokens/navigation-item behaviour and brand/section framing, not the full staff menu. Never expose teammate mark data to ordinary boys as part of visual consolidation.

Make staff and portal views addressable with a small navigation adapter before changing nav elements. Shareable non-secret view/filter state can go in URLs; setup codes must still be consumed and removed, and personal/credential data must not be persisted by the navigation system. Preserve both app-level and date-change unsaved guards. A dependency decision on routing should follow a tested state/role contract, not precede it.

## Responsive, form, table and interaction rules

Base layouts target 320px; enhance at Tailwind sm/md/lg/xl only when content fits. Use shared breakpoints and bounded grid children; document genuine content-driven exceptions. Keep form input values readable and full-width on phones. Make multi-column date/time forms stack when native control widths need it. Give complex forms a scrollable dialog body and stable action area, then verify with device keyboards.

For monthly breakdown and leader details, surface the useful mobile summary first and disclose history. Tables remain appropriate for comparison on wider screens; an explicit table view on mobile must have keyboard access, scroll cues, meaningful headers and limited sticky columns. Do not shrink to microtype to preserve every column.

Confirm operations according to risk: immediate reversible local changes have Undo; data-saving operations show pending/saving/saved or persistent retryable errors; member removal has explicit object-specific confirmation; starting a new session preserves typed confirmation and the fact that it affects both sections. Autosave fields must say that they save automatically and show status, or use explicit Save consistently after workflow review.

Use existing inline SVG icons with standard 20/24px sizes and consistent stroke treatment. Hide decorative icons from assistive technology; meaningful icon-only actions have object-specific names and visible focus. Short, purposeful transitions must not shift layout. Routine success uses polite announcements; failures remain visible until resolved.

## Maintainable implementation architecture

Proposed file structure (not created):

```text
index.css                         semantic CSS properties and global accessibility defaults
tailwind.config.js                map utilities to tokens; scan actual token/class locations
components/ui/                    Button, Field, native controls, Modal, Surface, states
components/layout/                PageContainer, PageHeader, role-aware navigation
components/marks/                 AttendanceField, ScoreField, MarksRow, SaveBar
components/data/                  reporting/table/metric presentation contracts
services/sectionSquads.ts          squad data/identity helpers remain authoritative
hooks/                            existing data/auth/unsaved boundaries retained
```

Avoid an all-purpose component with dozens of boolean flags. Use small composable primitives and page templates with named slots. Retain domain logic in existing services/helpers, and allow explicit exceptions for PDF output and calendar geometry. Document variants and responsive/keyboard states alongside each primitive. Migrate one page slice at a time rather than mass-editing class strings without visual comparison.

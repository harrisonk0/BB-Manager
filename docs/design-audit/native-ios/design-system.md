# Assembly design and interaction system

A single system serves staff, ordinary boys and squad leaders. Role affects the destinations, available actions and data density; it does not select an unrelated stylesheet. Prototype code is deliberately separate so it can be reviewed without changing application behaviour.

## Foundations

| Role | Specification |
| --- | --- |
| Canvas / surface | `#F2F2F7` / `#FFFFFF`; opaque grouped content |
| Ink / secondary | `#171A23` / `#626777`, verified on actual surfaces |
| Action / brand | BB blue `#224B8E`, navy `#2D395A`, Junior `#145091`; supplied section artwork plus text |
| Success / danger | Dark readable green/red on pale labelled selection, never identity colours |
| Typography | `-apple-system, BlinkMacSystemFont, Inter, 'Segoe UI', sans-serif`; system first; 400/500/550/600/650/750 roles |
| Hierarchy | Phone title 34px (30px at 320), wider title 36px; section 17–21px; ordinary content 15–16px; metadata 12–15px. Score 18px; major metric 46px. No 6–11px report text. |
| Numerals | Tabular marks, counts, totals, date columns and percentages |
| Geometry | Phone content inset 16px; groups around 20px radius, controls 10–14px, native-like floating navigation 28px. Radius follows function rather than making everything a pill. |
| Targets | ≥44×44px for enabled controls, with ordinary 46–48px fields/buttons and 58–77px list rows. Icon glyphs are 18–24px inside targets. |
| Depth | Fine inset rules for content. Subtle shadow only for navigation, floating feedback and dialog separation. No nested card borders. |
| Focus | Shared visible 3px BB-blue outline; native input editing; no removal without an equivalent. Skip link and page-title focus on navigation. |

The role palette is a prototype foundation. Production will need a contrast-paired semantic token module with section identity distinct from attendance status. Do not encode a configured squad palette in dynamically constructed Tailwind utilities: audit C22 remains a mandatory generated-CSS check.

## Shared inventory

| Prototype primitive | Variants / behaviour | Reuse across roles |
| --- | --- | --- |
| `PageTitle` | Large heading, optional subtitle and one contextual action | Members, marks, personal portal, leader report, settings |
| `Button`, `IconButton` | Primary, secondary, quiet, destructive; busy/disabled/pressed/focus; named glyph controls | Save marks, filter apply, member editor, report controls, account sheets |
| `Segmented` | Small related choice set, explicit `aria-pressed`, stable button focus | Roster mode, squad filter, report selection |
| `Avatar` / grouped row | Synthetic initials, neutral names, optional leader marker, inset rule | Staff roster and leader report; own profile in portal |
| `Sheet` | Named native modal dialog; fitted/full-height phone, centred larger screen; scroll containment, inert background, Escape/close and focus restoration | Filter, date picker, member editor/detail, confirmations, settings |
| `SettingRow`, `Switch` | Icon/label/value/chevron, or separately named switch; complete target | Staff section administration, boy account and leader account |
| `EmptyState` | Task-specific heading, explanation and action | No matching members; future empty report/agenda families |
| Attendance and score family | Three explicitly labelled states; Company score or Junior Uniform/Behaviour; linked errors, disabled/busy state | Weekly task; same production family for dated history correction |
| Save accessory / status | Pending count, busy, saved, persistent error and retry; reserved bottom space | Weekly marks now; member history and explicit-save settings during migration |
| Report primitives | Compact branded totals, native semantic table, selectable chart, recorded-night disclosure | Staff squad overview, own-squad leader report; personal summary uses the same metric language |
| Navigation | Named links, selected state, real URL and history, tab-local state, wider sidebar | Shared shell with a role-aware destination configuration |

Code locations: `src/theme.css` owns visual foundations; `ui.tsx` owns primitives; `icons.tsx` supplies a consistent SVG family; feature files compose them. `data.ts` contains invented records and local validation, not a replacement for production domain services. `App.tsx` coordinates the isolated state, history and overlays. Migration should extract reviewed primitives into the existing application and adapt current domain hooks, rather than copy the prototype’s fake service logic.

## Screen and information architecture

**Members:** persistent search → mode selection → grouped roster. Full-width rows lead to profile/history. Edit/remove move into the contextual detail instead of repeating a toolbar for every boy. An explicit no-results action clears search and filters. Long names wrap rather than disappear. Larger screens can compare squads side by side without stretching rows across the entire display.

**Weekly Marks:** selected meeting and progress → squad scope → member identity/score → large attendance strip. Company uses one score (0–10). Junior uses labelled Uniform (0–10) and Behaviour (0–5) on a separate row. Up to two decimal places; present blank saves as zero; absent and unrecorded remain different. Clear only edits the local pending snapshot until Save. Past meetings need Unlock. The save accessory stays within thumb reach and leaves room for the tab bar; errors retain the draft.

**Leader:** compact useful summary → dated own-squad roster on phones → trends/Company aggregates. Names, score, total and attendance remain readable. Selecting a chart/date updates the report rather than opening another disconnected dashboard. All recorded dates remain available; an intentionally scrollable all-weeks chart is named/focusable. Wider screens can put chart/standings beside each other above the table. Other squads expose aggregate totals only; ordinary boys have no teammate report.

**Settings:** native grouped account/section/preferences rows. Shared switches, sheets and button variants match the rest of the app. Complex and destructive production flows retain their existing permissions and confirmation strength. The prototype explains passkey/push boundaries rather than calling real APIs.

**Agenda and portal:** agenda-first calendar and personal progress reuse title, grouped row, metric, sheet and action families. They are supporting illustrations of consistency, not a completed production migration.

## Interaction contract

- Primary navigation is links and browser history. Changing a tab retains its local state and draft. Date/section changes that would replace a draft require an explicit discard decision. Same-section selection closes the picker without resetting edits. Reload protection is registered for dirty marks.
- Sheets focus their heading on opening so a phone keyboard does not appear before a deliberate input tap. In-dialog changes do not refocus Close. Dialog background is isolated by `showModal()`; body scrolling is locked and the sheet body scrolls. All triggers/close buttons remain keyboard operable.
- Scores use decimal keyboard hints and visible member-specific labels, with `aria-invalid` and associated error text. There is no optimistic “saved” claim before the simulated operation succeeds. In production, retain the existing snapshot/patch behaviour and in-flight edit policy.
- Routine success is a polite, dismissible message plus a persistent Saved state. A save error is persistent with retry. Errors never become empty roster/events messages.
- Press/selection transitions: approximately 140–180ms. Page arrival: 180ms, 5px maximum movement. Sheet entry: 260ms, 24px maximum; dismissal is immediate in this prototype. No exit delay blocks work. Switch movement: 180ms. Do not animate number counting or run idle loops.
- OS reduced-motion and the in-app option remove movement/animation. Solid navigation removes blur; increased contrast removes translucency and strengthens key borders. Unsupported backdrop filters get an opaque-enough navigation surface. No swipe-to-dismiss or haptics dependency.
- Safe-area padding protects top and bottom navigation. `VisualViewport` provides a keyboard enhancement; it is not a substitute for physical iPhone testing. Browser scrolling and browser Back remain owned by the platform.

## Implementation quality boundaries

No new runtime dependency, Tailwind preset or chart package. Existing React/Vite tools build the prototype separately. Lists are derived with straightforward filtering/memoisation; 18 synthetic records do not justify virtualization. Larger fixtures and field-input profiling remain production migration gates. Preserve lazy PDF work and fix the existing conditional hook risk before production report migration.

High-fidelity does not mean every setting is a live integration. Missing dark theme, real authentication, durable drafts, imports, PDF, rollover and portal admin are explicitly scoped to the roadmap. Keep all production functionality during migration; never delete an essential action to make the screenshot simpler.

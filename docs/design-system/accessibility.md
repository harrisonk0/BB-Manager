# Accessibility and mobile interaction contract

BB-Manager targets WCAG 2.2 AA. The product additionally targets comfortable 44px touch controls and readable phone-first data entry. Native iOS fidelity does not override browser semantics, magnification, keyboard access or server-enforced permissions.

This page records the implemented shared contracts and the acceptance requirements for the production migration. It does **not** certify conformance. The [49-ID audit register](audit-acceptance.md) is authoritative for unresolved original findings; the review register records per-slice evidence.

## Implementation and evidence locations

| Contract | Implemented source | Verification entry |
| --- | --- | --- |
| Native disabled buttons, Toggle state/keyboard access, connected fields | `components/ui/NativeControls.tsx` | `tests/frontend/adapters.e2e.ts` |
| Named modal surfaces, portal isolation, dynamic focus containment, busy dismissal and return focus | `components/ui/TaskSheet.tsx`; legacy call signature delegates in `components/Modal.tsx` | Adapter lifecycle and actual workflow tests |
| Active main/skip links, page entry identity and contextual routing | `components/shell/StaffShell.tsx`, `components/shell/PortalShell.tsx` | Actual application/history/security browser tests |
| Focus, safe areas, semantic contrast and motion | `styles/design-system.css`, `styles/application-states.css` | Rendered visual/axe matrix and manual device checklist |
| Attendance, linked numeric errors and persistent real save feedback | `components/WeeklyMarksPage.tsx`, `components/BoyMarksPage.tsx` | Service-payload, retry, history and Junior browser tests |
| Cross-family synthetic visual regressions | `tests/frontend/visual.e2e.ts` and its reviewed Chromium snapshots | Seven widths, first/lower scroll positions, axe, viewport and control-clipping assertions |

The matrix uses the actual application with test-only HTTP fixtures; it never imports the synthetic design prototype into production. Browser fixture tests verify the client interface and service requests, not live backend RLS or physical-device behaviour.

## Semantics and navigation

Use real buttons for actions, links for addresses, labels for inputs and table headers for genuine comparisons. Do not assign menu roles to ordinary navigation without implementing the complete menu keyboard pattern. Icon-only actions need meaningful accessible names; decorative icons must be hidden from assistive technology. A tooltip or `title` alone is insufficient for essential instructions.

Every page has a meaningful primary heading and document title. The visible skip link on keyboard focus targets the **active** main content, including after tab/route changes. Retained inactive Framework7 views must not remain keyboard or accessibility-tree destinations. A route transition identifies the new page and moves focus deliberately to its heading/main region; do not steal focus on field updates, filter changes, data refreshes or background saves. Detail Back restores useful context and scroll position.

Tabs/disclosures expose selected/current/expanded state according to their actual interaction. Touch activation through Framework7 native lifecycle must update the same application state used for selected navigation, page identity and save visibility. Browser Back/Forward and deep links need the same dirty-state and role boundaries as button navigation.

## Type, colour and reflow

Use the approved system-first font and shared type roles. Ordinary shared body/input text is typically 17px, with at least 16px text entry; supporting content is typically 15px, with exceptional compact metadata at least 13px. Do not reduce font sizes to fit wide reports or long names. Use tabular numerals for marks and statistics without stripping textual context.

Normal text requires 4.5:1 contrast; qualifying large text 3:1; required non-text boundaries, selected states and focus indicators 3:1 against adjacent colours. Check composited glass over representative moving content and the solid fallback, not only nominal token hex values. Attendance/status is always conveyed through text or meaningful symbols as well as colour. Disabled controls still need comprehensible affordances; decorative disabled contrast is not interchangeable with normal-text requirements.

Permit user scaling in viewport metadata. Validate text enlargement to 200%, reflow at 320 CSS px/equivalent 400% desktop zoom, long names, short landscape heights, and all loading/error/empty states. Do not conceal overflow using document-level clipping. Where two-dimensional comparisons justify horizontal scrolling, provide a labelled focusable region, visible scroll affordance, column/row headers and a readable mobile summary. Test the first and last columns and lower page content.

## Shared controls

Controls must preserve native name/role/value, label relationships, autocomplete, input mode, minimum/maximum/step and native disabled state. Framework7 adapters must account for React 19 integration behaviour:

- A styled disabled Framework7 button is insufficient: the rendered button must be natively disabled and unavailable to keyboard activation; links require a deliberate disabled contract.
- Framework7 Toggle must keep the native checkbox keyboard-focusable, synchronise actual checked state with React/domain state and visibly outline the whole control on keyboard focus.
- Accessible field names identify the member and meeting/date where repeated scores would otherwise be ambiguous.
- Attendance names include the **visible current label**, such as “Present, Alex Morgan, change attendance”; expose all three weekly states without confusing zero, absence and unrecorded values.

Aim for 44×44px hit areas for frequent actions and 44px-high inputs. WCAG 2.5.8 AA is 24×24px with spacing/exceptions; report the distinction accurately. A large outer container does not prove a working hit area: tap near its edges and inspect the receiving element. Native select/date/number controls should remain available when they provide the most reliable accessible interaction.

## Forms, validation and saving

Every input has a visible label or intentional labelled compact equivalent. Link help/errors with unique IDs and `aria-describedby`; set `aria-invalid` only on invalid fields. Persistent summary explains failed submission and focuses the first invalid enabled input. Test field-specific errors: a Junior Behaviour failure must not redirect focus to valid Uniform. Respect the existing validation/domain rules instead of rewriting them to suit a component.

Saving disables only conflicting actions, exposes busy state and announces a single concise progress/result. Routine saved status is polite; an urgent actionable failure may use alert semantics. Avoid nested assertive regions. Never replace a failed load with an empty state. Errors and retry actions remain visible beyond a transient toast and preserve entered values. Real backend persistence determines success; animation timers cannot simulate production success.

Save accessories reserve content and scroll-padding clearance, including bottom safe area. Focused fields, last list rows and Save remain visible above tabs and feedback. Test with software keyboard on a physical phone; desktop viewport shrinking is only a partial approximation. Navigation/date/section changes retain existing unsaved protection; users can cancel without losing draft or context.

## Sheets and destructive actions

Every open modal surface has `role="dialog"` or justified `alertdialog`, `aria-modal="true"`, and a unique accessible name linked to its visible title. Use short descriptions only when helpful; do not flatten long structured forms into one announcement. Closed sheets must be hidden from both keyboard navigation and accessibility tree.

Focus is assigned once on real opening. Do not restart the focus effect when a caller creates a new close callback, a filter changes or a form re-renders. Trap Tab/Shift+Tab using **current visible enabled focusables** each key press, including asynchronously loaded actions and excluding disabled/hidden controls. If there are none, keep focus on the labelled dialog container. Isolate background with `inert` and contain scrolling for the actual open/close lifecycle. Provide button and Escape dismissal in addition to gestures, subject to busy/dirty safeguards. Dragging is never the only way to expand, close or select.

Restore focus after closing to the actual activating control, including Safari taps that do not focus buttons. If the origin was deleted, detached, disabled or hidden, focus an appropriate surviving control/main heading. Nested replacement confirmations must preserve the original return destination and focus the new title. Do not force focus back from a user who has already begun interacting during an opening animation.

Confirmations preserve existing risk protections. Session/year reset retains typed confirmation, report acknowledgement and explicit both-section scope; member/portal deletion/reset/revoke clearly identifies target and consequences. Visually simple sheets cannot weaken these contracts.

## Charts, reports and exports

Charts expose the information needed to understand them through text/table alternatives, named metrics, units, date ranges and legends. Decorative bars can be hidden only if equivalent data is available. Interactive bars/date cells include the visible text within their accessible names. Test keyboard interaction independently of hover and touch. Leader reporting must remain readable and limited to server-authorised data.

Export progress is announced and visible during lazy PDF loading. A named PDF download dialog does not prove the exported document is accessible. PDF reading order, tagging, page breaks, long names, colour/print contrast and links need separate review; record any unverified output requirement.

## Motion and preferences

Respect `prefers-reduced-motion` across Framework7 navigation, sheets, skeletons, charts and toasts. Remove unnecessary movement and continuous loading animation while retaining clear state feedback. Never delay attendance/score entry for decorative motion. Test forced colours/high contrast and native control visibility. Blur is confined to navigation/overlays with a readable solid fallback; data-entry surfaces remain crisp.

## Required evidence

For every page family, independently review actual integrated rendered screens at 320, 375, 390, 430, 768, 1024 and 1440px, plus short-height/zoom states where relevant. Use invented fixtures with long names, empty data, errors, pending/failed saves, NCOs, multiple squads and appropriate roles. Never put real member information into screenshots or documentation.

Automated checks include axe WCAG A/AA tags, document and control overflow, enabled touch-target measurements, named-dialog checks, invalid-field associations, keyboard focus loops, reduced motion and Back/Forward/dirty-state flows. Class-name assertions are insufficient evidence. Capture before/fix/after evidence for reproduced defects. Review cross-family captures together against approved Variant A.

Keyboard pass: signed-out navigation, page tabs/More, search/filter, member editor, marks/date change, history correction, report download, destructive confirmation and sign-out. Verify Tab/Shift+Tab, Space/Enter, Escape, disabled/busy transitions, async controls and focus restoration. Inspect outline and unobscured focus visually.

Independent review means a different agent/person from the implementer; testing claims identify who actually ran the interaction. If subagents are unavailable later, record separated review passes honestly rather than asserting independence.

## Physical-device and assistive-technology acceptance

Pending until explicitly recorded with device/OS/version:

- iPhone Safari and installed Home Screen: safe areas, browser-bar expansion, launch/resume, portrait/landscape, pinch/text zoom, software keyboard, date/decimal inputs and last-field Save clearance.
- VoiceOver/iOS: landmarks, headings, tab identity, named sheets, checkbox state, member/date field associations, error announcements, chart alternatives and focus restoration.
- TalkBack/Android and desktop keyboard/screen reader: equivalent navigation and data-entry access, no modal background leakage.
- Hardware/assistive keyboard: focus order/visibility, no traps outside deliberate modal containment.
- Supported real-device passkey enrolment/recovery; permissions verified through safe authorised fixtures/staging, never navigation hiding alone.

Playwright WebKit is useful for engine compatibility. It is not physical iPhone Safari, the software keyboard, VoiceOver or proof of PWA launch/resume quality. Automated axe success is not WCAG certification. Missing staging access and manual-device checks remain explicitly unverified release considerations.

## Synthetic rendered examples

These code-backed Chromium reference images are generated by the visual suite and require review before updates. Their names are invented; they are not evidence of live authorisation.

| Example | Phone | Tablet |
| --- | --- | --- |
| Members | [390px](../../tests/frontend/visual.e2e.ts-snapshots/members-390-chromium-linux.png) | [768px](../../tests/frontend/visual.e2e.ts-snapshots/members-768-chromium-linux.png) |
| Junior history | [390px](../../tests/frontend/visual.e2e.ts-snapshots/junior-history-390-chromium-linux.png) | [768px](../../tests/frontend/visual.e2e.ts-snapshots/junior-history-768-chromium-linux.png) |
| Squad leader | [390px](../../tests/frontend/visual.e2e.ts-snapshots/leader-390-chromium-linux.png) | [768px](../../tests/frontend/visual.e2e.ts-snapshots/leader-768-chromium-linux.png) |
| Member editor | [390px](../../tests/frontend/visual.e2e.ts-snapshots/sheet-editor-390-chromium-linux.png) | [768px](../../tests/frontend/visual.e2e.ts-snapshots/sheet-editor-768-chromium-linux.png) |
| Filter sheet | [390px](../../tests/frontend/visual.e2e.ts-snapshots/sheet-filter-390-chromium-linux.png) | [768px](../../tests/frontend/visual.e2e.ts-snapshots/sheet-filter-768-chromium-linux.png) |

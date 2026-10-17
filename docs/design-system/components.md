# Shared component catalogue

Import production primitives from `components/ui`. All components consume `styles/design-system.css`; do not import a competing visual framework. `PageSurface` and `NativeAppProvider` own Framework7 integration; ordinary features consume content primitives. Routing, permissions and mutation state remain caller responsibilities.

## App and pages

| Component           | Contract and appropriate use                                                                                                                                      | Accessibility / responsive behaviour                                                                                                                      |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NativeAppProvider` | `{children}`; exactly one at the browser entry. Registers Framework7 React/modules/CSS.                                                                           | iOS theme; no authority decisions. Do not remount the full provider during routine navigation. Protected views must be cleared/remounted on auth changes. |
| `PageSurface`       | `{title, subtitle?, actions?, children, className?}`; a **router page**, directly inside a View. Actual F7 Page and large Navbar. Never nest inside another Page. | Text h1; page lifecycle inerts outgoing pages. Native title collapse; content gutters/clearance adapt at 768px.                                           |
| `PageBody`          | `{children,className?}`; content inside a shell-owned Page.                                                                                                       | Single constrained content width and mobile gutters. Does not add a landmark or duplicate headings.                                                       |

```tsx
<PageSurface
  title="Members"
  actions={
    <NativeButton variant="plain" onClick={add}>
      Add
    </NativeButton>
  }
>
  <GroupedList title="Squad 1">
    <SettingsRow title="Synthetic Member" onClick={openMember} />
  </GroupedList>
</PageSurface>
```

## Actions and controls

`NativeButton` extends native button attributes and adds `variant="primary" | "secondary" | "plain"`, `danger`, and `busy`. Default type is `button`; explicitly choose `submit` for forms. `disabled || busy` writes the **native disabled attribute**, because Framework7's disabled prop alone adds only a visual class. The adapter forwards form/name/value/title/id onto the real element. Loading adds a decorative spinner plus `aria-busy`; supply meaningful text such as “Saving…” rather than an unlabeled spinner. Icon-only children require `aria-label`. Caller owns success/failure and must not treat click as persisted success.

`NativeSwitch({label,checked,onChange,disabled?})` is an actual Framework7 Toggle. It uses `defaultChecked`, the real native change event and instance synchronization to avoid React 19 controlled-checkbox reset. The opacity-zero native checkbox remains focusable and has a 44px touch area. A label focus ring surrounds the visible track. Use for immediate binary preferences; three-state attendance must use its domain control instead.

`NativeSegmented({label,value,options,onChange})` uses real F7 Segmented/Button. Each option has `aria-pressed`, a visible label and at least 44px height. Use a small set of mutually exclusive views; do not squeeze many filters into one line.

`NativeSearch({label?,value,onChange,placeholder?})` uses F7 custom-search mode: the parent owns actual filtering. It writes the accessible label to the real search input, disables unused F7 backdrop/cancel behaviour and preserves a 48px target. Use a specific name (“Search members”), not a placeholder-only label.

## Lists

`GroupedList({title?,footer?,children,className?})` renders a named section and actual F7 List with an explicit `<ul>`. Children must be `SettingsRow`/list items (`<li>`), not arbitrary header divs. Explanatory content goes in `footer` or outside the list. Groups are opaque with fine inset dividers; do not nest cards inside each row.

`SettingsRow({title,detail?,icon?,trailing?,onClick?,destructive?,className?})` uses Framework7 list geometry with an actual native button for disclosure actions and a static row otherwise. Feature disclosure actions are not navigation URLs, so they must not create `href="#"` anchors that Framework7 can intercept. Lucide ChevronRight is decorative and requires no icon font; features own the action. Icon is decorative, title supplies the name, detail supplies secondary text. Use `trailing={<NativeSwitch .../>}` **without** an additional row click handler to avoid nested interactive activation. Long titles wrap; supporting text stays readable. Destructive rows also need explicit text, not red alone.

## Forms

`NativeInput` extends native input props with required `label` and optional `error,hint`. It generates a stable input ID, links its label and description, sets `aria-invalid` for errors, and announces error text. The input is native HTML so browser type/inputMode/autocomplete semantics remain intact. Parents own validation, precision and service persistence. Use explicit decimal input modes/domain limits for marks; do not round or coerce business values in the primitive.

`NativeField({label,error?,hint?,children,htmlFor?})` composes non-input controls (select/textarea). For a single React control child, the adapter generates or preserves its ID and associates `aria-describedby` and `aria-invalid` automatically. Supply `htmlFor` to keep a specific established ID. Complex composite children must provide their own label/description contract. Prefer `NativeInput` for ordinary text/numeric fields. Do not use field wrappers as a substitute for an accessible group legend.

```tsx
<NativeInput
  label="Uniform"
  type="number"
  inputMode="decimal"
  value={uniform}
  step="0.5"
  min="0"
  max="10"
  error={validationError}
  onChange={(event) => setUniform(event.target.value)}
/>
```

Limits in this example are illustrative; authoritative Company/Junior domain validation determines real field props.

## Modal tasks

`TaskSheet({open,onClose,title,children,actions?,dismissible?,size?,className?})` is a controlled actual F7 Sheet. Sizes `sm|md|lg|full` adapt phone bottom sheet to centered tablet panels. It names the dialog from the stable heading, focuses the heading after entry, computes enabled/visible focusables on every Tab, wraps in both directions, and restores the initiating control or a main-content fallback after dismissal. It captures tap origins because Safari does not always focus a tapped button. Only the grab handle owns drag dismissal; ordinary scrolling is preserved. Escape and backdrop dismissal use stable adapter listeners that read the current dismissal policy. Framework7 installs those particular listeners conditionally during opening, so changing their props alone is unsafe; native drag parameters are synchronized in a layout effect and on opening.

The shell **must mark background roots with `data-bb-app-surface`**. TaskSheet uses a React portal to the document body, outside every Framework7 View, and isolates full Views as well as marked roots. Its portal inherits the active `data-section` identity. Portal ownership remains React-owned and is removed with the originating component/auth boundary; it is not a persistent member-data cache. Those backgrounds remain inert through the closing animation. Prefer one active task. During a handoff, exit and entry animations may overlap: the adapter uses per-element inert leases and an active-dialog stack, so the outgoing sheet cannot reactivate the protected View or steal focus from its successor. The last lease restores each element’s original inert state. Do not create arbitrary nested modal stacks. Callers must gate closing when dirty or busy; `dismissible=false` disables Escape, backdrop, drag and Close while a mutation is in flight. Close never silently saves or discards domain state. Complex editor forms use an explicit submit action in the header; failure remains visible inside the task.

```tsx
<TaskSheet
  open={editorOpen}
  title="Edit member"
  onClose={requestClose}
  size="lg"
  dismissible={!saving}
  actions={
    <NativeButton type="submit" form="member-editor" busy={saving}>
      Save
    </NativeButton>
  }
>
  <form id="member-editor" onSubmit={saveMember}>
    …
  </form>
</TaskSheet>
```

## Feedback and save patterns

- `InlineNotice({kind='info'|'error'|'success',title?,children})`: inline real state; error uses alert, other notices status. Avoid announcing large static sections repeatedly.
- `EmptyState({title,children?,action?})`: meaningful absence plus optional useful action. Never use it to hide permission errors or loading.
- `LoadingState({label?})`: status text and decorative spinner. Reduced motion preserves the text. Never remove the entire shell while saving a field.
- `SaveAccessory({dirty,saving,error?,onSave,label?})`: safe-area-aware floating real-save control, disabled while clean/saving; a failure changes action to Retry. Its caller must pass **real mutation state** and preserve drafts through retry. It reserves navigation clearance and uses tabular numbers only in domain content, not hardcoded score semantics.

The feature migration review register identifies actual consumers and rendered acceptance evidence. A component's existence or typecheck is not proof that every feature has adopted it or that physical-device accessibility is verified.

### Framework7 9.2 sheet lifetime compatibility

Framework7 is pinned to 9.2.0. Its `components/sheet/sheet-class.js` registers swipe cleanup on `sheetDestroy` (lines 560–568), while the inherited `components/modal/modal-class.js` `destroy()` emits `beforeDestroy`, `modalBeforeDestroy` and `sheetBeforeDestroy`, then deletes instance properties. It does not emit `sheetDestroy`. Without an adapter bridge, a destroyed swipe-enabled sheet retains its element touch-start and app-level touch-move/touch-end listeners, which later read deleted `params`; React StrictMode replay makes the defect reproducible immediately.

`TaskSheet` registers one `beforeDestroy` listener on each native instance, while that instance is valid, to emit the expected `sheetDestroy` event. This invokes Framework7's own cleanup for all three listeners. Registration is in a layout effect, includes an unmounted guard around deferred `f7ready`, and retains React StrictMode. This is a narrowly scoped compatibility bridge, not a swallowed runtime error or a change to domain behavior.

A lazy-loaded sheet can also mount already open before its React ref is attached. Therefore dialog role/name are rendered directly and parent layout initialization establishes inert background and initial heading focus, in addition to normal native lifecycle callbacks.

Remove the bridge only after upgrading to a Framework7 version whose source consistently emits its destruction cleanup event and independently passing repeated initial-open/mount/unmount/navigation/touch tests under StrictMode. Reverify dismissal policy changes and lazy PDF sheets during that upgrade. Do not remove StrictMode to mask lifecycle defects.

## Existing consumers and change examples

Use these production consumers as code-backed examples, alongside the synthetic adapter harness in `tests/frontend/adapter.tsx`. A consumer reference demonstrates integration, not acceptance of every state; consult the independent review register for verification status.

| Shared component              | Current production consumers / example                                                                                                                                                                                                                     |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NativeAppProvider`           | `index.tsx`, exactly one browser root                                                                                                                                                                                                                      |
| `PageSurface`                 | Exported router-page convenience; currently no production consumer. Actual protected pages are composed by `StaffShell` and `PortalShell` from the same F7 Page/Navbar and `PageBody` contracts. Do not add a second page around existing feature content. |
| `PageBody`                    | `components/shell/StaffShell.tsx`, `PortalShell.tsx`                                                                                                                                                                                                       |
| `NativeButton`                | `BoyForm.tsx`, `AccountSettingsPage.tsx`, `SettingsPage.tsx`; pending mutations supply `busy` and real service errors                                                                                                                                      |
| `NativeSwitch`                | `CompanyCalendarPage.tsx` event status; `ImportFromSessionModal.tsx` squad leadership. Never wrap it in another `<label>` because F7 Toggle already supplies one.                                                                                          |
| `NativeSegmented`             | `CompanyCalendar.tsx` month/agenda selection                                                                                                                                                                                                               |
| `NativeSearch`                | `HomePage.tsx` roster search                                                                                                                                                                                                                               |
| `GroupedList` / `SettingsRow` | `SettingsPage.tsx` account disclosure, `ArchivesPage.tsx` sessions, `PortalHomePage.tsx` account/statistics rows                                                                                                                                           |
| `NativeInput`                 | `BoyForm.tsx`, `LoginPage.tsx`, `SettingsPage.tsx`                                                                                                                                                                                                         |
| `NativeField`                 | `CompanyCalendarPage.tsx` event details; `ImportFromSessionModal.tsx` year/squad selects                                                                                                                                                                   |
| `TaskSheet`                   | `Modal.tsx` compatibility boundary; `StaffShell.tsx` workspace/actions                                                                                                                                                                                     |
| `InlineNotice`                | `PasskeyEnrollmentGate.tsx`, `PortalHomePage.tsx`, `ArchivesPage.tsx`                                                                                                                                                                                      |
| `EmptyState`                  | `DashboardPage.tsx`, `ArchivesPage.tsx`, `CompanyCalendar.tsx`                                                                                                                                                                                             |
| `LoadingState`                | `BoyMarksPage.tsx`, `PortalHomePage.tsx`, `ArchivesPage.tsx`                                                                                                                                                                                               |
| `SaveAccessory`               | `WeeklyMarksPage.tsx`, `BoyMarksPage.tsx`; drafts and retries remain feature-owned                                                                                                                                                                         |

### Browser-owned links and exports

Framework7's click handling owns application route links. A link that the browser must handle directly—PDF/blob download, calendar subscription or an external destination—must carry the `external` class as well as appropriate native `href`/`download` attributes. Programmatically created export anchors need the same explicit ownership. `SessionReportModal.tsx` supplies the real PDF example. Test the resulting downloaded artifact/event; a ready blob URL alone does not establish working export. Loading/error labels must reflect the renderer state, and domain data/document contents remain independent of the link adapter.

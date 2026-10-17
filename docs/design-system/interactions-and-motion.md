# Interactions and motion

Framework7 owns page/toolbar/sheet transitions. Shared semantic motion tokens live in `styles/design-system.css`; reduced-motion media queries suppress nonessential movement. Do not add a second animation framework or delay marks entry behind animation completion.

Controls must expose their actual disabled state, selected state and accessible name. Save uses real production requests: pending changes, saving, saved, failure with persistent draft and retry. Never simulate success in production. Unrecorded, absent and present are distinct domain states and must remain distinct in labels and payloads.

`TaskSheet` owns modal naming, handle-only drag, close/Escape, focus containment, background isolation, contained scrolling and focus restoration. A sheet is a task surface, not a decorative glass card. Do not make arbitrary form content start drag gestures. Prefer one active task; replacing a task must preserve the dismissal/dirty-state contract. Sensitive operations keep their existing confirmations and busy guards.

Dirty navigation protection covers tab/sidebar actions, detail back, date changes, browser Back/Forward, section switching, sign-out and unload. Router integration tests must verify cancellation as well as confirmation. The browser remains responsible for scrolling and edge gestures; no unsupported native gesture/haptic assumptions.

# ADR: Framework7 Native production presentation

Status: approved direction by product owner; implementation and release verification tracked separately in the review register. Functional baseline: `e060fce`. Approved visual reference: PR #54 Variant A.

Use Framework7 9.2 with matching React integration as the sole native navigation/component foundation. A single NativeAppProvider registers the lightweight framework plus required modules. Shared adapters own React19 Toggle synchronisation, native disabled attributes, label/error associations and modal lifecycle. Semantic CSS is loaded after framework CSS and existing Tailwind3 utilities. Production does not install Konsta, Vaul, Ionic or SVG-refraction libraries.

Existing hooks/services/domain models, Supabase contracts and PDF documents remain authoritative. Feature components are content inside a shell-owned Page. StaffShell and PortalShell are mutually exclusive protected workspaces, each owning one active Framework7 router; auth/role/section boundaries destroy their views. Router state feeds the existing dirty-change workflow rather than introducing a competing browser history stack. Current route details are documented in navigation.md.

A small router/context adapter keeps data props fresh in cached pages. Protected browser history must not persist member payloads; route paths contain identifiers only, never setup credentials. Scope-generation guards prevent obsolete asynchronous role/roster/portal responses from repopulating current views. No member-data service worker cache or offline queue is introduced.

Trade-offs: Framework7 adds initial JavaScript/CSS and requires lifecycle ownership; its coordinated page/navigation/sheet behavior provides the native fidelity approved by the owner. CSS leakage and focus/scroll lifecycle are integration risks requiring browser tests. Special-purpose attendance, reporting and calendar layouts remain domain components using shared controls, not a second visual framework.

Architectural deviations require a scoped rationale, named independent reviewer, expiry/review condition and explicit architecture-check exception. Existing historical prototypes remain isolated reference tooling, excluded from production TypeScript and dependency enforcement.

## Pinned-version sheet compatibility

`TaskSheet` portals into a stable body-level wrapper and passes that wrapper as `containerEl`; Framework7 must not reparent React-owned sheet elements into the application root. A workspace may unmount while a sheet is closing. Before native destruction, the adapter closes a still-open instance without animation, suppresses user-dismissal callbacks during teardown, and bridges Framework7 9.2's missing `sheetDestroy` emission so its global touch listeners are removed before instance properties disappear. Shared inert leases keep overlapping sheet handoffs isolated. These compatibility measures require source review and the maintained adapter/workspace-switch tests when upgrading Framework7; remove them only when the corresponding upstream lifecycle behavior is verified.

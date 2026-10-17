# Framework7 Native design principles

Framework7 Native (approved Variant A in PR #54) is BB-Manager's production presentation foundation. It is an iOS 26-inspired React application, not SwiftUI or a native wrapper. Native fidelity means coordinated navigation, readable hierarchy, reliable focus and fast tasks as well as appearance.

1. **The meeting comes first.** An officer must find a member and enter attendance/scores comfortably with one hand. Glass and motion must never delay entry or obscure numbers.
2. **One product across roles.** Staff, boy and squad-leader experiences share components and tokens. Role-specific information and server-enforced permissions determine content; a different role is not a different visual language.
3. **Identity is functional.** Boys' Brigade Company blue and Junior green identify the current workspace. Preserve official assets. NCO rank is not squad leadership or application authority.
4. **Quiet data, expressive navigation.** Grouped opaque surfaces hold records, forms and reports. Translucency is concentrated in toolbars and floating navigation. Do not blur whole data pages.
5. **Honest state.** Pending, saving, saved, empty and failure states reflect the real service result. No simulated success, persistent protected-data cache or offline mutation queue.
6. **Accessible interaction is part of fidelity.** Named controls, a real keyboard checkbox, disabled semantics, modal containment, error associations and reduced motion are required. Do not reproduce a platform visual convention where it makes browser interaction worse.
7. **Mobile sets the structure.** Start at 390px, verify 320px reflow, and adapt into tablet/desktop workspace layouts. Larger screens are not permission to introduce another dashboard system.
8. **Reuse before variation.** Shared controls and semantic tokens take priority over isolated aesthetics. Document justified exceptions with scope, reason, owner and a review/test plan.

The implementation source is `components/ui/` and `styles/design-system.css`. The application shell owns routing, authentication boundaries and the single Framework7 app instance. Domain services and database rules remain authoritative. This documentation describes the implemented primitives; page-family migration and acceptance are recorded separately in the migration review register.

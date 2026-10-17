# PWA and iOS

The application remains a React/Vite web app. `index.html` uses width=device-width, initial-scale=1, viewport-fit=cover and progressive interactive-widget=resizes-content. User zoom is enabled. The root manifest and existing BB icon assets provide standalone display; the theme/status treatment follows the opaque light canvas. Native-style page and sheet behavior comes from Framework7, not a native wrapper.

Safe-area tokens reference env(safe-area-inset-top/bottom). Navigation and Save accessories reserve lower content clearance; forms use at least16px inputs to avoid iOS focus zoom. Browser scrolling remains native. Reduced-motion preferences suppress nonessential transitions. CSS backdrop blur is progressive enhancement on navigation/overlays, with readable opaque data surfaces and a fallback; do not depend on Chromium-only SVG refraction.

The existing `public/portal-sw.js` remains push-only. It receives notifications and opens/focuses the application on notification click. No authenticated response cache, offline mark queue or persistent member-data store is added. Network failures preserve drafts and expose real retry rather than claiming offline persistence. Subscription/VAPID and server contracts are unchanged.

Physical iPhone acceptance remains required for Safari and Add to Home Screen: launch/resume; preview/install access; status bar; safe areas; keyboard Save visibility; viewport shifts; text selection; VoiceOver; WebAuthn platform prompts; notification permission/delivery; browser back gestures; and refresh after revocation/logout. Playwright WebKit is not physical iPhone Safari and does not supply the native keyboard or Apple fonts.

Feasible web behavior: native-style hierarchy, grouped controls, standard backdrop blur, system fonts on supported platforms, browser scrolling, safe areas and standalone presentation. Exact SwiftUI optical rendering, OS navigation gestures, native keyboard accessories and reliable iPhone haptics cannot be promised by this stack.

`components/shell/KeyboardViewport.tsx` progressively observes the standard VisualViewport API. With a focused text field at scale1, it exposes keyboard inset/visible-height CSS properties; Save stays above the visual keyboard area, sheets fit it and primary tabs temporarily leave that area. Pinch zoom is deliberately ignored. Unsupported browsers retain ordinary browser scrolling. Synthetic viewport tests verify the contract; physical iOS keyboard/compositor behaviour remains an explicit device gate.

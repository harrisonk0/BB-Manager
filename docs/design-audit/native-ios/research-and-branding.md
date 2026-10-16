# Research, branding and platform constraints

Research inspected 16 October 2026. Primary Apple HIG pages were read through their linked developer-documentation Markdown payloads, rather than relying on search snippets. The downloaded source and large brand ZIPs are research scratch files, not application dependencies.

## Native principles applied

| Primary reference | Principle | BB-Manager decision |
| --- | --- | --- |
| [Apple: Materials](https://developer.apple.com/design/human-interface-guidelines/materials) and [Meet Liquid Glass](https://developer.apple.com/videos/play/wwdc2025/219/) | Material establishes the functional layer and hierarchy; it is not a reason to make all content translucent. | Opaque roster, fields and reports. Restrained translucent tab navigation, with a solid alternative and fallback. CSS blur is an approximation, not Apple’s rendering system. |
| [Apple: Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars) | Stable top-level destinations, recognisable selection and independent navigation state. | Four staff tabs, role-specific portal tabs, per-tab filters/drafts/scroll; no Add or Save tab. Sidebar at tablet widths. |
| [Apple: Sheets](https://developer.apple.com/design/human-interface-guidelines/sheets) | Sheets serve focused secondary tasks; a complex editor needs sufficient room and clear completion. | Bottom filter/action sheets, fitted member editor and full-height history on phones, bounded wider-screen dialogs. No custom gesture that competes with browser scrolling or Back. |
| [Apple: Typography](https://developer.apple.com/design/human-interface-guidelines/typography) | System text, coherent hierarchy, legibility and adaptable sizing. | Apple system stack, economical large titles, 15–16px content, tabular numbers. No SF font files copied or redistributed. |
| [Apple: Motion](https://developer.apple.com/design/human-interface-guidelines/motion) | Movement explains state and continuity; users must be able to reduce it. | Brief arrivals and press/selection feedback, no number-counting or decorative loops. OS and in-app reduced-motion overrides. |
| [Apple: Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility) and [Layout](https://developer.apple.com/design/human-interface-guidelines/layout) | Adequate contrast, touch comfort, content flexibility and safe placement matter more than an attractive static composition. | 44px product targets, zoom permitted, safe-area padding, named native dialogs and semantic tables. Chromium checks are followed by a mandatory real-device gate. |
| [Apple: Segmented controls](https://developer.apple.com/design/human-interface-guidelines/segmented-controls) | A small, understandable set of related choices needs a clear selection. | Squad scope and roster mode use contained segmented choices; marks keep explicit Present, Absent and Not recorded. |

Contemporary application references were inspected for decisions, not copied as visual kits:

- [Linear: Liquid Glass](https://linear.app/now/linear-liquid-glass) explains adapting the platform language to a product’s own workflows, with restrained glass around dense tools. It supports the distinction between functional navigation and opaque data.
- [Linear mobile redesign](https://linear.app/changelog/2025-10-16-mobile-app-redesign), [navigation customisation](https://linear.app/changelog/2026-01-22-customize-your-navigation-in-linear-mobile), and [design refresh](https://linear.app/now/behind-the-latest-design-refresh) informed stable navigation, sharper hierarchy and the need to test frequent destinations with real users. User-configurable navigation is a reference, not a new BB-Manager feature proposal in this prototype.
- [Things](https://culturedcode.com/things/features/) and its contemporary OS redesign illustrate native craft that keeps the task list quiet and touch interactions clear. BB-Manager retains its own identity and data layout.

## Tools and skills actually used

The installed OpenAI [frontend-app-builder](https://github.com/openai/skills) skill informed image-first concept work, a shared visual inventory and comparison of generated references with rendered code. The user’s instruction explicitly authorises building the recommended isolated prototype; no claim is made that a direction has already been approved.

Installed Vercel [Web Design Guidelines](https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines) and [React Best Practices](https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices) were read. The current web guideline source was retrieved. Applied points include semantic buttons/links, visible focus, labelled inputs, linked errors, explicit transitions, native browser controls, deliberate state boundaries and derived reporting rather than copied state. This is React/Vite, so Next.js/server-specific recommendations do not apply. PDF/chart packages were not added.

Official Playwright MCP `0.0.83` was discovered and exercised through its SDK/JSON-RPC, using existing Chromium in the environment. Browser/IAB was unavailable in tool discovery; this is the documented fallback. The screenshots are rendered application evidence. The capture tooling and machine-readable results are committed alongside the prototype.

Official shadcn MCP `4.22.0` was used to research sheet, drawer, toggle-group and navigation-menu patterns. [Search results](../../../prototypes/native-ios/evidence/shadcn-research.json) and [item details](../../../prototypes/native-ios/evidence/shadcn-details.json) preserve what was actually called. No shadcn components or additional runtime library were installed. The bespoke system uses a native HTML dialog rather than combining visually unrelated components. `21st.dev` remained disabled because no authorised credential was configured; it was not used. Image generation produced the presentation studies, not the application’s text, controls or logos.

## Official Boys’ Brigade assets

The user explicitly authorised downloading and using the official brand packs from [Our Brand](https://boys-brigade.org.uk/our-brand/). Read the core branding guidelines and sub-branding guidelines linked there. Downloaded the logo/font and sub-brand packs; extracted only the supplied PNG variants needed for this study. No brand font bundle is redistributed.

| Token | Official value | Role |
| --- | --- | --- |
| Core navy | `#2D395A` | BB identity, metric surfaces |
| Core blue | `#224B8E` | Main actions and selection |
| Light blue | `#5D99D2` | Supporting brand detail |
| Brand grey | `#575756` | Brand reference; UI text uses tested semantic pairs |
| Company sub-brand | `#202944` | Company identity |
| Junior sub-brand | `#145091` | Junior identity |

Supplied assets in `prototypes/native-ios/assets/`:

- `bb-blue.png`: `Logo & Font Pack/The Boys Brigade Logo/PNG/MED/blue_logo.png` from `logofontspacks.zip`.
- `bb-white.png`: supplied MED white variant from the same folder; reserved for a future dark appearance, not recoloured in CSS.
- `company.png`: `3_company/PNG/company_colour.png` from `subbrandinglogospack.zip`.
- `juniors.png`: `2_juniors/PNG/juniors_colour.png` from that pack.

The source files remain intact: no crop, stretch, recolour, redrawn lettering or invented anchor. Fit images proportionally, give clear space, and use a suitable opaque backing. The original brand’s artwork/font guidance governs brand material; the user’s system-first direction governs functional UI text. The logo’s embedded tagline is not intended as functional body copy. The prototype reuses existing repository 192/512 icons unchanged for manifest mechanics; it does not claim they are the final optical app-icon solution. A purpose-designed, officially compliant icon and maskable/splash review are roadmap items.

Inter is a licensed non-Apple fallback from [rsms/inter](https://github.com/rsms/inter); the OFL licence is included. Apple platforms select `-apple-system` first. Chromium screenshots here use Inter; they cannot demonstrate the actual San Francisco font rasterisation. [Asset checksums](../../../prototypes/native-ios/evidence/asset-provenance.json) allow verification of copied source files.

## PWA: feasible improvements and honest limits

| Capability | Feasible web approach | Boundary / verification |
| --- | --- | --- |
| Home Screen presentation | Valid manifest, standalone display, purpose-built icons, viewport-fit=cover, appropriate theme/status-bar colours. | The OS controls launch animation/splash and chrome; CSS cannot reproduce UIKit’s system presentation. Verify installation and relaunch on iPhone. |
| Safe areas and scrolling | `env(safe-area-inset-*)`, `dvh`, ordinary document scrolling, bounded modal body and adequate bottom clearance. | Insets, rotated devices, Safari chrome and standalone must be tested on hardware. Do not lock the main page into a fake phone viewport. |
| Keyboard ergonomics | ≥16px text inputs, decimal `inputMode`, focused scrolling, VisualViewport enhancement; hide secondary tabs while editing if needed. | Browser/device determines keyboard layout and dismissal. No guaranteed native keyboard accessory or universal avoidance behaviour. Test blur, keyboard dismissal and the last field. |
| Navigation/resume | Addressable views, browser history, per-tab state; preserve authorised UI state on resume after safe revalidation. | Native back gestures, interactive UIKit transitions and process lifecycle are not under web control. Prototype preserves in-memory tab state only; production resume needs auth-aware recovery. |
| Motion/material | Purposeful CSS transitions, limited backdrop blur with solid fallback, reduced-motion and contrast preferences. | Liquid Glass optical rendering is not a standard web API. Avoid shader/refraction emulation and large costly blurred content areas. |
| Haptics | Only progressive enhancement where an appropriate API actually exists. | Do not promise iPhone web vibration/haptics; none is implemented. No private APIs or fake vibration controls. |
| Push/passkeys | Existing production WebAuthn and push contracts, permission requested in context. iPhone web push requires a supported installed Home Screen app. | No new permission prompt, auth ceremony or live notification in the prototype. Preserve server-side passkey checks and revocation. |
| Offline/errors | Keep shell/context, persistent retry, honest save failure and retained unsaved fields. Consider static shell caching separately. | Production `portal-sw.js` handles push; this study does not add data caching or queued writes. Sensitive data persistence requires an explicit security/storage design and reliable reconciliation. |

The prototype includes standalone metadata and safe-area/viewport handling to make these decisions concrete. They remain browser-tested design foundations, not an iPhone certification or an installed/offline application claim.

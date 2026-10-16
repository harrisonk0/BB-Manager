# iOS 26 reference analysis

Research date: 16 October 2026. This extends PR #54; the verified findings in PR #53 remain mandatory. The original Assembly direction remains available under `prototypes/native-ios`.

## What “native” means here

Apple's [Adopting Liquid Glass](https://developer.apple.com/documentation/technologyoverviews/adopting-liquid-glass) distinguishes the floating **functional layer** from content. Glass belongs to navigation, toolbars and transient controls. It should reveal context underneath without compromising the task. A roster and editable scores need opaque, stable surfaces.

The official [iOS 26 announcement](https://www.apple.com/newsroom/2025/06/apple-elevates-the-iphone-experience-with-ios-26/) and its actual [native application montage](https://www.apple.com/newsroom/2025/06/apple-elevates-the-iphone-experience-with-ios-26/article/Apple-WWDC25-iOS-26-hero-250609_big.jpg.large.jpg) were opened and visually inspected. Messages and Music illustrate compact floating controls, restrained content and a clear visual separation between navigation and information. This is an authentic native reference, not a generated mockup. Apple HIG materials were read directly; support-guide URLs that redirected to a later OS and an unavailable navigation-bar Markdown endpoint were excluded as evidence.

| Apple principle | Application in both experiments |
| --- | --- |
| [Materials](https://developer.apple.com/design/human-interface-guidelines/materials): glass clarifies hierarchy | Floating tab pane, workspace control and Save accessory; opaque grouped data surfaces |
| [Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars): stable destinations and labels | Four staff destinations; role-specific portal tabs; selection includes shape and text |
| Large titles with compact navigation on scroll | Framework7 native large-transparent navbar; Konsta scroll-linked large navbar |
| Contacts/Settings-style scanning and disclosure | Inset grouped rosters, fine separators, secondary metadata, familiar chevrons |
| [Search](https://developer.apple.com/design/human-interface-guidelines/search-fields) remains close to its content | Search is above the roster, filters live in a sheet, search state survives tab changes |
| [Sheets](https://developer.apple.com/design/human-interface-guidelines/sheets) are focused tasks with contextual detents | Editor/filter/workspace/confirmation sheets; drag handle only, background contained |
| [Typography](https://developer.apple.com/design/human-interface-guidelines/typography) reflects platform and hierarchy | Apple system font first, 34px large titles, 17px names and inputs, tabular metrics |
| [Motion](https://developer.apple.com/design/human-interface-guidelines/motion) explains a relationship | Actual Framework7 push/pop; lighter React detail entry in Native+; reduced motion respected |
| [Context menus](https://developer.apple.com/design/human-interface-guidelines/context-menus) supplement discoverable actions | Explicit actions open task sheets; no mandatory long-press or browser gesture override |

Settings, Contacts, Reminders, Calendar and Health supply useful hierarchy models: grouped settings, roster-to-detail, fast state changes, dated agenda and readable metrics respectively. Those mappings are design interpretation; no claim is made that every current screen of those applications was captured on a physical iPhone.

## Fidelity decisions

- System font lookup uses `-apple-system` / `BlinkMacSystemFont`; no Apple font or SF Symbols files are redistributed. Lucide icons (ISC) and original SVG rank indicators are used. Inter's existing OFL-licensed fallback stays local.
- Lists have 26px outer corners, inset half-pixel separators and 17px primary names. Scores use 19px inputs and large three-state attendance targets. This is a task adaptation, not a pixel copy of Settings.
- Boys’ Brigade navy anchors reporting; official Company/Junior logos distinguish workspace choices. Brand blue appears in selected controls and navigation rather than staining every surface.
- Labels stay visible. No auto-hiding/minimising tab bar during fast attendance entry. Save is explicit and remains above navigation while dirty.
- Framework7's own iOS material and Konsta's `ToolbarPane` are exercised rather than replacing either with a generic rounded translucent rectangle.
- No experimental view-transition API, proprietary native API, scroll hijacking or vibration imitation is required.

## Web-platform boundary

A web app can provide platform fonts, safe-area padding, standalone launch, scroll-linked navigation, CSS backdrop blur, spring-like transitions, contained modal focus and clear save feedback. It cannot reproduce SwiftUI's compositor, exact optical Liquid Glass refraction, system haptics on iPhone Safari, OS-owned navigation gestures or the native keyboard/accessory system. Browser chrome remains in normal Safari. Standalone mode improves the presentation but does not turn React into UIKit/SwiftUI.

Playwright WebKit exercises a different engine path from Chromium, but is **not physical iPhone Safari**. Home Screen launch/resume, real keyboard occlusion, VoiceOver, overscroll, thermal performance and real glass against moving content still require device review.

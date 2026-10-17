# Component-library compatibility

Versions were verified against npm and installed only in `prototypes/ios26`. Production React/Vite/Tailwind configuration and lockfile are unchanged. Research evidence lives in `prototypes/ios26/evidence/research`.

| Candidate | Findings | Decision |
| --- | --- | --- |
| **Framework7 / React 9.2.0**, MIT | Actual iOS 26 theme, router-driven Page push/pop, large transparent Navbar, ToolbarPane, Tabs, List, Searchbar, Segmented, Toggle and Sheet. Official MCP component descriptions, CSS variables and demos were fetched. React 19 works in this isolated build. | Variant A foundation. Lite core plus required modules/CSS. Retain its navigation system to assess more than appearance. |
| **Konsta 5.5.0**, MIT | Actual iOS 26 components; scroll-linked Navbar, ToolbarPane selection effects, grouped lists, Searchbar, segmented controls, Toggle and buttons. No application router. Requires Tailwind 4. | Variant B controls, with a dedicated Tailwind 4 Vite plugin and explicit empty PostCSS configuration. No root Tailwind 3 upgrade. |
| **Vaul 1.1.2**, MIT | Snap points, handle-only dragging, modal focus, scroll containment and input repositioning. React 19 compatible. Its current upstream README explicitly says **unmaintained**. | Installed for Variant B comparison, not approved as a long-term dependency by default. A maintained fork, ownership plan or replacement is a production gate. |
| **website-glass** public registry | Tabs, Dock, Button, Switch, Sheet, Input and Popover registry entries retrieved; all depend on its common glass engine. The engine explicitly restricts SVG-backed backdrop refraction to Chromium and falls back to frosted blur on Safari/Firefox. The presumed npm package returned 404; this is source distribution through a shadcn registry. | Research reference only; no source copied into the shipped prototype. Its optical advantage does not carry to the primary iPhone target. Advertised repository availability/licensing provenance also needs resolution before vendoring. |
| **Ionic React 9.0.8**, MIT | Explicit iOS mode, mature routing/overlay/content conventions. Requires adopting another navigation/content foundation. Current documentation inspected; not installed or benchmarked. | Credible alternative, but adds another full-framework experiment without stronger verified iOS 26 evidence than Framework7. |
| **liquid-glass-react 1.1.1**, MIT metadata | React >=19; specialised refraction rather than lists, navigation and forms. Package metadata researched; not installed or benchmarked. | No additional glass dependency: first establish Safari benefit and maintained upstream provenance. |
| **shadcn MCP 4.22.0** | Sheet, drawer and toggle-group registry metadata inspected through the actual MCP. Useful accessibility/composition references. | No generic shadcn visual layer added. |

## Tool use and limits

The installed frontend-app-builder, Vercel Web Design Guidelines and React Best Practices skills were read and applied. Latest web interface guidance was fetched. Official Playwright MCP 0.0.83 renders and exercises the app; axe runs inside its actual pages. Official Framework7 MCP was successfully called at `https://framework7.io/mcp`, including React components, CSS variables and examples. Its large-title demo slug was unavailable; Navbar component/source and working implementation supplied that evidence instead.

`.codex/config.toml` now configures the official Framework7 server. A browser-style User-Agent was necessary for this environment's successful request. The 21st.dev connector remains disabled without a user-issued key and was not used. No Figma or SwiftUI implementation was created.

## Why one foundation matters

Variant A uses Framework7 application primitives and one small shared presentation adapter. Variant B uses Konsta controls and Vaul sheets around ordinary React state/history. They share synthetic content/model code, not CSS or navigation implementations. Neither bundles the other's foundation on its entry point; Vite emits separate entry chunks.

Framework7 brings navigation ownership and framework-specific lifecycle requirements. Native+ keeps production React integration simpler, but navigation collapse, transition/accessibility lifecycle and back-stack correctness remain application responsibilities. Framework7 cannot be selected merely for a few cosmetic differences: the production justification must include its stronger navigation and consistent component behaviour.

The live website-glass homepage was also rendered through Playwright MCP WebKit (desktop Safari user-agent 26.6). Computed filters were `blur(...) saturate(...)`; no SVG backdrop-refraction URL appeared in the sampled elements. The actual screenshot and computed-style evidence are retained in `website-glass-live.png` and `website-glass-webkit.json`. This confirms the exercised fallback path, not physical iPhone optical parity.

Framework7's controlled Toggle needed a React 19 adapter: the component's no-op React change handler restored its old controlled value before the native change event was read. The experiment uses the actual Toggle with `defaultChecked`, its native change event and explicit prop-to-instance synchronisation. Touch/keyboard behaviour must stay covered during integration; a working screenshot alone would have missed this.

Two further Framework7 adapter contracts were verified: native tab-show lifecycle events own React's active-tab state (iOS touch activation can bypass a React click handler), and the actual Button receives native disabled semantics in addition to the framework's disabled styling. These are covered by the interaction evidence, including touch-enabled iPhone emulation. Keep those adapter checks when upgrading the library.

The switch adapter also restores a native keyboard/assistive-technology checkbox (the framework stylesheet hides it by default), provides a visible label focus ring, and preserves a 44px touch target. Third-party license texts, including Framework7, Konsta, React, Vaul and Lucide, ship in `public/third-party-notices.txt`; Inter's OFL notice is separate.

The root TypeScript project excludes `prototypes/ios26` so production CI does not require its optional experiment dependencies. A dedicated `iOS 26 Prototype` workflow installs the isolated lockfile, type-checks it and builds both entries without backend secrets. This is a tooling boundary, not removal of production source checking.

## Sheet comparison from actual implementations

Konsta 5.5's installed React `Sheet.js` and `SheetClasses.js` were inspected, along with Actions and Popup. Its Sheet is an `opened`/backdrop presentation component using a 400ms CSS translation; that component does not supply drag detents, modal focus containment or input repositioning. It is a sensible lightweight static sheet, but would leave those behaviours to the application. Framework7's actual Sheet provides drag/breakpoint lifecycle and its own application integration; the prototype adds the required accessibility handling. Vaul provides snap points and Radix-based modal mechanics around Native+'s React architecture. That functional difference justified the specialist experiment; it does not remove Vaul's upstream maintenance risk. Konsta's own sheet was source-reviewed, not benchmarked as a third coded variant.

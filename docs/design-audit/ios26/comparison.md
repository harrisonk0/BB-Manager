# Recommendation: Framework7 Native

**Choose Variant A as the foundation for the next reviewed production design.** Its strongest advantage is real application navigation: stacked Pages, collapsing native-style navigation bars, consistent controls and coordinated sheets. Those are central to the requested SwiftUI-like experience. Native+ gets close in static composition, and remains a useful lower-integration-cost alternative, but its custom React detail entry and immediate back removal are less convincing in motion.

This recommends a design/architecture direction. It does not authorise production migration or claim that a browser reproduces SwiftUI's renderer.

| Question | Framework7 Native | Assembly Native+ | Assessment |
| --- | --- | --- | --- |
| Most like iOS 26? | Actual iOS theme across navigation, lists, search, controls and sheets; native push/pop relationship | Actual Konsta iOS controls and glass panes; similar shared BB content composition | **A**, particularly during navigation rather than a still screenshot |
| Navigation? | Independent tab stacks and framework page lifecycle; browser-edge swipe deliberately disabled | React/history-driven detail view, preserved tab state and a lighter entry animation | **A**; both still need complete production deep-link/back-stack work |
| Safari glass? | CSS-backed native framework materials, exercised in WebKit and iPhone emulation | Konsta ToolbarPane and standard backdrop material, exercised through the same engine | **Comparable**; no evidence that adding SVG refraction improves iPhone Safari |
| Sheets/transitions? | Actual Framework7 Sheet, handle-only drag, breakpoints, explicit Expand/Compact, focus restoration | Vaul snap points and input handling, accessible detent controls; full panel on larger screens | **A overall**; B's dragging is attractive, but Vaul's maintenance status is a production concern |
| Marks entry? | Same large three-state controls and labelled numeric fields; explicit pending/saving/saved/retry | Same task geometry and validation; lower framework overhead | **B on measured footprint**, similar task steps; no physical-phone speed winner established |
| Least invasive integration? | Requires deliberate router ownership, CSS boundary and view lifecycle integration | Keeps conventional React architecture; Konsta's Tailwind 4 still needs isolation | **B** |
| Maintenance? | One coordinated mobile framework and React plugin, current matching versions | Konsta plus app-owned navigation plus an explicitly unmaintained Vaul dependency | **A for this mission**, conditional on accepting the router integration work |
| Long-term consistency? | Framework owns navigation, material, lists and overlays together | More freedom, but more app-owned interaction contracts to maintain | **A** |

## Measured cost

`evidence/bundle.json` measures each built entry plus its shared imports with gzip level 9. Framework7 is approximately **166 KiB JavaScript + 32 KiB CSS**; Native+ is approximately **119 KiB JavaScript + 20 KiB CSS**. These are prototype entry totals, not incremental production costs or full network transfer. Official images, HTML and the optional 352KB Inter fallback font are excluded. Apple devices use the platform font when available.

The browser timing probe records 15 attendance changes through the same 18-member fixture and measures time to the next animation frame. It is an unthrottled Linux VM probe, not an iPhone benchmark or an INP measurement. In the recorded run, both variants had a median of approximately 17ms to the next frame; that does not establish a device-level speed advantage. Raw samples and navigation timing are retained in `evidence/chromium/performance.json`. Native+ has a smaller and lighter foundation; Framework7's additional cost buys navigation behaviour, not only a different border radius. A 100-member real-device profile and route-level lazy loading are production gates.

No human task-speed study was conducted. Both variants let an officer mark arrival with one labelled attendance choice, enter a score directly and save explicitly; neither adds an animation delay before accepting the next entry.

## Why not a stack of specialist libraries?

Use Framework7 for the shell, page stacks, grouped rows, search, segmentation, switches and sheets, with BB-specific attendance/score/report components behind a small adapter. Keep existing React services, permissions and business rules. Do not mix Konsta, Vaul and website-glass into that production foundation merely to preserve a favourite visual detail.

Native+ remains available if the reviewed router integration proves too invasive or device performance fails the acceptance gate. Its useful lessons—compact data entry, strong shared task components and clear Save feedback—are already shared with A. A fallback decision should be based on measured integration/device evidence, not dependency count alone.

## Remaining fidelity limits

Exact SwiftUI optical refraction, OS-owned gestures, native keyboard accessories and iPhone haptics are not supplied by these React libraries. The web can achieve a convincing native-style hierarchy and interaction system, but the final judgement belongs on the user's physical iPhone. Review both normal Safari and Add to Home Screen presentation before selecting the direction.

The prototype is intentionally incomplete as an application replacement: calendar/agenda, archives, export/import, real authentication, account operations and complete administration require the parity-based migration described in [the design system and strategy](design-system-and-migration.md). Junior editing/validation is demonstrated; the richer reporting fixture remains a Company report and is not a completed Junior aggregate-history adapter.

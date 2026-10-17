# Performance evidence and budgets

Measure the production build, not Vite's development module graph. Report initial-route JavaScript and CSS separately from lazy report/PDF chunks and optional assets. Retain raw build output and identify the exact commit so the result is reproducible.

The migration's initial integration check was run while independent workstreams were writing files; it is not a valid immutable-main bundle baseline. The 17 existing unit suites passed (131 tests). The concurrent type/build failures were returned to their owners rather than reported as baseline regressions. An isolated source archive of `origin/main` (`e060fce`) was subsequently built successfully with the same installed dependency superset: initial JavaScript 621.52 kB raw / 170.00 kB gzip; CSS 46.00 kB raw / 9.12 kB gzip. The optional PDF engine was 1,582.05 kB raw / 529.63 kB gzip; session report entry 32.97 kB raw / 7.93 kB gzip. This reused the migration node_modules (common resolved versions), rather than claiming an independent clean npm-ci installation. The final frozen integration measurements are recorded below.

## Measurement protocol

- Build clean main and migration with the same Node, lockfile installation method, environment and minifier.
- Record gzip bytes by output chunk and actual HTML/module dependency graph, not the sum of all optional chunks as an alleged startup cost.
- Confirm `@react-pdf/renderer` and document modules remain behind user-triggered lazy imports.
- Use the real production roster/marks components with deterministic 30- and 100-member HTTP fixtures. Measure interaction-to-next-frame samples for attendance and score entry after warmup. Report distribution/sample count and VM/browser version. These samples are not INP or a physical iPhone benchmark.
- Check scroll rendering, navigation, sheet open/close, safe-area changes, background/resume and repeated route transitions. Inspect memory/view retention after logout and role changes independently of visual smoothness.
- Restrict backdrop blur to navigation/overlays; do not place a full-screen animated refractive surface behind dense data-entry content.
- Capture performance traces for repeated expensive updates before introducing memoisation or virtualization. Do not virtualize a small roster merely to reduce DOM count if it harms search, focus or assistive technology.

Physical iPhone responsiveness, keyboard layout shifts, thermal effects and installed PWA resume remain device acceptance items. Chromium/WebKit automation in a cloud VM does not establish those results.

## Frozen integration measurements (17 October 2026)

The reviewed build's static HTML/import graph is recorded in `tests/frontend/evidence/migration-bundle.json`; the production baseline is `main-bundle.json`. Both use gzip level 9 rather than Vite's display compression settings:

| Initial transfer graph | Production main `e060fce` | Framework7 migration |
| --- | ---: | ---: |
| JavaScript, raw / gzip | 621,516 / 169,510 bytes | 882,437 / 249,819 bytes |
| CSS, raw / gzip | 45,998 / 9,060 bytes | 199,740 / 34,179 bytes |
| Combined gzip | 178,570 bytes | 283,998 bytes |

The initial gzip graph grows by 105,428 bytes (59%). This is a material cost of the integrated native foundation, not a claim of performance parity. PDF remains a separately lazy-loaded engine (approximately 1.58 MB raw / 530 kB Vite gzip) and is excluded from startup totals. Optional images/fonts, network/TLS and browser parse time are also excluded; transfer bytes are not a navigation timing benchmark. Root build output identifies the hashed assets; the JSON preserves the exact measured graph.

`interaction-performance-memoized.json` records a quiet serial run after extracting the unchanged marks row into `React.memo` with stable handlers. Each case used three warmup interactions and fifteen measured clicks against the real marks component with synthetic intercepted services, at 390px:

| Browser | Members | Median to next animation frame | p95 |
| --- | ---: | ---: | ---: |
| Bundled Chromium 145.0.7632.6 | 30 | 16 ms | 30 ms |
| Bundled Chromium 145.0.7632.6 | 100 | 16 ms | 35 ms |
| Playwright WebKit 26.0 | 30 | 16 ms | 62 ms |
| Playwright WebKit 26.0 | 100 | 21 ms | 50 ms |

Before memoisation, the same quiet 100-member cases had medians of 39 ms (Chromium) and 59 ms (WebKit). Both raw sets are retained alongside an earlier contended run so the provenance is clear. These are programmatic native clicks to the next `requestAnimationFrame` on a shared Linux VM, not INP, physical touch latency, proof of 60 fps or a physical iPhone benchmark. The test's broad 500 ms stall guard catches gross regressions; reviewers must assess actual changes rather than interpreting that threshold as an acceptable product target.

The automated baseline does not measure screen-reader responsiveness, thermal throttling, installed PWA memory/resume, real keyboard animation, large live datasets or network latency. Those remain physical-device and authorised staging acceptance items.

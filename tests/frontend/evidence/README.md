# Synthetic frontend verification evidence

These files contain no real member information, credentials or live backend responses.

- `functional-acceptance.json` records the final coherent actual-application workflow run, grouped by suite and browser.
- `report-layout-acceptance.json` records the final seven-width leader name/readability, retained-metrics and notification accessible-name correction checks.
- `performance-test-summary.json` records the separate quiet marks interaction measurement run; `interaction-performance-memoized.json` contains its raw timing samples and limitations. Earlier quiet/contended runs retain provenance.
- `implementation-source-manifest.json` fingerprints the implementation files exercised by final verification, including final independently retested CSS and accessible-name corrections. Its base implementation commit may precede the final evidence commit; the file hashes identify the exact source.
- `main-bundle.json` and `migration-bundle.json` record gzip-level-9 static startup graphs. PDF, images and optional fonts are excluded. See the canonical performance document for the material increase and measurement limitations.

Raw Playwright reports, traces and screenshots belong in CI artifacts under `test-results/`, not this committed summary. Generate sanitized aggregate reports with `node tests/frontend/summarize-evidence.mjs <results.json>`. The independent visual reviewer owns screenshot approval and its evidence separately. No synthetic result proves server RLS, Edge Function permissions, a real passkey ceremony, physical iPhone Safari, installed PWA push or live persistence. Those require their own explicitly authorised acceptance.

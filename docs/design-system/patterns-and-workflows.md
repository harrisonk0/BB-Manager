# Canonical workflow patterns

Use existing production handlers/services and the source-backed parity register. Shared UI provides presentation, never authorisation or alternative business rules.

| Task | Pattern | Contracts to preserve |
| --- | --- | --- |
| Members | Grouped roster, visible search, filters/sort, row disclosure, editor sheet | Section-specific filters, configured squads, ranks/leadership, imports and deletion guards |
| Weekly Marks | Focused roster entry, explicit attendance, labelled numeric fields, Save accessory | Zero/absent/unrecorded, Junior maximums/precision, meeting dates, historical lock, retry and drafts |
| Member history | Dated grouped records, summary, deliberate editing | Attendance correction, legacy Junior totals, deletion and unsaved protection |
| Reports | Metrics and readable chart first, scroll-contained labelled detail | All calculations, top five, heatmaps, monthly comparisons and exact PDF content |
| Archives/import | Session disclosure and explicit selection | Archived data stays read-only, year/squad eligibility, leadership and duplicate import rules |
| Settings | Grouped settings, clear autosave feedback | Role restrictions, squad constraints, typed confirmation and both-section session safeguards |
| Calendar | Mobile agenda and month alternative, event editor sheet | London date/DST, weekly generation, permissions, subscriptions and poster PDF |
| Portal | Role-appropriate pages from scoped server summaries | Ordinary identity-only teammate data, leader own-squad dated data, account reset/revocation |
| Authentication | Focused form/gate with recovery and retry | Hosted passkey requirements, setup secret scrubbing, role validation and sign-out cleanup |

Errors remain visible with actionable retry and field associations. Loading never displays previous identity data. Empty states explain the condition and preserve appropriate actions. Do not hide lesser-used functionality to simplify screenshots.

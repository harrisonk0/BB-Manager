# Application inventory

Read evidence labels and priority definitions in the [README](README.md). All paths below are relative to the repository root. `evidence/source-inventory.json` records imports, source line counts, controls, headings and state-related landmarks for every TSX component.

## Stack and architecture

| Area | Verified implementation |
| --- | --- |
| Framework | React/React DOM 19.2.0, TypeScript 5.8.3, Vite 6.4.3, `@vitejs/plugin-react` 5.1.1 installed; manifest permits compatible ranges. No Next.js or React Router. |
| Styling | Tailwind 3.4.18 through PostCSS 8.5.28 / Autoprefixer 10.4.22. Root `index.css` imports base/components/utilities; `tailwind.config.js` adds two colours and a Futura/system font stack. |
| UI libraries | Custom TSX components and inline SVGs; no Radix, shadcn component library, Headless UI, MUI, icon package or form library. `@react-pdf/renderer` 4.3.2 is for documents, not web controls. |
| Theme | Company and Junior colours are centralised; squad colours are centralised in `services/sectionSquads.ts`. No shared semantic CSS variables, control variants or typography/spacing/radius contracts. The squad dashboard owns separate `--sd-*` variables. |
| Entry | `index.html` → `index.tsx` → StrictMode → `ErrorBoundary` → `App`. Root includes global toasts and navigation/unsaved-change orchestration. |
| Data | Browser SPA → Supabase Auth/Postgres. Trusted portal operations use the `company-portal` Edge Function. Hooks separate auth, section selection, data and unsaved marks. |
| Deployment | Vercel static SPA; `vercel.json` fallback. No application server to redesign. |
| Verification | Vitest 4.1.11, Playwright Test 1.58.2, SQL/DB/auth contract scripts, CI build/typecheck/unit/E2E gates. No existing visual screenshot baselines, axe package or component workbench. |
| Agent setup before audit | Root `AGENTS.md`, built-in skills; no repository `.codex/config.toml`, `.agents/skills`, `components.json` or project MCP configuration found. User Codex config was empty. |

## All application views and entry conditions

These are **views, not separate URL routes**. `types.ts` defines eight staff page keys and the `boyMarks` detail variant; `App.tsx:182` selects their components. A visit to `/weeklyMarks` does not address the marks view. Staff navigation sets local `view`, which starts at `home` after reload. Portal navigation has its own local `page` state.

| Entry/view | Component and gate | UI/workflow inventory | Browser evidence |
| --- | --- | --- | --- |
| `/`, signed out | `LoginPage` | Background image; logo; passkey button; local/recovery email-password form; forgot-password; inline info/error | L actual login; B `login` |
| Setup query `?username=…&code=…` | `PortalSetupPage`, captured by `services/portal.ts:captureSetupLink` before normal app flow | Passkey onboarding, busy/error/unsupported states; credentials removed from address bar | B `setup`; exchange/registration U |
| Auth/role/passkey checking | `App`, `HomePageSkeleton` | Full-screen skeleton; separate passkey-check retry/sign-out card | B `skeleton`; check-error gate S |
| Staff passkey required | `PasskeyEnrollmentGate` | Create, password-retirement retry, sign-out, error and unsupported state | B `passkey`; hosted ceremony U |
| Password recovery | `AccountSettingsPage recoveryMode` | Temporary-password form, completion back into app flow | S; recovery session U |
| No role | `App` access-denied card | Explanation and Return to Login | S; role denial U |
| No chosen section | `SectionSelectPage` | Branded Company/Junior choices and Log Out | B `sections` |
| `home` | `HomePage` | Members grouped by squad; search reveal; filter dialog; import/add; member statistics; view marks/edit/delete; empty/no-results | B `home`, `junior-home`, `empty-home`, dialogs |
| `weeklyMarks` | `WeeklyMarksPage` | Date, previous/next, historical lock, clear; three-state attendance; Company score or Junior uniform/behaviour; errors; sticky pending-save; date-discard dialog | B `weekly`, `junior-weekly`, `empty-weekly`, validation |
| `boyMarks` + `boyId` | `BoyMarksPage` | Back to members; member summary; historical marks list; attendance/score edit; remove row; sticky pending-save; skeleton/error | B `member`, `junior-member`; skeleton S |
| `dashboard` | `DashboardPage` | Top five; bar chart; attendance heatmap; monthly table; report launch; empty | B `dashboard`, `empty-dashboard`, `pdf-dialog` |
| `archives` | `ArchivesPage` | Past-session list/detail; closed-by metadata; archived squads; PDF/import actions; loading/no-session/no-members | B `archives`, `empty-archives`; detail and import S unless captured separately |
| `settings` | `SettingsPage`, navigation for captain/admin | Meeting day; squad management; archive both sections/start year with typed confirmation; account link | B `settings`, `session-confirm`; mutation U |
| `accountSettings` | `AccountSettingsPage` | `PasskeysCard`; localhost password form; hosted password explanation | B `account`; hosted/recovery variants S |
| `companyCalendar` | `CompanyCalendarPage`, Company only | Gradient page header; weekly-night generator disclosure; calendar; event add/edit; poster export; errors | B `calendar`, `event-dialog`, `error-calendar`; generator expanded S |
| `portalAccess` | `PortalAccessPage`, Company only | Member account cards; provision/refresh/copy setup links; reset/revoke confirmation; error/busy | B `access`; secret link and reset behaviour U |
| Boy role → portal `home` | `PortalHomePage` | Independent shell; greeting, next event, personal stats, standings, teammates, weekly-marks disclosure; active-account gate | B `portal`; ordinary-boy payload policy S |
| Portal `calendar` | `PortalHomePage` + `CompanyCalendar` | Back Home; calendar; subscription generation and private URL/copy flow | B `portal-calendar`; feed mutation U |
| Portal `account` | `PortalHomePage` | Passkeys, notification settings, sign-out | B `portal-account`; notification permission/push U |
| Portal `squad` | `SquadLeaderDashboard`, active current squad leader only | Hero/ring; metrics; interactive weekly bars; standings; dated own-squad table; historical nights | B `squad`; real permission boundary U |
| Fatal render error | `ErrorBoundary` | Full-screen reload card with recovery guidance | S; no production crash induced |

Junior has the same staff view family, without calendar or portal-access destinations. Officer/captain/admin differences and hosted passkey rules remain security constraints, not design choices. The harness uses a synthetic captain for staff screenshots; it does not demonstrate every role.

## Shared UI and page-specific pieces

| Component/family | Current consumers and function | Consolidation opportunity |
| --- | --- | --- |
| `Header` | All normal staff views; sticky 80px brand bar, desktop nav/profile, mobile expanding panel | A common navigation vocabulary and accessible menu/disclosure primitives; share brand/section treatment with portal, retain role-specific destinations. |
| `Modal` | Home add/edit/delete/filter; import; session PDF; settings year reset; calendar event; portal reset; global unsaved changes | Retain shared base, improve naming/focus/background behaviour; shared form/confirmation footer slots. |
| `BoyForm` | Add and edit inside Home modal | Existing reuse is good; consume common Field/Select/RadioGroup/Button contracts. |
| `DatePicker` | Weekly Marks date selection | Native date-input wrapper; share field styling with report range and calendar dates. |
| `Icons` | Inline SVG function exports across staff, portal, calendar and dashboard | Preserve library; standardise sizing, strokes, decorative hiding and accessible wrappers. |
| `Toast` + `useToastNotifications` | Global success/error/info messages | Shared provider exists; severity, lifetime, announcements and error persistence need contracts. |
| `SkeletonLoaders` | Roster/app checking and member-history placeholders | Share page-family loading states; avoid rendering the roster skeleton for unrelated auth tasks. |
| `BarChart` | Staff dashboard SVG chart | Share data/number styles with squad charts; provide accessible numeric alternatives. |
| `CompanyCalendar` + exported `EventCard` | Staff calendar and portal calendar/home | Good existing cross-role reuse. Keep event details consistent; mobile day cells and date naming need attention. |
| `PasskeysCard` | Staff account and portal account | Good existing reuse. Standardise card/control styles and hosted/local messaging without changing passkey policy. |
| `SquadsSettingsCard` | Section settings | Inline rename-on-blur, add, two-step inline remove; differs from explicit Save in adjacent settings. |
| `ImportFromSessionModal` | Home and Archives | Candidate selection/year/squad/leader controls, nested labels and internal scrolling; share form and selection-list patterns. |
| `SessionReportModal` | Dashboard and Archives | Date range, calculated summary, invalid/empty range and PDF preparation/download. Common export pattern to retain. |
| `SquadLeaderDashboard` + CSS | Portal leader subview only | Page-specific Stat, hero, ring, chart buttons, standings, roster and history; consolidate presentation contracts without widening access to teammate marks. |
| `SessionReportDocument`, `EventPosterDocument`, `reportConstants` | PDF-only exports | Separate print tokens (point units, pagination). Audit did not visually validate generated PDFs; do not apply mobile web typography blindly. |
| `branding.ts` | Header, login, section selection, setup, enrollment, portal | Existing source of asset URLs to preserve. |

## Repeated patterns with diverging implementations

| Pattern | Implementations | Recommended shared responsibility |
| --- | --- | --- |
| Section accents | Repeated `isCompany` → `accentBg/accentRing/accentText` branches in most staff files | Theme adapter mapping section → semantic interaction tokens. |
| Page headers | Home inline title/icons; Dashboard descriptive stack; Calendar gradient hero; Access icon/title; account plain heading; squad custom eyebrow | `PageHeader` with title/description/actions/back slots and intentional calendar/detail exceptions. |
| Cards and metrics | Staff shadow-md/rounded-lg; EventCard rounded-2xl; portal metric closure; squad `Stat`/`.sd-panel` | Surface + Section + Metric presentation primitives, with shared tokens. |
| Score/attendance | Weekly and BoyMarks duplicate toggles/number fields with different widths, semantics and save bars | `AttendanceField`, `ScoreField`, `MarksRow`, `SaveBar`; preserve 3-state weekly vs 2-state existing-record rules. |
| Form fields | BoyForm, account, settings, calendar, import, PDF range, passkey rename | `Field` owns label/help/error IDs; native Input/Select/RadioGroup/Checkbox own control geometry. |
| Feedback | Global timed toast; inline red paragraphs; portal alert+retry; archive errors via toast then empty list | Inline persistent ErrorState and success StatusMessage; toast supplemental. |
| Destruction | Member Modal, typed new-session Modal, portal reset Modal, squad inline confirmation, in-memory mark removal | One confirmation family with risk-specific language and retained typed confirmation for session archive. |
| Loading/empty | Skeleton; plain Loading text; Suspense `null`; large illustration-like icons; small inline paragraphs | `PageState` variants plus compact list/section states. |
| Dates/numbers | Native date fields, locale-default staff dates, en-GB/London calendar, UTC squad dates; numbers with varied formatting | Formatting helpers for display vs stored date-only values; retain London scheduling semantics. |

## Supporting modules

`useAuthAndRole`, `useSectionManagement`/`sectionStorage`, `useAppData`, `useUnsavedChangesProtection`, `useToastNotifications` and `rosterFilters` carry cross-page state. `services/db`, `settings`, `sessions`, `importFromSession`, `supabaseAuth`, `passkeyMigration`, `portal`, `squadDashboard` and `sectionSquads` define the data/permission/date constraints the redesign must retain. The weekly `SavePlan`, `Dates` and `DateChange` helpers are already isolated and unit-tested. Prefer preserving these boundaries while replacing duplicated visual markup.

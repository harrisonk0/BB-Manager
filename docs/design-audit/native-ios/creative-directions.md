# Three creative directions

The shared requirement is an iPhone-first application, not three desktop dashboards with different accents. All directions preserve the Boys’ Brigade identity, Company/Junior distinction, readable content, explicit three-state attendance, existing permissions and score rules. Navigation arrangements below are design hypotheses; production route and authorization changes require the migration tests.

The [initial generated board](../../../prototypes/native-ios/concepts/initial-directions.png) was insufficiently native and was rejected. [Revised three-direction board](../../../prototypes/native-ios/concepts/revised-directions.png) illustrates the distinct compositions. Generated study copy (including invented Company names/Year 7 labels) is not a data specification; the coded prototype uses valid Company years and consistent records. These revised directions specify the native structure behind the appearance. The [revised Assembly reference](../../../prototypes/native-ios/concepts/native-reference.png) and working prototype are the primary implementation study.

## 1. Assembly — the Company in your pocket

**Personality:** composed, practical and unmistakably application-like. Think the legibility of Contacts, the hierarchy of Settings and the immediacy of a well-designed attendance tool. No dashboard hero, ornamental glass cards or competing visual identities.

**Colour and typography:** cool grouped canvas `#F2F2F7`, white content, near-black ink, core BB blue `#224B8E`, navy `#2D395A`. Company sub-brand `#202944`, Junior `#145091`, official section artwork intact. Use Apple’s system font on Apple platforms, a dependable licensed sans fallback elsewhere. Compact 30–34px large titles; ordinary names 15–16px, supporting labels 12–15px, tabular score numerals.

**Navigation:** four stable staff tabs: Members, Marks, Squad, More. Calendar is available through More and in the wider sidebar; the first three destinations prioritise the user’s stated frequent tasks. Leader tabs: Home, Squad, Calendar, More. Ordinary boys: Home, Calendar, More. Junior has no Company calendar. This staff Calendar trade-off needs officer testing before committing to production. Preserve each tab’s search, filters, scroll and drafts. Large layouts gain an iPad-like sidebar; complex edits become bounded full-height sheets on phones and dialogs on larger screens.

**Lists and forms:** grouped rosters replace per-person cards and repeated action toolbars. One tappable row opens history and contextual editing. Marks become a focused meeting workspace: date, recorded progress, squad scope, then names with numeric input and explicit attendance. Destructive actions live in a confirmation sheet, away from rapid recording. Settings uses familiar icon/label/value/chevron rows; switches have a proper 44px target.

**Surfaces:** opaque content with fine inset rules. One navy metric surface per report, not a collection of competing statistics tiles. Blur belongs to floating navigation and modal separation. Controls use white selected segments on neutral tracks. No refraction simulation, nested card frames or image-generated UI assets in the working application.

**Motion:** short pressed feedback, a brief page arrival, sheet entry and a moving switch thumb. No scroll hijacking, swipe-to-dismiss dependency, looping decoration or artificial haptics. Reduced-motion and solid-surface alternatives are first-class.

**Why BB-Manager:** frequent small actions become predictable. Staff, boys and leaders use the same components while seeing different content. The system remains clear in a bright hall and accommodates longer names, Junior fields and dense reporting.

**Trade-offs:** requires restraint to keep the brand distinctive; avoid falling back to “rounded white boxes everywhere.” Moving Calendar behind More may be wrong for some officers. A genuinely usable dark appearance is a separate design/contrast exercise, not a filter over the light palette. Web sheets can be excellent but do not inherit UIKit’s gestures, keyboard avoidance or transition physics.

## 2. Fieldbook — a beautifully kept Company journal

**Personality:** warm, humane and editorial, inspired by excellent native journals and agenda applications. Its organising idea is the meeting, not a module dashboard.

**Colour and typography:** warm paper `#F7F5EF`, deep ink `#202944`, BB blue links and restrained bronze annotations. System sans for every control and record; an optional system serif such as New York/Georgia only for short editorial headings. Metric numerals remain sans and tabular. No distressed paper textures, cursive lettering or novelty fonts.

**Navigation:** Tonight, People, More for staff. Tonight puts the selected meeting and attendance action first, with events below; People is a fast searchable roster. Squad reporting is a clear destination within Tonight/More with its own preserved state. Leader Home leads with the selected meeting and own-squad list. Tablet becomes an agenda master/detail workspace instead of a card grid. These changes are more ambitious IA exploration and require task-frequency validation.

**Lists and forms:** open, finely ruled lists with date margins and compact section captions; fewer enclosed groups than Assembly. Meeting entry opens a focused full-screen task with a pinned Save action. Member history reads like a chronological log with expandable dated entries. Settings still uses the same control grammar and touch targets, with warmer separators and quieter icon tiles.

**Surfaces:** the page itself is the main surface. A sheet sits above it; selection adds a subtle blue wash, not a new card. Only task navigation may use translucency. Company/Junior artwork appears on the section chooser; the Junior blue is accompanied by a text label so identity never depends on hue.

**Motion:** deliberate list-to-entry continuity and expandable history, minimal opacity changes. Reduced motion substitutes immediate selection and expansion. No page curls or skeuomorphic notebook effects.

**Why BB-Manager:** officers think in Friday nights and individual people. An agenda-first opening can put the immediate job first and make calendar information unusually natural.

**Trade-offs:** the most consequential navigation change; a Tonight hub can obscure non-meeting administration or force extra travel to reporting. Serif headlines risk feeling editorial rather than unmistakably iOS. Warmth needs careful contrast in bright conditions. It is a valid alternative direction, not a second theme for Assembly.

## 3. Night Watch — a precise native instrument

**Personality:** confident, quiet and intensely focused. Inspired by native dark activity and music interfaces, with the density of a professional instrument rather than a futuristic control room.

**Colour and typography:** near-black navy `#111A2B`, grouped surfaces `#1D2940`, soft white text, BB light blue `#5D99D2` for selection. Desaturated green/red are reserved for labelled attendance states. System typography throughout; larger score numerals are the main visual emphasis. No neon, luminous outlines or gradient blobs.

**Navigation:** stable Members/Marks/Squad/More tabs, with Marks prominent in the initial task experience, not turned into a tab action. A compact top navigation title leaves more room for records. Tablet uses a dark sidebar and a selected-member inspector. Each role keeps the same underlying shell language and its authorized destinations.

**Lists and forms:** dense inset records with high-contrast names and large editable numbers. Attendance controls form a consistent, wide segmented strip below each person. The task accessory makes unsaved changes unmistakable. Reports combine a compact score summary, selected-week roster and restrained charts; settings uses dark native grouped rows.

**Surfaces:** distinguish layers through slightly lighter solids, fine rules and conservative elevation. Floating tabs can have a modest dark material. No translucent text-entry fields and no blur behind the actual data. Supply official white BB artwork on a suitable navy surface; use section names plus supplied Company/Junior marks on a suitable opaque backing.

**Motion:** precise selection changes and immediate numeric feedback; a short sheet lift. No animated score counters that delay reading, no bouncy charts and no ambient glows. All effects have static alternatives.

**Why BB-Manager:** expressive and distinctive, with strong focus during an evening meeting. It could make marks entry feel like a purpose-built instrument.

**Trade-offs:** dark-first is weaker in a bright hall, print previews and some low-vision settings. It needs a fully designed light counterpart before becoming the default. Soft light-blue controls must meet non-text contrast, and dark interfaces can accidentally hide disabled states and borders. Highest theme/QA cost of the three.

## Recommendation

Develop **Assembly** first. It best meets the request for an unmistakably native everyday iPhone application while keeping rapid attendance, readable histories and administrative clarity central. Its visual ambition comes from consistent composition, responsive controls and the removal of competing patterns. It also adapts cleanly to boys’ personal pages and richer leader reports.

Fieldbook offers the strongest alternative information architecture. Night Watch offers the strongest alternative visual personality. Neither is merely Assembly with a different accent. Do not combine all three: the result would reintroduce the inconsistency the audit found.

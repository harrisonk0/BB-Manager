# Foundations

## Source of truth

`styles/design-system.css` is the production token source. `components/ui/NativeAppProvider.tsx` installs Framework7 9.2's iOS theme and only the tabs, sheet, searchbar and toggle modules used by the shared system. The application entry imports token CSS after Framework7 CSS. Do not initialise a second app in a page or feature.

## Typography

`--bb-font`: `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`. Apple devices use the system typeface; no proprietary font or SF Symbol files are distributed. Ordinary controls and inputs use 17px, secondary descriptions 15px, sheet headings 22px, native large titles 34px (32px below 360px). Body line height should be approximately 1.4–1.5. Native tab captions are the limited small-text exception; data labels must not imitate those captions.

Use `font-variant-numeric: tabular-nums` (`.bb-numeric`) for marks, comparisons and metrics. Input text remains at least 16px to avoid iOS Safari's automatic field zoom. Keep the large-title hierarchy economical; never add a hero above a meeting task.

## Semantic colour

| Token                                    | Default                     | Meaning                                        |
| ---------------------------------------- | --------------------------- | ---------------------------------------------- |
| `--bb-company`                           | `#224b8e`                   | Official Company identity                      |
| `--bb-junior`                            | `#006e63`                   | Junior workspace identity                      |
| `--bb-brand` / `--bb-accent`             | Company; Junior when scoped | Interactive emphasis                           |
| `--bb-ink` / `--bb-text`                 | `#101116`                   | Primary foreground                             |
| `--bb-secondary` / `--bb-text-secondary` | `#62646f`                   | Readable supporting text                       |
| `--bb-canvas` / `--bb-surface-secondary` | `#f2f2f7`                   | Grouped page background                        |
| `--bb-surface`                           | White                       | Opaque data/form surfaces                      |
| `--bb-divider`                           | 16% dark neutral            | Fine separators; never sole essential boundary |
| `--bb-danger`                            | `#b42332`                   | Destructive/error foreground                   |
| `--bb-success`                           | `#146b43`                   | Confirmed success                              |
| `--bb-warning`                           | `#775100`                   | Attention required                             |

Status surfaces have matching `*-surface` and `*-soft` aliases. Section scope is `[data-section='junior']` or `.section-junior`; Company is the default. Place scope around the app content and its overlay host so sheets inherit the active identity. Tokens identify presentation, never grant authority. Do not express attendance only through colour; include text or accessible names. Normal text contrast must meet 4.5:1; large text and meaningful nontext indicators 3:1. Faint separators are decorative.

## Geometry and spacing

Spacing tokens `--bb-space-1/2/3/4/5/6/8` map to 4/8/12/16/20/24/32px. Base page gutter `--bb-gutter` is 16px, 32px from 768px. `--bb-content-max` is 1100px. Shared page bodies own gutters; avoid adding nested full-page padding.

Controls use `--bb-radius-control` 16px, inset groups `--bb-radius-group` 26px, sheets `--bb-radius-sheet` 36px, pills `--bb-radius-pill`. Do not invent a new radius per card. Shared buttons are at least 48px tall; switches and icon actions retain a minimum 44px touch area. Multi-line labels must wrap.

## Materials, layering and motion

Navigation uses the Framework7 iOS material plus `--bb-shadow-navigation`. Forms, rosters and sheets use opaque surfaces. The save accessory sits at z-index 6001, above native View layers; modal/backdrop layers remain Framework7-owned.

`--bb-motion-fast` is 140ms; `--bb-motion-standard` 260ms; `--bb-motion-ease` is `cubic-bezier(.2,.8,.2,1)`. Framework7 owns native navigation transitions. Reduced motion disables long visual transitions and spinner movement while retaining textual loading state. Do not add independent page animation around a Framework7 Page.

## Safe areas and adaptation

`--bb-safe-top/bottom` use `env(safe-area-inset-*)`. `--bb-navigation-clearance` reserves 110px for phone floating navigation, 40px above 768px. Keyboard adaptation belongs to the shell; neither controls nor sheets hijack browser scrolling. Sheets constrain their content to 94dvh on phones, 86dvh on tablets. Test focus with the real iOS keyboard; desktop emulation does not prove keyboard avoidance.

Settings and account form containers use `.bb-form-container` with `--bb-reading-max:42rem`. This caps long form lines on iPad/desktop while preserving full phone width; reporting/chart containers retain the wider page width.

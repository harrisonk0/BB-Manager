# Mobile-first composition

The shared token source is `styles/design-system.css`; `components/ui` owns Framework7 controls. Feature content sits under shell-owned navigation and one scrolling page. Build at390px, then verify320,375,430,768,1024,1440px. Use16px phone gutters and shared content maximums; tablet navigation becomes a sidebar. Data tables scroll inside labelled, keyboard-focusable regions rather than increasing document width.

Roster uses grouped rows, persistent section-specific filters and disclosures. Marks puts explicit three-state attendance and numeric score entry beside each member, with a safe-area-aware Save accessory. Reports use readable values first, then charts/tables. Settings use grouped rows/fields. Shared sheets adapt rather than squeezing a desktop modal onto a phone.

Touch targets are at least44×44px, independently of icon/track size. Inputs use at least16px text. Large titles must collapse naturally without consuming an entire screen. Fine separators and grouped surfaces establish hierarchy; do not nest decorative cards. Keep frequent actions within comfortable reach and preserve keyboard/scroll access to lower content.

Inspect long names, empty states,30/100-member rosters, keyboard focus, validation, pending saves, network errors and both sections. Passing document overflow is necessary but does not establish usable composition. Review actual images and interactions against approved Variant A captures in `prototypes/ios26/evidence`.

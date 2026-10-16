# BB Manager — native iOS 26 experiments

Two working, isolated implementations extend the Assembly work in PR #54. Production is untouched. The recommendation is **Framework7 Native**, because actual navigation and page/sheet coordination make the strongest contribution to the requested SwiftUI-like feel. **Assembly Native+** remains a credible lighter alternative.

| Review | Implementation |
| --- | --- |
| Variant A — Framework7 Native | `prototypes/ios26/framework7.html`: Framework7 9.2 iOS theme, real page stacks, large navigation, ToolbarPane, lists, controls and Sheet |
| Variant B — Assembly Native+ | `prototypes/ios26/native-plus.html`: Konsta 5.5 components, React navigation and Vaul sheets |

Both demonstrate Members/search/grouping/filter/detail/editor, Weekly Marks with three attendance states and explicit Save feedback, dated Squad Leader reporting, grouped Settings, workspace choice and destructive confirmation. They share synthetic fixtures and task logic. NCO ranks reflect current production eligibility and are independent from squad leadership.

Start with [running and reviewing the prototypes](../../../prototypes/ios26/README.md). Phone preview deployment details are in [preview.md](preview.md); share-enabled links are supplied in the review conversation.

- [Authentic iOS 26 references and feasible web behaviours](reference-analysis.md)
- [Actual component research, MCP use and compatibility](library-assessment.md)
- [Evidence-based comparison and recommendation](comparison.md)
- [Screenshot matrix, interactions, limitations and iteration](validation.md)
- [Refined design system, old/new flows and full-parity migration strategy](design-system-and-migration.md)

The original [three creative directions](../native-ios/creative-directions.md), [official brand provenance](../native-ios/research-and-branding.md) and [PR #53 audit](../README.md) remain available. New native fidelity goals supersede conservative visual prescriptions, while all verified audit defects remain mandatory acceptance criteria. No production migration or merge is authorised by this review.

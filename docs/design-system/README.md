# BB-Manager design system

Framework7 Native is the approved production frontend foundation. This documentation tracks the implementation and verification of the migration from production baseline `e060fce`. Approved reference: PR #54 Variant A. Backend/auth/domain contracts remain authoritative.

These pages describe the implemented production frontend. The review and audit registers distinguish source review, automated synthetic verification, CI and the live/device release gates still pending.

- [Principles](principles.md) · [Foundations and tokens](foundations.md) · [Components](components.md)
- [Navigation](navigation.md) · [Mobile-first layouts](mobile-first.md) · [Accessibility](accessibility.md)
- [Interactions and motion](interactions-and-motion.md) · [Workflow patterns](patterns-and-workflows.md)
- [PWA and iOS](pwa-and-ios.md) · [Testing](testing-and-regressions.md) · [Contributing](contributing.md)
- [Source-backed feature parity](feature-parity.md) · [Audit acceptance](audit-acceptance.md)
- [Migration report and device checklist](migration-report.md)
- [Independent review register](review-register.md) · [Security review](security-review.md) · [Performance](performance.md)

Never put real member data in examples or screenshots. Synthetic browser fixtures must deny external network access and must not become production authentication bypasses.

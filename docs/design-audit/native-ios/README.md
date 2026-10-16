# BB-Manager — native iOS creative direction

The subsequent [iOS 26 fidelity experiments](../ios26/README.md) compare Framework7 Native with Assembly Native+. They extend this original direction without replacing its prototype.

16 October 2026 · Isolated design exploration following [PR #53](https://github.com/harrisonk0/BB-Manager/pull/53).

**Recommendation: Assembly.** Make BB-Manager a task-focused application built around a roster, a marks workspace and a readable squad report. System typography, inset grouped lists, explicit selection, adaptive sheets and a quiet functional navigation layer make the whole product feel related. Branding supplies identity; it does not compete with the work.

This direction supersedes the original audit’s conservative visual recommendations. Its verified defects and all existing data, security and accessibility constraints remain mandatory. The prototype does not replace or connect to the production application.

## Review the working design

From the repository root:

```sh
npm ci
npx vite --config prototypes/native-ios/vite.config.mts
```

Open these on the development machine:

- [Staff roster](http://127.0.0.1:4175/?page=members)
- [Weekly Marks](http://127.0.0.1:4175/?page=marks)
- [Squad Leader](http://127.0.0.1:4175/?page=squad&role=leader)
- [Settings](http://127.0.0.1:4175/?page=more)
- [Junior marks](http://127.0.0.1:4175/?page=marks&section=junior)
- [Ordinary boy portal](http://127.0.0.1:4175/?page=mine&role=boy)

For phone access, use the Vercel share link supplied in this chat; it opens the isolated prototype without a Vercel login. [Deployment verification](../../../prototypes/native-ios/evidence/phone-preview.json) records the published source and checks. Production is unchanged. A localhost URL still requires the development server and is not phone-accessible. Captured screens are available without running it. Start with [focused marks and its Save action](../../../prototypes/native-ios/evidence/screenshots/focused-marks-390.png), the [390px roster](../../../prototypes/native-ios/evidence/screenshots/members-390.png), [marks](../../../prototypes/native-ios/evidence/screenshots/marks-390.png), [leader report](../../../prototypes/native-ios/evidence/screenshots/leader-390.png), [filter sheet](../../../prototypes/native-ios/evidence/screenshots/filters-390.png), and [1440px adaptation](../../../prototypes/native-ios/evidence/screenshots/members-1440.png).

Use invented data freely: search, filter, add/edit a member, inspect history, select attendance, change a score, save, change dates, select a chart week, and toggle motion/transparency preferences. About this prototype, available from Settings, switches role or simulates a failed connection. Reload resets every edit. No account or database is connected.

## Deliverables

1. [Three creative directions and recommendation](creative-directions.md).
2. [Research, official branding and web-platform limits](research-and-branding.md).
3. [Shared design system and interaction specification](design-system.md).
4. [Application-wide migration roadmap and mandatory audit gates](migration-roadmap.md).
5. [Visual inspection, iterations and validation limits](validation.md).
6. [Prototype source and operating instructions](../../../prototypes/native-ios/README.md).

The first generated comparison was rejected by the user for looking insufficiently native. It is retained as a superseded study, not evidence of approval. The revised native reference guided the coded screens; the browser captures show what actually works. Neither the generated reference nor this recommended direction is represented as user-approved.

**Review boundary:** approve or revise the visual direction and prototype before production migration is scheduled. This branch adds only prototype/research files. Merging it would not activate the redesign.

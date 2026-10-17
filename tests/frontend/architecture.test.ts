import { afterEach, describe, it, expect } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
const folders: string[] = [];
afterEach(() => {
  for (const folder of folders.splice(0))
    rmSync(folder, { recursive: true, force: true });
});
function check(
  source: string,
  file = "components/Feature.tsx",
  exceptions: unknown[] = [],
) {
  const root = mkdtempSync(path.join(tmpdir(), "bb-design-check-"));
  folders.push(root);
  mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  writeFileSync(path.join(root, file), source);
  writeFileSync(
    path.join(root, "package.json"),
    JSON.stringify({ dependencies: { react: "19" } }),
  );
  mkdirSync(path.join(root, "docs/design-system"), { recursive: true });
  writeFileSync(
    path.join(root, "docs/design-system/architecture-exceptions.json"),
    JSON.stringify(exceptions),
  );
  return spawnSync(
    process.execPath,
    [path.resolve("scripts/design-system-check.mjs")],
    { cwd: root, encoding: "utf8" },
  );
}
describe("design-system architectural safeguards", { timeout: 20_000 }, () => {
  it("rejects competing static and dynamic component imports", () => {
    expect(check('import {Drawer} from "vaul";').status).toBe(1);
    expect(check('const ui=import("@ionic/react");').status).toBe(1);
  });
  it("requires features to use shared Framework7 adapters", () => {
    expect(check('import {Button} from "framework7-react";').status).toBe(1);
    expect(check('const ui=import("framework7-react");').status).toBe(1);
    expect(check('import Framework7 from "framework7/lite";').status).toBe(1);
    expect(
      check('import Toggle from "framework7/components/toggle";').status,
    ).toBe(1);
    expect(check('const native=import("framework7");').status).toBe(1);
    expect(
      check("const native=import(`framework7/components/sheet`);").status,
    ).toBe(1);
    expect(check("const ui=import(`framework7-react`);").status).toBe(1);
    expect(
      check(
        'import {Button} from "framework7-react";',
        "components/ui/Controls.tsx",
      ).status,
    ).toBe(0);
    expect(check('import {NativeButton} from "./ui";').status).toBe(0);
  });
  it("prevents production imports of synthetic fixtures and prototypes", () => {
    expect(
      check('import fixtures from "../tests/frontend/fixtures/backend";')
        .status,
    ).toBe(1);
    expect(
      check('const fixture=import("@/prototypes/ios26/src/model");').status,
    ).toBe(1);
    expect(check('import {saveBoyMarks} from "../services/db";').status).toBe(
      0,
    );
  });
  it("does not mistake source text or comments for imports", () => {
    expect(
      check(
        '// import {Drawer} from "vaul";\nconst explanation="vaul is not a production dependency";',
      ).status,
    ).toBe(0);
  });
  it("accepts only scoped reviewed unexpired exceptions", () => {
    const item = {
      file: "components/Feature.tsx",
      rule: "single-ui-foundation",
      reason:
        "Documented isolated compatibility experiment requiring independent approval",
      reviewedBy: "Independent reviewer",
      expires: "2099-01-01",
    };
    expect(
      check('import {Drawer} from "vaul";', undefined, [item]).status,
    ).toBe(0);
    expect(
      check('import {Drawer} from "vaul";', undefined, [
        { ...item, expires: "2020-01-01" },
      ]).status,
    ).toBe(1);
    expect(
      check('import {Drawer} from "vaul";', undefined, [
        { ...item, file: "components/Other.tsx" },
      ]).status,
    ).toBe(1);
  });
});

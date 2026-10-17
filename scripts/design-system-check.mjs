import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

// Syntax-tree checks enforce architecture, not subjective aesthetics.
const root = process.cwd();
const banned =
  /^(konsta|vaul|@ionic\/react|liquid-glass-react|website-glass|@headlessui\/react|@radix-ui\/react-dialog)(\/|$)/;
const exceptionsPath = path.join(
  root,
  "docs/design-system/architecture-exceptions.json",
);
const exceptions = fs.existsSync(exceptionsPath)
  ? JSON.parse(fs.readFileSync(exceptionsPath, "utf8"))
  : [];
const errors = [];
const allow = (file, rule) =>
  exceptions.some(
    (item) =>
      item.file === file &&
      item.rule === rule &&
      typeof item.reason === "string" &&
      item.reason.length > 20 &&
      item.reviewedBy &&
      item.expires &&
      new Date(item.expires) >= new Date(),
  );
const report = (file, rule, detail) => {
  if (!allow(file, rule)) errors.push(`${file}: ${rule}: ${detail}`);
};
function walk(directory) {
  if (!fs.existsSync(directory)) return;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (
      /\.[jt]sx?$/.test(entry.name) &&
      !/\.(test|spec)\./.test(entry.name)
    )
      inspect(full);
  }
}
function inspect(full) {
  const file = path.relative(root, full).split(path.sep).join("/");
  const source = ts.createSourceFile(
    file,
    fs.readFileSync(full, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  function checkProductionBoundary(specifier) {
    const resolved = specifier.startsWith("@/")
      ? path.resolve(root, specifier.slice(2))
      : specifier.startsWith(".")
        ? path.resolve(path.dirname(full), specifier)
        : null;
    if (
      resolved &&
      /^(tests|prototypes)(\/|$)/.test(
        path.relative(root, resolved).split(path.sep).join("/"),
      )
    )
      report(
        file,
        "production-boundary",
        "Production modules may not import synthetic fixtures, test harnesses or design prototypes.",
      );
  }
  function visit(node) {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      const imported = node.moduleSpecifier;
      if (
        imported &&
        (ts.isStringLiteral(imported) ||
          ts.isNoSubstitutionTemplateLiteral(imported))
      )
        checkProductionBoundary(imported.text);
      if (
        imported &&
        (ts.isStringLiteral(imported) ||
          ts.isNoSubstitutionTemplateLiteral(imported)) &&
        banned.test(imported.text)
      )
        report(
          file,
          "single-ui-foundation",
          `Competing UI import ${imported.text}`,
        );
      if (
        imported &&
        (ts.isStringLiteral(imported) ||
          ts.isNoSubstitutionTemplateLiteral(imported)) &&
        /^framework7(?:-react)?(?:\/|$)/.test(imported.text) &&
        !/^components\/(ui|shell)\//.test(file)
      )
        report(
          file,
          "framework7-ownership",
          "Import shared components/ui adapters; Framework7 DOM/lifecycle ownership belongs to ui or shell.",
        );
    }
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments[0] &&
      (ts.isStringLiteral(node.arguments[0]) ||
        ts.isNoSubstitutionTemplateLiteral(node.arguments[0])) &&
      banned.test(node.arguments[0].text)
    )
      report(
        file,
        "single-ui-foundation",
        `Competing dynamic UI import ${node.arguments[0].text}`,
      );
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments[0] &&
      (ts.isStringLiteral(node.arguments[0]) ||
        ts.isNoSubstitutionTemplateLiteral(node.arguments[0]))
    )
      checkProductionBoundary(node.arguments[0].text);
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments[0] &&
      (ts.isStringLiteral(node.arguments[0]) ||
        ts.isNoSubstitutionTemplateLiteral(node.arguments[0])) &&
      /^framework7(?:-react)?(?:\/|$)/.test(node.arguments[0].text) &&
      !/^components\/(ui|shell)\//.test(file)
    )
      report(
        file,
        "framework7-ownership",
        "Dynamic Framework7 imports must remain within shared UI/shell ownership.",
      );
    ts.forEachChild(node, visit);
  }
  visit(source);
}
for (const dependency of Object.keys(
  JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"))
    .dependencies ?? {},
))
  if (banned.test(dependency))
    report(
      "package.json",
      "single-ui-foundation",
      `Competing UI runtime dependency ${dependency}`,
    );
walk(path.join(root, "components"));
walk(path.join(root, "hooks"));
walk(path.join(root, "services"));
for (const entry of ["App.tsx", "index.tsx"])
  if (fs.existsSync(path.join(root, entry))) inspect(path.join(root, entry));
if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else
  console.log(
    "Design-system architecture checks passed (AST imports and runtime dependencies).",
  );

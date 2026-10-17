import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import ts from "typescript";
const directory = path.resolve(process.argv[2] ?? "dist");
const html = fs.readFileSync(path.join(directory, "index.html"), "utf8");
const entry = [...html.matchAll(/<script\b[^>]*src="([^"]+)"/g)].map(
  (match) => match[1],
);
const css = [...html.matchAll(/<link\b[^>]*href="([^"]+\.css)"/g)].map(
  (match) => match[1],
);
const visited = new Set();
function visit(url) {
  const local = url.replace(/^\//, "");
  if (visited.has(local)) return;
  visited.add(local);
  if (!local.endsWith(".js")) return;
  const source = ts.createSourceFile(
    local,
    fs.readFileSync(path.join(directory, local), "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS,
  );
  for (const statement of source.statements) {
    if (
      (ts.isImportDeclaration(statement) ||
        ts.isExportDeclaration(statement)) &&
      statement.moduleSpecifier &&
      ts.isStringLiteral(statement.moduleSpecifier)
    ) {
      const imported = statement.moduleSpecifier.text;
      if (imported.startsWith("."))
        visit(path.posix.join(path.posix.dirname(local), imported));
    }
  }
}
entry.forEach(visit);
css.forEach(visit);
const output = {
  entry: entry.map((value) => value.replace(/^\//, "")),
  initial: [...visited].sort().map((file) => {
    const bytes = fs.readFileSync(path.join(directory, file));
    return {
      file,
      bytes: bytes.length,
      gzip: zlib.gzipSync(bytes, { level: 9 }).length,
    };
  }),
  method:
    "HTML entry + static ECMAScript import/export graph only; excludes dynamic imports, images and optional fonts; gzip level 9",
};
output.total = output.initial.reduce(
  (sum, file) => ({
    bytes: sum.bytes + file.bytes,
    gzip: sum.gzip + file.gzip,
  }),
  { bytes: 0, gzip: 0 },
);
console.log(JSON.stringify(output, null, 2));

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const sourceRoot = join(root, "src");
const mdiCssPath = join(
  root,
  "node_modules/@mdi/font/css/materialdesignicons.css"
);
const mdiFontPath = join(
  root,
  "node_modules/@mdi/font/fonts/materialdesignicons-webfont.ttf"
);
const vuetifyAliasesPath = join(root, "node_modules/vuetify/lib/iconsets/mdi.js");
const outputCssPath = join(sourceRoot, "assets/mdi-subset.css");
const outputFontDirectory = join(sourceRoot, "assets/fonts");
const outputFontPath = join(
  outputFontDirectory,
  "materialdesignicons-subset.woff2"
);
const supportedExtensions = new Set([".vue", ".js", ".css"]);
const iconPattern = /mdi-[a-z0-9-]+/g;

const sourceText = collectSourceText(sourceRoot);
const aliasText = readFileSync(vuetifyAliasesPath, "utf8");
const iconNames = [...new Set([
  ...(sourceText.match(iconPattern) || []),
  ...(aliasText.match(iconPattern) || []),
])].sort();
const ignoredIconNames = new Set(["mdi-set", "mdi-subset"]);
const filteredIconNames = iconNames.filter((name) => !ignoredIconNames.has(name));
const fullCss = readFileSync(mdiCssPath, "utf8");
const iconBlocks = [];
const unicodes = [];

for (const iconName of filteredIconNames) {
  const escapedName = iconName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = fullCss.match(
    new RegExp(`\\.${escapedName}::before \\{\\s*content: "\\\\([A-F0-9]+)";\\s*\\}`)
  );

  if (!match) {
    throw new Error(`No se encontró el glifo ${iconName}.`);
  }

  unicodes.push(`U+${match[1]}`);
  iconBlocks.push(`.${iconName}::before {\n  content: "\\${match[1]}";\n}`);
}

mkdirSync(outputFontDirectory, { recursive: true });
writeFileSync(
  outputCssPath,
  `/* Generado por scripts/generate-mdi-subset.mjs. */\n` +
    `@font-face {\n` +
    `  font-family: "Material Design Icons";\n` +
    `  src: url("./fonts/materialdesignicons-subset.woff2") format("woff2");\n` +
    `  font-weight: normal;\n` +
    `  font-style: normal;\n` +
    `  font-display: block;\n` +
    `}\n\n` +
    `.mdi::before,\n.mdi-set {\n` +
    `  display: inline-block;\n` +
    `  font: normal normal normal 24px/1 "Material Design Icons";\n` +
    `  font-size: inherit;\n` +
    `  line-height: inherit;\n` +
    `  text-rendering: auto;\n` +
    `  -webkit-font-smoothing: antialiased;\n` +
    `  -moz-osx-font-smoothing: grayscale;\n` +
    `}\n\n` +
    `${iconBlocks.join("\n\n")}\n`
);

execFileSync(process.env.PYFTSUBSET || "pyftsubset", [
  mdiFontPath,
  `--output-file=${outputFontPath}`,
  `--unicodes=${unicodes.join(",")}`,
  "--flavor=woff2",
  "--layout-features=*",
  "--no-hinting",
], { stdio: "inherit" });

console.log(`Generados ${filteredIconNames.length} iconos en ${outputFontPath}.`);

function collectSourceText(directory) {
  return readdirSync(directory)
    .flatMap((name) => {
      const path = join(directory, name);
      const stats = statSync(path);

      if (stats.isDirectory()) {
        return collectSourceText(path);
      }

      return supportedExtensions.has(extname(name))
        ? readFileSync(path, "utf8")
        : "";
    })
    .join("\n");
}

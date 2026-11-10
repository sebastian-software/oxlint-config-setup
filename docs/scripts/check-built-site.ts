import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { expectedInstallCommand } from "../../scripts/expected-toolchain.js";
import { SCOPED_CONFIGS } from "../../src/composition.js";
import { CONFIG_LEVELS } from "../../src/levels.js";

const clientDirectory = resolve(import.meta.dirname, "../build/client");

if (!existsSync(clientDirectory)) {
  throw new Error(`Missing static client output: ${clientDirectory}`);
}

function collectFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? collectFiles(path) : [path];
  });
}

const files = collectFiles(clientDirectory);
const htmlFiles = files.filter((file) => file.endsWith(".html"));
const normalizedRoutes = htmlFiles.map((file) =>
  relative(clientDirectory, file).replaceAll("\\", "/"),
);

function requireRoute(suffix: string): void {
  if (!normalizedRoutes.some((route) => route.endsWith(suffix))) {
    throw new Error(
      `Missing static route ending in ${suffix}. Generated routes:\n${normalizedRoutes.join("\n")}`,
    );
  }
}

for (const route of [
  "index.html",
  "guide/getting-started/index.html",
  "guide/ai-mode/index.html",
  "guide/companion-quality/index.html",
  "reference/rule-catalog/index.html",
  "api-reference/index.html",
]) {
  requireRoute(route);
}

const renderedHtml = htmlFiles
  .map((file) => readFileSync(file, "utf8"))
  .join("\n");

for (const expected of [
  'lang="en-US"',
  "Type-aware by default",
  "Type-aware TypeScript.",
  expectedInstallCommand,
  "AI is an overlay, not a fourth policy level.",
  "Config input",
  "Config output",
  "typescript/no-floating-promises",
  "Rule Catalog",
  "Companion quality stack",
  "Toggle theme",
]) {
  if (!renderedHtml.includes(expected)) {
    throw new Error(`Static output is missing required content: ${expected}`);
  }
}

// Ardo resolves indexed-access aliases from their authoritative readonly tuples.
// Require the generated Values code block, rather than duplicate authored lists.
for (const [page, choices] of [
  ["configlevel", CONFIG_LEVELS],
  ["scopedconfig", SCOPED_CONFIGS],
] as const) {
  const apiPage = htmlFiles.find((file) =>
    file.replaceAll("\\", "/").endsWith(`/api-reference/types/${page}/index.html`),
  );
  if (!apiPage) throw new Error(`Missing public API alias page: ${page}`);
  const html = readFileSync(apiPage, "utf8");
  const codeBlocks = [...html.matchAll(/<pre\b[^>]*>[\s\S]*?<\/pre>/g)].map(([block]) =>
    block.replace(/<[^>]+>/g, "").replaceAll("&quot;", '"'),
  );
  if (!codeBlocks.some((block) => choices.every((choice) => block.includes(`"${choice}"`)))) {
    throw new Error(`Public API ${page} omits its generated literal Values: ${choices.join(", ")}`);
  }
}

console.log(
  `Verified ${htmlFiles.length} static HTML pages and the homepage product contract.`,
);

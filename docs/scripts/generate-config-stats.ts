import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { renderConfigStats } from "./config-stats.js";

const outputDirectory = resolve(import.meta.dirname, "../app/generated");
mkdirSync(outputDirectory, { recursive: true });
writeFileSync(
  resolve(outputDirectory, "config-stats.json"),
  renderConfigStats(),
  "utf8",
);

console.log("Generated 24 homepage configurations.");

const ruleCatalogSource = readFileSync(
  resolve(import.meta.dirname, "../../docs/rule-catalog.md"),
  "utf8",
);
const referenceDirectory = resolve(
  import.meta.dirname,
  "../app/routes/reference",
);
mkdirSync(referenceDirectory, { recursive: true });
writeFileSync(
  resolve(referenceDirectory, "rule-catalog.mdx"),
  [
    "---",
    "title: Rule Catalog",
    "description: Curated rule overrides, activation boundaries, rationale, fixtures, and ownership.",
    "order: 1",
    "---",
    "",
    ruleCatalogSource,
  ].join("\n"),
  "utf8",
);
console.log("Materialized the generated rule catalog for Ardo.");

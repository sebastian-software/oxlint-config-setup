import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { relative, resolve } from "node:path";

import { runProcess } from "./harness.js";

const repositoryRoot = resolve(import.meta.dirname, "..");
const defaultCorpusRoot = resolve(repositoryRoot, ".corpus");
const predecessorRevision = "4543246c62326047f7372765931f260f04beea56";
const oxlintRevision = "173812f";

export const deltaClassifications = [
  "native coverage",
  "optional-plugin candidate",
  "companion-tool concern",
  "accepted gap",
  "defect",
] as const;

export type DeltaClassification = (typeof deltaClassifications)[number];
type Tool = "eslint" | "oxlint";

export interface CorpusProject {
  id: string;
  repository: string;
  revision: string;
  paths: string[];
  predecessorOptions: { node?: true; react?: true };
  oxlintArtifact: string;
  rationale: string;
}

export const corpusProjects: readonly CorpusProject[] = [
  {
    id: "react-testing-library",
    repository: "https://github.com/testing-library/react-testing-library.git",
    revision: "be9d81d91314c9f0bafaa363f70b409b4b31989c",
    paths: ["src/pure.js", "src/act-compat.js"],
    predecessorOptions: { react: true },
    oxlintArtifact: "react",
    rationale: "React library whose public test API is exercised by Testing Library users.",
  },
  {
    id: "node-p-queue",
    repository: "https://github.com/sindresorhus/p-queue.git",
    revision: "180ab9e25cd10b6f548767d7176076b50d25e188",
    paths: ["source/index.ts", "source/queue.ts"],
    predecessorOptions: { node: true },
    oxlintArtifact: "node",
    rationale: "Small TypeScript Node.js library with a conventional source layout.",
  },
  {
    id: "turborepo-monorepo",
    repository: "https://github.com/vercel/turborepo.git",
    revision: "a98e5cde97796088c6107684a64a40a967cd1ef0",
    paths: ["examples/with-yarn/apps/web/app/page.tsx", "examples/with-yarn/packages/ui/src/card.tsx", "examples/with-yarn/packages/ui/turbo/generators/config.ts"],
    predecessorOptions: { node: true, react: true },
    oxlintArtifact: "react-node",
    rationale: "Public React and Node.js workspace; scoped paths keep the corpus small while preserving monorepo resolution.",
  },
  {
    id: "vitest",
    repository: "https://github.com/vitest-dev/vitest.git",
    revision: "c67d296f42f93ec888ff148e821877194969cea9",
    paths: ["packages/vitest/src/node/create.ts", "packages/vitest/src/node/config.ts"],
    predecessorOptions: { node: true },
    oxlintArtifact: "vitest",
    rationale: "The upstream Vitest implementation provides an executable test-runner project.",
  },
  {
    id: "playwright",
    repository: "https://github.com/microsoft/playwright.git",
    revision: "931121dc6f1ce8d672ce2bd5845220203cb98920",
    paths: ["tests/playwright-test/playwright-test.spec.ts", "tests/playwright-test/playwright-test-fixtures.ts"],
    predecessorOptions: { node: true },
    oxlintArtifact: "node",
    rationale: "The public Playwright repository is the suitable maintained source for Playwright-specific evidence.",
  },
];

export interface Diagnostic {
  classification: DeltaClassification;
  column: number;
  defectClass: string;
  file: string;
  fix: "available" | "none";
  line: number;
  rule: string;
  severity: "warning" | "error";
  tool: Tool;
}

export interface Delta {
  classification: DeltaClassification;
  defectClass: string;
  kind: "eslint-only" | "oxlint-only";
  diagnostics: Diagnostic[];
}

export interface ProjectReport {
  deltas: Delta[];
  diagnostics: { eslint: Diagnostic[]; oxlint: Diagnostic[] };
  id: string;
  matched: number;
  timings: Record<Tool, { coldMs: number; warmMs: number }>;
}

function command(binary: string, args: readonly string[], cwd: string): string {
  const result = spawnSync(binary, args, { cwd, encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`${binary} ${args.join(" ")} failed in ${cwd}: ${result.stderr || result.stdout}`);
  }
  return result.stdout;
}

function ensureCheckout(project: CorpusProject, corpusRoot: string): string {
  const destination = resolve(corpusRoot, "projects", project.id);
  if (!existsSync(destination)) {
    mkdirSync(resolve(corpusRoot, "projects"), { recursive: true });
    command("git", ["clone", "--filter=blob:none", "--no-checkout", project.repository, destination], corpusRoot);
  }
  command("git", ["fetch", "--depth", "1", "origin", project.revision], destination);
  command("git", ["checkout", "--detach", project.revision], destination);
  const actual = command("git", ["rev-parse", "HEAD"], destination).trim();
  if (actual !== project.revision) throw new Error(`${project.id} resolved ${actual}, not ${project.revision}`);
  return destination;
}

function verifiedCheckout(project: CorpusProject, corpusRoot: string): string {
  const destination = resolve(corpusRoot, "projects", project.id);
  if (!existsSync(destination)) throw new Error(`Missing ${project.id} checkout at ${destination}; rerun with --prepare.`);
  const actual = command("git", ["rev-parse", "HEAD"], destination).trim();
  if (actual !== project.revision) throw new Error(`${project.id} resolved ${actual}, not ${project.revision}; rerun with --prepare.`);
  return destination;
}

function provisionPredecessor(corpusRoot: string): string {
  const source = resolve(corpusRoot, "tools", "eslint-config-setup");
  if (!existsSync(source)) {
    mkdirSync(resolve(corpusRoot, "tools"), { recursive: true });
    command("git", ["clone", "--filter=blob:none", "--no-checkout", "https://github.com/sebastian-software/eslint-config-setup.git", source], corpusRoot);
  }
  command("git", ["fetch", "--depth", "1", "origin", predecessorRevision], source);
  command("git", ["checkout", "--detach", predecessorRevision], source);
  if (!existsSync(resolve(source, "node_modules"))) command("pnpm", ["install", "--frozen-lockfile"], source);
  command("pnpm", ["--filter", "eslint-config-setup", "build"], source);
  command("pnpm", ["--filter", "eslint-config-setup", "generate"], source);
  return source;
}

function verifiedPredecessor(corpusRoot: string): string {
  const source = resolve(corpusRoot, "tools", "eslint-config-setup");
  if (!existsSync(source)) throw new Error(`Missing predecessor checkout at ${source}; rerun with --prepare.`);
  const actual = command("git", ["rev-parse", "HEAD"], source).trim();
  if (actual !== predecessorRevision) throw new Error(`Predecessor resolved ${actual}, not ${predecessorRevision}; rerun with --prepare.`);
  return source;
}

function classificationFor(tool: Tool, rule: string): DeltaClassification {
  if (rule === "eslint/parse-error") return "defect";
  if (/^(?:cspell|json|mdx|package-json|prettier|perfectionist)\//u.test(rule)) return "companion-tool concern";
  if (/^(?:testing-library|playwright|storybook|regexp)\//u.test(rule)) return "optional-plugin candidate";
  if (tool === "oxlint") return "native coverage";
  return "accepted gap";
}

function defectClassFor(rule: string): string {
  const aliases: Record<string, string> = {
    "@typescript-eslint/no-floating-promises": "unhandled promise rejections",
    "typescript/no-floating-promises": "unhandled promise rejections",
    "eslint/no-duplicate-imports": "duplicate imports from one module",
    "import/no-duplicates": "duplicate imports from one module",
    "react/jsx-key": "unstable identity for rendered list children",
    "react-hooks/rules-of-hooks": "conditional or reordered React hook calls",
    "react/rules-of-hooks": "conditional or reordered React hook calls",
    "vitest/no-focused-tests": "focused Vitest cases committed to the suite",
    "eslint/parse-error": "predecessor parser-service incompatibility",
  };
  return aliases[rule] ?? `rule:${rule}`;
}

export function normalizeEslintDiagnostics(value: unknown, projectRoot: string): Diagnostic[] {
  if (!Array.isArray(value)) throw new TypeError("ESLint JSON output must be an array");
  return value.flatMap((entry) => {
    if (entry === null || typeof entry !== "object") return [];
    const item = entry as { filePath?: unknown; messages?: unknown };
    if (typeof item.filePath !== "string" || !Array.isArray(item.messages)) return [];
    const filePath = item.filePath;
    return item.messages.flatMap((message) => {
      if (message === null || typeof message !== "object") return [];
      const diagnostic = message as { column?: unknown; fix?: unknown; line?: unknown; ruleId?: unknown; severity?: unknown };
      const rule = typeof diagnostic.ruleId === "string" ? diagnostic.ruleId : "eslint/parse-error";
      return [{ classification: classificationFor("eslint", rule), column: Number(diagnostic.column) || 0, defectClass: defectClassFor(rule), file: relative(projectRoot, filePath), fix: diagnostic.fix === undefined ? "none" : "available", line: Number(diagnostic.line) || 0, rule, severity: diagnostic.severity === 2 ? "error" : "warning", tool: "eslint" as const }];
    });
  });
}

export function normalizeOxlintDiagnostics(value: unknown, projectRoot: string): Diagnostic[] {
  if (value === null || typeof value !== "object" || !Array.isArray((value as { diagnostics?: unknown }).diagnostics)) throw new TypeError("Oxlint JSON output is missing diagnostics");
  return (value as { diagnostics: unknown[] }).diagnostics.flatMap((entry) => {
    if (entry === null || typeof entry !== "object") return [];
    const diagnostic = entry as { code?: unknown; filename?: unknown; labels?: unknown; severity?: unknown };
    if (typeof diagnostic.code !== "string" || typeof diagnostic.filename !== "string") return [];
    const label = Array.isArray(diagnostic.labels) ? diagnostic.labels[0] as { span?: { line?: unknown; column?: unknown } } | undefined : undefined;
    const rule = diagnostic.code.replace(/^([^()]+)\(([^()]+)\)$/u, "$1/$2");
    return [{ classification: classificationFor("oxlint", rule), column: Number(label?.span?.column) || 0, defectClass: defectClassFor(rule), file: relative(projectRoot, diagnostic.filename), fix: "none", line: Number(label?.span?.line) || 0, rule, severity: diagnostic.severity === "error" ? "error" : "warning", tool: "oxlint" as const }];
  });
}

function key(diagnostic: Diagnostic): string {
  return [diagnostic.file, diagnostic.line, diagnostic.column, diagnostic.defectClass, diagnostic.severity].join(":");
}

export function classifyDeltas(eslint: Diagnostic[], oxlint: Diagnostic[]): { deltas: Delta[]; matched: number } {
  const unmatchedOxlint = new Map(oxlint.map((diagnostic) => [key(diagnostic), diagnostic]));
  const eslintOnly: Diagnostic[] = [];
  let matched = 0;
  for (const diagnostic of eslint) {
    if (unmatchedOxlint.delete(key(diagnostic))) matched += 1;
    else eslintOnly.push(diagnostic);
  }
  const groups = new Map<string, Delta>();
  for (const [kind, diagnostics] of [["eslint-only", eslintOnly], ["oxlint-only", [...unmatchedOxlint.values()]]] as const) {
    for (const diagnostic of diagnostics) {
      const groupKey = `${kind}:${diagnostic.defectClass}:${diagnostic.classification}`;
      const group = groups.get(groupKey) ?? { classification: diagnostic.classification, defectClass: diagnostic.defectClass, diagnostics: [], kind };
      group.diagnostics.push(diagnostic);
      groups.set(groupKey, group);
    }
  }
  return { deltas: [...groups.values()].toSorted((left, right) => `${left.kind}:${left.defectClass}`.localeCompare(`${right.kind}:${right.defectClass}`)), matched };
}

function runTimed(binary: string, args: string[], cwd: string): { output: string; coldMs: number; warmMs: number } {
  const run = () => {
    const start = performance.now();
    const result = runProcess(binary, args, { cwd, timeout: 120_000 });
    const duration = Number((performance.now() - start).toFixed(2));
    const jsonDiagnostics = result.status === 1 && /^[{[]/u.test(result.stdout.trimStart());
    if (result.kind !== "success" && result.kind !== "diagnostics" && !jsonDiagnostics) throw new Error(`${binary} did not produce diagnostics: ${result.stderr || result.stdout}`);
    return { duration, output: result.stdout };
  };
  const cold = run();
  const warm = run();
  return { coldMs: cold.duration, output: warm.output, warmMs: warm.duration };
}

function eslintConfig(project: CorpusProject, projectRoot: string, predecessorRoot: string): string {
  const config = resolve(projectRoot, ".oxlint-corpus-eslint.config.mjs");
  const loader = resolve(predecessorRoot, "packages/eslint-config/dist/index.js");
  writeFileSync(config, `import { getEslintConfig } from ${JSON.stringify(`file://${loader}`)};\nexport default await getEslintConfig(${JSON.stringify(project.predecessorOptions)});\n`);
  return config;
}

function runProject(project: CorpusProject, projectRoot: string, predecessorRoot: string): ProjectReport {
  const config = eslintConfig(project, projectRoot, predecessorRoot);
  try {
    const eslint = runTimed(resolve(predecessorRoot, "node_modules/eslint/bin/eslint.js"), ["--config", config, "--ext", ".js,.cjs,.mjs,.jsx,.ts,.cts,.mts,.tsx", "--format", "json", ...project.paths], projectRoot);
    const oxlint = runTimed(resolve(repositoryRoot, "node_modules/.bin/oxlint"), ["--config", resolve(repositoryRoot, "dist/standalone", `${project.oxlintArtifact}.json`), "--format", "json", ...project.paths], projectRoot);
    const eslintDiagnostics = normalizeEslintDiagnostics(JSON.parse(eslint.output), projectRoot);
    const oxlintDiagnostics = normalizeOxlintDiagnostics(JSON.parse(oxlint.output), projectRoot);
    const comparison = classifyDeltas(eslintDiagnostics, oxlintDiagnostics);
    return { deltas: comparison.deltas, diagnostics: { eslint: eslintDiagnostics, oxlint: oxlintDiagnostics }, id: project.id, matched: comparison.matched, timings: { eslint: { coldMs: eslint.coldMs, warmMs: eslint.warmMs }, oxlint: { coldMs: oxlint.coldMs, warmMs: oxlint.warmMs } } };
  } finally {
    rmSync(config, { force: true });
  }
}

export function scorecard(reports: readonly ProjectReport[]): string {
  const lines = ["# ESLint/Oxlint differential scorecard", "", `- Oxlint Config Setup: \`${oxlintRevision}\``, `- Predecessor: \`${predecessorRevision}\``, "- Timing: one cold process followed by one warm process per tool and project.", "- Evidence boundary: public source is cloned into ignored `.corpus/`; this report contains diagnostics and metadata, not third-party source.", "", "| Project | Matched | ESLint only | Oxlint only | ESLint cold/warm | Oxlint cold/warm |", "| --- | ---: | ---: | ---: | ---: | ---: |"];
  for (const report of reports) {
    const eslintOnly = report.deltas.filter((delta) => delta.kind === "eslint-only").reduce((total, delta) => total + delta.diagnostics.length, 0);
    const oxlintOnly = report.deltas.filter((delta) => delta.kind === "oxlint-only").reduce((total, delta) => total + delta.diagnostics.length, 0);
    lines.push(`| ${report.id} | ${report.matched} | ${eslintOnly} | ${oxlintOnly} | ${report.timings.eslint.coldMs}/${report.timings.eslint.warmMs} ms | ${report.timings.oxlint.coldMs}/${report.timings.oxlint.warmMs} ms |`);
  }
  lines.push("", "## Delta classification", "", "| Project | Direction | Defect class | Classification | Count |", "| --- | --- | --- | --- | ---: |");
  for (const report of reports) for (const delta of report.deltas) lines.push(`| ${report.id} | ${delta.kind} | ${delta.defectClass} | ${delta.classification} | ${delta.diagnostics.length} |`);
  return `${lines.join("\n")}\n`;
}

function parseArguments(): { corpusRoot: string; output: string; prepare: boolean } {
  const args = process.argv.slice(2);
  const option = (name: string) => {
    const index = args.indexOf(name);
    if (index === -1) return undefined;
    const value = args[index + 1];
    if (value === undefined || value.startsWith("--")) throw new Error(`${name} requires a path`);
    return value;
  };
  return { corpusRoot: resolve(option("--corpus-root") ?? defaultCorpusRoot), output: resolve(option("--output") ?? resolve(defaultCorpusRoot, "report")), prepare: args.includes("--prepare") };
}

if (import.meta.main) {
  const options = parseArguments();
  const predecessorRoot = options.prepare ? provisionPredecessor(options.corpusRoot) : verifiedPredecessor(options.corpusRoot);
  const reports = corpusProjects.map((project) => runProject(project, options.prepare ? ensureCheckout(project, options.corpusRoot) : verifiedCheckout(project, options.corpusRoot), predecessorRoot));
  mkdirSync(options.output, { recursive: true });
  writeFileSync(resolve(options.output, "report.json"), `${JSON.stringify({ generatedAt: new Date().toISOString(), projects: corpusProjects, reports, versions: { oxlintConfigSetup: oxlintRevision, predecessor: predecessorRevision } }, null, 2)}\n`);
  writeFileSync(resolve(options.output, "scorecard.md"), scorecard(reports));
  console.log(`Wrote ${resolve(options.output, "report.json")} and ${resolve(options.output, "scorecard.md")}`);
}

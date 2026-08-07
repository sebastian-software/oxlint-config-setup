import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { hostname, platform, release } from "node:os";
import { performance } from "node:perf_hooks";
import { isAbsolute, relative, resolve } from "node:path";

import { runProcess } from "./harness.js";

const repositoryRoot = resolve(import.meta.dirname, "..");
const defaultCorpusRoot = resolve(repositoryRoot, ".corpus");
const predecessorRevision = "4543246c62326047f7372765931f260f04beea56";

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
    id: "react-testing-library-consumer",
    repository: "https://github.com/facebook/create-react-app.git",
    revision: "6254386531d263688ccfa542d0e628fbc0de0b28",
    paths: ["packages/cra-template/template/src/App.js", "packages/cra-template/template/src/App.test.js"],
    predecessorOptions: { react: true },
    oxlintArtifact: "react",
    rationale: "Public React application template that consumes Testing Library in its application test layout.",
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
    paths: ["packages/vitest/src/node/state.ts", "packages/vitest/src/node/config/resolveConfig.ts"],
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
  fix: FixEvidence;
  line: number;
  rule: string;
  severity: "warning" | "error";
  tool: Tool;
}

export interface FixEvidence {
  availability: "available" | "none" | "unknown";
  equivalence: "not-reviewed" | "equivalent" | "different";
  safety: "not-reviewed" | "safe" | "unsafe";
}

export interface Adjudication {
  classification: DeltaClassification;
  falsePositive: "confirmed" | "suspected" | "no";
  suppression: "none" | "required";
  rationale: string;
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
  outcome: "complete" | "failed";
  failure?: string;
  suppressions: string[];
  timings: Record<Tool, { coldMs: number; warmMs: number }>;
}

export interface CorpusProvenance {
  oxlintConfigSetup: string;
  predecessor: string;
}

export interface EnvironmentEvidence {
  eslint: string;
  host: string;
  node: string;
  oxlint: string;
  pnpm: string;
  tsgolint: string;
  typescript: string;
}

function command(binary: string, args: readonly string[], cwd: string): string {
  const result = spawnSync(binary, args, { cwd, encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`${binary} ${args.join(" ")} failed in ${cwd}: ${result.stderr || result.stdout}`);
  }
  return result.stdout;
}

function packageVersion(path: string): string {
  const value = JSON.parse(readFileSync(path, "utf8")) as { version?: unknown };
  if (typeof value.version !== "string") throw new Error(`Missing package version in ${path}`);
  return value.version;
}

export function currentCheckoutRevision(root = repositoryRoot): string {
  const revision = command("git", ["rev-parse", "HEAD"], root).trim();
  if (!/^[0-9a-f]{40}$/u.test(revision)) {
    throw new Error(`Current checkout did not resolve to a full Git revision: ${revision}`);
  }
  return revision;
}

function assertCleanCheckout(root: string, expectedOrigin?: string): void {
  if (expectedOrigin !== undefined) {
    const origin = command("git", ["remote", "get-url", "origin"], root).trim().replace(/\.git$/u, "");
    if (origin !== expectedOrigin.replace(/\.git$/u, "")) throw new Error(`Unexpected origin for ${root}: ${origin}`);
  }
  if (command("git", ["status", "--porcelain", "--untracked-files=all"], root).trim() !== "") throw new Error(`Dirty checkout: ${root}`);
}

export function normalizeFilename(projectRoot: string, filename: string): string {
  const normalizedRoot = projectRoot.replaceAll("\\", "/").replace(/\/$/u, "");
  const normalizedFilename = filename.replaceAll("\\", "/");
  if (normalizedFilename === normalizedRoot) return ".";
  if (normalizedFilename.startsWith(`${normalizedRoot}/`)) return normalizedFilename.slice(normalizedRoot.length + 1);
  const absolute = isAbsolute(filename) ? filename : resolve(projectRoot, filename);
  return relative(projectRoot, absolute).replaceAll("\\", "/");
}

export function validateProjectPaths(project: CorpusProject, projectRoot: string): void {
  const missing = project.paths.filter((path) => !existsSync(resolve(projectRoot, path)));
  if (missing.length > 0) throw new Error(`${project.id} has missing pinned paths: ${missing.join(", ")}`);
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
  assertCleanCheckout(destination, project.repository);
  validateProjectPaths(project, destination);
  return destination;
}

function verifiedCheckout(project: CorpusProject, corpusRoot: string): string {
  const destination = resolve(corpusRoot, "projects", project.id);
  if (!existsSync(destination)) throw new Error(`Missing ${project.id} checkout at ${destination}; rerun with --prepare.`);
  const actual = command("git", ["rev-parse", "HEAD"], destination).trim();
  if (actual !== project.revision) throw new Error(`${project.id} resolved ${actual}, not ${project.revision}; rerun with --prepare.`);
  assertCleanCheckout(destination, project.repository);
  validateProjectPaths(project, destination);
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
      return [{ classification: classificationFor("eslint", rule), column: Number(diagnostic.column) || 0, defectClass: defectClassFor(rule), file: normalizeFilename(projectRoot, filePath), fix: { availability: diagnostic.fix === undefined ? "none" : "available", equivalence: "not-reviewed", safety: "not-reviewed" }, line: Number(diagnostic.line) || 0, rule, severity: diagnostic.severity === 2 ? "error" : "warning", tool: "eslint" as const }];
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
    return [{ classification: classificationFor("oxlint", rule), column: Number(label?.span?.column) || 0, defectClass: defectClassFor(rule), file: normalizeFilename(projectRoot, diagnostic.filename), fix: { availability: "unknown", equivalence: "not-reviewed", safety: "not-reviewed" }, line: Number(label?.span?.line) || 0, rule, severity: diagnostic.severity === "error" ? "error" : "warning", tool: "oxlint" as const }];
  });
}

function key(diagnostic: Diagnostic): string {
  return [diagnostic.file, diagnostic.line, diagnostic.column, diagnostic.defectClass, diagnostic.severity].join(":");
}

export function classifyDeltas(eslint: Diagnostic[], oxlint: Diagnostic[]): { deltas: Delta[]; matched: number } {
  const unmatchedOxlint = new Map<string, Diagnostic[]>();
  for (const diagnostic of oxlint) {
    const matching = unmatchedOxlint.get(key(diagnostic)) ?? [];
    matching.push(diagnostic);
    unmatchedOxlint.set(key(diagnostic), matching);
  }
  const eslintOnly: Diagnostic[] = [];
  let matched = 0;
  for (const diagnostic of eslint) {
    const matching = unmatchedOxlint.get(key(diagnostic));
    if (matching?.shift() !== undefined) {
      matched += 1;
      if (matching.length === 0) unmatchedOxlint.delete(key(diagnostic));
    } else {
      eslintOnly.push(diagnostic);
    }
  }
  const groups = new Map<string, Delta>();
  for (const [kind, diagnostics] of [["eslint-only", eslintOnly], ["oxlint-only", [...unmatchedOxlint.values()].flat()]] as const) {
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
    return { deltas: comparison.deltas, diagnostics: { eslint: eslintDiagnostics, oxlint: oxlintDiagnostics }, id: project.id, matched: comparison.matched, outcome: "complete", suppressions: [], timings: { eslint: { coldMs: eslint.coldMs, warmMs: eslint.warmMs }, oxlint: { coldMs: oxlint.coldMs, warmMs: oxlint.warmMs } } };
  } finally {
    rmSync(config, { force: true });
  }
}

export function scorecard(reports: readonly ProjectReport[], provenance: CorpusProvenance, environment?: EnvironmentEvidence): string {
  const lines = ["# ESLint/Oxlint differential scorecard", "", `- Oxlint Config Setup: \`${provenance.oxlintConfigSetup}\``, `- Predecessor: \`${provenance.predecessor}\``, ...(environment === undefined ? [] : [`- Environment: Node \`${environment.node}\`, pnpm \`${environment.pnpm}\`, ESLint \`${environment.eslint}\`, Oxlint \`${environment.oxlint}\`, tsgolint \`${environment.tsgolint}\`, TypeScript \`${environment.typescript}\`, host \`${environment.host}\`.`]), "- Timing: one cold process followed by one warm process per tool and project.", "- Evidence boundary: public source is cloned into ignored `.corpus/`; this report contains diagnostics and metadata, not third-party source.", "", "| Project | Matched | ESLint only | Oxlint only | ESLint cold/warm | Oxlint cold/warm |", "| --- | ---: | ---: | ---: | ---: | ---: |"];
  for (const report of reports) {
    const eslintOnly = report.deltas.filter((delta) => delta.kind === "eslint-only").reduce((total, delta) => total + delta.diagnostics.length, 0);
    const oxlintOnly = report.deltas.filter((delta) => delta.kind === "oxlint-only").reduce((total, delta) => total + delta.diagnostics.length, 0);
    lines.push(`| ${report.id}${report.outcome === "failed" ? " (failed)" : ""} | ${report.matched} | ${eslintOnly} | ${oxlintOnly} | ${report.timings.eslint.coldMs}/${report.timings.eslint.warmMs} ms | ${report.timings.oxlint.coldMs}/${report.timings.oxlint.warmMs} ms |`);
    if (report.failure !== undefined) lines.push(`| ${report.id} failure | — | — | — | ${report.failure.replaceAll("|", "\\|")} | — |`);
  }
  lines.push("", "## Delta classification", "", "| Project | Direction | Defect class | Classification | Count |", "| --- | --- | --- | --- | ---: |");
  for (const report of reports) for (const delta of report.deltas) lines.push(`| ${report.id} | ${delta.kind} | ${delta.defectClass} | ${delta.classification} | ${delta.diagnostics.length} |`);
  return `${lines.join("\n")}\n`;
}

export function checkpointReports(output: string, reports: readonly ProjectReport[], provenance: CorpusProvenance, environment: EnvironmentEvidence): void {
  mkdirSync(output, { recursive: true });
  const reportPath = resolve(output, "report.json");
  const scorecardPath = resolve(output, "scorecard.md");
  const temporaryReport = `${reportPath}.tmp`;
  const temporaryScorecard = `${scorecardPath}.tmp`;
  writeFileSync(temporaryReport, `${JSON.stringify({ environment, generatedAt: new Date().toISOString(), projects: corpusProjects, reports, versions: provenance }, null, 2)}\n`);
  writeFileSync(temporaryScorecard, scorecard(reports, provenance, environment));
  rmSync(reportPath, { force: true });
  rmSync(scorecardPath, { force: true });
  writeFileSync(reportPath, readFileSync(temporaryReport));
  writeFileSync(scorecardPath, readFileSync(temporaryScorecard));
  rmSync(temporaryReport, { force: true });
  rmSync(temporaryScorecard, { force: true });
}

function parseArguments(): { corpusRoot: string; output: string; prepare: boolean; project?: string } {
  const args = process.argv.slice(2);
  const option = (name: string) => {
    const index = args.indexOf(name);
    if (index === -1) return undefined;
    const value = args[index + 1];
    if (value === undefined || value.startsWith("--")) throw new Error(`${name} requires a path`);
    return value;
  };
  return { corpusRoot: resolve(option("--corpus-root") ?? defaultCorpusRoot), output: resolve(option("--output") ?? resolve(defaultCorpusRoot, "report")), prepare: args.includes("--prepare"), project: option("--project") };
}

if (import.meta.main) {
  const options = parseArguments();
  assertCleanCheckout(repositoryRoot);
  const provenance = { oxlintConfigSetup: currentCheckoutRevision(), predecessor: predecessorRevision };
  const environment: EnvironmentEvidence = { eslint: "unavailable", host: `${platform()} ${release()} ${hostname()}`, node: process.version, oxlint: command(resolve(repositoryRoot, "node_modules/.bin/oxlint"), ["--version"], repositoryRoot).trim(), pnpm: command("pnpm", ["--version"], repositoryRoot).trim(), tsgolint: packageVersion(resolve(repositoryRoot, "node_modules/oxlint-tsgolint/package.json")), typescript: command(resolve(repositoryRoot, "node_modules/.bin/tsc"), ["--version"], repositoryRoot).trim() };
  let predecessorRoot: string | undefined;
  try {
    predecessorRoot = options.prepare ? provisionPredecessor(options.corpusRoot) : verifiedPredecessor(options.corpusRoot);
    environment.eslint = command(resolve(predecessorRoot, "node_modules/eslint/bin/eslint.js"), ["--version"], repositoryRoot).trim();
  } catch (error) {
    const failure = error instanceof Error ? error.message : String(error);
    const reports = corpusProjects.map((project) => ({ deltas: [], diagnostics: { eslint: [], oxlint: [] }, failure, id: project.id, matched: 0, outcome: "failed" as const, suppressions: [], timings: { eslint: { coldMs: 0, warmMs: 0 }, oxlint: { coldMs: 0, warmMs: 0 } } }));
    checkpointReports(options.output, reports, provenance, environment);
    process.exit(1);
  }
  const selectedProjects = options.project === undefined ? corpusProjects : corpusProjects.filter((project) => project.id === options.project);
  if (selectedProjects.length === 0) throw new Error(`Unknown corpus project: ${options.project}`);
  const reports: ProjectReport[] = [];
  for (const project of selectedProjects) {
    try {
      reports.push(runProject(project, options.prepare ? ensureCheckout(project, options.corpusRoot) : verifiedCheckout(project, options.corpusRoot), predecessorRoot));
    } catch (error) {
      reports.push({ deltas: [], diagnostics: { eslint: [], oxlint: [] }, failure: error instanceof Error ? error.message : String(error), id: project.id, matched: 0, outcome: "failed", suppressions: [], timings: { eslint: { coldMs: 0, warmMs: 0 }, oxlint: { coldMs: 0, warmMs: 0 } } });
    }
    checkpointReports(options.output, reports, provenance, environment);
  }
  console.log(`Wrote ${resolve(options.output, "report.json")} and ${resolve(options.output, "scorecard.md")}`);
  if (reports.some((report) => report.outcome === "failed")) process.exitCode = 1;
}

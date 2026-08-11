import { spawnSync } from "node:child_process";
import { performance } from "node:perf_hooks";
import { resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dirname, "..");
const oxlint = resolve(repositoryRoot, "node_modules/.bin/oxlint");
const iterations = 10;

interface Scenario {
  config: string;
  input: string;
  name: string;
}

function percentile(values: readonly number[], fraction: number): number {
  const sorted = values.toSorted((left, right) => left - right);
  return sorted[Math.ceil(sorted.length * fraction) - 1] ?? 0;
}

function measure(scenario: Scenario): { medianMs: number; p95Ms: number } {
  const samples: number[] = [];
  for (let iteration = -2; iteration < iterations; iteration += 1) {
    const start = performance.now();
    const result = spawnSync(
      oxlint,
      ["--config", scenario.config, "--threads", "1", scenario.input],
      {
        cwd: repositoryRoot,
        encoding: "utf8",
        env: { ...process.env, NO_COLOR: "1" },
      },
    );
    const duration = performance.now() - start;
    if (result.status !== 0) {
      throw new Error(
        `${scenario.name} failed: ${result.stderr || result.stdout}`,
      );
    }
    if (iteration >= 0) samples.push(duration);
  }
  return {
    medianMs: Number(percentile(samples, 0.5).toFixed(2)),
    p95Ms: Number(percentile(samples, 0.95).toFixed(2)),
  };
}

const scenarios: Scenario[] = [
  {
    name: "syntax-only one file",
    config: "dist/standalone/typescript-syntax.json",
    input: "fixtures/rules/typescript-syntax/valid.ts",
  },
  {
    name: "type-aware one file",
    config: "dist/standalone/default.json",
    input: "spikes/config-packaging/fixtures/performance-project/src/module-01.ts",
  },
  {
    name: "type-aware 12-file project",
    config: "dist/standalone/default.json",
    input: "spikes/config-packaging/fixtures/performance-project/src",
  },
  {
    name: "React preset representative fixture",
    config: "dist/standalone/react.json",
    input: "fixtures/rules/react-preset/valid.tsx",
  },
];

const results = Object.fromEntries(
  scenarios.map((scenario) => [scenario.name, measure(scenario)]),
);
console.log(JSON.stringify({ iterations, results }, null, 2));

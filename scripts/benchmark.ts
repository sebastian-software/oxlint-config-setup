import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { resolve } from "node:path";

import { createCompositionFixtureConfig } from "../src/composition-fixtures.js";

const repositoryRoot = resolve(import.meta.dirname, "..");
const oxlint = resolve(repositoryRoot, "node_modules/.bin/oxlint");
const iterations = 10;
// JavaScript plugins resolve from the config location, so keep benchmark
// configs below the repository root to find this workspace's node_modules.
const temporaryRoot = mkdtempSync(resolve(repositoryRoot, ".oxlint-benchmark-"));

interface Scenario {
  config: string;
  input: string;
  name: string;
}

function percentile(values: readonly number[], fraction: number): number {
  const sorted = values.toSorted((left, right) => left - right);
  return sorted[Math.ceil(sorted.length * fraction) - 1] ?? 0;
}

function writeConfig(name: string, config: unknown): string {
  const path = resolve(temporaryRoot, `${name}.json`);
  writeFileSync(path, `${JSON.stringify(config, null, 2)}\n`);
  return path;
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

try {
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
      name: "native-only representative Testing Library suite",
      config: writeConfig(
        "native-testing-library",
        createCompositionFixtureConfig(["vitest"]),
      ),
      input: "fixtures/representative/testing-library",
    },
    {
      name: "experimental Testing Library representative suite",
      config: writeConfig(
        "experimental-testing-library",
        createCompositionFixtureConfig([
          "vitest",
          "experimental-testing-library",
        ]),
      ),
      input: "fixtures/representative/testing-library",
    },
  ];

  const results = Object.fromEntries(
    scenarios.map((scenario) => [scenario.name, measure(scenario)]),
  );
  console.log(JSON.stringify({ iterations, results }, null, 2));
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}

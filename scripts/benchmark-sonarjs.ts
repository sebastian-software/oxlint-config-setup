import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { performance } from "node:perf_hooks";
import { resolve } from "node:path";

import type { OxlintConfig } from "oxlint";

import { withSonarJS } from "../src/sonarjs.js";

const repositoryRoot = resolve(import.meta.dirname, "..");
const oxlint = resolve(repositoryRoot, "node_modules/.bin/oxlint");
const temporaryRoot = mkdtempSync(resolve(tmpdir(), "oxlint-sonarjs-benchmark-"));
const iterations = 10;
const maximumMedianRatio = 10;
const input = "src";
const disabledCategories = {
  correctness: "off",
  suspicious: "off",
  pedantic: "off",
  perf: "off",
  style: "off",
  restriction: "off",
  nursery: "off",
} as const;
const baseline: OxlintConfig = {
  categories: disabledCategories,
  plugins: [],
  rules: {},
};

function percentile(values: readonly number[], fraction: number): number {
  const sorted = values.toSorted((left, right) => left - right);
  return sorted[Math.ceil(sorted.length * fraction) - 1] ?? 0;
}

function writeConfig(name: string, config: OxlintConfig): string {
  const path = resolve(temporaryRoot, `${name}.json`);
  writeFileSync(path, `${JSON.stringify(config, null, 2)}\n`);
  return path;
}

function measure(config: string): { medianMs: number; p95Ms: number } {
  const samples: number[] = [];
  for (let iteration = -2; iteration < iterations; iteration += 1) {
    const start = performance.now();
    const result = spawnSync(
      oxlint,
      [
        "--disable-nested-config",
        "--config",
        config,
        "--threads",
        "1",
        input,
      ],
      {
        cwd: repositoryRoot,
        encoding: "utf8",
        env: { ...process.env, NO_COLOR: "1" },
      },
    );
    const duration = performance.now() - start;
    if (result.status !== 0) {
      throw new Error(result.stderr || result.stdout || "benchmark failed");
    }
    if (iteration >= 0) samples.push(duration);
  }
  return {
    medianMs: Number(percentile(samples, 0.5).toFixed(2)),
    p95Ms: Number(percentile(samples, 0.95).toFixed(2)),
  };
}

try {
  const baselineResult = measure(writeConfig("baseline", baseline));
  const sonarjsResult = measure(writeConfig("sonarjs", withSonarJS(baseline)));
  const medianRatio = Number(
    (sonarjsResult.medianMs / baselineResult.medianMs).toFixed(2),
  );
  console.log(
    JSON.stringify(
      {
        input,
        iterations,
        baseline: baselineResult,
        sonarjs: sonarjsResult,
        maximumMedianRatio,
        medianRatio,
      },
      null,
      2,
    ),
  );
  if (medianRatio >= maximumMedianRatio) {
    throw new Error(
      `SonarJS median ratio ${medianRatio} exceeds the ${maximumMedianRatio}x automatic-integration budget`,
    );
  }
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}

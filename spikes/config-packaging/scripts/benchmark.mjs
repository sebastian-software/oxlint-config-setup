import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";

const spikeRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageBinary = join(spikeRoot, "node_modules/.bin/oxlint");
const standaloneBinaries = new Map([
  ["darwin-arm64", "oxlint-aarch64-apple-darwin"],
  ["darwin-x64", "oxlint-x86_64-apple-darwin"],
  ["linux-arm64", "oxlint-aarch64-unknown-linux-gnu"],
  ["linux-x64", "oxlint-x86_64-unknown-linux-gnu"],
]);
const standaloneName = standaloneBinaries.get(
  `${process.platform}-${process.arch}`,
);
if (!process.env.OXLINT_STANDALONE) {
  assert(
    standaloneName,
    `unsupported benchmark platform: ${process.platform}-${process.arch}`,
  );
}
const standaloneBinary = resolve(
  process.env.OXLINT_STANDALONE ??
    join(spikeRoot, ".cache/standalone", standaloneName),
);

const generatedConfig = join(
  spikeRoot,
  "packages/shared-config/generated/recommended.json",
);
const directConfig = join(spikeRoot, "fixtures/direct-json/.oxlintrc.json");
const runtimeGroups = [
  {
    name: "Node package executable",
    scenarios: [
      {
        name: "TypeScript package import",
        binary: packageBinary,
        config: join(spikeRoot, "fixtures/typescript/oxlint.config.ts"),
      },
      {
        name: "Generated JSON",
        binary: packageBinary,
        config: generatedConfig,
      },
      {
        name: "Direct JSON baseline",
        binary: packageBinary,
        config: directConfig,
      },
    ],
  },
  {
    name: "Standalone binary",
    scenarios: [
      {
        name: "Generated JSON",
        binary: standaloneBinary,
        config: generatedConfig,
      },
      {
        name: "Direct JSON baseline",
        binary: standaloneBinary,
        config: directConfig,
      },
    ],
  },
];
const workloads = [
  {
    name: "Fresh process, one file",
    target: join(spikeRoot, "fixtures/project/src/valid.ts"),
  },
  {
    name: "Fresh process, 12-file project",
    target: join(spikeRoot, "fixtures/performance-project/src"),
  },
];

const measuredRuns = Number.parseInt(
  process.env.SPIKE_BENCHMARK_RUNS ?? "30",
  10,
);
const warmupRuns = 3;
assert(Number.isSafeInteger(measuredRuns) && measuredRuns > 0);

function measure(scenario, target) {
  const started = performance.now();
  const result = spawnSync(
    scenario.binary,
    ["--config", scenario.config, "--threads", "1", target],
    {
      cwd: spikeRoot,
      encoding: "utf8",
      env: { ...process.env, NO_COLOR: "1" },
      stdio: "pipe",
    },
  );
  const elapsed = performance.now() - started;
  assert.equal(
    result.status,
    0,
    `${scenario.name} failed:\n${result.stdout}\n${result.stderr}`,
  );
  return elapsed;
}

function percentile(samples, fraction) {
  const sorted = samples.toSorted((left, right) => left - right);
  return sorted[Math.ceil(fraction * sorted.length) - 1];
}

console.log(
  `Oxlint 1.77.0; Node ${process.version}; ${process.platform}-${process.arch}`,
);
console.log(
  `${measuredRuns} measured fresh processes after ${warmupRuns} warm-ups; --threads 1; filesystem caches not flushed.`,
);

for (const workload of workloads) {
  for (const runtimeGroup of runtimeGroups) {
    const { scenarios } = runtimeGroup;
    const samples = new Map(scenarios.map((scenario) => [scenario.name, []]));

    for (let iteration = 0; iteration < warmupRuns; iteration += 1) {
      for (const scenario of scenarios) {
        measure(scenario, workload.target);
      }
    }

    for (let iteration = 0; iteration < measuredRuns; iteration += 1) {
      const offset = iteration % scenarios.length;
      const ordered = scenarios.slice(offset).concat(scenarios.slice(0, offset));
      for (const scenario of ordered) {
        samples.get(scenario.name).push(measure(scenario, workload.target));
      }
    }

    const baselineMedian = percentile(
      samples.get("Direct JSON baseline"),
      0.5,
    );
    console.log(`\n${workload.name}; ${runtimeGroup.name}`);
    console.log("| Variant | median | p95 | median vs direct JSON |");
    console.log("| --- | ---: | ---: | ---: |");
    for (const scenario of scenarios) {
      const values = samples.get(scenario.name);
      const median = percentile(values, 0.5);
      const p95 = percentile(values, 0.95);
      const delta = ((median - baselineMedian) / baselineMedian) * 100;
      const formattedDelta = `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%`;
      console.log(
        `| ${scenario.name} | ${median.toFixed(2)} ms | ${p95.toFixed(2)} ms | ${formattedDelta} |`,
      );
    }
  }
}

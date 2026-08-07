import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dirname, "..");
const outputDirectory = resolve(
  repositoryRoot,
  process.env.CANARY_OUTPUT_DIR ?? "canary-artifacts",
);
const baselinePath = process.env.CANARY_PERFORMANCE_BASELINE;
const regressionThreshold = Number(
  process.env.CANARY_PERFORMANCE_REGRESSION_THRESHOLD ?? "0.25",
);

interface BenchmarkResult {
  iterations: number;
  results: Record<string, { medianMs: number; p95Ms: number }>;
}

interface StageResult {
  category: string;
  command: string;
  status: "passed" | "failed";
}

function parseBenchmark(source: string): BenchmarkResult {
  const trimmed = source.trim();
  const start = Math.max(0, trimmed.lastIndexOf("\n{") + 1);
  return JSON.parse(trimmed.slice(start)) as BenchmarkResult;
}

function run(
  command: string,
  args: string[],
  environment: NodeJS.ProcessEnv = {},
): string {
  const result = spawnSync(command, args, {
    cwd: repositoryRoot,
    encoding: "utf8",
    env: { ...process.env, ...environment, NO_COLOR: "1" },
  });
  if (result.status !== 0) {
    throw new Error(
      (result.stderr || result.stdout || "command failed").trim(),
    );
  }
  return result.stdout;
}

function installedVersion(packageName: string): string | undefined {
  try {
    const manifest = JSON.parse(
      readFileSync(
        resolve(repositoryRoot, "node_modules", packageName, "package.json"),
        "utf8",
      ),
    ) as { version?: unknown };
    return typeof manifest.version === "string" ? manifest.version : undefined;
  } catch {
    return undefined;
  }
}

function summarize(
  stages: readonly StageResult[],
  heading: string,
  failure?: { category: string; message: string },
): void {
  const lines = [
    `# ${heading}`,
    "",
    "| Category | Command | Result |",
    "| --- | --- | --- |",
    ...stages.map(
      (stage) =>
        `| ${stage.category} | \`${stage.command}\` | ${stage.status} |`,
    ),
    "",
    ...(failure === undefined
      ? []
      : [
          "## Failure detail",
          "",
          `**${failure.category}:** ${failure.message}`,
          "",
        ]),
    "Native category and rule-surface details are in `native-category-surface.diff.md`.",
  ];
  writeFileSync(
    resolve(outputDirectory, "summary.md"),
    `${lines.join("\n")}\n`,
  );
}

function benchmark(): void {
  if (baselinePath === undefined) {
    throw new Error(
      "performance failure: CANARY_PERFORMANCE_BASELINE is required",
    );
  }
  const baseline = parseBenchmark(readFileSync(baselinePath, "utf8"));
  const candidates = [
    parseBenchmark(run("pnpm", ["run", "benchmark"])),
    parseBenchmark(run("pnpm", ["run", "benchmark"])),
  ];
  const confirmedRegressions: string[] = [];
  const noisyRegressions: string[] = [];

  for (const [name, baselineScenario] of Object.entries(baseline.results)) {
    const ratios = candidates.map((candidate) => {
      const scenario = candidate.results[name];
      if (scenario === undefined) {
        throw new Error(`performance failure: benchmark is missing ${name}`);
      }
      return scenario.medianMs / baselineScenario.medianMs - 1;
    });
    const formatted = ratios.map((ratio) => `${(ratio * 100).toFixed(1)}%`);
    if (ratios.every((ratio) => ratio > regressionThreshold)) {
      confirmedRegressions.push(`${name} (${formatted.join(", ")})`);
    } else if (ratios.some((ratio) => ratio > regressionThreshold)) {
      noisyRegressions.push(`${name} (${formatted.join(", ")})`);
    }
  }

  writeFileSync(
    resolve(outputDirectory, "performance-comparison.json"),
    `${JSON.stringify(
      {
        baseline,
        candidates,
        confirmedRegressions,
        noisyRegressions,
        regressionThreshold,
      },
      null,
      2,
    )}\n`,
  );
  if (noisyRegressions.length > 0) {
    console.warn(
      `performance warning: one-off regression sample(s): ${noisyRegressions.join("; ")}`,
    );
  }
  if (confirmedRegressions.length > 0) {
    throw new Error(
      `performance failure: repeated regressions exceed ${(regressionThreshold * 100).toFixed(0)}%: ${confirmedRegressions.join("; ")}`,
    );
  }
}

mkdirSync(outputDirectory, { recursive: true });
writeFileSync(
  resolve(outputDirectory, "upstream-versions.json"),
  `${JSON.stringify(
    {
      node: process.version,
      oxlint: installedVersion("oxlint"),
      oxlintTsgolint: installedVersion("oxlint-tsgolint"),
      pnpm: execFileSync("pnpm", ["--version"], {
        cwd: repositoryRoot,
        encoding: "utf8",
      }).trim(),
      typescript: installedVersion("typescript"),
    },
    null,
    2,
  )}\n`,
);

const stages: Array<{
  args: string[];
  category: string;
  command: string;
  environment?: NodeJS.ProcessEnv;
}> = [
  {
    args: ["run", "typecheck"],
    category: "type",
    command: "pnpm run typecheck",
  },
  {
    args: ["run", "test:ledger"],
    category: "config",
    command: "pnpm run test:ledger",
  },
  {
    args: [
      "run",
      "canary:native-surface",
      "--",
      "--output",
      outputDirectory,
      "--fail-on-diff",
    ],
    category: "snapshot",
    command: "pnpm run canary:native-surface -- --fail-on-diff",
  },
  {
    args: ["run", "test:harness"],
    category: "diagnostic",
    command: "pnpm run test:harness (fixtures, crash, timeout)",
    environment: { CANARY_SKIP_SNAPSHOTS: "true" },
  },
  {
    args: ["run", "test:package"],
    category: "packaging",
    command: "pnpm run test:package (clean npm and pnpm consumers)",
  },
];
const results: StageResult[] = [];

try {
  for (const stage of stages) {
    try {
      run("pnpm", stage.args, stage.environment);
      results.push({ ...stage, status: "passed" });
    } catch (error: unknown) {
      results.push({ ...stage, status: "failed" });
      const message = error instanceof Error ? error.message : String(error);
      summarize(results, "Upstream compatibility canary", {
        category: stage.category,
        message,
      });
      console.error(
        `::error title=Upstream ${stage.category} failure::${message}`,
      );
      throw new Error(`${stage.category} failure: ${message}`);
    }
  }
  try {
    benchmark();
    results.push({
      category: "performance",
      command: "two benchmark comparisons against the pinned baseline",
      status: "passed",
    });
  } catch (error: unknown) {
    results.push({
      category: "performance",
      command: "two benchmark comparisons against the pinned baseline",
      status: "failed",
    });
    const message = error instanceof Error ? error.message : String(error);
    summarize(results, "Upstream compatibility canary", {
      category: "performance",
      message,
    });
    console.error(`::error title=Upstream performance failure::${message}`);
    throw error;
  }
  summarize(results, "Upstream compatibility canary");
} catch (error) {
  process.exitCode = 1;
  throw error;
}

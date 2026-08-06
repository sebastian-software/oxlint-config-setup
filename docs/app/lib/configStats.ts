import statsJson from "../generated/config-stats.json";

export type ConfigLevel = "essential" | "recommended" | "strict";

export type ConfigSelection = {
  ai: boolean;
  level: ConfigLevel;
  node: boolean;
  react: boolean;
};

export type ConfigStats = {
  activeRules: number;
  artifactKb: number;
  fileName: string;
  plugins: number;
  publicName: string;
  selection: ConfigSelection;
};

const data = statsJson as { configurations: ConfigStats[] };

function selectionKey(selection: ConfigSelection): string {
  return [
    selection.level,
    Number(selection.react),
    Number(selection.node),
    Number(selection.ai),
  ].join(":");
}

const bySelection = new Map(
  data.configurations.map((stats) => [selectionKey(stats.selection), stats]),
);

export function getConfigStats(selection: ConfigSelection): ConfigStats {
  const stats = bySelection.get(selectionKey(selection));
  if (stats === undefined) {
    throw new Error(
      "config-stats.json is missing a configuration; run pnpm docs:data",
    );
  }
  return stats;
}

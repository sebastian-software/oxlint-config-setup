import statsJson from "../generated/config-stats.json";

export type ConfigLevel = "essential" | "recommended" | "strict";

export type ConfigSelection = {
  ai: boolean;
  level: ConfigLevel;
  node: boolean;
  react: boolean;
};

export type RuleGroup = {
  id: string;
  label: string;
  rules: string[];
};

export type ProjectRuleGroup = {
  added: string[];
  adjusted: string[];
  id: "ai" | "node" | "react";
  label: string;
};

export type ConfigStats = {
  activeRules: number;
  artifactKb: number;
  fileName: string;
  plugins: number;
  policyRules: RuleGroup[];
  projectRules: ProjectRuleGroup[];
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

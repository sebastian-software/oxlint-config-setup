import type {
  ConfigLevel,
  ConfigSelection,
} from "../../lib/configStats.js";

export type LevelMeta = {
  description: string;
  id: ConfigLevel;
  label: string;
};

export type FlagMeta = {
  description: string;
  id: "ai" | "node" | "react";
  label: string;
};

export const LEVELS: readonly LevelMeta[] = [
  {
    description: "The minimum correctness and safety contract.",
    id: "essential",
    label: "Essential",
  },
  {
    description: "Broadly useful policy for most TypeScript projects.",
    id: "recommended",
    label: "Recommended",
  },
  {
    description: "Opinionated checks with a higher adoption cost.",
    id: "strict",
    label: "Strict",
  },
];

export const FLAGS: readonly FlagMeta[] = [
  {
    description: "Native React and JSX accessibility rules.",
    id: "react",
    label: "React",
  },
  {
    description: "Runtime and module rules for server-side code.",
    id: "node",
    label: "Node.js",
  },
  {
    description: "Tighten active rules and add explicit AI guardrails.",
    id: "ai",
    label: "AI overlay",
  },
];

export const INSTALL_COMMAND =
  "pnpm add -D oxlint-config-setup oxlint@1.77.0 oxlint-tsgolint@7.0.2001";

export const REPOSITORY_URL =
  "https://github.com/sebastian-software/oxlint-config-setup";

export function buildConfigSnippet(selection: ConfigSelection): string {
  const options = [
    selection.level === "recommended"
      ? ""
      : `level: "${selection.level}"`,
    selection.react ? "react: true" : "",
    selection.node ? "node: true" : "",
    selection.ai ? "ai: true" : "",
  ].filter(Boolean);
  const argument = options.length === 0 ? "" : `{ ${options.join(", ")} }`;

  return [
    'import { getOxlintConfig } from "oxlint-config-setup";',
    "",
    `export default getOxlintConfig(${argument});`,
  ].join("\n");
}

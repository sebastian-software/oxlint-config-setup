import type { OxlintConfig } from "oxlint";

import { createConfig } from "./config.js";
import {
  allConfigOptions,
  configFileName,
  type NormalizedConfigOptions,
} from "./options.js";
import { composeProfiles } from "./profiles.js";

export const NAMED_ARTIFACTS = [
  "typescript-syntax",
  "vitest",
  "jest",
  "react-compiler",
] as const;

export type NamedArtifact = (typeof NAMED_ARTIFACTS)[number];

export interface ConfigArtifact {
  fileName: string;
  publicName: string;
  typeAware: boolean;
  config: OxlintConfig;
}

const STANDARD_PROFILES = [
  "core",
  "imports",
  "typescript-syntax",
  "typescript-type-aware",
] as const;

export function publicConfigName(
  options: NormalizedConfigOptions,
): string {
  const enabled = [
    options.react ? "react" : "",
    options.node ? "node" : "",
    options.ai ? "ai" : "",
  ].filter(Boolean);
  const featureName = enabled.length === 0 ? "default" : enabled.join("-");
  if (options.level === "standard") return featureName;
  return featureName === "default" ? "essential" : `essential-${featureName}`;
}

export function createNamedConfig(name: NamedArtifact): OxlintConfig {
  switch (name) {
    case "typescript-syntax":
      return composeProfiles([
        "core",
        "imports",
        "typescript-syntax",
      ]);
    case "vitest":
      return composeProfiles([...STANDARD_PROFILES, "vitest"]);
    case "jest":
      return composeProfiles([...STANDARD_PROFILES, "jest"]);
    case "react-compiler":
      return composeProfiles(
        [...STANDARD_PROFILES, "react", "jsx-a11y", "react-compiler"],
        { surface: "experimental" },
      );
  }
}

export function allConfigArtifacts(): ConfigArtifact[] {
  const configurable = allConfigOptions().map((options) => ({
    fileName: configFileName(options),
    publicName: publicConfigName(options),
    typeAware: true,
    config: createConfig(options),
  }));
  const named = NAMED_ARTIFACTS.map((name) => {
    const config = createNamedConfig(name);
    return {
      fileName: `${name}.json`,
      publicName: name,
      typeAware: name !== "typescript-syntax",
      config,
    };
  });
  return [...configurable, ...named];
}

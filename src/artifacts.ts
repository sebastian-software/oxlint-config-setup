import type { OxlintConfig } from "oxlint";

import { createConfig } from "./config.js";
import { materializeConfig } from "./materialize.js";
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

const COMPLETE_PROFILES = [
  "core",
  "imports",
  "typescript-syntax",
  "typescript-type-aware",
] as const;
const TYPE_AWARE_SOURCE = "fixtures/rules/typescript-type-aware/valid.ts";
const REACT_SOURCE = "fixtures/rules/react/valid.tsx";

function configurableSource(options: NormalizedConfigOptions): string {
  return options.react ? REACT_SOURCE : TYPE_AWARE_SOURCE;
}

export function publicConfigName(options: NormalizedConfigOptions): string {
  const enabled = [
    options.react ? "react" : "",
    options.node ? "node" : "",
    options.ai ? "ai" : "",
  ].filter(Boolean);
  const featureName = enabled.length === 0 ? "default" : enabled.join("-");
  if (options.level === "recommended") return featureName;
  return featureName === "default"
    ? options.level
    : `${options.level}-${featureName}`;
}

export function createNamedConfig(name: NamedArtifact): OxlintConfig {
  switch (name) {
    case "typescript-syntax":
      return composeProfiles(["core", "imports", "typescript-syntax"], {
        level: "strict",
      });
    case "vitest":
      return materializeConfig(
        composeProfiles([...COMPLETE_PROFILES, "vitest"], {
          level: "strict",
          policyCategories: true,
        }),
        "fixtures/rules/vitest/valid.ts",
      );
    case "jest":
      return materializeConfig(
        composeProfiles([...COMPLETE_PROFILES, "jest"], {
          level: "strict",
          policyCategories: true,
        }),
        "fixtures/rules/jest/valid.ts",
      );
    case "react-compiler":
      return materializeConfig(
        composeProfiles(
          [...COMPLETE_PROFILES, "react", "jsx-a11y", "react-compiler"],
          {
            level: "strict",
            policyCategories: true,
            surface: "experimental",
          },
        ),
        "fixtures/rules/react-compiler/valid.tsx",
      );
  }
}

export function allConfigArtifacts(): ConfigArtifact[] {
  const configurable = allConfigOptions().map((options) => ({
    fileName: configFileName(options),
    publicName: publicConfigName(options),
    typeAware: true,
    config: materializeConfig(
      createConfig(options),
      configurableSource(options),
    ),
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

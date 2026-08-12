import { fileURLToPath } from "node:url";

import storybookPlugin from "eslint-plugin-storybook";
import type { DummyRuleMap, OxlintConfig, OxlintOverride } from "oxlint";

export const STORY_FILE_GLOBS = ["**/*.stories.{ts,tsx}"] as const;

function storybookRules(): DummyRuleMap {
  const preset = storybookPlugin.configs["flat/recommended"];
  if (!Array.isArray(preset)) {
    throw new Error("Storybook preset flat/recommended must be a config array");
  }
  const storyConfig = preset.find(
    (entry) => entry.name === "storybook:recommended:stories-rules",
  );
  if (storyConfig?.rules === undefined) {
    throw new Error(
      "Storybook preset flat/recommended does not define story rules",
    );
  }
  return structuredClone(storyConfig.rules) as DummyRuleMap;
}

function storybookOverride(): OxlintOverride {
  return {
    files: [...STORY_FILE_GLOBS],
    jsPlugins: [
      {
        name: "storybook",
        specifier: fileURLToPath(import.meta.resolve("eslint-plugin-storybook")),
      },
    ],
    rules: storybookRules(),
  };
}

/** Add the package-owned Storybook policy to canonical story files. */
export function withStorybook(config: OxlintConfig): OxlintConfig {
  return {
    ...config,
    overrides: [...(config.overrides ?? []), storybookOverride()],
  };
}

import { fileURLToPath } from "node:url";

import playwrightPlugin from "eslint-plugin-playwright";
import type { DummyRuleMap, OxlintConfig, OxlintOverride } from "oxlint";

export const PLAYWRIGHT_FILE_GLOBS = [
  "**/*.{e2e,playwright}.{js,cjs,mjs,jsx,ts,cts,mts,tsx}",
  "**/{e2e,playwright}/**/*.{js,cjs,mjs,jsx,ts,cts,mts,tsx}",
] as const;

function cloneGlobals(globals: unknown): OxlintOverride["globals"] {
  if (globals === undefined || globals === null) return undefined;
  if (typeof globals !== "object" || Array.isArray(globals)) {
    throw new Error("Playwright preset flat/recommended defines invalid globals");
  }

  return Object.fromEntries(
    Object.entries(globals).map(([name, access]) => {
      switch (access) {
        case false:
        case "readable":
        case "readonly":
          return [name, "readonly"];
        case true:
        case "writable":
        case "writeable":
          return [name, "writable"];
        case "off":
          return [name, "off"];
        default:
          throw new Error(
            `Playwright preset flat/recommended defines invalid global ${name}`,
          );
      }
    }),
  );
}

function playwrightPreset(): Pick<OxlintOverride, "globals" | "rules"> {
  const preset = playwrightPlugin.configs["flat/recommended"];
  if (preset === undefined || preset.rules === undefined) {
    throw new Error("Playwright preset flat/recommended does not define rules");
  }
  const globals = cloneGlobals(preset.languageOptions?.globals);

  return {
    ...(globals === undefined ? {} : { globals }),
    rules: structuredClone(preset.rules) as DummyRuleMap,
  };
}

function playwrightOverride(): OxlintOverride {
  return {
    files: [...PLAYWRIGHT_FILE_GLOBS],
    jsPlugins: [
      {
        name: "playwright",
        specifier: fileURLToPath(import.meta.resolve("eslint-plugin-playwright")),
      },
    ],
    ...playwrightPreset(),
  };
}

/** Add the package-owned Playwright policy to canonical E2E files. */
export function withPlaywright(config: OxlintConfig): OxlintConfig {
  return {
    ...config,
    overrides: [...(config.overrides ?? []), playwrightOverride()],
  };
}

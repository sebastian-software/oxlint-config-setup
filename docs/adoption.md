# Adoption guide

## Choose one root configuration

Projects use `getOxlintConfig()`. Its level, two context options, and AI overlay
are fixed build-time selectors and may be combined freely:

```ts
import { getOxlintConfig } from "oxlint-config-setup";

export default getOxlintConfig({
  level: "recommended",
  react: true,
  node: true,
  ai: false,
});
```

`recommended` is the default and broadly applicable policy. Use
`level: "essential"` for a smaller adoption baseline containing only high-signal
correctness, safety, accessibility, and framework invariants. Use
`level: "strict"` for the complete, more opinionated policy surface. The levels
are nested: essential is a strict subset of recommended, which is a strict
subset of strict.

All three levels remain type-aware and therefore require a discoverable
`tsconfig.json` and `oxlint-tsgolint@7.0.2001`. React, Node.js, and AI are
independent selectors; an essential React project with AI guardrails is
supported directly.

React and Node.js identify project context. AI does not increase the selected
policy level. It may tighten options or severity only for rules already active
at that level and may add explicitly AI-only guardrails. For example,
`essential` plus AI does not activate recommended import policy or strict
exhaustive-switch policy.

Use a named full configuration when the project has a different execution
contract:

```ts
import {
  getExperimentalReactCompilerOxlintConfig,
  getJestOxlintConfig,
  getSyntaxOnlyOxlintConfig,
  getVitestOxlintConfig,
} from "oxlint-config-setup";
```

- `getSyntaxOnlyOxlintConfig()` omits the project graph and type-aware backend.
- `getVitestOxlintConfig()` and `getJestOxlintConfig()` deliberately select one
  test owner; they are not combined because their shared APIs overlap.
- `getExperimentalReactCompilerOxlintConfig()` includes stable React and JSX
  accessibility rules plus the compiler diagnostic as a warning.

## Compose a mixed repository

Use `getComposedOxlintConfig()` when React, Node.js, or a runner applies only to
some files. It starts from the same prebuilt core root as `getOxlintConfig()`;
it does not create another JSON artifact matrix.

```ts
import { getComposedOxlintConfig } from "oxlint-config-setup";

export default getComposedOxlintConfig({
  scopes: [
    "react",
    { scope: "node", files: ["packages/api/**/*.{ts,mts}"] },
    "vitest",
    "scripts",
    "config",
    "declarations",
  ],
  overrides: [
    {
      files: ["packages/web/**/*.test.tsx"],
      rules: { "react/jsx-key": "off" },
    },
  ],
});
```

The canonical `react` pattern is `**/*.{jsx,tsx}`. `node` uses explicit Node
module extensions by default, so provide `files` for ordinary `.ts` source in a
Node package. Vitest and Jest use `*.test`/`*.spec` names and `__tests__` or
`__mocks__` directories across supported JavaScript and TypeScript extensions.
Select one runner scope: Vitest and Jest intentionally reject a combined
selection because their runner rules overlap.
Scripts, configuration files, and declarations use conventional directory,
`*.config.*`, and `*.d.*` patterns respectively.

Fragments append in a stable order and consumer overrides append after them. A
consumer override's plugins are unioned with the root and selected fragment
plugins because Oxlint otherwise treats an override `plugins` array as a
replacement. Rules, environments, and globals retain Oxlint's normal
last-matching-override semantics. The root remains type-aware; no scope can
move `options.typeAware` into a file override.

Playwright/E2E (`*.e2e.*`, `*.playwright.*`, `e2e/`, and `playwright/`) and
Storybook (`*.stories.*`, `stories/`, and `storybook/`) patterns are recorded
for a future profile, but no such profile ships in this release.

## Install and run

Use Node.js `24.11.0` or later, then install the tested linting trio:

```sh
pnpm add -D oxlint-config-setup oxlint@1.77.0 oxlint-tsgolint@7.0.2001
pnpm oxlint .
```

The package has no install or postinstall script. Consumers execute only bundled
ESM, declarations, JSON data, Oxlint, and its native type-aware backend.

## Customize individual rules

Use `setRuleSeverity`, `configureRule`, `disableRule`, `addRule`, and
`disableAllRulesBut` after loading a TypeScript configuration. The helpers
mutate that config object in place. Severity changes preserve options; option
changes recursively merge plain objects and preserve both severity and omitted
positional options. Arrays, scalars, and `null` replace their current value.
The helpers update explicit root and existing file-override entries, while
`addRule` writes to the root configuration.

Unscoped helper calls update the root and every explicit override occurrence.
Composed configurations also accept a final `{ scope }` argument, for example
`disableRule(config, "vitest/no-focused-tests", { scope: "vitest" })`.
Package-created scope identities are stable for that configuration object; an
unknown or unselected scope throws instead of silently doing nothing.

## Use a public JSON artifact

Every TypeScript loader has a public JSON equivalent. For the default:

```sh
node --input-type=module -e \
  'import { copyFileSync } from "node:fs"; copyFileSync(new URL(import.meta.resolve("oxlint-config-setup/json/default")), ".oxlintrc.json")'
pnpm oxlint --config .oxlintrc.json .
```

Replace `default` with `react`, `node`, `react-node`, `ai`, `react-ai`,
`node-ai`, `react-node-ai`, `typescript-syntax`, `vitest`, `jest`, or
`react-compiler`. Essential artifacts use `essential`, `essential-react`,
`essential-node`, `essential-react-node`, `essential-ai`,
`essential-react-ai`, `essential-node-ai`, or `essential-react-node-ai`. The
strict set uses the same suffixes with the `strict-` prefix. The
`react-compiler` name remains experimental even though its file path is stable.

## CI

Use the same direct command locally and in CI:

```yaml
- run: pnpm install --frozen-lockfile
- run: pnpm oxlint .
```

Pin the three tested components together. Do not widen the Oxlint peer range
without running the repository's fixture, print-config, package, and timing
gates.

## Migrate from `eslint-config-setup`

1. Keep the predecessor active while the new Oxlint command is evaluated.
2. Select the root profile matching the project context.
3. Run both tools on representative changes and classify differences by defect
   class, not rule count.
4. Move formatting, Markdown/MDX, spelling, and package metadata to the companion
   tools already responsible for those formats.
5. Remove ESLint only after accepted gaps are recorded for that project.

The shared preset intentionally does not translate arbitrary ESLint options or
load migration helpers at runtime.

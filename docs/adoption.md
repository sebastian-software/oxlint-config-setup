# Adoption guide

## Choose one root configuration

Projects use `getOxlintConfig()`. Its level and three Boolean context options are
fixed build-time dimensions and may be combined freely:

```ts
import { getOxlintConfig } from "oxlint-config-setup";

export default getOxlintConfig({
  level: "standard",
  react: true,
  node: true,
  ai: false,
});
```

`standard` is the default and the recommended complete policy for established
projects. Use `level: "essential"` for a smaller adoption baseline containing
only high-signal correctness, safety, accessibility, and framework invariants.
It is a strict subset of standard, not a relaxed interpretation of the same
rules.

Both levels remain type-aware and therefore require a discoverable
`tsconfig.json` and `oxlint-tsgolint@7.0.2001`. React, Node.js, and AI are
independent context flags; an essential React project is supported directly.

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

## Install and run

```sh
pnpm add -D oxlint-config-setup oxlint@1.77.0 oxlint-tsgolint@7.0.2001
pnpm oxlint .
```

The package has no install or postinstall script. Consumers execute only bundled
ESM, declarations, JSON data, Oxlint, and its native type-aware backend.

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

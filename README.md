# Oxlint Config Setup

Opinionated, prebuilt Oxlint configurations for modern TypeScript projects.

> [!IMPORTANT]
> v0.1 is a reviewed beta candidate, not a published stable release. The package,
> rule ledger, generated JSON, behavioral fixtures, and release gate are complete;
> publishing remains an explicit maintainer action.

## Install

Install the config with the exact peer versions tested as one compatibility trio:

```sh
pnpm add -D oxlint-config-setup oxlint@1.77.0 oxlint-tsgolint@7.0.2001
```

Create `oxlint.config.ts` and invoke Oxlint directly:

```ts
import { getOxlintConfig } from "oxlint-config-setup";

export default getOxlintConfig({
  level: "recommended",
  react: true,
  node: true,
  ai: true,
});
```

```sh
pnpm oxlint .
```

`level` accepts `"essential"`, `"recommended"`, or `"strict"` and defaults to
`"recommended"`. `react`, `node`, and `ai` default to `false`. The loader
selects one of 24 complete, prebuilt JSON configurations. It never composes
rules at runtime. Every configurable surface includes core, TypeScript syntax,
and type-aware TypeScript behavior.

Use `essential` for the smaller adoption baseline:

```ts
export default getOxlintConfig({
  level: "essential",
  react: true,
});
```

Essential materializes Oxlint's stable `correctness` category. Recommended adds
`suspicious` and `perf` and is the default. Strict adds `pedantic`, `style`, and
`restriction`; `nursery` remains disabled. Each level is a strict superset of
the previous level.

Levels control membership only. A rule keeps the same base severity and options
in every level where it is active; selecting a higher level only adds rules.

React and Node.js select project context. AI is a separate guardrail overlay: it
may tighten a rule already active at the selected level and may add rules
explicitly classified as AI-only. It never activates a level-controlled rule
from recommended or strict when that level is not selected, and it never weakens
an active rule.

## Shipped surfaces

| Need                                   | TypeScript package export                    | Public JSON subpath                          | Stability                                 |
| -------------------------------------- | -------------------------------------------- | -------------------------------------------- | ----------------------------------------- |
| Recommended core + complete TypeScript | `getOxlintConfig()`                          | `oxlint-config-setup/json/default`           | Stable, version-pinned type-aware backend |
| Essential adoption baseline            | `getOxlintConfig({ level: "essential" })`    | `oxlint-config-setup/json/essential`         | Stable, version-pinned type-aware backend |
| Strict policy                          | `getOxlintConfig({ level: "strict" })`       | `oxlint-config-setup/json/strict`            | Stable, version-pinned type-aware backend |
| React + JSX accessibility              | `getOxlintConfig({ react: true })`           | `oxlint-config-setup/json/react`             | Stable                                    |
| Node.js                                | `getOxlintConfig({ node: true })`            | `oxlint-config-setup/json/node`              | Stable                                    |
| AI guardrail overlay                   | `getOxlintConfig({ ai: true })`              | `oxlint-config-setup/json/ai`                | Stable warning and active-rule tightening |
| TypeScript without a project graph     | `getSyntaxOnlyOxlintConfig()`                | `oxlint-config-setup/json/typescript-syntax` | Stable                                    |
| Vitest                                 | `getVitestOxlintConfig()`                    | `oxlint-config-setup/json/vitest`            | Stable                                    |
| Jest                                   | `getJestOxlintConfig()`                      | `oxlint-config-setup/json/jest`              | Stable                                    |
| React Compiler diagnostics             | `getExperimentalReactCompilerOxlintConfig()` | `oxlint-config-setup/json/react-compiler`    | Experimental warning                      |

The recommended permutations use unprefixed public JSON subpaths such as
`react-node`, `react-ai`, `node-ai`, and `react-node-ai`. Essential and strict
equivalents use their level prefix, such as `essential-react-node-ai` and
`strict-react-node-ai`.

For a syntax-only project:

```ts
import { getSyntaxOnlyOxlintConfig } from "oxlint-config-setup";

export default getSyntaxOnlyOxlintConfig();
```

For Vitest (use the corresponding Jest export for Jest):

```ts
import { getVitestOxlintConfig } from "oxlint-config-setup";

export default getVitestOxlintConfig();
```

The React Compiler export is intentionally separate from stable React defaults:

```ts
import { getExperimentalReactCompilerOxlintConfig } from "oxlint-config-setup";

export default getExperimentalReactCompilerOxlintConfig();
```

## Customizing rules

The TypeScript API includes the predecessor's in-place rule helpers:

```ts
import {
  addRule,
  configureRule,
  disableRule,
  getOxlintConfig,
  setRuleSeverity,
} from "oxlint-config-setup";

const config = getOxlintConfig({ react: true, ai: true });

setRuleSeverity(config, "eslint/no-warning-comments", "error");
configureRule(config, "eslint/valid-typeof", [{ requireStringLiterals: true }]);
disableRule(config, "typescript/no-extra-non-null-assertion");
addRule(config, "eslint/no-alert", "error");

export default config;
```

`setRuleSeverity` preserves options. `configureRule` recursively merges plain
option objects while preserving severity and unspecified positional options.
Arrays, scalars, and `null` replace the value at their position rather than
being combined. Both helpers update explicit root and file-override occurrences.
`disableRule` turns those occurrences off, `addRule` writes to the root, and
`disableAllRulesBut(config, rule)` isolates one explicit rule for diagnostics.
Each loader call returns a fresh object, so customization does not mutate the
prebuilt artifact or later calls.

## JSON consumption

JSON artifacts contain the same complete objects as the TypeScript loaders. Copy
one through its public package export, then run the supported Oxlint CLI directly:

```sh
node --input-type=module -e \
  'import { copyFileSync } from "node:fs"; copyFileSync(new URL(import.meta.resolve("oxlint-config-setup/json/default")), ".oxlintrc.json")'
pnpm oxlint --config .oxlintrc.json .
```

This is the low-startup and standalone-binary path. Do not extend an internal
hashed file from `node_modules`; hashes are deliberately not public API.

## What the beta proves

The pinned Oxlint category baseline materializes 113 active base rules at
Essential, 166 at Recommended, and 484 at Strict. Project contexts expand that
surface: the fully selected React + Node + AI configurations contain 170, 233,
and 594 active rules respectively. The generated homepage inventory and
effective-config snapshots are the authority for exact membership.

The package also owns 27 curated ledger entries across core, imports,
TypeScript, React, accessibility, Node.js, Vitest, Jest, AI, and experimental
compiler concerns. Those entries document project-specific additions,
exclusions, conflicts, options, and activation boundaries with valid and invalid
fixtures. Type-aware fixtures execute `oxlint-tsgolint`, including a TypeScript
project-reference case.

Category-owned rules rely on Oxlint's native classification and documentation;
they do not pretend to have one repository fixture per identifier. Every
published configuration is nevertheless expanded into an explicit rule map at
build time, so dependency upgrades create reviewable diffs and all rule
customization helpers can target the effective output.

The earlier migration study mapped about 85.3% of predecessor source-rule
identifiers as discovery evidence. The new Strict surface approaches that
predecessor's scale using stable native Oxlint rules, while `nursery`,
JavaScript plugins, and non-source concerns remain excluded.

No ESLint runtime, migration helper, JavaScript React plugin, or `react-hooks`
JavaScript plugin is loaded by the package. Formatting, Markdown/MDX, spelling,
and package metadata remain companion-tool concerns.

## Supported matrix

| Component                  | Supported value |
| -------------------------- | --------------- |
| Consumer Node.js           | `>=24.11.0`     |
| Oxlint                     | `1.77.0`        |
| `oxlint-tsgolint`          | `7.0.2001`      |
| TypeScript behavior target | `7.0.2`         |
| npm clean consumer         | major 10 or 11  |
| pnpm clean consumer        | `11.20.0`       |
| Repository build Node.js   | `>=24.11.0`     |

Support for another Oxlint/backend/TypeScript version begins with an explicit
matrix run because the type-aware backend is outside Oxlint's normal semantic
versioning policy.

## Project documents

- [Product and documentation site](https://sebastian-software.github.io/oxlint-config-setup/)
- [Documentation site source](docs/app)
- [Adoption guide](docs/adoption.md)
- [Migration and companion-tool matrix](docs/migration.md)
- [Compatibility evidence and timings](docs/compatibility.md)
- [Generated rule catalog](docs/rule-catalog.md)
- [v0.1 beta review](docs/release-review.md)
- [Beta release notes](docs/releases/v0.1.0-beta.1.md)
- [Architecture decisions](docs/adr/README.md)

## Contributing

Run the complete local gate:

```sh
pnpm install --frozen-lockfile
pnpm release:check
pnpm docs:check
```

Ledger changes require `pnpm generate`; `pnpm generate:check` fails on stale
catalog or effective-config snapshots. The Ardo site generates its homepage
statistics and rule-catalog route from the same package sources before every
build. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)

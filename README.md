# Oxlint Config Setup

An opinionated, Oxlint-only linting preset for modern JavaScript and TypeScript projects.

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
  react: true,
  node: true,
  ai: true,
});
```

```sh
pnpm oxlint .
```

`react`, `node`, and `ai` default to `false`. The loader selects one of eight
complete, prebuilt JSON configurations. It never composes rules at runtime.
Every standard configuration includes core, import, TypeScript syntax, and
type-aware TypeScript behavior.

## Shipped surfaces

| Need | TypeScript package export | Public JSON subpath | Stability |
| --- | --- | --- | --- |
| Core + complete TypeScript | `getOxlintConfig()` | `oxlint-config-setup/json/default` | Stable, version-pinned type-aware backend |
| React + JSX accessibility | `getOxlintConfig({ react: true })` | `oxlint-config-setup/json/react` | Stable |
| Node.js | `getOxlintConfig({ node: true })` | `oxlint-config-setup/json/node` | Stable |
| AI-assisted-development marker | `getOxlintConfig({ ai: true })` | `oxlint-config-setup/json/ai` | Stable warning |
| TypeScript without a project graph | `getSyntaxOnlyOxlintConfig()` | `oxlint-config-setup/json/typescript-syntax` | Stable |
| Vitest | `getVitestOxlintConfig()` | `oxlint-config-setup/json/vitest` | Stable |
| Jest | `getJestOxlintConfig()` | `oxlint-config-setup/json/jest` | Stable |
| React Compiler diagnostics | `getExperimentalReactCompilerOxlintConfig()` | `oxlint-config-setup/json/react-compiler` | Experimental warning |

The standard Boolean permutations also expose public JSON subpaths for
`react-node`, `react-ai`, `node-ai`, and `react-node-ai`.

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

The beta enables 27 ledger-owned rules across core, imports, TypeScript, React,
accessibility, Node.js, Vitest, Jest, AI, and experimental compiler concerns.
Each rule has valid and invalid fixtures asserting diagnostic file, location,
and identity. Type-aware fixtures execute `oxlint-tsgolint`, including a
TypeScript project-reference case.

This is **behavioral coverage**, not an **identifier mapping** claim. The earlier
migration study mapped about 85.3% of predecessor source-rule identifiers as
discovery evidence; it did not prove equivalent behavior. v0.1 instead ships a
smaller reviewed baseline and documents every deferred concern.

No ESLint runtime, migration helper, JavaScript React plugin, or `react-hooks`
JavaScript plugin is loaded by the package. Formatting, Markdown/MDX, spelling,
and package metadata remain companion-tool concerns.

## Supported matrix

| Component | Supported value |
| --- | --- |
| Consumer Node.js | `^22.18.0 \|\| >=24.0.0` |
| Oxlint | `1.77.0` |
| `oxlint-tsgolint` | `7.0.2001` |
| TypeScript behavior target | `7.0.2` |
| npm clean consumer | major 10 or 11 |
| pnpm clean consumer | `11.20.0` |
| Repository build Node.js | `^22.18.0 \|\| >=24.11.0` |

Support for another Oxlint/backend/TypeScript version begins with an explicit
matrix run because the type-aware backend is outside Oxlint's normal semantic
versioning policy.

## Project documents

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
```

Ledger changes require `pnpm generate`; `pnpm generate:check` fails on stale
catalog or effective-config snapshots. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)

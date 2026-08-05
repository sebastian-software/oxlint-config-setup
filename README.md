# Oxlint Config Setup

An opinionated, Oxlint-first linting preset for modern TypeScript projects.

> [!IMPORTANT]
> This project is pre-beta. The production package and its deterministic release
> path exist, but the curated rule ledger and framework profiles are still being
> implemented. Do not treat the current rule selection as the final v0.1 preset.

## Goal

Provide a high-signal linting setup with one primary runtime: Oxlint. The project
optimizes for developer value, speed, and a small operational surface—not for
rule-by-rule ESLint parity.

The intended stack is:

- native Oxlint rules wherever possible;
- Oxlint's type-aware linting for TypeScript correctness;
- JavaScript plugins only for valuable rule families that have no suitable
  native implementation;
- separate tools for concerns Oxlint does not own, such as formatting or prose.

## Package usage

Once a package version is published, install the config together with its exact
tested Oxlint and type-aware backend peers:

```sh
pnpm add -D oxlint-config-setup oxlint@1.77.0 oxlint-tsgolint@7.0.2001
```

Create `oxlint.config.ts` in the project root:

```ts
import { getOxlintConfig } from "oxlint-config-setup";

export default getOxlintConfig({
  react: true,
  node: true,
  ai: true,
});
```

`react`, `node`, and `ai` default to `false`. The loader validates the options
and selects one of eight complete JSON artifacts generated at package build
time. It does not compose rules at runtime. Every permutation enables native
type-aware linting, so consumers need a valid TypeScript project graph and the
matching `oxlint-tsgolint` backend.

The AI option is already behavioral rather than an artifact-name placeholder:
the initial package slice enables `no-warning-comments`. This is deliberately a
provisional rule until the rule ledger defines the reviewed production AI
selection. React and Node currently establish the native plugin boundaries; the
curated framework rules follow in their profile issues.

## Supported toolchain

| Context                    | Supported version                  |
| -------------------------- | ---------------------------------- |
| Package consumer Node.js   | `^22.18.0 \|\| >=24.0.0`           |
| Oxlint peer                | `1.77.0`                           |
| `oxlint-tsgolint` peer     | `7.0.2001`                         |
| Clean consumer installers  | npm `^10 \|\| ^11`; pnpm `11.20.0` |
| Repository package manager | pnpm `11.20.0`                     |
| Repository build Node.js   | `^22.18.0 \|\| >=24.11.0`          |
| TypeScript authoring       | `7.0.2`                            |

The build range is intentionally different from the consumer range. The pinned
tsdown build tool requires Node `^22.18.0 || >=24.11.0`, while the emitted ESM
targets Node 22 and remains installable on Node 24.0. Consumers execute only the
built JavaScript and prebuilt JSON from `node_modules`; package installation
does not run TypeScript or repository lifecycle scripts.

Oxlint, `oxlint-tsgolint`, and TypeScript are tested as one version trio because
the type-aware backend is outside Oxlint's normal semantic-versioning policy.
Support for another version starts with an explicit compatibility run, not an
open peer range.

## Principles

1. One linter command should cover the normal JavaScript and TypeScript workflow.
2. Native rules take precedence over compatibility layers.
3. React is covered by Oxlint's native React rules, not by loading an ESLint React
   plugin to chase numerical parity.
4. Every enabled rule must justify its signal, cost, and maintenance risk.
5. Compatibility percentages are evidence, not product requirements.

## Relationship to the predecessor

This is a new project, not a rewrite in place. The earlier
[`eslint-config-setup`](https://github.com/sebastian-software/eslint-config-setup)
project remains the historical reference for rule intent and real-world usage.
It combines ESLint and Oxlint; this repository explores what a deliberately
Oxlint-native successor should look like.

## Contributing

Design changes start as RFCs. Durable technical choices are recorded as ADRs.
See [CONTRIBUTING.md](CONTRIBUTING.md) for the review model.

## License

[MIT](LICENSE)

# Migration and companion-tool matrix

The table assigns every predecessor concern identified by the baseline and rule
capability catalog. "Oxlint" means the concern is covered by materialized native
categories or a curated ledger entry; "Research" does not mean a plugin is
approved.

| Predecessor concern            | Assignment     | Current treatment                                                       | Accepted difference or next gate                                                          |
| ------------------------------ | -------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| JavaScript correctness         | Oxlint         | Stable native category baseline                                         | Essential starts with `correctness`; Recommended and Strict add broader native categories |
| TypeScript syntax              | Oxlint         | Native TypeScript category rules plus curated overrides                 | Available without a project graph through the narrower syntax-only export                 |
| TypeScript semantics           | Oxlint         | Native type-aware category rules plus curated fixtures                  | Pinned Oxlint/tsgolint/TypeScript trio is mandatory                                       |
| Imports and modules            | Oxlint         | Native import category rules plus explicit conflict ownership           | Native rules replace JavaScript fallbacks; overlapping owners stay reviewable             |
| React and JSX                  | Oxlint         | Native React categories when `react: true`                              | No Meta React or `react-hooks` JavaScript plugin                                          |
| React ESLint ecosystems        | Accepted gap   | No compatibility plugin                                                 | Native defect coverage supersedes plugin-identity parity                                  |
| JSX accessibility              | Oxlint         | Native JSX accessibility categories when `react: true`                  | Project context controls the entire accessibility surface                                 |
| React Compiler                 | Research       | One isolated experimental native warning                                | Never enters configurable React defaults silently                                         |
| Node.js                        | Oxlint         | Native Node.js categories when `node: true` plus curated module hazards | The preset does not impose a universal ESM/CommonJS style at lower levels                 |
| Vitest                         | Oxlint         | Native runner checks scoped to canonical test files                     | Select the Vitest scope; Vitest and Jest cannot be combined                               |
| Jest                           | Oxlint         | Native runner checks scoped to canonical test files                     | Select the Jest scope; Jest and Vitest cannot be combined                                 |
| Regular expressions            | Deferred       | No regular-expression plugin is enabled                                | Revisit only with an approved isolated runtime and integration evidence                   |
| Testing Library                | Oxlint         | Package-owned JavaScript plugin, automatic on `*.test.{ts,tsx}` and `__tests__/**/*.{ts,tsx}` | Inherits the plugin's DOM preset, or its React preset when React is selected |
| Playwright                     | Oxlint         | Package-owned JavaScript plugin, automatic on `*.spec.ts`               | Inherits the plugin's `flat/recommended` preset                                             |
| Storybook                      | Oxlint         | Package-owned JavaScript plugin, automatic on `*.stories.{ts,tsx}`      | Inherits the plugin's `flat/recommended` story rules                                      |
| SonarJS                        | Deferred       | No JavaScript plugin; two branch-body candidates have no demonstrated native equivalent | Revisit only with an approved isolated runtime plus per-path native-overlap, fixer-safety, fixture, and performance evidence |
| Sorting and formatting         | Companion tool | Biome via `quality:format` and `biome.json`                             | Layout is outside the linter budget                                                       |
| JSON and package metadata      | Companion tool | Ajv, publint, and sort-package-json via `quality:json`/`quality:package` | Oxlint source coverage does not include these formats                                     |
| Markdown and MDX               | Companion tool | markdownlint-cli2 via `quality:markdown`                                | JavaScript-plugin support does not make custom formats executable                         |
| Spelling                       | Companion tool | CSpell via `quality:spelling`                                           | Repository prose quality is not program linting                                           |
| Project-specific policy trivia | Accepted gap   | Not generalized                                                         | Shared defaults include only portable defect classes                                      |
| AI-assisted development        | Oxlint         | Constrained overlay with explicit additions and option changes          | AI cannot widen the selected policy category set                                          |

## Coverage language

The 2026-08-04 baseline found that migration metadata mapped roughly 85.3% of
the predecessor's source-code rule identifiers. That remains identifier mapping,
not behavioral equivalence.

The current preset makes two distinct claims:

- Oxlint's pinned stable categories provide the broad native baseline and are
  materialized into explicit, snapshot-tested artifacts; and
- all 27 curated ledger entries have repository-owned rationale, activation
  boundaries, and executable valid/invalid evidence.

No raw parity percentage is a release gate. A curated rule or exception enters
only when its defect class, execution path, stability, conflicts, fixture, and
review trigger are recorded in the ledger. An Oxlint upgrade must separately
review every generated category diff.

Package-owned JavaScript-plugin integrations use a narrower evidence model: the
package verifies activation, file isolation, runtime resolution, and a real
diagnostic from a clean consumer. The upstream plugin suite owns individual rule
semantics, so those rules are not duplicated as local ledger fixtures.

## Turnkey companion stack

The repository-owned [companion-quality template](../templates/companion-quality)
turns the four companion rows into a runnable stack. It is separate from the
published Oxlint package: copy its configuration and exact development
dependencies into the consuming repository, then run either:

```sh
npm ci
npm run quality
```

```sh
pnpm install --frozen-lockfile
pnpm run quality
```

See the template README for maintained configuration, fixes, JSON Schema wiring,
ignore/generated-file behavior, editor settings, pre-commit handling, and CI.

# Config packaging spike

- **Measured:** 2026-08-05
- **Issue:** [#5: Spike: prove TypeScript shared config and JSON artifact paths][issue]
- **Purpose:** Provide acceptance evidence for ADR 0005
- **Prototype:** [`spikes/config-packaging/`][prototype]

## Executive result

The revised direction in ADR 0005 works: an option-based loader selects prebuilt
JSON through `oxlint.config.ts`, the same JSON works with the standalone binary,
all supported option permutations are deterministic, and neither path needs an
ESLint runtime.

**Recommendation: revise ADR 0005 as proposed, then accept it after maintainer
review.** Keep TypeScript as the authoring and generation language, while making
these boundaries explicit:

1. The supported TypeScript-config runtime is Node `^22.18.0 || >=24.0.0`, which
   is narrower than the `oxlint` npm package engine range.
2. `getOxlintConfig(options)` selects a fully built root config. It does not
   compose rules at runtime. React, Node, and AI are fixed dimensions, with AI
   treated as a first-class product option.
3. Every standard artifact is type-aware. There is no public `typeAware` switch
   or syntax-only standard permutation.
4. Publish each generated JSON profile as a versioned, first-class release asset.
   Standalone users copy it to a consumer-local `.oxlintrc.json`; they do not
   reference a repository-relative or package-internal path.
5. Keep JavaScript-plugin path localization separate from rule composition.
   Oxlint resolves plugin specifiers relative to the consumer config.

The measurements do not justify rejecting the TypeScript path. They do show a
visible fresh-process cost on tiny projects, so the JSON path should remain a
supported workflow rather than only a review artifact.

## Versions and environment

| Component | Tested value |
| --- | --- |
| Oxlint npm package | 1.77.0 |
| Oxlint standalone release | `apps_v1.77.0` |
| TypeScript | 7.0.2 |
| Node | 24.18.0 |
| pnpm | 11.20.0 |
| Host | macOS 26.5, Apple M1 Ultra, 64 GB RAM |

CI repeats the behavioral and equivalence checks on Linux with Node 22.18.0 and
the current Node 24 release. The benchmark is a dated local observation, not a
cross-host performance promise.

There is a three-way Node constraint to keep visible: the npm package metadata
allows `^20.19.0 || >=22.12.0`, the shipped TypeScript loader source allows
`^20.19.0 || >=22.18.0`, and the current config guide documents Node 22.18+ or
24+. The spike follows the documented range. Node 20.19 could be added only after
an explicit compatibility run and a decision to support a version the config
guide does not currently list.

## Prototype shape

The disposable package owns one small build-time config factory. A fixed bitmask
maps React to bit 0, Node to bit 1, and AI to bit 2. A namespaced SHA-256 digest
turns each mask into an internal file name. The generator enumerates all eight
values and writes a complete JSON root config for each.

This preserves the predecessor's option, bitmask, permutation, and loader
contracts. Two target-specific details change deliberately: this new package uses
a package-specific SHA-256 namespace with 12 hex characters instead of the
predecessor's SHA-1 namespace with 8, and it serializes Oxlint data directly
instead of generating executable ESLint modules or migrating ESLint config. No
published `oxlint-config-setup` artifact contract exists to preserve yet.

The public package does not expose the factory or artifact names. Its contract is:

```ts
import { getOxlintConfig } from "@oxlint-config-setup/spike-config";

export default getOxlintConfig({ react: true, node: true, ai: true });
```

The loader validates options, computes the stable name, parses the matching file
from the package's `dist/configs` build output, and verifies the mandatory
type-aware invariant. It does not merge rule objects. Every artifact contains
`options.typeAware: true`. `oxlint-tsgolint` 7.0.2001 is pinned with Oxlint 1.77.0
and TypeScript 7.0.2.

The repository tracks the TypeScript factory and generator, not generated JSON.
The package build compiles TypeScript and emits all eight configs. `prepack`
repeats that complete build, so a fresh checkout produces a complete tarball
without relying on prior workspace state.

`typescript/no-floating-promises` is the representative type-aware spike rule. A
fixture proves that the type-aware backend reports a floating promise. The final
type-aware rule selection remains part of issue #9.

The AI option activates `no-warning-comments` only as an observable spike marker.
A fixture proves the option changes behavior. The production AI rule selection
remains outside this issue.

## Acceptance evidence

| Criterion | Evidence |
| --- | --- |
| Import a package profile | the TypeScript consumer calls the workspace package's public `getOxlintConfig(options)` export |
| Complete option space | the generator and verifier enumerate all eight React, Node, and AI permutations |
| Stable internal mapping | golden hashes freeze bit positions, namespace, uniqueness, and determinism |
| Mandatory type-aware mode | all eight artifacts contain `options.typeAware: true`, and no public option can disable it |
| AI option behavior | the AI permutation reports the spike marker while the matching non-AI permutation does not |
| `--print-config` proves activation | all three supported variants report the same effective config and explicit base and type-aware rule severities |
| Behavioral proof | the valid fixture exits 0; the invalid fixture reports `no-console`, `no-debugger`, and `typescript/no-floating-promises`, then exits 1 |
| Standalone workflow | the verifier stages generated JSON as consumer-local `.oxlintrc.json`, runs from that directory, and invokes standalone Oxlint with an explicit native `tsgolint` path |
| Equivalent TypeScript and JSON | parsed `--print-config` objects are deep-equal |
| Deterministic artifacts | the verifier starts from an absent `dist`, compares all eight files byte-for-byte with the build-time factory, repeats the build, and requires byte-identical output |
| Package contents | `prepack` rebuilds from an absent `dist`, and the verifier requires the tarball to contain exactly the eight golden-mapped configs |
| Repository hygiene | generated JSON and `dist` are ignored; the verifier rejects tracked build artifacts |
| Loader failures | invalid and unknown options, missing files, and corrupt JSON fail with specific messages |
| No ESLint runtime | manifests and lockfile are checked; no dependency name contains ESLint |
| No custom lint wrapper | subprocesses execute either the official npm `oxlint` executable or official standalone binary |

`pnpm run check` performs all of these assertions. It failed before the package,
fixtures, and artifact existed, which confirms that the check protects the gap
rather than only documenting it.

## Effective configuration

Oxlint 1.77.0 normalizes `error` to `deny`, `off` to `allow`, and includes default
settings in `--print-config`. For the no-option permutation, each consumption path
reports the same core values:

```json
{
  "plugins": ["typescript"],
  "categories": { "correctness": "allow" },
  "options": { "typeAware": true },
  "rules": {
    "no-console": "warn",
    "no-debugger": "deny",
    "typescript/no-floating-promises": "deny"
  }
}
```

The omitted settings, globals, environment, and ignore values are also equal in
the automated deep comparison.

## Shared-config composition finding

The official TypeScript example composes imported objects with `extends`. The
prototype initially did the same. Rules survived, but the effective result was
not equivalent to loading the same object as JSON:

- the imported `plugins: []` did not replace Oxlint's root default plugins;
- the imported `categories.correctness: "off"` did not appear as the same root
  category setting;
- the explicit rules did merge and remained active.

The `typescript-extends` fixture keeps this observation reproducible.
The supported equivalence fixture uses the loader result as a complete root
config. This reinforces the product contract: option selection returns a complete
prebuilt config, not a concern fragment for runtime composition.

## Standalone JSON finding

Oxlint's JSON `extends` accepts file paths relative to the declaring config; it
does not resolve package imports. Pointing from a consumer config into a package
manager's installation layout would couple the workflow to hoisting and store
details.

A consumer-local copy avoids that coupling:

1. download a versioned config asset as `.oxlintrc.json`;
2. download the matching official standalone Oxlint release;
3. install the matching native `tsgolint` binary;
4. invoke Oxlint with `OXLINT_TSGOLINT_PATH=./tsgolint`.

The spike verifies the standalone binary with an explicit native backend path and
models step 1 from the selected no-option artifact. Production publishing
automation remains a non-goal, but ADR 0005 needs to commit to a stable selector
or asset location if standalone consumers are part of the package contract.
Internal hashes are not a consumer API.

## JavaScript-plugin seam

Generated root configs can include complete `jsPlugins` entries when the planned
plugins arrive. Oxlint resolves plugin specifiers relative to the config file,
which differs between a package loader and a copied consumer-local JSON file.

The production loader or setup command must therefore localize package-owned
plugin paths after selecting an artifact. This is path localization only. Rule
selection and plugin enablement remain prebuilt. A package-install conformance
fixture should cover this seam when JavaScript plugins enter scope.

## Timing method

The benchmark measures wall-clock time around a complete Oxlint subprocess. Each
sample starts a new process. It runs three warm-ups followed by 30 measured runs,
rotates scenario order, fixes Oxlint to one thread, captures output, and does not
flush filesystem caches.

Two inputs are measured:

- one valid TypeScript file for fresh-process cold-start;
- a 12-file TypeScript directory for a small-project run.

Both the npm-package and standalone workflows compare generated JSON with a
hand-authored direct JSON baseline. This separates TypeScript-loader cost from
the larger difference between the Node package executable and standalone binary.

### Fresh process, one file

| Runtime | Variant | Median | p95 | Median vs matching direct JSON |
| --- | --- | ---: | ---: | ---: |
| Node package | TypeScript package import | 290.01 ms | 299.65 ms | +21.8% |
| Node package | Generated JSON | 237.91 ms | 256.00 ms | -0.1% |
| Node package | Direct JSON | 238.12 ms | 246.51 ms | baseline |
| Standalone | Generated JSON | 139.50 ms | 197.34 ms | -0.7% |
| Standalone | Direct JSON | 140.53 ms | 206.17 ms | baseline |

### Fresh process, 12-file project

| Runtime | Variant | Median | p95 | Median vs matching direct JSON |
| --- | --- | ---: | ---: | ---: |
| Node package | TypeScript package import | 295.60 ms | 339.33 ms | +21.7% |
| Node package | Generated JSON | 243.64 ms | 353.20 ms | +0.3% |
| Node package | Direct JSON | 242.95 ms | 360.80 ms | baseline |
| Standalone | Generated JSON | 231.10 ms | 287.55 ms | +2.8% |
| Standalone | Direct JSON | 224.89 ms | 300.88 ms | baseline |

Generated and direct JSON are within ordinary run-to-run noise. On this host,
loading the imported TypeScript config and selecting its prebuilt artifact adds
about 52 ms over direct JSON through the same npm executable. Mandatory
type-aware mode raises every variant because each process starts the type-aware
backend. It also narrows the npm-versus-standalone gap as the project grows. The
p95 values are noisy; median values are the useful comparison for this small
sample.

Reproduce with:

```sh
cd spikes/config-packaging
pnpm install --frozen-lockfile
pnpm run benchmark
```

## Runtime and package-manager constraints

| Workflow | Node | Package manager | Oxlint form |
| --- | --- | --- | --- |
| TypeScript package import | `^22.18.0 || >=24.0.0` | pnpm 11.20.0 in the spike; consumers may use another manager that installs package exports correctly | npm `oxlint` package |
| Generated JSON through npm | npm package engine currently allows `^20.19.0 || >=22.12.0` | any compatible installer | npm `oxlint` package |
| Generated or direct JSON standalone | not required at lint time after native binaries are installed | not required at lint time | official Oxlint and matching `tsgolint` platform binaries |

The pinned pnpm version makes this spike reproducible; it is not a proposed
production consumer requirement. The package export map, generated release
output, and peer dependency must still be tested under any package managers the
production package claims to support. Installers must retain `oxlint`'s matching
optional native binding; omitting optional dependencies breaks the npm
executable.

## ADR 0005 changes to review

Keep the ADR `proposed` until maintainers decide. The evidence supports revising
these parts before acceptance:

- replace “sufficiently new Node runtime” with the tested explicit range and
  separate it from the npm package's broader engine range;
- freeze the public React, Node, and AI option contract and keep hashes internal;
- generate complete root configs and prohibit runtime rule composition;
- make type-aware mode an invariant rather than a public switch;
- replace the unresolved “relative-path or copy workflow” with a versioned
  consumer-local JSON asset contract;
- keep JavaScript-plugin path localization as a separate, tested seam;
- state that the measured TypeScript fresh-process overhead is acceptable for the
  typed workflow only while JSON remains a supported low-startup alternative;
- keep reproducible clean-build, package-content, and latest-version behavioral
  checks in CI; do not compare against committed generated JSON.

Sebastian Software maintainers remain the decision owner.

## Primary references

- [Oxlint configuration and shared configs][configuration]
- [Oxlint quickstart and `--print-config`][quickstart]
- [Oxlint 1.77.0 release and standalone assets][release]
- [Oxlint 1.77.0 npm package][npm]
- [Oxlint 1.77.0 TypeScript-loader Node range][loader-range]
- [Node.js TypeScript support][node-typescript]
- [pnpm installation through Corepack][pnpm-corepack]

[configuration]: https://oxc.rs/docs/guide/usage/linter/config.html
[issue]: https://github.com/sebastian-software/oxlint-config-setup/issues/5
[loader-range]: https://github.com/oxc-project/oxc/blob/oxlint_v1.77.0/apps/shared/src-js/js_config/node_version.ts
[node-typescript]: https://nodejs.org/api/typescript.html
[npm]: https://registry.npmjs.org/oxlint/1.77.0
[pnpm-corepack]: https://pnpm.io/installation#using-corepack
[prototype]: ../../spikes/config-packaging/README.md
[quickstart]: https://oxc.rs/docs/guide/usage/linter/quickstart.html
[release]: https://github.com/oxc-project/oxc/releases/tag/apps_v1.77.0

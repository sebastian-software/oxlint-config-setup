# Config packaging spike

- **Measured:** 2026-08-05
- **Issue:** [#5: Spike: prove TypeScript shared config and JSON artifact paths][issue]
- **Purpose:** Provide acceptance evidence for ADR 0005
- **Prototype:** [`spikes/config-packaging/`][prototype]

## Executive result

The core direction in ADR 0005 works: a typed package export loads through
`oxlint.config.ts`, deterministic JSON works with the standalone binary, the two
representations can produce the same effective config, and neither path needs an
ESLint runtime.

**Recommendation: revise ADR 0005 before accepting it.** Keep TypeScript as the
authoring source and keep both outputs, but make three boundaries explicit:

1. The supported TypeScript-config runtime is Node `^22.18.0 || >=24.0.0`, which
   is narrower than the `oxlint` npm package engine range.
2. Define whether a public profile is a complete root config or an `extends`
   fragment. Oxlint 1.77.0 merges root fields differently through `extends`, so
   direct TypeScript and JSON configs are not automatically equivalent for every
   object shape.
3. Publish each generated JSON profile as a versioned, first-class release asset.
   Standalone users copy it to a consumer-local `.oxlintrc.json`; they do not
   reference a repository-relative or package-internal path.

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

The disposable package owns one small typed profile:

```ts
export const recommended = defineConfig({
  categories: { correctness: "off" },
  plugins: [],
  rules: {
    "no-console": "warn",
    "no-debugger": "error",
  },
});
```

The equivalent TypeScript consumer imports the package and uses the object as its
root config:

```ts
import { recommended } from "@oxlint-config-setup/spike-config";
import { defineConfig } from "oxlint";

export default defineConfig(recommended);
```

The generator serializes that same object to `generated/recommended.json`. A
separate direct JSON fixture is hand-authored as the baseline. The profile is
deliberately small because rule selection remains outside this issue.

## Acceptance evidence

| Criterion | Evidence |
| --- | --- |
| Import a package profile | the TypeScript consumer resolves the workspace package's public export |
| `--print-config` proves activation | all three supported variants report the same effective config and explicit `no-console`/`no-debugger` severities |
| Behavioral proof | the valid fixture exits 0; the invalid fixture reports both rules and exits 1 |
| Standalone workflow | the verifier stages generated JSON as consumer-local `.oxlintrc.json` and invokes the downloaded release binary directly |
| Equivalent TypeScript and JSON | parsed `--print-config` objects are deep-equal |
| Deterministic artifact | the verifier compares checked-in JSON byte-for-byte with serialization of the built TypeScript export |
| No ESLint runtime | manifests and lockfile are checked; no dependency name contains ESLint |
| No custom lint wrapper | subprocesses execute either the official npm `oxlint` executable or official standalone binary |

`pnpm run check` performs all of these assertions. It failed before the package,
fixtures, and artifact existed, which confirms that the check protects the gap
rather than only documenting it.

## Effective configuration

Oxlint 1.77.0 normalizes `error` to `deny`, `off` to `allow`, and includes default
settings in `--print-config`. After normalization, each supported variant reports:

```json
{
  "plugins": [],
  "categories": { "correctness": "allow" },
  "rules": {
    "no-console": "warn",
    "no-debugger": "deny"
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

The checked-in `typescript-extends` fixture keeps this observation reproducible.
The supported equivalence fixture uses the package object directly. Before a
production package offers composable concern fragments, ADR 0005 or its packaging
RFC should specify which fields fragments may own and how generated root configs
normalize those merge semantics.

## Standalone JSON finding

Oxlint's JSON `extends` accepts file paths relative to the declaring config; it
does not resolve package imports. Pointing from a consumer config into a package
manager's installation layout would couple the workflow to hoisting and store
details.

A consumer-local copy avoids that coupling:

1. download a versioned config asset as `.oxlintrc.json`;
2. download the matching official standalone Oxlint release;
3. invoke `./oxlint --config ./.oxlintrc.json ./src`.

The spike verifies steps 2 and 3 with the official release asset and models step
1 from the generated artifact. Production publishing automation remains a
non-goal, but ADR 0005 needs to commit to a stable asset location if standalone
consumers are part of the package contract.

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
| Node package | TypeScript package import | 148.41 ms | 246.61 ms | +36.6% |
| Node package | Generated JSON | 108.03 ms | 178.25 ms | -0.6% |
| Node package | Direct JSON | 108.63 ms | 259.78 ms | baseline |
| Standalone | Generated JSON | 6.64 ms | 8.99 ms | -1.9% |
| Standalone | Direct JSON | 6.77 ms | 10.01 ms | baseline |

### Fresh process, 12-file project

| Runtime | Variant | Median | p95 | Median vs matching direct JSON |
| --- | --- | ---: | ---: | ---: |
| Node package | TypeScript package import | 149.12 ms | 167.66 ms | +36.9% |
| Node package | Generated JSON | 108.14 ms | 111.72 ms | -0.7% |
| Node package | Direct JSON | 108.94 ms | 112.29 ms | baseline |
| Standalone | Generated JSON | 6.81 ms | 8.57 ms | -1.8% |
| Standalone | Direct JSON | 6.94 ms | 7.47 ms | baseline |

Generated and direct JSON are within ordinary run-to-run noise. On this host,
loading the imported TypeScript config adds about 40 ms over direct JSON through
the same npm executable. The npm executable itself accounts for most of the gap
to the standalone workflow. The one-file p95 values are noisy; median values are
the useful comparison for this small sample.

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
| Generated or direct JSON standalone | not required at lint time | not required at lint time | official platform binary |

The pinned pnpm version makes this spike reproducible; it is not a proposed
production consumer requirement. The package export map, generated files, and
peer dependency must still be tested under any package managers the production
package claims to support. Installers must retain `oxlint`'s matching optional
native binding; omitting optional dependencies breaks the npm executable.

## ADR 0005 changes to review

Keep the ADR `proposed` until maintainers decide. The evidence supports revising
these parts before acceptance:

- replace “sufficiently new Node runtime” with the tested explicit range and
  separate it from the npm package's broader engine range;
- define complete root profiles separately from composable fragments, including
  how `plugins`, `categories`, overrides, and other root fields become equivalent
  JSON;
- replace the unresolved “relative-path or copy workflow” with a versioned
  consumer-local JSON asset contract;
- state that the measured TypeScript fresh-process overhead is acceptable for the
  typed workflow only while JSON remains a supported low-startup alternative;
- keep generated-output drift and latest-version behavioral checks in CI.

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

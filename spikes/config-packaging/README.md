# Config packaging spike

This is the disposable prototype for [issue #5][issue]. It proves the package
and consumer paths needed to review ADR 0005. It is not the production package
or a final rule-selection proposal.

## What it proves

- `@oxlint-config-setup/spike-config` exposes a typed
  `getOxlintConfig(options)` loader.
- React, Node, and AI are fixed Boolean option dimensions. The build emits all
  eight complete JSON permutations under stable internal hashes.
- the loader validates options, selects one prebuilt file, and does not compose
  rules at runtime;
- every permutation sets `options.typeAware: true`; there is no syntax-only
  standard option, `oxlint-tsgolint` is pinned, and a floating-promise fixture
  proves the backend is active;
- AI is a first-class option. A small `no-warning-comments` rule is only a
  behavioral marker for this spike, not the proposed production AI rule set;
- `fixtures/typescript/oxlint.config.ts` selects its config through the public
  loader;
- `--print-config` is equal for the loader-selected config, staged generated JSON,
  and the hand-authored direct-JSON baseline;
- the JSON check invokes the official standalone Oxlint binary directly;
- package manifests and the lockfile contain no ESLint runtime;
- all repository-owned scripts are TypeScript, execute through pinned `tsx`, and
  pass a separate `tsc --noEmit` check;
- pinned `tsdown` builds the publishable ESM library and declarations before the
  source-based generator writes JSON.

The public usage shape matches the predecessor project:

```ts
import { getOxlintConfig } from "@oxlint-config-setup/spike-config";

export default getOxlintConfig({ react: true, node: true, ai: true });
```

The hashes and generated file names are internal. The verifier freezes the option
bit positions and expected hashes so an accidental mapping change fails CI. The
[findings note][findings] records the evidence and ADR recommendation.

Generated JSON is ignored build output under
`packages/shared-config/dist/configs`, not checked-in source. The package's
`prepack` step performs the complete TypeScript build and generation pass, and
the published tarball includes `dist` with all eight permutations. It contains
`index.js`, `index.d.ts`, and the JSON configs, but no source TypeScript or
internal scripts.

Internal scripts use `tsx` instead of Node's native TypeScript execution. Node
22's native support is experimental and ignores the project `tsconfig`; `tsx`
applies consistent execution across the supported Node matrix. Because `tsx`
does not type-check, `tsc --noEmit` remains an explicit build and check step.
tsdown owns publish output and keeps dependencies and peers external. Future
library or CLI entry points can use the same tsdown configuration, but this
spike does not introduce a CLI or use experimental executable bundling.

## Requirements

- Node `^22.18.0 || >=24.11.0` to build the spike with tsdown;
- Node `^22.18.0 || >=24.0.0` to consume the built shared config from
  `oxlint.config.ts`;
- pnpm 11.20.0 through Corepack;
- `tar` for the automated macOS/Linux standalone-binary setup.

Oxlint's npm package declares a wider Node engine range, but its current config
documentation requires Node 22.18+ or 24+ for TypeScript config files. This
prototype enforces the narrower user-facing requirement. The standalone JSON
consumer also needs the matching native `tsgolint` binary because type-aware mode
is mandatory. Lint execution needs neither Node nor pnpm after the two native
binaries and selected JSON artifact have been installed.

## Run the spike

From this directory:

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm run check
pnpm run benchmark
```

`pnpm run check` downloads the pinned official Oxlint 1.77.0 standalone archive
once, verifies the cached archive against its published SHA-256 digest on every
run, and re-extracts the binary under `.cache/`. It points standalone Oxlint
directly at the native binary from the pinned `oxlint-tsgolint` platform package.
Set `OXLINT_STANDALONE=/absolute/path/to/oxlint` to use an existing official
binary on another platform.

After changing the TypeScript factory or generator, rebuild and verify the
release output:

```sh
pnpm run generate
pnpm run check
```

The normal build type-checks package source and tooling, lets tsdown clean and
bundle the public library, and regenerates all eight JSON files through tsx. The
check also type-checks root scripts, removes `dist`, repeats two clean builds,
requires byte-identical artifacts, and creates a package tarball from another
absent `dist`. It verifies an exact tarball allowlist of the package manifest,
`index.js`, `index.d.ts`, and eight golden-mapped configs. Git must track no
generated JSON or `dist` output.

## JavaScript-plugin seam

JavaScript plugins will become another build-time concern. Generated permutations
can carry complete `jsPlugins` entries, but Oxlint resolves each specifier relative
to the consumer config file. A production loader or setup command must localize
package-owned plugin paths after selecting the artifact. That localization may
change paths only. Rule composition remains a build-time operation.

This spike does not ship a custom plugin because custom rules are outside issue
#5.

## Standalone consumer workflow

The supported shape is a versioned selected JSON asset copied into the consumer
root. The consumer does not extend a path inside a checkout or `node_modules`:

```sh
curl -fsSLo .oxlintrc.json "$VERSIONED_CONFIG_ARTIFACT_URL"
curl -fsSLo oxlint.tar.gz "$MATCHING_OXLINT_RELEASE_ASSET_URL"
curl -fsSLo tsgolint "$MATCHING_TSGOLINT_BINARY_URL"
tar -xzf oxlint.tar.gz
chmod +x ./oxlint ./tsgolint
OXLINT_TSGOLINT_PATH=./tsgolint ./oxlint --config ./.oxlintrc.json ./src
```

Publishing the production URLs and the selection command is outside this spike.
The verifier models the workflow by copying the no-option permutation into a
fresh temporary consumer as `.oxlintrc.json`, then invoking the downloaded binary
from that consumer directory. It supplies the resolved native `tsgolint` binary
through `OXLINT_TSGOLINT_PATH`. No config path points back into this repository,
and no Node wrapper participates in linting.

## Layout

- `packages/shared-config/`: disposable typed loader and generator; its ignored
  `dist/configs` release output contains the eight JSON permutations after build;
- `fixtures/typescript/`: equivalent package-loader consumer;
- `fixtures/typescript-extends/`: explicit merge-semantics probe;
- `fixtures/direct-json/`: hand-authored type-aware baseline;
- `fixtures/project/`: base and AI behavioral cases;
- `fixtures/performance-project/`: 12-file timing input;
- `scripts/verify.ts`: API, permutation, behavior, equivalence,
  reproducibility, package-content, failure, and dependency checks;
- `scripts/benchmark.ts`: reproducible fresh-process measurements;
- `scripts/install-standalone.ts`: pinned, checksum-verified binary setup;
- `packages/shared-config/tsdown.config.ts`: publishable ESM and declaration
  build configuration.

[findings]: ../../docs/research/2026-08-05-config-packaging-spike.md
[issue]: https://github.com/sebastian-software/oxlint-config-setup/issues/5

# Config packaging spike

This is the disposable prototype for [issue #5][issue]. It proves the package
and consumer paths needed to review ADR 0005; it is not the production package
or a rule-selection proposal.

## What it proves

- `@oxlint-config-setup/spike-config` exports a typed `recommended` object.
- `fixtures/typescript/oxlint.config.ts` imports that object from the package.
- the TypeScript source deterministically emits `recommended.json` and exposes
  it through the package export map;
- `--print-config` is equal for the imported TypeScript profile, staged generated
  JSON, and the hand-authored direct-JSON baseline;
- valid and invalid fixtures prove `no-console` and `no-debugger` are active;
- the JSON check invokes the official standalone Oxlint binary directly;
- package manifests and the lockfile contain no ESLint runtime.

The verifier also records a composition boundary: in Oxlint 1.77.0,
`extends: [recommended]` keeps the rules but merges root fields such as
`plugins` and `categories` differently from using the same object as a direct
root config. The equivalent TypeScript consumer therefore exports
`defineConfig(recommended)` in this spike. See the [findings note][findings] for
the ADR consequence.

## Requirements

- Node `^22.18.0 || >=24.0.0` for `oxlint.config.ts`;
- pnpm 11.20.0 through Corepack;
- `tar` for the automated macOS/Linux standalone-binary setup.

Oxlint's npm package declares a wider Node engine range, but its current config
documentation requires Node 22.18+ or 24+ for TypeScript config files. This
prototype enforces the narrower user-facing requirement. The standalone JSON
consumer needs neither Node nor pnpm after it has downloaded the binary and JSON
artifact.

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
run, and re-extracts the binary under `.cache/`. Set
`OXLINT_STANDALONE=/absolute/path/to/oxlint` to use an existing official binary
on another platform.

After changing the TypeScript profile, update the checked-in artifact and then
verify it:

```sh
pnpm run generate
pnpm run check
```

The normal check builds TypeScript without regenerating JSON, so stale generated
output fails instead of being silently repaired.

## Standalone consumer workflow

The supported shape is a versioned JSON release asset copied into the consumer
root. The consumer does not extend a path inside a checkout or `node_modules`:

```sh
curl -fsSLo .oxlintrc.json "$VERSIONED_CONFIG_ARTIFACT_URL"
curl -fsSLo oxlint.tar.gz "$MATCHING_OXLINT_RELEASE_ASSET_URL"
tar -xzf oxlint.tar.gz
./oxlint --config ./.oxlintrc.json ./src
```

Publishing the production URLs is intentionally outside this spike. The verifier
models the workflow by copying `recommended.json` into a fresh temporary consumer
as `.oxlintrc.json`, then invoking the downloaded binary directly. No config path
points back into this repository, and no Node wrapper participates in linting.

## Layout

- `packages/shared-config/`: disposable typed package and generated JSON;
- `fixtures/typescript/`: equivalent package-import consumer;
- `fixtures/typescript-extends/`: explicit merge-semantics probe;
- `fixtures/direct-json/`: hand-authored baseline;
- `fixtures/project/`: behavioral cases;
- `fixtures/performance-project/`: 12-file timing input;
- `scripts/verify.mjs`: behavioral, equivalence, drift, and dependency checks;
- `scripts/benchmark.mjs`: reproducible fresh-process measurements.

[findings]: ../../docs/research/2026-08-05-config-packaging-spike.md
[issue]: https://github.com/sebastian-software/oxlint-config-setup/issues/5

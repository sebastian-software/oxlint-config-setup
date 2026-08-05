# 0005. Author configs in TypeScript and publish JSON artifacts

- **Status:** Proposed
- **Date:** 2026-08-04
- **Deciders:** Sebastian Software maintainers

## Context

The product composes rule selections, profiles, overrides, plugin declarations,
and package exports. It does not implement the linter engine: Oxlint performs file
discovery, parsing, native linting, configuration, and reporting in Rust, while
its type-aware backend uses TypeScript Go.

Oxlint officially supports JSON and TypeScript configuration. Its documentation
recommends `oxlint.config.ts` when consumers import shared configuration objects
from a package. Package imports are not supported by the JSON `extends` format.

TypeScript configuration is currently experimental. It requires the Node-based
Oxlint package and a Node version that can execute TypeScript. Standalone Oxlint
binary users must use JSON instead. The project therefore needs a convenient
package API without making one experimental loader the only representation of its
configuration.

Using Rust for the preset itself would require a separate generator, CLI, native
binding, or Oxlint contribution even though the output remains configuration
data. It would not make native rules faster after Oxlint has loaded the config.

## Decision

Author the rule ledger, profile composition, validation tooling, and public shared
config exports in TypeScript.

The package exposes side-effect-free typed config objects for consumers using
`oxlint.config.ts`. Its build also emits deterministic JSON snapshots for schema
validation, review, standalone-binary experiments, and consumers that prefer a
static artifact.

The generated JSON and public documentation derive from the TypeScript rule
ledger; they are not edited as competing sources of truth. CI verifies that
generated artifacts are current and that TypeScript and JSON representations
produce equivalent effective configurations for supported profiles.

No custom Node wrapper sits in the normal lint command. Consumers still invoke
Oxlint directly.

Rust is reserved for work that belongs in the analyzer layer: contributions to
existing native Oxlint plugins, or a future measured requirement that cannot be
met through configuration, Oxlint's supported plugin interfaces, or build-time
TypeScript tooling. Such work should normally be proposed upstream rather than
shipped as a private fork or bundled native binary.

## Decision drivers

- Shared package imports follow Oxlint's documented TypeScript configuration path.
- Rule and profile data benefit from types, composition, and inexpensive tests.
- Contributors can iterate without a native compilation and distribution layer.
- The lint runtime remains Oxlint's Rust binary regardless of authoring language.
- Generated JSON preserves inspectability and an escape path from the experimental
  TypeScript loader.
- Rust effort stays focused on actual analysis capabilities where it creates user
  value.

## Options considered

### Hand-author JSON only

JSON is portable and works with the standalone Oxlint binary. It does not support
package imports through `extends`, offers weaker composition, and makes a
machine-readable rule ledger plus generated documentation more cumbersome.

### Publish only TypeScript config objects

This is the smallest shared-package implementation and matches Oxlint's documented
package-import path. It makes the experimental Node loader a hard requirement and
provides no static artifact for standalone-binary validation.

### Build the preset and generator in Rust

Rust matches Oxlint's implementation language and would be appropriate for native
analysis. For configuration composition it adds a toolchain, binary packaging,
cross-platform release work, and a language boundary without removing the need to
publish Oxlint-shaped data.

### Author in TypeScript and generate JSON

This combines the best-supported shared-package developer experience with a
portable, reviewable representation. It adds generation discipline but keeps that
complexity at build time.

## Consequences

### Positive

- Profiles can be imported, composed, and type-checked using Oxlint's public
  `defineConfig` contract.
- Rule metadata, generated config, documentation, and fixtures can share one data
  model.
- Normal lint execution remains dominated by Oxlint rather than project tooling.
- Static JSON makes effective changes easy to diff and provides a compatibility
  target if the TypeScript loader changes.
- Contributors do not need Rust unless they work on analyzer capabilities.

### Negative

- TypeScript shared configs require the Node-based Oxlint package and a sufficiently
  new Node runtime.
- The TypeScript config loader is experimental, while JavaScript plugins are alpha
  and outside Oxlint's normal stability guarantees; upgrades need explicit tests.
- Generated JSON introduces a drift check and release artifact responsibility.
- Supporting standalone-binary consumers may require an explicit relative-path or
  copy workflow until Oxlint supports package imports from JSON configuration.
- A later native feature may involve a separate upstream Rust contribution and
  release timeline.

## Validation and review triggers

Before accepting this ADR, complete a packaging spike that proves:

1. a fixture imports the package from `oxlint.config.ts` and passes
   `oxlint --print-config` plus behavioral lint cases;
2. a standalone-binary fixture consumes a generated JSON artifact through a
   documented, non-fragile workflow;
3. TypeScript and JSON exports resolve to equivalent profiles;
4. generated files are deterministic and drift is rejected in CI;
5. cold-start overhead is measured against a direct JSON config;
6. the package contains no ESLint runtime and needs no custom wrapper command.

The completed [packaging spike findings][packaging-findings] support the core
direction but recommend revising the Node support range, public composition
contract, and versioned standalone JSON delivery path before acceptance. This
ADR remains proposed while maintainers review that evidence.

Review this decision if Oxlint stabilizes or removes TypeScript configs, supports
package imports in JSON, exposes a stable native plugin SDK, or measurements show
configuration loading to be a material part of lint time. A need for a new native
rule triggers an upstream feasibility discussion; it does not by itself move the
configuration package to Rust.

## References

- [Oxlint configuration][configuration]
- [Oxlint shared config guidance][shared-configs]
- [Oxlint type-aware architecture][type-aware]
- [Oxc guidance for adding linter rules][adding-rules]
- [Packaging spike][packaging-spike]
- [Packaging spike findings][packaging-findings]
- [v0.1 executable foundation milestone][milestone]
- [ADR 0001: Oxlint as the only linter runtime](0001-use-oxlint-as-the-only-linter-runtime.md)
- [ADR 0002: Prefer native rules](0002-prefer-native-rules-over-javascript-plugins.md)
- [ADR 0003: Use native type-aware linting](0003-use-native-type-aware-linting.md)

[configuration]: https://oxc.rs/docs/guide/usage/linter/config.html
[shared-configs]: https://oxc.rs/docs/guide/usage/linter/config.html#extend-shared-configs
[type-aware]: https://oxc.rs/docs/guide/usage/linter/type-aware.html
[adding-rules]: https://oxc.rs/docs/contribute/linter/adding-rules.html
[packaging-spike]: https://github.com/sebastian-software/oxlint-config-setup/issues/5
[packaging-findings]: ../research/2026-08-05-config-packaging-spike.md
[milestone]: https://github.com/sebastian-software/oxlint-config-setup/milestone/1

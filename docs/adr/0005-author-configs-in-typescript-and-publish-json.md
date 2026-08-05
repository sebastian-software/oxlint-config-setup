# 0005. Generate config permutations and select prebuilt JSON

- **Status:** Proposed
- **Date:** 2026-08-04
- **Deciders:** Sebastian Software maintainers

## Context

The product turns a small public option set into a complete Oxlint root config.
The first option dimensions are React, Node, and AI-assisted development. AI is
a product differentiator, not an internal profile detail. Type-aware linting is
a required property of every supported standard config.

The project does not implement the linter engine. Oxlint performs file discovery,
parsing, native linting, configuration, and reporting in Rust, while its
type-aware backend uses TypeScript Go.

Oxlint officially supports JSON and TypeScript configuration. Its documentation
recommends `oxlint.config.ts` when consumers import shared configuration from a
package. Package imports are not supported by the JSON `extends` format.

TypeScript configuration is currently experimental. It requires the Node-based
Oxlint package and a Node version that can execute TypeScript. Standalone Oxlint
binary users must use JSON instead. The package therefore needs an option-based
API without making one experimental loader the only representation of its
configuration.

The predecessor project established a useful contract: enumerate every supported
option combination at build time, give each result a stable internal name, and
let the public loader select one prebuilt config.

Using Rust for the preset itself would require a separate generator, CLI, native
binding, or Oxlint contribution even though the output remains configuration
data. It would not make native rules faster after Oxlint has loaded the config.

## Decision

Author the rule ledger, build-time config assembly, artifact generator,
validation tooling, and public loader in TypeScript.

Keep repository-owned scripts in TypeScript as well. Development and validation
scripts run through `tsx`, while a separate `tsc --noEmit` step provides static
type checking. This avoids relying on Node's experimental native TypeScript
execution, which does not apply the project `tsconfig`, and avoids treating
`tsx` as a type checker.

Build publishable library entry points with `tsdown` as ESM plus declarations.
The build cleans `dist`, bundles the public library to `dist/index.js`, emits
`dist/index.d.ts`, and then runs the typed generator to populate `dist/configs`.
Package dependencies and peers remain external. Published packages contain the
built library and JSON configs, not source TypeScript or internal scripts. A
future CLI entry point may use the same bundler configuration, but this decision
does not introduce a CLI or depend on tsdown's experimental executable mode.

The build enumerates the complete supported option space. For v0.1, React, Node,
and AI are fixed bit positions and produce eight complete root configs. It writes
each config as deterministic JSON under a stable, namespaced hash in the package
build output. The hash and file layout are internal implementation details. The
generated JSON is release output, not checked-in source; the TypeScript factory
and generator remain the source of truth.

The public `getOxlintConfig(options)` API validates and normalizes options, maps
them to the stable artifact name, and reads that prebuilt JSON. It does not
compose rule sets or migrate config at runtime. Consumers use the result from
`oxlint.config.ts`:

```ts
import { getOxlintConfig } from "oxlint-config-setup";

export default getOxlintConfig({ react: true, ai: true });
```

Every standard permutation sets `options.typeAware` to `true`. Type-aware is not
a public switch, and the package does not generate a syntax-only standard
variant. The tested Oxlint, `oxlint-tsgolint`, and TypeScript versions stay pinned
together.

Generated JSON and public documentation derive from the TypeScript rule ledger.
They are not edited as competing sources of truth. A clean package build and its
prepack step produce all eight files under `dist/configs`, which is included in
the package tarball. CI verifies the golden option mapping, byte-identical output
across clean builds, package contents, mandatory type-aware mode, and effective
equivalence between loader and JSON consumption. It does not compare build
output with committed JSON.

The build-tool runtime and consumer runtime are separate contracts. The pinned
tsdown version requires Node `^22.18.0 || >=24.11.0` to build this package. The
built shared-config consumer remains compatible with Node
`^22.18.0 || >=24.0.0`, and tsdown targets Node 22 output.

Future JavaScript-plugin permutations keep their complete `jsPlugins` data in
the generated config. Plugin specifiers resolve relative to the consumer config,
so package-path localization is a separate loader or setup concern. That step may
localize paths after selection, but it must not compose rules. The spike records
this seam without shipping a custom plugin.

Standalone-binary users copy the selected, versioned JSON artifact into their
project and install the matching native `tsgolint` backend. A future setup command
may perform those steps and any plugin-path localization without changing the
option-to-artifact contract.

No custom Node wrapper sits in the normal lint command. Consumers still invoke
Oxlint directly.

Rust is reserved for work that belongs in the analyzer layer: contributions to
existing native Oxlint plugins, or a future measured requirement that cannot be
met through configuration, Oxlint's supported plugin interfaces, or build-time
TypeScript tooling. Such work should normally be proposed upstream rather than
shipped as a private fork or bundled native binary.

## Decision drivers

- The public option API preserves the proven predecessor contract.
- Prebuilt permutations remove runtime rule composition and make output
  deterministic.
- AI remains a visible, testable product option.
- Mandatory type-aware mode prevents accidentally selecting a reduced standard
  config.
- Shared package imports follow Oxlint's documented TypeScript configuration path.
- Generated JSON preserves inspectability and an escape path from the experimental
  TypeScript loader.
- The lint runtime remains Oxlint's Rust binary regardless of authoring language.
- Rust effort stays focused on actual analysis capabilities where it creates user
  value.

## Options considered

### Hand-author JSON only

JSON is portable and works with the standalone Oxlint binary. It does not support
package imports through `extends`, offers weaker authoring types, and makes a
machine-readable rule ledger plus generated documentation more cumbersome.

### Compose TypeScript config objects at runtime

This is a small shared-package implementation and matches Oxlint's documented
package-import path. It makes runtime merge behavior part of the public contract,
can diverge from standalone JSON, and does not preserve the predecessor's
deterministic option selection.

### Build the preset and generator in Rust

Rust matches Oxlint's implementation language and would be appropriate for native
analysis. For configuration generation it adds a toolchain, binary packaging,
cross-platform release work, and a language boundary without removing the need to
publish Oxlint-shaped data.

### Generate every supported JSON permutation

This combines an option-based package API with portable, reviewable root configs.
It adds generation discipline and grows exponentially with option dimensions, but
keeps rule composition at build time. The option set must therefore stay small
and intentional.

## Consequences

### Positive

- Consumers select complete, type-checked configs through one stable API.
- Every supported standard config is type-aware.
- AI is represented in the same deterministic contract as React and Node.
- Rule metadata, generated config, documentation, and fixtures can share one data
  model.
- Static JSON makes release output inspectable and provides a compatibility target
  if the TypeScript loader changes.
- Contributors do not need Rust unless they work on analyzer capabilities.
- Published consumers receive JavaScript, declarations, and JSON instead of
  repository TypeScript sources.

### Negative

- TypeScript shared configs require the Node-based Oxlint package and a sufficiently
  new Node runtime.
- The TypeScript config loader is experimental, while JavaScript plugins are alpha
  and outside Oxlint's normal stability guarantees. Upgrades need explicit tests.
- Generated JSON introduces reproducible-build checks and release artifact
  responsibility.
- Three Boolean dimensions already produce eight files. Each new dimension must
  justify the doubled artifact count.
- The Node loader performs synchronous local artifact I/O during config loading.
- Contributors need separate script execution, type-checking, and publish-build
  tools, with a narrower Node 24 minimum for builds than for consumers.
- Standalone support needs a setup or release-asset copy workflow because JSON
  cannot import a package config.

## Validation and review triggers

Before accepting this ADR, complete a packaging spike that proves:

1. a fixture calls `getOxlintConfig(options)` from `oxlint.config.ts` and passes
   `oxlint --print-config` plus behavioral lint cases;
2. the build emits exactly all eight React, Node, and AI permutations through a
   stable option-to-hash mapping;
3. every generated config enables type-aware mode and the package includes the
   matching `oxlint-tsgolint` runtime contract;
4. a standalone-binary fixture consumes a generated JSON artifact through a
   documented, non-fragile workflow;
5. loader and JSON paths resolve to equivalent effective configs;
6. clean builds are deterministic, generated files remain untracked, and CI
   verifies that the package tarball contains every permutation;
7. cold-start overhead is measured against a direct JSON config;
8. the package contains no ESLint runtime and needs no custom wrapper command;
9. all internal scripts pass explicit type checking, execute through `tsx`, and
   the packed library contains JavaScript plus declarations without source
   TypeScript or internal scripts.

The completed [packaging spike findings][packaging-findings] support the core
direction and the option-to-prebuilt-artifact contract. They also recommend
retaining the explicit Node support range and a versioned standalone JSON
delivery path before acceptance. This ADR remains proposed while maintainers
review that evidence.

The production package foundation from [issue 0008][production-package] now
applies that contract at the repository root. It builds side-effect-free ESM and
declarations, generates the same reviewed eight-artifact map, verifies exact
tarball contents across byte-identical clean builds, and installs the packed
artifact with both npm and pnpm in isolated consumers. Its manifest preserves
the wider consumer Node range while the repository gate enforces tsdown's
narrower build range. This closes the implementation uncertainty, but it does
not by itself record maintainer acceptance; the status remains proposed pending
that review.

Review this decision if Oxlint stabilizes or removes TypeScript configs, supports
package imports in JSON, exposes a stable native plugin SDK, or measurements show
configuration loading to be a material part of lint time. A need for a new native
rule triggers an upstream feasibility discussion. It does not by itself move the
configuration package to Rust.

## References

- [Oxlint configuration][configuration]
- [Oxlint shared config guidance][shared-configs]
- [Oxlint type-aware architecture][type-aware]
- [Oxlint JavaScript plugins][js-plugins]
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
[js-plugins]: https://oxc.rs/docs/guide/usage/linter/js-plugins.html
[adding-rules]: https://oxc.rs/docs/contribute/linter/adding-rules.html
[packaging-spike]: https://github.com/sebastian-software/oxlint-config-setup/issues/5
[packaging-findings]: ../research/2026-08-05-config-packaging-spike.md
[milestone]: https://github.com/sebastian-software/oxlint-config-setup/milestone/1
[production-package]: https://github.com/sebastian-software/oxlint-config-setup/issues/8

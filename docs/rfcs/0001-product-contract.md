# RFC 0001: Oxlint-first product contract

- **Status:** Proposed
- **Date:** 2026-08-04
- **Owners:** Sebastian Software

## Summary

Create an opinionated linting preset whose normal execution path is entirely in
the Oxlint ecosystem. It should cover the high-value majority of the predecessor
preset without reproducing every historical ESLint rule or plugin identity.

The product promise is a fast, coherent defect-detection baseline for modern
TypeScript projects—not a compatibility layer that happens to invoke Oxlint.

## Motivation

The predecessor [`eslint-config-setup`][predecessor] was created to keep ESLint
and Oxlint in harmony while Oxlint's rule surface was smaller. That split now has
three structural costs:

1. Two runtimes and two configuration models must agree on ownership.
2. Newly supported rules can remain enabled in both systems until migration
   metadata is refreshed.
3. Rule-count parity rewards low-value compatibility work even when the native
   tool already catches the important defect classes.

Oxlint now provides a broad native rule set, type-aware TypeScript linting, and a
JavaScript-plugin escape hatch. A new project can therefore optimize around the
current platform instead of preserving the predecessor's architecture.

## Goals

- Run JavaScript and TypeScript lint checks through one primary Oxlint command.
- Provide curated profiles for common project contexts without requiring ESLint.
- Use type-aware checks for defects that syntax-only analysis cannot detect.
- Cover React through native Oxlint capabilities.
- Admit narrowly selected JavaScript plugins when a valuable domain has no
  suitable native implementation.
- Make every rule's rationale, stability, and execution path auditable.
- Keep adoption simple enough for local development, CI, and editor feedback.

## Non-goals

- One-to-one parity with the predecessor's rule count.
- Loading a JavaScript React plugin to emulate either React ESLint ecosystem.
- Replacing formatters, spell checkers, Markdown linters, or JSON schema tools.
- Preserving legacy configuration names when a clearer product model exists.
- Promising support for every ESLint plugin that Oxlint can technically load.

## Product contract

### One primary runtime

The supported lint workflow invokes Oxlint directly. The published package must
not require ESLint to load, translate, or execute its standard profiles.

### Capability hierarchy

For each defect class, the project chooses the first acceptable execution path:

1. stable native Oxlint rule;
2. native Oxlint type-aware rule backed by `oxlint-tsgolint`;
3. experimental native rule, isolated behind an explicit profile;
4. conformant JavaScript plugin for a domain without adequate native coverage;
5. a separate purpose-built tool, or explicit exclusion from scope.

Migration helpers are discovery tools. Their output does not become the preset
without a signal and maintenance review.

### Initial profile model

The first release should specify these composable concerns:

| Concern | Intended responsibility |
| --- | --- |
| Core | Language correctness, suspicious constructs, and broadly useful code quality |
| TypeScript | TypeScript-specific syntax and type-aware correctness |
| React | Native React and JSX correctness, with experimental compiler checks isolated |
| Node.js | Runtime and module-system hazards for server-side projects |
| Tests | Test-framework mistakes where native or conformant coverage exists |
| Optional domains | High-value areas such as regular expressions or project-specific policies |

The exact package exports and whether profiles are merged in a TypeScript config
or generated into JSON are deferred to a packaging RFC.

### React policy

React coverage is defined by defect classes, not by allegiance to the historical
Meta plugin or a newer community plugin. The standard React profile uses Oxlint's
native React rules. Native experimental compiler diagnostics may be exposed as an
opt-in profile with a stability warning.

The project will not load a JavaScript React plugin merely to raise a parity
percentage. Missing rules are evaluated by impact; important gaps should first be
proposed upstream or documented as accepted gaps.

### JavaScript-plugin policy

A JavaScript plugin is eligible only when:

- the domain has no adequate native Oxlint implementation;
- Oxlint documents the plugin as conformant, or repository fixtures prove the
  exact used rules behave correctly;
- the rules do not require unsupported custom file formats or TypeScript parser
  services;
- the value exceeds startup, stability, and upgrade costs;
- the plugin can be removed cleanly if native coverage arrives.

Plugin-backed profiles must be optional until their stability and performance are
demonstrated on representative projects.

### Scope boundaries

Oxlint currently does not lint custom formats such as Markdown or JSON through
JavaScript plugins. Those files and prose-oriented checks belong to separately
documented tools. A future Oxlint capability can trigger a new RFC; it does not
justify retaining ESLint in the standard path today.

## User experience

The target experience is:

1. install the preset, Oxlint, and the documented type-aware backend;
2. compose the relevant profiles in one Oxlint configuration;
3. run one project lint command locally and in CI;
4. opt into experimental or plugin-backed domains explicitly.

Configuration should expose intent such as `react` or `tests`, not internal
migration categories such as `moved` and `remaining`.

## Validation and acceptance criteria

An initial implementation is acceptable when:

- the default profiles execute without an ESLint runtime dependency;
- each enabled rule has an owner, rationale, source, and stability classification;
- type-aware fixtures prove both positive and negative TypeScript cases;
- React fixtures are covered only by native Oxlint rules in the standard profile;
- JavaScript-plugin profiles have conformance, crash, and cold-start tests;
- representative predecessor projects can adopt the setup with documented gaps;
- duplicate diagnostics and conflicting rules are tested automatically;
- measured performance and compatibility baselines are dated and reproducible.

No fixed parity percentage is an acceptance gate. The working aspiration is to
cover roughly 90% of the predecessor's *useful code-quality intent*, with explicit
judgment about rules that are redundant, unavailable, or outside the new scope.

## Alternatives considered

### Continue the hybrid predecessor

This preserves maximum compatibility but also preserves dual ownership, more
dependencies, and migration bookkeeping. It remains valid for teams needing its
long tail, but it is not the foundation of this project.

### Recreate the preset through JavaScript plugins

This can raise nominal compatibility quickly. It also inherits more JavaScript
runtime behavior, unsupported APIs, and plugin-specific semantics. It is retained
only as a targeted escape hatch for missing domains.

### Use only syntax-aware native rules

This is the simplest runtime, but it leaves important promise, async, and type
safety defects uncovered. Type-aware linting is therefore part of the intended
TypeScript product rather than a separate ESLint fallback.

## Risks and mitigations

- **Fast-moving platform:** pin and test supported Oxlint and `oxlint-tsgolint`
  ranges; review documented stability exceptions on each upgrade.
- **Misleading parity claims:** publish capability and defect-class coverage, not
  only raw rule counts.
- **Plugin crashes:** isolate plugins, require fixtures, and keep the default path
  operable without optional domains.
- **Configuration churn:** settle the package contract in a separate RFC before
  publishing a stable major version.

## Open questions

- What package name and export shape should form the public API?
- Should type-aware linting be mandatory for the TypeScript profile or a paired
  profile selected explicitly by consumers?
- Which test and regular-expression gaps justify first-party plugin profiles?
- What fixture corpus should represent predecessor projects before a beta release?
- Which native React compiler checks are mature enough for the first opt-in set?

## References

- [Predecessor repository][predecessor]
- [Oxlint type-aware linting][type-aware]
- [Oxlint JavaScript plugins][js-plugins]
- [Oxlint compatibility status][compatibility]
- [Oxlint native React compiler rule][react-compiler]
- [Oxlint versioning and stability][versioning]

[predecessor]: https://github.com/sebastian-software/eslint-config-setup
[type-aware]: https://oxc.rs/docs/guide/usage/linter/type-aware.html
[js-plugins]: https://oxc.rs/docs/guide/usage/linter/js-plugins.html
[compatibility]: https://oxc.rs/compatibility.html
[react-compiler]: https://oxc.rs/docs/guide/usage/linter/rules/react/react-compiler.html
[versioning]: https://oxc.rs/docs/guide/usage/linter/versioning.html

# 0002. Prefer native rules over JavaScript plugins

- **Status:** Accepted
- **Date:** 2026-08-04
- **Deciders:** Sebastian Software maintainers

## Context

Oxlint can run JavaScript ESLint plugins, but compatibility is intentionally not
universal. Custom parsers, custom file formats, and TypeScript type information
are among the unsupported or restricted plugin capabilities. JavaScript plugins
also sit outside Oxlint's normal semantic-versioning guarantees.

Loading many compatibility plugins could reproduce a high share of the
predecessor's rule names. That metric would not prove equivalent diagnostics,
acceptable performance, or long-term maintainability.

React makes the trade-off especially visible. The ESLint ecosystem has both a
historical Meta plugin and newer alternatives. Oxlint already implements a native
React rule family, so choosing a JavaScript plugin identity would add coupling
without defining the quality outcome we need.

## Decision

Prefer native Oxlint rules for every defect class they cover adequately.

JavaScript plugins are allowed only for valuable domains with no adequate native
implementation. Every plugin-backed profile must be explicit, removable, and
validated against exactly the rules the project enables.

The standard React profile uses native Oxlint React rules. It does not load a
JavaScript React plugin to chase parity with either React plugin ecosystem.
Experimental native React compiler diagnostics may be offered separately and
must be labeled experimental.

## Decision drivers

- Rust-native performance and predictable execution.
- Lower exposure to unsupported ESLint APIs and plugin crashes.
- Fewer runtime dependencies and less configuration indirection.
- Rule selection based on defect classes rather than plugin brand or rule count.
- A clean path to remove plugin fallbacks when Oxlint gains native coverage.

## Options considered

### Native rules only, without exceptions

This is maximally simple but unnecessarily excludes mature, high-value domains
that Oxlint can execute safely through conformant JavaScript plugins.

### Load all compatible predecessor plugins

This maximizes nominal coverage but makes compatibility itself the architecture.
It also increases startup cost and exposes the preset to APIs Oxlint may not
support.

### Native first with narrow plugin exceptions

This preserves an Oxlint-native center while leaving a controlled extension point
for otherwise uncovered value.

## Consequences

### Positive

- The default path remains close to Oxlint's best-supported behavior.
- React configuration is independent of churn between ESLint React plugins.
- Plugin risk is visible at profile boundaries and can be tested independently.

### Negative

- Some familiar rule names and nuanced behaviors will be absent.
- Plugin candidates need conformance, performance, and crash testing.
- Native replacement may require occasional diagnostic migration notes.

## Validation and review triggers

For each JavaScript plugin, record the missing defect class, supported rules,
Oxlint conformance status, startup impact, fixtures, and removal condition. Review
on every Oxlint minor upgrade because JavaScript-plugin support is not covered by
the normal semantic-versioning promise.

For React, test native rules against representative JSX and hook patterns. Review
the experimental compiler profile separately when Oxlint changes its status or
configuration model.

## References

- [Oxlint JavaScript plugins][js-plugins]
- [Oxlint versioning and stability][versioning]
- [Oxlint native React compiler rule][react-compiler]

[js-plugins]: https://oxc.rs/docs/guide/usage/linter/js-plugins.html
[versioning]: https://oxc.rs/docs/guide/usage/linter/versioning.html
[react-compiler]: https://oxc.rs/docs/guide/usage/linter/rules/react/react-compiler.html

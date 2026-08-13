# 0013. Release coordinated toolchain pins

- **Status:** Accepted
- **Date:** 2026-08-13
- **Last updated:** 2026-08-13
- **Deciders:** Sebastian Software maintainers

## Context

The TypeScript configurations depend on Oxlint and its native
`oxlint-tsgolint` backend as one runtime. A change in either package can alter
the available rules, generated artifacts, diagnostics, or project-service
behavior. The repository can test concrete version combinations, but npm peer
ranges cannot express that two peer versions are supported only as a
coordinated pair.

A broad range such as `oxlint >=1 <2` plus `oxlint-tsgolint >=7 <8` would
therefore promise every cross-product of those versions, including future
combinations that have never passed the package harness. The weekly upstream
canary supplies early compatibility evidence, but it runs ahead of the
published contract and cannot retroactively narrow an already published peer
range.

## Decision

Publish exact, coordinated `oxlint` and `oxlint-tsgolint` peer versions. Keep
the same exact versions as development dependencies so the generated artifacts,
behavioral fixtures, package verifier, clean-consumer tests, documentation, and
published peer contract all describe one reviewed runtime pair.

Treat the TypeScript version as the exact behavior target for that pair. It is
a build and validation input rather than a consumer peer. Keep pnpm pinned as a
repository tool; it is not part of the runtime support contract. Continue to
support the Node.js engine range from ADR 0010 and test its floor plus the
current release line.

The weekly canary tests the latest upstream Oxlint, backend, and TypeScript
versions without changing the supported pair. A green canary makes an update
eligible for a dependency pull request. The pull request must update the
manifest and shared expected-version source, regenerate artifacts, pass the
complete release and documentation gates, and record the tested matrix. After
merge, normal release automation publishes the new exact pair. A failed canary
or update keeps the last published pair supported while the incompatibility is
triaged.

## Decision drivers

- Make the peer declaration no broader than the combinations the repository
  can prove.
- Keep generated policies and the native type-aware backend reproducible.
- Avoid peer ranges that silently admit an untested Oxlint/backend
  cross-product.
- Use the existing canary to shorten update lead time without turning an
  exploratory run into a support promise.
- Give consumers one copyable installation command for the reviewed pair.

## Options considered

### Broad major ranges

Ranges reduce peer warnings when consumers update independently, but they
promise future versions and unsupported cross-combinations. The canary can
discover a break only after those versions are already admitted by an older
release.

### Rolling multi-version window

A bounded window could preserve older combinations while adding new ones, but
the current matrix has no evidence for multiple Oxlint/backend pairs. This
option also needs pair-aware metadata or explicit cross-product testing before
the declared ranges are truthful.

### Coordinated exact pins

Exact pins require a package release for each supported toolchain update and
can temporarily produce peer warnings for consumers that update Oxlint first.
They are the only current option that makes the npm contract match the tested
runtime pair exactly.

## Consequences

### Positive

- The published peer contract never includes an untested version combination.
- Consumer reports can be reproduced against one documented runtime pair.
- Rule-count and artifact changes remain reviewed as part of dependency bumps.
- Canary failures do not invalidate the compatibility promise of an existing
  package release.

### Negative

- Consumers must update this package, Oxlint, and the backend together.
- Dependency bots may report peer conflicts between an upstream release and
  the next coordinated package release.
- Maintainers must review and release compatible pin bumps regularly.
- Supporting multiple historical pairs later requires a new evidence model and
  a revision of this living ADR.

## Validation and review triggers

The package verifier asserts that the manifest peers equal the shared expected
versions and that the development pins match them. The package workflow runs
the full release gate on the Node.js floor and current release line, then tests
the tarball in clean npm consumers. The release gate checks the README,
compatibility evidence, installation command, and this decision. The weekly
canary tests the latest upstream trio separately and uploads its resolved
versions and categorized results.

Review this decision when npm can express correlated peer sets, upstream
publishes a compatibility contract that removes the pairing risk, or enough
matrix evidence exists to define and continuously test a truthful bounded
window.

## References

- [Issue #81](https://github.com/sebastian-software/oxlint-config-setup/issues/81)
- [Compatibility evidence](../compatibility.md)
- [Node.js support decision](0010-require-node-24-lts.md)
- [Upstream compatibility canary](../../.github/workflows/upstream-canary.yml)

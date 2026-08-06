# 0010. Require Node.js 24 LTS or newer

- **Status:** Accepted
- **Date:** 2026-08-06
- **Deciders:** Sebastian Software maintainers

## Context

The beta originally supported consumers on Node.js 22.18.0 while allowing the
repository toolchain to use newer Node.js versions. Adding the Ardo 4
documentation workspace introduced React Router 8, whose supported runtime
starts later in the Node.js 22 line. With strict engine validation enabled, a
full workspace install at the old consumer floor cannot install the documented
toolchain even when the package code itself would still execute there.

Node.js 24 is the current LTS line. The package is still an unpublished beta, so
this is the least disruptive point to choose one maintained baseline for
consumers, contributors, documentation, and CI.

## Decision

Require Node.js `>=24.11.0` for consuming and building the package and for the
Ardo documentation workspace. Node.js 24.11.0 is the first Node.js 24 LTS
release and therefore defines the floor more precisely than Node.js 24.0.0.

Compile the package for Node.js 24. CI exercises the exact LTS floor and the
current Node.js release line. Clean consumer tests exercise the first supported
Node.js 24 LTS release and the first Node.js 26 release.

Keep `engineStrict: true`. An incompatible development runtime should fail at
installation instead of producing a partially supported workspace.

## Decision drivers

- Use a current, maintained LTS baseline for a new beta.
- Keep consumer, repository, documentation, and CI runtime contracts aligned.
- Preserve strict engine validation across the whole workspace.
- Avoid special install filters or disabled engine checks for older runtimes.
- Test the declared lower bound instead of an arbitrary release within the
  supported major.

## Options considered

### Keep Node.js 22.18.0 for consumers

Package CI could install only the root workspace or disable engine validation
for documentation dependencies. This preserves a broader consumer range but
creates two runtime contracts and makes ordinary full-workspace installation
fail at the documented package floor.

### Raise the floor only to Node.js 22.22.0

This satisfies React Router 8, but it adopts a late release in the older LTS
line for a beta whose surrounding toolchain already runs on Node.js 24.

### Require Node.js 24 LTS

This is a breaking support reduction before stable publication, but it provides
one clear, maintained runtime contract with the smallest ongoing matrix.

## Consequences

### Positive

- A normal frozen workspace install succeeds on every supported runtime.
- Package, docs, and contributor commands share one engine floor.
- CI continues to validate both the lower bound and forward compatibility.
- Build output can target Node.js 24 directly.

### Negative

- Node.js 22 consumers cannot install the package after this decision.
- Projects still on Node.js 22 must upgrade before adopting the beta.
- Future changes to the active LTS baseline remain explicit support decisions.

## Validation and review triggers

The package verifier asserts the published engine range. CI installs and runs
the complete release gate on Node.js 24.11.0 and the current release line, then
installs the tarball in clean consumers at both tested boundaries. The Ardo job
builds on Node.js 24.11.0 with strict engine validation.

Review this decision when Node.js 24 leaves maintenance, a dependency raises its
engine floor, or concrete adoption evidence justifies supporting an older
runtime through a separately validated package path.

## References

- [Node.js releases](https://nodejs.org/en/about/previous-releases)
- [Node.js 24.11.0 LTS release](https://nodejs.org/en/blog/release/v24.11.0)
- [Ardo site decision](0009-use-ardo-for-the-product-and-documentation-site.md)

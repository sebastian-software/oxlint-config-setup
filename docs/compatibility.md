# Compatibility evidence

- **Measured:** 2026-08-05
- **Host:** macOS 26.5, Apple M1 Ultra, Node 24.18.0
- **CI:** Linux on the Node 24 LTS floor and the current Node 26 line

## Tested matrix

| Component | Version |
| --- | --- |
| Oxlint | `1.77.0` |
| `oxlint-tsgolint` | `7.0.2001` |
| TypeScript target | `7.0.2` |
| pnpm | `11.20.0` |
| npm consumer | major 10 or 11 |
| Consumer Node.js | `24.11.0`, `26.0.0`, current 26 |

CI job names and environment variables record this version trio. Upgrading any
member reruns the entire matrix rather than relying on a broad peer range.

## Upstream compatibility canary

The separate **Upstream compatibility canary** runs every Monday at 03:17 UTC
and can also be started with `workflow_dispatch`. It keeps the checked-in
manifest, lockfile, peer ranges, and supported-version claim pinned. On the
same Linux runner, it first measures the pinned toolchain, then resolves the
latest Oxlint, `oxlint-tsgolint`, and TypeScript versions only into
`node_modules`. It runs on the Node 24 LTS floor with the supported pnpm and on
the current Node 26 line with current pnpm; neither combination is a release
matrix claim.

The canary reports install, type, config, diagnostic, snapshot, packaging, and
performance results separately. Diagnostic coverage includes behavioral
fixtures plus crash and timeout classification. Packaging coverage builds the
tarball and exercises clean npm and pnpm consumers. It uploads the resolved
versions, two-run benchmark comparison, native effective category/rule surface,
and a Markdown diff for review. A native surface change is a snapshot failure,
not an automatic support update.

Performance compares two fresh upstream measurements with a pinned baseline on
the same runner, using the existing one-thread warm-up and sample protocol. A
regression must exceed 25% in both measurements to fail; a one-off exceedance
is recorded as a warning so ordinary runner noise does not fail the canary.

JavaScript-plugin profiles remain out of the native job. The isolated job
detects a `javascript-plugin` ledger entry and runs only its profile fixtures
against the latest toolchain; when none exists it records that native results
are authoritative. This prevents an experimental plugin crash or diagnostic
change from obscuring native regressions.

When Renovate or another dependency update PR is ready for review, link its
updated-toolchain change to a successful canary run. To reproduce a run locally
without changing tracked manifests or the lockfile:

```sh
pnpm install --frozen-lockfile
mkdir -p canary-artifacts
pnpm run benchmark > canary-artifacts/pinned-benchmark.json
pnpm install --lockfile=false \
  --config.overrides.oxlint=latest \
  --config.overrides.oxlint-tsgolint=latest \
  --config.overrides.typescript=latest
CANARY_ALLOW_PNPM_VERSION=true \
CANARY_OUTPUT_DIR=canary-artifacts \
CANARY_PERFORMANCE_BASELINE=canary-artifacts/pinned-benchmark.json \
pnpm run canary:upstream
git diff --exit-code -- package.json pnpm-lock.yaml pnpm-workspace.yaml docs fixtures src
```

Triage an install failure as an upstream resolution incompatibility; type,
config, diagnostic, snapshot, or packaging failures as candidate compatibility
changes; and a repeated performance failure as a candidate regression. Retain
the artifacts, open or update the dependency PR with the canary URL, and only
change supported versions after a reviewed update lands. Scheduled failures do
not publish packages or notify consumers directly; repository maintainers triage
them in the next working day and use normal issue or PR notifications for a
confirmed upstream change.

## Executable evidence

The shared harness invokes the supported `oxlint` executable directly and checks:

- minimal valid and invalid cases for every ledger entry;
- diagnostic file, source location, severity, and rule identity;
- effective configuration snapshots through `oxlint --print-config`;
- stable profile combinations and duplicate/conflict ownership;
- syntax-only TypeScript with no project graph;
- type-aware TypeScript plus a referenced composite project;
- React/JSX accessibility, CommonJS and ESM Node.js, Vitest, and Jest;
- framework-specific mismatch behavior;
- experimental React Compiler isolation;
- unsupported configuration, timeout, and crashed-process classification;
- byte-identical builds and release tarballs;
- equivalent TypeScript loaders and public JSON exports;
- clean npm and pnpm consumers running documented commands.

## Timings

Ten fresh subprocesses are measured after two warm-ups with one Oxlint thread.
The root benchmark on the measured host reported:

| Scenario | Median | p95 |
| --- | ---: | ---: |
| Syntax-only, one file | 114.87 ms | 125.64 ms |
| Type-aware, one file | 247.51 ms | 315.36 ms |
| Type-aware, representative 12-file project | 248.77 ms | 265.78 ms |

Run `pnpm benchmark` to reproduce. These values are observations, not latency
SLAs; the release gate records the command and pinned environment so regressions
can be compared on the same host.

The earlier packaging spike measured generated JSON within ordinary noise of
hand-authored JSON, while the TypeScript package import added about 50 ms to a
fresh tiny-project process. Public JSON therefore remains a supported surface.

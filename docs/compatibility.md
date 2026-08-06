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

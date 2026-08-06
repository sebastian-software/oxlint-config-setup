# v0.1 beta keep/adjust/defer review

- **Review date:** 2026-08-06
- **Review status:** **Complete** for the beta candidate
- **Publication status:** Manual publish intentionally not performed by this gate

| Decision | Area | Review result |
| --- | --- | --- |
| KEEP | Oxlint-only runtime | Standard and named configurations invoke no ESLint runtime or migration helper. |
| ADJUST | Three policy levels | Essential, recommended, and strict are nested; recommended is the default. |
| ADJUST | Constrained AI overlay | AI may tighten active rules and add explicit AI-only guardrails, but cannot activate higher-level policy. |
| KEEP | Mandatory type-aware policy | Every level artifact uses the pinned `oxlint-tsgolint` backend. |
| KEEP | Native React boundary | Stable React loads native `react` and `jsx-a11y`; no JavaScript React or hooks plugin is present. |
| KEEP | Deterministic package | Clean builds and two independently packed tarballs are byte-identical. |
| ADJUST | Supplemental profiles | Syntax-only, Vitest, Jest, and React Compiler are named complete artifacts so the selector matrix does not expand. |
| ADJUST | JSON delivery | Twenty-eight public `./json/*` exports provide stable copy targets while hashed internal files remain private. |
| ADJUST | Rule catalog | The former capability sketch is replaced by a generated 27-entry ledger catalog. |
| DEFER | JavaScript-plugin domains | Testing Library, Playwright, Storybook, SonarJS, and regex gaps remain research. |
| DEFER | Stable React Compiler | Compiler diagnostics remain an isolated warning until upstream stability changes. |
| DEFER | Automatic publication | Provenance metadata is configured, but publishing requires a deliberate maintainer release action. |
| DEFER | Expanded version ranges | New Oxlint, tsgolint, TypeScript, Node, or package-manager versions require a full matrix run. |

## Exit evidence

- Ledger schema and deterministic source/artifact generators: complete.
- Three-level and AI activation boundaries: complete.
- Behavioral fixture and compatibility harness: complete.
- Side-effect-free ESM package, declarations, peers, and exact content gate: complete.
- Core, TypeScript, React, Node.js, Vitest, and Jest surfaces: complete.
- Migration, companion-tool, experimental-surface, and release documentation: complete.
- `pnpm release:check`: required before creating the beta tag.

The beta may be tagged only from a clean commit where the release check and CI
matrix pass. This record does not claim that an npm version has already been
published.

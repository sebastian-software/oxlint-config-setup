# v0.1 beta keep/adjust/defer review

- **Review date:** 2026-08-06
- **Review status:** **Complete** for the beta candidate
- **Publication status:** `v0.1.0` was subsequently published with npm Trusted Publishing

| Decision | Area | Review result |
| --- | --- | --- |
| KEEP | Oxlint-only runtime | Standard and named configurations invoke no ESLint runtime or migration helper. |
| ADJUST | Three policy levels | Essential, recommended, and strict are nested; recommended is the default. |
| ADJUST | Constrained AI overlay | AI may tighten active rules and add explicit AI-only guardrails, but cannot activate higher-level policy. |
| KEEP | Mandatory type-aware policy | Every level artifact uses the pinned `oxlint-tsgolint` backend. |
| KEEP | Native React boundary | Stable React loads native `react` and `jsx-a11y`; no JavaScript React or hooks plugin is present. |
| KEEP | Deterministic package | Clean builds and two independently packed tarballs are byte-identical. |
| ADJUST | Supplemental profiles | Syntax-only and React Compiler remain named complete artifacts; Vitest and Jest are mutually exclusive file-scoped policies. |
| ADJUST | JSON delivery | Twenty-six public `./json/*` exports provide stable copy targets while hashed internal files remain private. |
| ADJUST | Consumer customization | Five in-place rule helpers provide severity, recursively merged options, disable, add, and diagnostic-isolation operations on Oxlint objects. |
| ADJUST | Rule catalog | The former capability sketch is replaced by a generated 27-entry ledger catalog. |
| ADJUST | JavaScript-plugin domains | Testing Library, Playwright, and Storybook are package-owned automatic file-scoped integrations; SonarJS and regex gaps remain deferred. |
| DEFER | Stable React Compiler | Compiler diagnostics remain an isolated warning until upstream stability changes. |
| KEEP | Automated publication | Release Please and npm Trusted Publishing publish released versions from `main`. |
| DEFER | Expanded version ranges | New Oxlint, tsgolint, TypeScript, Node, or package-manager versions require a full matrix run. |

## Exit evidence

- Ledger schema and deterministic source/artifact generators: complete.
- Three-level and AI activation boundaries: complete.
- Behavioral fixture and compatibility harness: complete.
- Side-effect-free ESM package, declarations, peers, and exact content gate: complete.
- Core, TypeScript, React, Node.js, Vitest, and Jest surfaces: complete.
- Migration, companion-tool, experimental-surface, and release documentation: complete.
- `pnpm release:check`: required before creating the beta tag.

The beta was tagged from a clean commit where the release check and CI matrix
passed. `v0.1.0` was subsequently published to npm.

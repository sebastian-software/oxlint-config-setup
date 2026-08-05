# Migration and companion-tool matrix

The table assigns every predecessor concern identified by the baseline and rule
capability catalog. “Oxlint” means behavioral fixtures exist in v0.1; “Research”
does not mean a plugin is approved.

| Predecessor concern | Assignment | v0.1 treatment | Accepted difference or next gate |
| --- | --- | --- | --- |
| JavaScript correctness | Oxlint | Four native high-signal core rules | Expand only with ledger rationale and fixtures |
| TypeScript syntax | Oxlint | Three native syntax rules | Available without a project graph through the syntax-only export |
| TypeScript semantics | Oxlint | Three native type-aware rules | Pinned Oxlint/tsgolint/TypeScript trio is mandatory |
| Imports and modules | Oxlint | Native duplicate and self-import ownership | Native rule replaces the JavaScript fallback; overlapping core owner stays off |
| React and JSX | Oxlint | Native React rules only | No Meta React or `react-hooks` JavaScript plugin |
| React ESLint ecosystems | Accepted gap | No compatibility plugin | Native defect coverage supersedes plugin-identity parity |
| JSX accessibility | Oxlint | Native `alt-text` baseline | Broader accessibility coverage follows the normal fixture gate |
| React Compiler | Research | One isolated experimental native warning | Never enters standard React defaults silently |
| Node.js | Oxlint | Three native CommonJS hazard rules plus ESM-valid fixture | v0.1 does not impose a universal ESM/CommonJS style |
| Vitest | Oxlint | Native focused-test, duplicate-title, and runner-mismatch checks | Vitest and Jest are separate full configs |
| Jest | Oxlint | Native focused-test, duplicate-title, and legacy-Jasmine checks | Vitest and Jest are separate full configs |
| Regular expressions | Research | No JavaScript plugin | Measure native gaps and plugin startup before proposal |
| Testing Library | Research | No JavaScript plugin | Requires conformant API, crash, and performance evidence |
| Playwright | Research | No JavaScript plugin | Requires conformant API, crash, and performance evidence |
| Storybook | Research | No JavaScript plugin | Custom source-extension needs remain unproven |
| SonarJS | Research | No JavaScript plugin | Select defect classes; rule volume is not a gate |
| Sorting and formatting | Companion tool | Formatter/import organizer | Layout is outside the linter budget |
| JSON and package metadata | Companion tool | JSON Schema or package-specific validator | Oxlint source coverage does not include these formats |
| Markdown and MDX | Companion tool | Markdown-aware linter | JavaScript-plugin support does not make custom formats executable |
| Spelling | Companion tool | Spell checker | Repository prose quality is not program linting |
| Project-specific policy trivia | Accepted gap | Not generalized | Shared defaults include only portable defect classes |
| AI-assisted development | Oxlint | TODO marker warning | Broader AI policies remain research until portable defects are demonstrated |

## Coverage language

The 2026-08-04 baseline found that migration metadata mapped roughly 85.3% of
the predecessor's source-code rule identifiers. That is identifier mapping, not
behavioral equivalence. The v0.1 claim is narrower and stronger: all 27 enabled
ledger entries have executable valid/invalid evidence on the pinned toolchain.

No raw parity percentage is a release gate. A future rule enters only when its
defect class, execution path, stability, conflicts, fixture, and review trigger
are recorded in the ledger.

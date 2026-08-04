# Oxlint Config Setup

An opinionated, Oxlint-first linting preset for modern TypeScript projects.

> [!IMPORTANT]
> This project is in its design phase. The initial RFCs and architecture decision
> records are being reviewed before an executable package is published.

## Goal

Provide a high-signal linting setup with one primary runtime: Oxlint. The project
optimizes for developer value, speed, and a small operational surface—not for
rule-by-rule ESLint parity.

The intended stack is:

- native Oxlint rules wherever possible;
- Oxlint's type-aware linting for TypeScript correctness;
- JavaScript plugins only for valuable rule families that have no suitable
  native implementation;
- separate tools for concerns Oxlint does not own, such as formatting or prose.

## Principles

1. One linter command should cover the normal JavaScript and TypeScript workflow.
2. Native rules take precedence over compatibility layers.
3. React is covered by Oxlint's native React rules, not by loading an ESLint React
   plugin to chase numerical parity.
4. Every enabled rule must justify its signal, cost, and maintenance risk.
5. Compatibility percentages are evidence, not product requirements.

## Relationship to the predecessor

This is a new project, not a rewrite in place. The earlier
[`eslint-config-setup`](https://github.com/sebastian-software/eslint-config-setup)
project remains the historical reference for rule intent and real-world usage.
It combines ESLint and Oxlint; this repository explores what a deliberately
Oxlint-native successor should look like.

## Contributing

Design changes start as RFCs. Durable technical choices are recorded as ADRs.
See [CONTRIBUTING.md](CONTRIBUTING.md) for the review model.

## License

[MIT](LICENSE)

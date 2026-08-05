# 0006. Use US English as the project language

- **Status:** Accepted
- **Date:** 2026-08-06
- **Deciders:** Sebastian Software maintainers

## Context

The repository is written primarily in English, but it does not specify an
English locale. Contributors and automated authoring tools can therefore switch
between US and British spelling, vocabulary, and punctuation. That inconsistency
makes documentation less cohesive and makes terminology harder to search and
review.

The project needs one canonical authoring language without changing technical
identifiers, third-party names, or quoted material.

## Decision

US English (`en-US`) is the canonical language for project-authored
communication. Use American spelling, vocabulary, and punctuation in:

- repository documentation, ADRs, RFCs, and release notes;
- package metadata, source comments, diagnostic text, and other user-facing
  messages;
- issue and pull request templates, titles, and descriptions; and
- continuous-integration labels and other maintained project text.

Write for contributors and adopters in a precise, direct, and professional
voice. Documentation should include the prerequisites, sequence, edge cases,
and exact commands a reader needs rather than sacrificing clarity for brevity.

Preserve the exact spelling of API names, code identifiers, product and
organization names, URLs, verbatim quotations, and titles of external sources.
Use ISO 8601 dates where a machine-readable or unambiguous date is preferable;
the `en-US` decision does not replace established technical formats.

A deliberately localized user-facing surface may add another language or locale.
Unless that surface defines a different source locale, US English remains the
canonical source and fallback language.

## Decision drivers

- Give human and automated contributors one explicit editorial default.
- Keep terminology, search results, and review feedback consistent.
- Match the language already used by the package and its documentation.
- Preserve technical accuracy where literal spelling is part of an external
  contract.

## Options considered

### Leave the English locale unspecified

This avoids choosing between valid regional variants, but it permits recurring
inconsistency and leaves automated contributors without a deterministic default.

### Use British English

British English would also provide a coherent standard. It does not match the
dominant spelling already present in this repository.

### Use US English

US English makes the existing convention explicit and provides a recognized
locale identifier that authoring and review tools can apply consistently.

## Consequences

### Positive

- New project text has a clear, reviewable language standard.
- Documentation and product terminology remain consistent across authors and
  tools.
- Locale exceptions are explicit instead of appearing as accidental drift.

### Negative

- Contributors accustomed to another English variant must normalize their
  project-authored text.
- Review remains partly editorial because spelling checks cannot reliably
  distinguish every technical name, quotation, or intentional localization.

## Validation and review triggers

The contribution guide states the canonical locale, and the release gate verifies
that both the policy and this accepted ADR remain discoverable. Pull request
review checks new or changed project-authored prose for US English while
preserving the listed exceptions.

Review this decision if the project's primary audience changes, a localized
surface becomes authoritative, or legal or ecosystem requirements mandate a
different source language or locale.

## References

- [Contribution guide](../../CONTRIBUTING.md)

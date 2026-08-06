# Request for Comments

RFCs define the product contract before implementation. They are the place for
behavior, configuration shape, scope, migration policy, and validation criteria.

## Lifecycle

1. Copy `template.md` to the next zero-padded number.
2. Open a focused pull request with status `proposed`.
3. Resolve material objections or record them under alternatives and risks.
4. Before acceptance, update the RFC status to `accepted` and name the decision
   date. Rejected proposals remain in the repository with status `rejected`.
5. A later RFC may supersede an accepted RFC; history is not rewritten.

Research notes may inform an RFC, but dated compatibility measurements are not a
contract. Durable architectural choices should also be summarized in an ADR.

## Index

| RFC | Title | Status |
| --- | --- | --- |
| [0001](0001-product-contract.md) | Oxlint-first product contract | Accepted |
| [0002](0002-rule-selection-and-validation.md) | Rule selection and validation policy | Accepted |
| [0003](0003-close-the-v01-configuration-contract.md) | Close the v0.1 configuration contract | Accepted and implemented |
| [0004](0004-add-rule-customization-helpers.md) | Add rule customization helpers | Accepted and implemented |

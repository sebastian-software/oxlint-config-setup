# Documentation product brief

## Audience and job

The primary audience is a TypeScript maintainer deciding whether this package is
a sustainable default for a project or team. The homepage should establish the
product model quickly enough to support that decision. The documentation should
then make installation, configuration, and exceptions predictable.

## Positioning

Oxlint Config Setup provides complete, prebuilt Oxlint configurations with three
deliberate policy levels. React and Node.js describe project context. AI is a
constrained guardrail overlay, not a hidden path to stricter human policy.

The key promise is controlled adoption: a maintainer chooses the policy the team
can sustain without assembling a runtime preset graph or accepting accidental
strictness.

## Registers

The homepage uses the **persuade** register. It leads with the maintainer's
decision, uses short declarative claims, and connects every material proof point
to a package artifact, test, or accepted decision.

Guides, reference pages, and generated API pages use the **read** register. They
lead with prerequisites and outcomes, prefer literal language, and keep examples
complete enough to copy.

## Voice

- Use US English.
- Sound precise, candid, and engineering-oriented.
- Prefer active voice and concrete verbs.
- Explain constraints as part of the product, not as apologies.
- Avoid exclamation marks, hype adjectives, invented urgency, and claims that
  cannot be traced to repository evidence.
- Call the AI behavior an overlay or guardrail. Never describe it as a policy
  level.

## Evidence policy

Counts shown on the homepage must come from `scripts/generate-config-stats.ts` or
another deterministic repository source. Do not type changing package metrics
directly into components. Compatibility, performance, and coverage claims must
link to their validation source and state the boundary of what was measured.

Testimonials, customer logos, download counts, and benchmark claims are omitted
until the project owns current, reviewable evidence for them.

## Conversion path

1. Copy the complete supported install command.
2. Read the getting-started guide.
3. Use the configurator to identify the exact named artifact and generated API
   call for a project.
4. Consult policy, AI, rule-customization, and validation reference as needed.

The homepage has one primary action at a time. Repository links are proof paths,
not competing calls to action.

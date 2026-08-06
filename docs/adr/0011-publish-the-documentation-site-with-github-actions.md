# 0011. Publish the documentation site with GitHub Actions

- **Status:** Accepted
- **Date:** 2026-08-06
- **Deciders:** Sebastian Software maintainers

## Context

ADR 0009 established Ardo as the product and documentation site but deliberately
left the external deployment target undecided. The repository now has a
validated static build and a stable project URL, so contributors and package
consumers need one explicit publishing path.

Publishing generated output from a dedicated branch would add a second mutable
representation of the site. Reusing the predecessor's Travis CI integration
would also introduce a separate CI provider even though package and
documentation validation already run in GitHub Actions.

## Decision

Publish the Ardo site to GitHub Pages at
`https://sebastian-software.github.io/oxlint-config-setup/` with a custom GitHub
Actions workflow.

A push to `main` builds and validates the site from repository source, uploads
`docs/build/client` as the GitHub Pages artifact, and deploys that immutable
artifact through the `github-pages` environment. Maintainers may trigger the
same workflow manually when a deployment needs to be retried.

GitHub Pages uses the GitHub Actions publishing source. The project does not
maintain generated site output on a `gh-pages` branch and does not use Travis CI
for website publishing. Build jobs receive read-only repository access; the
separate deployment job receives only the Pages and OpenID Connect permissions
required by GitHub's deployment protocol. Third-party workflow code is pinned
to immutable commit SHAs.

The package manifest, repository homepage, and documentation configuration use
the same canonical HTTPS URL.

## Decision drivers

- Keep reviewed site source and generated deployment output separate.
- Reuse the CI platform that already validates the repository.
- Make every production deployment traceable to a `main` commit and Actions run.
- Avoid long-lived generated branches and provider-specific Travis credentials.
- Apply least-privilege permissions to the deployment path.

## Options considered

### Publish generated output from a branch

This is supported by GitHub Pages, but it creates a mutable generated branch and
requires an additional synchronization mechanism that reviewers cannot validate
as part of the source change.

### Publish with Travis CI

This could reproduce the predecessor's operational setup, but it duplicates CI
configuration and credentials without adding a capability the repository needs.

### Publish a GitHub Actions artifact

This keeps build inputs on `main`, scopes deployment permissions to one job, and
uses GitHub Pages' native custom-workflow contract.

## Consequences

### Positive

- Merges to `main` publish the same static site that CI validates.
- The live deployment does not depend on committed build output.
- Deployment history, environment state, and source commits remain visible in
  one repository.
- The public project URL is consistent across GitHub, npm metadata, and the site.

### Negative

- The repository depends on GitHub Actions and GitHub Pages availability.
- A successful package workflow does not by itself prove that the separate Pages
  deployment completed.
- Maintainers must keep pinned Pages actions current and review permission changes
  during upgrades.

## Validation and review triggers

The Pages workflow runs the documentation check before uploading an artifact and
rejects generated-source drift. A deployment is complete only when the
`github-pages` environment reports the canonical URL and the published homepage
is reachable.

Review this decision if the project adopts a custom domain, requires server-side
rendering or authenticated content, moves away from GitHub, or cannot meet its
availability needs with GitHub Pages.

## References

- [Ardo site decision](0009-use-ardo-for-the-product-and-documentation-site.md)
- [GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [GitHub Pages publishing sources](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

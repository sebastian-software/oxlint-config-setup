# Release automation maintainer guide

Release Please opens and updates the version-bump pull request after a change
lands on `main`. That pull request must pass the same Package workflow as every
other pull request before it can merge. This guide records the one-time GitHub
configuration and the safe recovery path for the automation.

## Why a dedicated token is required

The Release Please workflow uses a dedicated fine-grained personal access token
(PAT), not the workflow `GITHUB_TOKEN`. GitHub starts `pull_request` workflows
that are created or updated with `GITHUB_TOKEN` in an approval-required state.
A PAT lets the Package workflow start automatically instead.

The token must have an expiration date, be owned by the release automation
account rather than a person, and be limited to
`sebastian-software/oxlint-config-setup`. It has only these repository
permissions:

- **Contents: Read and write** — create the release commit, tag, and GitHub
  release.
- **Pull requests: Read and write** — create and update the release pull
  request.
- **Issues: Read and write** — manage the release pull request's labels through
  GitHub's Issues API.

Do not grant Actions, administration, workflow, or organization permissions.
Do not use a maintainer's broad `gh` OAuth token or an npm token.
npm publication remains OIDC Trusted Publishing: the
`publish-npm` job has `id-token: write`, and it deliberately has no npm token.

## One-time GitHub setup

An organization owner must complete these steps before relying on automatic
release PR validation:

1. Create a fine-grained PAT for the release automation account. Set a rotation
   date, restrict repository access to `sebastian-software/oxlint-config-setup`,
   and grant only the three permissions above.
2. In this repository's **Settings → Secrets and variables → Actions**, store
   it as the Actions secret `RELEASE_PLEASE_TOKEN`. Never put a maintainer's
   existing `gh` OAuth token in this secret.
3. Create a branch-protection rule for `main`. Require a pull request and the
   status check **`Package / Required`** from GitHub Actions; require the branch
   to be up to date before merging. Apply the rule to administrators as well if
   administrators must not bypass release validation.
4. Test **`Package / Required`** without invoking Release Please: open or
   synchronize a normal pull request and wait for its Package workflow to
   finish. Do not manually rerun Release Please or push an empty conventional
   commit to `main` merely to test this configuration; either action can create
   or update a real release pull request.
5. After the check appears in GitHub's picker, enable it as the required check.
   Confirm that a normal pull request cannot merge while the check is pending
   or failing. On the next normal releasable change to `main`, confirm that the
   resulting release PR starts Package automatically and that **`Package /
   Required`** passes before merging it. Do not merge a release PR created only
   for testing.

`Package / Required` is intentionally an aggregate job with a fixed name. It
fails unless the matrix verification, consumer artifact check, and documentation
check succeed. This avoids binding branch protection to matrix job names that
include dependency versions. When adding a new Package job that must block
releases, add it to the aggregate job's `needs` list and failure check in
`.github/workflows/package.yml`.

## Recovery and rotation

If Release Please fails before opening or updating its pull request, first
check that the fine-grained PAT has not expired or been revoked, is restricted
to this repository, and has the three expected permissions. Generate a replacement
with the same least-privilege scope, replace `RELEASE_PLEASE_TOKEN`, revoke the
old token, and rerun the failed **Release Please** workflow. Do not paste the
token into issues, pull requests, logs, or local configuration.

If the release PR's Package run is blocked in an approval-required state, it is
using `GITHUB_TOKEN` or a credential that does not create normal pull-request
events. Verify the `token` input on `googleapis/release-please-action` points to
`secrets.RELEASE_PLEASE_TOKEN`, then rerun Release Please after correcting the
secret setup. Do not approve or merge a release PR merely to work around a
missing Package run.

If Package fails, fix the failing check on the release PR before merging. The
publish workflow still checks out the released commit and runs
`pnpm run release:check` immediately before OIDC npm publication, so do not
bypass that gate by publishing manually. For a failed or already-published npm
version, prepare a follow-up patch release; npm versions are immutable.

## Evidence

GitHub documents that `GITHUB_TOKEN`-created or updated pull requests run in an
approval-required state, and explicitly recommends a GitHub App installation
token or personal access token when automation must start the pull-request
workflow without approval:
[GITHUB_TOKEN](https://docs.github.com/en/actions/concepts/security/github_token).
Release Please documents the same PAT pattern and its Contents, Issues, and
Pull requests permissions: [Release Please Action](https://github.com/googleapis/release-please-action#workflow-permissions).
Branch protection can require the stable aggregate check before merging:
[protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches).

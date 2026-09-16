---
sidebar_position: 8
sidebar_label: "Lab 07: Release and promote"
title: "Lab 07: Build, release, and promote"
className: powerPlatformGuide
---

# Lab 07: Build, release, and promote

## Goal

Build the release once on a tag, publish it as an immutable artifact, promote those exact bytes to test and then to production through a deliberate, recorded step, and make rollback a one-step operation.

**Estimated time:** about 60-90 minutes.

## State you carry forward

- Completed [Lab 06: Gate every pull request](06-pull-request-gates.md).
- Pull request validation blocks unsafe merges.
- The `dev`, `qa`, and `prod` GitHub environments exist with their URLs set.

## Why this lab matters

This is where the one rule is either kept or quietly broken. Build the artifact once on a tag, then promote that identical artifact through every environment. Everything in the previous six labs exists to make that rule safe.

## Step 1: keep `develop` releasable

Copy [Appendix A.2](appendix-a-workflows.md#a2-ci-build) into `.github/workflows/ci-build.yml`, changing the same three things you changed in [Lab 06](06-pull-request-gates.md): the solution name, the environment names, and the pinned CLI version. Everything merged to `develop` is built and packed once.

![GitHub Actions run graph for ci-build.yml triggered on push, showing a single successful job named Build the code site and pack the solution that ran for 1 minute 8 seconds.](/img/reliable-alm/ci-build-flow.png)

*A continuous integration run. One job on every push to the integration branch: build the code site, pack the solution, and upload the result as a downloadable candidate.*

The point is that the state of the integration branch is always a known-good, downloadable artifact, rather than something that only exists if someone runs a build locally. The team gets a candidate to smoke-test before a release is cut, and a release cut from `develop` is never the first time the branch has been packed.

This workflow does not publish a release and does not deploy. Artifacts here are build candidates: versioned by run number, retained for a fortnight, then discarded. Release artifacts come from the release workflow on a tag, because those are the bytes that reach an environment and they must be traceable to a version.

## Step 2: add the release and promotion workflow

Copy [Appendix A.3](appendix-a-workflows.md#a3-cd-release) into `.github/workflows/cd-release.yml`, with the same three changes. It is everything that touches a Power Platform environment, in three modes selected on dispatch.

| Mode | What it does |
|---|---|
| `release` | Verify `main`, tag it, pack, publish the GitHub release, and promote to test |
| `promote` | Install an already-published release into test or production. This is also how you roll back. |
| `seed` | Load the base or demo dataset into a development or test environment |

```text
dispatch(release) -> verify -> tag -> release -> promote to qa -> prod (opt-in)
push tag v*                          -> release -> promote to qa
dispatch(promote) -------------------------------> promote to <target>
dispatch(seed)    -------------------------------> seed <target>
```

![The GitHub Run workflow dialog for cd-release.yml, run from branch main. The What to do choice is set to release, followed by inputs for the three-part version, a pre-release checkbox, the release to use defaulting to latest, the target environment defaulting to qa, the upgrade mode defaulting to upgrade, and the seed dataset defaulting to base.](/img/reliable-alm/cd-release-flow-run-options.png)

*The release dispatch form. One workflow covers release, promotion, and seeding. Each input is prefixed with the mode it belongs to, because only some of them apply to the mode you picked.*

:::note Why tagging and packing live in the same workflow
A tag pushed with the default `GITHUB_TOKEN` does not start a new workflow run. GitHub suppresses that to prevent recursion. When tagging and packing were two workflows, the tag was created and nothing happened: the release silently never built. Running both in one dispatch removes the cross-workflow hop entirely, with no personal access token. The `push: tags` trigger is kept for tags pushed by a human, which do fire.
:::

## Step 3: add the shared promotion action

Copy [Appendix A.4](appendix-a-workflows.md#a4-promote-solution) into `.github/actions/promote-solution/action.yml`. The path matters: a composite action must live at `action.yml` inside its own folder, or the `uses: ./.github/actions/promote-solution` reference fails to resolve. Test and production need the same promotion logic, and duplicating it is how the two paths quietly drift apart.

It is a composite action rather than a reusable workflow for a specific reason: a composite action is not a workflow file, so it keeps the layout at three workflows while each calling job keeps its own `environment:` declaration, which is what scopes the credentials and carries any approval gate.

:::note Composite actions cannot read secrets or variables
The `secrets` and `vars` contexts are not available inside a composite action. Every credential, URL, and token is therefore an explicit input, and the calling job is responsible for passing them. This is a common source of an action that silently receives empty strings.
:::

## Step 4: run a release

1. **Tag `main`** with a semantic version. The tag is an immutable pointer to a reviewed commit.
2. **Build once.** The workflow produces the managed solution, the site package, and release notes generated from the merged pull requests.
3. **Promote to test automatically,** then run smoke tests against the deployed site, because a successful import is not evidence that the site works.
4. **Reach production deliberately,** installing the same bytes that were signed off in test. See Step 5 for the two ways that happens.

![GitHub Actions run graph for cd-release.yml triggered on workflow dispatch. Five successful jobs run left to right: Verify the release candidate at 1 minute 21 seconds, Tag the release at 10 seconds, Pack and publish the release at 2 minutes 27 seconds, Promote to QA at 6 minutes 33 seconds, and Explain how to reach production at 3 seconds. The Promote to production job is skipped, as are the separate promote and seed dispatch jobs.](/img/reliable-alm/cd-release-flow.png)

*A release run. Verify, tag, and pack happen once, then the artifact is promoted to QA. Production was not promoted automatically here: the run finished with the job that explains how to reach production, and the promote-to-production job was skipped.*

![The GitHub releases page showing release v1.0.2.3 marked as Latest, its generated changelog listing changes since v1.0.2.2, and nine attached assets. SupplierInvoicePortal_managed.zip at 357 KB is highlighted, alongside CHANGELOG.md, seed-base.json, seed-demo.json, and the source code archives.](/img/reliable-alm/release-artifact-list.png)

*The published release. The managed solution is attached as a release asset with a SHA-256 digest, which is what makes the promoted bytes traceable to a version and available for rollback.*

:::tip Use upgrade, not update
Promote with the upgrade path so components removed since the last release are actually removed. An update leaves deleted components behind, and those orphans accumulate until something breaks in a way nobody can trace.
:::

## Step 5: decide how production is reached

The release workflow promotes to QA automatically and then stops. Production is reached one of two ways, and which one you get depends on a single repository variable.

| `PROD_AUTO_PROMOTE` | What happens after QA succeeds | Use when |
|---|---|---|
| Unset or not `true` | The `prod-instructions` job runs and writes a summary explaining how to promote. `promote-prod` is skipped. | Required reviewers are not configured yet |
| `true` | `promote-prod` runs against the `prod` environment, which pauses for its reviewers | Required reviewers exist on the `prod` environment |

:::warning An unguarded environment does not pause
Required reviewers on a GitHub environment are **not** available for private repositories on Free, Pro, or Team. On those plans they exist only on public repositories; for a private repository you need GitHub Enterprise.

Without required reviewers, `environment: prod` pauses for nobody, so setting `PROD_AUTO_PROMOTE` to `true` would ship to production unattended. That is why the variable exists and why it defaults to off.

Before you turn it on, confirm the gate is real: open **Settings** > **Environments** > **prod** and check that **Required reviewers** is present and populated. If the option is not shown, your plan does not offer it and the variable must stay off.
:::

Until then, production promotion is a deliberate act by a named person: run the workflow again in `promote` mode with the release tag and the `prod` target. That is a weaker control than an approval gate, but it is an honest one, and it is recorded in the run history.

## Step 6: activate the site in a new target environment

The first time a Power Pages site is deployed to a destination environment, the imported site is inactive. [Reactivate it](https://learn.microsoft.com/en-us/power-pages/admin/reactivate-website):

1. Open Power Pages in the target environment.
2. Go to **Inactive sites**.
3. Select the imported site and select **Reactivate**.
4. Choose the web address.
5. Confirm the site opens.

Reactivation is only needed the first time. Later imports that update the site do not require it. If you are updating an existing target site, bind the imported website record to the existing site record, then restart the site.

## Step 7: clear cache after deployment

Clear cache after a deployment or an environment variable change, or the site serves the previous configuration and the smoke tests pass against the wrong thing:

- Select **Sync** in the design studio.
- Browse to `/_services/about` as an administrator and select **Clear cache**.
- Restart the site from the Power Platform admin center.

## Step 8: validate the target

A successful import proves that the bytes arrived, nothing more. Run the smoke suite with `npm run test:deployment`, then confirm:

- Public pages load.
- Sign-in uses the target identity settings, not the development ones.
- Key user journeys work end to end.
- Web roles and table permissions behave correctly.
- Flows and integrations use the target connections.
- No development URLs or client IDs appear anywhere in the served site.

Run `npm run verify:deployment` to confirm the deployed site serves the build that was shipped. That check is what catches a promotion that imported successfully but left the previous bundle in place.

## Step 9: make rollback routine

**Roll back by re-promoting the previous tag.** No reconstruction, and no hotfix branch required to recover.

This is only possible because the artifact was published rather than rebuilt. If your recovery plan involves rebuilding anything, you are shipping bytes that were never signed off, during an incident, which is the worst possible moment to introduce a variable.

Rehearse it now, against `qa`, while nothing is on fire:

1. Note the release tag currently installed in `qa`.
2. Run the workflow with **What to do** set to `promote`, **release to use** set to the *previous* tag, and **target environment** set to `qa`.
3. Confirm the older version is installed and the site still works.
4. Re-promote the current tag to put `qa` back.

A rollback you have never run is a plan, not a capability. The rehearsal also proves that the older release asset is still downloadable, which is the part that silently rots.

| Failure | Recovery |
|---|---|
| Import fails on a missing dependency | Add the component to the source solution, rebuild, and release again |
| Wrong environment value | Correct the value, clear cache, and re-validate |
| Target site is inactive | Reactivate the site or bind it to the existing site record |
| The site serves a stale bundle | Confirm the release asset, re-promote, and clear cache |
| A bad release reached production | Re-promote the previous tag, then fix forward through the normal gates |
| Production has unmanaged edits | Remove the active layer and move the change through source |

## Step 10: agree the operating cadence

| Cadence | Action |
|---|---|
| Every pull request | Validation runs and review evidence is checked |
| Every merge to `develop` | A build candidate is produced automatically |
| Every release candidate | Promote to test and run the smoke suite |
| Before production | Confirm approval, values, secrets, and the rollback tag |
| After production | Record version, artifact, URL, and validation result |
| Nightly | Environment drift runs against the development environment |
| Monthly | Review unmanaged layers, pipeline runs, stale values, secret expiry, and environment access |

Put secret expiry on that monthly list. A service principal secret expires on a date nobody has in a calendar, and it always expires during a release.

## Checkpoint

You have completed this lab when:

- [ ] `ci-build.yml` produces a build candidate on every merge to `develop`.
- [ ] `cd-release.yml` and the `promote-solution` action are in place.
- [ ] A tag on `main` builds once and publishes a GitHub release with the managed solution attached.
- [ ] Test receives the artifact automatically and the smoke suite passes.
- [ ] You have decided how production is reached, and `PROD_AUTO_PROMOTE` is set to `true` only if required reviewers really exist on `prod`.
- [ ] The site is activated in each target environment and cache clearing is part of the runbook.
- [ ] A rollback has been rehearsed against `qa` by re-promoting an earlier tag.
- [ ] The operating cadence is documented and owned.

## Troubleshooting

| Problem | Fix |
|---|---|
| A tag was created and nothing built | The tag was pushed by automation using `GITHUB_TOKEN`. Use the dispatch path, which tags and packs in one run. |
| The promotion action receives empty values | `secrets` and `vars` are unavailable inside a composite action. Pass every value as an explicit input from the calling job. |
| Components deleted in development still exist in production | The promotion used update rather than upgrade. Re-promote with upgrade. |
| Production deployed without anyone approving | `PROD_AUTO_PROMOTE` is `true` but the `prod` environment has no required reviewers, so nothing pauses. Configure reviewers or set the variable back. |
| The imported site is nowhere to be found | Look under inactive sites, and confirm the environment is on the enhanced data model. |
| Test passed but production behaves differently | Compare the release asset installed in each. If they differ, something rebuilt, and that is the rule to fix first. |

## Completion

You now have a reliable ALM setup for Power Pages: source-controlled development where one commit carries the whole change, isolated developer environments, automated gates on every pull request, one artifact built on a tag and promoted unchanged, and import-only test and production environments.

The automation that carries all of it is reproduced in full in [Appendix A](appendix-a-workflows.md) and [Appendix B](appendix-b-scripts.md).

Return to the [ALM overview](/reliable-alm) when you need to onboard another site or refresh the operating model.

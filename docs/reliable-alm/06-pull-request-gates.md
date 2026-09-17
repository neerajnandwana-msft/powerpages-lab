---
sidebar_position: 7
sidebar_label: "Lab 06: Pull request gates"
title: "Lab 06: Gate every pull request"
className: powerPlatformGuide
---

# Lab 06: Gate every pull request

## Goal

Add the automated checks that prove a change is safe to merge, so the shared branch stays healthy without anyone having to remember to verify anything.

**Estimated time:** about 60-90 minutes.

## State you carry forward

- Completed [Lab 05: Work the inner loop](05-inner-loop.md).
- Developers can build, sync, and verify locally with `npm run` scripts.
- `develop` and `main` require passing status checks.

## Why this lab matters

Once a pull request opens, automation takes over. A rule that nothing checks is not a control, and the checks here are the ones that turn the blueprint from a document into something the repository enforces.

## Step 1: understand the three workflows

The whole outer loop is three workflows and one shared action. This lab builds the first one; [Lab 07](07-release-and-promote.md) builds the other two.

![GitHub Actions flow that validates pull requests, runs quality gates, builds and packages the release, and deploys to test and production.](/img/reliable-alm/power-pages-alm-outer-ci-cd.svg)

*Each repository event starts the appropriate workflow: validate on a pull request, build on `develop`, and release from a version tag.*

| Workflow | Runs on | What it proves |
|---|---|---|
| **Pull request validation** ([Appendix A.1](appendix-a-workflows.md#a1-pr-validation)) | Every pull request | The source lints, type-checks, and passes tests; links resolve; the solution source packs both managed and unmanaged; the solution checker passes; the committed bundle matches what the source builds. |
| **Continuous integration build** ([Appendix A.2](appendix-a-workflows.md#a2-ci-build)) | Merge to `develop` | The integration branch is always a known-good, downloadable build candidate, so cutting a release is never the first time that state has been packed. |
| **Release and promotion** ([Appendix A.3](appendix-a-workflows.md#a3-cd-release)) | A version tag on `main` | The release is built once, published as immutable artifacts, installed in test automatically, and reaches production only through a deliberate release decision. |

## Step 2: add the validation workflow

Copy [Appendix A.1](appendix-a-workflows.md#a1-pr-validation) into `.github/workflows/pr-validation.yml`. Use the copy button on the code block rather than selecting the text, so the indentation survives: YAML is whitespace-sensitive and a reflowed paste fails to parse.

:::warning Change these three things before you commit
Every workflow in [Appendix A](appendix-a-workflows.md) is specific to the sample in three ways, and all three appear in this file:

1. The solution name `SupplierInvoicePortal` in every path.
2. The environment names `dev`, `qa`, and `prod`, if you chose different ones.
3. The pinned Power Platform CLI version, which must match what your developers run locally.

Secrets and variables come from GitHub environments, so nothing in these files carries a credential.
:::

The workflow is everything that verifies the repository without deploying it. It has three trigger groups, each running a different set of jobs:

| Trigger | Jobs | Purpose |
|---|---|---|
| Pull request to `main` or `develop`, and push to `main` | `quality`, `web`, `solution`, `solution-checker`, `drift` | The change gate |
| Nightly schedule | `environment-drift` | Catches maker-portal edits in the development environment |
| Manual dispatch | `analyze` | CodeQL analysis |

## Step 3: understand what the change gate proves

The jobs run in parallel so a contributor sees the first failure quickly, and they are ordered here by cost.

| Job | Display name | What it proves |
|---|---|---|
| `quality` | Lint, type-check, unit tests and links | The source lints, type-checks, passes unit tests, and its links resolve |
| `web` | Build and test the SPA | The SPA builds and the end-to-end suite passes against it |
| `solution` | Validate Dataverse solution source | The unpacked solution XML is a valid build input, packed both managed and unmanaged |
| `solution-checker` | Run solution checker | The packed solution passes Power Platform static analysis |
| `drift` | Solution matches the SPA build | The bundle committed inside the solution is what the source builds |

Every job must pass before the pull request can merge.

## Step 4: understand the two drift checks

`drift` and `environment-drift` are siblings, and they deliberately live in the same workflow. They catch opposite mistakes.

| Check | Catches | Runs on |
|---|---|---|
| `drift` | A developer who changed site code without syncing the solution | Every pull request |
| `environment-drift` | Someone editing the site in the maker portal, which never touches the source at all | A nightly schedule |

The second one matters more than it looks. A maker-portal edit in the development environment exists in no branch, so no pull request can ever show it, and the next import erases it. Nothing except a scheduled comparison against committed source will find it.

![GitHub Actions run graph for pr-validation.yml triggered on schedule. The change-gate jobs, including Validate Dataverse solution source, Run solution checker, Lint type-check unit tests and links, Build and test the SPA, Solution matches the SPA build, and Analyze TypeScript, are all skipped at 0 seconds, while the job Compare Contoso-dev against committed solution source ran for 2 minutes 3 seconds and succeeded.](/img/reliable-alm/pr-validation-flow.png)

*A scheduled run of the same workflow. Because the trigger is the nightly schedule rather than a pull request, every change-gate job is skipped and only the environment drift comparison runs. One workflow file, three trigger groups, and each group does only its own work.*

:::note Drift detection needs a reproducible build
Comparing a freshly built bundle against the committed one only works if an identical source tree always produces identical bytes. If your build embeds a timestamp, a hash of the machine, or unscoped CSS output, the gate fails on every run and the team learns to ignore it.
:::

## Step 5: require the checks

A workflow that runs but does not block is documentation. Open the ruleset you created in [Lab 04](04-branching-and-protection.md) for each of `develop` and `main`, enable **Require status checks to pass**, and add the five change-gate checks.

:::warning Add the display name, not the job key
GitHub matches a required check against the job's `name:` value, not the key it is defined under. Add `Lint, type-check, unit tests and links`, not `quality`. Use the **Display name** column in Step 3 for all five.

The safest way to get them right is to open a throwaway pull request first, let the workflow run once, then pick the checks from the suggestions list instead of typing them. A misnamed required check waits forever for a job that will never report, and the usual response is for someone to remove the requirement.
:::

Do not add `environment-drift` or `analyze` as required checks. They never run on a pull request, so requiring them blocks every merge permanently.

## Step 6: add dependency and action updates

Copy [Appendix A.5](appendix-a-workflows.md#a5-dependabot) into `.github/dependabot.yml`. It covers npm packages and GitHub Actions versions.

Pinned action versions are only safe if something proposes the upgrades. Without this, pinning quietly turns into neglect.

Two details in that configuration are worth copying:

- **Minor and patch updates are grouped.** The SPA bundle is content-hashed into the solution, so every dependency bump requires a sync. Grouping keeps that to one pull request a week rather than one per package.
- **Major updates arrive individually.** A grouped major bump is all-or-nothing, so a single incompatibility blocks every package in the group and the required bundle re-sync has to cover every change at once.

The schedule is weekly, so nothing happens immediately. To confirm it is working without waiting, open **Insights** > **Dependency graph** > **Dependabot** and check that both ecosystems are listed with a recent check time.

## Step 7: write down the release gate

Record, in the repository rather than in a chat thread, what must be true before a release is cut. Add it to your `docs/` folder or to the pull request template from [Lab 04](04-branching-and-protection.md):

- The pull request is approved.
- Every required check passes.
- The solution checker result is acceptable, and any accepted findings are named.
- Environment values are documented for the target stage.
- The release owner accepts any known risks.

Name the release owner. A gate with no owner is a list.

## Checkpoint

You have completed this lab when:

- [ ] `pr-validation.yml` exists and runs on pull requests to `develop` and `main`.
- [ ] `quality`, `web`, `solution`, `solution-checker`, and `drift` all pass on a clean branch.
- [ ] Every change-gate job is a required status check on both shared branches, added by display name.
- [ ] A deliberate code change without a sync fails the `drift` job.
- [ ] The nightly `environment-drift` job runs and reports against the development environment.
- [ ] `dependabot.yml` is committed and both ecosystems appear under the dependency graph.
- [ ] The release gate is written down and the release owner is named.

## Troubleshooting

| Problem | Fix |
|---|---|
| A required check never reports | The required check uses the job key instead of its `name:` display value. Fix the name rather than removing the requirement. |
| Every merge is blocked and a check is stuck pending | A check that never runs on pull requests, usually `environment-drift` or `analyze`, was added as required. Remove it. |
| `drift` fails on every run | The build is not reproducible. Remove non-deterministic output from the build, then re-sync once. |
| `solution-checker` produces noisy findings | Tune the threshold, but keep critical findings blocking. A gate tuned to never fail is not a gate. |
| The solution job fails to pack | The unpacked source is invalid, often from a hand-edit. Re-sync from the environment. |
| Validation takes too long | Keep fast checks on pull requests and move deeper analysis to the nightly schedule, which is what `analyze` already does. |
| A secret appears in a pull request | Remove it, rotate it immediately, and record the incident. Rotation matters more than removal, because the history retains it. |

## Next step

Continue to [Lab 07: Build, release, and promote](07-release-and-promote.md).

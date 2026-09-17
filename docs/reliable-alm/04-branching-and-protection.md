---
sidebar_position: 5
sidebar_label: "Lab 04: Branching and protection"
title: "Lab 04: Set up branching and branch protection"
className: powerPlatformGuide
---

# Lab 04: Set up branching and branch protection

## Goal

Create a branch model that maps onto the environment ladder, then protect the shared branches so the rules cannot be bypassed.

**Estimated time:** about 35-50 minutes.

## State you carry forward

- Completed [Lab 03: Set solution boundaries and repository layout](03-solutions-and-repository.md).
- The repository holds site source and unpacked solutions in one commit.
- Environments exist for integration, per developer, test, and production.

## Why this lab matters

Source control is the single source of truth across time, versions, and environments. Environments are rebuilt from Git, never cloned from each other. The branch model is what makes that claim true rather than aspirational.

## Step 1: create the branch model

We recommend a GitFlow-style model, because it maps cleanly onto the environment ladder you built in [Lab 02](02-environment-strategy.md).

| Branch | Maps to | Rules |
|---|---|---|
| `dev/<alias>/<topic>` | One developer's environment | Personal and short-lived. Branched from the shared feature branch, merged back through a pull request. |
| `feature/*` | The feature the team is building | Shared by everyone working on one feature. This is the branch a developer's environment is rebuilt from. |
| `develop` | Integration | Protected. Requires a pull request and passing checks. Squash merge, then delete the branch. |
| `main` | Test and production | Protected. Requires a pull request, green checks, and linear history. Direct pushes blocked. Releases are tagged here. |
| `hotfix/*` | Expedited path | Same checks and approvals as any other change. Merge back to `develop` after release so the fix is never lost. |

The two-level split at the top is what lets several people build one feature without colliding. Each developer owns a personal branch and an environment; the shared `feature/*` branch is the only place their work meets before it reaches `develop`.

Create a personal branch off the shared feature branch:

```bash
git switch feature/invoice-list
git pull
git switch -c dev/<alias>/<topic>
```

## Step 2: understand why one commit carries both halves

Every branch carries both the unpacked solution and the site source, so one commit is one reviewable change.

That single decision is what makes code review meaningful for a low-code workload. Reviewers see the schema change and the interface change side by side, in one diff, and can tell whether they agree with each other. Split them across two systems and review degrades into approving whatever appears in the half you can see.

## Step 3: map the flow

![Branching flow across personal work branches, shared feature branches, develop, main, and the hotfix path, including pull requests, release tags, and back-merges.](/img/reliable-alm/power-pages-alm-outer-branching.svg)

*Feature work reaches `develop` through pull requests. Releases move from `develop` to `main`, and every release or hotfix returns to `develop`.*

The back-merge at the end is not optional. A hotfix that reaches production but never returns to `develop` is silently reverted by the next release, which is the failure that teaches teams to distrust their own pipeline.

## Step 4: protect `main` and `develop`

In the repository, go to **Settings** > **Rules** > **Rulesets** > **New ruleset** > **New branch ruleset**. Create one ruleset targeting `main` and one targeting `develop`, and set enforcement to **Active**. A ruleset left in **Evaluate** mode reports but never blocks.

Require on both:

- A pull request before merge.
- At least one approving review.
- All required status checks passing. You add the specific checks in [Lab 06](06-pull-request-gates.md).
- Conversation resolution before merge.
- Block force pushes.
- Restrict deletions.

On `main`, additionally require linear history. It keeps the commit that a version tag points at unambiguous, which matters because that tag is what the release is built from.

:::note Protect the rule, not just the branch
Use the ruleset's **Bypass list** to limit who can waive these rules to a named break-glass group, and make bypassing produce an audit entry somebody actually reads. A protection rule that any maintainer can waive quietly is a suggestion.
:::

## Step 5: define what a pull request must contain

Add `.github/pull_request_template.md` so the evidence arrives with the change rather than being asked for afterwards:

```markdown title=".github/pull_request_template.md"
## Summary

## Components changed

## Environment variables or connection references affected

## Validation evidence

## Screenshots for visible site changes

## Rollback or hotfix note
```

## Step 6: assign review ownership

Add `.github/CODEOWNERS` so the right reviewer is requested automatically. Matching a reviewer to an area by hand works until the week someone is on leave.

Map each area to a path and a team:

| Area | Path | Reviewer |
|---|---|---|
| Power Pages content and navigation | `.powerpages-site/` | Site owner |
| Dataverse schema | `solutions/**/Entities/` | Data model owner |
| Web roles and table permissions | `solutions/**/powerpagecomponents/` | Security owner |
| Workflows and deployment files | `.github/` | Platform team |
| Developer scripts and hooks | `scripts/`, `.githooks/` | Platform team |

```text title=".github/CODEOWNERS"
# Last matching pattern wins, so order matters: general first, specific last.
*                                       @contoso/platform-team

.powerpages-site/                       @contoso/site-owners
solutions/**/Entities/                  @contoso/data-model-owners
solutions/**/powerpagecomponents/       @contoso/security-owners

/.github/                               @contoso/platform-team
/scripts/                               @contoso/platform-team
/.githooks/                             @contoso/platform-team
```

:::note CODEOWNERS only bites if review is required
Owners are requested automatically either way, but the review is only mandatory when the ruleset from Step 4 has **Require review from Code Owners** enabled. Turn it on there, or this file is a suggestion.
:::

## Step 7: agree conflict ownership

Branch protection stops bad merges. It does not stop two people editing the same page all week.

- Pull and re-import the shared feature branch before starting work, so you begin from the team's baseline rather than yesterday's.
- Assign makers to separate pages or components where possible.
- Talk before changing shared components, tables, or permissions.
- Keep work items small enough that a branch lives for days, not weeks.

## Step 8: agree the hotfix rules

1. Branch from `main`.
2. Keep the change minimal, because it is going to production on a compressed timeline.
3. Run the same checks and approvals as any other change. The urgency is in the schedule, not in the standard.
4. Tag and release through the normal pipeline.
5. Merge back to `develop` so the fix survives the next release.

## Checkpoint

You have completed this lab when:

- [ ] `develop` and `main` exist and the branch naming convention is agreed.
- [ ] Both shared branches require a pull request, a review, and passing checks.
- [ ] `main` requires linear history and blocks direct pushes.
- [ ] Bypass permission is limited to a named break-glass group.
- [ ] A pull request template exists.
- [ ] `CODEOWNERS` routes reviews to the right owners.
- [ ] The hotfix path, including the back-merge, is documented.

## Troubleshooting

| Problem | Fix |
|---|---|
| A fix shipped to production and then vanished | The hotfix was never merged back to `develop`. Back-merge every hotfix, and check for missing ones now. |
| Feature branches live for weeks and merge painfully | The work items are too large. Split them so a branch lives for days. |
| Reviewers approve without reading the solution diff | Point them at the schema half of the commit, and use `CODEOWNERS` to request the data model owner explicitly. |
| Checks are required but nobody can merge anything | A required check is misnamed. The required check name is the job's `name:` display value, not the job key. See [Lab 06](06-pull-request-gates.md). |
| The same page conflicts every week | Split ownership or make the work items smaller. This is a coordination problem, not a tooling one. |

## Next step

Continue to [Lab 05: Work the inner loop](05-inner-loop.md).

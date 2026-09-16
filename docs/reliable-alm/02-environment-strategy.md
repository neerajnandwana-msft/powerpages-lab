---
sidebar_position: 3
sidebar_label: "Lab 02: Environment strategy"
title: "Lab 02: Set up the environment strategy"
className: powerPlatformGuide
---

# Lab 02: Set up the environment strategy

## Goal

Create the environment ladder the rest of the process promotes along, and lock the downstream environments so the only way in is an import.

**Estimated time:** about 45-60 minutes.

## State you carry forward

- Completed [Lab 01: Design the ALM blueprint](01-design-alm-blueprint.md).
- The five decisions are recorded, including isolated developer environments and import-only downstream.
- The service principal is an application user in every environment the pipeline touches.

## Why this lab matters

An environment is a container for Dataverse, apps, flows, and Power Pages sites, plus the permissions to use them. Getting the roles wrong is the failure that is hardest to undo, because by the time it hurts you have components in the wrong place and no clean baseline to rebuild from.

## Step 1: create the four environment roles

We recommend four roles. The number of environments grows with the team, but the roles do not.

| Environment | Solution state | Who changes it | Purpose |
|---|---|---|---|
| **Integration** | Unmanaged | The team, together | Build the baseline once, extract it to source control, then use it to validate merged features. |
| **Dev, one per developer** | Unmanaged | One developer, alone | Isolated authoring. Imported from the developer's own branch and rebuilt freely. |
| **Test** | Managed, locked | The pipeline only | Receives the release artifact automatically on a tag. Where sign-off happens. |
| **Production** | Managed, locked | The pipeline, after approval | Receives the same artifact that was signed off, behind a manual approval gate. |

Create the integration environment first. It holds the baseline that everything else is derived from.

## Step 2: agree the publisher prefix before anyone forks

Agree the publisher name, publisher prefix, and solution name in the integration environment before a second person starts work.

The prefix becomes part of every component's logical name. Changing it later means recreating components, and two developers who picked different prefixes produce merges that conflict at the component level rather than the file level, which is far harder to resolve.

## Step 3: build the baseline and extract it

In the integration environment:

1. Create the publisher and the unmanaged solution.
2. Add the Power Pages site to the solution. If **Site** does not appear as an option, the site is not on the enhanced data model.
3. Add the dependencies the site needs: tables, columns, relationships, choices, forms, views, web roles, table permissions, site settings, flows, connection references, and environment variable definitions.
4. Export and unpack the solution into the repository, then commit it as the baseline.

Do not assume dependencies are added automatically. A table that the site queries but that is not in the solution imports as a missing dependency in test, which is the most common first-deployment failure.

## Step 4: give every developer their own environment

Each developer creates a development environment and authenticates to it:

```bash
pac auth create --environment <your dev environment url>
```

They then import the unmanaged solution built from their branch, so the environment is a rebuild of source rather than a copy of somebody else's environment.

:::tip Joining should cost a branch, an environment, and one import
If a developer's first day takes longer than that, the environment strategy has drifted and something that should live in the repository is living in an environment instead.
:::

## Step 5: lock test and production

Test and production accept managed solution imports from the pipeline and nothing else.

- Grant makers no maker access to these environments.
- Restrict the ability to import solutions to the service principal.
- Make it explicit that the fix for an urgent production problem is a hotfix branch, not a maker-portal edit.

:::note Why locking matters more than it sounds
A change made directly in test or production exists in no branch, survives no redeployment, and cannot be reviewed. The next import silently erases it, usually weeks later, and the person who made it has long since moved on. Locking the environment is what makes the erasure impossible rather than merely discouraged.
:::

## Step 6: apply the four guardrails

Check each of these is true before you continue:

- **One developer, one environment.** Never share a development environment, and never build in the default environment.
- **Unmanaged upstream, managed downstream.** Makers build unmanaged. Only managed artifacts from the pipeline enter test and production.
- **Same publisher prefix everywhere.** Agreed in the integration environment before anyone forks.
- **Configuration travels separately.** Connection references and environment variable definitions ship inside the solution; their values are supplied per environment at import time.

## Step 7: map environments to GitHub environments

Connect the ladder to the pipeline by pointing each GitHub environment at the right Dataverse URL.

| Power Platform environment | GitHub environment | `PP_ENVIRONMENT_URL` |
|---|---|---|
| Developer or integration | `dev` | The integration environment URL |
| Test | `qa` | The test environment URL |
| Production | `prod` | The production environment URL |

The `prod` GitHub environment is what scopes the production credentials and, if your plan supports required reviewers, carries the approval gate. That is why the pipeline can use one promotion step for every target and still treat exactly one of them differently. [Lab 07](07-release-and-promote.md) covers what to do when required reviewers are not available.

## Checkpoint

You have completed this lab when:

- [ ] Integration, per-developer, test, and production environments exist.
- [ ] The publisher prefix and solution name are agreed and recorded.
- [ ] The baseline solution is committed to the repository from the integration environment.
- [ ] Every developer has their own environment, built by importing from their branch.
- [ ] Test and production reject everything except a pipeline import.
- [ ] The default environment is not used for any of this.
- [ ] Each GitHub environment points at the right Dataverse URL.

## Troubleshooting

| Problem | Fix |
|---|---|
| **Site** is missing from the solution's **Add existing** menu | Confirm the site uses the enhanced data model and that you are in the right environment |
| A merge conflicts at the component level | Two environments used different publisher prefixes. Agree one and rebuild from the baseline. |
| Import into test reports a missing dependency | The component is used by the site but was never added to the solution. Add it upstream, re-export, and re-promote. |
| A developer's environment has drifted beyond repair | Delete and rebuild it by importing from their branch. That this is cheap is the point of the strategy. |
| Someone needs to fix production now | Use the hotfix path in [Lab 04](04-branching-and-protection.md). It exists so that the answer is never a maker-portal edit. |

## Next step

Continue to [Lab 03: Set solution boundaries and repository layout](03-solutions-and-repository.md).

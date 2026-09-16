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
| **Production** | Managed, locked | The pipeline, on a deliberate release decision | Receives the same artifact that was signed off. See [Lab 07](07-release-and-promote.md) for how that decision is enforced. |

Create the integration environment first. It holds the baseline that everything else is derived from.

## Step 2: agree the publisher prefix before anyone forks

Agree the publisher name, publisher prefix, and solution name in the integration environment before a second person starts work.

The prefix becomes part of every component's logical name. Changing it later means recreating components, and two developers who picked different prefixes produce merges that conflict at the component level rather than the file level, which is far harder to resolve.

## Step 3: build the baseline and extract it

In the integration environment, using the maker portal:

1. Create the publisher and the unmanaged solution.
2. Add the Power Pages site to the solution. If **Site** does not appear as an option, the site is not on the enhanced data model.
3. Add the dependencies the site needs: tables, columns, relationships, choices, forms, views, web roles, table permissions, site settings, flows, connection references, and environment variable definitions.

Do not assume dependencies are added automatically. A table that the site queries but that is not in the solution imports as a missing dependency in test, which is the most common first-deployment failure.

Then extract both halves into the repository. Authenticate to the integration environment first:

```bash
pac auth create --environment <integration environment url>
```

The commands below use three placeholders. Collect them once and reuse them for the rest of the guide:

| Placeholder | Where to find it |
|---|---|
| `<integration environment url>` | Power Platform admin center > **Environments** > your environment > **Environment URL**, for example `https://contoso-dev.crm.dynamics.com`. This is also the `PP_ENVIRONMENT_URL` value from [setup](00-setup.md). |
| `<SolutionName>` | The **Name** (not display name) of the solution you created in this step, for example `SupplierInvoicePortal`. Run `pac solution list` to confirm. |
| `<your site id>` | Run `pac pages list -v` and copy the website ID of your site. The same output confirms the data model version. |

Export the solution as unmanaged and unpack it into its folder:

```bash
pac solution export --name <SolutionName> --path ./out/<SolutionName>.zip --managed false --overwrite
pac solution unpack --zipfile ./out/<SolutionName>.zip --folder ./solutions/<SolutionName>/src --packagetype Unmanaged --allowDelete --allowWrite
```

Download the site source, which is the other half of every commit:

```bash
pac pages list -v
pac pages download-code-site --path ./.powerpages-site --webSiteId <your site id> --overwrite
```

Run `pac pages list -v` first: it prints the website ID you need for the second command, and confirms the data model version.

Commit both together as the baseline, and do not commit the `out/` folder:

```bash
git add solutions .powerpages-site
git commit -m "Baseline: Power Pages site and Dataverse solution"
```

:::tip One export now, `sync:solution` afterwards
This is the only time you run export and unpack by hand. From [Lab 05](05-inner-loop.md) onwards, `npm run sync:solution` does the build, upload, download, and unpack in the right order, which is why it exists.
:::

## Step 4: give every developer their own environment

Each developer creates a development environment and authenticates to it:

```bash
pac auth create --environment <your dev environment url>
```

They then rebuild that environment from source rather than copying somebody else's environment. Pack the unpacked solution from their branch, then import it:

```bash
pac solution pack --zipfile ./out/<SolutionName>.zip --folder ./solutions/<SolutionName>/src --packagetype Unmanaged
pac solution import --path ./out/<SolutionName>.zip --publish-changes
```

`pac solution pack` is the exact inverse of the `unpack` in Step 3, which is what makes "rebuilt from source" literal rather than aspirational.

:::tip Joining should cost a branch, an environment, and one import
If a developer's first day takes longer than that, the environment strategy has drifted and something that should live in the repository is living in an environment instead.
:::

## Step 5: lock test and production

Test and production accept managed solution imports from the pipeline and nothing else. Locking them takes three concrete changes:

1. **Remove maker access.** In the Power Platform admin center, open the environment, then **Settings** > **Users + permissions** > **Security roles**. Nobody except the service principal should hold System Administrator or System Customizer. Makers who need to look at the environment get a read-only role.
2. **Leave the service principal as the only importer.** Solution import requires System Customizer or System Administrator, so removing those roles from everyone else is what restricts import. Confirm the application user added in [Reliable ALM setup](00-setup.md) is present and is the only account with that role.
3. **Write down the exception path.** Make it explicit that the fix for an urgent production problem is a hotfix branch, not a maker-portal edit, and name who decides.

Step 2 is worth stating plainly because there is no separate "may import solutions" switch. Import permission is a consequence of the security role, so role hygiene *is* the lock.

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

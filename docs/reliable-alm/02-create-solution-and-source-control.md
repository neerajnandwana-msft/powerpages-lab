---
sidebar_position: 2
sidebar_label: "Lab 02: Solution and source"
title: "Lab 02: Create the solution and connect source control"
className: powerPlatformGuide
---

# Lab 02: Create the solution and connect source control

## Goal

Create the unmanaged solution for the Power Pages site, add the required components, and connect the development inner loop to Azure DevOps Git.

**Estimated time:** about 45-60 minutes.

## State you carry forward

- Completed [Lab 01: Design the ALM blueprint](01-design-alm-blueprint.md).
- Solution strategy and source-of-truth rules are agreed.
- Azure DevOps Git repository is ready.

## Step 1: create a publisher and solution

In Power Apps or Power Pages:

1. Open the development environment.
2. Go to **Solutions**.
3. Create a publisher for the project if one does not exist.
4. Create a new unmanaged solution.
5. Set the solution as the preferred solution for makers who work on this site.

Use one publisher for related work. The publisher prefix becomes part of component names and is difficult to change later.

## Step 2: add the Power Pages site

Inside the solution:

1. Select **Add existing** > **Site** > **Site**.
2. Select the Power Pages site.
3. Choose **Include all objects** for a first baseline, or **Edit objects** when you already know which components should travel.
4. Add the site to the solution.

If **Site** does not appear, confirm the site uses the enhanced data model.

## Step 3: add dependencies

Add required Dataverse and site dependencies. Do not assume every dependency is added automatically.

| Component | What to include |
|---|---|
| Tables | Custom tables, columns, relationships, choices, forms, and views the site needs |
| Security | Web roles, table permissions, security roles where applicable |
| Site settings | Web API, authentication, headers, AI, feature flags, and environment-variable-backed settings |
| Automation | Cloud flows, connection references, and environment variables |
| Code | Web resources, PCF controls, plugins, or custom workflow activities if used |

Avoid adding all assets for large tables unless you intend to ship all table assets.

## Step 4: connect native Git integration

From the Solutions area:

1. Open **Connect to Git**.
2. Choose environment binding for the simplest team setup, or solution binding for a narrower binding.
3. Select Azure DevOps organization, project, repository, branch, and folder.
4. Connect.

Native Git integration stores solution objects in a Git-friendly format and lets makers commit, pull, and resolve conflicts from the Solutions experience.

## Step 5: make the first baseline commit

1. Open the solution.
2. Select **Source control**.
3. Refresh changes.
4. Review the baseline.
5. Commit with a clear message, such as `Baseline Power Pages site solution`.

## Step 6: practice pull and conflict flow

Before future commits:

1. Select **Check for updates**.
2. Pull incoming changes.
3. Resolve conflicts if prompted.
4. Validate the site.
5. Commit your changes.

This is the team habit that keeps multiple development environments aligned.

## Checkpoint

You have completed this lab when:

- [ ] Custom unmanaged solution exists.
- [ ] Power Pages site and dependencies are in the solution.
- [ ] Preferred solution is set where appropriate.
- [ ] Native Git integration is connected to Azure DevOps Git.
- [ ] Baseline commit exists.
- [ ] Team knows how to pull, commit, and resolve conflicts.

## Troubleshooting

| Problem | Fix |
|---|---|
| The site is missing from **Add existing** | Confirm enhanced data model and environment selection |
| Too many table assets appear | Use selected objects for segmentation |
| Git connection fails | Confirm Managed Environment, Azure DevOps permissions, and System Administrator role |
| Conflicts are frequent | Assign makers to separate components and pull before starting work |

## Next step

Continue to [Lab 03: Define branching and review strategy](03-branching-and-review-strategy.md).

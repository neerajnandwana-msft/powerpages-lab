---
sidebar_position: 0
sidebar_label: "Reliable ALM setup"
title: "Reliable ALM setup"
className: powerPlatformGuide
---

# Reliable ALM setup

Complete this setup before you design the ALM blueprint.

## Goal

Confirm the environments, repositories, tools, roles, and owners required for a reliable manual ALM setup.

**Estimated time:** about 30-45 minutes.

## State you need

- Existing Power Pages site.
- Power Pages site uses the enhanced data model.
- Power Platform environments for development, test, and production, or a plan to create them.
- Azure DevOps project and Git repository for native Dataverse Git integration.
- PAC CLI and Git available for manual validation and automation support.
- Power Platform admin who can help with Managed Environments, Pipelines, and production roles.

## Step 1: map environments

Use this starter map. Add environments only when they serve a clear purpose.

| Environment | Purpose | Who changes it | Solution form |
|---|---|---|---|
| Development | Active maker and developer work | Makers and developers | Unmanaged |
| Test | Validate a release candidate | Pipeline or release owner | Managed |
| Production | Live site | Pipeline or release owner only | Managed |

For team development, add isolated developer environments when several people work in parallel. Downstream environments should be locked to managed solution imports, not direct maker edits.

## Step 2: confirm platform prerequisites

Verify these before creating source-control bindings or pipelines:

- [ ] The site uses the enhanced data model.
- [ ] Development environment has Dataverse.
- [ ] Development environment is a Managed Environment if you use native Dataverse Git integration.
- [ ] Test and production environments exist or have an owner and creation date.
- [ ] The Default environment is not used for ALM.

## Step 3: confirm repository and tool choices

Native Dataverse Git integration connects a development environment or unmanaged solution to **Azure DevOps Git** from the Solutions experience. It is intended for development environments, not test or production.

CI/CD is separate. Choose a runner for validation and artifact creation:

| Choice | Use for |
|---|---|
| Azure DevOps Pipelines | Teams already using Azure Repos or Azure Boards |
| GitHub Actions | Teams whose engineering workflows and reviews live in GitHub |
| Power Platform Pipelines | Governed solution promotion across environments |

## Step 4: verify local tools

Run:

```bash
pac auth list
pac org who
git --version
```

If you use GitHub for CI/CD, also verify:

```bash
gh auth status
```

## Step 5: assign owners

Capture owners before configuration begins.

| Area | Owner |
|---|---|
| Development environment |  |
| Test environment |  |
| Production environment |  |
| Azure DevOps Git repository |  |
| Solution publisher and solution strategy |  |
| Branch policies and PR process |  |
| Quality and security gates |  |
| Pipeline host and stages |  |
| Production approval |  |
| Emergency recovery |  |

## Checkpoint

You are ready for Lab 01 when:

- [ ] Environment map is agreed.
- [ ] Enhanced data model is confirmed.
- [ ] Azure DevOps Git repository is ready.
- [ ] PAC CLI and Git work locally.
- [ ] CI/CD runner choice is separate from native Git integration.
- [ ] Owners are captured.

## Troubleshooting

| Problem | Fix |
|---|---|
| Native Git option is missing | Confirm the development environment is a Managed Environment and you have the required role |
| Site cannot be added to a solution | Confirm the site uses the enhanced data model |
| Team wants GitHub only | Use Azure DevOps Git for native Dataverse Git integration, then use GitHub Actions separately if needed |
| No production owner | Stop and assign one before pipeline setup |

## Next step

Continue to [Lab 01: Design the ALM blueprint](01-design-alm-blueprint.md).

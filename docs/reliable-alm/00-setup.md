---
sidebar_position: 1
sidebar_label: "Reliable ALM setup"
title: "Reliable ALM setup"
className: powerPlatformGuide
---

# Reliable ALM setup

Complete this setup before you design the blueprint. It confirms the tools, the repository, the identity the automation runs as, and the configuration the workflows read.

## Goal

Get one repository, one service principal, and one set of GitHub secrets and variables in place, so every later lab configures behavior rather than credentials.

**Estimated time:** about 45-60 minutes.

## State you need

- An existing Power Pages site that uses the [enhanced data model](https://learn.microsoft.com/en-us/power-pages/admin/enhanced-data-model). Solution-aware packaging, Git-friendly source, and pipeline promotion all depend on it. Run `pac pages list -v` to check which model a site uses, and [migrate the site](https://learn.microsoft.com/en-us/power-pages/admin/migrate-enhanced-data-model) first if it is still on the standard model.
- A Power Platform tenant where you can create environments, or an admin who can create them for you.
- A GitHub repository for the workload, with permission to configure Actions secrets, variables, environments, and branch rules.
- A Power Platform admin who can register a service principal and grant it application-user access.

:::note This guide assumes a compiled site
The examples use a Power Pages SPA, which compiles a bundle that is then committed inside the solution. If your site is authored entirely in the design studio, skip the build and bundle-drift steps throughout. The environment, branching, solution, and promotion steps apply unchanged.
:::

## Step 1: install the local toolchain

Install these on every developer machine:

1. **Node.js 22.** The workflows pin the same major version, so local and pipeline builds agree.
2. **Power Platform CLI.** Install it standalone or through the Visual Studio Code extension.
3. **Git**, configured with your work identity.

Verify:

```bash
node --version
pac --version
git --version
```

:::tip Pin the CLI version
The workflows install a fixed Power Platform CLI version. When you change it, change it in both places on the same commit, so a build never uses a CLI version that no developer has run locally.
:::

## Step 2: create or clone the repository

One repository holds the site source, the unpacked solution, the automation, and the developer scripts.

**If your team already has a repository for this workload,** clone it and install dependencies:

```bash
git clone <your repository url>
cd <your repository>
npm ci
```

Use `npm ci` rather than `npm install`. It installs exactly the versions in the lockfile, which is what the workflows do.

**If you are starting from an existing Power Pages site and an empty repository,** you do not have those files yet. You build them as you go, and every one of them is reproduced in full in the appendixes. Nothing in this guide asks you to invent a file from scratch.

This is what gets added, and where:

| Artifact | Added in | Source |
|---|---|---|
| Unpacked solution under `solutions/` | [Lab 02](02-environment-strategy.md) | Exported from your integration environment |
| Site source under `.powerpages-site/` | [Lab 02](02-environment-strategy.md) | Downloaded from your integration environment |
| `.gitattributes` | [Lab 03](03-solutions-and-repository.md) | Contents given in the lab |
| Pull request template and `CODEOWNERS` | [Lab 04](04-branching-and-protection.md) | Contents given in the lab |
| `package.json` scripts, `scripts/*.mjs`, `.githooks/pre-push` | [Lab 05](05-inner-loop.md) | [Appendix B](appendix-b-scripts.md) |
| `pr-validation.yml`, `dependabot.yml` | [Lab 06](06-pull-request-gates.md) | [Appendix A](appendix-a-workflows.md) |
| `ci-build.yml`, `cd-release.yml`, `promote-solution` action | [Lab 07](07-release-and-promote.md) | [Appendix A](appendix-a-workflows.md) |

:::note The npm commands arrive in Lab 05
Until you add `package.json` in [Lab 05](05-inner-loop.md), commands such as `npm run build` and `npm run sync:solution` do not exist yet. Labs 02 through 04 use `pac` and `git` directly, and every command they need is given in full.
:::

## Step 3: register the service principal

The workflows authenticate as an application, never as a person. A named user account would tie your release pipeline to one employee's credentials, licence, and multifactor prompts.

1. Register an application in Microsoft Entra ID.
2. Create a client secret and record its value once. It cannot be read again.
3. Record the application (client) ID and the directory (tenant) ID.
4. In each Power Platform environment the pipeline touches, add the application as an application user and grant it the System Administrator security role.

The last point is the one most often missed. A service principal that exists in Entra ID but is not an application user in the target environment authenticates successfully and then fails on import with a permission error.

## Step 4: create the GitHub environments

Create three GitHub environments named `dev`, `qa`, and `prod`. Create them before you store any credentials, because the secrets and variables below are scoped to an environment rather than to the repository.

That scoping is what lets one workflow target a different Power Platform environment depending on which environment the job declares, with no branching logic and no way for a job to reach a stage it did not ask for.

:::note Agree one name for pre-production
The diagrams in this guide label the pre-production environment *test*; the automation names it *qa*. They are the same role. Agree one name across Power Platform environments, GitHub environments, and your documentation before you build the pipeline, or you will spend the rest of the project translating.
:::

## Step 5: store the secrets

Store the service principal credentials as **environment** secrets on each of `dev`, `qa`, and `prod`, so no credential ever lives in the repository.

| Secret | Value |
|---|---|
| `PP_CLIENT_ID` | The application (client) ID of the service principal |
| `PP_CLIENT_SECRET` | The client secret value |
| `PP_TENANT_ID` | The directory (tenant) ID |

![GitHub Actions secrets and variables settings page, Secrets tab, listing environment secrets PP_CLIENT_ID, PP_CLIENT_SECRET, and PP_TENANT_ID scoped to the qa, dev, and prod environments, with no repository-level secrets.](/img/reliable-alm/actions-secrets.png)

*Actions secrets. Each credential is stored per environment rather than at repository level, and the repository itself holds no secrets at all. Add the `prod` credentials only when you are ready to let the pipeline reach production.*

## Step 6: store the variables

Non-secret configuration goes in Actions variables. Changing a value here retargets the pipeline without editing a workflow file.

| Variable | Scope | Required | Value |
|---|---|---|---|
| `PP_ENVIRONMENT_URL` | Environment | Yes | The Dataverse URL for that environment |
| `PP_SITE_URL` | Environment | No | The public URL of the Power Pages site |
| `PROD_AUTO_PROMOTE` | Repository | No | Leave unset until required reviewers exist on `prod`. See [Lab 07](07-release-and-promote.md). |

![GitHub Actions secrets and variables settings page, Variables tab, showing PP_ENVIRONMENT_URL defined once for each of the qa, dev, and prod environments, and no repository variables.](/img/reliable-alm/actions-variables.png)

*Actions variables. Only `PP_ENVIRONMENT_URL` is needed to start, defined once per environment. The other two are deliberately absent here, which is a valid starting state.*

:::note `PP_SITE_URL` is optional on purpose
A site arrives inactive the first time it is imported, so it has no public URL yet. When the variable is unset the promotion step logs a warning and skips deployment verification and smoke tests rather than failing. Set it per environment once the site has been activated and has a URL, and the checks start running on the next promotion.
:::

## Step 7: assign owners

Capture owners before configuration begins. Every row is someone who gets called when that thing breaks.

| Area | Owner |
|---|---|
| Integration environment |  |
| Test environment |  |
| Production environment |  |
| GitHub repository and branch rules |  |
| Solution publisher and solution strategy |  |
| Service principal and secret rotation |  |
| Workflow and automation changes |  |
| Production release decision |  |
| Emergency recovery |  |

## Checkpoint

You are ready for Lab 01 when:

- [ ] Node.js 22, the Power Platform CLI, and Git work locally.
- [ ] The repository exists, and you know which lab adds which file to it.
- [ ] The service principal exists and is an application user with System Administrator in every target environment.
- [ ] The `dev`, `qa`, and `prod` GitHub environments exist.
- [ ] `PP_CLIENT_ID`, `PP_CLIENT_SECRET`, and `PP_TENANT_ID` are stored as environment secrets, not repository secrets.
- [ ] `PP_ENVIRONMENT_URL` is set on each environment.
- [ ] You know that `PP_SITE_URL` and `PROD_AUTO_PROMOTE` are deliberately unset for now.
- [ ] Owners are captured.

## Troubleshooting

| Problem | Fix |
|---|---|
| `pac` is not recognized | Reopen the terminal after install, or add the CLI to `PATH` |
| The site cannot be added to a solution | Confirm the site uses the enhanced data model |
| Import fails with a permission error although auth succeeded | Add the service principal as an application user in that environment and grant it System Administrator |
| The client secret was not recorded | Create a new secret. Existing values cannot be read again. |
| A workflow reads an empty variable | Confirm the variable is set on the GitHub environment the job declares. A repository-level value does not apply to an environment-scoped lookup. |
| The promotion log warns that smoke tests were skipped | `PP_SITE_URL` is not set on that environment. Expected before the site is activated; set it afterwards. |

## Next step

Continue to [Lab 01: Design the ALM blueprint](01-design-alm-blueprint.md).

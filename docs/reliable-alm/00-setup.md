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

## Step 2: clone the repository and install dependencies

```bash
git clone <your repository url>
cd <your repository>
npm ci
```

Use `npm ci` rather than `npm install`. It installs exactly the versions in the lockfile, which is what the workflows do.

## Step 3: enable the pre-push hook

The repository ships a hook that blocks a push whose committed solution is out of date with what the source builds. Git does not enable hooks from a repository automatically, so each developer runs this once:

```bash
git config core.hooksPath .githooks
```

The hook source is in [Appendix B.2](appendix-b-scripts.md#b2-pre-push). You configure what it checks in [Lab 05](05-inner-loop.md).

## Step 4: register the service principal

The workflows authenticate as an application, never as a person. A named user account would tie your release pipeline to one employee's credentials, licence, and multifactor prompts.

1. Register an application in Microsoft Entra ID.
2. Create a client secret and record its value once. It cannot be read again.
3. Record the application (client) ID and the directory (tenant) ID.
4. In each Power Platform environment the pipeline touches, add the application as an application user and grant it the System Administrator security role.

Step 4 is the one most often missed. A service principal that exists in Entra ID but is not an application user in the target environment authenticates successfully and then fails on import with a permission error.

## Step 5: create the GitHub environments

Create three GitHub environments named `dev`, `qa`, and `prod`. Create them before you store any credentials, because the secrets and variables below are scoped to an environment rather than to the repository.

That scoping is what lets one workflow target a different Power Platform environment depending on which environment the job declares, with no branching logic and no way for a job to reach a stage it did not ask for.

:::note Agree one name for pre-production
The diagrams in this guide label the pre-production environment *test*; the automation names it *qa*. They are the same role. Agree one name across Power Platform environments, GitHub environments, and your documentation before you build the pipeline, or you will spend the rest of the project translating.
:::

## Step 6: store the secrets

Store the service principal credentials as **environment** secrets on each of `dev`, `qa`, and `prod`, so no credential ever lives in the repository.

| Secret | Value |
|---|---|
| `PP_CLIENT_ID` | The application (client) ID of the service principal |
| `PP_CLIENT_SECRET` | The client secret value |
| `PP_TENANT_ID` | The directory (tenant) ID |

![GitHub Actions secrets and variables settings page, Secrets tab, listing environment secrets PP_CLIENT_ID, PP_CLIENT_SECRET, and PP_TENANT_ID scoped to the qa, dev, and prod environments, with no repository-level secrets.](/img/reliable-alm/actions-secrets.png)

*Actions secrets. Each credential is stored per environment rather than at repository level, and the repository itself holds no secrets at all. Add the `prod` credentials only when you are ready to let the pipeline reach production.*

## Step 7: store the variables

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

## Step 8: assign owners

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
| Production approval |  |
| Emergency recovery |  |

## Checkpoint

You are ready for Lab 01 when:

- [ ] Node.js 22, the Power Platform CLI, and Git work locally.
- [ ] The repository is cloned and `npm ci` succeeds.
- [ ] `core.hooksPath` points at `.githooks`.
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

---
sidebar_position: 4
sidebar_label: "Lab 12: CI/CD with GitHub Actions"
title: "Lab 12: CI/CD with GitHub Actions"
---

# Lab 12: CI/CD with GitHub Actions

## What You Will Build

A GitHub Actions workflow that, on every merge to `main`, packs your unpacked solution and imports it to the integration env, builds the SPA, and uploads the bundle — all authenticated as a service principal. The same workflow shape (with different variables) deploys to pre-prod and prod via the Pipelines flow in Lab 13.

## Prerequisites

- Completed [Lab 09: Source Control](./09-source-control.md), [Lab 10: Solution and Dependencies](./10-solution-and-dependencies.md), [Lab 11: Branching and Workflows](./11-branching-and-workflows.md) (Git repo, unpacked solution committed, workflows understood)
- Tenant admin access (or willingness to ask your admin) to create a Microsoft Entra ID app registration
- Your "integration" environment for this exercise is your existing Power Platform env — we're reframing it for the workflow

## Learning Objectives

By the end of this lab you will be able to:

1. Create a service principal app registration and authenticate PAC CLI with it (the identity CI uses)
2. Configure a GitHub Actions workflow that packs your unpacked solution, imports it to the integration env, and uploads the SPA bundle using the official `upload-paportal` action
3. Explain how environment variables for site settings (set up in Lab 10) flow through the workflow without any extra plumbing in CI
4. Recognize the equivalent flow in Azure DevOps using the Power Platform Build Tools

---

## The Two Artifacts CI Deploys

Every push to `main` deploys **two artifacts** from the same repo:

| Artifact | Source | Build step | Deploy step |
|---|---|---|---|
| **Dataverse solution** | `src/solution/` (committed XML) | `pack-solution` action → `build/SupplierPortal.zip` | `import-solution` action into the integration env |
| **SPA bundle** | `src/` (TypeScript / React) | `npm run build` → `dist/` | `upload-paportal` action with `model-version: 2` to the integration env |

Order matters: the solution must import **first** (so the data model is in place when the SPA boots and queries it). The SPA upload runs second. Env-specific site setting values flow through the solution import via environment variables (set up in Lab 10) -- the workflow itself is the same shape for every environment.

---

## Step 1: Create a Service Principal

CI cannot use your personal `pac auth create --environment <url>` -- that uses interactive sign-in. Instead, CI authenticates as a **service principal** (an app identity in Microsoft Entra ID).

### 1a. Register the App in Microsoft Entra ID

You can do this in the Azure portal (Microsoft Entra ID > App registrations > New registration) or with the Azure CLI:

```bash
az ad app create --display-name "supplier-portal-cicd"
```

Record the resulting `appId` (client ID).

> **No Azure subscription?** `az ad app create` and `az ad app credential reset` are Microsoft Graph (AAD-only) operations -- they don't need an Azure subscription. If your Microsoft account has no subscription attached, sign in once with `az login --allow-no-subscriptions` (the flag belongs on `az login` only). After that, the `az ad ...` commands below run normally -- you do not pass the flag again.

### 1b. Create a Client Secret

In the Azure portal: open the app registration → Certificates & secrets → New client secret. **Copy the secret value immediately** -- it won't show again.

Or via CLI:

```bash
az ad app credential reset --id <appId> --append
```

Record the `password` (client secret).

### 1c. Create the Application User in Power Platform

A service principal needs an "Application user" inside your Power Platform environment, with a security role:

1. Open the Power Platform Admin Center (https://admin.powerplatform.microsoft.com)
2. Select your integration environment → **Settings** → **Users + permissions** → **Application users**
3. **+ New app user** → search for the app by client ID
4. Add the **System Administrator** role (or **System Customizer** + **Deployment Pipeline User** for least-privilege; this lab uses System Administrator to keep the focus on the deployment flow -- scope down once your pipeline is stable)
5. Create

### 1d. Verify with PAC CLI

Locally, test that the service principal can authenticate:

```bash
pac auth create --tenant <your-tenant-id> --applicationId <appId> --clientSecret <client-secret>
pac org who
```

You should see the integration env's name and URL.

---

## Step 2: Env-Specific Values -- Already Handled by Environment Variables

Before we wire the workflow, a quick refresher on how env-specific values reach each environment.

You did the work in Lab 10: `Search/Enabled` is wired to the `cr_searchenabled` environment variable, and the variable definition is part of the solution. That means:

- The **integration env** uses whatever value you set on the `cr_searchenabled` variable in that env (or the default value from the variable definition)
- When Lab 13 promotes the solution to **pre-prod** via Power Platform Pipelines, the operator is prompted to set the pre-prod value -- the variable definition crosses environments, the value does not
- Same flow for **prod**

There is **no extra step in the GitHub Actions workflow** to apply env-specific site setting values. They flow with the solution.

Further reading: [Use environment variables with site settings](https://learn.microsoft.com/power-pages/configure/environment-variables-for-site-settings)

---

## Step 3: Store CI Configuration in GitHub Actions

Two GitHub Actions storage primitives, used differently:

- **Secrets** (`gh secret set`) -- masked in logs, only one we need is `CLIENT_SECRET`
- **Variables** (`gh variable set`) -- visible in logs, fine for identifiers like tenant ID, app ID, env URL

This split keeps the workflow YAML reusable across cohorts and orgs without editing inline.

```bash
gh secret set CLIENT_SECRET --body "<your-client-secret>"

gh variable set INSTANCE_URL --body "https://your-integration-env.crm.dynamics.com"
gh variable set APPLICATION_CLIENT_ID --body "<your-service-principal-app-id>"
gh variable set TENANT_ID --body "<your-tenant-id>"
gh variable set SITE_NAME --body "Supplier Portal"
```

Verify:

```bash
gh secret list
gh variable list
```

You should see `CLIENT_SECRET` in secrets and the four config keys in variables. Secret values can't be recovered after setting -- rotate via `gh secret set` if forgotten.

> **Org-managed scenarios:** if your org centrally manages SP credentials, the secret and variables can live at the organization level (`gh secret set <NAME> --org <YOUR-ORG>` / `gh variable set <NAME> --org <YOUR-ORG>`) and inherit into all repos. The workflow YAML doesn't change; `${{ secrets.X }}` and `${{ vars.X }}` resolve org-level values automatically.

---

## Step 4: Path A -- GitHub Actions (recommended)

GitHub Actions is the recommended path because the repo already lives on GitHub.

### 4a. Create the Workflow File

In your repo:

```bash
mkdir -p .github/workflows
```

Create `.github/workflows/deploy-integration.yml`:

```yaml
name: Deploy to Integration

on:
  workflow_dispatch:    # manual trigger from the GitHub Actions UI
  push:
    branches:
      - main
      - 'hotfix/**'
  schedule:
    - cron: '0 0 * * *'  # nightly at 00:00 UTC -- catches drift from manual dev-env edits

jobs:
  deploy:
    runs-on: windows-latest

    steps:
      - name: Checkout repo
        uses: actions/checkout@v4

      # ---- Power Platform tools ----
      # Docs: https://github.com/marketplace/actions/powerplatform-actions
      - name: Install Power Platform tools
        uses: microsoft/powerplatform-actions/actions-install@v1

      - name: Who am I (verification)
        uses: microsoft/powerplatform-actions/who-am-i@v1
        with:
          environment-url: ${{ vars.INSTANCE_URL }}
          app-id: ${{ vars.APPLICATION_CLIENT_ID }}
          client-secret: ${{ secrets.CLIENT_SECRET }}
          tenant-id: ${{ vars.TENANT_ID }}

      # ---- Artifact 1: Dataverse solution ----
      - name: Pack solution
        uses: microsoft/powerplatform-actions/pack-solution@v1
        with:
          solution-folder: src/solution
          solution-file: build/SupplierPortal.zip
          solution-type: Unmanaged

      - name: Import solution
        uses: microsoft/powerplatform-actions/import-solution@v1
        with:
          environment-url: ${{ vars.INSTANCE_URL }}
          app-id: ${{ vars.APPLICATION_CLIENT_ID }}
          client-secret: ${{ secrets.CLIENT_SECRET }}
          tenant-id: ${{ vars.TENANT_ID }}
          solution-file: build/SupplierPortal.zip
          force-overwrite: true
          publish-changes: true

      # ---- Artifact 2: SPA bundle ----
      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build SPA
        run: npm run build

      - name: Upload SPA site
        uses: microsoft/powerplatform-actions/upload-paportal@v1
        with:
          environment-url: ${{ vars.INSTANCE_URL }}
          app-id: ${{ vars.APPLICATION_CLIENT_ID }}
          client-secret: ${{ secrets.CLIENT_SECRET }}
          tenant-id: ${{ vars.TENANT_ID }}
          upload-path: .
          model-version: 2
```

### 4b. What This Workflow Does Differently

A few choices worth calling out -- they're the difference between a workflow that barely works and one a team can live with:

- **`workflow_dispatch`** lets you re-run the deploy from the GitHub Actions UI without committing anything. Handy for forcing a deploy after a manual fix in dev.
- **`schedule: cron: '0 0 * * *'`** runs the deploy nightly. Catches drift if anyone touched the dev env outside the normal flow.
- **`vars.*` for non-secret IDs, `secrets.*` for the client secret** -- tenant ID, app ID, and environment URL are identifiers, not secrets. Storing them as GitHub Actions *variables* (not secrets) keeps the workflow YAML reusable across orgs without editing inline.
- **`upload-paportal` with `model-version: 2`** -- the official Microsoft action for uploading portal/SPA content. `model-version: 2` is the [enhanced data model](https://learn.microsoft.com/power-pages/admin/enhanced-data-model) that SPA sites use. Prefer this over a raw `pac` invocation in CI.
- **Env-specific site setting values flow with the solution** -- the environment variables you wired in Lab 10 carry the variable definitions; each target env supplies its own value at import time. No extra workflow plumbing needed.
- **`runs-on: windows-latest`** -- the Power Platform actions are tested most heavily on Windows. Linux runners often work but Windows is the safer default for this stack.

Further reading: [GitHub Actions for Power Platform](https://learn.microsoft.com/power-platform/alm/devops-github-actions), [Available actions reference](https://learn.microsoft.com/power-platform/alm/devops-github-available-actions), [`pac pages` reference](https://learn.microsoft.com/power-platform/developer/cli/reference/pages)

> **Verifying action inputs:** the Learn reference covers `upload-paportal`, `import-solution`, `unpack-solution`, and a few others in detail. For inputs not explicitly listed there (for example, `pack-solution`'s `solution-folder`/`solution-file`/`solution-type`, or `import-solution`'s `force-overwrite`/`publish-changes`), the source of truth is the action's own `action.yml` in [microsoft/powerplatform-actions](https://github.com/microsoft/powerplatform-actions). Inputs there mirror the corresponding `pac` switches.

### 4c. Commit, Push, Watch It Run

The workflow reads everything from GitHub Actions secrets and variables you set in Step 3 -- no inline edits needed.

```bash
git add .github/workflows/deploy-integration.yml
git commit -m "Add CI workflow for integration env deploy"
git push
```

Open the GitHub Actions tab (`gh workflow view` or browser). Watch the run. When green:

1. Confirm the integration env shows the latest solution version (maker portal → Solutions → Supplier Portal → Version)
2. Confirm the live portal URL serves the latest bundle (cache-bust the page)
3. Confirm the `Search/Enabled` site setting resolves to the value you set for the integration env's `cr_searchenabled` environment variable -- this is the env-variable wiring from Lab 10 working

### 4d. Test the End-to-End Loop

Make a tiny change to the dashboard heading in a feature branch, open a PR, merge it. Watch the workflow deploy both artifacts. The change should be live in the integration env within 3-5 minutes of the merge.

Then trigger a manual run from the GitHub Actions UI (Actions tab → "Deploy to Integration" → "Run workflow"). Confirm `workflow_dispatch` works -- you'll need this when promoting a hotfix outside normal CI flow.

---

## Step 5: Path B -- Azure DevOps (reference)

If your team is on Azure DevOps instead of GitHub, the same flow uses the **PowerPlatform Build Tools** extension (`microsoft-IsvExpTools.PowerPlatform-BuildTools`).

Pipeline YAML skeleton (illustrative):

```yaml
trigger:
  branches:
    include:
      - main
      - hotfix/*

schedules:
  - cron: '0 0 * * *'
    displayName: Nightly deploy
    branches:
      include:
        - main

pool:
  vmImage: windows-latest

variables:
  INSTANCE_URL: https://your-integration-env.crm.dynamics.com
  SITE_NAME: Supplier Portal

steps:
  - task: PowerPlatformToolInstaller@2
    inputs:
      DefaultVersion: true

  - task: PowerPlatformWhoAmI@2
    inputs:
      authenticationType: PowerPlatformSPN
      PowerPlatformSPN: $(PP_SP_CONNECTION)   # service connection in Project Settings

  - task: PowerPlatformPackSolution@2
    inputs:
      SolutionSourceFolder: src/solution
      SolutionOutputFile: $(Build.ArtifactStagingDirectory)/SupplierPortal.zip
      SolutionType: Unmanaged

  - task: PowerPlatformImportSolution@2
    inputs:
      authenticationType: PowerPlatformSPN
      PowerPlatformSPN: $(PP_SP_CONNECTION)
      SolutionInputFile: $(Build.ArtifactStagingDirectory)/SupplierPortal.zip
      ForceOverwrite: true
      PublishWorkflows: true

  - task: NodeTool@0
    inputs:
      versionSpec: '20.x'

  - script: |
      npm ci
      npm run build
    displayName: Build SPA

  - task: PowerPlatformUploadPaportal@2
    inputs:
      authenticationType: PowerPlatformSPN
      PowerPlatformSPN: $(PP_SP_CONNECTION)
      UploadPath: .
      ModelVersion: 2
```

Key differences from GitHub Actions:

- A **service connection** (`PP_SP_CONNECTION`) wraps the SPN credentials, defined once under Project Settings → Service connections → Power Platform
- `PowerPlatformToolInstaller` plays the same role as `actions-install`
- `PowerPlatformUploadPaportal@2` is the equivalent of the `upload-paportal` action -- same `ModelVersion: 2` for SPA sites

Further reading: [Azure DevOps build tools](https://learn.microsoft.com/power-platform/alm/devops-build-tools), [Build tool tasks reference](https://learn.microsoft.com/power-platform/alm/devops-build-tool-tasks#power-pages-management-tasks)

---

## Verification

You have completed this lab when:

- [ ] A Microsoft Entra ID app registration exists with a client secret stored securely
- [ ] The app registration is added as an Application User in your integration environment with a security role sufficient to import solutions
- [ ] GitHub Actions secrets/variables are configured: secret `CLIENT_SECRET`; variables `INSTANCE_URL`, `APPLICATION_CLIENT_ID`, `TENANT_ID`, `SITE_NAME`
- [ ] A `.github/workflows/deploy-integration.yml` workflow file is committed in `main`
- [ ] A push to `main` (or a `workflow_dispatch` run) completes with green steps for `who-am-i`, `import-solution`, and `upload-paportal`
- [ ] The integration environment now reflects the latest committed solution and SPA content -- verified by browsing the site or running `pac pages list` against the env

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `who-am-i` step fails with 401 | The application user wasn't added in Step 1c, or wrong tenant ID variable. Verify in the Power Platform admin center. |
| `import-solution` fails with `0x80048d18` or "insufficient privileges" | The application user's security role isn't enough. System Customizer alone often is not. Grant **System Administrator** while you stabilize the pipeline; in production, scope down to System Customizer + the right Power Pages roles after testing. |
| `import-solution` fails with "missing dependency" | The committed `src/solution/` is missing a Dataverse component you added in dev. Re-export, re-unpack, commit. |
| `upload-paportal` fails with "site not found" | The site name from your source doesn't match what the site is actually called in the env. Run `pac pages list` against the env to see the exact name. |
| Site setting value not surfacing after env variable change | Clear the site cache: in design studio select **Sync**; or sign in to the portal, browse to `/_services/about`, select **Clear cache**; or restart the portal from the admin center. |
| Workflow runs on every push including feature branches | Trigger spec is wrong. Confirm `branches: [main, 'hotfix/**']` only -- no `*` wildcard at top. |
| Secret value is empty in the run logs | Looks empty by design -- GitHub masks secrets. The actual value is being passed; "empty" output is normal. |
| `model-version` mismatch error | Your site uses the standard data model but you set `model-version: 2` (or vice versa). Run `pac pages list -v` to see which model your site uses. SPA sites should be on `model-version: 2` (enhanced data model). |

---

## Key Takeaways

- A service principal is the identity CI uses; create the app registration, the client secret, and the application user in Power Platform once
- Env-specific site setting values flow with the solution via **environment variables** (set up in Lab 10) -- no extra workflow plumbing needed
- The CI pipeline deploys two artifacts in order: solution first, SPA second
- `microsoft/powerplatform-actions/upload-paportal@v1` with `model-version: 2` is the official action for uploading SPA content; you don't need a script step
- Non-secret values (tenant ID, app ID, env URL) belong in GitHub Actions *variables* (`vars.*`), not secrets -- treating identifiers as secrets is unnecessary friction and the workflow YAML stays reusable
- Azure DevOps Build Tools provides equivalent tasks (`PowerPlatformUploadPaportal@2` with `ModelVersion: 2`) if your repo lives there instead

## What's Next

→ [Lab 13: Multi-Environment Promotion](./13-multi-env-promotion.md)

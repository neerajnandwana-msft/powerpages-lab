---
sidebar_position: 1
sidebar_label: "Setup Guide"
title: "Setup Guide"
---

# Setup Guide

This guide walks you through everything you need to install and configure before [Lab 01: Scaffold an SPA Portal](build/01-scaffold-spa-portal.md). Plan to work through it once before starting the lab track — installs, authentication, and any tenant-admin asks all happen here.

**What you will build across the labs:** A multi-page React SPA portal connected to Microsoft Dataverse with authentication, role-based security, and live Web API integration — all generated using AI coding tools, then deployed through a real production ALM pipeline.

**What you will be using:** The Power Pages plugin for your AI coding CLI creates **single-page application (SPA) sites in Power Pages** — a modern site type where your React/Angular/Vue/Astro code runs in the browser and talks directly to the Dataverse data model through the Power Pages Web API. This is different from traditional Power Pages (Liquid) sites, and the plugin handles the full stack for you: SPA front-end, Dataverse tables, table permissions, web roles, server logic, cloud flows, and AI features. Read more: [Create and deploy a single-page application in Power Pages](https://learn.microsoft.com/power-pages/configure/create-code-sites) · [Power Pages plugin for GitHub Copilot CLI and Claude Code (preview)](https://learn.microsoft.com/power-pages/configure/create-code-site-using-claude-code).

**What you need:** Laptop with admin access, charger, and AI coding tools with a license (GitHub Copilot CLI and/or Claude Code CLI).

---

## Step 1: confirm your Dataverse environment

Every lab depends on a Dataverse environment. You must have one provisioned before moving on to the remaining steps. If you don't have one yet, contact your tenant admin right away.

> **No environment? Create a free trial.** If you don't have access to a provisioned environment, you can sign up for a Power Pages trial (includes a Dataverse database) by following the official guide: [Sign up for a Power Pages trial](https://learn.microsoft.com/en-us/power-pages/getting-started/trial-signup). This gives you a fully functional environment for the lab track.

1. Go to [https://admin.powerplatform.microsoft.com/](https://admin.powerplatform.microsoft.com/)
2. Confirm you can see your environment in the list
3. Verify the environment has a **Dataverse database** — if it shows "No database", ask your admin to add one
4. Verify you have the **System Administrator** role on the environment:
    - Select your environment
    - Select **Settings** > **Users + permissions** > **Users**
    - Find your name and confirm **System Administrator** is listed under your security roles  

> **Important:** You must have the **System Administrator** role on the environment. The labs create tables, configure security roles, set up table permissions, and deploy sites — all of which require System Administrator privileges. Lower-privilege roles (Environment Maker, System Customizer) will block you partway through the track. If you created a trial environment via the trial signup link, you are automatically granted System Administrator on it.

**Verify you can create a site in the environment:**

1. Go to [https://make.powerpages.microsoft.com/](https://make.powerpages.microsoft.com/)
2. Confirm the environment selector (top-right) shows your target environment
3. Select **+ Create a site**
4. Confirm the site creation dialog opens and site templates load without errors

If the **Create a site** button is missing, disabled, or the dialog fails to load, your environment is not correctly configured for Power Pages. You don't need to create a site — reaching the creation screen is enough. Close the dialog once verified.

If you cannot see the environment, it does not have a Dataverse database, you lack the System Administrator role, or you cannot reach the site creation screen, contact your tenant admin to resolve before starting Lab 01.

---

## Step 2: install required software

Install each tool below. After installing, run the verification command to confirm it is working.

### 2.1 Node.js (v18 or later)

Node.js runs the development server and builds the React project.

- **Download:** [https://nodejs.org/](https://nodejs.org/) (use the LTS version)
- **Install:** Run the installer, accept defaults, ensure "Add to PATH" is checked
- **Verify:**

```Shell
node --version
```

**Expected output:** `v18.x.x` or higher (e.g., `v20.11.0`)

### 2.2 git

Git is used by Claude Code and GitHub Copilot CLI for milestone commits during site generation.

- **Download:** [https://git-scm.com/downloads](https://git-scm.com/downloads)
- **Install:** Run the installer, accept defaults
- **Verify:**

```Shell
git --version
```

**Expected output:** `git version 2.x.x` or higher

### 2.3 Power Platform CLI (PAC CLI) — v2.6.3 or later

PAC CLI deploys your site to Power Pages and manages Dataverse connections. Version 2.6.3 or later is required for server logic support (used in Lab 05).

- **Install:**

```Shell
dotnet tool install --global Microsoft.PowerApps.CLI.Tool
```

If you don't have .NET SDK, download it first from [https://dotnet.microsoft.com/download](https://dotnet.microsoft.com/download)

- **Update (if already installed):**

```Shell
dotnet tool update --global Microsoft.PowerApps.CLI.Tool
```

- **Verify:**

```Shell
pac help
```

**Expected output:** PAC CLI help text listing available commands, with the version shown in the header (e.g., `Microsoft PowerPlatform CLI 2.6.3+...`). Confirm the version is `2.6.3` or higher. If the version is lower, run the update command above.

> **Important:** Even if you already have PAC CLI installed, make sure you're on **version 2.6.3 or later**. Server logic support was added recently and requires this version. Lab 05 uses server logic, so an older version will block you. Run the update command above to get the latest.

### 2.4 Azure CLI

Azure CLI authenticates your session with the Microsoft Entra ID tenant that hosts your Power Platform environment.

> **Why this matters:** Your AI coding CLI (Claude Code or GitHub Copilot CLI) uses `az` to obtain Microsoft Entra ID access tokens when running plugin skills that call Dataverse, Power Platform, and Power Automate APIs. Skills that depend on this include `/setup-datamodel`, `/add-sample-data`, `/add-cloud-flow`, and `/add-ai-webapi`, among others. Without a working `az` install and an active `az login` session, these skills will fail with auth errors. **Installing Azure CLI is required**; you will run `az login` once before starting Lab 01.

> **No Azure subscription? You're still fine.** The Power Pages plugin only needs **AAD-scoped tokens** for Dataverse and Power Platform endpoints — it does *not* require an Azure subscription. If your Microsoft account has no Azure subscription attached, sign in with `az login --allow-no-subscriptions`. The flag belongs on `az login` only — per the [Azure CLI reference](https://learn.microsoft.com/cli/azure/reference-index#az-login), it tells the CLI to "support accessing tenants without subscriptions" so tenant-level commands like `az ad ...` still work. Once you've signed in this way, follow-up commands (`az account show`, `az ad app create`, plugin skills) run normally — you do not pass the flag again.

- **Download:** [https://learn.microsoft.com/cli/azure/install-azure-cli](https://learn.microsoft.com/cli/azure/install-azure-cli)
- **Install:** Run the installer, restart your terminal after installation
- **Verify:**

```Shell
az --version
```

**Expected output:** `azure-cli` version number and component list

### 2.5 AI coding tool — GitHub Copilot CLI or Claude Code CLI

You need at least one of the following AI coding tools. Both are fully supported in this lab track — pick the one you have a license for, or install both.

**Option A: GitHub Copilot CLI**

Requires an active GitHub Copilot subscription and Node.js 22+ (for the npm install method).

- **Install (npm):**

```Shell
npm install -g @github/copilot
```

Other install methods (Homebrew, WinGet, install script) are listed at [https://docs.github.com/en/copilot/how-tos/copilot-cli/set-up-copilot-cli/install-copilot-cli](https://docs.github.com/en/copilot/how-tos/copilot-cli/set-up-copilot-cli/install-copilot-cli)

- **Verify:**

```Shell
copilot -h
```

**Expected output:** Copilot CLI help text with available commands

**Option B: Claude Code CLI**

- **Install:** Follow instructions at [https://claude.ai/code](https://claude.ai/code)
- **Verify:**

```Shell
claude --version
```

**Expected output:** Claude Code version number

### 2.6 GitHub CLI — `gh` (required for the ALM labs)

The ALM labs (09-13) cover source control, branching, and CI/CD. The `gh` command-line tool lets you create the GitHub repo, manage pull requests, and configure secrets for GitHub Actions without leaving the terminal.

- **Download:** [https://cli.github.com/](https://cli.github.com/) (or `winget install GitHub.cli` on Windows, `brew install gh` on macOS)
- **Install:** Run the installer, restart your terminal
- **Verify:**

```Shell
gh --version
```

**Expected output:** `gh version 2.x.x` or higher

**Authenticate:**

```Shell
gh auth login
```

Choose **GitHub.com**, **HTTPS**, **Login with a web browser**, and complete the flow. After it finishes, verify:

```Shell
gh auth status
```

**Expected output:** A line confirming you're logged in as your GitHub username.

> **Don't have a GitHub account?** Sign up at [https://github.com/signup](https://github.com/signup) before starting the ALM labs. A free personal account is sufficient for everything the labs cover.

> **Note about Azure DevOps:** Lab 12 also shows the equivalent flow for Azure DevOps as a reference for teams on that platform. You do **not** need an ADO account or its CLI installed — the GitHub Actions path is the primary hands-on path. If your team uses ADO and you want to follow along on your own infrastructure, install the [Power Platform Build Tools extension](https://marketplace.visualstudio.com/items?itemName=microsoft-IsvExpTools.PowerPlatform-BuildTools) on your ADO organization separately.

> **Note about service principals:** Lab 12 walks you through creating a Microsoft Entra ID app registration and a service principal during the lab. **You do not need to create one ahead of time.** All you need on your laptop is `az` (you already have it from Step 2.4) and the tenant admin permission — or willingness to ask your admin — to create the app registration during the lab.

---

## Step 3: install the Power Pages plugin

The Power Pages plugin provides AI-assisted skills for creating, deploying, and configuring Power Pages sites. Run the quick installer to set up all plugins with autoupdate enabled.

**Windows (PowerShell):**

```Powershell
iwr https://raw.githubusercontent.com/microsoft/power-platform-skills/main/scripts/install.js -OutFile install.js; node install.js; del install.js
```

**macOS / Linux / Windows (cmd):**

```Shell
curl -fsSL https://raw.githubusercontent.com/microsoft/power-platform-skills/main/scripts/install.js | node
```

The installer automatically:

- Checks for PAC CLI and installs it if it's missing (skipped if you already installed it in Step 2.3)
- Detects available tools (GitHub Copilot CLI, Claude Code CLI)
- Registers the plugin marketplace and installs all listed plugins
- Enables autoupdate so plugins stay current

After installation, restart GitHub Copilot CLI or Claude Code CLI to access the plugin's skills as slash commands in your agent session.

For more on what the plugin provides and how to keep it current, see [Power Pages plugin for GitHub Copilot CLI and Claude Code (preview)](https://learn.microsoft.com/en-us/power-pages/configure/create-code-site-using-claude-code).

---

## Step 4: authenticate PAC CLI

Connect PAC CLI to your Power Platform environment:

```Shell
pac auth create --environment <your-instance-url>
```

**How to find your instance URL:**

1. Go to [https://make.powerpages.microsoft.com/](https://make.powerpages.microsoft.com/)
2. Select the Settings icon (gear) in the upper-right corner
3. Select Session details
4. Copy the Instance url value

**Verify:**

```Shell
pac auth list
```

**Expected output:** A table showing your authenticated profile with "Active" status.

**Verify environment connection:**

```Shell
pac org who
```

**Expected output:** Your environment name, URL, and organization details.

> **Note:** Run `az login` before starting Lab 01 if you haven't already. The AI agent uses the `az` token to reach Dataverse, Power Platform, and Flow APIs — without it, most plugin skills will fail. If your Microsoft account has no Azure subscription, run `az login --allow-no-subscriptions` instead — the flag is set once at login and downstream `az` commands work normally afterward.

---

## Step 5: run the complete verification checklist

Open a terminal and run each command. All should succeed before starting Lab 01.

```Shell
node --version          # Expect: v18.x.x or higher
git --version           # Expect: git version 2.x.x
pac help                # Expect: help text with version 2.6.3 or higher in header (required for server logic + solution unpack)
az --version            # Expect: azure-cli version info
az account show         # Expect: tenantId and user. If "Please run 'az login'", sign in (use 'az login --allow-no-subscriptions' if your account has no Azure subscription)
gh --version            # Expect: gh version 2.x.x or higher (required for the ALM labs)
gh auth status          # Expect: logged in as <your-github-username>
copilot -h              # If using GitHub Copilot CLI
claude --version        # If using Claude Code CLI
pac auth list           # Expect: Active authenticated profile
pac org who             # Expect: Connected environment details
```

If all commands produce the expected output, you are ready for the lab track.

---

## Troubleshooting

| **Problem**                                     | **Solution**                                                                                                                                                                                                                                                                  |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `node` is not recognized                        | Install Node.js from nodejs.org, restart your terminal, verify it was added to PATH                                                                                                                                                                                           |
| `pac` is not recognized                         | Run `dotnet tool install --global Microsoft.PowerApps.CLI.Tool`, restart terminal. If `dotnet` is not found, install .NET SDK first.                                                                                                                                          |
| `pac help` shows version below 2.6.3            | Run `dotnet tool update --global Microsoft.PowerApps.CLI.Tool` to get the latest version. Restart terminal after updating.                                                                                                                                                    |
| `az` is not recognized                          | Install Azure CLI from the install link in Step 2.4, restart terminal                                                                                                                                                                                                                       |
| `az login` says "No subscriptions found" or `az account show` returns empty | Your Microsoft account has no Azure subscription — this is fine. Sign in with `az login --allow-no-subscriptions` (the flag belongs on `az login` only). After login, run `az account show` normally to confirm the tenant context. The Power Pages plugin only needs AAD-scoped tokens for Dataverse and Power Platform, which work without a subscription. |
| `pac auth create` fails                         | Verify the instance URL is correct (not the site URL). Try `pac auth clear` then `pac auth create` again.                                                                                                                                                                     |
| `pac org who` shows wrong environment           | Run `pac auth list` to see all profiles. Switch with `pac auth select --index <N>`.                                                                                                                                                                                           |
| No Power Pages environment visible              | If you don't have access to a provisioned environment, you can sign up for a Power Pages trial (includes a Dataverse database) by following the official guide: [Sign up for a Power Pages trial](https://learn.microsoft.com/en-us/power-pages/getting-started/trial-signup) |
| System Administrator role missing               | Contact your tenant admin to have the System Administrator role assigned to you on the target environment. If using a trial environment (see Step 1), this role is granted automatically.                                                                                     |
| Corporate proxy or firewall blocks installation | Try installing from a network without corporate proxy, or configure proxy settings: `npm config set proxy http://proxy:port` and `az config set core.proxy=http://proxy:port`                                                                                                 |
| Laptop does not have admin rights               | Request temporary admin access from IT, or bring a personal laptop with admin access.                                                                                                                                                                                         |
| `gh` is not recognized                          | Install GitHub CLI from https://cli.github.com/, restart terminal. On Windows you can also use `winget install GitHub.cli`; on macOS `brew install gh`.                                                                                                                       |
| `gh auth login` fails behind a corporate proxy  | Set `HTTPS_PROXY` and `HTTP_PROXY` environment variables before running `gh auth login`, or authenticate from a network without proxy interception.                                                                                                                           |
| No GitHub account                               | Sign up at https://github.com/signup. A free personal account is sufficient for the ALM labs.                                                                                                                                                                                 |

---

## What's next

→ [Lab 01: Scaffold an SPA Portal](build/01-scaffold-spa-portal.md)
---
sidebar_position: 0
sidebar_label: "Build setup"
title: "Build phase setup"
---

# Build phase setup

Complete this section before [Lab 01: Scaffold a Power Pages SPA](01-scaffold-spa-portal.md). It installs and authenticates the tools the Build phase needs, and the same tools carry you through the [Integrate phase](../integrate/00-setup.md) (Labs 04-09). The [ALM phase](../alm/00-setup.md) adds one more tool (GitHub CLI) later. You don't need it yet.

For the staged, cross-phase view of what gets installed when, see the [Setup Guide overview](../setup-guide.md).

**What you need:** Laptop with admin access, charger, and AI coding tools with a license (GitHub Copilot CLI and/or Claude Code CLI).

**What's involved:** five steps: confirm your Dataverse environment, install the tools (Node.js, git, PAC CLI, Azure CLI, an AI coding CLI), install the Power Pages plugin, authenticate, and verify. Plan about 30-45 minutes the first time. If you don't have an environment yet, start the free trial in Step 1 first. It provisions while you install the rest.

---

## Step 1: confirm your Dataverse environment

Every lab depends on a Dataverse environment. You must have one provisioned before moving on to the remaining steps. If you don't have one yet, contact your tenant admin right away.

> **No environment? Create a free trial.** If you don't have access to a provisioned environment, you can sign up for a Power Pages trial (includes a Dataverse database) by following the official guide: [Sign up for a Power Pages trial](https://learn.microsoft.com/power-pages/getting-started/trial-signup). This gives you a fully functional environment for the lab track.

1. Go to [https://admin.powerplatform.microsoft.com/](https://admin.powerplatform.microsoft.com/)
2. Confirm you can see your environment in the list
3. Verify the environment has a **Dataverse database**. If it shows "No database", ask your admin to add one
4. Verify you have the **System Administrator** role on the environment:
    - Select your environment
    - Select **Settings** > **Users + permissions** > **Users**
    - Find your name and confirm **System Administrator** is listed under your security roles  

> **Important:** You must have the **System Administrator** role on the environment. The labs create tables, configure security roles, set up table permissions, and deploy sites, all of which require System Administrator privileges. Lower-privilege roles (Environment Maker, System Customizer) will block you partway through the track. If you created a trial environment via the trial signup link, you are automatically granted System Administrator on it.

**Verify you can create a site in the environment:**

1. Go to [https://make.powerpages.microsoft.com/](https://make.powerpages.microsoft.com/)
2. Confirm the environment selector (top-right) shows your target environment
3. Select **+ Create a site**
4. Confirm the site creation dialog opens and site templates load without errors

If the **Create a site** button is missing, disabled, or the dialog fails to load, your environment is not correctly configured for Power Pages. You don't need to create a site. Reaching the creation screen is enough. Close the dialog once verified.

If you cannot see the environment, it does not have a Dataverse database, you lack the System Administrator role, or you cannot reach the site creation screen, contact your tenant admin to resolve before starting Lab 01.

> **Allow JavaScript file uploads (do this now to avoid a blocked first deploy).** Many Dataverse environments block `.js` uploads by default, which stops an SPA from deploying. The first `pac pages upload-code-site` (Lab 02) fails with *"Import failed: The attachment is either not a valid type or is too large."* Clear it ahead of time: in the [Power Platform admin center](https://admin.powerplatform.microsoft.com/), select **Manage** → **Environments** → your environment → **Settings** → **Product** → **Privacy + Security**, remove `js` from **Blocked Attachments**, and **Save**. See [Allow JavaScript file uploads](https://learn.microsoft.com/power-pages/configure/create-code-sites#allow-javascript-file-uploads).

---

## Step 2: install required software

Install the five tools below, then confirm them all at once in Step 5. You need at least one AI coding CLI (last row); install both if you have licenses for both.

| Tool | Why you need it | Install |
|------|-----------------|---------|
| Node.js (v18 or later) | Runs the dev server and builds the React project | [nodejs.org](https://nodejs.org/) (LTS installer; keep "Add to PATH" checked) |
| git | Used by the AI coding CLI for milestone commits during site generation | [git-scm.com/downloads](https://git-scm.com/downloads) (accept defaults) |
| PAC CLI (v2.6.3 or later) | Deploys your site and manages Dataverse connections | `dotnet tool install --global Microsoft.PowerApps.CLI.Tool` (needs the [.NET SDK](https://dotnet.microsoft.com/download)) |
| Azure CLI | Gets the Microsoft Entra ID tokens your AI coding CLI uses to call Dataverse, Power Platform, and Power Automate APIs | [Install Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli), then restart your terminal |
| AI coding CLI (pick one or both) | Runs the plugin skills as slash commands | **GitHub Copilot CLI:** `npm install -g @github/copilot` (needs Node 22+; [other install methods](https://docs.github.com/en/copilot/how-tos/copilot-cli/set-up-copilot-cli/install-copilot-cli)). **Claude Code CLI:** follow [claude.ai/code](https://claude.ai/code) |

> **PAC CLI must be version 2.6.3 or later.** Server logic (Lab 05) requires it. If you already have PAC CLI, update with `dotnet tool update --global Microsoft.PowerApps.CLI.Tool`.

> **Sign in to Azure once before Lab 01:** run `az login --allow-no-subscriptions`. The flag lets you authenticate whether or not your account has an Azure subscription; the plugin only needs Microsoft Entra ID-scoped tokens, never a subscription ([Azure CLI reference](https://learn.microsoft.com/cli/azure/reference-index#az-login)). Follow-up `az` commands don't need the flag.

---

## Step 3: install the Power Pages plugin

The Power Pages plugin provides AI-assisted skills for creating, deploying, and configuring Power Pages sites. Run the quick installer to set up all plugins with autoupdate enabled.

**Windows (PowerShell):**

```powershell
iwr https://raw.githubusercontent.com/microsoft/power-platform-skills/main/scripts/install.js -OutFile install.js; node install.js; del install.js
```

**macOS / Linux / Windows (cmd):**

```bash
curl -fsSL https://raw.githubusercontent.com/microsoft/power-platform-skills/main/scripts/install.js | node
```

The installer automatically:

- Checks for PAC CLI and installs it if it's missing (skipped if you already installed it in Step 2)
- Detects available tools (GitHub Copilot CLI, Claude Code CLI)
- Registers the plugin marketplace and installs all listed plugins
- Enables autoupdate so plugins stay current

After installation, restart GitHub Copilot CLI or Claude Code CLI to access the plugin's skills as slash commands in your agent session.

For more on what the plugin provides and how to keep it current, see [Power Pages plugin for GitHub Copilot CLI and Claude Code](https://learn.microsoft.com/power-pages/configure/create-code-site-using-claude-code).

---

## Step 4: authenticate PAC CLI

Connect PAC CLI to your Power Platform environment:

```bash
pac auth create --environment <your-instance-url>
```

**How to find your instance URL:**

1. Go to [https://make.powerpages.microsoft.com/](https://make.powerpages.microsoft.com/)
2. Select the Settings icon (gear) in the upper-right corner
3. Select Session details
4. Copy the Instance url value

**Verify:**

```bash
pac auth list
```

**Expected output:** A table showing your authenticated profile with "Active" status.

**Verify environment connection:**

```bash
pac org who
```

**Expected output:** Your environment name, URL, and organization details.

> **Note:** Run `az login --allow-no-subscriptions` before starting Lab 01 if you haven't already. The AI agent uses the `az` token to reach Dataverse, Power Platform, and Flow APIs. Without it, most plugin skills will fail. The flag is set once at login; downstream `az` commands work normally afterward.

---

## Step 5: run the Build-phase verification checklist

Open a terminal and run each command. All should succeed before starting Lab 01.

```bash
node --version          # Expect: v18.x.x or higher
git --version           # Expect: git version 2.x.x
pac help                # Expect: help text with version 2.6.3 or higher in header (required for server logic + solution unpack)
az --version            # Expect: azure-cli version info
az account show         # Expect: tenantId and user. If "Please run 'az login'", run: az login --allow-no-subscriptions
copilot -h              # If using GitHub Copilot CLI
claude --version        # If using Claude Code CLI
pac auth list           # Expect: Active authenticated profile
pac org who             # Expect: Connected environment details
```

If all commands produce the expected output, you are ready for **Lab 01**.

---

## Build-phase troubleshooting

| **Problem**                                     | **Solution**                                                                                                                                                                                                                                                                  |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `node` is not recognized                        | Install Node.js from nodejs.org, restart your terminal, verify it was added to PATH                                                                                                                                                                                           |
| `pac` is not recognized                         | Run `dotnet tool install --global Microsoft.PowerApps.CLI.Tool`, restart terminal. If `dotnet` is not found, install .NET SDK first.                                                                                                                                          |
| `pac help` shows version below 2.6.3            | Run `dotnet tool update --global Microsoft.PowerApps.CLI.Tool` to get the latest version. Restart terminal after updating.                                                                                                                                                    |
| `az` is not recognized                          | Install Azure CLI from the install link in Step 2, restart terminal                                                                                                                                                                                                                       |
| `az account show` returns empty or says "Please run 'az login'" | Sign in with `az login --allow-no-subscriptions`. The flag lets you authenticate whether or not your account has an Azure subscription. The plugin only needs Microsoft Entra ID-scoped tokens for Dataverse and Power Platform. |
| `pac auth create` fails                         | Verify the instance URL is correct (not the site URL). Try `pac auth clear` then `pac auth create` again.                                                                                                                                                                     |
| `pac org who` shows wrong environment           | Run `pac auth list` to see all profiles. Switch with `pac auth select --index <N>`.                                                                                                                                                                                           |
| No Power Pages environment visible              | If you don't have access to a provisioned environment, you can sign up for a Power Pages trial (includes a Dataverse database) by following the official guide: [Sign up for a Power Pages trial](https://learn.microsoft.com/power-pages/getting-started/trial-signup) |
| System Administrator role missing               | Contact your tenant admin to have the System Administrator role assigned to you on the target environment. If using a trial environment (see Step 1), this role is granted automatically.                                                                                     |
| Corporate proxy or firewall blocks installation | Try installing from a network without corporate proxy, or configure proxy settings: `npm config set proxy http://proxy:port` and `az config set core.proxy=http://proxy:port`                                                                                                 |
| Laptop does not have admin rights               | Request temporary admin access from IT, or bring a personal laptop with admin access.                                                                                                                                                                                         |

---

## What's next

→ [Lab 01: Scaffold a Power Pages SPA](01-scaffold-spa-portal.md)

Back to the [Build phase overview](index.md) or the [track overview](../intro.md).

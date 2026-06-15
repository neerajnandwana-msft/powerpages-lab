---
sidebar_position: 0
sidebar_label: "Track Overview"
title: "Agentic Site Authoring — Track Overview"
slug: /
---

# Agentic Site Authoring

A self-paced lab track for building Microsoft Power Pages SPA sites with Claude Code and GitHub Copilot CLI, then taking them through a real ALM lifecycle: source control, branching, automated CI/CD, and multi-environment promotion via Microsoft Power Platform Pipelines.

---

## What you will build

A complete **Supplier Invoice Submission Portal** — a 5-page React SPA connected to Dataverse with authentication, role-based security, and live Web API integration — generated using AI-assisted development tools, then deployed through a real production ALM pipeline.

| Page | Route | Description |
|------|-------|-------------|
| Landing Page | `/` | Public hero, value props, sign-in CTA |
| Dashboard | `/dashboard` | Metric cards, recent invoices table |
| Submit Invoice | `/invoices/new` | Invoice submission form |
| Invoice List | `/invoices` | Filterable, sortable invoice table |
| Invoice Detail | `/invoices/:id` | Invoice details with status timeline |

**Tech stack:** React + TypeScript + Tailwind CSS + Dataverse + Power Pages Web API + GitHub Actions + Power Platform Pipelines

---

## Lab track

14 self-paced labs grouped into three phases. Each lab is self-contained with its own prerequisites, hands-on steps, verification, and pointer to the next lab.

### Build — scaffold and connect to data

| # | Lab | What you'll add |
|---|-----|------|
| 01 | [Scaffold an SPA Portal](build/01-scaffold-spa-portal) | A working React SPA running locally with mock data |
| 02 | [Set Up Dataverse and Security](build/02-dataverse-and-security) | Real Dataverse tables, sample data, three-layer security |
| 03 | [Connect to Live Data via Web API](build/03-web-api-integration) | Typed service layer, CSRF handling, end-to-end CRUD |

### Integrate — server logic, automation, AI

| # | Lab | What you'll add |
|---|-----|------|
| 04 | [Pick the Right Backend Pattern](integrate/04-pick-backend-pattern) | Decision matrix: Web API vs Server Logic vs Cloud Flow vs AI API |
| 05 | [Add Server Logic](integrate/05-add-server-logic) | Tamper-proof validate-and-execute on the server |
| 06 | [Add Power Automate Flows](integrate/06-add-power-automate-flows) | Teams notification on invoice submit |
| 07 | [Add Generative AI APIs](integrate/07-add-ai-apis) | Copilot summary card and grounded search answers |
| 08 | [Performance, Testing, and Deploy](integrate/08-performance-test-deploy) | Bundle splitting, Playwright tests, integration env deploy |
| 09 | [Security Review](integrate/09-security-review) | `/security-review` end-to-end — code, dependencies, deployed-site scan, headers, WAF, table permissions, auth config |

### ALM — source control to production

| # | Lab | What you'll add |
|---|-----|------|
| 10 | [Source Control](alm/10-source-control) | Git repo on GitHub with `.gitignore` and branch protection |
| 11 | [Solution Packaging and Dataverse Dependencies](alm/11-solution-and-dependencies) | Unpack-to-source-control pattern, env variables for site settings |
| 12 | [Branching Strategy and Workflows](alm/12-branching-and-workflows) | Trunk-based + feature/rollback/hotfix workflows |
| 13 | [CI/CD with GitHub Actions](alm/13-cicd-github-actions) | Service principal, automated deploy to integration on every merge |
| 14 | [Multi-Environment Promotion](alm/14-multi-env-promotion) | Power Platform Pipelines: integration → pre-prod → prod with manual approval |

### State you carry forward

This track is one cumulative use case, not a set of disconnected samples. Each lab starts from the portal state produced by the previous lab:

| Carry-forward artifact | Created in | Used by later labs |
|---|---|---|
| React SPA source and `powerpages.config.json` | Lab 01 | Every lab that changes, builds, tests, or uploads the site |
| Deployed Power Pages site and `.powerpages-site/` metadata | Lab 02 | Server logic, cloud flows, security review, source control, and site uploads |
| Dataverse invoice model, sample records, Contact links, and table permissions | Lab 02 | Live Web API tests, server-side rules, AI summaries, permission audit, and solution packaging |
| Typed Web API service layer in `src/services/` and `src/types/` | Lab 03 | Server logic integration, AI API wiring, testing, and CI builds |
| Integration features: server logic, cloud flow consumer, AI page/card | Labs 05-07 | Performance testing, security review, ALM packaging, and promotion |
| GitHub repo and unpacked `src/solution/` tree | Labs 10-11 | Branching workflows, CI/CD, and Pipelines promotion |
| ALM plan and ledgers under `docs/` | Labs 11 and 14 | Resumable solution packaging and multi-environment promotion |

---

## Reference

These reference docs sit outside the lab sequence — read them when you need them.

- [Setup Guide](setup-guide) — install all required tools (Node.js, PAC CLI, Azure CLI, GitHub CLI, AI coding CLI, Power Pages plugin)
- [Prompt Cheat Sheet](reference/prompt-cheat-sheet) — ACE framework, prompt patterns, design tokens, Claude Code commands
- [AI Coding CLI Orientation](reference/ai-coding-cli-orientation) — Claude Code and GitHub Copilot CLI: slash commands, context management, plugins

---

## Before Lab 01

Complete the **[Setup Guide](setup-guide)** to install all required tools and verify your environment.

---

## Where to go next (after Lab 14)

Once you've completed the track, here's how to take what you built into your own org.

### Optional homework

1. **Set up your own service principal and integration env CI** — repeat the Lab 13 setup against a real second environment in your tenant.
2. **Ask your Power Platform admin to set up Pipelines** — give them the pointer from Lab 14. Once the host env and pipeline definition exist, you can promote managed solutions as shown in the demo.
3. **Add a second feature end-to-end** — pick something real your team needs. Branch, build, PR, merge to integration, promote weekly to pre-prod, manual approval to prod.
4. **Write up your team's branching convention** — the labs showed trunk-based with `feature/`, `fix/`, `hotfix/`. Adapt it to whatever fits your org and put it in your repo's `CONTRIBUTING.md`.
5. **Add `.github/CODEOWNERS` to your repo** — pair with branch protection so PRs auto-request the right reviewers. Suggested layout: `/src/solution/ @data-modeling-team`, `/.github/workflows/ @platform-team`, `*.md @docs`.

### Production hardening checklist

- **Rotate the CI client secret regularly** — typical cadence is every 6 months. Generate a new secret in Microsoft Entra ID, update with `gh secret set CLIENT_SECRET`, retire the old one in Azure.
- **Scope the service principal down** — Lab 13 used System Administrator on the application user for simplicity. In production, use System Customizer plus the specific Power Pages roles the imports need.
- **Treat prod as never-write-from-laptop** — no `pac auth create` against the prod env from anywhere other than CI. Document this in your team's runbook.
- **Idempotency / failed deploy recovery** — solution imports are mostly idempotent; re-running the workflow after a transient failure usually succeeds. For partial-import states, fix the root cause and re-run rather than manually patching the env.
- **`/security-review` before each prod promotion** — run the full Lab 09 review (or just `/audit-permissions` if you're short on time) against the integration env before the weekly Pipelines promotion. The consolidated HTML report catches code-, dependency-, header-, WAF-, and permission-level regressions in one pass.
- **`/scan-site` on a schedule against production** — set up a monthly run of the deployed-site scan as ongoing monitoring. New CVEs and edge-case header drift land between releases; this is how you find them before the next release does.

### Cost considerations

- **GitHub Actions runner minutes** — free for public repos; private repos get 2,000 free Linux-equivalent minutes/month, then meter. `windows-latest` minutes count 2x; `macos-latest` counts 10x. The lab's `windows-latest` choice is the safest for tooling compatibility but the most expensive runner. For high-volume CI, switching to `ubuntu-latest` is worth testing.
- **Power Platform Pipelines** — requires Premium licenses for users who trigger pipeline runs. Stage definitions and host environment storage are included.
- **Additional Power Platform environments** — each Dev / Integration / Pre-prod / Prod env consumes capacity. Trial and developer envs are free for non-production use; production-tier envs require licensing.

The full pricing detail is at [Power Platform licensing](https://learn.microsoft.com/power-platform/admin/pricing-billing-skus) and [GitHub Actions billing](https://docs.github.com/billing/managing-billing-for-github-actions/about-billing-for-github-actions).

### Official documentation

- **Power Pages docs:** https://learn.microsoft.com/power-pages
- **Power Pages SPA sites:** https://learn.microsoft.com/power-pages/configure/create-code-sites
- **Power Pages plugin for GitHub Copilot CLI and Claude Code (preview):** https://learn.microsoft.com/power-pages/configure/create-code-site-using-claude-code
- **Power Platform ALM basics:** https://learn.microsoft.com/power-platform/alm/basics-alm
- **Power Platform pipelines:** https://learn.microsoft.com/power-platform/alm/pipelines
- **Power Pages pipelines:** https://learn.microsoft.com/power-pages/configure/power-pages-pipelines
- **GitHub Actions for Power Platform:** https://learn.microsoft.com/power-platform/alm/devops-github-actions
- **Azure DevOps build tools:** https://learn.microsoft.com/power-platform/alm/devops-build-tools
- **PAC CLI `solution` reference:** https://learn.microsoft.com/power-platform/developer/cli/reference/solution
- **PAC CLI `pages` reference:** https://learn.microsoft.com/power-platform/developer/cli/reference/pages
- **Environment variables for site settings:** https://learn.microsoft.com/power-pages/configure/environment-variables-for-site-settings
- **Available GitHub Actions for Power Platform (full reference):** https://learn.microsoft.com/power-platform/alm/devops-github-available-actions

### Community

- **Power Pages Community Forum:** https://powerusers.microsoft.com/t5/Power-Pages-Community/ct-p/PowerPagesCommunity
- **Power Pages Ideas portal:** https://ideas.powerpages.microsoft.com/
- **Power Apps / Power Platform GitHub samples:** https://github.com/microsoft/PowerApps-Samples

### Tips and best practices

For prompting patterns and AI-assisted-development habits that keep paying off long after the lab track, see the official guidance:

- **[Tips and best practices for the Power Pages plugin](https://learn.microsoft.com/power-pages/configure/create-code-site-using-claude-code#tips-and-best-practices)**

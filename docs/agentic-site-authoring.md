---
sidebar_position: 0
sidebar_label: "Track Overview"
title: "Agentic Site Authoring: Track Overview"
---

import { BookOpen, Hammer, Rocket, Workflow } from 'lucide-react';

# Agentic Site Authoring

<section className="landingHero">
  <p className="landingEyebrow">Self-paced Power Pages lab track</p>
  <h2>Build a production-ready SPA site with AI-assisted development</h2>
  <p>
    Learn how to create a Microsoft Power Pages single-page application (SPA) site with Claude Code and GitHub Copilot CLI, connect it to Dataverse, secure it, and promote it through a real application lifecycle management (ALM) workflow.
  </p>
  <div className="landingActions">
    <a className="button button--primary button--lg" href="build/00-setup">Start with setup</a>
    <a className="button button--secondary button--lg" href="#lab-track">View the lab track</a>
  </div>
</section>

---

## What you will build

A complete **Supplier Invoice Submission Portal** (a 5-page React SPA connected to Dataverse with authentication, role-based security, and live Web API integration) generated using AI-assisted development tools, then deployed through a real production ALM pipeline.

| Page | Route | Description |
|------|-------|-------------|
| Landing Page | `/` | Public hero, value props, sign-in CTA |
| Dashboard | `/dashboard` | Metric cards, recent invoices table |
| Submit Invoice | `/invoices/new` | Invoice submission form |
| Invoice List | `/invoices` | Filterable, sortable invoice table |
| Invoice Detail | `/invoices/:id` | Invoice details with status timeline |

**Tech stack:** React + TypeScript + Tailwind CSS + Dataverse + Power Pages Web API + Power Platform Pipelines

---

## How to use this guide

Start with the setup page for your current phase, then complete the labs in order. The track is cumulative: each lab assumes the site, data, security, and deployment state from the previous lab.

1. **Set up once per phase.** Start with [Build phase setup](build/00-setup). The Integrate and ALM setup pages only add what that phase needs.
2. **Let the plugin plan before it writes.** Most skills open a plan or report first. Review it, ask for changes, then approve.
3. **Verify the live site before moving on.** Local preview is useful for UI work, but Web API, server logic, cloud flows, AI APIs, and ALM promotion are validated on deployed Power Pages sites.

If you're new to Claude Code or GitHub Copilot CLI, keep the [AI Coding CLI Orientation](reference/ai-coding-cli-orientation) and [Prompt Cheat Sheet](reference/prompt-cheat-sheet) open while you work.

---

## The end-to-end journey

The track follows the Power Pages plugin's skill-led flow: create the site, secure the data model, add backend capabilities, review release readiness, then promote through ALM. Every lab maps to one or more plugin skills documented on Microsoft Learn:

![Power Pages skill-led user journey: from /create-site through data setup, backend integration, web roles, authentication, security review, and ALM planning to a live Power Pages site](/img/user-journey.png)

You scaffold and activate the site (`/create-site`, `/activate-site`), set up the Dataverse data model (`/setup-datamodel`, `/add-sample-data`), integrate backend capabilities through **Web APIs, server logic, and cloud flows** (`/integrate-backend`), configure web roles and authentication (`/create-webroles`, `/setup-auth`), run a `/security-review`, and plan ALM (`/plan-alm`). Build and Integrate labs use `/deploy-site` for site uploads; the ALM labs shift the same work into solution packaging and Power Platform Pipelines.

---

## Lab track

14 hands-on labs across three phases, each phase preceded by a short setup step. Plan roughly 8 to 12 hours total, spread across as many sessions as you like. Each lab gives you a goal, the state you need, hands-on steps, verification, troubleshooting, and a clear next step.

<div className="phaseGrid">
  <a className="phaseCard" href="build/00-setup">
    <Hammer className="phaseCard__icon" aria-hidden="true" />
    <span className="phaseCard__label">Phase 1</span>
    <h3>Build</h3>
    <p>Scaffold the SPA, create Dataverse tables, and connect the site to live data.</p>
  </a>
  <a className="phaseCard" href="integrate/00-setup">
    <Workflow className="phaseCard__icon" aria-hidden="true" />
    <span className="phaseCard__label">Phase 2</span>
    <h3>Integrate</h3>
    <p>Add server-side logic, automation, AI APIs, performance checks, and security review.</p>
  </a>
  <a className="phaseCard" href="alm/00-setup">
    <Rocket className="phaseCard__icon" aria-hidden="true" />
    <span className="phaseCard__label">Phase 3</span>
    <h3>ALM</h3>
    <p>Move from source control to managed solution promotion across environments.</p>
  </a>
  <a className="phaseCard" href="reference/prompt-cheat-sheet">
    <BookOpen className="phaseCard__icon" aria-hidden="true" />
    <span className="phaseCard__label">Reference</span>
    <h3>Prompting and tools</h3>
    <p>Use quick references when you need prompts, setup guidance, or CLI orientation.</p>
  </a>
</div>

### Build: scaffold and connect to data

| # | Lab | What you'll add |
|---|-----|------|
| 01 | [Scaffold a Power Pages SPA](build/01-scaffold-spa-portal) | A working React SPA running locally with mock data |
| 02 | [Set up Dataverse and security](build/02-dataverse-and-security) | Real Dataverse tables, sample data, three-layer security |
| 03 | [Configure authentication](build/03-configure-authentication) | Identity-provider mix, role-based UI helpers, claims mapping |
| 04 | [Connect the SPA to live Dataverse data](build/04-web-api-integration) | Typed service layer, CSRF handling, end-to-end CRUD |

### Integrate: server logic, automation, AI

| # | Lab | What you'll add |
|---|-----|------|
| 05 | [Plan the service layer](integrate/05-pick-backend-pattern) | Decision matrix: Web API vs Server Logic vs Cloud Flow vs AI API |
| 06 | [Add server logic](integrate/06-add-server-logic) | Tamper-proof validate-and-execute on the server |
| 07 | [Add Power Automate flows](integrate/07-add-power-automate-flows) | Teams notification on invoice submit |
| 08 | [Add generative AI APIs](integrate/08-add-ai-apis) | Copilot summary card and grounded search answers |
| 09 | [Improve performance, test, and deploy](integrate/09-performance-test-deploy) | Bundle splitting, Playwright tests, integration env deploy |
| 10 | [Run a security review](integrate/10-security-review) | `/security-review` end-to-end: code, dependencies, deployed-site scan, headers, WAF, table permissions, auth config |

### ALM: source control to production

| # | Lab | What you'll add |
|---|-----|------|
| 11 | [Put the site under source control](alm/11-source-control) | Git repo on GitHub with `.gitignore` and branch protection |
| 12 | [Package the solution and dependencies](alm/12-solution-and-dependencies) | Unpack-to-source-control pattern, env variables for site settings |
| 13 | [Adopt branching and developer workflows](alm/13-branching-and-workflows) | Trunk-based + feature/rollback/hotfix workflows |
| 14 | [Promote across environments](alm/14-multi-env-promotion) | Power Platform Pipelines: integration → pre-prod → prod with manual approval |

### State you carry forward

This track is one cumulative use case, not a set of disconnected samples. Each lab starts from the portal state produced by the previous lab:

| Carry-forward artifact | Created in | Used by later labs |
|---|---|---|
| React SPA source and `powerpages.config.json` | Lab 01 | Every lab that changes, builds, tests, or uploads the site |
| Deployed Power Pages site and `.powerpages-site/` metadata | Lab 02 | Server logic, cloud flows, security review, source control, and site uploads |
| Dataverse invoice model, sample records, Contact links, and table permissions | Lab 02 | Live Web API tests, server-side rules, AI summaries, permission audit, and solution packaging |
| Typed Web API service layer in `src/services/` and `src/types/` | Lab 04 | Server logic integration, AI API wiring, testing, and CI builds |
| Integration features: server logic, cloud flow consumer, AI page/card | Labs 06-08 | Performance testing, security review, ALM packaging, and promotion |
| GitHub repo and unpacked `src/solution/` tree | Labs 11-12 | Branching workflows and Pipelines promotion |
| ALM plan and ledgers under `docs/` | Labs 12 and 14 | Resumable solution packaging and multi-environment promotion |

---

## Before Lab 01

<div className="nextStepCallout">
  <h3>Start here</h3>
  <p>
    Complete the <a href="build/00-setup">Build phase setup</a>. It installs and authenticates the Build-phase tools (Node.js, PAC CLI, Azure CLI, an AI coding CLI, and the Power Pages plugin), then hands you to Lab 01.
  </p>
  <p>
    You don't need GitHub CLI or opengrep yet. Those come with the <a href="integrate/00-setup">Integrate</a> and <a href="alm/00-setup">ALM</a> setup pages.
  </p>
</div>

Optional: for a one-screen map of what installs in each phase, skim the [Setup Guide](setup-guide). Otherwise, go straight to [Build phase setup](build/00-setup).

---

## Reference

These reference docs sit outside the lab sequence. Read them when you need them.

- [Setup Guide](setup-guide), cross-phase overview: what gets installed in each phase and when (the per-phase setup pages have the actual steps)
- [Setup reliable ALM Lab](/reliable-alm): manual ALM setup for an existing Power Pages site, covering inner and outer development loops
- [Prompt Cheat Sheet](reference/prompt-cheat-sheet): ACE framework, prompt patterns, design tokens, AI coding CLI commands
- [AI Coding CLI Orientation](reference/ai-coding-cli-orientation): Claude Code and GitHub Copilot CLI: slash commands, context management, plugins
- [After the lab](reference/after-the-lab): production hardening, operating cadence, cost considerations, and continued-learning resources

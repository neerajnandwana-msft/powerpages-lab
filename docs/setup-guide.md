---
sidebar_position: 1
sidebar_label: "Setup Guide"
title: "Setup Guide"
---

# Setup Guide

Setup is staged by phase, so you only install what you need next. Start with the **[Build phase setup](build/00-setup.md)**. When you reach the Integrate and ALM phases, their setup pages tell you what carries forward and what changes.

**What you will build across the labs:** A multi-page React SPA portal connected to Microsoft Dataverse with authentication, role-based security, and live Web API integration, all generated using AI coding tools, then deployed through a real production ALM pipeline.

## What you need

Bring a laptop with admin access, a charger, and at least one licensed AI coding CLI: GitHub Copilot CLI or Claude Code CLI.

You also need a Dataverse-backed Power Platform environment where you can create tables, configure security, and deploy a Power Pages site. The Build setup page helps you confirm that access before you scaffold anything.

## What the plugin does

The Power Pages plugin adds slash-command skills to your AI coding CLI. Across the track, those skills scaffold the SPA, create Dataverse tables, configure table permissions and web roles, add server logic, connect cloud flows, add AI features, run security review, and plan ALM.

The site you build is a **Power Pages SPA site**: React, Angular, Vue, or Astro code compiled to static files and served by Power Pages. It differs from traditional Liquid-based Power Pages sites because you work in a local frontend project and deploy the compiled app. Read more: [Create and deploy a single-page application in Power Pages](https://learn.microsoft.com/power-pages/configure/create-code-sites) and [Power Pages plugin for GitHub Copilot CLI and Claude Code](https://learn.microsoft.com/power-pages/configure/create-code-site-using-claude-code).

---

## What installs when

You don't install everything up front. Each phase adds only the tooling its labs actually use. Follow the setup page for the phase you're entering:

| Phase | Setup | Install before | Tools |
| --- | --- | --- | --- |
| **Build** (start here) | [Build phase setup](build/00-setup.md) | [Lab 01](build/01-scaffold-spa-portal.md) | Dataverse environment, Node.js, git, PAC CLI, Azure CLI, AI coding CLI, Power Pages plugin (plus `pac auth create` and `az login`) |
| **Integrate** | [Integrate phase setup](integrate/00-setup.md) | [Lab 05](integrate/05-pick-backend-pattern.md) | **No new required tools.** The Build tools carry Labs 05-09. opengrep is *optional* before [Lab 10](integrate/10-security-review.md) and has a no-install fallback. |
| **ALM** | [ALM phase setup](alm/00-setup.md) | [Lab 11](alm/11-source-control.md) | GitHub CLI (`gh`) and a GitHub account (plus `gh auth login`) |

Each setup page lists its install steps, a verification checklist, and troubleshooting for just that phase.

---

## What's next

Start with [Build phase setup](build/00-setup.md). After every verification check passes, continue to [Lab 01: Scaffold a Power Pages SPA](build/01-scaffold-spa-portal.md).

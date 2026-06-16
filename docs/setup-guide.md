---
sidebar_position: 1
sidebar_label: "Setup Guide"
title: "Setup Guide"
---

# Setup Guide

Setup is staged by lab phase, and each phase's setup lives with that phase so you only install what you're about to use. This page is the overview. Start with the **[Build phase setup](build/00-setup.md)**, then pick up the Integrate and ALM tools when you reach those phases.

**What you will build across the labs:** A multi-page React SPA portal connected to Microsoft Dataverse with authentication, role-based security, and live Web API integration, all generated using AI coding tools, then deployed through a real production ALM pipeline.

**What you will be using:** The Power Pages plugin for your AI coding CLI creates **single-page application (SPA) sites in Power Pages**, a modern site type where your React/Angular/Vue/Astro code runs in the browser and integrates backend data through the Power Pages Web API, server logic, and cloud flows. This is different from traditional Power Pages (Liquid) sites. Across the full track, you will use plugin skills for the SPA front end, Dataverse tables, table permissions, web roles, server logic, cloud flows, and AI features; this setup only installs and authenticates the tools those labs rely on. Read more: [Create and deploy a single-page application in Power Pages](https://learn.microsoft.com/power-pages/configure/create-code-sites) · [Power Pages plugin for GitHub Copilot CLI and Claude Code (preview)](https://learn.microsoft.com/power-pages/configure/create-code-site-using-claude-code).

**What you need:** Laptop with admin access, charger, and AI coding tools with a license (GitHub Copilot CLI and/or Claude Code CLI).

---

## What to install, and when

You don't install everything up front. Each phase adds only the tooling its labs actually use. Follow the setup page for the phase you're entering:

| Phase | Setup | Install before | Tools |
| --- | --- | --- | --- |
| **Build** (start here) | [Build phase setup](build/00-setup.md) | [Lab 01](build/01-scaffold-spa-portal.md) | Dataverse environment, Node.js, git, PAC CLI, Azure CLI, AI coding CLI, Power Pages plugin (plus `pac auth create` and `az login`) |
| **Integrate** | [Integrate phase setup](integrate/00-setup.md) | [Lab 04](integrate/04-pick-backend-pattern.md) | **No new required tools.** The Build tools carry Labs 04–08. opengrep is *optional* before [Lab 09](integrate/09-security-review.md) and has a no-install fallback. |
| **ALM** | [ALM phase setup](alm/00-setup.md) | [Lab 10](alm/10-source-control.md) | GitHub CLI (`gh`) and a GitHub account (plus `gh auth login`) |

Each setup page lists its install steps, a verification checklist, and troubleshooting for just that phase.

---

## What's next

→ [Build phase setup](build/00-setup.md) → [Lab 01: Scaffold a Power Pages SPA](build/01-scaffold-spa-portal.md)

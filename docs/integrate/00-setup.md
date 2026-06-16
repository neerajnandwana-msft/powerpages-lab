---
sidebar_position: 0
sidebar_label: "Integrate setup"
title: "Integrate phase setup"
---

# Integrate phase setup

You've wrapped the Build phase (Labs 01–03). The Integrate phase (Labs 04–09) adds server logic, automation, and AI features using skills you already have: **there are no new required tools beyond the Build phase**. If you completed [Build phase setup](../build/00-setup.md), you're ready for [Lab 04](04-pick-backend-pattern.md).

Keep your PAC CLI and Azure CLI sessions active; re-run `pac auth create` or `az login` if they expire.

The one optional add-on is a static-analysis tool for the security-review lab. It is not required, so you can go straight to [Lab 04](04-pick-backend-pattern.md) now and come back if you want it.


For the staged, cross-phase view of what gets installed when, see the [Setup Guide overview](../setup-guide.md).

---

## Optional: static analysis for Lab 09

[Lab 09: Run a security review](09-security-review.md) uses `/scan-code` to scan local source with **static analysis** (opengrep) when it's available. This is optional: if the tool is missing, `/scan-code` falls back to a structured manual review, and Lab 09 also gives you a no-install `grep` / `findstr` self-check that uses tools you already have. Install opengrep ahead of time if you want the automated pass; otherwise skip this section and Lab 09 still works.

> **No static-analysis tool? You don't need one to start.** opengrep, the engine `/scan-code` uses for static analysis, has no winget package on Windows and needs a manually downloaded binary, so this guide doesn't require it. `/scan-code` detects the missing tool and offers a conversational manual-review fallback, and [Lab 09](09-security-review.md) includes a quick `grep` / `findstr` pattern check that runs on the Git Bash `grep` and Windows `findstr` you already have. Add opengrep later from the [release binaries](https://github.com/opengrep/opengrep/releases) if you want full semantic static analysis.

> **Don't have admin permission to install opengrep?** Skip it. Lab 09's `/scan-code` skill detects missing tools and offers a conversational manual-review fallback that covers the same checks (static patterns, CVE-known packages, hardcoded-secret patterns). You'll still get the consolidated HTML report. Sections backed by missing tools simply explain what was checked manually instead of how many findings the tool produced.

---

## What's next

→ [Lab 04: Plan the service layer with /integrate-backend](04-pick-backend-pattern.md)

---
sidebar_position: 0
sidebar_label: "Integrate setup"
title: "Integrate phase setup"
---

# Integrate phase setup

You've wrapped the Build phase (Labs 01-04). The Integrate phase (Labs 05-10) adds server logic, automation, and AI features using skills you already have: **there are no new required tools beyond the Build phase**. If you completed [Build phase setup](../build/00-setup.md), you're ready for [Lab 05](05-pick-backend-pattern.md).

Keep your PAC CLI and Azure CLI sessions active; re-run `pac auth create` or `az login` if they expire.

For the staged, cross-phase view of what gets installed when, see the [Setup Guide overview](../setup-guide.md).

---

## Optional: static analysis for Lab 10

[Lab 10: Run a security review](10-security-review.md) can use opengrep for local static analysis through `/scan-code`, but it is not required. If opengrep is missing, `/scan-code` offers a structured manual-review fallback, and Lab 10 includes a quick `grep` / `findstr` self-check that uses tools you already have.

Use the no-install path first if you're in a workshop or do not have admin rights. Add opengrep later from the [release binaries](https://github.com/opengrep/opengrep/releases) if you want the automated static-analysis pass.

---

## What's next

→ [Lab 05: Plan the service layer](05-pick-backend-pattern.md)

Back to the [Integrate phase overview](index.md) or the [track overview](../agentic-site-authoring.md).

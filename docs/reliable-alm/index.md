---
sidebar_position: 0
sidebar_label: "Reliable ALM overview"
title: "Power Pages ALM: recommended approach"
slug: /reliable-alm
className: powerPlatformGuide
---

import { GitBranch, PackageCheck, Rocket, ShieldCheck, Workflow } from 'lucide-react';

# Power Pages ALM: recommended approach

<section className="landingHero">
  <p className="landingEyebrow">Power Pages ALM lab track</p>
  <h2>Move a site from maker-portal edits to a governed release process</h2>
  <p>
    The environment strategy, branching model, and release pipeline we recommend, with the application lifecycle management (ALM) automation included in full so your team can judge the approach from working code.
  </p>
  <div className="landingActions">
    <a className="button button--primary button--lg" href="00-setup">Start setup</a>
    <a className="button button--secondary button--lg" href="#labs-in-this-guide">View the lab sequence</a>
  </div>
</section>

This guide is for the people who decide how your Power Pages workload is built and shipped: architects, engineering leads, and platform owners. It states what we recommend, why, and what each recommendation prevents. The recommendations come from a Power Pages site built this way, and the automation that carries the process is reproduced in full in the appendixes.

:::note How to use this guide
This is reference guidance, not a mandate. It reflects a proven approach for a common set of constraints: a team building a Power Pages site with Dataverse, on GitHub. Your platform, team size, regulatory obligations, and release cadence may point to different choices, and adapting the approach is expected. Use it as a baseline to compare against, take what fits, and make any departure a deliberate, recorded decision.
:::

The examples use a Power Pages [single-page application (SPA) site](https://learn.microsoft.com/en-us/power-pages/configure/create-code-sites), so they compile a bundle. If your site is authored entirely in the design studio, skip the build steps and the bundle drift checks. Everything else applies unchanged.

## The approach in brief

A Power Pages site is a single-page application that runs on the Power Pages runtime, backed by Dataverse. That makes it two things at once: web code that belongs in Git, and Power Platform components that travel in a solution. Treat only one of them as the source of truth and the other drifts, silently and usually in production.

We recommend one process built on a single idea: **source control is the source of truth, and every environment is rebuilt from it.** That idea produces five decisions.

| Decision | Recommendation |
|---|---|
| **One commit carries everything** | The unpacked Dataverse solution and the site source live in the same repository and move in the same commit. One change is one reviewable unit. |
| **Isolated developer environments** | Every developer gets their own environment. Nobody builds in a shared environment, and nobody builds in the default environment. |
| **Automated gates on every pull request** | Lint, tests, solution checker, and drift detection run before a merge. A rule that nothing checks is not a control. |
| **Build once, promote unchanged** | One managed solution, or one versioned artifact set when solutions are segmented, is built on a version tag and installed byte-for-byte in test and production. Rollback is re-promoting an earlier tag. |
| **Downstream is import-only** | Test and production accept managed solution imports and nothing else. No maker-portal edits, no exceptions. |

The payoff is predictability. Releases become routine and reversible, changes are reviewable and attributable, and multiple developers can work on the same feature without colliding.

:::tip The one rule to keep
Build the artifact once on a tag, then promote that identical artifact through every environment. Every other recommendation exists to make that rule safe.
:::

## Recommendations at a glance

Use this table to decide what to adopt and in what order. Each row is expanded in the lab that owns it.

| Area | What we recommend | What it prevents |
|---|---|---|
| Environments | Integration (shared baseline), then dev per developer, then test, then production | Developers overwriting each other; untraceable changes made directly in production |
| Branching | A GitFlow-style model: `feature/*` to `develop` to `main`, with tagged releases | Half-finished work reaching a release; hotfixes that get lost at the next deployment |
| Repository | Site source and unpacked solution in one repository, with line endings pinned | The deployed bundle silently differing from the reviewed code |
| Solution boundaries | Start with one solution per independently released workload. Split only at a clear boundary in release cadence, ownership, reuse, size, or target environments. | Unnecessary dependency and deployment complexity, while allowing genuinely independent components to ship without blocking each other |
| Quality gates | Pull request checks: lint, unit and end-to-end tests, link scan, solution packaging, solution checker, and drift detection | Regressions and broken links reaching test; invalid solution source discovered at deployment time |
| Release | Tag on `main`, build once, publish immutable artifacts, promote to test automatically and to production behind an approval | "It worked in test", because test and production received different builds |
| Configuration | Environment variables and connection references supplied at import time from per-environment settings files | Environment-specific values baked into the artifact, which forces a rebuild per environment |
| Drift detection | A scheduled job that compares the development environment against committed source | Maker-portal edits that exist in no branch and are erased by the next import |

## How the two loops fit together

The process has two rhythms. The **inner loop** belongs to one developer, runs in their own environment, and repeats many times a day. The **outer loop** is shared, automated, and governed, and runs once per change set. They meet at the pull request.

Keeping them separate is what makes the process fast and safe at the same time: the inner loop optimizes for speed with no approvals, and the outer loop optimizes for control with no manual steps.

![Overview diagram: the inner loop of author, preview, validate, and commit repeats inside a developer environment and meets the outer loop at the pull request, which then validates, merges, tags, and promotes one artifact through test and production.](/img/reliable-alm/power-pages-alm-1-overview-animated-light.svg)

*The inner loop repeats many times inside one developer environment. The outer loop runs once per pull request and promotes a single artifact along the environment ladder.*

## What you set up

<div className="rootCardGrid">
  <div className="rootCard">
    <GitBranch className="rootCard__icon" aria-hidden="true" />
    <h3>Source-controlled development</h3>
    <p>Site source and the unpacked solution move in one commit, so a single pull request carries a complete, reviewable change.</p>
  </div>
  <div className="rootCard">
    <ShieldCheck className="rootCard__icon" aria-hidden="true" />
    <h3>Quality and security gates</h3>
    <p>Lint, tests, link scan, solution checker, and drift detection run on every pull request before a merge is allowed.</p>
  </div>
  <div className="rootCard">
    <PackageCheck className="rootCard__icon" aria-hidden="true" />
    <h3>Immutable release artifacts</h3>
    <p>A version tag builds the managed solution once and publishes it as a GitHub release asset that never gets rebuilt.</p>
  </div>
  <div className="rootCard">
    <Workflow className="rootCard__icon" aria-hidden="true" />
    <h3>Governed promotion</h3>
    <p>The same bytes reach test automatically, and production only through a deliberate, recorded step. Rollback is re-promoting an earlier tag.</p>
  </div>
</div>

## Labs in this guide

Budget about **7 to 9 hours** end to end, spread across sessions. Labs 01 and 03 are decisions your team makes together; the rest are hands-on.

| # | Lab | Time | Outcome |
|---|---|---|---|
| Setup | [Reliable ALM setup](00-setup.md) | 45-60 min | Tools, repository, service principal, and GitHub secrets and variables are ready |
| 01 | [Design the ALM blueprint](01-design-alm-blueprint.md) | 30-45 min | The five decisions, the two loops, and the rules your team commits to are recorded |
| 02 | [Set up the environment strategy](02-environment-strategy.md) | 45-60 min | Integration, per-developer, test, and production environments exist, and the baseline is committed |
| 03 | [Set solution boundaries and repository layout](03-solutions-and-repository.md) | 45-60 min | Solution count is decided and the repository holds site source and unpacked solutions together |
| 04 | [Set up branching and branch protection](04-branching-and-protection.md) | 35-50 min | Branches, rulesets, a pull request template, and `CODEOWNERS` are in place |
| 05 | [Work the inner loop](05-inner-loop.md) | 60-90 min | The developer scripts exist, and one command keeps the site and solution in step |
| 06 | [Gate every pull request](06-pull-request-gates.md) | 60-90 min | `pr-validation.yml` blocks a merge that breaks the build, the tests, the solution, or the bundle |
| 07 | [Build, release, and promote](07-release-and-promote.md) | 60-90 min | A tag builds once, publishes immutable artifacts, promotes to test, and reaches production deliberately |

Three appendixes provide the complete automation source and diagrams:

| Appendix | Contents |
|---|---|
| [Appendix A: GitHub Actions workflow source](appendix-a-workflows.md) | `pr-validation.yml`, `ci-build.yml`, `cd-release.yml`, the shared `promote-solution` action, and `dependabot.yml` |
| [Appendix B: Developer script source](appendix-b-scripts.md) | `package.json`, the `pre-push` hook, `check-solution-drift.mjs`, and `sync-site-components.mjs` |
| [Appendix C: Consolidated ALM diagrams](appendix-c-consolidated-diagrams.md) | Full inner- and outer-loop SVGs for reviewing each process in one view |

## What makes the setup reliable

Reliable ALM answers the hard questions before an incident:

- What changed, and who approved it?
- Which source version produced the deployed solution?
- Which solution version is in each environment?
- Which values differ by environment?
- Which gates stop risky changes?
- How do we recover if import, activation, cache, or validation fails?

## Start here

<div className="nextStepCallout">
  <h3>Start with setup</h3>
  <p>Begin with <a href="00-setup">Reliable ALM setup</a>. It confirms your tools, repository, service principal, and the secrets and variables the workflows read before you design the blueprint.</p>
</div>

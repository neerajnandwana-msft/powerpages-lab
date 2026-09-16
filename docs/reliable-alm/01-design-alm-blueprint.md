---
sidebar_position: 2
sidebar_label: "Lab 01: Design blueprint"
title: "Lab 01: Design the ALM blueprint"
className: powerPlatformGuide
---

# Lab 01: Design the ALM blueprint

## Goal

Agree the working model before you configure anything. The blueprint records the five decisions, the boundary between the two loops, and the rules your team is committing to.

**Estimated time:** about 30-45 minutes.

## State you carry forward

- Completed [Reliable ALM setup](00-setup.md).
- Repository, service principal, secrets, and variables are ready.
- Owners are captured.

## Why this lab matters

Most ALM failures start as design gaps: unclear environments, direct production edits, solutions used as branches, or missing ownership. Every one of them is cheap to settle now and expensive to settle after the pipeline exists. This lab turns the choices into a short written blueprint that the remaining labs implement.

## Step 1: adopt the organizing idea

Write this sentence at the top of your blueprint:

> Source control is the source of truth, and every environment is rebuilt from it.

A Power Pages site is two things at once: web code that belongs in Git, and Power Platform components that travel in a solution. Treat only one of them as the source of truth and the other drifts, silently and usually in production.

## Step 2: record the five decisions

For each decision, record what you are adopting and, if you depart from the recommendation, why.

| Decision | Recommendation | What it prevents |
|---|---|---|
| **One commit carries everything** | The unpacked Dataverse solution and the site source live in the same repository and move in the same commit. | A reviewer approving an interface change without seeing the schema change that goes with it. |
| **Isolated developer environments** | Every developer gets their own environment. Nobody builds in a shared environment, and nobody builds in the default environment. | Two people publishing over each other with no record of who changed what. |
| **Automated gates on every pull request** | Lint, tests, solution checker, and drift detection run before a merge. | A rule nobody checks, which is not a control. |
| **Build once, promote unchanged** | One versioned artifact is built on a tag and installed byte-for-byte in test and production. | "It worked in test", because test and production received different builds. |
| **Downstream is import-only** | Test and production accept managed solution imports and nothing else. | A production fix that exists in no branch and is erased by the next import. |

:::tip The one rule to keep
Build the artifact once on a tag, then promote that identical artifact through every environment. Every other recommendation in this guide exists to make that rule safe.
:::

## Step 3: draw the boundary between the loops

The process has two rhythms, and they meet at exactly one place: the pull request.

![Overview diagram: the inner loop of author, preview, validate, and commit repeats inside a developer environment and meets the outer loop at the pull request, which then validates, merges, tags, and promotes one artifact through test and production.](/img/reliable-alm/power-pages-alm-1-overview-animated-light.svg)

*The inner loop repeats many times inside one developer environment. The outer loop runs once per pull request and promotes a single artifact along the environment ladder.*

| Loop | Owner | Cadence | Optimizes for |
|---|---|---|---|
| **Inner** | One developer, in their own environment | Many times a day | Speed. No approvals, no shared state, no waiting. |
| **Outer** | The team, through automation | Once per change set | Control. No manual steps, every gate enforced. |

Keeping them separate is what makes the process fast and safe at the same time. A gate in the inner loop slows a developer down without protecting anyone. A manual step in the outer loop is a control that someone will eventually skip.

Write down which activities belong to which loop. Anything that needs an approval belongs to the outer loop; anything a developer repeats more than twice a day belongs to the inner loop and should be a script.

## Step 4: declare what is not allowed

The blueprint is more useful for what it forbids than for what it permits. Record these as rules with an owner:

- No maker-portal edits in test or production.
- No direct pushes to `develop` or `main`.
- No hand-editing of generated solution XML.
- No release built from anything other than a tag on `main`.
- No environment-specific value baked into an artifact.
- No zip file committed to the repository.

:::note Why test and production must be locked
A change made directly in test or production exists in no branch, survives no redeployment, and cannot be reviewed. The next import silently erases it. Fix it in a development environment, commit it, and let the pipeline promote it.
:::

## Step 5: decide how configuration travels

List every value that must differ between environments, and decide now how it reaches the target. The rule is that definitions ship inside the solution and values are supplied per environment at import time.

| Configuration | Example | How it travels |
|---|---|---|
| Site setting | Identity provider client ID | Environment variable, with the site setting source set to environment variable |
| Secret | Client secret or API key | Secret-backed environment variable, resolved from the approved secret store |
| Connection | Connector binding for a flow | Connection reference, bound during import |
| Reference data | Lookup values or configuration rows | A seeding script, not a solution component |

If a value is baked into the artifact, the artifact must be rebuilt per environment, and the moment you rebuild you no longer promote the thing you signed off.

## Step 6: agree the release and recovery story

Answer these four questions in writing. Each one becomes a step in [Lab 07](07-release-and-promote.md).

1. **What triggers a release?** A semantic version tag on `main`.
2. **What reaches production?** The same bytes that were signed off in test, never a rebuild.
3. **Who approves it?** A named approver on the `prod` GitHub environment, if your plan supports required reviewers. If it does not, production promotion is a deliberate manual run by a named person. Decide which of the two you are actually getting, and see [Lab 07](07-release-and-promote.md).
4. **How do you roll back?** Re-promote the previous tag. If the answer involves reconstructing anything, the blueprint is not finished.

## Checkpoint

You have completed this lab when:

- [ ] The blueprint records the organizing idea in one sentence.
- [ ] All five decisions are recorded as adopted or as a deliberate, justified departure.
- [ ] The inner and outer loop boundary is written down.
- [ ] The forbidden list exists and each rule has an owner.
- [ ] Environment-specific configuration is listed with how each value travels.
- [ ] Trigger, artifact, approver, and rollback are answered.

## Troubleshooting

| Problem | Fix |
|---|---|
| The team wants to use solutions as branches | Use Git branches for change isolation and solutions for packaging. They are different tools for different jobs. |
| A departure from the recommendation is proposed | Accept it, but record what it prevents and who owns the consequence. Undocumented departures are what nobody can explain later. |
| Nobody will own production approval | Stop. A gate with no approver is not a gate, and this is cheaper to resolve now than during an incident. |
| Production already has unmanaged edits | Catalogue them, move each change back through a development environment, then remove the unmanaged layers. |

## Next step

Continue to [Lab 02: Set up the environment strategy](02-environment-strategy.md).

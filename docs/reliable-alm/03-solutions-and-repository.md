---
sidebar_position: 4
sidebar_label: "Lab 03: Solutions and repository"
title: "Lab 03: Set solution boundaries and repository layout"
className: powerPlatformGuide
---

# Lab 03: Set solution boundaries and repository layout

## Goal

Decide how many solutions you ship, then lay out the repository so one pull request carries a complete, reviewable change.

**Estimated time:** about 45-60 minutes.

## State you carry forward

- Completed [Lab 02: Set up the environment strategy](02-environment-strategy.md).
- The baseline solution is committed from the integration environment.
- The publisher prefix and solution name are agreed.

## Why this lab matters

Solution count is a release decision, not a filing decision, so settle it before the repository layout. The layout follows from the answer: one folder per solution, in dependency order.

## Step 1: default to one solution

**Default to one solution per independently released workload.** Every extra solution adds dependency, versioning, and deployment-order cost that you pay on every release, forever.

Split only when one of these boundaries is real.

| Split when | Why it justifies a boundary | What to do |
|---|---|---|
| Different release cadence | The shared data model ships slower than site changes. | Put stable shared schema in a base solution; keep site components in a site solution. |
| Different owning team | One deployable package needs one accountable owner. | Split only if each team can version, test, and release its package independently. |
| Reuse across sites | Common tables and artifacts are used by two or more sites. | Create one shared base solution and make each site solution depend on it. |
| Import time or size pain | Thousands of web files slow every import, even for a one-file change. | Separate large, slow-changing components so the frequently deployed solution stays small. |
| Different target environments | Not every environment needs every component. | Package optional components separately and deploy them only where they are required. |

:::tip Prove the pain before you split
Import time and package size is the most assumed and least measured reason to split. Record today's import duration and package size, then split only if the numbers justify it. One solution that imports acceptably beats a segmented set nobody can release confidently.
:::

## Step 2: record the decision and the dependency order

Write down how many solutions you ship and, if more than one, which imports first. Dependency order is not a detail you can defer: the pipeline installs solutions in the order you give it, and a site solution that arrives before the base solution it depends on fails the import.

## Step 3: lay out the repository

One repository holds everything the workload needs: the Power Pages site, the Dataverse solution or solution set, and the documents and automation that support them. Keeping them together is what lets a single pull request carry a complete, reviewable change.

Use this structure as a starting point. Names can change; the separation should not.

```text
your-portal/
│
├─ .powerpages-site/             1. Power Pages site: pages, templates, roles, settings
│
├─ solutions/                    2. Dataverse solutions, one folder each, in dependency order
│  ├─ ContosoCore/                  shared schema, imported first
│  │  └─ src/
│  └─ SupplierInvoicePortal/        the site, depends on ContosoCore
│     └─ src/                       unpacked solution, generated, never hand-edited
│        ├─ Entities/               tables, columns, forms, views
│        ├─ Other/                  Solution.xml, Customizations.xml, relationships
│        ├─ powerpagecomponents/    the site, as solution components
│        └─ Assets/
│
├─ docs/                         3. Documents
│
└─ .github/                      4. Automation
   ├─ workflows/                    pr-validation, ci-build, cd-release
   └─ actions/promote-solution/     shared promotion step
```

The `solutions/` lane holds one folder per solution, so a single solution and a segmented set look the same. Add a folder, keep each one's `src/` generated, and let the folder order reflect the dependency order.

## Step 4: agree what goes where, and who owns it

| Lane | Authored by | How it gets there |
|---|---|---|
| **Power Pages site** (`.powerpages-site/`) | Makers in the design studio, developers in an editor | Downloaded from the development environment as source. Reviewable text, so a change to a page, permission, or setting shows up in a pull request. |
| **Dataverse solution** (`solutions/`) | Makers, in the Power Apps maker portal | Exported and unpacked from the development environment. Generated output: change it in the environment and re-sync, never by editing the XML. |
| **Documents** (`docs/`) | Architects and leads | Written by hand and versioned with the code they describe, so guidance and implementation cannot drift apart. |
| **Automation** (`.github/`) | The platform team | Written by hand. A change to a gate is itself reviewed through a pull request. |

The distinction that matters is generated against authored. Two of these lanes are generated output, and hand-editing them produces a change that the next sync silently reverts.

## Step 5: pin line endings

Add a `.gitattributes` that normalizes line endings for the solution source.

Solution XML is generated by tooling on whatever operating system the developer uses. Without normalization, a Windows developer and a macOS developer produce whole-file diffs of identical content, every review becomes unreadable, and the drift gate in [Lab 06](06-pull-request-gates.md) cannot tell a real change from a line-ending change.

## Step 6: understand where the compiled bundle lives

On an SPA site, the compiled bundle is committed **inside the solution**, under `solutions/**/powerpagecomponents/**/filecontent/`. Those are the bytes that reach production.

This is the single most important thing to understand about the layout, because it creates a failure mode that looks like nothing at all: a developer changes React source, commits, and the diff looks clean, but the solution still carries the previous bundle. The next promotion ships stale code.

That is exactly why the drift gate exists. It rebuilds the site from source and fails the pull request if the two no longer match. You configure it in [Lab 06](06-pull-request-gates.md), and the script is in [Appendix B.3](appendix-b-scripts.md#b3-check-solution-drift).

## Checkpoint

You have completed this lab when:

- [ ] The number of solutions is decided, with a recorded reason for any split.
- [ ] Dependency order is written down.
- [ ] The repository has separate lanes for site source, solutions, documents, and automation.
- [ ] Each solution has its own folder with a generated `src/`.
- [ ] `.gitattributes` normalizes line endings for solution source.
- [ ] The team knows which lanes are generated and must never be hand-edited.

## Troubleshooting

| Problem | Fix |
|---|---|
| Every review shows whole-file diffs of unchanged solution XML | Line endings are not normalized. Add `.gitattributes` and renormalize once. |
| A hand-edit to solution XML disappeared | It was overwritten by the next sync. Make the change in the environment and re-sync. |
| Import fails because a dependency is missing | The base solution was installed after the solution that depends on it. Fix the order in the pipeline. |
| The team wants a solution per feature | Solutions are packaging, branches are isolation. Use `feature/*` branches from [Lab 04](04-branching-and-protection.md). |
| A zip file was committed | Remove it. The repository holds unpacked source; zips are build outputs produced by the pipeline. |

## Next step

Continue to [Lab 04: Set up branching and branch protection](04-branching-and-protection.md).

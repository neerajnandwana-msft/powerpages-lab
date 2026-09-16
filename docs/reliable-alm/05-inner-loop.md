---
sidebar_position: 6
sidebar_label: "Lab 05: Work the inner loop"
title: "Lab 05: Work the inner loop"
className: powerPlatformGuide
---

# Lab 05: Work the inner loop

## Goal

Make the daily developer cycle fast and repeatable: author, preview, validate, sync, commit, push. Every routine task is wrapped in a script, so nobody has to remember a `pac` command or the order to run things in.

**Estimated time:** about 60-90 minutes.

## State you carry forward

- Completed [Lab 04: Set up branching and branch protection](04-branching-and-protection.md).
- Branch model and protection rules are in place.
- Each developer has their own environment and is authenticated to it.

## Why this lab matters

The inner loop is deliberately unglamorous. Nothing here is shared, and nobody else sees the work until the pull request. Speed comes from that isolation, and reliability comes from wrapping the error-prone parts in scripts rather than in documentation nobody rereads.

![Inner loop diagram: a shared integration environment seeds the baseline into source control, developers each create a work branch and an isolated development environment, cycle through author, preview, validate, and commit, then open a pull request back to the shared feature branch.](/img/reliable-alm/power-pages-alm-2-inner-loop-animated-light.svg)

*Seed the baseline once in the integration environment, fan out to one branch and one environment per developer, then merge back through pull requests.*

## Step 1: set up once

A developer does this on their first day and never again:

1. Install Node.js 22 and the Power Platform CLI.
2. Clone the repository, then run `npm ci`.
3. Create a development environment and authenticate to it:

   ```bash
   pac auth create --environment <your dev environment url>
   ```

4. Import the unmanaged solution built from your branch:

   ```bash
   pac solution import
   ```

5. Enable the pre-push hook:

   ```bash
   git config core.hooksPath .githooks
   ```

:::tip Onboarding is a measurement of your strategy
Joining the workload should cost a branch, an environment, and one automated solution import. Everything else comes from the repository. If a developer's first day takes longer than that, something that belongs in source control is living in someone's environment instead.
:::

## Step 2: start each piece of work

- Pull the shared feature branch and re-import it, so you start from the team's baseline rather than yesterday's.
- Create your work branch: `git switch -c dev/<alias>/<topic>`.
- Load test data if you need it: `npm run seed`.

## Step 3: repeat while you build

- Publish your change to your own environment:

  ```bash
  npm run build
  pac pages upload-code-site --rootPath .
  ```

- Test on the site itself. Authentication, web roles, table permissions, and Dataverse calls only behave as they will in production when the site runs on Power Pages, so your development environment is the real test surface. `npm run dev` is for quick interface work, not for verifying behavior.
- Run `npm run lint` and `npm run test:unit` for fast feedback before you commit.
- Run `npm run sync:solution` to put source back in step. It builds the site, uploads it to your environment, then pulls the site components and the solution back into source.
- Run `npm run test:e2e` to run the same end-to-end suite the pull request will run.

## Step 4: check before you push

- `npm run verify:solution` must report no drift. It rebuilds the site and compares it to the committed solution.
- `npm run check:links` catches routes that no longer resolve.
- One commit carries both the site source and the unpacked solution.
- Push. The pre-push hook runs `verify:solution` and blocks the push if the solution is stale.

:::tip One command keeps the two halves in sync
The compiled site is committed inside the solution, so a code change that skips the sync ships stale code at the next promotion. `npm run sync:solution` does the whole sequence in the right order, and `npm run verify:solution` proves it worked. Wrapping this in a script is what stops the most common Power Pages ALM failure from depending on memory. The source of both is in [Appendix B](appendix-b-scripts.md).
:::

## Step 5: adopt the command set

These are every script a developer needs for day-to-day work. The full `package.json` is in [Appendix B.1](appendix-b-scripts.md#b1-package-json).

:::note These commands assume a compiled site
The site here is a single-page application that is compiled and then served by the Power Pages runtime. That is why `dev`, `build`, `sync:solution`, `check:drift`, and `verify:solution` exist at all: they keep a compiled bundle in step with the solution that carries it. A site authored entirely in the design studio has no build step, so it needs neither the build commands nor the bundle drift checks, though it still needs the environment and deployment ones. Take the commands that match your site rather than the whole set.
:::

| Stage | Command | What it does |
|---|---|---|
| **Build and run** | `npm run dev` | Serves the site locally for quick interface work. Power Pages features such as authentication and table permissions are not available. |
| | `npm run build` | Type-checks and builds the site |
| | `npm run preview` | Serves the built output as it will be deployed |
| **Quality** | `npm run lint` | Lints the source |
| | `npm run test:unit` | Runs the unit tests |
| | `npm run test:e2e` | Builds, then runs the end-to-end suite |
| | `npm run check:links` | Finds links to routes that no longer exist |
| **Keep code and solution in sync** | `npm run sync:solution` | Builds, uploads the site to your environment, then pulls the site components and the solution back into source |
| | `npm run check:drift` | Compares the committed solution against what the source builds |
| | `npm run verify:solution` | Builds, then checks drift. This is what the pre-push hook runs. |
| **Environments** | `npm run seed` | Loads the base or demo dataset into an environment |
| | `npm run test:deployment` | Runs the smoke tests against a deployed site |
| | `npm run verify:deployment` | Confirms the deployed site serves the build that was shipped |

## Step 6: understand why the commands compose

The commands compose rather than duplicate. `verify:solution` calls `build` and `check:drift`, and the pull request runs the same `check:drift`.

A developer, the pre-push hook, and continuous integration therefore apply one definition of correct. That is what prevents the worst class of pipeline problem: a check that passes locally and fails in the pipeline for a reason nobody can reproduce.

## Checkpoint

You have completed this lab when:

- [ ] A developer can go from clone to a working site in their own environment using only the documented commands.
- [ ] `npm run sync:solution` completes and produces a commit containing both site source and solution changes.
- [ ] `npm run verify:solution` reports no drift on a clean checkout.
- [ ] The pre-push hook blocks a push after a deliberate code change made without a sync.
- [ ] `npm run test:e2e` passes locally against a development environment.
- [ ] Every developer has the hook enabled.

## Troubleshooting

| Problem | Fix |
|---|---|
| The push is blocked and says the solution is out of date | Run `npm run sync:solution`, commit the result, and push again. The hook is working. |
| `check:drift` fails on a clean checkout | The build is not reproducible. Check that CSS tooling is scoped deterministically, then re-sync once. |
| Authentication or table permissions behave differently locally | Expected. `npm run dev` does not run on the Power Pages runtime. Test those on the site in your environment. |
| `pac pages upload-code-site` cannot find the site | Confirm the auth profile targets your environment, and pass `--siteName` if the environment holds more than one site. |
| The environment has drifted from the branch | Re-import the solution from your branch. Rebuilding the environment is meant to be cheap. |
| A superseded bundle is left behind in the solution | A prune was never synced. Run `npm run sync:solution` and commit the deletion as well as the addition. |

## Next step

Continue to [Lab 06: Gate every pull request](06-pull-request-gates.md).

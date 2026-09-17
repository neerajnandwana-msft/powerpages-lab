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

## Step 1: set up once

A developer does this on their first day and never again:

1. Install Node.js 22 and the Power Platform CLI.
2. Clone the repository, then run `npm ci`.
3. Create a development environment and authenticate to it:

   ```bash
   pac auth create --environment <your dev environment url>
   ```

4. Rebuild the environment from your branch, using the same pack and import pair as [Lab 02](02-environment-strategy.md):

   ```bash
   pac solution pack --zipfile ./out/<SolutionName>.zip --folder ./solutions/<SolutionName>/src --packagetype Unmanaged
   pac solution import --path ./out/<SolutionName>.zip --publish-changes
   ```

5. Enable the pre-push hook, which you add in Step 2:

   ```bash
   git config core.hooksPath .githooks
   ```

:::tip Onboarding is a measurement of your strategy
Joining the workload should cost a branch, an environment, and one automated solution import. Everything else comes from the repository. If a developer's first day takes longer than that, something that belongs in source control is living in someone's environment instead.
:::

## Step 2: add the developer scripts

Before any `npm run` command works, the repository needs the scripts behind them. Add these four files from [Appendix B](appendix-b-scripts.md), which reproduces each one in full:

| File | From | What it gives you |
|---|---|---|
| `package.json` | [B.1](appendix-b-scripts.md#b1-package-json) | Every `npm run` command in Step 6 |
| `.githooks/pre-push` | [B.2](appendix-b-scripts.md#b2-pre-push) | The push block that stops a stale bundle |
| `scripts/check-solution-drift.mjs` | [B.3](appendix-b-scripts.md#b3-check-solution-drift) | The comparison behind `check:drift` |
| `scripts/sync-site-components.mjs` | [B.4](appendix-b-scripts.md#b4-sync-site-components) | Adds new site components before the solution is synced |

Three things in `package.json` are specific to the sample and must change for your workload: the solution name `SupplierInvoicePortal` in the `sync:solution` path, the package name, and any dependency you do not use.

Then install and confirm the commands resolve:

```bash
npm install
npm run lint
```

On macOS or Linux, make the hook executable:

```bash
chmod +x .githooks/pre-push
```

:::note A site with no build step needs fewer of these
`check-solution-drift.mjs` and the `build`, `preview`, `check:drift`, and `verify:solution` commands exist to keep a compiled bundle in step with the solution that carries it. If your site is authored entirely in the design studio, skip them and keep the environment and deployment scripts.
:::

## Step 3: start each piece of work

- Pull the shared feature branch and re-import it, so you start from the team's baseline rather than yesterday's.
- Create your work branch: `git switch -c dev/<alias>/<topic>`.
- Load test data if you need it: `npm run seed`.

## Step 4: repeat while you build

![Daily inner-loop cycle of authoring, previewing, validating, and committing inside one developer environment before opening a pull request.](/img/reliable-alm/power-pages-alm-inner-development-cycle.svg)

*Repeat the local cycle as often as needed. Push and open a pull request only after the site source and unpacked solution pass validation together.*

- Publish your change to your own environment:

  ```bash
  npm run build
  pac pages upload-code-site --rootPath .
  ```

- Test on the site itself. Authentication, web roles, table permissions, and Dataverse calls only behave as they will in production when the site runs on Power Pages, so your development environment is the real test surface. `npm run dev` is for quick interface work, not for verifying behavior.
- Run `npm run lint` and `npm run test:unit` for fast feedback before you commit.
- Run `npm run sync:solution` to put source back in step. It builds the site, uploads it to your environment, then pulls the site components and the solution back into source.
- Run `npm run test:e2e` to run the same end-to-end suite the pull request will run.

## Step 5: check before you push

- `npm run verify:solution` must report no drift. It rebuilds the site and compares it to the committed solution.
- `npm run check:links` catches routes that no longer resolve.
- One commit carries both the site source and the unpacked solution.
- Push. The pre-push hook runs `verify:solution` and blocks the push if the solution is stale.

:::tip One command keeps the two halves in sync
The compiled site is committed inside the solution, so a code change that skips the sync ships stale code at the next promotion. `npm run sync:solution` does the whole sequence in the right order, and `npm run verify:solution` proves it worked. Wrapping this in a script is what stops the most common Power Pages ALM failure from depending on memory. The source of both is in [Appendix B](appendix-b-scripts.md).
:::

## Step 6: adopt the command set

These are every script a developer needs for day-to-day work, all defined in the `package.json` you added in Step 2. The full file is in [Appendix B.1](appendix-b-scripts.md#b1-package-json).

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

## Step 7: understand why the commands compose

The commands compose rather than duplicate. `verify:solution` calls `build` and `check:drift`, and the pull request runs the same `check:drift`.

A developer, the pre-push hook, and continuous integration therefore apply one definition of correct. That is what prevents the worst class of pipeline problem: a check that passes locally and fails in the pipeline for a reason nobody can reproduce.

## Checkpoint

You have completed this lab when:

- [ ] `package.json`, the two scripts, and the pre-push hook are committed.
- [ ] A developer can go from clone to a working site in their own environment using only the documented commands.
- [ ] `npm run sync:solution` completes and produces a commit containing both site source and solution changes.
- [ ] `npm run verify:solution` reports no drift on a clean checkout.
- [ ] The pre-push hook blocks a push after a deliberate code change made without a sync.
- [ ] Every developer has run `git config core.hooksPath .githooks`.

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

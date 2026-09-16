---
sidebar_position: 9
sidebar_label: "Appendix A: Workflow source"
title: "Appendix A: GitHub Actions workflow source"
className: powerPlatformGuide
---

# Appendix A: GitHub Actions workflow source

The workflows that carry the process described in [Lab 06](06-pull-request-gates.md) and [Lab 07](07-release-and-promote.md), reproduced verbatim so your team can read them before deciding whether to adopt the approach. Three workflows and one shared action do the whole job.

| File | Runs on | Role |
|---|---|---|
| [`pr-validation.yml`](#a1-pr-validation) | Every pull request | Blocks a merge that breaks the build, the tests, or the solution |
| [`ci-build.yml`](#a2-ci-build) | Merge to `develop` | Keeps the integration branch releasable at all times |
| [`cd-release.yml`](#a3-cd-release) | A version tag | Builds the release once and promotes it |
| [`promote-solution/action.yml`](#a4-promote-solution) | Called by the release | Installs one artifact into a target environment |
| [`dependabot.yml`](#a5-dependabot) | On a schedule | Proposes dependency and action version upgrades |

:::warning Before you copy these
Three things are specific to this code and must change for your workload: the solution name `SupplierInvoicePortal` in every path, the environment names `dev`, `qa`, and `prod`, and the pinned Power Platform CLI version. Secrets and variables come from GitHub environments, so nothing here carries a credential.
:::

![GitHub repository settings showing the Actions secrets page with the Power Platform service principal secrets PP_CLIENT_ID, PP_CLIENT_SECRET and PP_TENANT_ID.](/img/reliable-alm/actions-secrets.png)

*Actions secrets. The service principal credentials the workflows authenticate with. Store them once as encrypted secrets so no credential ever lives in the repository.*

![GitHub repository settings showing the Actions variables page with the non-secret configuration values the workflows read.](/img/reliable-alm/actions-variables.png)

*Actions variables. The non-secret configuration the workflows read, such as environment URLs and the production auto-promote switch. Change a value here to retarget the pipeline without editing a workflow.*

### A.1 `.github/workflows/pr-validation.yml` {#a1-pr-validation}

The change gate. Proves a pull request is safe to merge.

| | |
|---|---|
| **Triggers** | pull_request to `main` or `develop`, push to `main`, a nightly schedule, and manual dispatch |
| **Jobs** | `quality`, `web`, `solution`, `solution-checker`, `drift`, plus the scheduled `environment-drift` and manual `analyze` |
| **Blocks a merge when** | lint, tests, link scan, solution packaging, solution checker or bundle drift fail |

```yaml title=".github/workflows/pr-validation.yml"
name: PR validation

# Everything that verifies the repository without deploying it.
#
# Three trigger groups, each running a different set of jobs:
#
#   pull_request / push to main - the change gate (quality, web, solution,
#                                 solution-checker, drift)
#   schedule                    - nightly environment drift against Contoso-dev
#   workflow_dispatch           - CodeQL analysis, which is manual-only here
#
# What the change gate proves, in order of cost:
#   quality          - the source lints, type-checks, unit-tests and links resolve
#   web              - the SPA builds and the end-to-end suite passes against it
#   solution         - the unpacked solution XML is a valid build input, packed both ways
#   solution-checker - the packed solution passes Power Platform static analysis
#   drift            - the bundle committed inside the solution is what src/ builds
#
# The two drift checks are siblings and deliberately live together: `drift`
# catches a developer who changed React code without syncing, and
# `environment-drift` catches someone editing the site in the maker portal, which
# never touches src/ at all.

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main]
  schedule:
    # 06:00 UTC daily
    - cron: '0 6 * * *'
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  # The event name is part of the key on purpose. Without it, a push to main
  # would cancel an in-flight nightly drift run, because both share the same ref.
  group: pr-validation-${{ github.event_name }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  quality:
    name: Lint, type-check, unit tests and links
    if: ${{ github.event_name == 'pull_request' || github.event_name == 'push' }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7

      - uses: actions/setup-node@v7
        with:
          node-version: 22
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Audit dependencies
        run: npm audit --audit-level=high

      - name: Unit tests
        run: npm run test:unit

      # Routes resolve at runtime, so a link to a path that no longer exists
      # compiles and renders and simply drops the user on the 404 page. Nothing
      # in `tsc -b` catches that.
      - name: Link scan
        run: npm run check:links

  web:
    name: Build and test the SPA
    if: ${{ github.event_name == 'pull_request' || github.event_name == 'push' }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7

      - uses: actions/setup-node@v7
        with:
          node-version: 22
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Type-check and build
        run: npm run build

      - name: Install Playwright browser
        run: npx playwright install --with-deps chromium

      - name: Run end-to-end tests
        run: npm run test:e2e

      - name: Upload Playwright report
        uses: actions/upload-artifact@v7
        if: ${{ !cancelled() }}
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7

  solution:
    name: Validate Dataverse solution source
    if: ${{ github.event_name == 'pull_request' || github.event_name == 'push' }}
    # SolutionPackager is most reliable on Windows runners.
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v7

      - name: Install Power Platform CLI
        uses: microsoft/powerplatform-actions/actions-install@v1
        with:
          # actions-install defaults to the pac version baked into the action
          # release, and @v1 is a moving tag - so leaving this unset lets the tool
          # that packs the solution change underneath us. Pin it and bump on purpose.
          # Matches the version the solution source is authored with locally.
          pac-version-override: '2.9.3'

      # Packing both ways proves the unpacked XML under solutions/*/src is a
      # valid build input before anything is promoted.
      - name: Pack unmanaged
        uses: microsoft/powerplatform-actions/pack-solution@v1
        with:
          solution-folder: solutions/SupplierInvoicePortal/src
          solution-file: out/SupplierInvoicePortal.zip
          solution-type: Unmanaged

      - name: Pack managed
        uses: microsoft/powerplatform-actions/pack-solution@v1
        with:
          solution-folder: solutions/SupplierInvoicePortal/src
          solution-file: out/SupplierInvoicePortal_managed.zip
          solution-type: Managed

      - name: Upload solution packages
        uses: actions/upload-artifact@v7
        with:
          name: solution-packages
          path: out/*.zip
          retention-days: 7

  solution-checker:
    name: Run solution checker
    runs-on: windows-latest
    needs: solution
    # The checker is a hosted Power Platform service, so unlike the jobs above it
    # needs credentials. A pull request from a fork cannot read them, and it
    # should not fail on a gate it structurally cannot run.
    if: ${{ github.event_name == 'push' || github.event.pull_request.head.repo.full_name == github.repository }}
    environment: dev
    steps:
      - uses: actions/checkout@v7

      - name: Install Power Platform CLI
        uses: microsoft/powerplatform-actions/actions-install@v1
        with:
          pac-version-override: '2.9.3'

      - name: Download the packed solution
        uses: actions/download-artifact@v7
        with:
          name: solution-packages
          path: out

      # An unset secret interpolates to an empty string rather than failing, so
      # without this the checker reports a misleading authentication error
      # instead of "the dev environment was never configured".
      - name: Verify checker configuration
        id: config
        shell: pwsh
        env:
          PP_ENVIRONMENT_URL: ${{ vars.PP_ENVIRONMENT_URL }}
          PP_CLIENT_ID: ${{ secrets.PP_CLIENT_ID }}
          PP_CLIENT_SECRET: ${{ secrets.PP_CLIENT_SECRET }}
          PP_TENANT_ID: ${{ secrets.PP_TENANT_ID }}
        run: |
          $missing = @('PP_ENVIRONMENT_URL', 'PP_CLIENT_ID', 'PP_CLIENT_SECRET', 'PP_TENANT_ID') |
            Where-Object { [string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($_)) }

          if ($missing.Count) {
            @(
              "## Solution checker skipped"
              ""
              "The ``dev`` GitHub Environment is missing: $($missing -join ', ')."
              ""
              "See ``docs/alm/github-actions-setup.md`` to configure it."
            ) -join "`n" | Out-File -FilePath $env:GITHUB_STEP_SUMMARY -Append -Encoding utf8
            Write-Host "::warning::Solution checker skipped - dev environment not configured ($($missing -join ', '))."
            "configured=false" | Out-File -FilePath $env:GITHUB_OUTPUT -Append
          } else {
            "configured=true" | Out-File -FilePath $env:GITHUB_OUTPUT -Append
          }

      - name: Run solution checker
        if: ${{ steps.config.outputs.configured == 'true' }}
        uses: microsoft/powerplatform-actions/check-solution@v1
        with:
          environment-url: ${{ vars.PP_ENVIRONMENT_URL }}
          app-id: ${{ secrets.PP_CLIENT_ID }}
          client-secret: ${{ secrets.PP_CLIENT_SECRET }}
          tenant-id: ${{ secrets.PP_TENANT_ID }}
          path: out/SupplierInvoicePortal_managed.zip
          fail-on-analysis-error: true

  drift:
    name: Solution matches the SPA build
    if: ${{ github.event_name == 'pull_request' || github.event_name == 'push' }}
    runs-on: ubuntu-latest
    # The solution carries the compiled bundle and is what QA and prod receive.
    # Without this gate a PR can change src/ and ship stale code on the next
    # promotion, because nothing in git ties the two together.
    steps:
      - uses: actions/checkout@v7

      - uses: actions/setup-node@v7
        with:
          node-version: 22
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Compare build output against solution source
        run: npm run check:drift

  # ---------------------------------------------------------------------------
  # Nightly: environment drift
  # ---------------------------------------------------------------------------

  environment-drift:
    name: Compare Contoso-dev against committed solution source
    if: ${{ github.event_name == 'schedule' }}
    runs-on: windows-latest
    environment: dev

    # Catches the drift the change gate cannot see.
    #
    # The `drift` job above compares the committed bundle against what src/
    # builds - that catches a developer who changes React code and forgets to
    # sync. It cannot catch someone editing site settings, table permissions, web
    # pages or tables directly in the Contoso-dev maker portal, because those
    # changes never touch src/.
    #
    # This job pulls the current state of dev into solution source and fails if
    # the result differs from what is committed.
    steps:
      - uses: actions/checkout@v7

      - name: Install Power Platform CLI
        uses: microsoft/powerplatform-actions/actions-install@v1
        with:
          # Pinned to match the other jobs. An unpinned pac here would report
          # drift caused by a CLI serialisation change rather than a real edit.
          pac-version-override: '2.9.3'
          # This job calls `pac` directly from run: steps rather than through the
          # powerplatform-actions wrappers, so the CLI has to be on PATH. The
          # action does not do that unless asked.
          add-tools-to-path: true

      - name: Verify dev environment configuration
        shell: pwsh
        env:
          PP_CLIENT_ID: ${{ secrets.PP_CLIENT_ID }}
          PP_CLIENT_SECRET: ${{ secrets.PP_CLIENT_SECRET }}
          PP_TENANT_ID: ${{ secrets.PP_TENANT_ID }}
          PP_ENVIRONMENT_URL: ${{ vars.PP_ENVIRONMENT_URL }}
        # An unset secret interpolates to an empty string rather than failing, so
        # without this the job reaches `pac auth create` with every argument blank
        # and reports a misleading CLI error instead of the real cause.
        run: |
          $required = @{
            PP_CLIENT_ID       = 'secret'
            PP_CLIENT_SECRET   = 'secret'
            PP_TENANT_ID       = 'secret'
            PP_ENVIRONMENT_URL = 'variable'
          }
          $missing = $required.Keys | Where-Object {
            [string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($_))
          } | Sort-Object

          if ($missing.Count -eq 0) {
            Write-Host "All required dev environment values are present."
            exit 0
          }

          $lines = @(
            "## Cannot check for drift: the ``dev`` environment is not configured"
            ""
            "These values are missing from the ``dev`` GitHub Environment:"
            ""
          ) + ($missing | ForEach-Object { "- ``$_`` ($($required[$_]))" }) + @(
            ""
            "Add them under **Settings > Environments > dev**. They must come from a"
            "service principal that has been granted access to Contoso-dev:"
            ""
            '```'
            "pac admin create-service-principal --environment <Contoso-dev url>"
            '```'
          )
          $lines -join "`n" | Out-File -FilePath $env:GITHUB_STEP_SUMMARY -Append -Encoding utf8

          Write-Error "Missing dev environment configuration: $($missing -join ', ')"
          exit 1

      - name: Authenticate to Contoso-dev
        shell: pwsh
        # Passed through env rather than interpolated into the command line so a
        # blank or shell-significant value cannot reshape the arguments.
        env:
          PP_CLIENT_ID: ${{ secrets.PP_CLIENT_ID }}
          PP_CLIENT_SECRET: ${{ secrets.PP_CLIENT_SECRET }}
          PP_TENANT_ID: ${{ secrets.PP_TENANT_ID }}
          PP_ENVIRONMENT_URL: ${{ vars.PP_ENVIRONMENT_URL }}
        run: >
          pac auth create
          --applicationId $env:PP_CLIENT_ID
          --clientSecret $env:PP_CLIENT_SECRET
          --tenant $env:PP_TENANT_ID
          --environment $env:PP_ENVIRONMENT_URL

      - name: Sync solution source from dev
        working-directory: solutions/SupplierInvoicePortal
        run: pac solution sync --packagetype Both

      - name: Ignore Dataverse service-version metadata
        run: node scripts/restore-volatile-solution-metadata.mjs

      - name: Report drift
        shell: pwsh
        run: |
          $changed = git status --porcelain
          if ([string]::IsNullOrWhiteSpace($changed)) {
            "No drift. Contoso-dev matches committed solution source." |
              Out-File -FilePath $env:GITHUB_STEP_SUMMARY -Append -Encoding utf8
            exit 0
          }

          $lines = @(
            "## Environment drift detected"
            ""
            "Contoso-dev contains changes that are not committed. Someone most likely"
            "edited the site or schema in the maker portal without running the sync step."
            ""
            '```'
            $changed
            '```'
            ""
            "### To resolve"
            ""
            "On a machine authenticated to Contoso-dev:"
            ""
            '```'
            "cd solutions/SupplierInvoicePortal"
            "pac solution sync --packagetype Both"
            '```'
            ""
            "Review the diff, then commit it. If the change was unintentional, revert it"
            "in the maker portal instead."
          )
          $lines -join "`n" | Out-File -FilePath $env:GITHUB_STEP_SUMMARY -Append -Encoding utf8

          Write-Error "Environment drift detected - see the job summary."
          exit 1

      - name: Upload drift diff
        if: failure()
        shell: pwsh
        # Stage first: a sync can pull down brand new files (a new web page, a
        # new table), and `git diff` alone never shows untracked content, so the
        # patch would come back empty for exactly the drift worth reviewing.
        run: |
          git add -A
          git diff --cached > drift.patch

      - uses: actions/upload-artifact@v7
        if: failure()
        with:
          name: drift-patch
          path: drift.patch
          retention-days: 14

  # ---------------------------------------------------------------------------
  # Manual: CodeQL
  # ---------------------------------------------------------------------------

  analyze:
    name: Analyze TypeScript
    # Manual-only until code scanning is enabled on the repository.
    #
    # The analysis itself runs fine, but the upload needs code scanning turned
    # on, which on a private repository requires GitHub Advanced Security.
    # Without it the job fails at the final step with "Code scanning is not
    # enabled for this repository" and every pull request carries a red check
    # that says nothing about the code.
    #
    # Once the repository is public or GHAS is licensed, widen this condition to
    # include pull_request, push and schedule.
    if: ${{ github.event_name == 'workflow_dispatch' }}
    runs-on: ubuntu-latest
    # Job-level permissions replace the workflow default rather than adding to it,
    # so contents: read has to be restated or checkout cannot read a private repo.
    # actions: read is required on private repositories for the results upload.
    permissions:
      actions: read
      contents: read
      security-events: write
    steps:
      - uses: actions/checkout@v7

      - uses: github/codeql-action/init@v4
        with:
          languages: javascript-typescript
          build-mode: none
          # The solution carries a copy of the minified bundle. Scanning it adds
          # nothing and buries real findings in generated code.
          config: |
            paths-ignore:
              - solutions/**
              - dist/**
              - test-results/**

      - uses: github/codeql-action/analyze@v4
```

### A.2 `.github/workflows/ci-build.yml` {#a2-ci-build}

Continuous integration on the integration branch. Keeps `develop` permanently releasable.

| | |
|---|---|
| **Triggers** | push to `develop`, and manual dispatch |
| **Produces** | a build candidate: both solution types plus build metadata, retained for 14 days |
| **Does not** | publish a release or deploy to any environment |

```yaml title=".github/workflows/ci-build.yml"
name: CI build

# Continuous integration on the shared integration branch.
#
# Everything merged to develop is built and packed once, so the state of the
# integration branch is always a known-good, downloadable artifact rather than
# something that only exists if someone runs a build locally. That gives the team
# a candidate to smoke-test before a release is cut, and it means a release cut
# from develop is never the first time the branch has been packed.
#
# This workflow does NOT publish a release and does NOT deploy. Release artifacts
# come from cd-release.yml on a tag, because those are the bytes that reach an
# environment and they must be traceable to a version. Artifacts here are build
# candidates: versioned by run number, retained for a fortnight, then discarded.

on:
  push:
    branches: [develop]
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  group: ci-build-${{ github.ref }}
  cancel-in-progress: true

jobs:
  build:
    name: Build the site and pack both solution types
    # SolutionPackager is most reliable on Windows runners, and packing here has
    # to behave identically to the release, so both run on the same platform.
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v7

      - uses: actions/setup-node@v7
        with:
          node-version: 22
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Type-check and build the site
        run: npm run build

      # develop is the branch a release is cut from, so the same gate that
      # protects the pull request has to hold on the merge result too. Two clean
      # PRs can merge in either order and produce a tree where the committed
      # bundle no longer matches src/.
      - name: Compare build output against solution source
        run: npm run check:drift

      - name: Name the build candidate
        id: candidate
        shell: pwsh
        run: |
          $version = "0.0.0-develop.${{ github.run_number }}"
          "version=$version" | Out-File -FilePath $env:GITHUB_OUTPUT -Append
          Write-Host "Build candidate $version"

      - name: Install Power Platform CLI
        uses: microsoft/powerplatform-actions/actions-install@v1
        with:
          # Pinned to match every other workflow. An unpinned pac here would pack
          # with a different SolutionPackager than the release does, so a
          # candidate that passes would not prove the release will.
          pac-version-override: '2.9.3'

      - name: Pack unmanaged
        uses: microsoft/powerplatform-actions/pack-solution@v1
        with:
          solution-folder: solutions/SupplierInvoicePortal/src
          solution-file: out/SupplierInvoicePortal.zip
          solution-type: Unmanaged

      - name: Pack managed
        uses: microsoft/powerplatform-actions/pack-solution@v1
        with:
          solution-folder: solutions/SupplierInvoicePortal/src
          solution-file: out/SupplierInvoicePortal_managed.zip
          solution-type: Managed

      # Records which commit a candidate came from. The same shape as the
      # provenance the release writes, so anything that reads one reads both.
      - name: Write build metadata
        shell: pwsh
        run: |
          $manifest = [ordered]@{
            solution   = 'SupplierInvoicePortal'
            version    = '${{ steps.candidate.outputs.version }}'
            commit     = '${{ github.sha }}'
            ref        = '${{ github.ref_name }}'
            runId      = '${{ github.run_id }}'
            builtAtUtc = (Get-Date).ToUniversalTime().ToString('o')
            candidate  = $true
          }
          $manifest | ConvertTo-Json | Set-Content -Path out/build-metadata.json -Encoding utf8

      - name: Upload build candidate
        uses: actions/upload-artifact@v7
        with:
          name: develop-candidate-${{ steps.candidate.outputs.version }}
          path: |
            out/*.zip
            out/build-metadata.json
          # Long enough to cover a sprint, short enough that candidates do not
          # accumulate. Anything worth keeping becomes a release.
          retention-days: 14

      - name: Summarize
        if: ${{ !cancelled() }}
        shell: pwsh
        run: |
          @(
            "## Build candidate ``${{ steps.candidate.outputs.version }}``"
            ""
            "| | |"
            "|---|---|"
            "| Commit | ``${{ github.sha }}`` |"
            "| Branch | ``${{ github.ref_name }}`` |"
            ""
            "Managed and unmanaged solutions packed and uploaded as artifacts, retained for 14 days."
            ""
            "This is **not** a release. To ship this state, cut a release from ``main`` with"
            "**Actions -> CD release**, mode ``release``, which verifies, tags, packs and promotes to QA."
          ) -join "`n" | Out-File -FilePath $env:GITHUB_STEP_SUMMARY -Append -Encoding utf8
```

### A.3 `.github/workflows/cd-release.yml` {#a3-cd-release}

Everything that touches a Power Platform environment. Builds the release once, then promotes it.

| | |
|---|---|
| **Triggers** | a `v*` tag, and manual dispatch with a mode |
| **Modes** | `release` (verify, tag, pack, publish, promote to QA), `promote` (install a published release, including rollback), `seed` (load a dataset) |
| **Gates** | refuses to release from a non-default branch; production runs in a GitHub Environment that requires approval |

```yaml title=".github/workflows/cd-release.yml"
name: CD release

# Everything that touches a Power Platform environment.
#
# Three modes, selected on dispatch:
#
#   release  - verify main, tag it, pack, publish the GitHub Release, promote to QA
#   promote  - install an already-published release into qa or prod (also rollback)
#   seed     - load the base or demo dataset into dev or qa
#
# Build once, deploy many. The `release` mode is the only place a promotable
# artifact is produced, and promotion never repacks - it installs the bytes
# published on the release. That is what makes the artifact signed off in QA
# provably the artifact installed in prod, and it makes rollback trivial: promote
# an older tag.
#
#   dispatch(release) ─► verify ─► tag ─► release ─► promote to qa ─► (approval) ─► prod
#   push tag v*                        ─► release ─► promote to qa
#   dispatch(promote) ─────────────────────────────► promote to <target>
#   dispatch(seed)    ─────────────────────────────► seed <target>
#
# Why tagging and packing live in the SAME workflow
#
# A tag pushed with the default GITHUB_TOKEN does NOT start a new workflow run -
# GitHub suppresses that to prevent recursion. When these were two workflows, the
# tag was created and nothing happened; the release silently never built. Running
# both in one dispatch removes the cross-workflow hop entirely, with no PAT.
# The `push: tags` trigger is kept for tags pushed by a human, which do fire.

on:
  push:
    tags:
      - 'v*'

  workflow_dispatch:
    inputs:
      mode:
        description: What to do
        type: choice
        required: true
        default: release
        options:
          - release
          - promote
          - seed

      # --- release mode -----------------------------------------------------
      version:
        description: 'release: version, three parts, for example 1.0.1 (the run number is appended)'
        type: string
        required: false
      prerelease:
        description: 'release: mark as a pre-release (tags with an -rc suffix)'
        type: boolean
        default: false

      # --- promote and seed modes -------------------------------------------
      release_tag:
        description: 'promote/seed: release to use. "latest", or a version or tag, for example 1.0.2.2'
        type: string
        required: false
        default: latest
      target:
        description: 'promote/seed: target environment'
        type: choice
        default: qa
        options:
          - dev
          - qa
          - prod

      # --- promote mode -----------------------------------------------------
      upgrade_mode:
        description: 'promote: upgrade removes components dropped since the last release; update leaves them behind'
        type: choice
        default: upgrade
        options:
          - upgrade
          - update

      # --- seed mode --------------------------------------------------------
      data_set:
        description: 'seed: base = vendor account and purchase orders; demo = base plus ten invoices'
        type: choice
        default: base
        options:
          - base
          - demo
      contact:
        description: 'seed: email of the contact to own the data. Required for demo. Must already have signed in once.'
        type: string
        required: false
      admin:
        description: 'seed: optional email of a contact to add to the Administrators web role'
        type: string
        required: false
      dry_run:
        description: 'seed: report the planned changes without writing'
        type: boolean
        default: true

permissions:
  contents: read

concurrency:
  group: cd-release-${{ github.event.inputs.mode || 'release' }}-${{ github.ref }}
  cancel-in-progress: false

jobs:
  # ---------------------------------------------------------------------------
  # release mode
  # ---------------------------------------------------------------------------

  verify:
    name: Verify the release candidate
    if: ${{ github.event_name == 'workflow_dispatch' && inputs.mode == 'release' }}
    runs-on: ubuntu-latest
    steps:
      - name: Refuse to release from a non-default branch
        if: ${{ github.ref_name != 'main' }}
        run: |
          echo "Releases are cut from main only. Current ref: ${{ github.ref_name }}" >&2
          exit 1

      - name: Require a version
        if: ${{ inputs.version == '' }}
        run: |
          echo "Release mode needs a version, for example 1.0.1" >&2
          exit 1

      - uses: actions/checkout@v7

      - uses: actions/setup-node@v7
        with:
          node-version: 22
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Unit tests
        run: npm run test:unit

      - name: Link scan
        run: npm run check:links

      - name: Type-check and build
        run: npm run build

      - name: Install Playwright browser
        run: npx playwright install --with-deps chromium

      - name: Run end-to-end tests
        run: npm run test:e2e

      # The release artifact carries the committed bundle, not the one just
      # built. This proves they are the same before anything is tagged.
      - name: Compare build output against solution source
        run: npm run check:drift

  tag:
    name: Tag the release
    needs: verify
    runs-on: ubuntu-latest
    permissions:
      contents: write # create and push the tag
    outputs:
      tag: ${{ steps.version.outputs.tag }}
    steps:
      - uses: actions/checkout@v7
        with:
          # The tag is annotated against the full history so `git describe` and
          # the changelog range below can see previous tags.
          fetch-depth: 0

      # The build segment comes from the run number, which never repeats. That is
      # what makes every release strictly greater than the last one - a hand-typed
      # version can regress, and a lower version behaves unpredictably on import.
      - name: Choose and validate the version
        id: version
        shell: bash
        env:
          BASE_VERSION: ${{ inputs.version }}
          GH_TOKEN: ${{ github.token }}
        run: |
          set -euo pipefail

          if [[ ! "$BASE_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
            echo "Version must be three dot-separated numbers, for example 1.0.1" >&2
            exit 1
          fi

          version="${BASE_VERSION}.${{ github.run_number }}"
          tag="v${version}"
          if [ "${{ inputs.prerelease }}" = "true" ]; then
            tag="${tag}-rc"
          fi

          if git rev-parse "$tag" >/dev/null 2>&1; then
            echo "Tag $tag already exists." >&2
            exit 1
          fi

          # Compare against what has actually been published, not just what is
          # tagged: a tag that never produced a release should not block reuse of
          # a higher number, and a published release must never be undercut.
          latest="$(gh release list --limit 100 --json tagName --jq '.[].tagName' \
            | sed 's/^v//; s/-rc$//' \
            | grep -E '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$' \
            | sort -V \
            | tail -n1 || true)"

          if [ -n "$latest" ]; then
            highest="$(printf '%s\n%s\n' "$latest" "$version" | sort -V | tail -n1)"
            if [ "$highest" = "$latest" ]; then
              echo "Release version $version must be greater than the latest published version $latest." >&2
              exit 1
            fi
          fi

          echo "version=$version" >> "$GITHUB_OUTPUT"
          echo "tag=$tag" >> "$GITHUB_OUTPUT"
          echo "Tagging $tag"

      - name: Create and push the tag
        env:
          TAG: ${{ steps.version.outputs.tag }}
          VERSION: ${{ steps.version.outputs.version }}
        run: |
          set -euo pipefail
          git config user.name 'github-actions[bot]'
          git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
          git tag -a "$TAG" -m "Release $VERSION from ${GITHUB_SHA}"
          git push origin "$TAG"

  # ---------------------------------------------------------------------------
  # Packing and publishing. Runs for a dispatched release (after tagging) and for
  # a tag pushed by a human.
  # ---------------------------------------------------------------------------

  release:
    name: Pack and publish the release
    needs: tag
    # `always()` is required because `needs: tag` is skipped on a tag push, and a
    # skipped dependency would otherwise skip this job too.
    if: ${{ always() && (github.event_name == 'push' || (needs.tag.result == 'success' && inputs.mode == 'release')) }}
    runs-on: windows-latest
    environment: dev
    permissions:
      contents: write # publish the GitHub Release
    outputs:
      tag: ${{ steps.version.outputs.tag }}
    steps:
      - uses: actions/checkout@v7
        with:
          # On a dispatched release the tag was created moments ago in another
          # job, so check it out explicitly rather than relying on the ref the
          # run started from.
          ref: ${{ github.event_name == 'push' && github.ref || needs.tag.outputs.tag }}
          # The changelog needs the commits since the previous tag, and the
          # previous tag has to be visible to find them.
          fetch-depth: 0

      - uses: actions/setup-node@v7
        with:
          node-version: 22
          cache: npm

      - name: Derive the version from the tag
        id: version
        shell: pwsh
        env:
          TAG_NAME: ${{ github.event_name == 'push' && github.ref_name || needs.tag.outputs.tag }}
        run: |
          $tag = $env:TAG_NAME
          $version = $tag -replace '^v', '' -replace '-rc$', ''
          if ($version -notmatch '^\d+\.\d+\.\d+\.\d+$') {
            Write-Error "Tag '$tag' does not carry a four-part version. Cut releases with Actions > CD release, mode release."
            exit 1
          }
          $prerelease = $tag.EndsWith('-rc')
          "version=$version" | Out-File -FilePath $env:GITHUB_OUTPUT -Append
          "tag=$tag"         | Out-File -FilePath $env:GITHUB_OUTPUT -Append
          "prerelease=$($prerelease.ToString().ToLower())" | Out-File -FilePath $env:GITHUB_OUTPUT -Append
          Write-Host "Releasing $version from $tag"

      - name: Install dependencies
        run: npm ci

      - name: Type-check and build
        run: npm run build

      # The release carries the committed bundle, not the one just built. The
      # pre-tag gate proved they matched on main; this proves it again on the
      # immutable ref that is actually being shipped.
      - name: Compare build output against solution source
        run: npm run check:drift

      - name: Install Power Platform CLI
        uses: microsoft/powerplatform-actions/actions-install@v1
        with:
          # Pinned so the artifact this workflow publishes is reproducible: @v1 is a
          # moving tag and carries its own default pac version.
          pac-version-override: '2.9.3'

      # `pac solution version` only exposes --buildversion / --revisionversion, so
      # it cannot stamp an arbitrary four-part version. Solution.xml holds a single
      # <Version> element, so edit it directly. This edit is never committed - it
      # exists only for the duration of the pack.
      - name: Stamp solution version
        shell: pwsh
        env:
          VERSION: ${{ steps.version.outputs.version }}
        run: |
          $path = 'solutions/SupplierInvoicePortal/src/Other/Solution.xml'
          $raw = Get-Content $path -Raw
          $updated = [regex]::Replace($raw, '<Version>[^<]*</Version>', "<Version>$env:VERSION</Version>", 1)
          if ($updated -eq $raw) {
            Write-Error "Could not find a <Version> element in $path"
            exit 1
          }
          Set-Content -Path $path -Value $updated -NoNewline
          Write-Host "Stamped solution version $env:VERSION"

      - name: Pack managed solution
        uses: microsoft/powerplatform-actions/pack-solution@v1
        with:
          solution-folder: solutions/SupplierInvoicePortal/src
          solution-file: out/SupplierInvoicePortal_managed.zip
          solution-type: Managed

      - name: Run solution checker
        uses: microsoft/powerplatform-actions/check-solution@v1
        with:
          environment-url: ${{ vars.PP_ENVIRONMENT_URL }}
          app-id: ${{ secrets.PP_CLIENT_ID }}
          client-secret: ${{ secrets.PP_CLIENT_SECRET }}
          tenant-id: ${{ secrets.PP_TENANT_ID }}
          path: out/SupplierInvoicePortal_managed.zip
          fail-on-analysis-error: true

      # Records what shipped and from where, so an installed version can be traced
      # back to a commit without reading workflow logs.
      - name: Write provenance
        shell: pwsh
        run: |
          $manifest = [ordered]@{
            solution   = 'SupplierInvoicePortal'
            version    = '${{ steps.version.outputs.version }}'
            commit     = '${{ github.sha }}'
            ref        = '${{ steps.version.outputs.tag }}'
            runId      = '${{ github.run_id }}'
            builtAtUtc = (Get-Date).ToUniversalTime().ToString('o')
          }
          $manifest | ConvertTo-Json | Set-Content -Path out/provenance.json -Encoding utf8

      # What changed since the last release, derived from the squashed pull
      # request commits rather than hand-maintained, so it cannot fall behind.
      - name: Generate the changelog
        shell: bash
        env:
          TAG: ${{ steps.version.outputs.tag }}
        run: |
          set -euo pipefail
          previous="$(git describe --tags --abbrev=0 "${TAG}^" 2>/dev/null || true)"

          if [ -n "$previous" ]; then
            range="${previous}..${TAG}"
            heading="Changes since ${previous}"
          else
            range="$TAG"
            heading="Initial release"
          fi

          {
            echo "# Changelog"
            echo
            echo "## ${TAG}"
            echo
            echo "_${heading}_"
            echo
            git log --no-merges --pretty=format:'- %s (%h)' "$range"
            echo
          } > out/CHANGELOG.md

          cat out/CHANGELOG.md

      # A dependency inventory for the shipped bundle. Production dependencies
      # only: dev tooling never reaches an environment, and including it turns a
      # supply-chain answer into noise.
      - name: Generate the SBOM
        shell: bash
        run: npm sbom --sbom-format cyclonedx --omit dev > out/sbom.cyclonedx.json

      # Seed data ships with the solution so a given release always carries the
      # dataset that matches its schema. Flattened names keep the release assets
      # self-describing.
      - name: Stage seed data
        shell: pwsh
        run: |
          Copy-Item seed/base.json out/seed-base.json
          Copy-Item seed/demo.json out/seed-demo.json

      - name: Publish the release
        shell: pwsh
        env:
          GH_TOKEN: ${{ github.token }}
          TAG: ${{ steps.version.outputs.tag }}
        run: |
          $ghArgs = @(
            'release', 'create', $env:TAG,
            'out/SupplierInvoicePortal_managed.zip',
            'out/provenance.json',
            'out/CHANGELOG.md',
            'out/sbom.cyclonedx.json',
            'out/seed-base.json',
            'out/seed-demo.json',
            '--target', '${{ github.sha }}',
            '--title', $env:TAG,
            '--notes-file', 'out/CHANGELOG.md'
          )
          if ('${{ steps.version.outputs.prerelease }}' -eq 'true') { $ghArgs += '--prerelease' }
          gh @ghArgs
          "Published release ``$env:TAG``. Promoting to QA next." |
            Out-File -FilePath $env:GITHUB_STEP_SUMMARY -Append -Encoding utf8

  # ---------------------------------------------------------------------------
  # Promotion. Automatic to QA after a release; manual for prod and rollback.
  # ---------------------------------------------------------------------------

  promote-qa:
    name: Promote to QA
    needs: release
    if: ${{ always() && needs.release.result == 'success' }}
    runs-on: windows-latest
    environment: qa
    permissions:
      contents: write # attach the QA attestation to the release
    outputs:
      release-tag: ${{ steps.promote.outputs.release-tag }}
    concurrency:
      group: promote-qa
      cancel-in-progress: false
    steps:
      - uses: actions/checkout@v7

      - uses: actions/setup-node@v7
        with:
          node-version: 22
          cache: npm

      - name: Promote
        id: promote
        uses: ./.github/actions/promote-solution
        with:
          target: qa
          release-tag: ${{ needs.release.outputs.tag }}
          upgrade-mode: upgrade
          seed-if-missing: 'true'
          environment-url: ${{ vars.PP_ENVIRONMENT_URL }}
          site-url: ${{ vars.PP_SITE_URL }}
          client-id: ${{ secrets.PP_CLIENT_ID }}
          client-secret: ${{ secrets.PP_CLIENT_SECRET }}
          tenant-id: ${{ secrets.PP_TENANT_ID }}
          github-token: ${{ github.token }}

      # Production refuses a release that has not been through QA, so this is the
      # evidence that gate reads.
      - name: Attach QA evidence to the release
        shell: pwsh
        env:
          GH_TOKEN: ${{ github.token }}
          RELEASE_TAG: ${{ steps.promote.outputs.release-tag }}
          RELEASE_COMMIT: ${{ steps.promote.outputs.provenance-commit }}
        run: |
          $attestation = [ordered]@{
            releaseTag    = $env:RELEASE_TAG
            commit        = $env:RELEASE_COMMIT
            verifiedBy    = '${{ github.actor }}'
            workflowRunId = '${{ github.run_id }}'
            verifiedAtUtc = (Get-Date).ToUniversalTime().ToString('o')
          }
          $path = Join-Path $env:RUNNER_TEMP 'qa-attestation.json'
          $attestation | ConvertTo-Json | Set-Content -Path $path -Encoding utf8
          gh release upload $env:RELEASE_TAG $path --clobber

  promote-prod:
    name: Promote to production
    needs: [release, promote-qa]
    # Production promotion after a release is deliberately NOT automatic.
    #
    # The ALM proposal puts prod here behind an approval gate, and this job is
    # wired for exactly that. What is missing is the gate itself: required
    # reviewers on a GitHub Environment need a paid plan on a private repository,
    # and this one returns 422. Without that, `environment: prod` pauses for
    # nobody and this job would ship to production unattended.
    #
    # So it stays behind an explicit opt-in. Set the repository variable
    # PROD_AUTO_PROMOTE to 'true' only once required reviewers are configured on
    # the prod environment. Until then, promote production by running this
    # workflow again in `promote` mode, which is at least a deliberate act by a
    # named person. See docs/alm/github-actions-setup.md.
    if: ${{ always() && needs.promote-qa.result == 'success' && vars.PROD_AUTO_PROMOTE == 'true' }}
    runs-on: windows-latest
    environment: prod
    concurrency:
      group: promote-prod
      cancel-in-progress: false
    steps:
      - uses: actions/checkout@v7

      - uses: actions/setup-node@v7
        with:
          node-version: 22
          cache: npm

      - name: Promote
        uses: ./.github/actions/promote-solution
        with:
          target: prod
          release-tag: ${{ needs.release.outputs.tag }}
          upgrade-mode: upgrade
          seed-if-missing: 'false'
          environment-url: ${{ vars.PP_ENVIRONMENT_URL }}
          site-url: ${{ vars.PP_SITE_URL }}
          client-id: ${{ secrets.PP_CLIENT_ID }}
          client-secret: ${{ secrets.PP_CLIENT_SECRET }}
          tenant-id: ${{ secrets.PP_TENANT_ID }}
          github-token: ${{ github.token }}

  prod-instructions:
    name: Explain how to reach production
    needs: [release, promote-qa]
    if: ${{ always() && needs.promote-qa.result == 'success' && vars.PROD_AUTO_PROMOTE != 'true' }}
    runs-on: ubuntu-latest
    steps:
      - name: Summarize the manual step
        env:
          TAG: ${{ needs.release.outputs.tag }}
        run: |
          {
            echo "## \`$TAG\` is in QA"
            echo
            echo "Production promotion is manual on this repository because required reviewers"
            echo "cannot be configured on the prod environment under the current plan, so an"
            echo "automatic prod job would deploy with no approval at all."
            echo
            echo "To ship it:"
            echo
            echo "1. Verify \`$TAG\` in QA."
            echo "2. **Actions -> CD release -> Run workflow**, mode \`promote\`, release tag \`$TAG\`, target \`prod\`."
            echo
            echo "Treat this as a two-person step until required reviewers are available, then set"
            echo "the repository variable \`PROD_AUTO_PROMOTE\` to \`true\` to let this workflow do it."
          } >> "$GITHUB_STEP_SUMMARY"

  # ---------------------------------------------------------------------------
  # promote mode - manual promotion and rollback
  # ---------------------------------------------------------------------------

  promote:
    name: Promote ${{ inputs.release_tag }} to ${{ inputs.target }}
    if: ${{ github.event_name == 'workflow_dispatch' && inputs.mode == 'promote' }}
    runs-on: windows-latest
    # Approval gates and the environment URL live on the GitHub Environment.
    # Add required reviewers on 'prod' to force a manual approval.
    environment: ${{ inputs.target }}
    permissions:
      contents: write # attach the QA attestation when promoting to qa
    # Two promotions racing into the same environment can interleave an import
    # with a site restart and leave the runtime serving a half-updated site.
    concurrency:
      group: promote-${{ inputs.target }}
      cancel-in-progress: false
    steps:
      - name: Refuse to promote into a developer environment
        if: ${{ inputs.target == 'dev' }}
        shell: bash
        run: |
          echo "dev is authored in, not promoted into. Choose qa or prod." >&2
          exit 1

      - uses: actions/checkout@v7

      - uses: actions/setup-node@v7
        with:
          node-version: 22
          cache: npm

      - name: Promote
        id: promote
        uses: ./.github/actions/promote-solution
        with:
          target: ${{ inputs.target }}
          release-tag: ${{ inputs.release_tag }}
          upgrade-mode: ${{ inputs.upgrade_mode }}
          seed-if-missing: 'true'
          environment-url: ${{ vars.PP_ENVIRONMENT_URL }}
          site-url: ${{ vars.PP_SITE_URL }}
          client-id: ${{ secrets.PP_CLIENT_ID }}
          client-secret: ${{ secrets.PP_CLIENT_SECRET }}
          tenant-id: ${{ secrets.PP_TENANT_ID }}
          github-token: ${{ github.token }}

      - name: Attach QA evidence to the release
        if: ${{ inputs.target == 'qa' }}
        shell: pwsh
        env:
          GH_TOKEN: ${{ github.token }}
          RELEASE_TAG: ${{ steps.promote.outputs.release-tag }}
          RELEASE_COMMIT: ${{ steps.promote.outputs.provenance-commit }}
        run: |
          $attestation = [ordered]@{
            releaseTag    = $env:RELEASE_TAG
            commit        = $env:RELEASE_COMMIT
            verifiedBy    = '${{ github.actor }}'
            workflowRunId = '${{ github.run_id }}'
            verifiedAtUtc = (Get-Date).ToUniversalTime().ToString('o')
          }
          $path = Join-Path $env:RUNNER_TEMP 'qa-attestation.json'
          $attestation | ConvertTo-Json | Set-Content -Path $path -Encoding utf8
          gh release upload $env:RELEASE_TAG $path --clobber

  # ---------------------------------------------------------------------------
  # seed mode
  # ---------------------------------------------------------------------------

  seed:
    name: Seed ${{ inputs.target }} with ${{ inputs.data_set }}
    if: ${{ github.event_name == 'workflow_dispatch' && inputs.mode == 'seed' }}
    runs-on: ubuntu-latest
    environment: ${{ inputs.target }}
    concurrency:
      group: seed-${{ inputs.target }}
      cancel-in-progress: false
    steps:
      # The script refuses the production host independently of this check, so
      # prod is guarded twice: sample suppliers and fabricated invoices in a
      # financial workflow are a hazard, not untidiness.
      - name: Refuse to seed production
        if: ${{ inputs.target == 'prod' }}
        run: |
          echo "Production is never seeded. Choose dev or qa." >&2
          exit 1

      - uses: actions/checkout@v7

      - uses: actions/setup-node@v7
        with:
          node-version: 22

      # Nothing here should require knowing a tag by heart. Blank or "latest"
      # resolves to the newest release; otherwise the input is normalised,
      # because solution versions carry no prefix (1.0.2.2) while tags do
      # (v1.0.2.2) and provenance.json reports the unprefixed form.
      - name: Resolve the release tag
        id: release
        shell: bash
        env:
          GH_TOKEN: ${{ github.token }}
          INPUT_TAG: ${{ inputs.release_tag }}
        run: |
          raw="${INPUT_TAG:-latest}"

          if [ "$raw" = "latest" ]; then
            tag="$(gh release view --json tagName --jq .tagName 2>/dev/null)" || tag=""
            if [ -z "$tag" ]; then
              echo 'This repository has no releases yet. Cut one with Actions > CD release, mode release.' >&2
              exit 1
            fi
          else
            tag="v${raw#v}"
            if ! gh release view "$tag" >/dev/null 2>&1; then
              {
                echo "## Release \`$tag\` does not exist"
                echo
                echo 'Use `latest`, or pick one of:'
                echo
                gh release list --limit 20 --json tagName --jq '.[] | "- `\(.tagName)`"'
              } >> "$GITHUB_STEP_SUMMARY"
              echo "Release '$tag' does not exist. The job summary lists the valid tags." >&2
              exit 1
            fi
          fi

          echo "tag=$tag" >> "$GITHUB_OUTPUT"
          echo "Using release '$tag'."

      # Taken from the release rather than the branch, so the data matches the
      # solution version the environment is running.
      - name: Download the released seed data
        shell: bash
        env:
          GH_TOKEN: ${{ github.token }}
          TAG: ${{ steps.release.outputs.tag }}
        run: |
          if gh release download "$TAG" --pattern 'seed-*.json' --dir seed-release --clobber 2>/dev/null; then
            if [ -f seed-release/seed-base.json ]; then mv seed-release/seed-base.json seed/base.json; fi
            if [ -f seed-release/seed-demo.json ]; then mv seed-release/seed-demo.json seed/demo.json; fi
            echo "Using the seed data published with $TAG."
          else
            echo "$TAG predates published seed data; using the repository copy."
          fi

      - name: Seed
        env:
          PP_ENVIRONMENT_URL: ${{ vars.PP_ENVIRONMENT_URL }}
          PP_CLIENT_ID: ${{ secrets.PP_CLIENT_ID }}
          PP_CLIENT_SECRET: ${{ secrets.PP_CLIENT_SECRET }}
          PP_TENANT_ID: ${{ secrets.PP_TENANT_ID }}
        run: |
          node scripts/seed-environment.mjs \
            --set '${{ inputs.data_set }}' \
            ${{ inputs.contact && format('--contact ''{0}''', inputs.contact) || '' }} \
            ${{ inputs.admin && format('--admin ''{0}''', inputs.admin) || '' }} \
            ${{ inputs.dry_run && '--dry-run' || '' }}
```

### A.4 `.github/actions/promote-solution/action.yml` {#a4-promote-solution}

The shared promotion step called by `cd-release.yml`. Installs a published artifact into a target environment.

| | |
|---|---|
| **Type** | composite action, called once per target environment |
| **Applies** | the deployment settings file matching the target, so one artifact serves every environment |
| **Never** | repacks or rebuilds. It installs the bytes published on the release. |

```yaml title=".github/actions/promote-solution/action.yml"
name: Promote solution
description: >
  Import a published managed solution release into a target Power Platform
  environment, then verify the deployed site.

# Why a composite action rather than a reusable workflow
#
# The three-workflow layout leaves no room for promote-solution.yml, but QA and
# production still need the same ~200 lines, and duplicating them is how the two
# paths quietly drift apart. A composite action is not a workflow file, so it
# keeps the layout at three while the calling jobs keep their own `environment:`,
# which is what carries the approval gate.
#
# Note on contexts: `secrets` and `vars` are NOT available inside a composite
# action. Every credential, URL and token is therefore an explicit input, and the
# caller is responsible for passing them.

inputs:
  target:
    description: Target environment name, for example qa or prod
    required: true
  release-tag:
    description: 'Release to promote. Use "latest", or a version or tag, for example 1.0.2.2'
    required: true
  upgrade-mode:
    description: 'upgrade removes components dropped since the last release; update leaves them behind'
    required: false
    default: upgrade
  seed-if-missing:
    description: Seed the base dataset when the target environment has none. Ignored for prod.
    required: false
    default: 'true'
  pac-version:
    description: Power Platform CLI version to pin
    required: false
    default: '2.9.3'
  environment-url:
    description: Dataverse environment URL
    required: true
  site-url:
    description: Public site URL. Optional - when empty, post-import verification is skipped.
    required: false
    default: ''
  client-id:
    description: Service principal application id
    required: true
  client-secret:
    description: Service principal client secret
    required: true
  tenant-id:
    description: Tenant id
    required: true
  github-token:
    description: Token used to read releases and download assets
    required: true

outputs:
  release-tag:
    description: The resolved release tag
    value: ${{ steps.release.outputs.tag }}
  provenance-commit:
    description: The commit the released artifact was built from
    value: ${{ steps.artifact.outputs.commit }}

runs:
  using: composite
  steps:
    - name: Validate target environment configuration
      id: config
      shell: pwsh
      env:
        PP_ENVIRONMENT_URL: ${{ inputs.environment-url }}
        PP_SITE_URL: ${{ inputs.site-url }}
        PP_CLIENT_ID: ${{ inputs.client-id }}
        PP_CLIENT_SECRET: ${{ inputs.client-secret }}
        PP_TENANT_ID: ${{ inputs.tenant-id }}
      run: |
        # Everything needed to authenticate and import. Without any one of these
        # the promotion cannot start.
        $missing = @(
          'PP_ENVIRONMENT_URL'
          'PP_CLIENT_ID'
          'PP_CLIENT_SECRET'
          'PP_TENANT_ID'
        ) | Where-Object {
          [string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($_))
        }
        if ($missing.Count) {
          Write-Error "Missing GitHub Environment configuration: $($missing -join ', ')"
          exit 1
        }

        # PP_SITE_URL is deliberately NOT required. A site arrives inactive on its
        # first import and has no public URL until it has been reactivated, so
        # requiring it here would make the very first promotion into an
        # environment impossible - the one the post-import instructions exist to
        # walk you through. When it is absent the import still runs and only the
        # post-import verification is skipped.
        $siteUrlSet = -not [string]::IsNullOrWhiteSpace($env:PP_SITE_URL)
        "site_url_set=$($siteUrlSet.ToString().ToLower())" | Out-File -FilePath $env:GITHUB_OUTPUT -Append
        if (-not $siteUrlSet) {
          Write-Host "::warning::PP_SITE_URL is not set on '${{ inputs.target }}', so deployment verification and smoke tests will be skipped. Set it once the site has a public URL."
        }

    - name: Install Power Platform CLI
      uses: microsoft/powerplatform-actions/actions-install@v1
      with:
        # Must match the version cd-release.yml packed with, so a promotion cannot
        # import through a different CLI than the one that produced the artifact.
        pac-version-override: ${{ inputs.pac-version }}

    # "latest" resolves to the newest release. Anything else is normalised,
    # because solution versions carry no prefix (1.0.2.2) while tags do
    # (v1.0.2.2) and provenance.json reports the unprefixed form.
    - name: Resolve the release tag
      id: release
      shell: pwsh
      env:
        GH_TOKEN: ${{ inputs.github-token }}
        INPUT_TAG: ${{ inputs.release-tag }}
      run: |
        if ($env:INPUT_TAG -eq 'latest') {
          $tag = gh release view --json tagName --jq .tagName
          if ($LASTEXITCODE -ne 0 -or -not $tag) {
            Write-Error 'This repository has no releases yet. Cut one with Actions > CD release, mode release.'
            exit 1
          }
        } else {
          $tag = 'v' + ($env:INPUT_TAG -replace '^v', '')
          gh release view $tag *> $null
          if ($LASTEXITCODE -ne 0) {
            $available = gh release list --limit 20 --json tagName --jq '.[] | "- `\(.tagName)`"'
            @("## Release ``$tag`` does not exist", '', 'Use ``latest``, or pick one of:', '') + $available |
              Out-File -FilePath $env:GITHUB_STEP_SUMMARY -Append -Encoding utf8
            Write-Error "Release '$tag' does not exist. The job summary lists the valid tags."
            exit 1
          }
        }

        "tag=$tag" | Out-File -FilePath $env:GITHUB_OUTPUT -Append
        Write-Host "Using release '$tag'."

    - name: Download the released solution
      id: artifact
      shell: pwsh
      env:
        GH_TOKEN: ${{ inputs.github-token }}
        TAG: ${{ steps.release.outputs.tag }}
        TARGET: ${{ inputs.target }}
      run: |
        gh release download $env:TAG --dir out --clobber
        if (-not (Test-Path 'out/SupplierInvoicePortal_managed.zip')) {
          Write-Error "Release $env:TAG does not contain SupplierInvoicePortal_managed.zip"
          exit 1
        }
        if (-not (Test-Path 'out/provenance.json')) {
          Write-Error "Release $env:TAG does not contain provenance.json"
          exit 1
        }
        $p = Get-Content 'out/provenance.json' -Raw | ConvertFrom-Json
        "commit=$($p.commit)" | Out-File -FilePath $env:GITHUB_OUTPUT -Append

        if ($env:TARGET -eq 'prod') {
          if (-not (Test-Path 'out/qa-attestation.json')) {
            Write-Error "Release $env:TAG has not completed QA verification. Promote it to qa first."
            exit 1
          }
          $qa = Get-Content 'out/qa-attestation.json' -Raw | ConvertFrom-Json
          if ($qa.releaseTag -ne $env:TAG -or $qa.commit -ne $p.commit) {
            Write-Error "QA attestation does not match release $env:TAG and commit $($p.commit)."
            exit 1
          }
        }

        @(
          "### Promoting ``$($p.version)``"
          ""
          "| | |"
          "|---|---|"
          "| Release | ``$env:TAG`` |"
          "| Commit | ``$($p.commit)`` |"
          "| Built | $($p.builtAtUtc) |"
          "| Target | ``$env:TARGET`` |"
          ""
        ) -join "`n" | Out-File -FilePath $env:GITHUB_STEP_SUMMARY -Append -Encoding utf8

    - name: Identify the released bundle
      id: bundle
      shell: pwsh
      run: |
        Expand-Archive 'out/SupplierInvoicePortal_managed.zip' -DestinationPath 'released-solution'
        $bundles = @(Get-ChildItem 'released-solution' -Recurse -File -Filter 'index-*.js')
        if ($bundles.Count -ne 1) {
          Write-Error "Expected one index-*.js bundle in the released solution, found $($bundles.Count)."
          exit 1
        }
        "name=$($bundles[0].Name)" | Out-File -FilePath $env:GITHUB_OUTPUT -Append

    # Anything that differs per environment - identity provider authority,
    # client ids, external endpoints - belongs in an environment variable whose
    # value is supplied here, not baked into the managed solution.
    - name: Locate deployment settings
      id: settings
      shell: pwsh
      env:
        TARGET: ${{ inputs.target }}
      run: |
        $path = "deployment-settings/$env:TARGET.json"
        $exists = Test-Path $path
        "exists=$($exists.ToString().ToLower())" | Out-File -FilePath $env:GITHUB_OUTPUT -Append
        if ($exists) { Write-Host "Applying $path" }
        else { Write-Host "No settings file at $path - importing solution defaults" }

    - name: Run solution checker
      uses: microsoft/powerplatform-actions/check-solution@v1
      with:
        environment-url: ${{ inputs.environment-url }}
        app-id: ${{ inputs.client-id }}
        client-secret: ${{ inputs.client-secret }}
        tenant-id: ${{ inputs.tenant-id }}
        path: out/SupplierInvoicePortal_managed.zip
        fail-on-analysis-error: true

    - name: Import managed solution
      uses: microsoft/powerplatform-actions/import-solution@v1
      with:
        environment-url: ${{ inputs.environment-url }}
        app-id: ${{ inputs.client-id }}
        client-secret: ${{ inputs.client-secret }}
        tenant-id: ${{ inputs.tenant-id }}
        solution-file: out/SupplierInvoicePortal_managed.zip
        use-deployment-settings-file: ${{ steps.settings.outputs.exists }}
        deployment-settings-file: deployment-settings/${{ inputs.target }}.json
        # An update leaves components deleted since the last release in place;
        # an upgrade removes them, which is what source control says should
        # happen.
        stage-and-upgrade: ${{ inputs.upgrade-mode == 'upgrade' }}
        # Async with a generous timeout: the solution carries the site and the
        # compiled bundle, so imports take noticeably longer than schema alone.
        run-asynchronously: true
        max-async-wait-time: 60

    # A solution carries metadata, not rows, so a freshly imported environment
    # has the schema and the site but nothing to invoice against.
    #
    # Non-fatal on purpose: the import is the deployment contract, and seeding is
    # a convenience on top of it. A data problem should not turn a successful
    # promotion red. --only-if-missing leaves an established environment alone,
    # and the script refuses the production host independently of the condition
    # below, so this cannot fabricate suppliers in prod.
    - name: Seed base data if the environment has none
      id: seed
      if: ${{ inputs.seed-if-missing == 'true' && inputs.target != 'prod' }}
      continue-on-error: true
      shell: pwsh
      env:
        GH_TOKEN: ${{ inputs.github-token }}
        TAG: ${{ steps.release.outputs.tag }}
        PP_ENVIRONMENT_URL: ${{ inputs.environment-url }}
        PP_CLIENT_ID: ${{ inputs.client-id }}
        PP_CLIENT_SECRET: ${{ inputs.client-secret }}
        PP_TENANT_ID: ${{ inputs.tenant-id }}
      run: |
        # Prefer the dataset published with this release so the data matches the
        # schema being installed. Releases cut before seed data existed fall back
        # to the copy in the repository.
        gh release download $env:TAG --pattern 'seed-base.json' --dir seed-release --clobber 2>$null
        if (Test-Path 'seed-release/seed-base.json') {
          Copy-Item 'seed-release/seed-base.json' 'seed/base.json' -Force
          Write-Host 'Using the seed data published with this release.'
        } else {
          Write-Host 'This release predates published seed data; using the repository copy.'
        }
        node scripts/seed-environment.mjs --set base --only-if-missing

    # An import that succeeds does not mean the site serves the new code - the
    # runtime keeps serving the previous bundle until the site is restarted.
    # This checks the deployed HTML references the bundle we just shipped.
    - name: Verify the deployed site
      if: ${{ steps.config.outputs.site_url_set == 'true' }}
      shell: pwsh
      env:
        SITE_URL: ${{ inputs.site-url }}
        EXPECTED_BUNDLE: ${{ steps.bundle.outputs.name }}
      run: node scripts/verify-deployment.mjs

    - name: Install deployment test dependencies
      if: ${{ steps.config.outputs.site_url_set == 'true' }}
      shell: pwsh
      run: |
        npm ci
        npx playwright install chromium

    - name: Run deployed-site smoke tests
      if: ${{ steps.config.outputs.site_url_set == 'true' }}
      shell: pwsh
      env:
        PLAYWRIGHT_BASE_URL: ${{ inputs.site-url }}
      run: npm run test:deployment

    - name: Post-import instructions
      if: ${{ !cancelled() }}
      shell: pwsh
      env:
        TARGET: ${{ inputs.target }}
        SEED_OUTCOME: ${{ steps.seed.outcome || 'skipped' }}
      run: |
        $lines = @(
          "## Imported into ``$env:TARGET``"
          ""
          "The solution carried the Dataverse schema, the Power Pages site configuration and the compiled SPA bundle."
          ""
          "### First import into this environment only"
          ""
          "The site arrives **inactive** and must be reactivated once:"
          ""
          "1. Power Pages home -> **Inactive sites** -> select the site -> **Reactivate**"
          "2. Power Platform admin center -> the environment -> **Resources > Power Pages sites**"
          "3. Select the site -> **Manage** -> **Site Details > Edit**"
          "4. Set **Website Record** to the imported record -> **Save**"
          "5. **Site Actions > Restart site**"
          ""
          "Then set the ``PP_SITE_URL`` variable on the ``$env:TARGET`` environment so future"
          "promotions verify themselves automatically."
          ""
          "### Every later import"
          ""
          "Restart the site so the runtime cache picks up the new bundle: **Site Actions > Restart site**."
          ""
          "### Seed data"
          ""
          "Outcome: ``$env:SEED_OUTCOME``. Seeding is non-blocking, so a failure here"
          "does not mean the import failed. Re-run **Actions > CD release** in ``seed`` mode to retry, or to"
          "load the demo dataset, which needs a contact and is never applied automatically."
          ""
          "### To roll back"
          ""
          "Re-run **Actions > CD release** in ``promote`` mode against the previous release tag. Releases are"
          "immutable, so the rollback installs exactly what was running before."
          ""
          "### Do not edit the site in ``$env:TARGET``"
          ""
          "Editing site configuration downstream creates an unmanaged layer and the environment stops receiving changes from this pipeline. Author in Contoso-dev and promote."
        )
        $lines -join "`n" | Out-File -FilePath $env:GITHUB_STEP_SUMMARY -Append -Encoding utf8
```

### A.5 `.github/dependabot.yml` {#a5-dependabot}

Keeps the toolchain and dependencies current without anyone remembering to check.

| | |
|---|---|
| **Covers** | npm packages and GitHub Actions versions |
| **Why it matters** | pinned action versions are only safe if something proposes the upgrades |

```yaml title=".github/dependabot.yml"
version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly
    open-pull-requests-limit: 5
    groups:
      # The SPA bundle is content-hashed into the solution, so every dependency
      # bump requires a sync. Grouping the safe updates keeps that to one PR a
      # week rather than one per package.
      #
      # Majors are deliberately excluded and arrive as individual PRs. A grouped
      # major bump is all-or-nothing: PR #5 combined TypeScript 7, Vite 8 and
      # plugin-react 6, so a single incompatibility blocked all three and the
      # required bundle re-sync had to cover every change at once.
      npm-minor-and-patch:
        patterns: ['*']
        update-types: ['minor', 'patch']
    ignore:
      # vite and @vitejs/plugin-react are peers: plugin-react 6 requires Vite 7+,
      # so neither major lands alone - npm ci fails with ERESOLVE in both
      # directions. Together they build and test clean, but Vite 8 is the
      # Rolldown rewrite and emits a different bundle, so the upgrade also needs
      # `npm run sync:solution` to refresh the solution's copy of it. Merging
      # without that re-sync fails the drift gate and blocks every release.
      #
      # Deferred rather than half-done. Remove both entries when the toolchain
      # upgrade is scheduled on a machine that can install rolldown.
      - dependency-name: vite
        update-types: ['version-update:semver-major']
      - dependency-name: '@vitejs/plugin-react'
        update-types: ['version-update:semver-major']

  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: weekly
    groups:
      actions-minor-and-patch:
        patterns: ['*']
        update-types: ['minor', 'patch']
```


---
sidebar_position: 10
sidebar_label: "Appendix B: Script source"
title: "Appendix B: Developer script source"
className: powerPlatformGuide
---

# Appendix B: Developer script source

The scripts behind the commands in [Lab 05](05-inner-loop.md). Together they are the whole developer workflow: build, sync, verify, push.

| File | Backs | Role |
|---|---|---|
| [`package.json`](#b1-package-json) | Every `npm run` command | The developer workflow, written down as scripts |
| [`.githooks/pre-push`](#b2-pre-push) | `verify:solution` | Blocks a push that would ship a stale bundle |
| [`check-solution-drift.mjs`](#b3-check-solution-drift) | `check:drift` | Compares the built site with the committed solution |
| [`sync-site-components.mjs`](#b4-sync-site-components) | `sync:solution` | Adds new site components to the solution before it is synced |

:::tip Why this is worth copying
The commands compose rather than duplicate: `verify:solution` calls `build` and `check:drift`, and the pull request runs the same `check:drift`. A developer, the pre-push hook, and continuous integration therefore apply one definition of correct, so a check cannot pass locally and fail in the pipeline for a reason nobody can reproduce.
:::

### B.1 `package.json` {#b1-package-json}

Every command a developer runs. The `scripts` block is the developer workflow, written down.

| | |
|---|---|
| **Read this first** | `sync:solution` and `verify:solution`. Together they keep the site and the solution in step. |
| **Composed, not duplicated** | `verify:solution` calls `build` then `check:drift`, so local and CI checks cannot diverge |

```json title="package.json"
{
  "name": "supplier-invoice-portal",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test:e2e": "npm run build && playwright test",
    "test:deployment": "playwright test --config playwright.deployment.config.ts",
    "test:unit": "node --test tests/*.test.mjs",
    "lint": "eslint .",
    "check:links": "node scripts/check-links.mjs",
    "check:drift": "node scripts/check-solution-drift.mjs",
    "seed": "node scripts/seed-environment.mjs",
    "verify:deployment": "node scripts/verify-deployment.mjs",
    "verify:solution": "npm run build && npm run check:drift",
    "sync:solution": "npm run build && pac pages upload-code-site --rootPath . && node scripts/sync-site-components.mjs && cd solutions/SupplierInvoicePortal && pac solution sync --packagetype Both"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^7.1.0"
  },
  "devDependencies": {
    "@eslint/js": "^10.0.1",
    "@playwright/test": "^1.62.1",
    "@tailwindcss/vite": "^4.3.3",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "eslint": "^10.9.1",
    "globals": "^17.11.0",
    "playwright": "^1.62.1",
    "tailwindcss": "^4.3.3",
    "typescript": "~7.0.2",
    "vite": "^6.0.0"
  }
}
```

### B.2 `.githooks/pre-push` {#b2-pre-push}

Blocks a push whose committed solution does not match what the source builds.

| | |
|---|---|
| **Enable with** | `git config core.hooksPath .githooks` |
| **Runs** | `npm run verify:solution`, the same check the pull request runs |
| **Why local** | catching stale bundles before the push is faster than a failed pull request |

```bash title=".githooks/pre-push"
#!/bin/sh
# Blocks a push whose committed solution source does not match what src/ builds.
#
# The Dataverse solution carries the compiled SPA bundle and is what QA and prod
# receive. Committing a React change without re-syncing the solution leaves a
# clean-looking diff that ships stale code on the next promotion.
#
# Enable with:  git config core.hooksPath .githooks

npm run verify:solution || {
  echo ""
  echo "Push blocked: the Dataverse solution is out of date with src/."
  echo "Run 'npm run sync:solution', commit the result, and push again."
  echo ""
  exit 1
}
```

### B.3 `scripts/check-solution-drift.mjs` {#b3-check-solution-drift}

The drift gate behind `npm run check:drift`. Compares the built bundle with the copy committed in the solution.

| | |
|---|---|
| **Compares** | file names and bytes, so an identical build always produces an identical result |
| **Also catches** | a superseded bundle left behind in the solution, which means a prune was never synced |
| **Requires** | a reproducible build. The sample scopes Tailwind with `source(none)` for that reason. |

```javascript title="scripts/check-solution-drift.mjs"
#!/usr/bin/env node
/**
 * Fails if the compiled SPA in the Dataverse solution source is out of date with
 * respect to what `npm run build` currently produces.
 *
 * Why this exists
 * ---------------
 * The solution is the deployment unit for QA and prod: it carries the compiled
 * bundle inside powerpagecomponents/<guid>/filecontent/. Nothing in git forces
 * that copy to match src/. A developer can commit a React change, skip the
 * upload + sync step, and the next promotion ships stale code that still looks
 * correct in review.
 *
 * Vite emits content-hashed asset names, so a byte comparison is a reliable
 * signal: same source produces the same filename and the same bytes.
 *
 * This check requires a reproducible build. Tailwind is scoped with
 * source(none) in src/styles/theme.css for exactly that reason, because without it the
 * build scans generated artifacts (including this solution's own copy of the
 * bundle) and hashes never settle.
 *
 * Usage: node scripts/check-solution-drift.mjs   (run AFTER npm run build)
 */
import { createHash } from 'node:crypto'
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const DIST_ASSETS = 'dist/assets'
const DIST_ROOT = 'dist'
const SOLUTION_COMPONENTS = 'solutions/SupplierInvoicePortal/src/powerpagecomponents'

const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex')

function fail(lines) {
  console.error('\n  Solution source is out of date with the SPA build.\n')
  for (const l of lines) console.error(`   ${l}`)
  console.error(`
  The compiled bundle committed under solutions/ is what QA and prod receive.
  It currently does not match what src/ builds, so a promotion would ship
  stale code.

  Fix with the full dev loop:

    npm run build
    pac pages upload-code-site --rootPath .
    cd solutions/SupplierInvoicePortal && pac solution sync --packagetype Both

  or simply: npm run sync:solution
`)
  process.exit(1)
}

if (!existsSync(DIST_ASSETS)) {
  fail(['dist/assets not found. Run `npm run build` before this check.'])
}
if (!existsSync(SOLUTION_COMPONENTS)) {
  fail([`${SOLUTION_COMPONENTS} not found. Is the solution source checked out?`])
}

// Index every file the solution ships as web-file content, keyed by file name.
const solutionFiles = new Map()
for (const guid of readdirSync(SOLUTION_COMPONENTS)) {
  const dir = join(SOLUTION_COMPONENTS, guid, 'filecontent')
  if (!existsSync(dir) || !statSync(dir).isDirectory()) continue
  for (const f of readdirSync(dir)) solutionFiles.set(f, join(dir, f))
}

// Everything vite emitted, plus the entry HTML.
const built = readdirSync(DIST_ASSETS).map((f) => ({ name: f, path: join(DIST_ASSETS, f) }))
if (existsSync(join(DIST_ROOT, 'index.html'))) {
  built.push({ name: 'index.html', path: join(DIST_ROOT, 'index.html') })
}

const problems = []
for (const asset of built) {
  const inSolution = solutionFiles.get(asset.name)
  if (!inSolution) {
    problems.push(`missing from solution: ${asset.name}`)
    continue
  }
  if (sha(asset.path) !== sha(inSolution)) {
    problems.push(`content differs:      ${asset.name}`)
  }
}

// A superseded bundle left behind in the solution is also drift, because it means the
// last sync did not reflect a prune in the environment.
const builtNames = new Set(built.map((a) => a.name))
for (const name of solutionFiles.keys()) {
  if (/^index-.*\.(js|css)$/.test(name) && !builtNames.has(name)) {
    problems.push(`stale bundle left in solution: ${name}`)
  }
}

if (problems.length) fail(problems)

console.log(`Solution source matches the current build (${built.length} asset(s) verified).`)
for (const a of built) console.log(`  ok  ${a.name}`)
```

### B.4 `scripts/sync-site-components.mjs` {#b4-sync-site-components}

The step inside `npm run sync:solution` that adds new site components to the solution.

| | |
|---|---|
| **Solves** | newly created site records start outside the solution, so a plain sync writes a solution missing the current bundle |
| **Applies to** | web files, web pages, site settings, table permissions and web roles |
| **Failure mode without it** | promotion ships whatever bundle was a member last time, silently |

```javascript title="scripts/sync-site-components.mjs"
#!/usr/bin/env node
/**
 * Adds Power Pages site components that exist in the environment but are not yet
 * members of the solution.
 *
 * Why this is required
 * --------------------
 * Power Pages does NOT add new site components to a solution automatically, even
 * when the site root is already a solution member. Every `pac pages
 * upload-code-site` that changes the bundle deletes the old web-file components
 * and creates new ones with new ids and new content-hashed names. Those new
 * records start outside the solution.
 *
 * If you skip this step, `pac solution sync` writes a solution that is missing the
 * current bundle, and promotion ships whatever bundle was a member last time,
 * silently, because everything else looks correct.
 *
 * The same applies to any web page, site setting, table permission or web role
 * created in the design studio.
 *
 * Uses only pac CLI, so it works anywhere the rest of the workflow does.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const SOLUTION = process.env.PP_SOLUTION || 'SupplierInvoicePortal'
const WEBSITE_YML = '.powerpages-site/website.yml'
const COMPONENT_TYPE = 'powerpagecomponent'

function siteId() {
  if (process.env.PP_SITE_ID) return process.env.PP_SITE_ID
  if (!existsSync(WEBSITE_YML)) {
    console.error(`Cannot determine the site id: ${WEBSITE_YML} not found.`)
    console.error('Set PP_SITE_ID to override.')
    process.exit(1)
  }
  const m = readFileSync(WEBSITE_YML, 'utf8').match(/^id:\s*([0-9a-fA-F-]{36})\s*$/m)
  if (!m) {
    console.error(`Could not read an id from ${WEBSITE_YML}.`)
    process.exit(1)
  }
  return m[1]
}

/** Runs a FetchXML query and returns the leading GUID of each result row. */
function fetchIds(xml) {
  const file = join(tmpdir(), `ppfetch-${process.pid}-${Date.now()}.xml`)
  writeFileSync(file, xml, 'utf8')
  try {
    const out = execFileSync('pac', ['env', 'fetch', '--xmlFile', file], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    })
    const ids = []
    for (const line of out.split(/\r?\n/)) {
      const m = line.match(/^\s*([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\b/)
      if (m) ids.push(m[1].toLowerCase())
    }
    return ids
  } finally {
    try { unlinkSync(file) } catch { /* best effort */ }
  }
}

const SITE_ID = siteId()

const inEnvironment = fetchIds(`<fetch>
  <entity name="powerpagecomponent">
    <attribute name="powerpagecomponentid" />
    <filter>
      <condition attribute="powerpagesiteid" operator="eq" value="${SITE_ID}" />
    </filter>
  </entity>
</fetch>`)

const inSolution = new Set(
  fetchIds(`<fetch>
  <entity name="solutioncomponent">
    <attribute name="objectid" />
    <filter>
      <condition attribute="componenttype" operator="eq" value="10433" />
    </filter>
    <link-entity name="solution" from="solutionid" to="solutionid">
      <filter>
        <condition attribute="uniquename" operator="eq" value="${SOLUTION}" />
      </filter>
    </link-entity>
  </entity>
</fetch>`),
)

const missing = inEnvironment.filter((id) => !inSolution.has(id))

console.log(`Site components in environment: ${inEnvironment.length}`)
console.log(`Already in ${SOLUTION}:          ${inSolution.size}`)
console.log(`To add:                         ${missing.length}`)

if (!missing.length) {
  console.log('\nNothing to add. The solution already covers every site component.')
  process.exit(0)
}

let added = 0
const failures = []

// Serial on purpose: concurrent inserts into the same solution deadlock the
// SolutionComponent table (SQL error 1205).
for (const id of missing) {
  try {
    execFileSync(
      'pac',
      [
        'solution', 'add-solution-component',
        '--solutionUniqueName', SOLUTION,
        '--component', id,
        // pac rejects the numeric ids (10433/10434/10435) for Power Pages types
        // and requires the component type name instead.
        '--componentType', COMPONENT_TYPE,
      ],
      { encoding: 'utf8', stdio: 'pipe' },
    )
    added += 1
    if (added % 10 === 0) console.log(`  ...${added}/${missing.length}`)
  } catch (err) {
    const msg = String(err.stdout || err.stderr || err.message)
    if (/duplicate key/i.test(msg)) {
      added += 1
      continue
    }
    failures.push({ id, error: msg.split('\n').find((l) => /error/i.test(l)) || msg.slice(0, 160) })
  }
}

console.log(`\n${added} added, ${failures.length} failed.`)
for (const f of failures.slice(0, 10)) console.log(`  ${f.id}: ${f.error}`)
if (failures.length) process.exit(1)
```


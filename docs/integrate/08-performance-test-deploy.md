---
sidebar_position: 5
sidebar_label: "Lab 08: Performance, Test, Deploy"
title: "Lab 08: Performance, Testing, and Deploy"
---

# Lab 08: Performance, Testing, and Deploy

## What you will build

A polished, deployed portal: bundle analyzed and split for fast first paint, automated end-to-end tests passing via `/test-site`, and the latest build live in your integration environment. The ALM labs that follow promote this build through pre-prod and prod.

## Prerequisites

- Completed [Lab 07: Add Generative AI APIs](./07-add-ai-apis.md) (the portal now has Web API, server logic, cloud flows, and two AI features)
- `npm run build` completes without errors in your project directory
- Deployed site is reachable and responsive

## Learning objectives

By the end of this lab you will be able to:

1. Analyze the React + Vite bundle to identify heavy chunks and unnecessary dependencies
2. Apply three performance techniques that matter for Power Pages SPAs: route-level code splitting with `React.lazy`, memoization of list rows with `React.memo`, and preload hints for critical route chunks
3. Run `/test-site` to execute a Playwright-based end-to-end test pass against the deployed site
4. Deploy the latest build to your integration environment using `/deploy-site` and verify the live portal (later ALM labs promote this build through pre-prod and prod via Power Platform Pipelines)

> **Further reading:** [Create and deploy a single-page application in Power Pages](https://learn.microsoft.com/power-pages/configure/create-code-sites) · [`pac pages` command reference](https://learn.microsoft.com/power-platform/developer/cli/reference/pages) · [Power Platform CLI introduction](https://learn.microsoft.com/power-platform/developer/cli/introduction)

---

## Part 1: performance

Power Pages SPAs are bundled with Vite and served from the Power Pages CDN. The main wins come from three things: shipping less JavaScript, splitting what you do ship into route-sized chunks, and preloading the chunks that matter first.

### Step 1.1: analyze the current bundle

Install the visualizer and run it against a production build:

```bash
npm install --save-dev vite-bundle-visualizer
npx vite-bundle-visualizer
```

A browser tab opens showing a treemap of every chunk in your `dist/` folder. Look for:

| Signal | What it tells you |
|--------|-------------------|
| A single 800 KB+ chunk containing every route | Missing route-level code splitting |
| Large vendor dependencies you don't use directly | Transitive deps that came in via a package you can replace |
| Duplicate copies of the same library | Multiple versions in `node_modules` — check `npm ls <package>` |

For the supplier portal, a healthy main chunk is ~200 KB gzipped with separate chunks for each page route.

Ask your AI coding CLI to analyze the treemap and tell you where to optimize:

```
I'm worried the portal might be too slow to load on a mobile 
connection. Check how large the app is when it ships to users, and 
tell me the single most impactful change I can make to speed it up.
```

### Step 1.2: Route-Level Code splitting with React.lazy

Ask your AI coding CLI to apply the change. Either of these prompts works — use whichever matches your style:

**Outcome-based (let the agent pick the technique):**

```
The portal feels slow on the first page load because it downloads 
every page up front, even pages the user may never visit. Change it 
so each page loads only when the user navigates to it.
```

**Directive (when you already know you want React.lazy):**

```
Split my React app into per-route bundles using React.lazy and 
Suspense. Lazy-load Dashboard, InvoiceList, InvoiceDetail, 
SubmitInvoice, and Search. Keep the main chunk small — only the 
shell, router, and shared services should stay in it. Add a 
Suspense fallback with a simple "Loading..." message.
```

Expected outcome: Vite automatically creates one chunk per dynamic `import()`. Rerun `npx vite-bundle-visualizer` — you should see one chunk per page, and the main bundle shrinks to the shell, shared services, and the first route.

For reference, the hand-written version looks like:

```typescript
import { lazy, Suspense } from 'react';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const InvoiceList = lazy(() => import('./pages/InvoiceList'));
const InvoiceDetail = lazy(() => import('./pages/InvoiceDetail'));
const SubmitInvoice = lazy(() => import('./pages/SubmitInvoice'));
const Search = lazy(() => import('./pages/Search'));

<Suspense fallback={<div className="page-loading">Loading...</div>}>
  <Routes>
    <Route path="/dashboard" element={<Dashboard />} />
    {/* ... */}
  </Routes>
</Suspense>
```

### Step 1.3: keep `bundleFilePatterns` in sync after splitting

Code splitting creates a side-effect you have to handle: Vite now emits a new hashed chunk per route (e.g. `Dashboard-A1b2C3.js`, `InvoiceList-X9Y8Z7.js`) and those filenames change on every build. Power Pages won't clean up old chunks on its own — you have to tell PAC CLI about them.

#### Why this matters

When `pac pages upload-code-site` deploys your site, it reads the **`bundleFilePatterns`** array from `powerpages.config.json` and uses it to **delete matching stale bundles from the Power Pages server before uploading the new ones**. If a chunk filename pattern (e.g. `Dashboard-*.js`) is missing from this array, the old hashed copy stays behind after each deploy. Over time the deployed site accumulates dozens of stale bundles, inflating first-load cost and occasionally loading stale code via a cached `index.html`.

Open `powerpages.config.json` at the project root — it should already have the shape:

```json
{
  "$schema": "https://www.schemastore.org/powerpages.config.json",
  "siteName": "Supplier Invoice Portal",
  "compiledPath": "dist",
  "defaultLandingPage": "index.html",
  "bundleFilePatterns": [
    "index-*.js",
    "index-*.css"
  ]
}
```

After Step 1.2, your `dist/assets/` folder contains many more hashed files than this list covers. You could hand-maintain the list, but the names change every time you add, remove, or rename a lazy-loaded route. Automate it instead.

#### Sample prompt — generate a post-build script

Ask your AI coding CLI to write a post-build script that scans `dist/assets/` and keeps `bundleFilePatterns` in sync:

```
After my Vite build, dist/assets/ contains hashed JS and CSS chunks 
like Dashboard-A1b2C3.js, InvoiceList-X9Y8Z7.js, and index-QwErTy.css. 
PAC CLI needs powerpages.config.json's bundleFilePatterns array to 
list one pattern per chunk (e.g. "Dashboard-*.js") so it can delete 
stale bundles on deploy.

Generate a Node post-build script at scripts/postbuild.js (ES modules, 
no external dependencies) that:

1. Scans dist/assets/ for files matching the Vite pattern 
   [name]-[hash].[js|css] — the hash is 6-12 alphanumeric characters.
2. Builds a sorted, deduplicated list of "[name]-*.[ext]" patterns.
3. Reads powerpages.config.json at the project root, updates its 
   bundleFilePatterns array, and writes it back only if the array 
   changed (to avoid noisy git diffs on rebuilds).
4. Logs how many patterns were written, or that the list is already 
   up-to-date.
5. Exits non-zero on errors.

Then update package.json so "npm run build" runs this script after 
`tsc -b && vite build`. Keep it simple — I don't want to add a 
plugin dependency.
```

#### What the script looks like

The generated script should follow this shape (abridged from a working example):

```javascript
// scripts/postbuild.js
import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(import.meta.dirname, '..');
const DIST_ASSETS = join(ROOT, 'dist', 'assets');
const CONFIG_PATH = join(ROOT, 'powerpages.config.json');

// Vite output format: [name]-[hash].[ext]
const HASH_PATTERN = /^(.+)-[A-Za-z0-9_-]{6,12}\.(js|css)$/;

const patternSet = new Set();
for (const file of readdirSync(DIST_ASSETS)) {
  const m = file.match(HASH_PATTERN);
  if (m) patternSet.add(`${m[1]}-*.${m[2]}`);
}

const patterns = [...patternSet].sort();
const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
const oldSet = new Set(config.bundleFilePatterns || []);
const changed = oldSet.size !== patterns.length ||
                patterns.some(p => !oldSet.has(p));

if (changed) {
  config.bundleFilePatterns = patterns;
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n');
  console.log(`Updated powerpages.config.json with ${patterns.length} patterns`);
} else {
  console.log(`bundleFilePatterns already up-to-date (${patterns.length})`);
}
```

> **Reference only — your output may differ.** The agent may produce slightly different logic (glob-based, `recursive: true`, different regex for the hash length). As long as the script scans `dist/assets/`, builds `[name]-*.[ext]` patterns, and writes them to `powerpages.config.json`, the behaviour is correct.

#### Wire the script into the build

Update `package.json` so every build runs the script:

```json
{
  "scripts": {
    "build": "tsc -b && vite build && node scripts/postbuild.js"
  }
}
```

Alternatively, npm will auto-run a script named `postbuild` after `build` — if your agent named it that way, no explicit chain is needed:

```json
{
  "scripts": {
    "build": "tsc -b && vite build",
    "postbuild": "node scripts/postbuild.js"
  }
}
```

#### Verify

1. Run `npm run build`. The script should print something like `Updated powerpages.config.json with 18 patterns`.
2. Open `powerpages.config.json` and confirm `bundleFilePatterns` now contains one entry per chunk in `dist/assets/` (e.g. `Dashboard-*.js`, `InvoiceList-*.js`, `index-*.js`, `index-*.css`).
3. Run `/deploy-site`. In the PAC CLI deploy output, you should see old bundles being removed before new ones are uploaded.
4. Commit both `scripts/postbuild.js` and the updated `powerpages.config.json`. From now on, any teammate who adds or renames a route gets the config update for free on their next `npm run build`.

### Step 1.4: memoize the invoice list rows

Ask your AI coding CLI to handle it:

```
The invoice list page feels slow when I scroll through many rows, or 
when I type in the search box. I think the page redraws every row 
unnecessarily. Make the list feel responsive.
```

Two gotchas to verify after Claude is done:

- `onClick` must be stable across renders. Wrap it with `useCallback` in the parent or it defeats the memo.
- Don't memoize tiny components — the comparison can cost more than the re-render you saved. Rows with computed cells, status badges, and money formatting are worth it.

### Step 1.5: preload the critical route chunk (optional)

With `React.lazy`, the first navigation pays a round-trip to fetch the chunk. Preloading the Dashboard chunk (most common landing page) shaves that cost.

Vite 3+ enables `build.modulePreload` automatically, so in most cases you already get preload links for your entry chunks. For explicit control over which route chunks to preload, ask your AI coding CLI:

```
Most of my users land on the dashboard first. Make that page load as 
fast as possible, even if other pages take slightly longer.
```

Skip this step if you're short on time. The bigger wins are in Steps 1.2 and 1.4.

### Step 1.6: rebuild and remeasure

```bash
npm run build
npx vite-bundle-visualizer
```

Expected change:

| Metric | Before | After |
|--------|--------|-------|
| Main chunk size | ~800 KB | ~250 KB |
| Route chunks | 0 | 5 (one per page) |
| First paint on Dashboard | ~1.2s on slow 3G | ~0.6s on slow 3G |

Open DevTools → Network tab → throttle to "Slow 3G" → reload the deployed site. Watch the main chunk load, then the Dashboard route chunk load in parallel. On slow connections the difference is dramatic.

---

## Part 2: End-to-End testing with /test-site

### Step 2.1: what /test-site does

The `/test-site` plugin command launches Playwright against your deployed site and runs an AI-driven test pass — it navigates pages, submits the Submit Invoice form, verifies API responses, and reports failures with screenshots.

Unlike a static test suite, the test prompts are described in natural language. You tell your AI coding CLI what behaviors to verify; the plugin translates them into Playwright steps.

### Step 2.2: run a smoke test

In your AI coding CLI:

```
/test-site

Before I hand the portal to the finance team, run through it end-to-end 
as if you were a supplier, and make sure nothing obvious is broken. A 
supplier should be able to sign in, see their dashboard and invoice 
list, open an invoice, view the AI summary, submit a new invoice, and 
get a clear error if they try to submit a duplicate PO. The search 
page should also return a useful AI answer when they ask about 
overdue invoices.
```

Your AI coding CLI will:

1. Verify Playwright is installed (installs if missing)
2. Ask for the site URL and credentials (use a test account, never a shared admin account)
3. Launch a browser (headed by default so you can watch)
4. Execute each step, capturing screenshots and network logs
5. Report pass/fail with context

### Step 2.3: review the output

`/test-site` writes results to `test-results/` in your project. For each step, you get:

- Pass/fail status
- Screenshot at the point of verification
- Network trace for any API calls made
- Error message and Playwright locator info if the step failed

A clean smoke test looks like:

```
✓ Landing page loads                                    (0.8s)
✓ Sign in with Microsoft work account completes         (3.1s)
✓ Dashboard displays metric cards                       (0.4s)
✓ Invoice List shows at least 3 invoices                (0.7s)
✓ Clicking an invoice navigates to detail page          (0.5s)
✓ Invoice Detail renders the Copilot summary card       (4.2s -- AI call)
✓ Submit Invoice accepts a new unique PO                (1.6s)
✓ Duplicate-PO validation rejects a repeat PO           (1.3s)
✓ Search page returns an AI summary                     (3.8s -- AI call)

9 passed, 0 failed in 16.4s
```

### Step 2.4: debugging a failing Step

If any step fails, ask your AI coding CLI to investigate:

```
One of the test steps failed. The Submit Invoice form didn't behave as 
I expected. Check the screenshot and diagnostics logs, and diagnose 
what went wrong.
```

The agent will inspect the screenshot, read the Power Pages diagnostics logs, and propose a fix. Common causes: server logic deploy didn't land, CSRF token expired, table permission missing.

### Step 2.5: scenario test (optional)

If time permits, run a longer scenario test:

```
/test-site

Run through the full supplier journey. One supplier signs in, submits 
an invoice, and confirms the Teams notification arrives. Then a 
different supplier signs in and must NOT be able to see the first 
supplier's invoices. I want to confirm that data isolation between 
suppliers is working.
```

This exercises every integration layer built over two days.

---

## Part 3: deploy to the integration environment

### Step 3.1: Pre-Deploy checklist

Before deploying the latest build, confirm:

- [ ] `npm run build` completes without errors or warnings
- [ ] The production bundle is under 400 KB main chunk (check with visualizer)
- [ ] `/test-site` smoke test passed end-to-end
- [ ] `CLAUDE.md` is up to date — future sessions will pick it up as context

> **Note:** The ALM labs (starting with Lab 09) introduce source control (`git init`, `gh repo create`) and automated CI/CD via GitHub Actions. For now, your local project directory is the source of truth — deploy directly with `/deploy-site` as you have been.

### Step 3.2: run /deploy-site

```
/deploy-site
```

The plugin walks through:

1. **Environment check** — confirms `pac org who` matches your integration environment
2. **Build** — runs `npm run build` fresh
3. **Site check** — confirms the site is activated and reachable
4. **Upload** — runs `pac pages upload-code-site --rootPath "."`
5. **Verification** — opens the live URL and confirms a 200 response

Expected duration: 1-3 minutes depending on bundle size and network.

### Step 3.3: live verification

After the deploy completes, open the site in a fresh incognito window and run through the critical paths:

| Path | Expected |
|------|----------|
| Landing → Sign in | Redirect completes, Dashboard loads |
| Dashboard | Metric cards show correct counts |
| Submit Invoice (unique PO) | Success, redirect, Teams notification arrives |
| Submit Invoice (duplicate PO) | Inline error, no record created |
| Invoice Detail | Copilot summary card renders within 5s |
| Search → "overdue invoices" | AI summary with clickable citations |

### Step 3.4: confirm observability

Open the Power Pages design studio → **Diagnostics** for your site. The last 5 minutes of logs should show:

- Web API calls for the paths you exercised
- Server logic invocations from Submit Invoice
- Cloud flow triggers logged as `/cloudflow/trigger/...`
- Summarization calls under `/summarization/data/v1.0/`

If a layer is silent, something is wired wrong — re-run `/test-site` with the affected step to isolate.

### Step 3.5: note the deploy state

Take a quick mental snapshot before moving into the ALM labs:

- The integration env has the latest bundle, all features (server logic, cloud flows, AI APIs), and all `.powerpages-site/` permissions configured
- Lab 09 will turn this directory into a Git repo and push it to GitHub
- Lab 12 will set up automated CI to redeploy here on every merge to `main`
- Lab 13 will promote this same build through pre-prod to production via Power Platform Pipelines

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `vite-bundle-visualizer` shows a huge `index` chunk | Route-level splitting not applied — ensure `React.lazy` imports are dynamic (`() => import(...)`), not static |
| Lazy routes cause a white flash between pages | Add a global `<Suspense fallback>` in `App.tsx`; consider a skeleton screen for the first route |
| `React.memo` doesn't stop re-renders | `onClick` or other prop is a new reference every render; wrap parent handlers in `useCallback` |
| `/test-site` can't sign in | Make sure the test account has a pre-existing Contact in Dataverse; first sign-in triggers Contact creation which breaks scripted flows |
| `/deploy-site` fails with "unauthorized" | `pac auth list` — Active auth may have expired mid-session; run `pac auth create --environment <url>` |
| Deploy succeeds but site shows stale content | Hard refresh (Ctrl+Shift+R) or use an incognito window to bypass browser cache |
| Bundle size grew after adding the AI features | Normal — the AI hooks and error types add ~15 KB. If growth is larger, check the visualizer for duplicate dependencies |

## Verification

You have completed this lab when:

- [ ] `React.lazy` applied to all route components
- [ ] `vite-bundle-visualizer` shows one chunk per route and a main chunk under 400 KB
- [ ] Invoice List uses `React.memo` on row components (optional but recommended)
- [ ] `/test-site` smoke test reports all steps passed
- [ ] `/deploy-site` completed without errors
- [ ] Live site passes all critical-path checks in an incognito window
- [ ] Power Pages Diagnostics shows all four integration layers firing

## Fallback

If the deploy fails:

1. If `pac pages upload-code-site` fails mid-upload, the site may be in an inconsistent state. Run `/activate-site` to reset, then redeploy.
2. If a previous deploy left the env in a bad state, the site can be redeployed cleanly from the current directory without losing work.

## Key takeaways

- Bundle analysis with `vite-bundle-visualizer` exposes the problems you can't see in code
- Route-level code splitting with `React.lazy` is the single highest-leverage perf change for any Power Pages SPA
- `React.memo` wins on list rows but only when prop references are stable — pair with `useCallback`
- `/test-site` runs Playwright with natural-language prompts, giving you smoke coverage without writing a test file
- `/deploy-site` to the integration env is the handoff between the integration phase and the ALM phase; the ALM labs take this same build through real production via source control + Pipelines

## What's next

→ [Lab 09: Source Control](../alm/09-source-control.md)

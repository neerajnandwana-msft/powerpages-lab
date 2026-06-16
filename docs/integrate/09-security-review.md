---
sidebar_position: 6
sidebar_label: "Lab 09: Security Review"
title: "Lab 09: Security Review"
---

# Lab 09: Security Review

## What you will build

A consolidated HTML security report for your portal, produced by `/security-review` orchestrating focused checks across code, dependencies, deployed-site scan results, browser headers, WAF posture, table permissions, and authentication configuration, followed by targeted fixes applied through the matching skills in interactive mode.

This is the release-readiness gate before the ALM phase. You harden the integration env now so what promotes to pre-prod and prod is already clean.

## Prerequisites

- Completed [Lab 08: Performance, Testing, and Deploy](./08-performance-test-deploy.md): site is built, tested, and deployed to your integration environment
- `/setup-auth` ran in [Lab 02, Part 5](../build/02-dataverse-and-security.md#part-5-configure-authentication-with-setup-auth) so at least one identity provider is configured
- Active PAC CLI session against the integration env (`pac auth list`)
- For the deployed-site scan, the integration env's portal URL is reachable from your machine
- For static analysis (optional): [opengrep](https://github.com/opengrep/opengrep) installed. See [Integrate phase setup](00-setup.md) for the install-or-skip details (the plugin offers a manual-review fallback if it's missing)

## Learning objectives

By the end of this lab you will be able to:

1. Pick the right `/security-review` goal for the moment (code-and-config, release-readiness, deployed-site monitoring) and explain what each one covers
2. Read the consolidated HTML report: locate findings by severity, jump to the underlying file, and tell signal from noise
3. Apply fixes interactively through `/scan-code`, `/manage-headers`, `/manage-firewall`, and `/audit-permissions`
4. Re-run `/security-review` against a deployed site as ongoing monitoring, and understand what each focused skill covers when run on its own

Picture the moment a Monday-morning incident lands in the team channel: a vendor reports the supplier portal is leaking column names in an error response, or the CSP refused a stylesheet at 2 AM and the dashboard rendered unstyled for ten minutes. Both classes of problem are catchable in advance with a single pass of `/security-review` before the change leaves the integration env. This lab is that pass, once for the supplier portal, then again on a cadence after every meaningful change.

> **Important:** `/security-review` runs every focused skill in **read-only review mode** during the consolidated run. No file or site setting is modified until you pick a specific finding and let the plugin invoke the matching skill interactively to apply the fix.

> **Further reading:** [Power Pages security model](https://learn.microsoft.com/power-pages/security/power-pages-security) · [Web application firewall for Power Pages](https://learn.microsoft.com/power-pages/security/web-application-firewall) · [Configure HTTP security headers](https://learn.microsoft.com/power-pages/security/security-headers) · [Power Pages security checklist](https://learn.microsoft.com/power-pages/security/security-checklist)

---

## Part 1: pick the right review goal

`/security-review` asks one plain-language question at the start: **what's the goal of this review?** The answer picks the matching set of focused skills.

| Goal | When to pick it | What it runs |
|---|---|---|
| **Code and config** | During development, on a feature branch, before opening a PR | `/scan-code` + dependency scanning + `/audit-permissions` + auth-configuration checks. Local files only, no deployment required. |
| **Release readiness** (recommended for this lab) | Right before promoting from integration → pre-prod | Every focused check: `/scan-code`, dependency scanning, `/scan-site`, `/manage-headers`, `/manage-firewall`, `/audit-permissions`, and auth-configuration checks |
| **Deployed site** | Ongoing monitoring of a live site | `/scan-site` + `/manage-headers` + `/manage-firewall` only, fast, runs against the live URL |

For this lab, pick **Release readiness** the first time so you see every section of the report. You'll re-run with the narrower goals later for practice.

### Step 1.1: run `/security-review`

In your AI coding CLI session, from the project root:

```
/security-review

Run a full release-readiness review before I promote the integration
env to pre-prod tomorrow. I want code, dependencies, table
permissions, browser headers, WAF, and a deployed-site scan against
the integration URL.
```

The plugin will:

1. Confirm the goal it inferred from your prompt.
2. Verify each focused skill's prerequisites (tools installed, environment authenticated, deployed site reachable). If a prerequisite is missing, the skill offers a manual-review fallback rather than aborting the whole run.
3. Run the focused skills **in parallel** where possible.
4. Consolidate every finding into a single HTML report at `docs/security-review-<timestamp>.html` and open it in your browser.

> **Reference only: your output may differ.** The plugin sequences skills based on tool availability and your environment. If `/scan-site` is slow (large sites can take hours), the plugin returns control to you and emails / notifies when the scan completes.

### Step 1.2: anatomy of the consolidated report

Open the generated HTML file. The report layout is consistent across runs; knowing what you're looking at speeds up triage.

**Top of the page:**

- A **run header** with the site name, target environment URL, the goal you picked, the start time, and the duration. Hand this header to a teammate and they have everything they need to reproduce the run.
- A **summary bar** with one number per severity: Critical / High / Medium / Low / Info. Use this to decide whether to walk through findings interactively now or schedule the work.
- A **table of contents** linking to each section. Section anchors are stable across runs, so a link to a specific finding pasted in chat remains valid as long as the report file exists.

**Each section** (one per focused skill) shows:

- A section header naming the focused skill and the prerequisite state (e.g., "✓ ran with opengrep 1.x" or "⚠ manual review fallback: opengrep not installed")
- A per-section severity tally
- A list of findings, each with: a one-line summary, severity badge, the file or site setting it relates to (linked), a "Why this matters" paragraph in plain language, and a "Remediation" hint that names the focused skill to invoke for the fix

**An example finding row looks like:**

```
[HIGH]  Content-Security-Policy allows 'unsafe-inline' for script-src
        File: .powerpages-site/site-settings/HttpHeaders/Content-Security-Policy.yml
        Why this matters: An inline-script policy lets an injected
        <script> tag execute in your users' browsers; combined with a
        single stored XSS in any content snippet, this is a session-
        hijack vector.
        Remediation: Run /manage-headers and ask for a nonce-based CSP.
```

Sections covered:

| Section | What you're reading |
|---|---|
| **Code (`/scan-code`)** | Static analysis findings from opengrep: patterns like `dangerouslySetInnerHTML` without sanitization, hardcoded URLs / secrets, missing input validation |
| **Dependencies** | Dependency-scan findings: known CVEs in your npm packages, by severity. License flags also surface here |
| **Deployed-site scan (`/scan-site`)** | Server-side scan results from the Power Pages security engine: outdated cipher suites, missing security headers on the live URL, leaked information in error responses |
| **Browser security headers (`/manage-headers`)** | Diff between current site settings (`.powerpages-site/site-settings/HttpHeaders/*`) and recommended defaults: Content Security Policy, X-Frame-Options, CORS, cookie SameSite |
| **Web application firewall (`/manage-firewall`)** | WAF posture: managed rule state, custom rules (IP / country / path blocks, rate limits). Available only on production sites in supported regions; an "ineligible" status is surfaced here |
| **Table permissions (`/audit-permissions`)** | YAML-vs-deployed-vs-code cross-check: missing permissions, overly permissive roles, unused permissions, schema problems |
| **Authentication configuration** | Provider settings, redirect URI consistency, registration mode, federated sign-out state |

Each finding has three things: a one-line summary, a "Why this matters" explanation in plain language, and a remediation hint that names the focused skill to invoke for the fix.

---

## Part 2: fix findings interactively

From the chat, the plugin offers a follow-up:

```
I found 12 findings (1 critical, 3 high, 6 medium, 2 low). Pick a
finding to walk through a fix, or run the focused skill for an
entire section.
```

Each fix runs the matching focused skill **interactively**: the skill re-reads the current state, proposes the specific change, and asks for confirmation before writing anything.

### Step 2.1: fix a `/manage-headers` finding

A common first finding is a **missing or weak Content Security Policy**. Pick that finding and the plugin invokes `/manage-headers`:

```
/manage-headers

The CSP finding from the review said my Content-Security-Policy
allows 'unsafe-inline' for scripts. Tighten it to nonce-based
inline scripts and the framework's required hosts, but keep my
existing img-src and connect-src directives.
```

The plugin will:

1. Read the current CSP from `.powerpages-site/site-settings/HttpHeaders/Content-Security-Policy.yml`.
2. Compute the new directive, preserving directives you didn't ask to change.
3. Show you a side-by-side diff (before / after).
4. After you approve, write the updated YAML.
5. Remind you to run `/deploy-site` so the change reaches the live integration env, and to test in an incognito window so cached headers don't mislead you.

> **Note:** Browser security headers in Power Pages are configured via site settings under `HttpHeaders/*`. The plugin writes the YAML. You don't edit headers in the maker portal.

### Step 2.2: fix a `/manage-firewall` finding

If the deployed site is in a region with WAF available, the report typically surfaces three classes of finding:

| Class | Typical finding | Skill action |
|---|---|---|
| **Posture** | Managed WAF rules are in **Detect** mode (logging only) | `/manage-firewall` flips to **Prevent** mode |
| **Custom rules** | The sign-in page has no rate limit | `/manage-firewall` adds a rate-limit rule scoped to `/SignIn` |
| **Geo / IP** | Traffic from country X is unusual for the audience | `/manage-firewall` adds a country block list |

Invoke the skill for a specific finding:

```
/manage-firewall

Add a rate limit of 30 requests per minute per IP on the
/SignIn path. Apply it to the production stage if WAF isn't
available on integration.
```

The plugin will check WAF eligibility, propose the rule shape, and apply it after you confirm.

> **Important:** WAF is **production-only** in most regions. If your integration env doesn't have WAF, the skill reports the eligibility and offers to apply the rule to the production stage as part of Lab 15's pipeline deployment instead. Don't try to force-enable WAF on a non-eligible environment.

### Step 2.3: fix an `/audit-permissions` finding

The permission audit catches drift between three sources of truth:

- `.powerpages-site/table-permissions/*.yml` (what you committed)
- The deployed site's actual permission records (what the env applied)
- The site code (what tables the SPA actually reads / writes)

The most common findings are:

| Finding | Cause | Fix |
|---|---|---|
| **Missing permission** | New `_<lookup>_value` column added; permission YAML wasn't updated | Add column to the table permission's field list and redeploy |
| **Overly permissive role** | Role has CRUD on a table the SPA only reads | Tighten the YAML to read-only and redeploy |
| **Unused permission** | Old permission for a feature that was removed | Delete the YAML file and redeploy |

Walk through one finding:

```
/audit-permissions

The audit said the cr_invoice permission grants Delete but the
SPA never calls DELETE. Tighten the permission to read+create+
write only.
```

The plugin reads the current YAML, proposes the diff, and writes the change after confirmation.

### Step 2.4: re-run the consolidated review

After applying fixes, run `/security-review` again with the same goal. The fixed findings should be gone; new findings (if any) reflect changes the fixes introduced. Iterate until the report shows only findings you've consciously accepted.

---

## Part 3: use focused skills on their own

`/security-review` is the orchestrator, but each focused skill stands on its own. Reach for them directly when the situation is narrow.

| Situation | Skill to run |
|---|---|
| You just edited a few files on a feature branch, want a quick code check before opening a PR | `/scan-code` |
| You hit a specific browser console error about a blocked stylesheet → CSP problem | `/manage-headers` |
| You're seeing bot traffic spike on `/SignIn` | `/manage-firewall` |
| You added a column to a Dataverse table and want to confirm the permission YAML is in sync | `/audit-permissions` |
| You want a fresh deployed-site scan of production without re-running anything code-related | `/security-review` with the **Deployed site** goal, or `/scan-site` directly |

### Step 3.1: scan-code as a pre-PR check

`/scan-code` is the cheapest focused skill: it's local-only, finishes in seconds on a small repo, and catches the kind of regression a code review would otherwise have to spot manually. A useful habit is to run it before `git push`:

```
/scan-code

Scan src/ and report anything Critical or High before I open
the PR. Skip Low / Info findings. I'll catch those in the
weekly security review.
```

#### No-install option: a quick grep / findstr self-check

Don't want to install a static-analysis tool? `/scan-code` already falls back to a manual review without opengrep, and you can run a 10-second text scan yourself with tools you already have: `grep` (ships with Git Bash on Windows, native on macOS / Linux) or the built-in Windows `findstr`:

```bash
# Git Bash / macOS / Linux
grep -rn "dangerouslySetInnerHTML" src/                                       # unsanitized HTML injection
grep -rniE "(api[_-]?key|secret|password|token|bearer)[[:space:]]*[:=]" src/  # hardcoded secrets
grep -rn "http://" src/                                                       # non-TLS endpoints
```

```bat
:: Windows (built-in findstr)
findstr /s /n /i "dangerouslySetInnerHTML" src\*.ts src\*.tsx
findstr /s /n /i "apikey secret password token bearer" src\*.ts src\*.tsx
findstr /s /n "http://" src\*.ts src\*.tsx
```

> **This is a smell test, not a security scan.** `grep` and `findstr` match raw text: they can't follow data flow, tell a real secret from a variable named `token`, or catch anything semantic. They produce false positives *and* miss real issues. Use this as a fast pre-push check; rely on `/scan-code` (with opengrep) or the consolidated `/security-review` for actual static analysis.

### Step 3.2: deployed-site scan as ongoing monitoring

`/scan-site` runs the server-side Power Pages security engine against a live URL. It's slow on large sites (minutes to hours) and finds things only the live runtime knows: TLS configuration, header response on edge nodes, error-response leakage.

A practical cadence is to schedule it monthly against production once the Lab 13 promotion is in place:

```
/scan-site

Run a scan against the production URL and email me the summary
when it finishes. Compare against last month's scan and surface
only the new findings.
```

---

## Part 4: reference, integrate the security gate into your ALM flow

The point of running this lab here, before the ALM phase, is that the integration env is the **last place a finding is cheap to fix.** Once a permission YAML or a header value lands in pre-prod via a managed solution, fixing it means another pipeline run. Two follow-ups extend that gate into the ALM phase.

### When you reach Lab 13 (Multi-Environment promotion)

`/security-review` with the **Deployed site** goal is a sensible **post-deploy** verification step against pre-prod before the manual approval gate to production. Slot it between `/test-site` (Step 4.3 of Lab 13) and the prod-stage approval. The same report you read in this lab now gates the prod promotion.

### Schedule `/scan-site` against production

After Lab 13 puts a site in prod, schedule a monthly run of `/scan-site` against the live URL. New CVEs and edge-case header drift land between releases; this is how you find them before the next release does. Set it up as a recurring job so a new finding surfaces between releases.

> **Design takeaway:** Security review isn't a one-time pass / fail. It's three loops at three cadences: `/scan-code` per PR, `/security-review` per release, `/scan-site` against production on a schedule. Each loop catches what the others can't.

---

## Troubleshooting

| Problem | Cause | Fix |
|---|---|---|
| `/security-review` says "opengrep not installed" and offers a manual review | The static-analysis tool isn't on PATH | Install opengrep. On Windows, `winget install opengrep`; on macOS, `brew install opengrep`. Re-run the skill. |
| `/scan-site` returns "site unreachable" | Integration env URL isn't accessible from your machine, or the site isn't activated | Confirm the URL opens in a browser. If the site was reactivated to a new subdomain, the plugin's cached URL may be stale. Re-run `/activate-site` first |
| `/manage-firewall` reports "WAF not available in this region" | Your integration env is in a region where WAF is not offered, or the env is not a production-eligible tier | Skip the WAF section. Re-run `/manage-firewall` against production after Lab 13's promotion. |
| `/audit-permissions` says "deployed permissions out of sync with YAML" | Someone changed permissions directly in the maker portal | Either accept the maker-portal state (re-export and unpack), or redeploy from the committed YAML, pick one source of truth |
| The HTML report has a section that's empty | The corresponding focused skill's prerequisite wasn't met | The empty section's header explains which prerequisite was missing (e.g. "opengrep not installed", "site not reachable"). Resolve it and re-run with the same goal |
| Report says CSP is too weak but `/manage-headers` proposes the same value back | Browser cached the old headers | Hard-refresh (Ctrl+Shift+R) or use an incognito window. Re-run `/manage-headers` after re-deploy. |

## Verification

You have completed this lab when:

- [ ] `/security-review` produced a consolidated HTML report at `docs/security-review-<timestamp>.html` and you opened it
- [ ] You walked through at least one Critical or High finding by invoking the matching focused skill (`/scan-code`, `/manage-headers`, `/manage-firewall`, or `/audit-permissions`) and applied the proposed fix
- [ ] You re-ran `/security-review` after applying fixes and confirmed the fixed findings are gone
- [ ] You can name what each focused skill covers (code, deployed-site, headers, firewall, permissions) and when to run it on its own
- [ ] `/scan-code` ran cleanly (no Critical / High findings), or any remaining findings are consciously accepted and documented
- [ ] You understand the WAF-on-production-only constraint and have a plan for when `/manage-firewall` rules will land (during Lab 13 promotion, not now)

### Generic debug prompt

If a focused skill fails partway, paste the output back to your AI coding CLI:

```
I ran /security-review and the manage-headers section errored
with this output. Diagnose and propose a fix:

[paste output, including the path to any partial report]
```

## Fallback

If a focused skill's underlying tool isn't installed (opengrep) and you can't install it in the lab session:

1. **Run `/security-review` anyway.** Sections backed by missing tools fall back to a structured **manual review**: the plugin walks you through the same checks conversationally instead of with the tool.
2. **Use the deployed-site scan as your floor.** `/scan-site` requires no local tooling: just a reachable URL and an authenticated PAC CLI session.
3. **`/audit-permissions` alone is high signal.** It needs only the YAML and an auth session. If you can only run one focused skill, run this one. Permission drift is the highest-impact security risk on a Power Pages site.
4. **Re-run after the ALM lab.** Once your integration env is also accessible to a CI runner, you can wire `/scan-code` and `/audit-permissions` into the workflow and never lose coverage to a missing local tool again.

## Key takeaways

- `/security-review` orchestrates focused checks across code, dependencies, deployed-site scan results, browser headers, WAF posture, table permissions, and authentication configuration, then writes a single HTML report
- The consolidated run is **read-only**: fixes only happen when you interactively invoke the matching focused skill on a specific finding
- The three goals (Code-and-config, Release-readiness, Deployed site) pick different subsets of focused skills: pick by what you need right now, not always the broadest one
- Each focused skill stands on its own; the right cadence is per-PR (`/scan-code`), per-release (`/security-review`), and scheduled against production (`/scan-site`)
- WAF (`/manage-firewall`) is production-only in most regions. Plan its application during the pipeline-driven prod promotion, not during integration env work
- Run this lab **before** the ALM phase: the integration env is the last place a finding is cheap to fix

## What's next

That wraps the **Integrate phase**. The ALM phase adds one new tool, **GitHub CLI**, plus a GitHub account. Set those up first ([ALM phase setup](../alm/00-setup.md) takes a few minutes), then start Lab 10.

→ [ALM phase setup](../alm/00-setup.md) (install GitHub CLI) → [Lab 10: Source Control](../alm/10-source-control.md)

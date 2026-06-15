---
sidebar_position: 1
sidebar_label: "Lab 10: Source Control"
title: "Lab 10: Source Control"
---

# Lab 10: Source Control

## Why ALM matters

The portal you built through the previous labs ends with a one-shot `/deploy-site` to a single environment. That works for a demo. It breaks the moment a teammate joins.

Imagine three things happen this week:

1. **A teammate wants to add a "memo" column to invoices.** They have no copy of your code. They have no copy of the Dataverse schema. They cannot make the change without sitting at your desk.
2. **A change you deployed broke the dashboard for everyone.** You want to roll back. You don't have yesterday's bundle. You don't remember which migration to undo. The site is broken until you re-author the change.
3. **A reviewer asks you to prove that the recent permission change to `cr_invoice` was reviewed before it shipped.** You have no record. No PR. No audit trail.

Each of these is a normal Tuesday in production. ALM is the practice that makes them survivable. The ALM phase solves them with a three-part strategy, one built on top of the next:

1. **Source control** (Labs 10-12) — code review and history on GitHub
2. **Solution packaging** (Lab 11) — your Dataverse components captured as reproducible source
3. **Automated promotion** (Labs 13-14) — CI/CD to integration, then manual approval gates up to production

End to end, that pipeline looks like this:

```mermaid
flowchart LR
    Dev["Dev env<br/>(your laptop)"] -->|git push / PR| GH["GitHub<br/>source of truth"]
    GH -->|CI on merge<br/>(Lab 13)| Int["Integration env"]
    Int -->|Pipelines + approval<br/>(Lab 14)| Pre["Pre-prod env"]
    Pre -->|manual approval<br/>(Lab 14)| Prod["Production env"]
```

This lab is the first step: putting your portal under source control.

## What you will build

A Git repository containing your portal source, pushed to GitHub, with a `.gitignore` that protects secrets and build artifacts and (optionally) branch protection on `main` enforcing PR reviews.

> **Why GitHub and solutions, not Power Platform Git integration?** Power Platform has a built-in [Git integration](https://learn.microsoft.com/power-platform/alm/git-integration/overview) feature, but it **doesn't support SPA (code) sites**. So this track uses a plain GitHub repository for the source plus the `pac solution` unpack/pack workflow (Lab 11) for the Dataverse components — the combination that *does* work for SPA sites.

## Prerequisites

- Completed [Lab 08: Performance, Testing, and Deploy](../integrate/08-performance-test-deploy.md) (working portal deployed to your env)
- Completed [Lab 09: Security Review](../integrate/09-security-review.md) (release-readiness pass against the integration env — any Critical / High findings are fixed or consciously accepted before code lands in source control)
- Git installed and configured (`git --version`)
- `gh` (GitHub CLI) installed and authenticated (`gh auth status`)
- Portal directory accessible on disk (the folder where you ran `/create-site`)

> **Before you start.** You're putting the *existing* portal directory under source control — the folder with `package.json` and `.powerpages-site/`. You do **not** need to re-deploy: the site already live in your environment from Lab 08 stays as it is, and the same source files and configuration on disk are all this lab needs.

## Learning objectives

By the end of this lab you will be able to:

1. Initialize the portal directory as a Git repository with a `.gitignore` that protects secrets and build artifacts
2. Create a GitHub repository from the command line using `gh repo create`
3. Apply commit conventions and optional branch protection that pay off in Lab 12

> **Further reading:** [Microsoft Power Platform ALM basics](https://learn.microsoft.com/power-platform/alm/basics-alm) · [GitHub CLI `gh` manual](https://cli.github.com/manual/) · [About GitHub branch protection rules](https://docs.github.com/repositories/configuring-branches-and-merges-in-your-repository/defining-the-mergeability-of-pull-requests/about-protected-branches)

---

## Step 1: initialize the repo

Open a terminal in your portal root (the folder that contains `package.json` and `.powerpages-site/`).

> **First time using Git on this machine?** Run these once before your first commit so Git knows who you are:
>
> ```bash
> git config --global user.name "Your Name"
> git config --global user.email "your.email@example.com"
> ```

```bash
git init
git status
```

`git status` should list every file in the directory as "Untracked". Don't commit anything yet — the next step adds a `.gitignore` so we don't commit secrets or build output.

---

## Step 2: write the `.gitignore`

An SPA-site repo has files that should never enter source control:

- **`node_modules/`** — 100k+ files, fully reproducible from `package-lock.json`
- **`dist/`** — build output, regenerated on every CI run
- **`.env`, `.env.local`** — secrets, API keys, local connection details
- **`.pac/`** — PAC CLI auth profiles (contain refresh tokens)
- **`build/`** — the staging folder we'll use in Lab 11 for solution zips
- **OS junk** — `.DS_Store`, `Thumbs.db`

Files that **are** committed (don't accidentally ignore them):

- `src/` — your SPA source code
- `.powerpages-site/` — portal configuration YAML (web roles, table permissions, site settings)
- `src/solution/` — the unpacked Dataverse solution created in Lab 11 (env-specific site settings live here as environment variable references; values are supplied per target env at solution import time)
- `CLAUDE.md` (and `AGENTS.md` if Copilot CLI created one) — project context for the AI coding CLI; commit so teammates' AI sessions get the same baseline

Create `.gitignore` at the repo root:

```bash
cat > .gitignore <<'EOF'
# Dependencies
node_modules/

# Build output
dist/
build/

# Solution zips (we commit unpacked source instead -- see Lab 11)
*.zip

# Local environment / secrets
.env*
!.env.example
docs/alm/deploymentSettings.local.json

# PAC CLI auth profiles
.pac/

# AI coding tool artifacts (local session state, not source)
.claude/
.aider*
.copilot-history/

# Editor / OS
.vscode/*
!.vscode/extensions.json
.idea/
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*
EOF
```

**Why `*.zip` is here:** Lab 11 will export Dataverse solutions as `.zip`, then immediately unpack them into `src/solution/` for source control. The zip itself is a build artifact — ignore it. This is the **unpack-to-source-control pattern** that's the heart of the ALM phase.

Verify your `.gitignore` works:

```bash
git status
```

You should no longer see `node_modules/`, `dist/`, `build/`, `.pac/`, local env files, or AI-tool session folders in the untracked list.

---

## Step 3: first commit

```bash
git add .
git status              # confirm what's about to be committed -- no secrets, no node_modules
git commit -m "Initial commit: supplier portal"
```

Conventions worth picking now (and keeping for the rest of the ALM phase):

| Convention                              | Example                                                   | Why                                             |
| --------------------------------------- | --------------------------------------------------------- | ----------------------------------------------- |
| Imperative subject line, under 70 chars | `Add memo column to invoice list`                         | Reads like an instruction, quick to scan in log |
| Body explains the *why*, not the *what* | "Finance asked for memo so they can flag urgent items..." | The diff already shows what changed             |
| One logical change per commit           | Don't bundle "fix typo" with "add new feature"            | Makes `git revert` precise                      |
| Reference the PR / issue if applicable  | `Fixes #42` in the body                                   | Cross-links the audit trail                     |

---

## Step 4: create the GitHub repo

We'll create the remote repo from the command line so you don't have to bounce to a browser.

```bash
gh repo create supplier-portal --private --source=. --remote=origin --push
```

What this does:

- `--private` creates a private repo (you can change visibility later in the GitHub UI)
- `--source=.` says "the local repo is this directory"
- `--remote=origin` registers the GitHub repo as the `origin` remote
- `--push` pushes your initial commit immediately

> **Tip:** if your GitHub account is part of an organization, prefix with the org name: `gh repo create my-org/supplier-portal ...`. Without the prefix, the repo is created under your personal account.

Verify:

```bash
git remote -v
gh repo view --web    # opens the repo page in your browser
```

You should see the supplier-portal source files in GitHub. Spend 30 seconds clicking through the directory listing — this is what your reviewers will see when they open a PR.

---

## Step 5: inspect What's NOT in the repo

Open the GitHub web view and confirm:

- [ ] No `node_modules/` directory
- [ ] No `dist/` or `build/` directory
- [ ] No `.env` file
- [ ] No `.pac/` directory
- [ ] No `.zip` files
- [ ] **Yes** to `package.json`, `tsconfig.json`, `src/`, `.powerpages-site/`, `.gitignore`

If any of the "no" items showed up: you committed before adding `.gitignore`, or the file glob in `.gitignore` is wrong. Fix it now:

```bash
# Remove from index but keep on disk
git rm -r --cached --ignore-unmatch node_modules dist build .pac .claude .copilot-history
git rm --cached --ignore-unmatch .env .env.local .env.*.local *.zip docs/alm/deploymentSettings.local.json

git commit -m "Remove files that should not be tracked"
git push
```

---

## Step 6: branch protection (optional)

If your GitHub plan supports it, turn on branch protection for `main` now — it pays off in Lab 12.

The simplest path is the GitHub web UI:

1. Run `gh repo view --web` to open the repo in your browser
2. Navigate to **Settings → Branches → Add branch ruleset** (or **Add rule** on older accounts)
3. Set **Branch name pattern** to `main`
4. Enable **Require a pull request before merging** with at least 1 approval
5. Save

This says: nobody can push directly to `main`; every change has to go through a PR with at least one approval. Lab 12 exercises this in the feature-development workflow.

> **Tip:** if your account is on GitHub Free for personal repos, branch protection requires the repo to be public OR a GitHub Pro / Team / Enterprise plan. If unavailable, skip this step — Lab 12 still works, you'll need to discipline yourself not to push to `main` directly.

---

## Verification

You have completed this lab when:

- [ ] `git status` runs cleanly in the project root and reports a tracked working tree
- [ ] `.gitignore` excludes `node_modules/`, `dist/`, `.env*`, `.pac/`, and AI tool artifact folders
- [ ] `git log --oneline` shows at least the initial commit
- [ ] `gh repo view` resolves to a real GitHub repository owned by you (or your org)
- [ ] `git ls-remote origin` lists `refs/heads/main`
- [ ] Pushing directly to `main` is blocked by branch protection (or you've consciously skipped it on a Free plan), and PRs are required to merge

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `gh repo create` says "name already exists" | Pick a different name, or `gh repo delete <name>` (asks for confirmation) |
| `gh: command not found` | Install GitHub CLI from https://cli.github.com/, restart terminal |
| `Permission denied (publickey)` on push | You're using SSH but `gh` set up HTTPS. Run `gh auth setup-git` to fix the credential helper. |
| Accidentally committed `.env` | `git rm --cached .env && git commit -m "Remove .env from tracking"`. **Rotate any secrets that were in it** — they are now in your Git history forever. |

## Fallback

If `gh` (the GitHub CLI) will not authenticate or `gh repo create` keeps failing:

1. Run `gh auth status` to see whether you are signed in. If not, `gh auth login` and pick **GitHub.com → HTTPS → authenticate via web browser**.
2. If your work account has SSO restrictions, run `gh auth refresh -s repo,workflow,admin:org` to grant the scopes the lab needs (repo create, workflows, branch protection).
3. As a last resort, create the repo manually in the GitHub web UI, then wire it up locally:
   ```bash
   git remote add origin https://github.com/<you>/<repo>.git
   git branch -M main
   git push -u origin main
   ```
   You can come back to `gh` for branch protection in Step 6 once auth is healthy.
4. If `git push` itself fails with `Permission denied (publickey)` and you are stuck on SSH, run `gh auth setup-git` to switch the credential helper to HTTPS and retry.

---

## Key takeaways

- A good `.gitignore` is your first line of defense against committing secrets and build output
- `gh repo create --source=. --push` is a one-shot "init repo and ship to GitHub" command
- Branch protection on `main` makes the workflows in Lab 12 enforceable, not merely suggested

## What's next

→ [Lab 11: Solution Packaging and Dataverse Dependencies](./11-solution-and-dependencies.md)

---
name: lab-authoring
description: Conventions for writing and editing labs in this Power Pages Docusaurus guide. Use when adding a new lab, editing an existing lab, restructuring a phase, or reviewing doc prose for this repo. ALWAYS drive the work through the doc-coauthoring skill and ground every Power Pages claim with the microsoft-learn MCP. Covers frontmatter, sentence-case headings, slug/number-prefix rules, cumulative lab continuity, Mermaid usage, and the verification gate.
---

# Lab authoring conventions

This repo is a Docusaurus 3.7 site teaching Power Pages SPA development. Follow these rules when authoring or editing any `docs/**/*.md` file. See `CLAUDE.md` for the full project overview.

## Always — two non-negotiable practices

Whenever you write or substantially edit a document in this repo:

1. **Drive the work through the `doc-coauthoring` skill.** Don't free-write a lab or large section directly. Invoke `doc-coauthoring` and follow its structured workflow — gather context, draft, iterate with the author, and verify the doc works for a reader. Apply the conventions below *within* that workflow.
2. **Ground every Power Pages claim with the microsoft-learn MCP.** Before stating any skill name, command, flag, API, or behavior, confirm it with `microsoft_docs_search` / `microsoft_docs_fetch`. Never describe Power Pages tooling from memory — it changes fast and is the subject matter of these labs.

These two are required, not optional. The rest of this document is *how* to apply them in this repo.

## Before you write — ground every Power Pages claim

Power Pages tooling moves fast and is the *subject matter* of these labs. Do **not** describe a plugin skill, flag, or behavior from memory.

- Verify skill names, commands, and behavior with the **microsoft-learn MCP** (`microsoft_docs_search` / `microsoft_docs_fetch`). The canonical skills list is *Get started with the Power Pages plugin for GitHub Copilot CLI and Claude Code*.
- When you reference a `/skill`, confirm it exists in that official list. If a skill is documented on Microsoft Learn but missing from the *locally installed* plugin, it may not be shipping yet in the public marketplace — flag the gap to the author rather than assuming the docs are wrong.
- Cross-check live behavior by running the actual skill when feasible (the plugin is installed in this environment).

## Frontmatter (required on every lab)

```yaml
---
sidebar_position: <N>            # orders the file within its phase folder
sidebar_label: "Lab 0N: Short Title"
title: "Lab 0N: Full Title"      # page <title> and H1 source
---
```

`docs/intro.md` additionally sets `slug: /` (it is the landing page).

## Headings and prose style (Microsoft Writing Style Guide)

- **H2/H3/H4 are sentence case.** H1 / page titles keep their authored casing.
- Use em dashes (`—`), not `--`. Prefer "to" over "in order to", "use" over "utilize".
- New product names / acronyms that must keep casing in headings go in `PRESERVE_CASE` in **both** `scripts/ms-learn-style-sweep.{mjs,py}` *and* the Vale vocab at `.vale/styles/config/vocabularies/PowerPages/accept.txt`.
- Run the mechanical sweep after bulk edits: `npm run style` (apply) or `npm run style:check` (verify only).

## Routing and links (easy to break)

- `routeBasePath` is `/` — docs serve at the site root, **no `/docs` prefix**.
- `numberPrefixParser: false` — **slugs keep the `NN-` prefix**. `docs/build/01-scaffold-spa-portal.md` → `/build/01-scaffold-spa-portal`. Keep the prefix when renaming and update every referrer.
- `onBrokenLinks: 'throw'` — a broken internal link **fails the build**. Always run `npm run build` (or `npm run check`) after adding cross-links.
- The sidebar is auto-generated from folder structure (`build/`, `integrate/`, `alm/`, `reference/`); adding a file to a phase folder adds it to the sidebar.

## Cumulative continuity (the most common source of subtle bugs)

The lab track is **cumulative**: each lab starts from the portal state the previous lab produced. The "State you carry forward" table in `docs/intro.md` is the source of truth.

- When you change what **Lab N produces**, check **Lab N+1's** opening assumptions and update them.
- When you add a new lab mid-track, renumber following labs, fix `sidebar_position`, and update the continuity table and any cross-links.
- Mermaid diagrams are enabled and used heavily — verify they render with `npm run build` (a malformed diagram only surfaces at build time).

## Verification gate (run before committing)

```bash
npm run check        # typecheck → style:check → production build (throws on broken links)
npm run lint:prose   # optional: Vale Microsoft-style prose lint (needs the vale binary)
```

A pre-commit hook (`.githooks/pre-commit`, enabled via `git config core.hooksPath .githooks`) runs the style check and typecheck on staged docs automatically.

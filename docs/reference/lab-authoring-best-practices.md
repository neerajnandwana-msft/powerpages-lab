---
sidebar_position: 3
sidebar_label: "Lab Authoring Best Practices"
title: "Lab Authoring Best Practices"
---

# Lab Authoring Best Practices

This is the rulebook for the Power Pages lab guide. It explains what makes a lab "good" in this guide, lays out the conventions that keep all 13 labs consistent, and ends with a copy-paste skeleton you can use to start a new lab.

If you are about to write or revise a lab, read the principles, then use the skeleton at the end. If you are reviewing a lab PR, run through the **Authoring Checklist** at the bottom — every item is either a green light or a blocker.

---

## What is a Lab in this guide?

A lab is a self-contained document that does **three things at once**. If any one of the three is missing, it is not a lab.

### Pillar 1 — followable steps

A reader can complete the stated objective by following the document in order, without external context. Every step has a literal command or click sequence and a verifiable outcome (a file path, a line of output, a UI behaviour).

The canonical example is [Lab 05: Add Server Logic](../integrate/05-add-server-logic.md), where each `Step N.X` opens with the exact prompt to paste into the AI coding CLI and closes with a `Verify:` checkbox list.

### Pillar 2 — concept commentary

A lab teaches *why*, not just *what*. After running a step, the reader should understand the underlying concept well enough to debug it later, modify it, or recognise the same pattern in a different context. Commentary lives **next to** the step it explains, not in a separate "background" section that readers will skip.

The canonical example is the *Why server logic matters* / *Why it exists* style callouts in [Lab 05: Add Server Logic](../integrate/05-add-server-logic.md), and the validate-and-execute "anti-pattern vs. pattern" prose blocks in the same lab.

### Pillar 3 — reference pointers

When the reader wants to go deeper than the lab does, they shouldn't have to leave the lab to find out where to look. Every lab opens with a `> **Further reading:**` callout that points to MS Learn pages, neighbouring labs, and the Reference section of this guide.

The canonical example is the four-link `Further reading` callout at the top of [Lab 05: Add Server Logic](../integrate/05-add-server-logic.md).

---

## Principles for pillar 1: followable steps

A step is followable when it lets the reader move forward without guessing.

### 1. number every step. `Step N.X` inside `Part N`

Top-level structure in the lab body is `## Part N: <noun phrase>`. Each part contains one or more `### Step N.X: <verb-led title>` substeps. Always include both the part number and the step letter so the reader can describe progress unambiguously ("I'm stuck on Step 2.3").

The only exception is observational labs (currently **Lab 13: Multi-Env Promotion**), which describe a system rather than guide hands-on work. Those use `## Part N: <noun>` without `Step N.X` substeps.

### 2. lead with the literal command, then explain

Open every step with the exact thing the reader runs or clicks, in a code fence, before any prose:

```
/add-server-logic

Nothing currently stops a supplier from submitting the same PO number 
twice ...
```

After the command, list outcomes in a numbered "the skill will:" block. The reader should always know what to expect before they hit Enter.

### 3. end every step with a verifiable outcome

A step is finished when the reader can confirm something happened. Use one of:

- A `Verify:` checklist (`- [ ] file at <path> exists`, `- [ ] response status 200`)
- An "Expected:" line ("Expected: redirect to `/invoices`, new record in the list")
- A live-site behaviour the reader can see in the browser

Vague endings like "and that's it" or "now you have server logic" are not verifiable. Replace them.

### 4. call out deployed-site requirements explicitly

Several Power Pages features (server logic, cloud flows, AI APIs) only run on the deployed site, not on `localhost:5173`. When a step depends on the deployed site, mark it with a `> **Important:**` callout, like Lab 03 does:

> **Important:** The Power Pages Web API (`/_api/`) only works on the deployed site, not on localhost. You will test by deploying and opening the live site URL, not localhost:5173.

### 5. Don't skip the "reference only — your output may differ" admonition

When a step shows a code sample that came out of an AI coding CLI, include this admonition above the sample (verbatim, copy from existing labs):

> **Reference only — your output may differ.** The code shown below illustrates what the plugin *typically* generates. The plugin adapts its output to your exact project (variable names, helper structure, comment style, error-handling shape), so your files may look different in small ways. Use these samples to understand the **concept** and the **why** behind each piece — do not rewrite your generated files to match line-for-line. If something in your generated code looks meaningfully different, ask your AI coding CLI to explain the choice before changing anything.

The admonition is intentionally absent from ALM labs (09-13), because their artifacts are deterministic — the output of `pac solution export` is a known shape, not an AI improvisation.

---

## Principles for pillar 2: concept commentary

Commentary turns a sequence of commands into a learning experience.

### 1. use named callouts, not buried prose

The canonical callouts (used across labs):

| Callout | When to use |
|---|---|
| `> **Why X exists:**` | Explain the design rationale for a Power Pages feature you just used. One paragraph. Lab 05 uses this for server logic, cloud flows, and AI APIs. |
| `> **Important:**` | A constraint or gotcha the reader will hit if they ignore it (deployed-site requirement, sandbox timeout, etc.). |
| `> **Note:**` | A side detail the reader doesn't need to act on, but should know. |
| `> **Design takeaway:**` | A meta-insight at the end of a step that ties the work back to a broader principle. Lab 05 uses this after the tamper test. |
| `> **Rule of thumb:**` | A heuristic the reader will reuse outside this lab. |

Avoid inventing new callout names. New labs should reuse this vocabulary.

### 2. show "good vs. bad" for any pattern that's easy to misuse

Some patterns have a tempting wrong shape and a less obvious right shape. Show both, side by side, before showing the right code. The validate-and-execute pattern in Lab 05 is the canonical example:

```
The anti-pattern to avoid:

1. Client → Server Logic: "Is PO-2026-011 unique?"
2. Server Logic → Client: { valid: true }
3. Client → Web API: POST /_api/cr_invoices (creates the invoice)

Step 3 can happen without step 1. The client simply skips the validation call.
```

Then show the pattern that protects the rule.

### 3. use mermaid for any new runtime path

When a lab introduces a new runtime path (browser → sandbox → Dataverse, browser → cloud flow → Teams, etc.), include a mermaid diagram. Use:

- `flowchart LR` for runtime call flows (left-to-right reads as request flow)
- `flowchart TD` for hierarchical decisions or branching logic

Don't add mermaid for the sake of it — labs that don't introduce a new path (like ALM labs 11 and 13) are fine without diagrams.

### 4. keep commentary next to the step

A reader who reads a step, runs the command, and sees the output should not have to scroll up or down to find the commentary that explains it. If the commentary is more than two paragraphs, consider whether it should be its own `### Step N.X` ahead of the action.

The exception is unavoidable: a few labs have a `## When to Use X` reference table at the top (Lab 05's "When to Use Server-Side Business Logic"). That's fine when the table itself is the decision aid for *whether to do the lab at all*. Don't put generic theory there.

---

## Principles for pillar 3: reference pointers

References make the lab a launching pad, not a dead end.

### 1. open with `> **Further reading:**`

Every lab includes a `> **Further reading:**` callout near the top, listing 2-5 MS Learn or MS Docs links relevant to the lab's topic. Use the dot-separated single-line format:

```
> **Further reading:** [Server logic overview](https://learn.microsoft.com/power-pages/configure/server-logic-overview) · [Author server logic](https://learn.microsoft.com/...) · [Server logic operations](https://learn.microsoft.com/...)
```

Don't bury further reading inside steps — readers scan callouts, not prose.

### 2. use the full lab title in cross-lab links

Cross-lab links use the form `[Lab NN: Full Title](relative-path)`, never abbreviated:

- ✅ `[Lab 02: Set Up Dataverse and Security](./02-dataverse-and-security.md)`
- ❌ `[Lab 02](./02-dataverse-and-security.md)`
- ❌ `[Set Up Dataverse and Security](./02-dataverse-and-security.md)`

Relative paths follow the directory layout: same-folder uses `./NN-...md`, cross-folder uses `../<phase>/NN-...md`.

### 3. demote reference-only material to the end

Some labs need reference content (decision matrices, anti-pattern tables, concept tables) to be readable, but that content interrupts the hands-on flow if it sits at the top. The convention is to put it in a final `## Part N: Reference — <noun>` part **after** the hands-on parts and **before** Troubleshooting.

[Lab 04: Plan the Service Layer with /integrate-backend](../integrate/04-pick-backend-pattern.md) is the canonical example: hands-on Parts 1-3, then Part 4 holds the four-pattern tables, decision matrix, and anti-patterns.

### 4. link out to neighbouring labs explicitly

When a step touches functionality covered in another lab, link to that lab. The reader will recognise the pattern and know where to dive deeper. The Lab 05 Step 2.1 prerequisites callout is a good example — it links to Lab 04 explicitly.

---

## Cross-Cutting conventions

### Front matter

Every lab and reference doc opens with exactly these four lines:

```yaml
---
sidebar_position: <integer>
sidebar_label: "<short label>"
title: "<full page title>"
---
```

`sidebar_position` is the position within the parent category (1-indexed). `sidebar_label` is what shows in the sidebar (kept short). `title` is what shows as the H1 / browser tab.

### Heading capitalization

Title Case throughout: "What You Will Build", "Part 1: Generate Web API Service Layer". Do not switch between Title Case and Sentence case within a single lab.

### Code-fence languages

Use these language tags, and only these:

| Language | Tag |
|---|---|
| Shell commands | `bash` |
| TypeScript | `typescript` (not `ts`) |
| TSX (React) | `typescript` is fine for snippets; `tsx` only when JSX is the focus |
| YAML | `yaml` |
| JSON | `json` |
| Mermaid | `mermaid` |
| PowerShell | `powershell` |

A literal block with no code (e.g., a slash-command prompt) can use no language tag — use that sparingly.

### Verification checkboxes

Use markdown checkboxes throughout: `- [ ] file at <path> exists`. The final `## Verification` section opens with the exact phrase **"You have completed this lab when:"** and is followed by a `- [ ]` list of 4-7 concrete, checkable items.

### Mermaid

Use `flowchart LR` for runtime call flows and `flowchart TD` for hierarchical decisions. Keep node labels short — full sentences belong in the prose, not in the diagram. When a diagram is paired with numbered prose steps, label diagram edges with the same numbers (`1. pac solution export`, `2. pac solution unpack`, etc.) so the prose and the diagram cross-reference cleanly.

---

## The standard Lab structure

A "standard" lab (every lab in Build and Integrate, plus 09 and 12) has these sections in this order. Reference-style or observational labs may legitimately omit some sections — that's noted inline.

| Section | Purpose | Required? |
|---|---|---|
| **Front matter** | Sidebar position, label, title | Always |
| **# Title** | H1, matches `title` field | Always |
| **## What You Will Build** | One paragraph describing the concrete deliverable. Not "what you will learn" — what you will *have*. | Required for hands-on labs; optional for observational labs (Lab 13) |
| **## Prerequisites** | Bulleted, checkable items: previous labs completed, tools installed, accounts active | Required |
| **## Learning Objectives** | Numbered list, "By the end of this lab you will be able to..." | Required |
| **Scenario paragraph** | One paragraph framing the user problem in story form | Recommended |
| **`> Important:` callout** | Constraints (deployed-site requirement, beta features, etc.) | When applicable |
| **`> Further reading:` callout** | 2-5 MS Learn links | Required |
| **`---`** | Horizontal rule separating front-matter sections from the body | Required |
| **`## Part N:` body** | Hands-on parts with `### Step N.X` substeps | Required (or `## Part N` without substeps for observational labs) |
| **`## Part N: Reference — <noun>`** | Reference-only material (decision matrices, etc.), placed at the end of the body | When applicable |
| **`---`** | Horizontal rule before standard tail sections | Required |
| **`## Troubleshooting`** | 4-column table: Error \| What you see \| Cause \| Fix | Required for any lab that runs an AI coding CLI skill or invokes an external service |
| **`## Verification`** | "You have completed this lab when:" + `- [ ]` list | Required |
| **`### Generic Debug Prompt`** | Paste-into-AI-coding-CLI block for any unknown failure | Required for skill-driven labs; optional for ALM labs |
| **`## Fallback`** | Recovery procedure if the primary path fails (auth lapsed, skill won't start, etc.) | Required for skill-driven labs; recommended for ALM labs |
| **`## Key Takeaways`** | 4-7 bullets, the lessons the reader should be able to recall a week later | Required |
| **`## What's Next`** | Single line linking to the next lab | Required |

---

## Lab template (Copy-Paste skeleton)

Copy everything between the bars below into a new file at `docs/<phase>/NN-<slug>.md`, replace the placeholders, and you have a compliant lab.

---

```markdown
---
sidebar_position: <NN>
sidebar_label: "Lab NN: <short label>"
title: "Lab NN: <full title>"
---

# Lab NN: <full title>

## What You Will Build

<One paragraph describing the concrete deliverable. State an artifact, 
not a learning outcome. "A typed service layer that ..." not "An 
understanding of ...".>

## Prerequisites

- Completed [Lab MM: <full title>](../<phase>/MM-<slug>.md) (<one-line summary of what's needed from it>)
- Working portal deployed (`.powerpages-site` folder exists)
- `/<skill-name>` available in your AI coding CLI session
- Active PAC CLI and Azure CLI sessions (`pac auth list`, `az account show`). If your Microsoft account has no Azure subscription, sign in once with `az login --allow-no-subscriptions` — the plugin uses AAD-scoped tokens that work without one.

## Learning Objectives

By the end of this lab you will be able to:

1. <Verb-led, observable outcome>
2. <Verb-led, observable outcome>
3. <Verb-led, observable outcome>
4. <Verb-led, observable outcome>

<One-paragraph scenario framing the user problem in story form. End with the contrast: "You could do X, but it has problem Y. Instead, you will Z.">

> **Important:** <Constraint that breaks the lab if ignored — deployed-site requirement, beta feature, auth scope, etc. Omit this callout if there is no such constraint.>

> **Further reading:** [<MS Learn topic>](https://learn.microsoft.com/...) · [<MS Learn topic>](https://learn.microsoft.com/...) · [<MS Learn topic>](https://learn.microsoft.com/...)

---

## Part 1: <noun phrase>

### Step 1.1: <verb-led title>

<One-line setup if needed.>

\`\`\`
<literal command or prompt the reader pastes>
\`\`\`

<Skill / tool name> will:

1. <expected outcome>
2. <expected outcome>
3. <expected outcome>

### Step 1.2: <verb-led title>

> **Reference only — your output may differ.** The code shown below illustrates what the plugin *typically* generates. The plugin adapts its output to your exact project (variable names, helper structure, comment style, error-handling shape), so your files may look different in small ways. Use these samples to understand the **concept** and the **why** behind each piece — do not rewrite your generated files to match line-for-line. If something in your generated code looks meaningfully different, ask your AI coding CLI to explain the choice before changing anything.

<Walk through the generated artifacts. For each artifact:>

**`<path/to/file>`** — <one-line description>

\`\`\`<language>
<sample code>
\`\`\`

<One-paragraph commentary explaining what makes this artifact correct.>

Verify:

- [ ] <concrete check the reader can run>
- [ ] <concrete check the reader can run>

---

## Part 2: <noun phrase>

<More steps as needed. Standard pattern: a Part per logical milestone in 
the lab; Steps inside each Part for the substeps within that milestone.>

---

## Part N: Reference — <noun>  *(only if needed)*

<Decision matrices, anti-pattern tables, concept tables that the reader 
might want when overriding defaults or debugging later. Optional.>

---

## Troubleshooting

| Error | What you see | Cause | Fix |
|---|---|---|---|
| <short error name> | <observable symptom> | <root cause in plain English> | <action to take> |
| <short error name> | <observable symptom> | <root cause in plain English> | <action to take> |

## Verification

You have completed this lab when:

- [ ] <concrete artifact exists / behaviour observed>
- [ ] <concrete artifact exists / behaviour observed>
- [ ] <concrete artifact exists / behaviour observed>
- [ ] <concrete artifact exists / behaviour observed>

### Generic Debug Prompt

If anything fails and you're not sure where to start, paste this into your AI coding CLI:

\`\`\`
<task-specific paste-in prompt that captures what was attempted, what 
was expected, and what was observed — using bracketed placeholders the 
reader fills in>
\`\`\`

## Fallback

If `/<skill-name>` fails to <do its main job>:

1. <recovery step>
2. <recovery step>
3. <recovery step>

## Key Takeaways

- <one-sentence lesson the reader should recall a week later>
- <one-sentence lesson>
- <one-sentence lesson>
- <one-sentence lesson>

## What's Next

→ [Lab MM: <next lab title>](./MM-<slug>.md)
```

---

## Authoring checklist

Run through this before merging a new or revised lab. Each item is either pass or blocker.

**Front matter and heading**

- [ ] Front matter has `sidebar_position`, `sidebar_label`, `title` — all three
- [ ] H1 matches the `title` field exactly
- [ ] Sidebar label fits on one line in the nav

**Top-of-lab sections**

- [ ] `## What You Will Build` describes a concrete deliverable, not a learning outcome
- [ ] `## Prerequisites` lists upstream labs (with full link text), tools, accounts
- [ ] `## Learning Objectives` is a numbered list of observable, verb-led outcomes
- [ ] A scenario paragraph frames the user problem
- [ ] `> **Further reading:**` callout has 2-5 MS Learn links

**Body**

- [ ] Body opens with `## Part 1: ...` and uses `### Step N.X: ...` substeps (unless this is an observational lab like Lab 13)
- [ ] Every step opens with the literal command in a code fence
- [ ] Every step ends with a `Verify:` checkbox list, an "Expected:" line, or an observable site behaviour
- [ ] Any step that needs the deployed site has an `> **Important:**` callout saying so
- [ ] Any AI-generated code sample has the `> **Reference only — your output may differ.**` admonition above it
- [ ] Any new runtime path is illustrated with a `flowchart LR` mermaid diagram
- [ ] Concept commentary uses named callouts (`Why X exists`, `Design takeaway`, `Important`, `Note`, `Rule of thumb`) — no new callout names invented

**Reference content (if any)**

- [ ] Reference-only material lives in a final `## Part N: Reference — <noun>` part, after the hands-on parts

**Tail sections**

- [ ] `## Troubleshooting` is a 4-column table: Error / What you see / Cause / Fix
- [ ] `## Verification` opens with **"You have completed this lab when:"** followed by a `- [ ]` list
- [ ] `### Generic Debug Prompt` provides a paste-in template the reader can use
- [ ] `## Fallback` describes recovery if the primary path fails
- [ ] `## Key Takeaways` is 4-7 bullets, each a recallable lesson
- [ ] `## What's Next` is a single line with one link to the next lab

**Cross-cutting**

- [ ] Cross-lab links use full `[Lab NN: Full Title]` form (never abbreviated)
- [ ] Code fences use the standard language tags (`bash`, `typescript`, `yaml`, `json`, `mermaid`, `powershell`)
- [ ] Heading capitalization is Title Case throughout
- [ ] Naming conventions for Power Pages artefacts (`cr_invoice`, `Server.Connector.Dataverse`, `/_api/serverlogics/<name>`, `.powerpages-site/`, `.serverlogic.yml`, `.cloudflowconsumer.yml`) match the rest of the guide

If every box is checked, the lab is ready to merge.

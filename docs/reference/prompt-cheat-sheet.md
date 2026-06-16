---
sidebar_position: 1
sidebar_label: "Prompt Cheat Sheet"
title: "Prompt Cheat Sheet"
---

# Prompt Cheat Sheet

A quick reference for prompting techniques and design tokens used throughout this lab track.

---

## The ACE framework

Structure every prompt with three components for consistently better results.

| Component | What It Does | Example |
|-----------|-------------|---------|
| **Action** | What you want the AI to do. Start with a verb, be specific. | "Create a dashboard page with four metric cards..." |
| **Context** | Background, constraints, tech stack, design system. | "...using React + TypeScript + Tailwind CSS, following Fluent Design..." |
| **Examples** | Desired output format, sample data, reference patterns. | "...similar to the invoice list page, with status badges like: Draft (gray), Approved (green), Rejected (red)." |

### ACE template

Use this template when writing prompts for Claude Code or GitHub Copilot CLI:

```
[ACTION]
Create/Build/Add/Fix [specific thing] that [specific behavior].

[CONTEXT]
Tech stack: React + TypeScript + Tailwind CSS
Design: Fluent Design, primary #0078D4, Segoe UI font stack, max weight 600
Project: Power Pages SPA supplier invoice portal
Constraints: [any rules -- no SSR, no bold above 600, mobile responsive]

[EXAMPLES]
The component should look like [reference], with [specific details].
Sample data: [provide realistic examples]
Expected behavior: [describe user interaction flow]
```

### ACE in practice

A concrete before/after to make the difference visible.

**Without ACE (vague):**

```
Make a dashboard for invoices.
```

**With ACE (specific):**

```
[ACTION] Create a Dashboard page at route /dashboard that displays invoice summary
metrics and a recent invoices table.

[CONTEXT] This is a Power Pages SPA using React + TypeScript + Tailwind CSS. Follow
Microsoft Fluent Design: primary #0078D4, Segoe UI font, max weight 600, card-based
layout with subtle shadows and 8px corners. The dashboard is for authenticated supplier
users only.

[EXAMPLES]
- Four metric cards in a 2x2 grid: Total Invoices (count), Under Review (amber),
  Approved (green), Total Paid (formatted currency)
- Recent invoices table showing the last 5: columns are Invoice #, PO #, Amount
  (currency formatted), Status (colored badge), Date
- Welcome banner: "Welcome back, {user name}"
- "Submit New Invoice" button in the top right
```

The second prompt produces a dramatically better result because the AI knows exactly what to build, what constraints to follow, and what the output should look like.

---

## Top 10 prompt patterns for Power Pages

### 1. Zero-Shot

Ask directly without examples. Works for simple, well-defined tasks.

```
Add a "Back to Dashboard" button to the Invoice Detail page header.
```

### 2. One-Shot

Provide one example to establish the pattern.

```
Create a StatusBadge component. For reference, here's how the existing MetricCard 
component is structured: it takes a title, value, and color prop and renders a 
rounded card with Tailwind classes. Follow the same pattern for StatusBadge.
```

### 3. Few-Shot

Provide multiple examples to define a clear pattern.

```
Format the status values as colored badges:
- "Draft" -> gray background, dark text
- "Submitted" -> blue background, white text
- "Approved" -> green background, white text
- "Rejected" -> red background, white text
Apply this same pattern to all status values in the Invoice table.
```

### 4. Chain-of-thought

Ask the AI to reason through a complex problem step by step.

```
I need to design the data model for this supplier invoice portal. Think through 
this step by step: What tables do we need? What columns does each table require? 
What are the relationships? Which standard Dataverse tables can we reuse instead 
of creating custom ones?
```

### 5. role prompting

Assign a role to frame the AI's perspective.

```
You are a Power Pages security expert. Review the table permissions I've set up 
for the cr_invoice table. Are there any security gaps? Is Contact-scoped 
permission the right choice for supplier isolation?
```

### 6. Constraint-based

Add explicit constraints to control the output.

```
Create the Invoice List page with these constraints:
- Use only Tailwind CSS utility classes, no inline styles
- Font weight must not exceed 600 (no bold)
- Table must be sortable by clicking column headers
- Must be responsive: table on desktop, card list on mobile
- Use Lucide React icons only
```

### 7. iterative refinement

Start broad, then narrow with follow-up prompts.

```
Prompt 1: "Create a dashboard page for the supplier portal."
Prompt 2: "Move the metric cards into a 2x2 grid instead of a single row."
Prompt 3: "Change the 'Total Paid' card to show a currency-formatted sum."
```

### 8. Error-paste-and-fix

Paste the full error with context for targeted fixes.

```
I'm getting this error when the Invoice List page loads. Fix it.

TypeError: Cannot read properties of undefined (reading 'map')
  at InvoiceList (InvoiceList.tsx:24)

The invoices state is undefined on first render before the API call completes.
```

### 9. Screenshot-based

Share a screenshot to communicate visual issues.

```
The invoice form fields are overlapping on mobile. Here's a screenshot: 
[paste screenshot]
Fix the layout so fields stack vertically on screens under 768px.
```

### 10. incremental building

Build features one at a time rather than all at once.

```
Step 1: "Add a search bar above the invoice table"
Step 2: "Make the search filter invoices by PO number as you type"
Step 3: "Add a dropdown filter for invoice status next to the search bar"
Step 4: "Show a 'No results' message when filters return empty"
```

---

## Common Anti-Patterns

Five prompting mistakes to avoid as you work through the labs.

### 1. vague prompts

**Bad:** "Make the dashboard better."
**Good:** "Increase the gap between metric cards from 4 to 8, and right-align their numeric values."

Tell the AI *what* to change and *to what*. "Better" is subjective. The model will guess.

### 2. mixing concerns in one prompt

**Bad:** "Create the invoice form, save it to Dataverse, add validation, and send an approval email."
**Good:** Break into separate prompts (form UI, Web API integration, validation, flow trigger) and verify each before moving on.

Large prompts produce large, hard-to-review diffs and compound errors across unrelated layers.

### 3. skipping context

**Bad:** "Build a status badge component."
**Good:** "Build a status badge component using Tailwind, Lucide icons, Fluent Design, max font-weight 600, see @src/components/MetricCard.tsx for the existing pattern."

If your `CLAUDE.md` already covers tech stack and design, you can skip restating it; otherwise include it every time.

### 4. no reference pattern for non-trivial UI

**Bad:** "Add a data table with filters."
**Good:** "Add a data table with filters, following the same column layout, pagination, and empty-state pattern used in @src/pages/InvoiceList.tsx."

Point the AI at a canonical example in your repo so new code matches existing code.

### 5. Re-explaining everything after `/clear`

**Bad:** Re-typing project context from scratch each new conversation.
**Good:** Put durable context in `CLAUDE.md` so it loads automatically on every conversation.

If you find yourself re-explaining the same thing, it belongs in `CLAUDE.md`.

---

## Design system quick reference

Use these tokens in your prompts to maintain visual consistency across the labs.

### Colors

| Token | Hex | Usage |
|-------|-----|-------|
| Primary | `#0078D4` | Buttons, links, active states |
| Success | `#10B981` | Approved status, positive metrics |
| Warning | `#F59E0B` | Pending status, attention items |
| Error | `#EF4444` | Rejected status, error messages |
| Background | `slate-50` | Page background |
| Text | `slate-900` | Body text |

### Typography

| Property | Value |
|----------|-------|
| Font stack | `'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif` |
| Rendering | Antialiased |
| Max heading weight | `font-semibold` (600), never use bold/700+ |
| Body line-height | 1.5 |
| Style | No italic, no uppercase tracking |

### Design language

```
Following Microsoft Fluent Design: clean professional look, card-based layouts 
with subtle shadows and 8px rounded corners, Lucide React icons, mobile responsive.
```

---

## Design system shortcuts

When prompting for UI, naming a mature design system implicitly covers typography, spacing, motion, elevation, and accessibility. One phrase replaces a paragraph of constraints.

### Comparison

| System | Best For | Covers Implicitly | Lab Fit |
|--------|----------|-------------------|---------|
| **Fluent Design** | Enterprise dashboards, data-heavy apps | Depth, subtle motion, accessibility, Microsoft ecosystem alignment | **Primary**: matches Power Pages context |
| **Material Design 3** | Most complete "single-name" coverage | Type scale, elevation, motion durations/easing, responsive breakpoints, design tokens | **Secondary**: pair with Fluent for layout/motion completeness |
| **Apple HIG** | Polished, minimal consumer UX | Typography hierarchy, micro-interactions, content-first layouts | Less prescriptive on shadows/elevation |
| **Ant Design** | Forms, tables, admin panels | Strong enterprise component defaults, dense data patterns | Less emphasis on motion |

### Recommendation

For the Supplier Invoice Portal example used in these labs, lead with **Fluent** (matches Microsoft + Power Pages context); add **Material 3** when you want explicit motion or layout coverage.

### Copy-Paste prompt lines

**Fluent Design (Primary, recommended default):**

```text
Use Microsoft Fluent Design System with emphasis on depth, subtle motion, and accessible components.
```

**Material Design 3 (most complete single-name coverage):**

```text
Follow Material Design 3 guidelines for layout, typography, motion, elevation, and responsiveness.
```

**Apple Human Interface Guidelines (polish + micro-interactions):**

```text
Follow Apple Human Interface Guidelines focusing on clarity, hierarchy, and smooth micro-interactions.
```

**Fluent + Material 3 combined (recommended for completeness):**

```text
Design using Material Design 3 principles with Fluent Design aesthetics.
```

**Ultra-short combined:**

```text
Use Material Design 3 (layout, motion, tokens) + Fluent Design (depth, enterprise UX).
```

> **When to use:** Reach for these whenever a constraint list would exceed ~5 lines. For bespoke styling beyond either system, fall back to the explicit tokens in the previous section.

---

## React best practices and application structure

Use this section when prompting Claude Code or GitHub Copilot CLI to create or refactor React code. Clear structure constraints help the AI generate code that stays maintainable after the first demo.

### Recommended application structure

```text
src/
  app/
    App.tsx                 # Top-level app shell and route registration
    routes.tsx              # Route definitions and protected route wrappers
  components/
    common/                 # Reusable UI: buttons, cards, badges, empty states
    layout/                 # Header, sidebar, page shell, navigation
  features/
    invoices/
      components/           # Invoice-specific UI components
      pages/                # Invoice list, detail, submit pages
      services/             # Invoice API calls and data mapping
      types.ts              # Invoice domain types
    dashboard/
      components/
      pages/
  hooks/                    # Shared hooks such as useCurrentUser or useDebounce
  lib/                      # Cross-cutting utilities and API clients
  styles/                   # Global CSS and design tokens
  test/                     # Test helpers and mock data
```

### Best practices checklist

| Practice | Prompt Guidance |
|----------|-----------------|
| Keep components small | "Split large pages into focused components under the feature folder." |
| Separate UI from data access | "Put Dataverse Web API calls in `services/`, not directly inside JSX." |
| Prefer typed models | "Create TypeScript interfaces for API responses and UI view models." |
| Use feature folders | "Group page, components, service, and types by business feature." |
| Avoid duplicated state | "Derive display values from source data instead of storing extra copies." |
| Handle loading and empty states | "Add loading, error, and no-results states for every async page." |
| Keep routing centralized | "Define routes in one place and use protected route wrappers for authenticated pages." |
| Use accessible controls | "Use semantic buttons, labels, focus states, and keyboard-friendly interactions." |
| Keep styling consistent | "Use Tailwind utility classes and the design tokens from this cheat sheet." |
| Make errors visible | "Surface actionable error messages instead of failing silently." |

### Copy-Paste prompt lines

```text
Structure this React app using feature folders: shared layout/components under `components/`, feature-specific pages/components/services/types under `features/<feature-name>/`, and cross-cutting helpers under `lib/` and `hooks/`.
```

```text
Keep React components presentational where possible. Move Dataverse Web API calls, mapping, and validation helpers into typed service modules, and pass data into components through props.
```

```text
For every async page, include loading, error, empty, and success states. Use accessible buttons, labels, focus states, and keyboard-friendly interactions.
```

```text
Before editing, inspect the existing folder structure and follow the nearest established pattern. Do not create a new architecture if a matching pattern already exists.
```

### Refactoring prompt example

```text
Refactor the Invoice List page to follow React best practices.

Keep the route and visible behavior the same, but:
- Move Dataverse Web API access into `features/invoices/services/invoiceService.ts`
- Move invoice-specific types into `features/invoices/types.ts`
- Split the table, filters, status badge, and empty state into focused components
- Add loading, error, and no-results states
- Keep styling consistent with Fluent Design, Tailwind CSS, and the tokens in this cheat sheet
```

---

## Useful AI coding CLI commands

These work in both Claude Code and GitHub Copilot CLI. The built-in commands (`/help`, `/clear`, …) and every Power Pages plugin skill (`/create-site`, `/deploy-site`, …) are the same in each. The one difference is how you reference a file: Claude Code uses `#file path/to/file`, GitHub Copilot CLI uses `@path/to/file`.

| Command | What It Does |
|---------|-------------|
| `/help` | Show available commands and skills |
| `/compact` | Compress conversation context to free up space |
| `/clear` | Start a fresh conversation (clears all context) |
| `#file path` (Claude Code) / `@path` (Copilot CLI) | Reference a specific file so the agent loads it into context |
| `/create-site` | Scaffold a new Power Pages SPA site |
| `/deploy-site` | Build and upload site to Power Pages |
| `/activate-site` | Provision a public URL for the site |
| `/setup-datamodel` | Create Dataverse tables and columns |
| `/add-sample-data` | Populate tables with test records |
| `/integrate-backend` | Decide between Web API, Server Logic, and Cloud Flows for a scenario |
| `/integrate-webapi` | Generate typed Web API services and configure permissions |
| `/add-ai-webapi` | Layer generative-AI summaries (Search Summary, Data Summarization) onto pages; reuses `/integrate-webapi` permissions |
| `/add-server-logic` | Create server-side JavaScript endpoints that run on the Power Pages runtime |
| `/add-cloud-flow` | Register and wire up Power Automate flows callable from the site |
| `/setup-auth` | Add sign-in, sign-out, and role-based access for any of nine identity providers (Entra ID, Entra External ID, OIDC, SAML, WS-Fed, Microsoft, Facebook, Google, local); incremental, re-run to add a second provider |
| `/create-webroles` | Define web roles for user access management |
| `/security-review` | Orchestrate the focused security skills and write a consolidated HTML report (code, dependencies, deployed-site, headers, WAF, table permissions, auth config) |
| `/scan-code` | Static analysis + dependency scan on local source (opengrep); offers a manual-review fallback if the tool is missing |
| `/scan-site` | Server-side security scan against the live site; results grouped by severity |
| `/manage-headers` | Inspect and configure browser security headers: CSP, X-Frame-Options, CORS, cookie SameSite |
| `/manage-firewall` | Inspect and configure the web application firewall (production only): managed rules, IP / country / path blocks, rate limits |
| `/audit-permissions` | Audit existing table permissions and generate an HTML security report |
| `/add-seo` | Add robots.txt, sitemap, meta tags, and favicon to the site |
| `/test-site` | Run smoke tests against a deployed site (navigation, pages, API calls); used by `/deploy-pipeline` for post-deploy verification |
| `/plan-alm` | Entry point for the ALM phase: detects project state, asks about promotion strategy, renders an approvable plan, and orchestrates the other ALM skills |
| `/setup-solution` | Author the Power Platform solution: publisher, components, env-variable classification, optional Azure Key Vault for secrets |
| `/ensure-pipelines-host` | Provision or detect a Power Platform Pipelines host environment |
| `/setup-pipeline` | Register a pipeline definition in Dataverse and bind stages to target environments |
| `/deploy-pipeline` | Trigger a pipeline-stage deployment with per-stage env-variable values via `deploymentSettings.json` |
| `/force-link-environment` | Reassign a target env to a new Pipelines host when a host conflict blocks deployment (reversible) |
| `/export-solution` | Export the solution zip with a completeness check |
| `/import-solution` | Import the solution zip into a target env, staged or direct |
| `/diagnose-deployment` | Match deployment failures against a catalog of known errors and propose a fix |

---

## Context engineering

Beyond individual prompts, *context engineering* is about giving the AI the right background information across your entire session. Three techniques cover most of the value.

### CLAUDE.md: persistent project context

A `CLAUDE.md` file at your project root gives Claude Code persistent context about your project. Every time you start a conversation in that directory, Claude reads this file automatically, so anything in it is "free" context that you don't have to restate.

**What to include in `CLAUDE.md`:**

- Tech stack and framework
- Design system (colors, fonts, constraints)
- Data model summary
- Security model
- Page routes

A ready-to-use sample is in the next section.

### `@file` references: load specific files

When you want Claude to look at existing code before making changes, point at the file directly:

```
Look at @src/components/MetricCard.tsx and create a similar
SupplierCard component following the same patterns.
```

This loads the file into Claude's context so new code matches your existing style. Use it whenever you say "follow the same pattern as...". The agent does a noticeably better job when it can see the reference instead of guessing.

### Managing the context window with `/compact` and `/clear`

Claude Code has a limited context window. As you work, the conversation accumulates context. When it gets full:

- **`/compact`**: Compresses conversation history while retaining key information. Use within a task when context gets long but you want to keep going.
- **`/clear`**: Starts a completely fresh conversation. Use between tasks, or when context has become cluttered with irrelevant turns.

**Rule of thumb:** Use `/compact` *within* a task. Use `/clear` *between* tasks. If you find yourself re-explaining the same thing every `/clear`, move it into `CLAUDE.md`.

---

## Sample CLAUDE.md for the supplier portal

Add this to your project root as `CLAUDE.md` to give the AI persistent context about your project:

```markdown
# Supplier Invoice Portal

## Tech Stack
- React + TypeScript + Vite
- Tailwind CSS for styling
- Power Pages Web API for Dataverse access

## Design
- Microsoft Fluent Design language
- Primary: #0078D4, Success: #10B981, Warning: #F59E0B, Error: #EF4444
- Font: Segoe UI stack, max weight 600 (no bold), antialiased
- Card-based layouts with subtle shadows and 8px corners
- Lucide React icons
- Mobile responsive

## Pages
1. Landing (public, /)
2. Dashboard (authenticated, /dashboard)
3. Submit Invoice (authenticated, /invoices/new)
4. Invoice List (authenticated, /invoices)
5. Invoice Detail (authenticated, /invoices/:id)
```

---

## The /create-site prompt (ACE exemplar)

This is the exact prompt used in Lab 01 to scaffold the supplier portal. Study it as an example of the ACE framework (Action / Context / Examples) applied to a real task, with the requirements framed as Jobs-To-Be-Done so the generated architecture follows user goals rather than a fixed page list:

```
[ACTION]
Build a Supplier Invoice Submission Portal as a React + TypeScript + Tailwind CSS single-page 
application. Its architecture and user experience must be designed strictly to solve the 
Jobs-To-Be-Done (JTBD) defined below.

Primary job: Enable suppliers to submit invoices against purchase orders and track their 
progress so the business gets paid accurately and on time.

[CONTEXT]
Tech stack: React, TypeScript, Tailwind CSS.
Design: a clean, professional, Microsoft Fluent Design-inspired aesthetic.

Functional jobs the app must satisfy:
- Submit an Invoice: a submission flow capturing the required billing details (PO number, 
  amount, due date) to initiate the payment process.
- Track Payment Lifecycle: a visual tracking system to monitor the step-by-step status of a 
  specific invoice.
- Monitor Account Health: a dashboard with a high-level view of aggregated financial metrics 
  (total invoices, amounts under review, amounts approved, and amounts paid).
- Find Past Invoices: robust search and filter capabilities to locate historical invoices by 
  status, dates, or specific identifying numbers.
- Verify Invoice Details: a detailed view for individual invoices, showing granular data and a 
  status timeline for record-keeping and dispute resolution.

Layout & navigation constraints:
- All layouts and components must be mobile-responsive by default.
- Public layout (unauthenticated): a top navigation bar with the application logo and a 
  "Sign In" call-to-action, plus a standard footer with copyright information.
- Application layout (authenticated): a header (logo + user profile dropdown) and a left-aligned 
  sidebar linking to Dashboard, Submit Invoice, and My Invoices, with the active item clearly 
  indicated using the primary color.

[EXAMPLES]
- Status lifecycle to model: Draft -> Submitted -> Under Review -> Approved/Rejected -> Paid.
- Mock data: seed 10 sample invoices, PO-2026-001 through PO-2026-010, amounts $1,500-$85,000, 
  spread across the full status lifecycle, dates Jan-Mar 2026.
- Mock the signed-in user as "Nancy Anderson (sample)" from "Adventure Works (sample)".
```

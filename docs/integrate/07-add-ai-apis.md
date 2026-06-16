---
sidebar_position: 4
sidebar_label: "Lab 07: Add AI APIs"
title: "Lab 07: Add generative AI APIs"
---

# Lab 07: Add generative AI APIs

## Goal

Add AI-powered invoice summaries and grounded search answers to the supplier portal by using the Power Pages AI APIs.

## State you carry forward

- Completed [Lab 06: Add Power Automate flows](./06-add-power-automate-flows.md) (portal has Web API, server logic, and cloud flow integrations working)
- The typed service layer from [Lab 03](../build/03-web-api-integration.md) still exists (`src/services/webApi.ts`, entity-specific services, and `src/types/entities.ts`). `/add-ai-webapi` extends that pattern; do not delete or broadly refactor those files before running it.
- Admin has enabled generative AI at the tenant and environment level (verify with your Power Platform admin before starting)
- For Part 4 (Search Summary) you also need the **site-level** "Site search (preview)" toggle on. The plugin can't flip it; Step 4.2 walks you through it, but confirm you have maker access to the site's **Set up workspace** → **Copilot** settings now, so Part 4 doesn't stall
- Site deployed via `/deploy-site` at least once (required for AI site settings phase)
- `/add-ai-webapi` available in your AI coding CLI session
- Active PAC CLI and Azure CLI sessions (`pac auth list`, `az account show`): `/add-ai-webapi` queries environment and site AI configuration via Dataverse, which requires a live `az` token. If your Microsoft account has no Azure subscription, sign in once with `az login --allow-no-subscriptions`; the Microsoft Entra ID-scoped Dataverse token works without one.

## Learning objectives

By the end of this lab you will be able to:

1. Describe the three Power Pages AI APIs (Search Summary, Data Summarization, Case preset) and the three-level admin hierarchy that governs them
2. Use `/add-ai-webapi` to add a Data Summarization Copilot card to the Invoice Detail page
3. Use `/add-ai-webapi` a second time to add Search Summary results to a new search page
4. Diagnose the two disablement shapes (HTTP 200 with envelope error for Search; HTTP 400 with `90041001` for Data Summarization) and trace them up the admin hierarchy
5. Explain why a 403 on a summarization call is always a Layer 1/2 issue (table permissions or column casing), not a Layer 3 issue

Both APIs are preview features gated by admin governance. The most common failure is not a code bug: it's the tenant admin or site toggle being off. The troubleshooting map appears before the code below.

> **Further reading:** [Data summarization API overview (preview)](https://learn.microsoft.com/power-pages/configure/data-summarization-api) · [Enable generative AI for a Power Pages site](https://learn.microsoft.com/power-pages/configure/ai-enable) · [Power Pages Web API overview](https://learn.microsoft.com/power-pages/configure/web-api-overview) (underlies both APIs)

---

## Part 1: AI API landscape and admin hierarchy

### The three APIs

| API | Endpoint | What It Returns | Body |
|-----|----------|----------------|------|
| **Search Summary** | `POST /_api/search/v1.0/summary` | `{ Summary, Citations }` | `{ userQuery: "..." }` |
| **Data Summarization** | `POST /_api/summarization/data/v1.0/<entitySet>(<id>)?$select=...&$expand=...` | `{ Summary, Recommendations }` | `{ InstructionIdentifier: "Summarization/prompt/<id>" }` |
| **Case preset** | Specialisation of Data Summarization for `incident` | same as Data Summarization | `{ InstructionIdentifier: "Summarization/prompt/case_summary" }` |

We will use the first two today. The Case preset needs an `incident` table and doesn't fit the supplier portal.

### The Three-Level admin hierarchy

Every AI call passes through three gates. **Each level overrides the one below it.**

```
Tenant     → PowerShell setting enableGenerativeAIFeaturesForSiteUsers
                 ↓
Environment → Copilot Hub governance (admin.powerplatform.microsoft.com)
                 ↓
Site        → Set up workspace → Copilot → Site search (preview) toggle
```

| Level | What controls it | Who changes it |
|-------|-----------------|----------------|
| Tenant | `Set-TenantSettings` PowerShell cmdlet | Microsoft 365 tenant admin |
| Environment | Copilot Hub → Power Pages governance switches | Power Platform admin |
| Site | Power Pages maker studio → Set up workspace → Copilot → Site search (preview) | Site maker (you) |

If any level is off, the API fails. The site toggle shows as "greyed out" when an upstream level blocks it; the UI tells you exactly where the problem sits.

### How disablement surfaces in HTTP

The two endpoints report disablement differently. This is the single most important thing to remember today:

| API | HTTP status | What the body says | Retry help? |
|-----|-------------|-------------------|-------------|
| Search Summary | **200 OK** (yes, 200) | `{ Code: 400, Message: "Gen AI Search is disabled." }`, embedded envelope | No: admin or maker must flip a toggle |
| Data Summarization | **400 Bad Request** | `{ error: { code: "90041001", message: "..." } }` | No: same fix |

Both mean the same thing: "somewhere in the tenant → environment → site chain, AI is disabled." Walk the chain top to bottom to find the culprit.

### Error codes worth knowing

| Code | Message (per Microsoft Learn) |
|------|-------------------------------|
| 90041001 | Generative AI features are disabled: walk the tenant / environment / site hierarchy |
| 90041003 | Data summarization disabled for this site: enable `Summarization/Data/Enable` site setting |
| 90041004 | Content length exceeds the limit: bump `Summarization/Data/ContentSizeLimit` (default 100000 chars) |
| 90041005 | No records found to summarize: target collection is empty or row-level security hid everything |
| 90041006 | Error occurred while summarizing the content: generic summarization failure; check prompt YAML and retry |

### Layer 1/2 vs layer 3: what these terms mean here

The plugin's manifest and the troubleshooting below talk about "Layer 1/2" and "Layer 3." These describe the **AI-integration stack**, and they're a different axis from both Lab 02's three-layer security model and the tenant → environment → site admin hierarchy above:

| Term | What it is | Who owns it | Typical failure |
|------|-----------|-------------|-----------------|
| **Layer 1/2: Web API foundation** | Table permissions, `Webapi/<table>/fields`, and web roles. A summarization call reads the record through the Web API, so these must already exist. | `/integrate-webapi` (delegated automatically) | **403** on the summarization call |
| **Layer 3: AI site settings** | `Summarization/Data/Enable` plus the `Summarization/prompt/<id>` template. | `/add-ai-webapi` (this skill) | **400** with `90041003` |

Keep this straight: a **403** is always Layer 1/2 (Web API), never the AI layer; a **400** points at Layer 3 or the admin hierarchy.

---

## Part 2: data summarization on invoice detail

### Step 2.1: describe the intent

In your AI coding CLI:

```
/add-ai-webapi

On the invoice detail page, add an AI-written summary at the top. 
Finance reviewers need to understand the key details of an invoice in 
one paragraph, without reading every field. The summary should cover 
the PO number, amount, status, supplier, description, and due date.
```

### Step 2.2: what the plugin discovers (phase 2 explore)

`/add-ai-webapi` spawns an Explore agent that scans your codebase. Review the integration manifest it produces; it should show one row:

| API | Target file | Target kind | Entity set | `$select` | Layer 1/2 status | Layer 3 status |
|-----|-------------|------------|-----------|----------|------------------|----------------|
| Data summarization | `src/pages/InvoiceDetail.tsx` | single-record | `cr_invoices` | `cr_ponumber,cr_amount,cr_description,cr_status,cr_duedate` | `missing` (needs Layer 1/2 from `/integrate-webapi`) | `missing` (no Summarization settings) |

The `missing` values tell the plugin it needs to run `/integrate-webapi` (AI read-only mode) and create new `Summarization/*` site settings. You will see both happen.

### Step 2.3: confirm the plan (phase 3)

You will be asked:

1. **Integration scope**: select "Wire Data Summarization into Invoice Detail"
2. **Trigger**: single-record targets always load on user action, so this is skipped
3. **Scope**: pick "Use the existing record fetch's columns" (the existing InvoiceDetail fetch already selects the columns we need)

### Step 2.4: phase 4, delegated layer 1/2

`/add-ai-webapi` calls `/integrate-webapi` in AI-only read mode. `/integrate-webapi` will:

- Create or verify `Webapi/cr_invoice/enabled` is present (may already be from Lab 02)
- Create `Webapi/cr_invoice/fields`, or confirm Lab 02's version includes every column we need
- Ensure a Read-scoped table permission on cr_invoice for Authenticated Users (Lab 02 already set this)
- Present its own architect plan, **you will approve this sub-plan separately**

Approve the sub-plan. When `/integrate-webapi` completes, control returns to `/add-ai-webapi`.

### Step 2.5: phase 5, service and UI Code

> **Reference only: your output may differ.** The code shown below illustrates what the plugin *typically* generates. The plugin adapts its output to your exact project (variable names, helper structure, imports, component shape), so your files may look different in small ways. Use these samples to understand the **concept** and the **why** behind each piece. Do not rewrite your generated files to match line-for-line. If something in your generated code looks meaningfully different, ask your AI coding CLI to explain the choice before changing anything.

The plugin generates:

**`src/services/aiSummaryService.ts`**: shared service file with the CSRF helper and `fetchDataSummary`:

```typescript
async function getCsrfToken(): Promise<string> {
  const res = await fetch('/_layout/tokenhtml');
  const html = await res.text();
  const match = html.match(/value="([^"]+)"/);
  if (!match) throw new Error('CSRF token not found');
  return match[1];
}

export async function fetchDataSummary(
  entitySet: string,
  id: string,
  select: string,
  instructionIdentifier: string,
  expand?: string
): Promise<{ Summary: string; Recommendations?: unknown[] }> {
  const token = await getCsrfToken();
  const url = `/_api/summarization/data/v1.0/${entitySet}(${id})?$select=${select}${
    expand ? '&$expand=' + expand : ''
  }`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
      '__RequestVerificationToken': token,
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: JSON.stringify({ InstructionIdentifier: instructionIdentifier }),
  });
  if (!res.ok) throw new Error(`Summary failed: ${res.status}`);
  return res.json();
}
```

**`src/hooks/useInvoiceSummary.ts`**: a React hook wrapper with loading/error states.

**`src/pages/InvoiceDetail.tsx`**: adds a Copilot card component that calls the hook when the page mounts.

### Step 2.6: phase 6, layer 3 site settings

The plugin spawns `ai-webapi-settings-architect` which creates two settings:

| Setting name | Purpose |
|--------------|---------|
| `Summarization/Data/Enable` | Master toggle (value `true`) |
| `Summarization/prompt/invoice_summary` | The actual prompt template, a YAML block literal with the instructions sent to the model |

Review the prompt YAML when the architect proposes it. The prompt should read something like:

```yaml
name: Summarization/prompt/invoice_summary
value: |
  Summarise this invoice in one concise paragraph (max 4 sentences).
  Cover:
  - PO number and total amount
  - Current status (Draft, Submitted, Under Review, Approved, Rejected, Paid)
  - Supplier and a short description of the invoice
  - Due date and any flag for overdue items

  Tone: formal, neutral, suitable for finance review.
  Do not invent values not present in the record.
```

Approve.

### Step 2.6b: tune the prompt if the summary is weak

If the generated summary feels generic, misses fields, or invents information, ask your AI coding CLI to improve the AI prompt:

```
The AI summary on the invoice detail page is too vague and leaves out 
details that finance cares about. The summary needs to clearly state 
the PO number, the total amount, and the current status, and to flag 
any invoice that is overdue. It must not include information that 
isn't on the record. Improve the way the summary is written.
```

### Step 2.7: deploy and test

Accept the deploy offer. After deployment:

1. Open the deployed site in an incognito window
2. Navigate to any invoice's detail page
3. Expected: a Copilot-styled summary card renders below the invoice header within 3-5 seconds
4. The summary should mention the PO number, amount, status, and supplier. Read the actual record and verify the summary is grounded in the data (no hallucinated values)

### Step 2.8: inspect the network call

Open DevTools Network tab and refresh. Find the summarization POST:

- URL: `/_api/summarization/data/v1.0/cr_invoices(<guid>)?$select=cr_ponumber,cr_amount,...`
- Method: POST
- Request headers: `OData-MaxVersion: 4.0`, `OData-Version: 4.0`, `__RequestVerificationToken`, `X-Requested-With`
- Request body: `{ "InstructionIdentifier": "Summarization/prompt/invoice_summary" }`
- Response: 200 with `{ Summary: "...", Recommendations: [] }`

### Progress checkpoint

By now you should have:

- [ ] `src/services/aiSummaryService.ts` exists
- [ ] A Copilot card renders on Invoice Detail with a grounded one-paragraph summary
- [ ] `.powerpages-site/site-settings/Summarization-Data-Enable.sitesetting.yml` and `Summarization-prompt-invoice_summary.sitesetting.yml` exist
- [ ] Network tab shows a 200 response with a non-empty `Summary`

---

## Part 3: Mid-Lab checkpoint

Confirm the Invoice summary works for everyone before moving to Search. Raise your hand if any of these are not true:

- Invoice Detail shows a Copilot card
- The summary text references real values from the invoice (not placeholder text)
- No 400 or 403 in the network tab

Common blockers at this point and quick fixes:

| Symptom | Fix |
|---------|-----|
| 400 with code `90041001` | Walk the admin hierarchy: tenant, environment, site. Ask your Power Platform admin to verify the env-level setting. |
| 403 on the POST | Layer 1/2 issue: re-run `/integrate-webapi` or check `Webapi/cr_invoice/fields` lists every column in the `$select` |
| 400 with code `90041003` | `Summarization/Data/Enable` site setting not present or set to `false`. Verify the setting exists, redeploy. |
| Summary renders but says "I couldn't find enough data" | The `$select` is too narrow. Add more columns to the list in the generated fetch |

Once you have a green response, continue.

---

## Part 4: search summary on a new search page

### Step 4.1: the goal

Add a page at `/search` with a text input. User types a question like "Which invoices are overdue?" → portal calls `/_api/search/v1.0/summary` → an AI-generated answer renders above the underlying keyword results, with citation links pointing back to the invoice detail pages.

### Step 4.2: Pre-Flight, enable site search (preview)

Search Summary needs a site-level toggle that `/add-ai-webapi` cannot flip for you.

1. Open the Power Pages maker studio for your site
2. Navigate to **Set up workspace** → **Copilot**
3. Find **Site search (preview)**
4. Toggle on **Enable Site search with generative AI (preview)**

If the toggle is greyed out, the environment or tenant has AI disabled. See Part 5 troubleshooting.

Confirm before continuing. Search Summary silently returns the 200-envelope disabled state if this toggle is off.

### Step 4.3: describe the intent to your AI coding CLI

```
/add-ai-webapi

Add a search page where suppliers can ask questions in plain English, 
such as "Which of my invoices are overdue?" The page should show a 
short AI-written answer at the top, not just a list of keyword 
matches. Match the look and feel of the existing Dashboard page.
```

### Step 4.4: iteration mode confirmation

Because you already ran `/add-ai-webapi` in Part 2, the plugin detects iteration mode. It will ask:

> "It looks like an AI summary surface is already wired into this site. Is this request a tweak to the existing one, or are you adding a brand-new surface?"

Select **Add a new surface**. The plugin will extend the existing `aiSummaryService.ts` rather than rewrite it, and will skip the `/integrate-webapi` delegation (Search has no per-table prerequisites).

### Step 4.5: review the plan

The manifest should show:

| API | Target file | Layer 1/2 status | Layer 3 status |
|-----|-------------|------------------|----------------|
| Search summary | `src/pages/Search.tsx` (new) | n/a (search has no per-table prereqs) | n/a (search uses the workspace toggle, not a per-call site setting) |

Approve. The plugin creates a new page component, extends the service with `fetchSearchSummary`, and adds a route.

### Step 4.6: review the generated Code

> **Reference only: your output may differ.** Same caveat as Step 2.5: the snippets below are illustrative. Your plugin's actual output may differ in variable names, response-shape assumptions, or component structure. Use these to understand the Search Summary pattern, not as line-for-line targets.

**`src/services/aiSummaryService.ts`**: now has a second export:

```typescript
export async function fetchSearchSummary(
  userQuery: string
): Promise<{ Summary: string; Citations: Array<{ Id: string; Title: string }> }> {
  const token = await getCsrfToken();
  const res = await fetch('/_api/search/v1.0/summary', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      '__RequestVerificationToken': token,
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: JSON.stringify({ userQuery }),
  });
  const data = await res.json();
  // Search Summary returns 200 with an error envelope when AI is disabled
  if (data.Code === 400) {
    throw new SearchSummaryDisabledError(data.Message);
  }
  return data;
}
```

Note the envelope check: Search Summary does not use HTTP status codes to signal disablement.

**`src/pages/Search.tsx`**: new page with search input, results area, and a graceful fallback card when `SearchSummaryDisabledError` is thrown:

```typescript
if (error instanceof SearchSummaryDisabledError) {
  return (
    <div className="disabled-state-card">
      <h3>AI search summary is turned off for this site</h3>
      <p>Ask your admin to enable generative AI in the maker studio.</p>
      <a href="https://learn.microsoft.com/power-pages/configure/ai-enable">Learn more</a>
    </div>
  );
}
```

### Step 4.7: citation URL rewriting

The Search Summary API returns citation URLs pointing at `/page-not-found/?id=<guid>` (the default knowledge article landing page). Our SPA site doesn't have that route. Verify the generated code rewrites the URLs to the SPA routes:

```typescript
function rewriteCitationUrl(rawUrl: string): string {
  const match = rawUrl.match(/id=([a-f0-9-]+)/i);
  if (!match) return rawUrl;
  return `/invoices/${match[1]}`;
}
```

Without this, clicking a citation drops the user on a 404.

### Step 4.8: deploy and test

```
/deploy-site
```

After deployment:

1. Navigate to `/search` in the deployed site
2. Type: "Which invoices are overdue?"
3. Expected: a summary paragraph like "Three invoices are currently overdue: PO-2026-005, PO-2026-008..."
4. Each citation `[1]`, `[2]` should be clickable and route to the invoice detail page

### Step 4.9: test the disabled state

1. Go to the maker studio and toggle **Site search (preview)** off
2. Redeploy (or wait ~30 seconds for the runtime to pick up the change)
3. Go back to the search page and submit any query
4. Expected: the disabled-state card renders, "AI search summary is turned off for this site"
5. Toggle it back on before the session ends

---

## Troubleshooting

### The admin hierarchy walkthrough

When any AI call fails with `90041001` (Data Summarization) or the 200-envelope disabled error (Search Summary), walk the hierarchy:

1. **Tenant**: has `enableGenerativeAIFeaturesForSiteUsers` been set? Check with:
   ```powershell
   Connect-MgGraph
   Get-TenantSettings   # look for enableGenerativeAIFeaturesForSiteUsers
   ```
2. **Environment**: open admin.powerplatform.microsoft.com → Environments → your env → Copilot Hub → Power Pages governance. Is it on?
3. **Site**: in the maker studio, Set up workspace → Copilot → Site search (preview). Is the toggle on? Is it greyed out (upstream blocked it)?

If any level is off, the call will never succeed regardless of code changes.

### 403 on a summarization call, always layer 1/2

If you see a 403 (not a 400) on the summarization endpoint, the problem is never the AI layer. It is always one of:

| Cause | Fix |
|-------|-----|
| Column listed in `$select` but not in `Webapi/<table>/fields` site setting | Add it to the fields list, redeploy |
| Column casing mismatch (`cr_Amount` vs `cr_amount`) | Dataverse column logical names are lowercase; the fields setting must match exactly |
| Table permission missing or wrong scope | Add Read permission on the table for the calling role |
| Lookup expand target missing its own permission | Parent-scope permission on the child table |

Re-run `/integrate-webapi` in AI-read-only mode to rebuild Layer 1/2 cleanly rather than hand-editing YAMLs.

### Common error table

| Error | What You See | Cause | Fix |
|-------|-------------|-------|-----|
| 200 + `{ Code: 400, Message: "Gen AI Search is disabled" }` | Search Summary returns an envelope error at HTTP 200 | Admin hierarchy disabled somewhere | Walk tenant → env → site and enable the right layer |
| 400 code `90041001` | Data Summarization 400 | Same as above for Data Summarization | Same fix |
| 400 code `90041003` | Data summarization disabled for this site | `Summarization/Data/Enable` missing or `false` | Add the site setting with value `true`, redeploy |
| 400 code `90041004` | Content length exceeds the limit | Expanded collection too large | Bump `Summarization/Data/ContentSizeLimit` (default 100000 chars) |
| 400 code `90041005` | No records found to summarize | Target record/collection empty, or row-level security filtered everything out | Verify data exists and table permissions grant read access to the caller |
| 400 code `90041006` | Error occurred while summarizing the content | Generic summarization failure (bad prompt, content edge case, transient model error) | Inspect the prompt YAML, verify content length, retry once; if persistent, simplify the prompt |
| 403 | Forbidden | Layer 1/2 (column casing, table permission, expand target) | Re-run `/integrate-webapi` AI-read-only |
| Summary is empty or truncated | Content fits but summary is bad | Prompt is too vague or the model got too little context | Improve the prompt in the `Summarization/prompt/<id>` YAML. Use block literal `value: \|` for multi-line prompts |
| Citations drop the user on `/page-not-found` | Citation URL rewriting not wired | The `extractKnowledgeArticleId` rewrite step is missing | Add the rewrite helper to the search page, redeploy |
| Summary returns placeholders like `[\"...\"]` | JSON-encoded string array rendered raw | List-summary prompts return JSON-encoded summaries | Use `normalizeSummaryString` helper in the service layer. The plugin adds this automatically |

---

## Verification

You have completed this lab when:

- [ ] `src/services/aiSummaryService.ts` exports `fetchDataSummary` and `fetchSearchSummary`
- [ ] Invoice Detail renders a Copilot card with grounded summary
- [ ] `/search` page renders and returns an AI summary with citations
- [ ] Citation links route to invoice detail pages (not `/page-not-found`)
- [ ] `.powerpages-site/site-settings/Summarization-Data-Enable.sitesetting.yml` exists
- [ ] `.powerpages-site/site-settings/Summarization-prompt-invoice_summary.sitesetting.yml` exists with a block-literal prompt
- [ ] Site Search (preview) toggle in maker studio is on
- [ ] Disabled-state card renders correctly when the toggle is temporarily off

### Generic debug prompt

When an AI feature isn't working on the deployed site, or `/add-ai-webapi` fails partway, paste this into your AI coding CLI:

```
My AI summary isn't working on the deployed site. I'm seeing [paste 
the error, or describe what you saw, such as "a 400 error", "a card 
that says AI is turned off", or "the card keeps spinning"]. Find the 
cause. I don't know whether the problem is in my code, in a site 
setting, or in an admin configuration.
```

## Fallback

If AI calls consistently return `90041001` and the admin hierarchy is known to be on:

1. Verify your Power Pages runtime version (maker studio → Site details). AI APIs need a recent runtime. Older sites may need to update the Bootstrap v5 runtime before the endpoints activate.
2. Confirm you are testing on the **deployed** site, not localhost. AI APIs don't work locally.
3. Compare your network traces against the curl examples in this lab. A missing `OData-Version`, `OData-MaxVersion`, or `Accept` header is the most common cause of `90041001` after admin settings are confirmed correct.

## Key takeaways

- Three APIs cover most Power Pages AI needs: Search Summary, Data Summarization, and the Case preset
- The three-level admin hierarchy (tenant → environment → site) overrides all code changes. Walk it top to bottom when AI fails
- Disablement surfaces differently: HTTP 200 envelope for Search Summary; HTTP 400 with `90041001` for Data Summarization
- A 403 on a summarization call is always a Layer 1/2 (Web API) issue, never the AI layer
- The prompt lives in a site setting (`Summarization/prompt/<id>`); use YAML block literals (`value: \|`) for multi-line prompts
- `/add-ai-webapi` uses sequential agent spawning. Subsequent runs extend the existing service file rather than duplicating it
- Always rewrite Search Summary citation URLs. The raw URLs point at a page that doesn't exist in SPA sites

## Next step

→ [Lab 08: Improve performance, test, and deploy](./08-performance-test-deploy.md)

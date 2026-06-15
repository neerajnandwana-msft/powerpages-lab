---
sidebar_position: 3
sidebar_label: "Lab 03: Web API Integration"
title: "Lab 03: Connect to Live Data via Web API"
---

# Lab 03: Connect to Live Data via Web API

## What you will build

A portal that reads and writes real Dataverse data through the Power Pages Web API: a typed service layer, CSRF token handling, working CRUD on the deployed site, and OData queries for filtering, sorting, and pagination.

## Prerequisites

- Completed [Lab 02: Set Up Dataverse and Security](./02-dataverse-and-security.md) (Dataverse tables created, sample data inserted, 3-5 invoices re-linked to your Contact, permissions configured, site deployed)
- Site deployed and accessible at its public URL
- You have signed in to the deployed site at least once (so your Contact record exists in Dataverse)
- Active PAC CLI and Azure CLI sessions (`pac auth list`, `az account show`). If your Microsoft account has no Azure subscription, sign in once with `az login --allow-no-subscriptions` — the plugin uses Microsoft Entra ID-scoped tokens that don't require one.

> **Before you start — confirm your Lab 02 state.** The live tests in this lab depend on it:
>
> - [ ] The site is deployed and reachable at its public URL
> - [ ] You signed in once, and 3-5 invoices have **Submitted By** set to your Contact (Lab 02, Step 2.5)
> - [ ] `/setup-auth` completed, so sign-in works (Lab 02, Part 5)
>
> If you skipped the Contact re-link, the Invoice List will look empty here even though everything else is correct — go back and finish Step 2.5 first.

## Learning objectives

By the end of this lab you will be able to:

1. Use `/integrate-webapi` to generate a typed Web API service layer (webApi.ts, entities.ts, invoiceService.ts)
2. Explain how CSRF token handling works in Power Pages write operations
3. Perform end-to-end CRUD testing through the portal UI: create a real invoice, read live data, verify updates
4. Diagnose and fix common Web API errors (403, 400, CORS, empty responses)

> **Important:** Out of the box, the Power Pages Web API (`/_api/`) responds only on the deployed site, where the session cookie and anti-forgery token are issued. So this lab tests by deploying and opening the live site URL, not `localhost:5173`. Calling the Web API from localhost *is* possible, but it takes extra setup — Microsoft Entra v1 bearer authentication plus a dev-server proxy — which the labs skip for simplicity. If you want it later, see [Set up local development by enabling Web API calls from localhost](https://learn.microsoft.com/power-pages/configure/create-code-sites#set-up-local-development-by-enabling-web-api-calls-from-localhost-using-microsoft-entra-id-authentication).

> **Further reading:** [Power Pages Web API overview](https://learn.microsoft.com/power-pages/configure/web-api-overview) · [Site settings for the Web API](https://learn.microsoft.com/power-pages/configure/web-api-overview#site-settings-for-the-web-api) · [Configure table permissions](https://learn.microsoft.com/power-pages/security/table-permissions) · [CSRF token wrapper for Web API calls](https://learn.microsoft.com/power-pages/configure/web-api-http-requests-handle-errors)

---

## Part 1: generate web API service layer

### Step 1.1: run `/integrate-webapi`

In your AI coding CLI session:

```
/integrate-webapi
```

Your AI coding CLI will:
1. Scan your codebase for components using mock data
2. Map mock data to Dataverse tables
3. Generate a typed API service layer
4. Replace mock imports with API calls
5. Generate or update permission YAML files (if not done in Lab 02)

### Step 1.2: review the generated files

> **Reference only — your output may differ.** The code shown below illustrates what the plugin *typically* generates. The plugin adapts its output to your exact project (variable names, helper placement, imports, comments), so your files may look different in small ways. Use these samples to understand the **concept** and the **why** behind each piece — do not rewrite your generated files to match line-for-line. If something in your generated code looks meaningfully different, ask your AI coding CLI to explain the choice before changing anything.

Claude Code creates three key files. Let's examine each one.

#### `src/services/webApi.ts` — the API client

This is the foundation layer that handles all HTTP communication with Dataverse.

**Key features to look for:**

```typescript
// CSRF Token Handling
// Power Pages requires a token for all write operations (POST, PATCH, DELETE).
// Fetch /_layout/tokenhtml, which returns an HTML fragment containing the token
// in a hidden input field, then extract the value.
async function getToken(): Promise<string> {
  const response = await fetch('/_layout/tokenhtml');
  const html = await response.text();
  const match = html.match(/value="([^"]+)"/);
  if (!match) throw new Error('CSRF token not found');
  return match[1];
}

// The token is sent as a header on every write request:
headers: {
  'Content-Type': 'application/json',
  '__RequestVerificationToken': token
}
```

**Generic CRUD functions:**
- `get<T>(entitySet, options?)` — Fetch multiple records with OData parameters
- `getById<T>(entitySet, id)` — Fetch a single record by GUID
- `create<T>(entitySet, data)` — Create a new record (requires CSRF token)
- `update<T>(entitySet, id, data)` — Update an existing record (requires CSRF token)
- `remove(entitySet, id)` — Delete a record (requires CSRF token)

#### `src/types/entities.ts` — TypeScript interfaces

Defines the shape of data returned by the API:

```typescript
export interface Invoice {
  cr_invoiceid: string;
  cr_ponumber: string;
  cr_amount: number;
  cr_description?: string;
  cr_status: number;            // Choice field returns a number
  cr_submissiondate: string;
  cr_duedate: string;
  _cr_submittedby_value: string;       // Lookup returns GUID
  _cr_suppliercompany_value: string;   // Lookup returns GUID
}
```

> **Note the naming conventions:**
> - Regular columns: `cr_ponumber`, `cr_amount`
> - Lookup columns in responses: `_cr_submittedby_value` (underscore prefix, `_value` suffix)
> - The `cr_` prefix comes from your environment's publisher

#### `src/services/invoiceService.ts` — typed CRUD for invoices

A convenience layer that wraps the generic API client with invoice-specific types:

```typescript
// Read all invoices (with optional OData query)
export async function getAll(options?: QueryOptions): Promise<Invoice[]>

// Read one invoice by ID
export async function getById(id: string): Promise<Invoice>

// Create a new invoice
export async function create(invoice: Partial<Invoice>): Promise<Invoice>

// Update an existing invoice
export async function update(id: string, data: Partial<Invoice>): Promise<void>
```

The entity set name for OData is `cr_invoices` (plural of the table logical name).

### Progress checkpoint

You should now have three new files in `src/services/` and `src/types/`. The mock data files should still exist at this point (Claude replaces references next).

---

## Part 2: review the Mock-to-Live replacement

### Step 2.1: what Claude changes

Claude Code scans every page component and replaces mock data imports with API calls:

**Dashboard.tsx — Before:**
```typescript
import { invoices } from '../data/mockInvoices';

// Static data, computed once
const totalInvoices = invoices.length;
const pendingCount = invoices.filter(i => i.status === 'Under Review').length;
```

**Dashboard.tsx — After:**
```typescript
import { getAll } from '../services/invoiceService';

const [invoices, setInvoices] = useState<Invoice[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  getAll({ orderby: 'createdon desc' })
    .then(data => setInvoices(data))
    .finally(() => setLoading(false));
}, []);
```

### Step 2.2: Pages updated

| Page | What Changes |
|------|-------------|
| **Dashboard** | Mock import replaced with `getAll()` call. Metric cards compute from live data. Recent invoices table fetches last 5 with `$top=5&$orderby=createdon desc`. |
| **Invoice List** | Mock array replaced with API call. Status filter uses `$filter=cr_status eq N`. Search uses `$filter=contains(cr_ponumber,'term')`. |
| **Invoice Detail** | Mock lookup replaced with `getById(id)`. Route param `:id` is used to fetch the specific invoice. |
| **Submit Invoice** | Form submission calls `create(invoiceData)` with CSRF token. Success redirects to invoice list. |

### Step 2.3: loading and error states

Claude adds loading and error handling to each page:

```typescript
if (loading) return <div>Loading invoices...</div>;
if (error) return <div>Error loading invoices: {error.message}</div>;
```

This prevents the "Cannot read properties of undefined" error that would occur if the component tried to render before the API call completed.

### Step 2.4: mock data files

Claude should delete (or stop importing) the mock data files. Verify that `src/data/mockInvoices.ts` is no longer imported anywhere. The file itself may or may not be deleted — what matters is that no component references it.

---

## Part 3: build, deploy, and End-to-End test

### Step 3.1: build and deploy

```bash
npm run build && pac pages upload-code-site --rootPath "."
```

Or use Claude Code:

```
/deploy-site
```

### Step 3.2: open the deployed site

Open your site's public URL in an **incognito/private browser window** (to avoid cache issues). Sign in with the same Microsoft work account you used at the end of Lab 02 so the Web API calls run under your Contact.

### Step 3.3: test READ operations

**Dashboard:**
- [ ] Page loads without errors
- [ ] Metric cards show counts that match the invoices linked to your Contact (3-5 records, depending on how many you re-linked in Lab 02 Step 2.5)
- [ ] Recent invoices table shows only your invoices

**Invoice List:**
- [ ] Only the invoices re-linked to your Contact appear (not all 10). This is Contact scoping working correctly.
- [ ] Try the status filter and search on the visible records
- [ ] Select a row to navigate to Invoice Detail

> **Why fewer than 10?** Contact-scoped permissions return only the invoices whose `cr_submittedby` points to your Contact. The invoices still linked to Nancy Anderson (sample) are hidden from you, which is the intended security behavior.

**Invoice Detail:**
- [ ] Invoice number and status badge display correctly
- [ ] Details card shows PO#, Amount, Description, Dates, Company
- [ ] Status timeline shows the correct progression

### Step 3.4: test CREATE

This is the most exciting test — you will create a real record in Dataverse from the portal.

1. Navigate to **Submit Invoice**
2. Fill in the form:
   - PO Number: `PO-2026-011`
   - Amount: `$22,750.00`
   - Due Date: `2026-04-30`
   - Description: `Q1 consulting services - March 2026`
3. Select **Submit**
4. Expected: Success toast or message, redirect to invoice list

**Verify in Dataverse:**
1. Open make.powerapps.com
2. Go to the cr_invoice table
3. Refresh the view
4. A new record should appear with auto-generated Invoice Number (e.g., `INV-100011`)
5. Open the record — all fields should be populated, including the Submitted By lookup

### Step 3.5: test UPDATE (via Dataverse)

Simulate a finance manager approving the invoice:

1. In make.powerapps.com, open the invoice you just created
2. Change the **Status** from "Submitted" to "Approved"
3. Save the record
4. Back in the portal, navigate to that invoice's detail page
5. **Refresh the page** — the status badge and timeline should now show "Approved"

### Step 3.5b: test DELETE (expected to fail)

The table permission you configured in Lab 02 grants Read, Create, and Write — but **not** Delete. A supplier shouldn't be able to delete invoices, so this operation should fail. Confirming that it fails is how you prove the permission layer is doing its job.

On the deployed site, signed in, open the DevTools Console and try to delete one of your invoices (swap in a real `cr_invoiceid` from the Network tab):

```javascript
const token = await fetch('/_layout/tokenhtml')
  .then(r => r.text())
  .then(html => html.match(/value="([^"]+)"/)[1]);

await fetch('/_api/cr_invoices(<your-invoice-guid>)', {
  method: 'DELETE',
  headers: { '__RequestVerificationToken': token }
}).then(r => console.log('Status:', r.status));
```

- [ ] The request returns **403 Forbidden** — Delete isn't granted to the Authenticated Users role
- [ ] The record still exists in make.powerapps.com

This is correct behavior. Deletion happens only through the model-driven app by internal users with higher privileges.

### Step 3.6: inspect network traffic

Open browser DevTools (F12) and go to the **Network** tab. Navigate around the portal and observe:

- [ ] `/_api/cr_invoices` GET requests when loading invoice list or dashboard
- [ ] `/_layout/tokenhtml` request for CSRF token (happens before write operations)
- [ ] POST request when submitting a new invoice — check the `__RequestVerificationToken` header
- [ ] Response payloads contain real Dataverse data with `cr_` prefixed field names

---

## Part 4: OData query Deep-Dive

The Power Pages Web API supports OData query parameters for filtering, sorting, and selecting data. Here is how they work:

### Key OData parameters

| Parameter | Purpose | Example |
|-----------|---------|---------|
| `$select` | Return only specific fields (reduces payload size) | `$select=cr_ponumber,cr_amount,cr_status` |
| `$filter` | Server-side filtering | `$filter=cr_status eq 3` (Approved) |
| `$orderby` | Sort results | `$orderby=createdon desc` |
| `$top` | Limit number of results | `$top=5` |
| `$expand` | Include related records | `$expand=cr_submittedby($select=fullname)` |

### Try it in the browser console

Open DevTools console on the deployed site and try these queries:

```javascript
// Get only PO numbers and amounts, sorted by amount descending
fetch('/_api/cr_invoices?$select=cr_ponumber,cr_amount&$orderby=cr_amount desc')
  .then(r => r.json())
  .then(d => console.table(d.value));

// Get only "Submitted" invoices (status value = 1)
fetch('/_api/cr_invoices?$filter=cr_status eq 1')
  .then(r => r.json())
  .then(d => console.log('Submitted invoices:', d.value.length));

// Get the top 3 most recent invoices
fetch('/_api/cr_invoices?$top=3&$orderby=createdon desc')
  .then(r => r.json())
  .then(d => console.table(d.value));
```

### Status choice values

The `cr_status` field is a Dataverse Choice column. The API returns and accepts integer values:

| Status | API Value |
|--------|-----------|
| Draft | 0 |
| Submitted | 1 |
| Under Review | 2 |
| Approved | 3 |
| Rejected | 4 |
| Paid | 5 |

> **Note:** The exact integer values may differ based on how the Choice was created. Check your Dataverse table definition for the actual values.

---

## Troubleshooting

If you encounter issues during testing, use this reference to diagnose and fix them.

### Error reference

| Error | What You See | Cause | Fix |
|-------|-------------|-------|-----|
| **403 on GET** | `fetch('/_api/cr_invoices')` returns 403 | Table not enabled for Web API | Verify `Webapi/cr_invoice/enabled` site setting exists and is `"true"`. Redeploy. |
| **403 on POST** | Creating an invoice returns 403 | Missing CSRF token or wrong header name | Verify `webApi.ts` fetches `/_layout/tokenhtml` and sends the extracted token as the `__RequestVerificationToken` header. |
| **400 "Field not in allowed list"** | Specific field causes 400 | Field not in the site setting's allowed fields | Add the field to `Webapi/cr_invoice/fields` in the site setting YAML. Use the API name (e.g., `_cr_submittedby_value` for lookups). Redeploy. |
| **CORS error** | Browser console shows CORS policy error | Calling the Web API from localhost without the local-dev setup | The Web API responds on the deployed Power Pages URL out of the box. Deploy first and test on the live site. (Localhost calls need Entra v1 bearer auth plus a dev-server proxy — out of scope here.) |
| **TypeScript compile error** | "Property does not exist on type" | Field name mismatch between interface and API | Check `entities.ts` uses `cr_` prefixed names from Dataverse. Lookup fields need `_` prefix and `_value` suffix. |
| **Empty response `{"value":[]}`** | API returns empty array | Permission scope mismatch or no linked data | Verify the logged-in user's Contact record matches the `cr_submittedby` on invoices. Check scope is Contact (not Self or Global). |
| **500 Internal Server Error** | Server error on API call | Dataverse issue | Check Power Platform admin center for service health. Try the call again in 30 seconds. |

### Fix web API errors with your AI agent

The error-reference table above handles the single-layer cases. In practice many Web API failures are a mix — the site setting is enabled but a field isn't allow-listed, the role exists but the permission has the wrong scope, the permission is correct but the frontend forgot the CSRF token. **Rather than hand-debug these, paste the error into your AI coding CLI and let it check every layer for you.**

This is the same **Error-Paste-and-Fix** pattern you used in [Lab 02, Step 4.4](./02-dataverse-and-security.md#step-44-if-you-see-an-error-use-the-error-paste-and-fix-pattern) and it appears as **Pattern 8** in the [Prompt Cheat Sheet](../reference/prompt-cheat-sheet.md#8-error-paste-and-fix). Use it here whenever you hit a Web API error that the reference table alone does not resolve.

#### Step 1: gather what the agent needs

Open DevTools (**F12**) and collect three things:

1. **Console error** — any red text including the stack trace (or "no console error" if none).
2. **Failed Network request** — in the Network tab (filter **Fetch/XHR**), select the failing `/_api/*` call, then copy:
   - The request URL and HTTP method (from the **Headers** tab)
   - The HTTP status (e.g. `403 Forbidden`, `400 Bad Request`)
   - The full **Response** body — this is where Power Pages puts the actual error reason
3. **What you were doing** — "loading the Invoice List page", "clicking Submit on the new-invoice form", "signed in as [test user]".

#### Step 2: paste into your CLI with context

Use a prompt that tells the agent to check all three security layers and the frontend code. Example:

```
Loading the Invoice List page returns no records. I expected 3-5 invoices
linked to my Contact (I re-linked them in Lab 02, Step 2.5).

Console: no console error.

Network — GET /_api/cr_invoices?$select=cr_invoicenumber,cr_amount,cr_status
  Status: 403 Forbidden
  Response:
  {"error":{"code":"0x80048306","message":"Principal user (..) does not have
    ReadAccess privilege on entity cr_invoice"}}

What I was doing: signed in as my Power Pages test user, navigated to /invoices.

Check the three security layers (Webapi site settings, Authenticated Users
web role, table-permissions YAML) and the frontend fetch code in
src/services/webApi.ts. Find the root cause and fix it.
```

#### Step 3: let the agent check every layer

A Web API failure can live in any of these files. Your agent will read them all in seconds:

- `.powerpages-site/site-settings/` — is `Webapi/cr_invoice/enabled` set to `"true"`? Is the failing field listed in `Webapi/cr_invoice/fields`?
- `.powerpages-site/web-roles/*.yml` — does the role the user belongs to exist?
- `.powerpages-site/table-permissions/*.yml` — is there a permission linked to that role, with the right scope (Contact for invoices)?
- `src/services/webApi.ts` — is the CSRF token fetched and sent as the `__RequestVerificationToken` header for writes?

Review the proposed fix before you approve. If the agent misidentifies the layer, give it the extra context (e.g., "the site setting already has the field — check the fields allowlist" or "I just signed in as a different user").

#### Step 4: redeploy and re-test

YAML changes only take effect after upload. Run `/deploy-site`, do a hard refresh (**Ctrl+Shift+R**) or switch to an incognito window, and repeat the failing action. If the same error returns, paste the new Network response back to the agent — sometimes the first fix uncovers a second layer.

> **Rule of thumb:** If you're spending more than 2 minutes scanning files by hand, switch to Error-Paste-and-Fix. The agent is faster than you at multi-file diagnosis.

### Common gotcha: stale browser cache

If you deploy changes but the site still shows old behavior:

1. Use an incognito/private window
2. Hard refresh: Ctrl+Shift+R
3. Clear site data: DevTools > Application > Storage > Clear site data

---

## Verification

You have completed this lab when:

- [ ] `src/services/webApi.ts` exists with CSRF token handling
- [ ] `src/types/entities.ts` has Invoice interface with correct `cr_` prefixed field names
- [ ] `src/services/invoiceService.ts` has getAll, getById, create, and update functions
- [ ] Mock data files are no longer imported by any component
- [ ] Dashboard shows real Dataverse data (metric cards reflect actual record counts)
- [ ] Invoice List displays all records from the API
- [ ] Status filter works correctly (filters via OData `$filter`)
- [ ] Search works correctly
- [ ] Submit Invoice creates a real record in Dataverse with auto-generated Invoice Number
- [ ] New record is visible in make.powerapps.com after submission
- [ ] Invoice Detail shows correct data for a specific record
- [ ] Network tab shows `/_api/cr_invoices` calls and `/_layout/tokenhtml` requests

### Generic debug prompt

If `/integrate-webapi` or the live API call fails, paste the output back to your AI coding CLI:

```
I deployed and tested the Web API integration. A call to /_api/<table>
failed. Diagnose the root cause and propose a fix before applying
anything.

URL: [paste the full request URL]
Status: [paste the HTTP status code]
Response body: [paste the full JSON response]
Console errors: [paste any related DevTools Console errors]
```

---

## Fallback

If Web API integration fails and you cannot resolve the issues:

1. Claude Code can revert to mock data: "Revert to mock data imports while I fix the API."
2. Check the git history — `/create-site` made commits at milestones, so you can revert to a working state.

---

## Key takeaways

- `/integrate-webapi` generates a complete typed service layer: API client, TypeScript interfaces, and table-specific CRUD services
- CSRF tokens (fetched from `/_layout/tokenhtml`) are required for all write operations (POST, PATCH, DELETE) — the API client handles this automatically
- The Web API responds on the deployed site out of the box; calling it from localhost is possible but needs extra Entra v1 bearer-auth and proxy setup
- OData parameters ($select, $filter, $orderby, $top) give you powerful server-side querying
- Contact-scoped permissions ensure data isolation: each supplier sees only their own invoices, even through direct API calls
- When debugging, always check all three security layers and the browser Network tab

## What's next

→ [Lab 04: Plan the Service Layer with /integrate-backend](../integrate/04-pick-backend-pattern.md)

> **Tip:** If you ran `/integrate-webapi` here but haven't yet configured deliberate sign-in (multi-provider, claims mapping, role-based UI), [Lab 02 Part 5: Configure authentication with /setup-auth](./02-dataverse-and-security.md#part-5-configure-authentication-with-setup-auth) is the natural follow-up — the typical plugin workflow runs `/setup-auth` right after `/integrate-webapi`.

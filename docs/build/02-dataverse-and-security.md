---
sidebar_position: 2
sidebar_label: "Lab 02: Set up Dataverse and security"
title: "Lab 02: Set up Dataverse and security"
---

# Lab 02: Set up Dataverse and security

## Goal

Replace mock-only assumptions with a Dataverse backend, sample data, web roles, table permissions, and authentication for the supplier portal.

## State you carry forward

- Completed [Lab 01: Scaffold a Power Pages SPA](./01-scaffold-spa-portal.md) (supplier portal scaffolded and running locally)
- Active PAC CLI and Azure CLI sessions, re-authenticate if expired (`pac auth list`, `az account show`). If your Microsoft account has no Azure subscription, sign in once with `az login --allow-no-subscriptions`; the plugin only needs Microsoft Entra ID-scoped tokens, and downstream `az` commands run normally afterward.

> **Before you start: confirm your Lab 01 state.** This track is cumulative; each lab builds on the last. Verify:
>
> - [ ] `npm run dev` runs and `http://localhost:5173` shows the landing page
> - [ ] All 5 pages are reachable, with 10 mock invoices on the list
> - [ ] `powerpages.config.json` exists at the project root
>
> If any of these fail, finish [Lab 01](./01-scaffold-spa-portal.md) before continuing.

## Learning objectives

By the end of this lab you will be able to:

1. Create Dataverse tables and columns using `/setup-datamodel`
2. Populate tables with sample data using `/add-sample-data`
3. Configure table permissions with appropriate CRUD operations and scopes (Global, Self, Contact)
4. Create web roles and assign them to permission rules
5. Enable site settings for Web API access with explicit field lists
6. Explain the three-layer security model: Site Settings, Web Roles, Table Permissions
7. Configure authentication with `/setup-auth`: picking the right provider mix, mapping IdP claims to Contact columns, and adding role-based UI helpers

> **Further reading:** [Dataverse overview](https://learn.microsoft.com/power-apps/maker/data-platform/data-platform-intro) · [Power Pages security model](https://learn.microsoft.com/power-pages/security/power-pages-security) · [Configure table permissions](https://learn.microsoft.com/power-pages/security/table-permissions) · [Assign table permissions](https://learn.microsoft.com/power-pages/security/assign-table-permissions) · [Create web roles](https://learn.microsoft.com/power-pages/security/create-web-roles) · [Configure site settings](https://learn.microsoft.com/power-pages/configure/configure-site-settings) · [Overview of authentication in Power Pages](https://learn.microsoft.com/power-pages/security/authentication/) · [Configure authentication for a Power Pages site](https://learn.microsoft.com/power-pages/security/authentication/configure-site)

---

## Part 1: create Dataverse tables

### Concept: the data model

Below is an **example** data model for the supplier invoice portal scenario. Your own schema will depend on what you asked the plugin to build in Lab 01, so treat this table as a reference, not a checklist.

| Table | Type | Purpose |
|-------|------|---------|
| **Account** | Standard (reuse) | Supplier company |
| **Contact** | Standard (reuse) | Supplier user (linked to Account, tied to Power Pages auth) |
| **cr_invoice** | Custom (create) | Invoice records with PO#, Amount, Status, etc. |

> **Review the plan against your own portal.** When `/setup-datamodel` proposes a schema in Step 1.2, compare it against the pages and mock data your Lab 01 scaffold actually uses. If the table names, columns, or relationships don't match the example above, that is expected: your feature set drives the model, not this guide. Use the proposal screen to add, rename, or drop tables before approving.

> **One constant, regardless of your schema: Contact always represents the logged-in user.** Power Pages authentication is wired to the standard Contact table: every signed-in visitor maps to exactly one Contact row, and every Contact-scoped permission resolves through it. Do not replace Contact with a custom "User" or "Supplier" table, and do not rename it. If you need extra per-user fields, add columns to Contact or link a child table to it. Everything else in your data model is free to change.

### Step 1.1: deploy your site first

Before creating tables, deploy your site so it exists in Power Pages:

```
/deploy-site
```

Your AI coding CLI will:
1. Build the project (`npm run build`)
2. Upload to Power Pages (`pac pages upload-code-site`)

> **First deploy fails with "The attachment is either not a valid type or is too large"?** Many Dataverse environments block `.js` file uploads by default, which stops an SPA from uploading. Remove `js` from the blocked-attachment list: in the [Power Platform admin center](https://admin.powerplatform.microsoft.com/), select **Manage** → **Environments** → your environment → **Settings** → **Product** → **Privacy + Security**, then delete `js` from **Blocked Attachments** and **Save**. Redeploy. (The plugin's `/deploy-site` also detects this and prints the same fix.) See [Allow JavaScript file uploads](https://learn.microsoft.com/power-pages/configure/create-code-sites#allow-javascript-file-uploads).

If the site has not been activated yet:

```
/activate-site
```

Your AI coding CLI will suggest a subdomain (e.g., `supplier-portal`) and provision a public URL.

> **Note:** Site activation takes 2-5 minutes. Wait for the URL to be confirmed before proceeding.

### Step 1.2: run `/setup-datamodel`

In your AI coding CLI session:

```
/setup-datamodel
```

Your AI coding CLI will:
1. Analyze your codebase (reads mock data and page components)
2. Query Dataverse for existing tables (avoids duplicates)
3. Propose a schema with an ER diagram

### Step 1.3: review the schema proposal

Before approving, verify the proposal includes:

- [ ] **cr_invoice** table with these columns:

  | Column | Type | Details |
  |--------|------|---------|
  | Invoice Number | Autonumber | Format: `INV-{SEQNUM:6}`, read-only |
  | PO Number | String (100) | Required |
  | Amount | Money | Required |
  | Description | Memo (2000) | Optional |
  | Status | Choice | Draft, Submitted, Under Review, Approved, Rejected, Paid |
  | Submission Date | Date | Auto-set on create |
  | Due Date | Date | Required |
  | Submitted By | Lookup to Contact | Used for Contact-scoped security |
  | Supplier Company | Lookup to Account | Derived from Contact's parent Account |

- [ ] Account and Contact tables are referenced (not recreated)
- [ ] Publisher prefix is noted (typically `cr_` or your environment's default)

If something is missing or wrong, tell Claude before approving:

```
The proposal looks good, but I need the Status choice to include "Paid" as an option. 
Also make sure the Submitted By lookup points to Contact, not a custom table.
```

### Step 1.4: approve and create

Approve the proposal. Claude Code creates the table and columns via the Dataverse OData API.

### Step 1.5: verify the schema in Power Pages Studio

Power Pages Studio has a built-in **Data workspace** that shows the Dataverse tables used by your site. Use it to confirm your new invoice table looks right. ([Data workspace overview](https://learn.microsoft.com/power-pages/getting-started/use-data-workspace) · [Create and modify tables in the Data workspace](https://learn.microsoft.com/power-pages/configure/data-workspace-tables))

1. Open [Power Pages Studio](https://make.powerpages.microsoft.com/).
2. Select your environment (top-right switcher) and select your site.
3. In the left navigation, select the **Data** workspace icon.
4. Find your invoice table in the list (look for a `cr_` prefix, e.g. `cr_invoice` / "Invoice"). If it is not listed yet, select **+ New table** → **Choose existing table** and add it from Dataverse.
5. Select the invoice table. You will see its columns, types, and any choice values. Verify:
   - [ ] All columns exist with the correct types
   - [ ] Status choice has all 6 values
   - [ ] Autonumber format is `INV-{SEQNUM:6}`
   - [ ] Lookups to Contact and Account are present

> **Concept: publisher prefix and singular vs plural names.** Every custom table and column gets a prefix (e.g., `cr_`) from your environment's default publisher. Note your prefix. You reuse it in every later lab. Two forms of the table name show up, and using the wrong one in the wrong place is a common error:
>
> | Form | Example | Where you use it |
> |------|---------|------------------|
> | **Logical name** (singular) | `cr_invoice` | YAML files: table permissions, site settings (`Webapi/cr_invoice/enabled`) |
> | **Entity set name** (plural) | `cr_invoices` | Web API calls: `/_api/cr_invoices` |
>
> Lookup columns add a third twist: in API responses they return with a `_` prefix and `_value` suffix, so `cr_submittedby` becomes `_cr_submittedby_value`. The rest of this lab and Labs 03, 05, and 07 all depend on this convention.

> **Alternative:** You can also verify in the Power Apps maker portal at https://make.powerapps.com → **Tables** → your invoice table. Power Pages Studio is preferred because it shows only the tables your site uses.

### Progress checkpoint

At this point you should have:
- A deployed Power Pages site with a public URL
- A `cr_invoice` table in Dataverse with all columns
- Account and Contact tables ready for use

---

## Part 2: add sample data

### Step 2.1: run `/add-sample-data`

```
/add-sample-data
```

Your AI coding CLI will present an insertion plan.

### Step 2.2: review the insertion plan

Verify the plan includes:
- [ ] 1 Account: "Adventure Works (sample)"
- [ ] 1 Contact: "Nancy Anderson (sample)" (linked to the Account)
- [ ] 10 Invoices with the following data:

| Invoice # | PO # | Amount | Status |
|-----------|------|--------|--------|
| INV-100001 | PO-2026-001 | $12,500 | Paid |
| INV-100002 | PO-2026-002 | $3,750 | Paid |
| INV-100003 | PO-2026-003 | $28,000 | Approved |
| INV-100004 | PO-2026-004 | $8,200 | Approved |
| INV-100005 | PO-2026-005 | $1,500 | Under Review |
| INV-100006 | PO-2026-006 | $45,000 | Under Review |
| INV-100007 | PO-2026-007 | $6,800 | Submitted |
| INV-100008 | PO-2026-008 | $15,300 | Submitted |
| INV-100009 | PO-2026-009 | $2,100 | Rejected |
| INV-100010 | PO-2026-010 | $85,000 | Draft |

### Step 2.3: approve and insert

Approve the plan. The agent inserts records in **dependency order**:
1. Account first (no dependencies)
2. Contact second (linked to Account)
3. Invoices last (linked to both Contact and Account)

> **Concept: OData Bind Syntax.** When inserting an invoice with a Contact lookup, Dataverse uses:
> ```json
> "cr_submittedby@odata.bind": "/contacts(<contact-guid>)"
> ```
> This special `@odata.bind` syntax sets foreign key relationships. In our sample data, the contact GUID points to Nancy Anderson (sample). Claude handles this automatically.

### Step 2.4: verify sample data in Power Pages Studio

Back in [Power Pages Studio](https://make.powerpages.microsoft.com/) → **Data** workspace, select your invoice table. The records view should now populate with the newly inserted sample data.

Verify:

- [ ] 10 records appear in the grid
- [ ] Each row has an auto-generated Invoice Number (`INV-100001` through `INV-100010`)
- [ ] Amount and Status values match the table in Step 2.2
- [ ] Open one record: the **Submitted By** and **Supplier Company** lookups are populated (not blank)

If the grid looks empty, select the refresh icon or reload the Data workspace. Newly inserted records can take a few seconds to appear.

> **Alternative:** You can also view the records at https://make.powerapps.com → **Tables** → your invoice table → "Active Invoices" view.

### Step 2.5: sign in once and link sample invoices to your contact

The sample data is linked to a mock Contact ("Nancy Anderson (sample)"). In Lab 03 you will test Contact-scoped Web API calls, and those calls only return invoices linked to **your** Contact record. You need to (a) create your Contact by signing in to the deployed site once, then (b) re-link a few sample invoices to it.

> **Why this is needed:** Every activated Power Pages site gets a default Microsoft Entra ID identity provider. When you sign in for the first time, Power Pages either matches an existing Contact by email or creates a new one for you. The sample data was inserted before your Contact existed, so it points to Nancy Anderson (sample) instead.
>
> **Carry-forward to Lab 03:** The invoices you re-link here are the only sample rows you should expect to see in the live API tests. If you skip this step, Lab 03 may look "empty" even though the Web API and table permissions are working correctly.

1. Open your deployed site's public URL in a new browser tab.
2. Select **Sign in** and authenticate with your Microsoft work account. You will be redirected back to the site. This creates (or links) your Contact record in Dataverse.
3. In make.powerapps.com, open the **Contacts** table and confirm a Contact with your email exists. Note the contact's full name.
4. Open the **cr_invoice** table. Pick 3-5 invoices and update the **Submitted By** lookup from "Nancy Anderson (sample)" to your Contact. Save each record.
5. (Optional) Leave the remaining invoices linked to Nancy Anderson (sample) so you can later demonstrate what Contact scoping blocks.

### Progress checkpoint

At this point you should have:
- 10 invoice records in Dataverse
- Each linked to either "Nancy Anderson (sample)" or your own Contact, plus "Adventure Works (sample)" (Account)
- Your Contact record in Dataverse, created by signing in to the deployed site
- All Status values distributed across the 6 choices

---

## Part 3: configure permissions and web roles

This is the most important section for security. Power Pages uses a three-layer security model that controls who can access what data through the Web API.

### Concept: the Three-Layer security model

```
Layer 1: Site Settings
    "Is the API endpoint enabled? Which fields are accessible?"
        |
        v
Layer 2: Web Roles
    "What category of user is making the request?"
        |
        v
Layer 3: Table Permissions
    "What CRUD operations can this role perform? On which records?"
```

All three layers must be configured for the Web API to work. A missing layer (site setting off, no web role, or no table permission) returns **403 Forbidden**. A request for a column that isn't in the allow-list, or a malformed OData query, returns **400 Bad Request** instead. Keep that distinction in mind when you debug in Part 4.

### Concept: permission scopes

Table permissions have a **scope** that controls which records a user can access:

| Scope | What It Means | Example |
|-------|--------------|---------|
| **Global** | Access all records in the table | Public product catalog |
| **Self** | Access only the record that IS the user's Contact | User profile page |
| **Contact** | Access records linked to the user's Contact via a lookup | Supplier sees only their own invoices |
| **Account** | Access records linked to the user's Account | Company admin sees all company invoices |
| **Parent** | Access child records of a parent the user can access | Invoice line items for accessible invoices |

For the supplier portal, we use **Contact scope** for invoices. This means each supplier user only sees invoices where the Submitted By lookup points to their Contact record.

### The permissions matrix

| Table | Role | Read | Create | Write | Delete | Scope |
|-------|------|:----:|:------:|:-----:|:------:|-------|
| cr_invoice | Authenticated (Supplier) | Yes | Yes | Yes | No | Contact (`cr_submittedby`) |
| contact | Authenticated | Yes | No | No | No | Self |
| account | Authenticated | Yes | No | No | No | Contact |

**Why these choices:**
- **cr_invoice, Contact scope:** Suppliers see only their own invoices (linked via `cr_submittedby`). They can create new invoices and edit drafts but cannot delete (prevents accidental data loss).
- **contact, Self scope:** Users can read their own Contact record (for profile display) but cannot modify it.
- **account, Contact scope:** Users can read the Account linked to their Contact (for company info display).

### Step 3.1: understand the YAML files

Permissions, roles, and site settings are configured as YAML files in the `.powerpages-site/` directory. When you deploy with `pac pages upload-code-site`, these files are applied to your Power Pages environment.

**Site Setting example** (`.powerpages-site/site-settings/`):
```yaml
name: Webapi/cr_invoice/enabled
value: "true"
```

```yaml
name: Webapi/cr_invoice/fields
value: "cr_invoiceid,cr_ponumber,cr_amount,cr_description,cr_status,cr_submissiondate,cr_duedate,_cr_submittedby_value,_cr_suppliercompany_value"
```

> **Important:** Always list fields explicitly. Never use `*`. It exposes every column, including system fields that should remain private.

> **Note on lookup fields:** In the API response, lookup fields are returned with `_` prefix and `_value` suffix. For example, the `cr_submittedby` lookup becomes `_cr_submittedby_value` in API responses and must be listed that way in the fields setting.

**Table Permission example** (`.powerpages-site/table-permissions/`):
```yaml
name: Invoice - Authenticated - Contact Scope
tablename: cr_invoice
scope: contact
contactfield: cr_submittedby
read: true
create: true
write: true
delete: false
webroles:
  - Authenticated Users
```

**Web Role example** (`.powerpages-site/web-roles/`):
```yaml
name: Authenticated Users
authenticatedusersrole: true
```

### Step 3.2: generate permissions configuration

Claude Code generates these files as part of the Web API integration. Pick the path that fits how you want to pace the next two labs:

**Option A: generate code and permissions together (recommended for a continuous flow).** Run `/integrate-webapi` now. It generates both the typed API service layer *and* the permission YAML files, so the app makes live `/_api/` calls as soon as you deploy, and Part 4 below tests through the app UI. Lab 03 then becomes a guided review of what was generated. This is the path the rest of this lab assumes.

```
/integrate-webapi
```

**Option B: generate only the permission files now.** Ask your AI coding CLI for just the YAML. Your app still runs on mock data until Lab 03 wires it to live data, so in Part 4 you verify permissions with direct `/_api/` calls in the browser console rather than through the app UI.

```
Set up the Web API permissions for the supplier invoice portal. Create the site 
settings, table permissions, and web roles as YAML files in .powerpages-site/. 
Use the permissions matrix: cr_invoice with Contact-scoped read/create/write for 
Authenticated Users, contact with Self-scoped read, account with Contact-scoped read.
```

### Step 3.3: review the generated files

After Claude generates the YAML files, verify the `.powerpages-site/` directory contains one YAML file per site setting. The file names use hyphens (file system-safe), but the `name` field inside each file uses slashes (the actual site setting name that Power Pages reads).

**Site Settings** (`site-settings/`):

| File name on disk | `name` field in YAML | Expected value |
|-------------------|----------------------|----------------|
| `Webapi-cr_invoice-enabled.yml` | `Webapi/cr_invoice/enabled` | `"true"` |
| `Webapi-cr_invoice-fields.yml` | `Webapi/cr_invoice/fields` | Explicit field list (no `*`) |
| `Webapi-contact-enabled.yml` | `Webapi/contact/enabled` | `"true"` |
| `Webapi-contact-fields.yml` | `Webapi/contact/fields` | Explicit field list |
| `Webapi-account-enabled.yml` | `Webapi/account/enabled` | `"true"` |
| `Webapi-account-fields.yml` | `Webapi/account/fields` | Explicit field list |

**Table Permissions** (`table-permissions/`):
- [ ] cr_invoice permission with Contact scope, correct CRUD flags, linked to Authenticated Users role
- [ ] contact permission with Self scope, read-only, linked to Authenticated Users role
- [ ] account permission with Contact scope, read-only, linked to Authenticated Users role

**Web Roles** (`web-roles/`):
- [ ] Authenticated Users role with `authenticatedusersrole: true`

### Step 3.4: security discussion

Take a moment to understand why this setup is secure:

**What Contact scope prevents:** Even if a user crafts a direct API request like `/_api/cr_invoices(some-other-guid)`, Power Pages will return 403 if that invoice's `cr_submittedby` does not match the user's Contact. The security is enforced server-side, not in the UI.

**What the explicit field list prevents:** If you add a sensitive column later (e.g., `cr_internalapprovalcomments`), it will not be exposed through the API unless you explicitly add it to the fields site setting.

**What deleting is blocked prevents:** Suppliers cannot accidentally or intentionally delete invoice records. Deletion is only possible through the model-driven app by internal users with higher privileges.

### Progress checkpoint

At this point you should have:
- YAML files in `.powerpages-site/` for site settings, table permissions, and web roles
- A clear understanding of the three-layer security model
- Knowledge of permission scopes and why Contact scope is used for invoices

---

## Part 4: deploy and test the application

### Step 4.1: build and deploy

Deploy the site with all the new configuration:

```bash
npm run build && pac pages upload-code-site --rootPath "."
```

Or use your AI coding CLI:

```
/deploy-site
```

PAC CLI uploads both the compiled site and the `.powerpages-site/` YAML files (permissions, roles, settings).

### Step 4.2: open the app and monitor the console

Open your deployed site URL in a browser and sign in with a test account. Now open DevTools (press **F12**) and keep two tabs visible while you test:

- **Console tab**: shows JavaScript errors from the app. It should stay clean; red messages mean something is wrong.
- **Network tab**: filter by **Fetch/XHR** to watch API calls to `/_api/*`. Successful calls return **200 OK** with a JSON response body.

**If you took Option A** (ran `/integrate-webapi`), use the app the way a supplier would:

1. Navigate to the Invoice List page. Does data load?
2. Open an individual invoice. Does the detail view populate?
3. Try any other page or action wired up in your scaffolded site.

As you navigate, glance at the Network tab. Each `/_api/cr_invoices...` request should be green (200 OK). Select a request and check the **Response** tab to confirm the data looks right.

**If you took Option B** (permissions only), the app still uses mock data, so test the permission layer directly. With the deployed site open and signed in, paste this into the DevTools Console:

```js
fetch('/_api/cr_invoices?$select=cr_ponumber,cr_amount,cr_status')
  .then(r => r.json()).then(console.log)
```

A 200 response with a `value` array confirms all three layers are wired correctly. Lab 03 then replaces the mock data so the app itself makes these calls.

### Step 4.3: verify contact scoping

Because you re-linked 3-5 invoices to your Contact in Step 2.5, the Invoice List page should show only those records, not all 10. This confirms that Contact-scoped permissions are working: the server is enforcing isolation, not just the UI hiding records.

If time permits, sign in as a different user whose Contact has no invoices linked. The Invoice List page should appear empty. Same query, different identity, different data.

### Step 4.4: if you see an error, use the Error-Paste-and-Fix pattern {#step-44-if-you-see-an-error-use-the-error-paste-and-fix-pattern}

When something does not work (the list is empty when it shouldn't be, a request returns 403 or 400, the Console shows a red error, the app crashes), **don't debug manually**. Use the **Error-Paste-and-Fix** pattern from your prompt cheat sheet (Pattern 8).

The flow:

1. **Copy the error.** In DevTools Console, select the full red message including the stack trace and copy it. If the failure is a network request, also open the Network tab, select the failed call, go to the **Response** tab, and copy the error body too.
2. **Paste into your AI coding CLI with context**: say what you were doing, what you expected, and what you saw. Example:

   ```
   I just deployed my site and signed in, but the Invoice List page shows no
   records. I expected 3-5 invoices (they are linked to my Contact in
   Dataverse). Here is what DevTools shows:

   Console:
   [paste full console error with stack trace]

   Network response for /_api/cr_invoices:
   [paste JSON response body]

   Find the root cause and fix it.
   ```

3. **Review the proposed fix.** The agent will usually check your site settings, table-permissions YAML, web roles, or frontend code. Read the plan before approving.
4. **Redeploy and re-test.** Run `/deploy-site` again, refresh the browser, and repeat Step 4.2.

> Full pattern examples: see `prompt-cheat-sheet.md` → Pattern 8: Error-Paste-and-Fix.

---

## Part 5: configure authentication with `/setup-auth`

So far the deployed site is open: anyone with the URL can browse it, and Lab 02 Step 2.5 relied on the **default Microsoft Entra ID identity provider** that every activated site gets. That default is fine for "sign in once so my Contact exists", but real sites need a deliberate provider mix, role-based UI, claims mapping, and a sign-in page that fits the audience. `/setup-auth` handles all of that, including the legwork in the identity provider's admin center.

> **Required for this track, not optional.** Part 5 produces the auth service and role helpers (`hasRole`, `RequireAuth`, `RequireRole`) and the session keepalive hook that the later labs assume are present; and the verification checklist below expects them. Complete it before moving to Lab 03.

> **Important:** Server-side table permissions (Part 3) are what actually protect your data. The client-side helpers `/setup-auth` generates (`hasRole`, `RequireAuth`, `RequireRole`) only control what the UI *shows*. Keep both layers in mind: server-side enforces access, client-side improves UX.

> **Further reading:** [Overview of authentication in Power Pages](https://learn.microsoft.com/power-pages/security/authentication/) · [Configure authentication for a Power Pages site](https://learn.microsoft.com/power-pages/security/authentication/configure-site)

### Step 5.1: pick the right provider mix

`/setup-auth` supports nine identity providers and lets you configure several at once. The plugin proposes a sensible default based on the site's audience, but the call is yours.

| Provider | Best for | Notes |
|---|---|---|
| **Microsoft Entra External ID** (recommended for customer-facing sites) | Public sites and customer portals with self-service sign-up | The plugin walks you through tenant creation and user flow setup |
| **Microsoft Entra ID** | Internal employee portals or B2B partner sites | Power Pages auto-configures the parent tenant; you don't supply tenant info |
| **OpenID Connect** | Standards-based federation with an existing IdP | Generic OIDC; you supply issuer URL and client credentials |
| **SAML 2.0** / **WS-Federation** | Enterprise SSO against an existing IdP | Generic SAML/WS-Fed; you supply the metadata URL |
| **Microsoft, Facebook, Google** | Social sign-in for consumer audiences | Useful as a secondary provider alongside Entra External ID |
| **Local authentication** | Username + password | **Not recommended.** The plugin only configures it on explicit request |

For the supplier portal scenario (mixed internal + external suppliers), the natural mix is **Entra ID** (internal staff) + **Entra External ID** (external suppliers). For a purely internal portal, **Entra ID** alone is enough.

### Step 5.2: run `/setup-auth`

In your AI coding CLI:

```
/setup-auth
```

The plugin will:

1. Analyze your site (purpose, pages, audience) and **propose** a sensible default provider mix. You accept or override.
2. Walk you through every prerequisite in each identity provider's admin center: creating tenants, registering apps, creating user flows, and capturing client IDs and redirect URIs.
3. **Validate each value you paste back** into the conversation, and compute the exact redirect URI for your site so the value pasted into the app registration matches the value written into site settings.
4. Ask three claims-mapping questions per provider:
   - How user profile data should flow from the IdP into the Dataverse contact record (which claims map to which Contact columns)
   - Whether to sync on **every sign-in** or **first sign-in only**
   - Whether to **auto-link external sign-ins to existing contacts by email**
5. Generate the authentication code under your framework's idioms (React hooks, Vue composables, Angular services, or Astro components).
6. Write site settings under `.powerpages-site/site-settings/`: one set per provider, plus registration mode, claims mapping, and any optional features.

### Step 5.3: review the generated artifacts

After the skill finishes, you should see new files in three places. Spend a minute confirming each section is consistent with what you approved.

**Auth service + utilities (`src/services/auth/` or your framework's equivalent):**

- A typed authentication service exposing `signIn`, `signOut`, `getUser`, and the current session
- Role-based authorization utilities: typically `hasRole(role)`, a `RequireAuth` wrapper, and a `RequireRole` wrapper keyed by web role
- A **session keepalive hook** that prevents SPA sessions from silently expiring (a common SPA-on-Power-Pages gotcha). The hook polls a lightweight Power Pages keepalive endpoint on a timer so the session cookie stays fresh while the user is active. It does not extend an idle session indefinitely

> **Reference only: your output may differ.** The code shown below illustrates what the plugin *typically* generates. The plugin adapts its output to your exact project (variable names, helper structure, comment style, error-handling shape), so your files may look different in small ways. Use these samples to understand the **concept** and the **why** behind each piece. Do not rewrite your generated files to match line-for-line. If something in your generated code looks meaningfully different, ask your AI coding CLI to explain the choice before changing anything.

```typescript
import { useAuth } from "@/services/auth";

function Dashboard() {
  const { user, hasRole } = useAuth();

  if (!hasRole("Finance Approvers")) {
    return <RestrictedAccessPanel />;
  }
  return <ApproverDashboard />;
}
```

**Sign-in UI:**

- A sign-in / sign-out component integrated with your site layout
- If you configured **more than one provider**, a `/login` page in one of four layouts:

| Layout | Use when |
|---|---|
| **Horizontal row** | 2-3 equally weighted providers |
| **Vertical stack** | Long provider list or mobile-first audience |
| **Primary spotlight** | One recommended provider with secondary fallbacks |
| **Tabbed** | Sharply split audiences (e.g., internal vs partner) |

**Site settings (`.powerpages-site/site-settings/`):**

For each provider, you should see an enable setting plus its provider-specific tuple of settings. For example, Entra External ID generates settings like:

> **Reference only: your output may differ.** The code shown below illustrates what the plugin *typically* generates. The plugin adapts its output to your exact project (variable names, helper structure, comment style, error-handling shape), so your files may look different in small ways. Use these samples to understand the **concept** and the **why** behind each piece. Do not rewrite your generated files to match line-for-line. If something in your generated code looks meaningfully different, ask your AI coding CLI to explain the choice before changing anything.

```yaml
name: Authentication/OpenIdConnect/EntraExternalId/Authority
value: "https://<tenant>.ciamlogin.com/<tenant-id>/v2.0/"
```

```yaml
name: Authentication/OpenIdConnect/EntraExternalId/ClientId
value: "<application-client-id>"
```

```yaml
name: Authentication/Registration/Enabled
value: "true"  # open self-service registration; "false" = invitation-only
```

> **Note:** The plugin computes redirect URIs from your activated site URL. If you re-activate the site to a different subdomain later, re-run `/setup-auth` so the URIs in the IdP and the site settings stay consistent.

### Step 5.4: enable optional features

When you run `/setup-auth`, the plugin asks whether to turn on these optional features. Pick the ones that fit the audience. You can always re-run the skill later to add them.

| Feature | What it generates | When to turn it on |
|---|---|---|
| **Terms and conditions** | A `/terms` SPA page, a site setting that requires acceptance before sign-in completes, and matching content snippets | Public / regulated sites: gates sign-in behind explicit acceptance |
| **User profile page** | A `/user-profile` SPA page where signed-in users edit their Contact record via the Web API | Any site where users have a long-lived profile (most sites) |
| **Federated sign-out** | Configures the site to also sign the user out at the IdP when they sign out of the site | Shared-device, kiosk, or regulated scenarios |

### Step 5.5: add a second provider later

Adding a second identity provider doesn't require starting over. Re-run `/setup-auth` against an existing site and the plugin detects what's already configured, then offers to **add** a new provider without overwriting the others:

```
/setup-auth

The site currently uses Microsoft Entra External ID. Add Google as
a secondary provider so external suppliers can also sign in with
their Google work account. Use the primary spotlight layout with
Entra External ID as the spotlighted choice.
```

The plugin walks you through the Google app registration, adds the new site settings, and regenerates the `/login` page in the layout you picked, without touching the existing Entra External ID configuration.

### Step 5.6: deploy and verify

Redeploy the site so the new auth code, site settings, and (if applicable) `/login` page reach the live URL:

```
/deploy-site
```

Then in an incognito window:

- [ ] Open the deployed site URL: you see the sign-in entry point your layout dictates
- [ ] Sign in with each configured provider in turn; each one redirects back successfully and lands you signed in
- [ ] Open DevTools Console: the keepalive hook should fire periodically, no `401` or `Token expired` errors
- [ ] Open a page wrapped in `RequireRole("Authenticated Users")` while signed out: you are redirected to sign in instead of seeing the page
- [ ] If you enabled the user profile feature, open `/user-profile`, change a field, and confirm the Contact record updates in Dataverse
- [ ] If you enabled federated sign-out, click sign-out and confirm a follow-up navigation to the IdP also signs you out there

If any provider's redirect fails, the most common cause is a mismatch between the **Redirect URI** registered in the IdP and the value the plugin wrote into site settings. Re-run `/setup-auth`. The plugin will re-validate both sides.

---

## Verification

You have completed this lab when:

- [ ] `cr_invoice` table exists in make.powerapps.com with all 9 columns
- [ ] 10 sample invoice records are visible in the Dataverse table view
- [ ] Each invoice record has Submitted By and Supplier Company lookups populated
- [ ] `.powerpages-site/site-settings/` contains enable and fields settings for cr_invoice, contact, and account
- [ ] `.powerpages-site/table-permissions/` contains permission files with correct scopes
- [ ] `.powerpages-site/web-roles/` contains the Authenticated Users role
- [ ] Site is deployed with the latest changes
- [ ] Signed-in user sees only their own invoices on the Invoice List page (Contact-scoped)
- [ ] DevTools Network tab shows `/_api/cr_invoices` requests returning 200 OK while using the app
- [ ] DevTools Console stays clean (no red errors) while navigating the app
- [ ] `/setup-auth` ran successfully and produced the auth service, `hasRole` / `RequireAuth` / `RequireRole` utilities, the session keepalive hook, and (if you configured more than one provider) a `/login` page
- [ ] Site settings for each configured identity provider exist under `.powerpages-site/site-settings/` (provider authority, client ID, claims mapping, registration mode)
- [ ] You can sign in to the deployed site with each configured provider in an incognito window
- [ ] Optional: run `/audit-permissions` and review the HTML report it generates. It cross-checks your YAML against the deployed site and flags any over- or under-permissive grants. A complete end-to-end security review (code + dependencies + headers + WAF + permissions + deployed-site scan) is the focus of [Lab 09: Run a security review](../integrate/09-security-review.md) after the integration phase

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `/setup-datamodel` fails with 403 | You need System Administrator or System Customizer role on the Dataverse environment. Contact your admin. |
| Publisher prefix is unexpected (e.g., `new_` instead of `cr_`) | The prefix comes from your environment's Default Solution publisher. Check in make.powerapps.com > Solutions > Default Solution > Publisher. The prefix works fine. Just note it for API calls. |
| `/_api/cr_invoices` returns 403 Forbidden | All three layers must be configured: (1) site setting `Webapi/cr_invoice/enabled = true`, (2) web role exists, (3) table permission linked to role. Redeploy after fixing. |
| `/_api/cr_invoices` returns empty `{"value":[]}` | Data exists but permissions do not match. Check: Is the scope Contact? Does the logged-in user's Contact record match the `cr_submittedby` on the invoices? |
| Specific field returns 400 error | The field is not in the allowed list. Add it to `Webapi/cr_invoice/fields` in the site setting YAML. Remember lookup fields need the `_` prefix and `_value` suffix. |
| `pac pages upload-code-site` fails | Run `pac auth list` to verify auth is active. Try `pac org who` to confirm the right environment. Re-authenticate if needed. |
| Sign-in redirects to the IdP but errors back with "redirect URI mismatch" | The IdP app registration's redirect URI differs from what the plugin wrote into site settings. Re-run `/setup-auth`. The plugin will recompute the redirect URI from the activated site URL and validate both sides. |
| SPA silently logs the user out mid-session | The session keepalive hook isn't wired up. Confirm the auth service generated by `/setup-auth` is imported and called in the app shell; re-run the skill if the hook is missing. |
| `RequireRole("X")` always returns false even when the user is in role X | Web role name in code doesn't match the role's exact name in `.powerpages-site/web-roles/` (case-sensitive). Confirm spelling. |

### Generic debug prompt

If any of `/setup-datamodel`, `/add-sample-data`, `/setup-auth`, or `/audit-permissions` fails partway, paste the output back to your AI coding CLI:

```
I ran the skill below and it failed with this output. Diagnose the
root cause and propose a fix before applying anything.

Skill: /<skill-name>
Output:
[paste full terminal output and any DevTools Console or Network
errors if the failure surfaced in the browser]
```

## Fallback

If Dataverse table creation fails via API, create the table manually:

1. Go to make.powerapps.com > Tables > New table
2. Name it "Invoice" (the system will add your publisher prefix)
3. Add each column manually with the types from the data model above
4. Proceed to sample data insertion

---

## Key takeaways

- Reuse standard Dataverse tables (Account, Contact) instead of creating custom ones when possible. Power Pages auth is tied to Contact
- The three-layer security model (Site Settings + Web Roles + Table Permissions) must all be configured for the Web API to work
- Contact-scoped permissions ensure data isolation: each supplier sees only their own invoices
- Always list API fields explicitly: never use `*`
- Lookup fields have different names in API responses: `cr_submittedby` becomes `_cr_submittedby_value`
- Dependency order matters for data insertion: parent records (Account) before child records (Contact, Invoice)
- `/setup-auth` configures the identity layer end-to-end: it walks the IdP admin center, validates redirect URIs, generates the auth service + role helpers (`hasRole`, `RequireAuth`, `RequireRole`), and writes provider-specific site settings under `.powerpages-site/site-settings/`
- Re-running `/setup-auth` lets you add a new identity provider without overwriting existing ones: start with one provider, add others incrementally
- Client-side authorization (`RequireAuth`, `RequireRole`, `hasRole`) is for UX only; server-side table permissions are what actually enforce access

## Next step

→ [Lab 03: Connect the SPA to live Dataverse data](./03-web-api-integration.md)

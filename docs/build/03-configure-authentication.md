---
sidebar_position: 3
sidebar_label: "Lab 03: Configure authentication"
title: "Lab 03: Configure authentication"
---

# Lab 03: Configure authentication

## Goal

Configure real authentication for the supplier portal with `/setup-auth`: a deliberate identity-provider mix, role-based UI helpers, claims mapping, and a sign-in page that fits the audience.

**Estimated time:** about 30-45 minutes.

## State you carry forward

- Completed [Lab 02: Set up Dataverse and security](./02-dataverse-and-security.md) (Dataverse invoice model, sample data linked to your Contact, server-enforced table permissions, deployed site reading scoped live data)
- Working portal deployed (`.powerpages-site/` folder exists, deploy succeeded at least once)
- `/setup-auth` available in your AI coding CLI session
- Active PAC CLI and Azure CLI sessions (`pac auth list`, `az account show`). If your Microsoft account has no Azure subscription, sign in once with `az login --allow-no-subscriptions`; the plugin only needs Microsoft Entra ID-scoped tokens.

So far the deployed site is open: anyone with the URL can browse it, and Lab 02 relied on the **default Microsoft Entra ID identity provider** that every activated site gets. That default is fine for "sign in once so my Contact exists", but real sites need a deliberate provider mix, role-based UI, claims mapping, and a sign-in page that fits the audience. `/setup-auth` handles all of that, including the legwork in the identity provider's admin center.

> **Required before Lab 04.** This lab produces the auth service and role helpers (`hasRole`, `RequireAuth`, `RequireRole`) and the session keepalive hook that the later labs assume are present. Complete it before [Lab 04: Connect the SPA to live Dataverse data](./04-web-api-integration.md).

> **Important:** Server-side table permissions (configured in Lab 02) are what actually protect your data. The client-side helpers `/setup-auth` generates (`hasRole`, `RequireAuth`, `RequireRole`) only control what the UI *shows*. Keep both layers in mind: server-side enforces access, client-side improves UX.

> **Further reading:** [Overview of authentication in Power Pages](https://learn.microsoft.com/power-pages/security/authentication/) · [Configure authentication for a Power Pages site](https://learn.microsoft.com/power-pages/security/authentication/configure-site)

## Learning objectives

By the end of this lab you will be able to:

1. Choose an appropriate identity-provider mix for your audience with `/setup-auth`
2. Map identity-provider claims to Dataverse Contact columns
3. Generate role-based UI helpers (`hasRole`, `RequireAuth`, `RequireRole`) and a session keepalive hook
4. Add a sign-in page and verify sign-in across one or more providers

---

## Part 1: choose and configure the provider mix

### Step 1.1: pick the right provider mix

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

### Step 1.2: run `/setup-auth`

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

---

## Part 2: review and extend

### Step 2.1: review the generated artifacts

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

### Step 2.2: enable optional features

When you run `/setup-auth`, the plugin asks whether to turn on these optional features. Pick the ones that fit the audience. You can always re-run the skill later to add them.

| Feature | What it generates | When to turn it on |
|---|---|---|
| **Terms and conditions** | A `/terms` SPA page, a site setting that requires acceptance before sign-in completes, and matching content snippets | Public / regulated sites: gates sign-in behind explicit acceptance |
| **User profile page** | A `/user-profile` SPA page where signed-in users edit their Contact record via the Web API | Any site where users have a long-lived profile (most sites) |
| **Federated sign-out** | Configures the site to also sign the user out at the IdP when they sign out of the site | Shared-device, kiosk, or regulated scenarios |

### Step 2.3: add a second provider later

Adding a second identity provider doesn't require starting over. Re-run `/setup-auth` against an existing site and the plugin detects what's already configured, then offers to **add** a new provider without overwriting the others:

```
/setup-auth

The site currently uses Microsoft Entra External ID. Add Google as
a secondary provider so external suppliers can also sign in with
their Google work account. Use the primary spotlight layout with
Entra External ID as the spotlighted choice.
```

The plugin walks you through the Google app registration, adds the new site settings, and regenerates the `/login` page in the layout you picked, without touching the existing Entra External ID configuration.

---

## Part 3: deploy and verify

Redeploy the site so the new auth code, site settings, and (if applicable) `/login` page reach the live URL:

```
/deploy-site
```

If any provider's redirect fails after deploying, the most common cause is a mismatch between the **Redirect URI** registered in the IdP and the value the plugin wrote into site settings. Re-run `/setup-auth`. The plugin will re-validate both sides.

## Verification

You have completed this lab when, in an incognito window:

- [ ] Opening the deployed site URL shows the sign-in entry point your layout dictates
- [ ] Signing in with each configured provider in turn redirects back successfully and lands you signed in
- [ ] DevTools Console shows the keepalive hook firing periodically, with no `401` or `Token expired` errors
- [ ] A page wrapped in `RequireRole("Authenticated Users")` redirects you to sign in while signed out, instead of showing the page
- [ ] `/setup-auth` produced the auth service, `hasRole` / `RequireAuth` / `RequireRole` utilities, the session keepalive hook, and (if you configured more than one provider) a `/login` page
- [ ] Site settings for each configured provider exist under `.powerpages-site/site-settings/` (provider authority, client ID, claims mapping, registration mode)
- [ ] If you enabled the user profile feature, editing a field on `/user-profile` updates the Contact record in Dataverse
- [ ] If you enabled federated sign-out, signing out also signs you out at the IdP

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Sign-in redirects to the IdP but errors back with "redirect URI mismatch" | The IdP app registration's redirect URI differs from what the plugin wrote into site settings. Re-run `/setup-auth`. The plugin recomputes the redirect URI from the activated site URL and validates both sides. |
| SPA silently logs the user out mid-session | The session keepalive hook isn't wired up. Confirm the auth service generated by `/setup-auth` is imported and called in the app shell; re-run the skill if the hook is missing. |
| `RequireRole("X")` always returns false even when the user is in role X | The web role name in code doesn't match the role's exact name in `.powerpages-site/web-roles/` (case-sensitive). Confirm spelling. |

### Generic debug prompt

If `/setup-auth` fails partway, paste the output back to your AI coding CLI:

```
I ran /setup-auth and it failed with this output. Diagnose the root
cause and propose a fix before applying anything.

Output:
[paste full terminal output and any DevTools Console or Network
errors if the failure surfaced in the browser]
```

## Fallback

If `/setup-auth` cannot complete the IdP admin-center steps in your environment, configure the provider manually in the Power Pages management experience, then re-run `/setup-auth` so it captures the values into site settings and generates the matching client code. The four branching workflows still depend on the auth service and role helpers, so do not skip generating those.

## Key takeaways

- `/setup-auth` configures the identity layer end-to-end: it walks the IdP admin center, validates redirect URIs, generates the auth service + role helpers (`hasRole`, `RequireAuth`, `RequireRole`), and writes provider-specific site settings under `.powerpages-site/site-settings/`
- Re-running `/setup-auth` lets you add a new identity provider without overwriting existing ones: start with one provider, add others incrementally
- Client-side authorization (`RequireAuth`, `RequireRole`, `hasRole`) is for UX only; server-side table permissions (Lab 02) are what actually enforce access
- The session keepalive hook is the fix for the common SPA-on-Power-Pages gotcha where sessions silently expire mid-use

## Next step

→ [Lab 04: Connect the SPA to live Dataverse data](./04-web-api-integration.md): replace the remaining mock data with a typed Web API service layer and live CRUD.

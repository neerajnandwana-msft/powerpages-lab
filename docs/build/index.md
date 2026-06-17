---
sidebar_position: -1
sidebar_label: "Build overview"
title: "Build phase overview"
slug: /build
---

import Link from '@docusaurus/Link';
import { CheckCircle2, Database, Hammer, PlayCircle } from 'lucide-react';

# Build phase overview

<section className="phaseRootHero">
  <Hammer className="phaseRootHero__icon" aria-hidden="true" />
  <div>
    <p className="landingEyebrow">Phase 1</p>
    <h2>Scaffold the site and connect it to Dataverse</h2>
    <p>
      Start from a clean environment, generate the Supplier Invoice Submission Portal, create the Dataverse foundation, and replace mock data with live Power Pages Web API calls.
    </p>
  </div>
</section>

## What you will do

The Build phase turns an empty environment into a working, secured portal foundation. By the end, you have a deployed SPA, a Dataverse model, Contact-scoped permissions, authentication helpers, and live Web API data ready for the Integrate phase.

<div className="rootCardGrid">
  <div className="rootCard">
    <Hammer className="rootCard__icon" aria-hidden="true" />
    <h3>Scaffold the SPA</h3>
    <p>Create the React + TypeScript portal shell and run it locally with mock invoice data.</p>
  </div>
  <div className="rootCard">
    <Database className="rootCard__icon" aria-hidden="true" />
    <h3>Create the data foundation</h3>
    <p>Set up Dataverse tables, sample records, contacts, web roles, and table permissions.</p>
  </div>
  <div className="rootCard">
    <CheckCircle2 className="rootCard__icon" aria-hidden="true" />
    <h3>Use live data</h3>
    <p>Generate a typed service layer, handle CSRF, and validate end-to-end CRUD on the deployed site.</p>
  </div>
</div>

## Labs in this phase

| # | Lab | Outcome |
|---|---|---|
| Setup | [Build phase setup](/build/00-setup) | Tools installed and authenticated for Labs 01-04 |
| 01 | [Scaffold a Power Pages SPA](/build/01-scaffold-spa-portal) | A working React SPA running locally with mock data |
| 02 | [Set up Dataverse and security](/build/02-dataverse-and-security) | Real Dataverse tables, sample data, and security layers |
| 03 | [Configure authentication](/build/03-configure-authentication) | Deliberate identity-provider mix, role-based UI, claims mapping |
| 04 | [Connect the SPA to live Dataverse data](/build/04-web-api-integration) | Typed Web API service layer and live CRUD |

## State you hand off

By the end of the Build phase, keep these artifacts in place: the deployed Power Pages SPA site, `.powerpages-site/` metadata, Dataverse invoice model, sample data linked to your Contact, table permissions, and typed Web API service layer. The Integrate phase builds on that state.

**Done when:** you sign in to the deployed site and the Invoice List shows only the invoices linked to your Contact, loaded live from Dataverse instead of mock data.

**Next two stops:** complete [Build phase setup](/build/00-setup), then scaffold the portal in [Lab 01](/build/01-scaffold-spa-portal). Do not skip the setup checks: they prevent the most common deployment and authentication failures.

<div className="nextStepCallout">
  <h3>Start the Build phase</h3>
  <p>Begin with <Link to="/build/00-setup">Build phase setup</Link>. After setup passes, continue to Lab 01.</p>
  <p><Link className="button button--primary" to="/build/00-setup"><PlayCircle size={18} aria-hidden="true" /> Start setup</Link></p>
</div>

---
sidebar_position: -1
sidebar_label: "Integrate overview"
title: "Integrate phase overview"
slug: /integrate
---

import Link from '@docusaurus/Link';
import { Bot, PlayCircle, ShieldCheck, Workflow, Zap } from 'lucide-react';

# Integrate phase overview

<section className="phaseRootHero">
  <Workflow className="phaseRootHero__icon" aria-hidden="true" />
  <div>
    <p className="landingEyebrow">Phase 2</p>
    <h2>Add backend logic, automation, AI, and release readiness</h2>
    <p>
      Extend the live portal with server-side validation, Power Automate integration, AI-assisted experiences, performance checks, and a release-readiness security review.
    </p>
  </div>
</section>

## What you will do

<div className="rootCardGrid">
  <div className="rootCard">
    <Workflow className="rootCard__icon" aria-hidden="true" />
    <h3>Choose the right backend pattern</h3>
    <p>Use `/integrate-backend` to decide when a feature needs Web API, server logic, a cloud flow, or an AI API.</p>
  </div>
  <div className="rootCard">
    <Zap className="rootCard__icon" aria-hidden="true" />
    <h3>Add automation</h3>
    <p>Connect server logic and Power Automate flows to handle work that should not run only in the browser.</p>
  </div>
  <div className="rootCard">
    <Bot className="rootCard__icon" aria-hidden="true" />
    <h3>Add AI experiences</h3>
    <p>Bring grounded summaries and search-style answers into the portal experience.</p>
  </div>
  <div className="rootCard">
    <ShieldCheck className="rootCard__icon" aria-hidden="true" />
    <h3>Prepare for release</h3>
    <p>Improve performance, test the deployed site, and run the security review before the ALM phase.</p>
  </div>
</div>

## Labs in this phase

| # | Lab | Outcome |
|---|---|---|
| Setup | [Integrate phase setup](/integrate/00-setup) | Confirmation that Build-phase tools carry forward, plus optional static analysis setup |
| 04 | [Plan the service layer](/integrate/04-pick-backend-pattern) | Backend pattern decision matrix |
| 05 | [Add server logic](/integrate/05-add-server-logic) | Server-side validation and execution |
| 06 | [Add Power Automate flows](/integrate/06-add-power-automate-flows) | Teams notification on invoice submit |
| 07 | [Add generative AI APIs](/integrate/07-add-ai-apis) | AI summary and grounded answer features |
| 08 | [Improve performance, test, and deploy](/integrate/08-performance-test-deploy) | Release-ready deployed integration site |
| 09 | [Run a security review](/integrate/09-security-review) | Consolidated security findings and fixes |

## State you hand off

By the end of the Integrate phase, your portal has live data, server logic, cloud flow integration, AI features, performance improvements, test coverage, and a release-readiness security review. The ALM phase packages and promotes this state.

<div className="nextStepCallout">
  <h3>Start the Integrate phase</h3>
  <p>Begin with <Link to="/integrate/00-setup">Integrate phase setup</Link>. It confirms your tools and points you to Lab 04.</p>
  <p><Link className="button button--primary" to="/integrate/00-setup"><PlayCircle size={18} aria-hidden="true" /> Start setup</Link></p>
</div>

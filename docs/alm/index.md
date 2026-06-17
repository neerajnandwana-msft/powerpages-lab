---
sidebar_position: -1
sidebar_label: "ALM overview"
title: "ALM phase overview"
slug: /alm
---

import Link from '@docusaurus/Link';
import { GitBranch, PackageCheck, PlayCircle, Rocket, ShieldCheck } from 'lucide-react';

# ALM phase overview

<section className="phaseRootHero">
  <Rocket className="phaseRootHero__icon" aria-hidden="true" />
  <div>
    <p className="landingEyebrow">Phase 3</p>
    <h2>Move from local work to governed promotion</h2>
    <p>
      Put the completed portal under source control, package the Power Pages and Dataverse assets into a solution, and promote managed releases through Power Platform Pipelines.
    </p>
  </div>
</section>

## What you will do

<div className="rootCardGrid">
  <div className="rootCard">
    <GitBranch className="rootCard__icon" aria-hidden="true" />
    <h3>Adopt source control</h3>
    <p>Create a GitHub repo, protect the main branch, and establish the pull request workflow.</p>
  </div>
  <div className="rootCard">
    <PackageCheck className="rootCard__icon" aria-hidden="true" />
    <h3>Package the solution</h3>
    <p>Track the Power Pages site, Dataverse components, and environment-specific settings as a deployable solution.</p>
  </div>
  <div className="rootCard">
    <ShieldCheck className="rootCard__icon" aria-hidden="true" />
    <h3>Define team workflow</h3>
    <p>Use trunk-based development, feature branches, rollback branches, and hotfix paths intentionally.</p>
  </div>
  <div className="rootCard">
    <Rocket className="rootCard__icon" aria-hidden="true" />
    <h3>Promote across environments</h3>
    <p>Use Power Platform Pipelines to move managed solution releases from integration to pre-prod and prod.</p>
  </div>
</div>

## Labs in this phase

| # | Lab | Outcome |
|---|---|---|
| Setup | [ALM phase setup](/alm/00-setup) | GitHub CLI installed and authenticated |
| 10 | [Put the site under source control](/alm/10-source-control) | GitHub repo with branch protection |
| 11 | [Package the solution and dependencies](/alm/11-solution-and-dependencies) | Solution source tree and environment-variable wiring |
| 12 | [Adopt branching and developer workflows](/alm/12-branching-and-workflows) | Team branching and release workflow |
| 13 | [Promote across environments](/alm/13-multi-env-promotion) | Pipeline promotion from integration to pre-prod and prod |

## State you hand off

By the end of the ALM phase, your portal is source-controlled, packaged as a solution, and ready to promote through governed environments. Use [After the lab](/reference/after-the-lab) to turn the lab result into a team runbook.

**Done when:** a change made on a feature branch flows through a pull request into `main`, then promotes through the pipeline from integration to pre-prod to prod with a manual approval gate.

<div className="nextStepCallout">
  <h3>Start the ALM phase</h3>
  <p>Begin with <Link to="/alm/00-setup">ALM phase setup</Link>. It adds GitHub CLI, then moves you into Lab 10.</p>
  <p><Link className="button button--primary" to="/alm/00-setup"><PlayCircle size={18} aria-hidden="true" /> Start setup</Link></p>
</div>

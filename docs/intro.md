---
sidebar_position: 0
sidebar_label: "Lab guides"
title: "Power Pages lab guides"
slug: /
---

import { Hammer, Rocket } from 'lucide-react';

# Power Pages lab guides

<section className="landingHero">
  <p className="landingEyebrow">Self-paced Power Pages labs</p>
  <h2>Choose the guide that matches your starting point</h2>
  <p>
    Start from scratch with AI-assisted site authoring, or set up a manual ALM path for an existing Power Pages site. Both guides are hands-on and designed for repeatable team practice.
  </p>
  <div className="landingActions">
    <a className="button button--primary button--lg" href="#choose-a-lab-guide">Choose a guide</a>
    <a className="button button--secondary button--lg" href="agentic-site-authoring">Go to site authoring</a>
  </div>
</section>

---

## Choose a lab guide

<div className="guideGrid">
  <a className="guideCard guideCard--primary" href="agentic-site-authoring">
    <Hammer className="guideCard__icon" aria-hidden="true" />
    <span className="guideCard__label">Build from scratch</span>
    <h3>Agentic Site Authoring Lab guide</h3>
    <p>
      Create a Power Pages SPA site with AI-assisted development, connect it to Dataverse, add integrations, review security, and promote it through ALM.
    </p>
    <ul>
      <li>Best when you are starting with a blank site.</li>
      <li>Uses Claude Code or GitHub Copilot CLI with the Power Pages plugin.</li>
      <li>Runs 14 cumulative labs across Build, Integrate, and ALM phases.</li>
    </ul>
    <span className="guideCard__cta">Start the site-authoring guide</span>
  </a>
  <a className="guideCard" href="reliable-alm">
    <Rocket className="guideCard__icon" aria-hidden="true" />
    <span className="guideCard__label">Set up ALM for an existing site</span>
    <h3>Setup reliable ALM Lab</h3>
    <p>
      Set up a manual inner and outer development loop for source control, native Git integration, branching, quality gates, CI/CD, and Power Platform Pipelines.
    </p>
    <ul>
      <li>Best when your Power Pages site already exists.</li>
      <li>Uses manual Power Platform and DevOps workflows, not agentic authoring.</li>
      <li>Covers team collaboration and governed promotion to test and production.</li>
    </ul>
    <span className="guideCard__cta">Start the reliable ALM guide</span>
  </a>
</div>

---

## Useful references

- [Setup Guide](setup-guide): cross-phase overview for the site-authoring guide
- [Prompt Cheat Sheet](reference/prompt-cheat-sheet): prompting patterns and AI coding CLI commands
- [AI Coding CLI Orientation](reference/ai-coding-cli-orientation): Claude Code and GitHub Copilot CLI basics
- [After the lab](reference/after-the-lab): production hardening, operating cadence, cost considerations, and continued-learning resources

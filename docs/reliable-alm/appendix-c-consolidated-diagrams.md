---
sidebar_position: 11
sidebar_label: "Appendix C: Consolidated diagrams"
title: "Appendix C: Consolidated ALM diagrams"
className: powerPlatformGuide
---

# Appendix C: Consolidated ALM diagrams

The labs place focused diagram panels beside the steps they explain. Use the consolidated diagrams on this page when you want to review how the loops connect or inspect either loop in one view.

Select any diagram to open the full-size SVG.

## Inner and outer loops

[![Overview diagram showing the inner loop of authoring, previewing, validating, and committing meeting the governed outer loop at the pull request.](/img/reliable-alm/power-pages-alm-1-overview-animated-light.svg)](/img/reliable-alm/power-pages-alm-1-overview-animated-light.svg)

*The two loops meet at the pull request. Developers repeat the inner loop locally, while the shared outer loop validates, releases, and promotes the change.*

## Inner loop

[![Consolidated inner-loop diagram showing the shared integration baseline, one branch and isolated development environment per developer, the daily author-preview-validate-commit cycle, and the environment guardrails.](/img/reliable-alm/power-pages-alm-2-inner-loop-animated-light.svg)](/img/reliable-alm/power-pages-alm-2-inner-loop-animated-light.svg)

*The complete inner loop: seed the baseline, fan out to isolated developer environments, repeat the personal development cycle, and apply the environment guardrails.*

## Outer loop

[![Consolidated outer-loop diagram showing the branching strategy, GitHub Actions validation and build workflows, and one release artifact promoted through test and production.](/img/reliable-alm/power-pages-alm-3-outer-loop-animated-light.svg)](/img/reliable-alm/power-pages-alm-3-outer-loop-animated-light.svg)

*The complete outer loop: enforce the branch rules, run the shared workflows, build once from a tag, and promote the same release artifact.*

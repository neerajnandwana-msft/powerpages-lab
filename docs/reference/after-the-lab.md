---
sidebar_position: 3
sidebar_label: "After the lab"
title: "After the lab"
---

# After the lab

You finished the guided track. Use this page to turn the lab result into a repeatable team practice.

---

## Apply the pattern in your org

1. **Ask your Power Platform admin to confirm the pipeline setup.** Lab 14 shows the Power Platform Pipelines flow. Your org still needs the right host environment, target environments, security roles, and approval process.
2. **Use the focused manual ALM guide for rollout.** If your team already has a Power Pages site and wants manual source-control setup, quality gates, CI/CD, and Power Platform Pipelines, follow [Setup reliable ALM Lab](/reliable-alm).
3. **Add a second feature end to end.** Pick something your team actually needs. Branch, build, open a PR, merge to integration, promote to pre-prod, and approve promotion to prod.
4. **Document your team workflow.** Capture your branch naming, review expectations, rollback path, and promotion cadence in your own `CONTRIBUTING.md` or runbook.
5. **Add ownership metadata.** Use `.github/CODEOWNERS` or your repo's equivalent review rules so solution files, site code, and docs route to the right reviewers.

---

## Production hardening

Use the lab output as a starting point, not as a final production runbook.

- **Promote to prod through Pipelines or an approved release path.** Avoid direct laptop-to-prod deployments unless your team has explicitly approved that break-glass path.
- **Use the least-privileged deployment identity your org supports.** Lab 14 calls out the roles used during the demo. For production, confirm the exact role assignment with your Power Platform admin.
- **Keep solution imports repeatable.** If a deployment fails partway, fix the root cause and re-run the managed-solution promotion rather than manually patching the target environment.
- **Run a release-readiness security review before production promotion.** Include code, dependencies, deployed-site checks, headers, firewall posture, table permissions, and auth configuration.
- **Schedule deployed-site security scanning against production.** A monthly scan helps catch runtime and security drift between releases.

---

## Operating cadence

| Cadence | Action |
|---|---|
| Every PR | Review code and solution changes. Run the checks your repo supports. |
| Every release candidate | Deploy to integration, run release-readiness security checks, and promote to pre-prod. |
| Before prod | Confirm approvals, environment-variable values, site activation, and smoke-test results. |
| Monthly | Run `/scan-site` against production and review any new findings. |
| Quarterly | Review environment strategy, pipeline ownership, licensing, capacity, and runbooks. |

---

## Cost and licensing considerations

Confirm licensing and capacity with your Power Platform admin before you use the lab pattern for a real production workload.

- **Power Platform Pipelines:** Pipelines can use Managed Environments for target environments. Microsoft Learn notes that licenses granting premium use rights are required for Managed Environments.
- **Power Pages and Dataverse:** Production use can involve Power Pages capacity, Dataverse storage, and environment capacity. The exact requirement depends on your tenant, environments, and user model.
- **Additional environments:** Integration, pre-prod, and prod environments can consume tenant capacity. Keep only the environments your release process needs.

For the current licensing detail, see [Power Platform licensing](https://learn.microsoft.com/power-platform/admin/pricing-billing-skus).

---

## Official resources

- [Power Pages documentation](https://learn.microsoft.com/power-pages)
- [Create and deploy a single-page application in Power Pages](https://learn.microsoft.com/power-pages/configure/create-code-sites)
- [Power Platform ALM basics](https://learn.microsoft.com/power-platform/alm/basics-alm)
- [Power Platform Pipelines](https://learn.microsoft.com/power-platform/alm/pipelines)
- [Power Pages and Power Platform Pipelines](https://learn.microsoft.com/power-pages/configure/power-pages-pipelines)
- [Power Platform CLI `solution` reference](https://learn.microsoft.com/power-platform/developer/cli/reference/solution)
- [Power Platform CLI `pages` reference](https://learn.microsoft.com/power-platform/developer/cli/reference/pages)
- [Environment variables for site settings](https://learn.microsoft.com/power-pages/configure/environment-variables-for-site-settings)

---

## Community and continued learning

- [Power Pages Community Forum](https://powerusers.microsoft.com/t5/Power-Pages-Community/ct-p/PowerPagesCommunity)
- [Power Pages Ideas portal](https://ideas.powerpages.microsoft.com/)
- [Power Apps and Power Platform GitHub samples](https://github.com/microsoft/PowerApps-Samples)

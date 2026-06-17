---
sidebar_position: 7
sidebar_label: "Lab 07: Promote and operate"
title: "Lab 07: Promote and operate"
className: powerPlatformGuide
---

# Lab 07: Promote and operate

## Goal

Run the outer dev loop end to end: promote to test, validate, promote to production, and define the operating cadence.

**Estimated time:** about 45-60 minutes.

## State you carry forward

- Completed [Lab 06: Set up CI/CD and Pipelines](06-set-up-ci-cd-and-pipelines.md).
- Managed artifact exists.
- Pipeline stages or manual import path is ready.
- Environment values are ready.

## Step 1: deploy to test

Use Power Platform Pipelines or a managed solution import.

During deployment:

- Use the managed artifact.
- Supply environment-variable values.
- Bind connection references.
- Record version and deployment notes.

## Step 2: activate or bind the target site

When a Power Pages site is first deployed to a destination environment, it must be reactivated.

In the target environment:

1. Open Power Pages.
2. Go to **Inactive sites**.
3. Select the imported site.
4. Select **Reactivate**.
5. Choose the web address.
6. Confirm the site opens.

If you are updating an existing target site, bind the imported website record to the existing site record, then restart the site.

## Step 3: clear cache

Clear cache after deployment or environment-variable changes:

- Select **Sync** in design studio.
- Browse to `/_services/about` as an administrator and select **Clear cache**.
- Restart the portal from Power Platform admin center.

## Step 4: validate test

Run a smoke test:

- Public pages load.
- Sign-in uses target identity settings.
- Key journeys work.
- Web roles and table permissions behave correctly.
- Flows and integrations use target connections.
- No development URLs or client IDs appear.

## Step 5: promote to production

Before production:

1. Confirm approval evidence.
2. Confirm production environment values.
3. Confirm secrets and connections.
4. Promote the same managed artifact.
5. Activate or bind the production site.
6. Clear cache.
7. Run production smoke validation.

## Step 6: define recovery

| Failure | Recovery |
|---|---|
| Missing dependency | Add it to the source solution, rebuild, and redeploy |
| Wrong environment value | Correct the value, clear cache, and validate |
| Target site inactive | Reactivate or bind the site |
| Production has unmanaged edits | Remove the active layer or move the change through source |
| Bad release | Redeploy a prior artifact or ship a hotfix through the same gates |

## Step 7: define the operating cadence

| Cadence | Action |
|---|---|
| Every pull request | Run validation and review evidence |
| Every release candidate | Deploy to test and validate |
| Before production | Confirm approvals, values, secrets, and rollback plan |
| After production | Record version, artifact, URL, and validation result |
| Monthly | Review unmanaged layers, pipeline runs, stale values, and environment access |

## Checkpoint

You have completed this lab when:

- [ ] Test deployment succeeds.
- [ ] Target site is activated or bound.
- [ ] Cache is cleared.
- [ ] Test validation passes.
- [ ] Production promotion path is complete or documented.
- [ ] Recovery and operating cadence are documented.

## Troubleshooting

| Problem | Fix |
|---|---|
| Imported site is not visible | Check inactive sites and enhanced data model site record |
| Target auth redirects to development | Correct target environment values and clear cache |
| Changes disappear after next import | Stop direct production edits; move changes through source and managed solution |
| Rollback is unclear | Use stored artifacts and release notes to redeploy the last known good version |

## Completion

You now have a reliable ALM setup for Power Pages: source-controlled development, protected collaboration, managed release artifacts, governed promotion, validation, and recovery.

Return to the [Setup reliable ALM overview](/reliable-alm) when you need to onboard another site or refresh the operating model.

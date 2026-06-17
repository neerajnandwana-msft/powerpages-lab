---
sidebar_position: 4
sidebar_label: "Lab 04: Quality and security"
title: "Lab 04: Configure quality and security gates"
className: powerPlatformGuide
---

# Lab 04: Configure quality and security gates

## Goal

Add the checks that keep broken, insecure, or unreviewed changes out of the shared branch.

**Estimated time:** about 45-60 minutes.

## State you carry forward

- Completed [Lab 03: Define branching and review strategy](03-branching-and-review-strategy.md).
- Branch and PR model is documented.

## Step 1: protect the shared branch

Configure branch policies or rulesets for the shared branch.

Require:

- Pull request before merge.
- Required reviewers.
- Successful validation build.
- No force pushes.
- No branch deletion.
- Optional signed commits, if your organization requires them.

## Step 2: add PR evidence

Create a short PR template:

```markdown
## Summary

## Components changed

## Environment values or connection references changed

## Validation evidence

## Screenshots or test notes

## Rollback or hotfix plan
```

## Step 3: run solution quality checks

Run Power Platform Checker on the unmanaged solution during PR validation or build validation.

Suggested policy:

| Finding | Gate |
|---|---|
| Critical | Block |
| High | Block unless risk is accepted by owner |
| Medium | Review and track |
| Low or info | Review as time allows |

Store checker reports with the build.

## Step 4: add source security checks

Add checks appropriate to your repo:

- Code scanning for JavaScript, TypeScript, C#, or other supported code.
- Secret scanning or push protection.
- Dependency scanning.
- Workflow or pipeline security review.
- Manual review for table permissions and web roles.

## Step 5: define release gates

The outer loop should not start until:

- PR is approved.
- Required checks pass.
- Solution checker result is acceptable.
- Environment values are documented.
- Release owner accepts any known risks.

## Checkpoint

You have completed this lab when:

- [ ] Shared branch is protected.
- [ ] PR template exists.
- [ ] Solution checker is part of validation.
- [ ] Security checks are enabled or assigned.
- [ ] Release gate criteria are documented.

## Troubleshooting

| Problem | Fix |
|---|---|
| Checks are slow | Keep fast checks on PRs and run deeper checks nightly |
| Solution checker has noisy findings | Tune threshold, but keep critical findings blocking |
| Secret appears in a PR | Remove it, rotate it, and document the incident |
| Reviewers bypass gates | Limit bypass permissions to break-glass owners |

## Next step

Continue to [Lab 05: Prepare release artifacts](05-prepare-release-artifacts.md).

---
sidebar_position: 0
sidebar_label: "ALM setup"
title: "ALM phase setup"
---

# ALM phase setup

You've finished the Integrate phase (through Lab 09). The ALM phase (Labs 10–13) adds source control, branching, and multi-environment promotion. Everything from the [Build phase setup](../build/00-setup.md) still applies. You don't reinstall anything. You only need to add **GitHub CLI** and have a **GitHub account** ready before [Lab 10: Put the site under source control](10-source-control.md).

For the staged, cross-phase view of what gets installed when, see the [Setup Guide overview](../setup-guide.md).

---

## GitHub CLI: `gh`

The `gh` command-line tool lets you create the GitHub repo and manage pull requests without leaving the terminal.

- **Download:** [https://cli.github.com/](https://cli.github.com/) (or `winget install GitHub.cli` on Windows, `brew install gh` on macOS)
- **Install:** Run the installer, restart your terminal
- **Verify:**

```bash
gh --version
```

**Expected output:** `gh version 2.x.x` or higher

**Authenticate:**

```bash
gh auth login
```

Choose **GitHub.com**, **HTTPS**, **Login with a web browser**, and complete the flow. After it finishes, verify:

```bash
gh auth status
```

**Expected output:** A line confirming you're logged in as your GitHub username.

> **Don't have a GitHub account?** Sign up at [https://github.com/signup](https://github.com/signup) before starting the ALM labs. A free personal account is sufficient for everything the labs cover.

---

## Verify ALM setup

```bash
gh --version            # Expect: gh version 2.x.x or higher
gh auth status          # Expect: logged in as <your-github-username>
```

---

## ALM-phase troubleshooting

| **Problem**                                     | **Solution**                                                                                                                                                                                                                                                                  |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `gh` is not recognized                          | Install GitHub CLI from https://cli.github.com/, restart terminal. On Windows you can also use `winget install GitHub.cli`; on macOS `brew install gh`.                                                                                                                       |
| `gh auth login` fails behind a corporate proxy  | Set `HTTPS_PROXY` and `HTTP_PROXY` environment variables before running `gh auth login`, or authenticate from a network without proxy interception.                                                                                                                           |
| No GitHub account                               | Sign up at https://github.com/signup. A free personal account is sufficient for the ALM labs.                                                                                                                                                                                 |

---

## What's next

→ [Lab 10: Put the site under source control](10-source-control.md)

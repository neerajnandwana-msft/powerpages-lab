---
sidebar_position: 2
sidebar_label: "AI Coding CLI Orientation"
title: "AI Coding CLI Orientation"
---

# AI Coding CLI Orientation

This lab track works with two AI coding CLIs: Claude Code and GitHub Copilot CLI. Both follow the same "describe → review → approve" workflow and both support the Power Pages plugin skills used throughout the labs. Read the orientation for the tool you installed — skip the other.

| You installed... | Read this section |
|---|---|
| **Claude Code** | "Claude Code CLI Orientation" below |
| **GitHub Copilot CLI** | "GitHub Copilot CLI Orientation" below |

Not sure which one you have? Run `claude --version` and `copilot --version` in your terminal — whichever returns a version number is the one you are set up with.

---

## Claude Code CLI orientation

### Launching Claude Code

Open your terminal and run:

```bash
claude
```

This starts an interactive Claude Code session. You will see a prompt where you can type natural language instructions or slash commands.

### Key slash commands

| Command | What It Does | When to Use |
|---------|-------------|-------------|
| `/help` | Shows available commands and installed plugin skills | When you forget a command name |
| `/status` | Shows current model, account, and environment info | When you want to confirm which model you are on |
| `/model` | Opens model picker to check or switch models | When you want to change models mid-session |
| `/context` | Shows live token-window usage with a category breakdown | When responses feel slow or you suspect context is full |
| `/compact` | Summarises the conversation to free context space (keeps key info) | Before continuing a long task |
| `/clear` | Starts a completely fresh conversation | When you want to start over on a task |
| `/plugin` | Opens plugin manager (Installed / Marketplaces / Discover) | To see or install Power Pages plugin skills |
| `/mcp` | Opens MCP server manager (status, connections, scope) | To verify which MCP servers are connected |

### Working with Claude Code

**Typing a prompt:** Describe what you want in natural language. Be specific about what you want, the tech stack, and any constraints.

**Approving actions:** Claude Code will propose actions (creating files, running commands). You review and approve each action before it executes. Always read what Claude proposes before approving.

**Reading output:** After Claude Code takes an action, it shows the result. Pay attention to:
- File paths created or modified
- Commands executed and their output
- Any errors or warnings

### Switching modes (permission modes)

Claude Code runs in one of several **permission modes** that control how actions are approved. Press **Shift+Tab** to cycle through them. The current mode appears in the status line.

| Mode | What It Does | When to Use |
|------|--------------|-------------|
| `default` | Asks you to approve each action before it runs | Safest — use when touching unfamiliar code |
| `acceptEdits` | Auto-approves file edits; still asks for shell commands | Iterating on edits you trust (refactors, renames) |
| `plan` | **Read-only investigation mode** — Claude explores the codebase and proposes a written plan without making any changes. You approve the plan before leaving plan mode to execute. | Before larger multi-step tasks or unfamiliar parts of the codebase |

> **Tip:** Start every multi-file task in plan mode. Claude will explore first, then present its strategy. You can redirect or approve before any file is touched.

### Models

**Check your current model:**

```
/status
```

Shows version, model, account, and connectivity. Handy for confirming which model you are talking to before a long task.

**Switch models:**

```
/model
```

Opens an interactive picker. You can also switch directly with `/model opus` or `/model sonnet`, or pin a specific version like `/model claude-opus-4-8[1m]`. The `[1m]` suffix selects the 1-million-token extended-context variant of that model — useful when a long lab session or a large codebase fills the standard window.

### Plugins and marketplace

Plugins add slash-command skills (like `/create-site`, `/deploy-site`) and custom agents to Claude Code.

**See installed plugins:**

```
/plugin
```

Opens a UI with four tabs: **Installed** (your plugins), **Discover** (available plugins in configured marketplaces), **Marketplaces** (catalogs), and **Errors** (load failures).

**Add a marketplace and install a plugin:** open the plugin manager with `/plugin` and use the **Marketplaces** tab to register a new source, then the **Discover** tab to install from it. If you already know the plugin identifier, you can install directly with:

```
/plugin install power-pages@power-platform
```

The format is `plugin-name@marketplace-name`.

> The labs rely on the Power Pages plugin. Run `/help` and confirm you see skills starting with `/create-site`, `/setup-datamodel`, etc. If not, see the [Setup Guide](../setup-guide.md) for plugin install steps.

### MCP servers

MCP (Model Context Protocol) servers extend Claude with tools for external systems — Dataverse, Kusto, GitHub, and so on.

**See configured MCP servers:**

```
/mcp
```

Shows each server's name, status (connected / failed / disabled), scope (user / project / local), and authentication state.

**Add an MCP server** (run in your shell, not inside Claude):

```bash
# Remote HTTP server
claude mcp add --transport http my-server https://example.com/mcp

# Local stdio server (package installed via npx)
claude mcp add --transport stdio my-server -- npx my-mcp-package
```

Add `--scope project` or `--scope user` to change the scope.

### Context management

**CLAUDE.md:** A file at your project root that gives Claude persistent context about your project (tech stack, design preferences, conventions). [Lab 01: Scaffold an SPA Portal](../build/01-scaffold-spa-portal.md) creates one as part of the scaffold.

**#file references:** Type `#file path/to/file` in your prompt to load a specific file into Claude's context. Useful when you want Claude to look at existing code before making changes.

**Check context usage:**

```
/context
```

Shows a live breakdown of token usage by category — system prompt, memory, files, MCP tools, skills — plus percentage of window used. Expect slower responses as the window fills; Claude Code auto-compacts when it gets close to full.

**Clear or compact the context:**

- `/compact` — summarises the conversation (keeps key technical decisions, drops verbose tool output). Safe to use any time.
- `/clear` — wipes the conversation completely. Use when switching to an unrelated task.
- `/exit` (or `Ctrl+D`) — exits the session entirely.

### Resuming a previous session

Claude Code persists each session. If you close the terminal or switch tasks, you can come back to where you left off.

**Resume the most recent session** (from your project directory):

```bash
claude --continue
# or the short form:
claude -c
```

**Pick from a list of previous sessions:**

```bash
claude --resume
# or:
claude -r
```

Sessions are scoped to the current working directory, so run these from the same project folder where the session started.

### Best practices

1. **Start large tasks in plan mode.** Press Shift+Tab until you see `plan`. Claude will explore the code and propose a strategy before any edit runs — saves time on wrong directions.
2. **Keep `CLAUDE.md` short.** Build commands, naming conventions, links to deeper docs. Aim for under 200 lines. Large `CLAUDE.md` files burn tokens on every session start.
3. **Use `#file` for specific files** rather than pasting code blocks. It is faster and keeps your prompt focused.
4. **Run `/context` when responses slow down.** Run `/compact` before continuing a long task if the window is getting full.
5. **Commit before risky refactors.** Git is your undo button when an edit goes sideways — commit a clean baseline before accepting a large change.

### Try it now

Open Claude Code and run these in order:

```
/status
/help
/context
```

Confirm you see (a) your current model in `/status`, (b) the Power Pages plugin skills in `/help` (e.g. `/create-site`, `/deploy-site`), and (c) a token breakdown in `/context`. Then press **Shift+Tab** a couple of times and watch the mode change in the status line.

---

## GitHub Copilot CLI orientation

### Launching GitHub Copilot CLI

Open your terminal and run:

```bash
copilot
```

This starts an interactive GitHub Copilot CLI session. You will see a prompt where you can type natural language instructions or slash commands.

> **Note:** If `copilot` is not recognized, re-check the install (`npm install -g @github/copilot`) and restart your terminal so `PATH` picks up the new binary.

### Key slash commands

| Command | What It Does | When to Use |
|---------|-------------|-------------|
| `/help` | Shows available commands | When you forget a command name |
| `/model` | Opens model picker to check or switch the AI model | When you want a different model for a task |
| `/context` | Shows current token-window usage | When you want to see how much room you have left |
| `/usage` | Shows session statistics (tokens, tool calls) | When you want a deeper breakdown than `/context` |
| `/compact` | Summarises conversation history to reduce token usage | When the session gets long and you want to keep context |
| `/clear` | Starts a completely fresh conversation | When you want to start over on a task |
| `/plugin` | Manages installed plugins | To see or add plugin functionality |
| `/skills` | Browse and manage skills (prompt + tool bundles) | To find reusable capabilities |
| `/mcp` | Manages MCP servers (GitHub MCP ships pre-configured) | To verify or add MCP connections |
| `/undo` | Rewinds the last turn and reverts file changes | When a proposed edit was wrong |
| `/plan` | Produces an implementation plan before edits | For larger multi-step tasks |
| `/resume [SESSION-ID]` | Switches to a prior saved session (alias `/continue`) | Returning to earlier work |
| `/exit` | Quits the session | When you are done |

### Working with GitHub Copilot CLI

**Typing a prompt:** Describe what you want in natural language. Be specific about what you want, the tech stack, and any constraints.

**Approving actions:** Before running a shell command or writing files, Copilot CLI prompts you with three choices:

- **Yes** — approve this one action
- **Yes, and approve [tool] for the rest of the running session** — auto-approve the same tool (with any options) for the rest of the session
- **No, and tell Copilot what to do differently (Esc)** — reject and redirect

**Reading output:** After an action runs, Copilot CLI shows the result. Pay attention to:
- File paths created or modified
- Commands executed and their output
- Any errors or warnings

### Switching modes

Copilot CLI has two modes you can toggle with **Shift+Tab**, shown in the prompt UI:

| Mode | What It Does | When to Use |
|------|--------------|-------------|
| Execute (default) | Asks to approve each action before it runs | Safest — use when touching unfamiliar code |
| Plan | Produces an implementation plan first without editing files; you review and then switch back to Execute to carry it out | Larger multi-step tasks, before you have confidence |

You can also launch with `--allow-all` (alias `--yolo`) for blanket auto-approve, or run `/allow-all on` mid-session. Use these carefully — they skip all confirmations.

> **Tip:** Start every multi-file task in plan mode. Copilot will map out the steps first. Review the plan, switch back to Execute, and Copilot proceeds step by step.

### Models

**Check or switch models:**

```
/model
```

Opens an interactive picker that shows the currently selected model and available alternatives. Copilot CLI supports multiple models (Claude family and GPT family — exact list depends on your account). Pick one and press Enter to switch.

> Default model availability varies by GitHub Copilot plan. Check `/model` inside the session to see what you have.

### Plugins, skills, and custom agents

Copilot CLI extends through plugins, skills, and custom agents.

**See installed plugins:**

```
/plugin
```

Lists plugins and their status.

**Browse skills** (reusable prompt + tool bundles):

```
/skills
```

Skills are similar to Claude Code plugin slash commands — they bundle instructions and tool access for a specific workflow.

**Use a custom agent profile:**

```
/agent
```

Custom agents are Markdown files at `~/.copilot/agents/` that bundle a prompt, allowed tools, and MCP server list. Handy when you want Copilot to behave differently for different tasks (e.g., a "frontend" agent vs. a "data" agent).

**Initialise repo instructions:**

```
/init
```

Initializes Copilot custom instructions and agentic features for the current repo.

### MCP servers

MCP (Model Context Protocol) servers extend Copilot with tools for external systems (GitHub repos, Dataverse, Kusto, and so on). You configure them yourself.

**See configured MCP servers:**

```
/mcp
```

Shows each server's name, connection state, and authentication status.

**Add a new MCP server:**

```
/mcp add
```

Walks you through adding a server interactively (name, transport, command or URL, auth). You can also edit `~/.copilot/config.json` directly.

### Context management

**AGENTS.md:** A file at your project root that gives Copilot persistent context about your project (tech stack, design preferences, conventions). Copilot CLI also auto-loads `CLAUDE.md` at the repo root if present, so the file [Lab 01: Scaffold an SPA Portal](../build/01-scaffold-spa-portal.md) creates works for both tools — no duplication needed. Other auto-loaded paths: `.github/copilot-instructions.md` (repo-wide) and `$HOME/.copilot/copilot-instructions.md` (user-global).

**@file references:** Type `@path/to/file` in your prompt to attach a specific file to Copilot's context.

**Check context usage:**

```
/context
```

Shows current token-window usage. For a deeper breakdown (tool calls, session age, turn count) run `/usage`.

**Clear or compact the context:**

- `/compact` — summarises the conversation to free tokens (keeps key decisions, drops verbose tool output). Copilot also auto-compacts in the background at ~95% of the token limit.
- `/clear` — wipes the conversation completely. Use when switching to an unrelated task.
- `/exit` — quits the session.

### Resuming a previous session

Copilot CLI persists sessions across terminal restarts.

**Reopen a prior session:**

```
/resume
```

Switches to a prior session by ID. You can also manage sessions with:

- `/session` — shows info about the current session (checkpoints, files, plan)
- `/rename [NAME]` — rename the current session
- `/share [file|html|gist]` — export to a Markdown file, an interactive HTML page, or a shareable gist (gist produces a link)

### Best practices

1. **Start large tasks in plan mode.** Press Shift+Tab until you see `plan`. Copilot will map out the work first and ask to approve each edit — saves time on wrong directions.
2. **Use `/undo` when an edit is wrong.** It rewinds the last turn and reverts the files Copilot touched — your single-keystroke safety net.
3. **Keep `AGENTS.md` or `CLAUDE.md` short.** Build commands, naming conventions, links to deeper docs. Aim for under 200 lines. Either filename works; do not duplicate across both.
4. **Use `@file` for specific files** rather than pasting code blocks. It is faster, keeps your prompt focused, and tab-completion makes it quick.
5. **Run `/context` when responses slow down.** Copilot auto-compacts, but a manual `/compact` before a long task keeps things snappy.

### Try it now

Open GitHub Copilot CLI and run these in order:

```
/help
/model
/context
```

Confirm you see (a) the slash-command list in `/help`, (b) your current model in `/model`, and (c) a token-window readout in `/context`. Then press **Shift+Tab** a couple of times and watch the mode change in the status line.

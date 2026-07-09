# Blaxel onboarding prompt

I want to get started with Blaxel from the dashboard.

Use the Blaxel agent package below as your operating context. If your environment already supports agent skills, load the official Blaxel skills when useful. Otherwise use the included command and agent-readable docs as reference material. Use docs token-efficiently: start from llms.txt or the most relevant docs entry, and only pull llms-full.txt when the task really needs broad context.

## Plug-and-play setup contract

The dashboard launch is consent to run a safe, read-only first glance now. Be useful before asking for more permission.

Before the first visible answer, inspect without changing the machine or contacting the user's Blaxel account:
- identify the current directory, git root/status, repo or folder shape, and likely project type
- check whether official Blaxel skills are already visible using read-only inventory such as `npx --no-install skills list -g --json` when available; do not let `npx` install anything yet
- check whether the `bl` CLI binary is installed and get local version/help output when available; do not install it yet
- inspect existing local configuration files only when safe, but do not run login or make authenticated Blaxel account, workspace, or resource requests yet

Do not ask before doing those read-only inspection steps. Do not ask me to paste tokens or secrets into chat.

Before I say `go`, hard stop before installing/updating global skills, installing the `bl` CLI, starting browser login, querying authenticated Blaxel state, writing project files, installing project dependencies, changing source code, or creating/updating/deleting Blaxel resources.

Even after `go`, always get separate, action-specific approval before production-risk changes, billing/payment actions, workspace-access changes, revealing/creating/rotating/storing credentials or secrets, destructive operations, or anything beyond the stated First win.

Product shape: do not call this a dashboard wizard or offer a choice between an in-product wizard and CLI. Treat the dashboard as the human-owned control surface and this chat as the setup conversation. Default to sandbox-first unless I ask for a different Blaxel resource.

Goal: get me plugged in, then drive toward the fastest real Blaxel proof, usually a sandbox running a small app or command with a reachable preview URL. Treat `prompt copied` as the starting point, not success.

## First response

After the local preflight, reply like a calm product assistant, not a developer console. Keep it plain enough for a non-technical user. Avoid labels like `repo`, `kit`, `target`, `auth`, `CLI`, `MCP`, and `resource` in the first response unless they are necessary to explain a blocker.

Use three mini-sections with whitespace and a tasteful emoji on each section. Keep it easy to scan, under 12 short lines:

```md
## ⚡ Blaxel is ready

### ✅ Checked
I found your project and checked the Blaxel tools on this machine. Setup is <ready / waiting on browser login / missing tools / partly ready>.

### 🎯 First win
Open your app in a safe Blaxel cloud computer with a live preview link.

### 🛡️ Safe mode
`go` authorizes the local Blaxel setup, the First win above, and the minimum non-production changes needed for that proof. Production, billing, access, secrets, destructive actions, and anything beyond that proof still need separate approval.

Say `go` to start. Say `inspect` for a no-change recommendation. Say `manual` to choose a different path.
```

If a preflight item failed, say it in plain English in the Checked section and make First win the next exact gate. No long checklist unless something is blocked.

## If I reply go

- Treat `go` as approval for the local Blaxel setup below, the First win stated in the previous response, and the minimum non-production project or resource changes needed for that proof.
- Install or update the official global Blaxel skills with the command in this package.
- Install the `bl` CLI with the safest documented method for this OS if it is missing, then verify its version/help output.
- Check Blaxel authentication; if login is required, start the normal `bl login` browser flow and state exactly which browser step is waiting. Never ask me to paste a token into chat.
- Detect or confirm the active workspace after authentication, without inventing account state.
- Map this project to the right Blaxel surface: sandbox preview, hosted agent, hosted MCP server, batch job, model gateway, persistent storage, integrations, or observability.
- Work toward the smallest real proof in one pass: a running command/app, preview URL, deployed endpoint/job, or a precise human gate if setup needs approval.
- Verify success with concrete proof such as command output, a resource status, logs, or a reachable preview URL.
- Ask again before any production, billing/payment, workspace-access, credential/secret, destructive, or beyond-the-stated-proof action.

## If I reply inspect, inspect only, or manual

- Make no project writes, resource changes, or Blaxel API changes.
- For `inspect` or `inspect only`, recommend the best Blaxel path for this repo.
- For `manual`, ask a compact question about what I want agents to accomplish with Blaxel.

## After first proof

If setup succeeds and this repo will keep using Blaxel, propose a durable agent onboarding pack instead of relying on pasted prompts forever. Include only the files that fit this project and agent: `AGENTS.md`, `CLAUDE.md`, `.cursor/rules/blaxel.mdc`, `.github/copilot-instructions.md`, reusable prompt files, and MCP config. Do not write these files without explicit approval.

# Blaxel onboarding prompt

I want to get started with Blaxel.

This prompt is compact because the link that opened it has a size limit. Treat it as the same contract as the full Blaxel prompt package. Use docs token-efficiently: start from llms.txt or the most relevant entry and use llms-full.txt only when broad context is necessary.

## Plug-and-play setup contract

Launching this prompt authorizes this bounded Blaxel bootstrap now. Complete it without another chat confirmation:

- Inspect the local environment and project context without changing project files.
- Install or update the official global Blaxel skills with the package command, then verify them. Skills are instructions and need no credentials merely to load.
- Install or update `bl` with the package's official OS installer, follow its PATH instructions, and complete `bl setup` (without a terminal: `bl setup --yes`, which skips browser login). Verify version/help output.
- Check Blaxel authentication; when needed, start `bl login` and present browser account approval. For unattended automation use existing `BL_API_KEY` and `BL_WORKSPACE` from the environment. Never ask for pasted tokens or API keys.
- Confirm the active workspace from authenticated state.

Browser login is the normal interactive path. Do not create, reveal, rotate, or store credentials during bootstrap.

This launch does not authorize project/source/dependency writes, Blaxel resource changes, production, billing, access changes, credential or secret handling, destructive operations, unrelated work, or anything beyond a concrete initiating build goal. If the initiating request already contains a concrete build goal, proceed after setup with only its minimum non-production work. Otherwise propose one sandbox-first goal and get approval for only its minimum non-production project/resource changes. Sensitive boundaries always require separate action-specific approval.

### How Blaxel powers your agents

- A dedicated machine for every agent. Each agent gets a hardware-isolated microVM that boots in milliseconds, separate from everything else.
- 25ms resume, persistent by default. Sandboxes auto-suspend when idle and resume with memory and filesystem intact.
- Networking, storage, and compute in one layer, with controlled connections and scale to more than 50,000 concurrent machines.

### What you can build on Blaxel

- Autonomous agents with sandbox isolation, scheduled executions, Agent Drive and Volumes, and Model Gateway.
- Coding agents / AI app builders with instant sandboxes and preview URLs.
- Vertical AI products with outbound allow-lists, proxy secret injection, and static IPs.
- Enterprise platform teams needing Firecracker-level isolation, SOC 2 / HIPAA / ISO 27001 compliance, and flexible deployment.

### First response

Reply like a calm product assistant, plain enough for a non-technical user. Use three short sections. Keep the Boundaries sentence exactly as written; do not replace it with a generic approval or “go-ahead” request:

```md
## ⚡ Blaxel setup

### ✅ Bootstrap
I checked this project, installed or updated the official Blaxel tools, and <confirmed workspace / opened secure browser login for your approval / hit a precise blocker>.

### 🎯 Proposed first win
<One project-specific sandbox-first goal naming the detected app or path and exact proof.>

### 🛡️ Boundaries
Bootstrap did not change the project or create resources. Confirm the proposed first win to authorize only its minimum non-production changes; sensitive and unrelated actions stay separate.
```

If browser approval is waiting, ask the user to approve the already-open page and continue automatically after authentication. Do not ask for another chat confirmation.

## After bootstrap

1. If the initiating request contains a concrete build goal, perform only the minimum non-production work required for it. Otherwise propose one project-specific goal and wait for approval before project, dependency, or resource changes.
2. Prefer a verified sandbox proof with command output, logs, status, or a reachable preview URL.
3. Ask separately before production, billing, access, credential/secret handling, destructive actions, unrelated resources, or work beyond the approved goal.
4. After the first proof, offer a durable agent onboarding pack such as `AGENTS.md`, `CLAUDE.md`, or `.cursor/rules/blaxel.mdc`, but do not write it without explicit approval.

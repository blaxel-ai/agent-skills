# Blaxel onboarding prompt

I want to get started with Blaxel from the dashboard.

Use the Blaxel agent package below as your operating context. If your environment already supports agent skills, load the official Blaxel skills when useful. Otherwise use the included command and agent-readable docs as reference material.

First-glance rule: before the first visible assistant answer, run a short, safe, read-only inspection when tool access is available so the setup card can be specific to this machine or project. Do not send a separate "I'll inspect now" preamble unless the host app requires a progress note before tools. Make the first substantive response feel like a polished dashboard-launched Blaxel onboarding card, not a plain text disclaimer or approval-only planning state.

Safe first-glance inspection:
- Allowed before the user says yes: identify the current directory, detect whether it is a repo or broad folder, list shallow project candidates, read high-signal project files, check whether Blaxel skills are visible with read-only local inventory such as `npx --no-install skills list -g --json` when available, check whether the `bl` CLI binary exists, check the local `bl` version/help output, and inspect git root/status.
- Not allowed before the user says yes: install or update skills, let `npx` auto-install the skills CLI package, install the CLI, run `bl login`, query authenticated Blaxel account/workspace/resource state, list Blaxel sandboxes/resources, create Blaxel sandboxes/resources, make network API calls to Blaxel, write files, change shell/config state, reveal/create/store secrets, make billing/payment/workspace access decisions, or run destructive/production-risk commands.
- Keep the first glance shallow and explain what was checked. If tools are unavailable or read-only inspection is blocked, say `Not checked yet` instead of guessing.

First response presentation:
- Use Markdown structure with a short level-2 heading such as `## ⚡ Blaxel setup`.
- Keep it friendly, confident, and on-brand: practical, calm, and focused on getting to a real working result.
- Use second-person copy in the first response. Say `you` and `your`; do not refer to `the user`.
- Start with one short sentence that ties Blaxel to the observed project or workspace and says this is setup, not a feature tour.
- Include a `### Why Blaxel helps agents` section with exactly three short bullets:
  - Sandboxes move dependency installs, commands, app servers, and experiments off your laptop so local state stays clean and mistakes are easy to throw away.
  - Preview URLs, logs, and traces turn agent work into evidence you can inspect and share instead of trusting a transcript.
  - Blaxel's hosted resources let agents move from local guessing to cloud proof: files, processes, tools, jobs, models, observability, and deployable endpoints.
- Include a `### What Blaxel can unlock` section with exactly three short bullets that group all relevant GA platform surfaces:
  - Run and preview: Sandboxes, preview URLs, codegen workflows, and live app servers.
  - Persist and deploy: Agent Drive and Volumes, Agents Hosting and MCP Server Hosting, and Batch Jobs.
  - Connect and operate: Model Gateway and integrations, observability, logs, traces, metrics, token usage, secrets, sessions, and safer sandbox networking.
- Use one compact Markdown table with exactly these two columns: `Already checked` and `After you say yes`.
- Include rows for `Project context`, `Blaxel skills`, `CLI + auth`, `First proof`, and `Human gates`.
- Do not create a third row-label column. Put the row label at the start of the `Already checked` cell.
- Make the `Already checked` column specific to real read-only findings. Make the `After you say yes` column specific about what may be installed, authenticated, created, or changed.
- Keep each table cell very short for narrow chat panes; target 8-12 words and prefer fragments over sentences.
- Use short emoji prefixes sparingly in row labels or the heading to make the response scannable, for example `🔎 Project context`, `🧰 Blaxel skills`, `🔐 CLI + auth`, and `🚀 First proof`.
- Say that saying yes allows you to verify the Blaxel skills are installed globally and updated to the latest package version before setup continues.
- Add a `### Reply Yes (Y/y):` section with 4 short bullets that make yes feel like the obvious setup path:
  - Refresh existing global Blaxel skills to latest and install missing Blaxel skills globally once for this agent.
  - Verify the `bl` CLI, browser login, workspace, and safe auth state without asking the user to paste tokens into chat.
  - Map this project to the right Blaxel surfaces: sandbox preview, hosted agent, hosted MCP server, batch job, model gateway, persistent storage, integrations, or observability.
  - Work toward the smallest real proof in one pass: a running command/app, preview URL, deployed endpoint/job, or a precise human gate if setup needs approval.
- Add a `### Reply No (N/n):` section with 2 short bullets: no installs/auth/resources/changes, then a short manual-mode questionnaire about what the user wants agents to accomplish with Blaxel.
- Do not include code blocks, long paragraphs, ASCII art, more than one table, or more than one question.
- End with exactly one question on its own line: "Do you want me to get started with setup? Reply Yes (Y/y) or No (N/n)."

If the user replies no, n, or N, do not install, authenticate, create resources, or change files. Acknowledge and ask a compact questionnaire about what they want agents to accomplish with Blaxel, such as isolated testing, previews, hosted agents, MCP servers, jobs, model gateway usage, persistent files, deployment, migration, or team demos. If the user replies yes, y, or Y, do the setup autonomously. Do not ask follow-up preference questions before inspecting the environment. Only stop for human-owned gates such as browser login, workspace selection when it cannot be inferred, billing, payment, production-risk decisions, or secret creation/reveal/rotation/storage.

Skill installation and freshness are global. If the current agent supports skills, first inventory global skills with `npx --no-install skills list -g --json` or the closest supported read-only skill list command that cannot install packages as a side effect. Confirm both `blaxel-cli` and `blaxel-sdk` are present and globally scoped when that read-only inventory is available; otherwise say `Not checked yet`. After the user says yes, update existing Blaxel skills to the latest available package with `npx --yes skills update -g blaxel-cli blaxel-sdk -y`; if either skill is missing or the update command cannot map them to `blaxel-ai/agent-skills`, install them with the global skill install command from the package below. If the skills CLI does not expose exact installed and remote versions, treat the update command's output as freshness proof and do not invent version numbers. Reload or explain the required reload step for this agent. Do not create per-project copies of Blaxel skills.

Directory discovery:
- If the current working directory is inside a specific Git repo or obvious project, focus on that repo first.
- If the current working directory is the home directory, Desktop, Downloads, or another broad folder, search likely project roots within reason before choosing a target. Prefer shallow discovery of directories such as `~/code`, `~/dev`, `~/src`, `~/projects`, `~/workspace`, `~/work`, `~/gits`, and the immediate children of the current directory.
- Avoid expensive or unsafe traversal. Skip `.git`, `node_modules`, dependency caches, build outputs, virtualenvs, large vendor folders, private key material, and hidden app caches unless a specific file is needed for setup.
- Identify project type from existing files such as `package.json`, `pnpm-lock.yaml`, `pyproject.toml`, `requirements.txt`, `go.mod`, `Cargo.toml`, `Dockerfile`, `README`, `AGENTS.md`, `CLAUDE.md`, `.cursor/rules`, or existing Blaxel config.

Blaxel setup flow:
1. Inspect the current directory context and choose the likely project scope.
2. Check whether Blaxel skills are available globally and current; update stale skills or install missing skills globally if allowed by the user's yes.
3. Check whether the `bl` CLI is installed. If it is missing, use the Blaxel skill/docs context to install it with the safest appropriate method for the user's OS and shell.
4. Check Blaxel auth. If login is required, run the normal `bl login` flow and let it open the browser. Do not ask the user to paste tokens into chat.
5. Detect or confirm the workspace using CLI state where possible.
6. Inspect the project enough to explain how Blaxel fits it.
7. Prefer the fastest path to a verified Blaxel result, usually a sandbox running a small app or command with a reachable preview URL. If creating a resource is not safe yet, stop at the smallest necessary human gate and explain the exact next action.
8. Report concrete proof: commands run, CLI/auth/workspace status, project signals found, resource status, logs, or a reachable preview URL.

After-yes presentation:
- Keep progress updates structured with short Markdown headings and compact status tables.
- Use labels such as `Checking`, `Done`, `Needs you`, and `Blocked` instead of vague narration.
- When you stop at a gate, show the exact gate, why it needs the human, and the next safe action.
- In the final setup summary, include a compact evidence table with what was checked, the result, and the proof source.

Product shape: do not call this a dashboard wizard or offer a choice between an in-product wizard and CLI. Treat the dashboard as the human-owned control surface and this chat as the setup conversation. This is not a feature tour. The goal is to get the user from the dashboard launch to a real Blaxel-ready setup with minimal friction.

Do not ask the user to paste secrets into chat unless they explicitly choose that path. Never invent credentials, workspace names, quotas, billing state, or deployed resource status.

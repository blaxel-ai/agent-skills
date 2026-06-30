# Blaxel agent package

Official Blaxel agent skills:

```shell
npx --yes skills add blaxel-ai/agent-skills -g --skill blaxel-cli blaxel-sdk -y
```

Check installed global skills:

```shell
npx --no-install skills list -g --json
```

Update installed Blaxel skills to the latest package version:

```shell
npx --yes skills update -g blaxel-cli blaxel-sdk -y
```

The Blaxel skills package includes:
- `blaxel-cli`: use when troubleshooting, bootstrapping a project on Blaxel, or managing resources from the command line with the `bl` CLI.
- `blaxel-sdk`: use when building agents or MCP servers on Blaxel, or when programmatic resource management through Blaxel SDKs is the better path.

Use these skills when the user wants to create or manage Blaxel resources, especially:
- create sandboxes to run code and commands
- start application servers inside sandboxes
- generate preview URLs for sandbox applications
- create Agent Drives and Volumes for persistent or shared files
- create and deploy AI agents with Agents Hosting
- create and deploy MCP servers with MCP Server Hosting
- deploy and run batch jobs
- route model calls through Model Gateway when that is the right fit
- use integrations and observability for connected tools, logs, traces, metrics, and token usage
- use access-control surfaces such as secrets, sessions, proxy controls, and safer sandbox networking when setup requires them

Agent-readable docs:
- https://docs.blaxel.ai/llms.txt
- https://docs.blaxel.ai/llms-full.txt
- https://docs.blaxel.ai/skills-mcp

MCP entrypoints:
- Use Sandbox MCP when available for sandbox files, commands, ports, and previews.
- Use the Blaxel resource MCP only after the human provides or approves the required auth headers. Resource MCP endpoint: https://api.blaxel.ai/v0/mcp

Guardrails:
- Never invent credentials, workspace names, quotas, billing state, or deployed resource status.
- Stop for human approval before creating, revealing, rotating, or storing API keys or tokens.
- Stop for human approval before billing, payment, workspace access, production-risk, or destructive resource changes.
- Verify success with concrete proof such as command output, a resource status, logs, or a reachable preview URL.

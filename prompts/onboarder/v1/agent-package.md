# Blaxel agent package

Official Blaxel agent skills:

```shell
npx skills add blaxel-ai/agent-skills
```

The Blaxel skills package includes:
- `blaxel-cli`: use when troubleshooting, bootstrapping a project on Blaxel, or managing resources from the command line with the `bl` CLI.
- `blaxel-sdk`: use when building agents or MCP servers on Blaxel, or when programmatic resource management through Blaxel SDKs is the better path.

Use these skills when the user wants to create or manage Blaxel resources, especially:
- create sandboxes to run code and commands
- start application servers inside sandboxes
- generate preview URLs for sandbox applications
- create Agent Drives
- create and deploy AI agents
- create and deploy MCP servers
- deploy and run batch jobs

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

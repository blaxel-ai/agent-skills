---
name: blaxel-cli
description: Manage Blaxel resources from the command line using the bl CLI. Deploy agents, sandboxes, jobs, and MCP servers. Also installs the Blaxel CLI if not present.
allowed-tools: Bash(bl:*), Bash(curl:*)
---

# Blaxel CLI

A CLI to manage Blaxel cloud resources from the command line: agents, sandboxes,
jobs, MCP servers, drives, and more.

## Prerequisites

The `bl` command must be available on PATH. To check:

```bash
bl version
```

If not installed, install via the official install script:

```bash
curl -fsSL https://raw.githubusercontent.com/blaxel-ai/toolkit/main/install.sh | sh
```

Or via Homebrew:

```bash
brew tap blaxel-ai/blaxel && brew install blaxel
```

After installation, log in to your workspace:

```bash
bl login my-workspace
```

## Global Flags

All commands support these flags:

| Flag                     | Description                              |
| ------------------------ | ---------------------------------------- |
| `-o, --output <format>`  | Output format: pretty, yaml, json, table |
| `-w, --workspace <name>` | Override workspace for this command      |
| `-v, --verbose`          | Enable verbose output                    |
| `-u, --utc`              | Enable UTC timezone                      |
| `--skip-version-warning` | Skip version warning                     |

## Non-Interactive Mode

For commands that prompt for input (confirmations, selections), add `-y` or
`--yes` to auto-confirm. This is required when running in non-interactive /
no-TTY environments (scripts, CI, agents).

## Available Commands

{{COMMANDS}}

## Reference Documentation

{{REFERENCE_TOC}}

## Discovering Options

To see available subcommands and flags, run `--help` on any command:

```bash
bl --help
bl deploy --help
bl get --help
bl get agents --help
```

## Common Workflows

### Create a sandbox, run a command, and get its logs

```bash
# 1. Create a sandbox with bl apply
bl apply -f - <<EOF
apiVersion: blaxel.ai/v1alpha1
kind: Sandbox
metadata:
  name: my-sandbox
spec:
  runtime:
    image: blaxel/base-image:latest
    memory: 2048
  lifecycle:
    expirationPolicies:
      - type: ttl-idle
        value: 1h       # Delete after 1 hour of inactivity. Units: h, d, w
        action: delete
EOF

# 2. Retrieve sandbox configuration
bl get sandbox my-sandbox

# 3. Execute a command in the sandbox and get stdout of the command
bl run sandbox my-sandbox --path /process --data '{"command": "echo hello world", "name": "my-cmd", "waitForCompletion": true}'

# 4. Retrieve the logs for that command in case stdout was not sufficient
bl logs sandbox my-sandbox my-cmd
```

### Deploy an agent

```bash
bl new agent my-agent
cd my-agent
bl serve --hotreload    # Test locally
bl deploy               # Deploy to cloud
bl chat my-agent        # Chat with it
```

### Manage sandboxes

```bash
bl get sandboxes                    # List all
bl get sandbox my-sandbox --watch   # Watch status
bl connect sandbox my-sandbox       # Interactive terminal
bl logs sandbox my-sandbox --follow # Stream logs
bl delete sandbox my-sandbox        # Clean up
```

### Multi-workspace deployment

```bash
bl workspaces dev     # Switch to dev
bl deploy             # Deploy to dev
bl workspaces prod    # Switch to prod
bl deploy             # Deploy to prod
```

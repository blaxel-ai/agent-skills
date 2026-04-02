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

```
bl apply       # Apply configuration changes to resources declaratively using YAML files.
bl chat        # Start an interactive chat session with a deployed agent.
bl connect     # Connect into your sandbox resources with interactive interfaces
bl delete      # Delete Blaxel resources from your workspace.
bl deploy      # Deploy your Blaxel project to the cloud.
bl get         # Retrieve information about Blaxel resources in your workspace.
bl login       # Authenticate with Blaxel to access your workspace.
bl logout      # Remove stored credentials for a workspace.
bl logs        # View logs for Blaxel resources.
bl new         # Create a new Blaxel resource from templates.
bl push        # Build and push a container image to the Blaxel registry without creating a deployment.
bl run         # Execute a Blaxel resource with custom input data.
bl serve       # Start a local development server for your Blaxel project.
bl token       # Retrieve the authentication token for the specified workspace.
bl upgrade     # Upgrade the Blaxel CLI to the latest version.
bl version     # Print the version number
bl workspaces  # List and manage Blaxel workspaces.
```

## Reference Documentation

- [apply](references/apply.md) - Apply configuration changes to resources
  declaratively using YAML files.
- [chat](references/chat.md) - Start an interactive chat session with a deployed
  agent.
- [connect](references/connect.md) - Connect into your sandbox resources with
  interactive interfaces
- [delete](references/delete.md) - Delete Blaxel resources from your workspace.
- [deploy](references/deploy.md) - Deploy your Blaxel project to the cloud.
- [get](references/get.md) - Retrieve information about Blaxel resources in your
  workspace.
- [login](references/login.md) - Authenticate with Blaxel to access your
  workspace.
- [logout](references/logout.md) - Remove stored credentials for a workspace.
- [logs](references/logs.md) - View logs for Blaxel resources.
- [new](references/new.md) - Create a new Blaxel resource from templates.
- [push](references/push.md) - Build and push a container image to the Blaxel
  registry without creating a deployment.
- [run](references/run.md) - Execute a Blaxel resource with custom input data.
- [serve](references/serve.md) - Start a local development server for your
  Blaxel project.
- [token](references/token.md) - Retrieve the authentication token for the
  specified workspace.
- [upgrade](references/upgrade.md) - Upgrade the Blaxel CLI to the latest
  version.
- [version](references/version.md) - Print the version number
- [workspaces](references/workspaces.md) - List and manage Blaxel workspaces.

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

### Multi-workspace deployment

```bash
bl workspaces dev     # Switch to dev
bl deploy             # Deploy to dev
bl workspaces prod    # Switch to prod
bl deploy             # Deploy to prod
```

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

If not installed, use the official installer for this operating system.

macOS or Linux:

```bash
curl -fsSL https://blaxel.ai/install.sh | sh
```

Windows PowerShell:

```powershell
irm https://blaxel.ai/install.ps1 | iex
```

Follow the installer's PATH or shell-reload instructions, then complete setup:

```bash
bl setup
```

Setup installs the Blaxel skills and configures supported coding agents. In a
terminal, it also offers browser login. If the installer already completed
setup, verify the result instead of repeating it.

When running without a terminal, use `bl setup --yes`. Setup skips browser login
in that environment. If sign-in is still needed, run `bl login`, present its
secure browser URL, and continue after the user approves it. Confirm the
selected workspace from command output; do not guess a workspace name or ask for
pasted credentials.

For unattended automation, use an existing `BL_API_KEY` and `BL_WORKSPACE`
supplied securely through the environment. Commands can use these directly; do
not start browser login or persist the key in agent configuration.

Verify the installed command and active workspace:

```bash
bl version
bl workspaces --current
```

Treat empty workspace output as incomplete sign-in.

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

### Run a complex command in a sandbox (agent guideline)

`bl run sandbox ... --path /process --data '<json>'` requires the JSON payload
to survive **shell quoting**. As soon as the command embeds nested quotes,
backslashes, multiple lines, or interpreters like `sh -lc` / `python3 -c`,
inline `--data` becomes brittle and the API rejects the request with
`400 Bad Request: invalid character ... in string escape code`.

**Decision rule for an agent:**

1. Command has **no single quotes, no backslashes, no newlines** → use
   `--data '{"command": "...", "waitForCompletion": true}'` directly.
2. Anything more complex (nested quotes, escapes, multiline, scripts) → **write
   the JSON payload to a file** with your Write/file-creation tool (this
   bypasses the shell entirely), then run with `--file`.

```bash
# Step 1 — agent writes /tmp/process.json with content like:
# {
#   "command": "sh -lc 'python3 -c \"print(\\\"hello\\\")\"'",
#   "name": "cve-check",
#   "waitForCompletion": true
# }
#
# Step 2 — execute it
bl run sandbox my-sandbox --path /process --file /tmp/process.json
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

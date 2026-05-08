# bl workspaces

> List and manage Blaxel workspaces.

## Usage

```
List and manage Blaxel workspaces.

A workspace is an isolated environment within Blaxel that contains your
resources (agents, jobs, models, sandboxes, etc.). Workspaces provide:

- Isolation between projects or environments (dev/staging/prod)
- Separate billing and resource quotas
- Team collaboration boundaries
- Independent access control and permissions

The current workspace (marked with *) determines where commands operate.
All commands like 'bl deploy', 'bl get', 'bl run' use the current workspace
unless you override with the --workspace flag.

To switch workspaces, provide the workspace name as an argument.
To list all authenticated workspaces, run without arguments.

Usage:
  bl workspaces [workspace] [flags]

Aliases:
  workspaces, ws, workspace

Examples:
  # List all authenticated workspaces
  bl workspaces

  # Switch to different workspace
  bl workspaces production

  # Use specific workspace for one command (doesn't switch current)
  bl get agents --workspace staging

  # Get only the current workspace name
  bl workspaces --current

  # Common multi-workspace workflow
  bl workspaces dev        # Switch to dev
  bl deploy                # Deploy to dev
  bl workspaces prod       # Switch to prod
  bl deploy                # Deploy to prod

Flags:
      --current   Display only the current workspace name
  -h, --help      help for workspaces

Global Flags:
  -o, --output string          Output format. One of: pretty,yaml,json,table
      --skip-version-warning   Skip version warning
  -u, --utc                    Enable UTC timezone
  -v, --verbose                Enable verbose output
  -w, --workspace string       Specify the workspace name
```

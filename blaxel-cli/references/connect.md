# bl connect

> Open an interactive terminal session to a sandbox

## Usage

```
Open an interactive terminal session to a sandbox

Usage:
  bl connect [command]

Available Commands:
  sandbox     Connect to a sandbox environment

Flags:
  -h, --help   help for connect

Global Flags:
  -o, --output string          Output format. One of: pretty,yaml,json,table
      --skip-version-warning   Skip version warning
  -u, --utc                    Enable UTC timezone
  -v, --verbose                Enable verbose output
  -w, --workspace string       Specify the workspace name

Use "bl connect [command] --help" for more information about a command.
```

## Subcommands

### sandbox

> Connect to a sandbox environment with an interactive terminal session.

```
Connect to a sandbox environment with an interactive terminal session.

This command opens a direct terminal connection to your sandbox, similar to SSH.
The terminal supports full ANSI colors, cursor movement, and interactive applications.

Press Ctrl+D to disconnect from the sandbox.

Examples:
  bl connect sandbox my-sandbox
  bl connect sb my-sandbox
  bl connect sbx production-env

Usage:
  bl connect sandbox [sandbox-name] [flags]

Aliases:
  sandbox, sb, sbx

Flags:
  -h, --help   help for sandbox

Global Flags:
  -o, --output string          Output format. One of: pretty,yaml,json,table
      --skip-version-warning   Skip version warning
  -u, --utc                    Enable UTC timezone
  -v, --verbose                Enable verbose output
  -w, --workspace string       Specify the workspace name
```

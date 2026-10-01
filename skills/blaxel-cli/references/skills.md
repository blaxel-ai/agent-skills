# bl skills

> Manage Blaxel skills for coding agents

## Usage

```
Manage Blaxel skills for coding agents

Usage:
  bl skills [command]

Available Commands:
  install     Install or refresh Blaxel skills for coding agents

Flags:
  -h, --help   help for skills

Global Flags:
  -o, --output string          Output format. One of: pretty,yaml,json,table
      --skip-version-warning   Skip version warning
  -u, --utc                    Enable UTC timezone
  -v, --verbose                Enable verbose output
  -w, --workspace string       Specify the workspace name

Use "bl skills [command] --help" for more information about a command.
```

## Subcommands

### install

> Install Blaxel agent skills globally with a version-pinned, integrity-checked
> installer.

```
Install Blaxel agent skills globally with a version-pinned, integrity-checked installer.
Skills go to ~/.agents/skills and to the coding agents detected on this machine
(Claude Code, Codex, Cursor, ...). Requires Node.js 22.20.0 or later, npm and git.
This explicit command runs even when automatic installation is disabled with
BL_INSTALL_SKILLS=false or in CI.

Usage:
  bl skills install [flags]

Flags:
  -h, --help   help for install

Global Flags:
  -o, --output string          Output format. One of: pretty,yaml,json,table
      --skip-version-warning   Skip version warning
  -u, --utc                    Enable UTC timezone
  -v, --verbose                Enable verbose output
  -w, --workspace string       Specify the workspace name
```

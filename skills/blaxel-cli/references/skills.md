# bl skills

> Manage the Blaxel agent skills installed for your coding agents.

## Usage

```
Manage the Blaxel agent skills installed for your coding agents.

Once skills are installed, ordinary bl commands and bl mcp check for a newer
verified skills bundle at most every six hours. Turn this off with
bl skills autoupdate off, or with BL_INSTALL_SKILLS=false; CI is skipped.

To uninstall, run bl skills autoupdate off so automatic updates and CLI
upgrades stop reinstalling them, then delete the blaxel-* folders in
~/.agents/skills and the matching links in each coding agent's skills folder
(for example ~/.claude/skills). The update state stays in ~/.blaxel/skills.

Usage:
  bl skills [command]

Available Commands:
  autoupdate  Save this machine's automatic skills update preference
  install     Install or refresh Blaxel skills for coding agents
  status      Show skills revisions, update checks, skips and failures
  update      Refresh skills from the compatible verified release bundle

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

### autoupdate

> Save this machine's automatic skills update preference

```
Save this machine's automatic skills update preference

Usage:
  bl skills autoupdate [on|off] [flags]

Flags:
  -h, --help   help for autoupdate

Global Flags:
  -o, --output string          Output format. One of: pretty,yaml,json,table
      --skip-version-warning   Skip version warning
  -u, --utc                    Enable UTC timezone
  -v, --verbose                Enable verbose output
  -w, --workspace string       Specify the workspace name
```

### install

> Install the latest Blaxel agent skills globally from
> github.com/blaxel-ai/agent-skills.

```
Install the latest Blaxel agent skills globally from github.com/blaxel-ai/agent-skills.
Skills go to ~/.agents/skills and to the coding agents detected on this machine
(Claude Code, Codex, Cursor, ...). Nothing else needs to be installed first.
This explicit command runs even when automatic installation is disabled with
BL_INSTALL_SKILLS=false or in CI.
Existing externally managed skill links are kept, not refreshed. Same-name
skills in nested folders are reused automatically. Conflicting copies are
backed up outside the agents' skills folders and replaced with links.

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

### status

> Show skills revisions, update checks, skips and failures

```
Show skills revisions, update checks, skips and failures

Usage:
  bl skills status [flags]

Flags:
  -h, --help   help for status

Global Flags:
  -o, --output string          Output format. One of: pretty,yaml,json,table
      --skip-version-warning   Skip version warning
  -u, --utc                    Enable UTC timezone
  -v, --verbose                Enable verbose output
  -w, --workspace string       Specify the workspace name
```

### update

> Check the trusted Blaxel skills manifest and install its compatible
> checksum-verified bundle.

```
Check the trusted Blaxel skills manifest and install its compatible checksum-verified bundle.
Modified folders, manager links and plugin copies are preserved. This command
ignores automatic update opt-outs. Restart your coding agent to load changes.
Until the first bundle is published, use bl skills install for initial installation.

Usage:
  bl skills update [flags]

Flags:
  -h, --help   help for update

Global Flags:
  -o, --output string          Output format. One of: pretty,yaml,json,table
      --skip-version-warning   Skip version warning
  -u, --utc                    Enable UTC timezone
  -v, --verbose                Enable verbose output
  -w, --workspace string       Specify the workspace name
```

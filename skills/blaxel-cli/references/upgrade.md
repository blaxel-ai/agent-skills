# bl upgrade

> Upgrade the Blaxel CLI to the latest version.

## Usage

```
Upgrade the Blaxel CLI to the latest version.

This command automatically detects your installation method and updates
the CLI in the correct location to avoid version conflicts.

Supported installation methods:
  - Homebrew (brew)
  - Manual installation (install.sh, or install.ps1 on Windows)
  - Direct binary download

After upgrading, the newly installed CLI refreshes the Blaxel agent skills and
MCP servers for detected coding agents without setup screens or login. Existing
custom MCP entries, plugin-managed servers, and externally managed skills are
kept. Set BL_INSTALL_SKILLS=false or BL_INSTALL_MCP=false to skip either part.
Automatic refresh is skipped in CI unless the corresponding setting is true.
If the requested release does not support headless refresh, setup is left alone.

Examples:
  # Upgrade to the latest version
  bl upgrade

  # Upgrade to a specific version
  bl upgrade --version v1.2.3

  # Force reinstall even if already on latest version
  bl upgrade --force

Usage:
  bl upgrade [flags]

Flags:
  -f, --force            Force reinstall even if already on latest version
  -h, --help             help for upgrade
      --version string   Target version to upgrade to (e.g., v1.2.3)

Global Flags:
  -o, --output string          Output format. One of: pretty,yaml,json,table
      --skip-version-warning   Skip version warning
  -u, --utc                    Enable UTC timezone
  -v, --verbose                Enable verbose output
  -w, --workspace string       Specify the workspace name
```

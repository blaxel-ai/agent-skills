# bl mcp

> Serve the hosted Blaxel MCP tools over stdio using your existing bl login.

## Usage

```
Serve the hosted Blaxel MCP tools over stdio using your existing bl login.

Run bl login before starting your agent. bl setup configures local MCP targets;
no token is stored in agent configurations and no separate MCP OAuth is needed.
Without a usable login, the connection still initializes, with an empty tool
list and instructions to run bl login, then restart or reconnect the agent.

The default workspace is pinned when the bridge starts resolving credentials:
the current bl workspace, --workspace or BL_WORKSPACE. A tool's workspace
argument can intentionally select another authorized workspace. This pin is
not a restriction on the user's authority.

Tokens refresh in memory only. bl logout removes local credentials, affecting
future requests, but does not revoke refresh grants or work already in flight.
BL_API_KEY and BL_CLIENT_CREDENTIALS override stored credentials and are not
removed by bl logout. Environment inheritance varies between agent clients.

The HTTPS origin comes from the stored workspace environment (prod or dev),
not inherited BL_API_URL or BL_ENV. Redirects are refused for both MCP requests
and token exchanges.

Usage:
  bl mcp [flags]

Examples:
  claude mcp add --scope user blaxel -- bl mcp

  {"mcpServers": {"blaxel": {"command": "/absolute/path/to/bl", "args": ["mcp"]}}}

Flags:
  -h, --help   help for mcp

Global Flags:
  -o, --output string          Output format. One of: pretty,yaml,json,table
      --skip-version-warning   Skip version warning
  -u, --utc                    Enable UTC timezone
  -v, --verbose                Enable verbose output
  -w, --workspace string       Specify the workspace name
```

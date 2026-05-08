# bl token

> Retrieve the authentication token for the specified workspace.

## Usage

````
Retrieve the authentication token for the specified workspace.

The token command displays the current authentication token used by the CLI
for API requests. This token is automatically managed and refreshed as needed.

Authentication Methods:
- API Key: Returns the API key
- OAuth (Browser Login): Returns the access token (refreshed if needed)
- Client Credentials: Returns the access token (refreshed if needed)

The token is retrieved from your stored credentials and will be automatically
refreshed if it's expired or about to expire.

Examples:

```bash
# Get token for current workspace
bl token

# Get token for specific workspace
bl token my-workspace

# Use in scripts (get just the token value)
export TOKEN=$(bl token)
````

Usage: bl token [workspace] [flags]

Flags: -h, --help help for token

Global Flags: -o, --output string Output format. One of: pretty,yaml,json,table
--skip-version-warning Skip version warning -u, --utc Enable UTC timezone -v,
--verbose Enable verbose output -w, --workspace string Specify the workspace
name

```
```

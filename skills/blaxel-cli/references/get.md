# bl get

> Retrieve information about Blaxel resources in your workspace.

## Usage

```
Retrieve information about Blaxel resources in your workspace.

A "resource" in Blaxel refers to any deployable or manageable entity:
- agents: AI agent applications
- functions/mcp: Model Context Protocol servers (tool providers)
- jobs: Batch processing tasks
- sandboxes: Isolated execution environments
- models: AI model configurations
- policies: Access control policies
- volumes: Persistent storage
- integrationconnections: External service integrations

Hub Discovery (pre-built resources available in the Blaxel Hub):
- sandbox-hub: Pre-built sandbox images with pre-installed tools and runtimes
- mcp-hub: Pre-built MCP servers for tool integrations (GitHub, Slack, etc.)
- templates: Project scaffolding templates for bl new

Output Formats:
Use -o flag to control output format:
- pretty: Human-readable colored output (default)
- json: Machine-readable JSON (for scripting)
- yaml: YAML format
- table: Tabular format with columns

Watch Mode:
Use --watch to continuously monitor a resource and see updates in real-time.
Useful for tracking deployment status or watching for changes.

The command can list all resources of a type or get details for a specific one.

Usage:
  bl get [command]

Examples:
  # List all agents
  bl get agents

  # Get specific agent details
  bl get agent my-agent

  # Get in JSON format (useful for scripting)
  bl get agent my-agent -o json

  # Watch agent status in real-time
  bl get agent my-agent --watch

  # List all resources with table output
  bl get agents -o table

  # Get MCP servers (also called functions)
  bl get functions
  bl get mcp

  # List jobs
  bl get jobs

  # Get specific job
  bl get job my-job

  # List executions for a job (nested resource)
  bl get job my-job executions

  # Get specific execution for a job
  bl get job my-job execution EXECUTION_ID

  # List pre-built sandbox images from the Hub
  bl get sandbox-hub
  bl get sandbox-hub -o json

  # List pre-built MCP servers from the Hub
  bl get mcp-hub
  bl get mcp-hub -o json

  # Monitor sandbox status
  bl get sandbox my-sandbox --watch

  # List processes in a sandbox
  bl get sandbox my-sandbox process
  bl get sbx my-sandbox ps

  # Get specific process in a sandbox
  bl get sandbox my-sandbox process my-process

  # List previews for a sandbox
  bl get sandbox my-sandbox previews

  # Get a specific preview
  bl get sandbox my-sandbox preview my-preview

  # List tokens for a sandbox preview
  bl get sandbox my-sandbox preview my-preview tokens

  # Get a specific token
  bl get sandbox my-sandbox preview my-preview token my-token

  # --- Filtering with jq ---

  # Get names of all jobs with status DELETING
  bl get jobs -o json | jq -r '.[] | select(.status == "DELETING") | .metadata.name'

  # Get names of all deployed sandboxes
  bl get sandboxes -o json | jq -r '.[] | select(.status == "DEPLOYED") | .metadata.name'

  # Get all agents with name containing "test"
  bl get agents -o json | jq -r '.[] | select(.metadata.name | contains("test")) | .metadata.name'

  # Get sandboxes with specific label (e.g., environment=dev)
  bl get sandboxes -o json | jq -r '.[] | select(.metadata.labels.environment == "dev") | .metadata.name'

  # Get all job names
  bl get jobs -o json | jq -r '.[] | .metadata.name'

  # Count resources by status
  bl get agents -o json | jq 'group_by(.status) | map({status: .[0].status, count: length})'

Available Commands:
  agents                 List all agents or get details of a specific one
  drives                 List all drives or get details of a specific one
  functions              List all functions or get details of a specific one
  image                  Get image information
  integrationconnections List all integrationconnections or get details of a specific one
  jobs                   List all jobs or get details of a specific one
  mcp-hub                List pre-built MCP servers available in the Blaxel Hub
  models                 List all models or get details of a specific one
  policies               List all policies or get details of a specific one
  previews               List all previews or get details of a specific one
  previewtokens          List all previewtokens or get details of a specific one
  sandbox-hub            List pre-built sandbox images available in the Blaxel Hub
  sandboxes              List all sandboxes or get details of a specific one
  templates              List available project templates
  volumes                List all volumes or get details of a specific one
  volumetemplates        List all volumetemplates or get details of a specific one

Flags:
  -h, --help    help for get
      --watch   After listing/getting the requested object, watch for changes.

Global Flags:
  -o, --output string          Output format. One of: pretty,yaml,json,table
      --skip-version-warning   Skip version warning
  -u, --utc                    Enable UTC timezone
  -v, --verbose                Enable verbose output
  -w, --workspace string       Specify the workspace name

Use "bl get [command] --help" for more information about a command.
```

## Subcommands

### agents

> List all agents or get details of a specific one

```
List all agents or get details of a specific one

Usage:
  bl get agents [flags]

Aliases:
  agents, agent, ag

Flags:
      --all             Fetch all pages (may be slow for large collections)
      --cursor string   Cursor from a previous page to fetch the next page of results
  -h, --help            help for agents
      --limit int       Maximum number of items to return (auto-paginates when above 200) (default 200)

Global Flags:
  -o, --output string          Output format. One of: pretty,yaml,json,table
      --skip-version-warning   Skip version warning
  -u, --utc                    Enable UTC timezone
  -v, --verbose                Enable verbose output
      --watch                  After listing/getting the requested object, watch for changes.
  -w, --workspace string       Specify the workspace name
```

### drives

> List all drives or get details of a specific one

```
List all drives or get details of a specific one

Usage:
  bl get drives [flags]

Aliases:
  drives, drive, drv

Flags:
      --all             Fetch all pages (may be slow for large collections)
      --cursor string   Cursor from a previous page to fetch the next page of results
  -h, --help            help for drives
      --limit int       Maximum number of items to return (auto-paginates when above 200) (default 200)

Global Flags:
  -o, --output string          Output format. One of: pretty,yaml,json,table
      --skip-version-warning   Skip version warning
  -u, --utc                    Enable UTC timezone
  -v, --verbose                Enable verbose output
      --watch                  After listing/getting the requested object, watch for changes.
  -w, --workspace string       Specify the workspace name
```

### functions

> List all functions or get details of a specific one

```
List all functions or get details of a specific one

Usage:
  bl get functions [flags]

Aliases:
  functions, function, fn, mcp, mcps

Flags:
      --all             Fetch all pages (may be slow for large collections)
      --cursor string   Cursor from a previous page to fetch the next page of results
  -h, --help            help for functions
      --limit int       Maximum number of items to return (auto-paginates when above 200) (default 200)

Global Flags:
  -o, --output string          Output format. One of: pretty,yaml,json,table
      --skip-version-warning   Skip version warning
  -u, --utc                    Enable UTC timezone
  -v, --verbose                Enable verbose output
      --watch                  After listing/getting the requested object, watch for changes.
  -w, --workspace string       Specify the workspace name
```

### image

> Get information about container images.

```
Get information about container images.

Usage patterns:
  bl get images                          List all images (without tags)
  bl get image agent/my-image            Get image details for a specific resource type
  bl get image agent/my-image:v1.0       Get specific tag information
  bl get image sandbox/my-image --latest Get the latest tag reference for an image

The image reference format is: resourceType/imageName[:tag]
- resourceType: Type of resource (e.g., agent, function, job, sandbox)
- imageName: The name of the image
- tag: Optional tag to filter for a specific version

The --latest flag returns the image reference with the most recent tag,
formatted as resourceType/imageName:tag. This is useful for scripting
and for retrieving the IMAGE_ID to use when creating sandboxes from templates.

Usage:
  bl get image [resourceType/imageName[:tag]] [flags]

Aliases:
  image, images, img

Examples:
  # List all images
  bl get images

  # Get all tags for a specific image
  bl get image agent/my-agent

  # Get a specific tag
  bl get image agent/my-agent:latest

  # Get the latest tag reference (useful for sandbox templates)
  bl get image sandbox/mytemplate --latest

  # Use different output formats
  bl get images -o json
  bl get image agent/my-agent -o pretty

Flags:
  -h, --help     help for image
      --latest   Return only the most recent tag reference (e.g., sandbox/mytemplate:tag)

Global Flags:
  -o, --output string          Output format. One of: pretty,yaml,json,table
      --skip-version-warning   Skip version warning
  -u, --utc                    Enable UTC timezone
  -v, --verbose                Enable verbose output
      --watch                  After listing/getting the requested object, watch for changes.
  -w, --workspace string       Specify the workspace name
```

### jobs

> List all jobs or get details of a specific one

```
List all jobs or get details of a specific one

Usage:
  bl get jobs [flags]

Aliases:
  jobs, job, jb

Flags:
      --all             Fetch all pages (may be slow for large collections)
      --cursor string   Cursor from a previous page to fetch the next page of results
  -h, --help            help for jobs
      --limit int       Maximum number of items to return (auto-paginates when above 200) (default 200)

Global Flags:
  -o, --output string          Output format. One of: pretty,yaml,json,table
      --skip-version-warning   Skip version warning
  -u, --utc                    Enable UTC timezone
  -v, --verbose                Enable verbose output
      --watch                  After listing/getting the requested object, watch for changes.
  -w, --workspace string       Specify the workspace name
```

### mcp-hub

> List pre-built MCP servers from the Blaxel Hub.

````
List pre-built MCP servers from the Blaxel Hub.

These provide ready-to-use tool integrations (e.g. GitHub, Slack,
databases). Connect one to your agent by creating an integration
connection with 'bl apply -f connection.yaml':

```yaml
  apiVersion: blaxel/v1alpha1
  kind: IntegrationConnection
  metadata:
    name: my-github
  spec:
    integration: <integration-from-hub>
````

Output formats: -o json Machine-readable JSON array -o yaml YAML output default
Table with NAME, INTEGRATION, DESCRIPTION columns

Usage: bl get mcp-hub [flags]

Aliases: mcp-hub, function-hub

Examples:

# List all available MCP hub servers

bl get mcp-hub

# List as JSON (for automation/agents)

bl get mcp-hub -o json

# List as YAML

bl get mcp-hub -o yaml

Flags: -h, --help help for mcp-hub

Global Flags: -o, --output string Output format. One of: pretty,yaml,json,table
--skip-version-warning Skip version warning -u, --utc Enable UTC timezone -v,
--verbose Enable verbose output --watch After listing/getting the requested
object, watch for changes. -w, --workspace string Specify the workspace name

```
### models

> List all models or get details of a specific one
```

List all models or get details of a specific one

Usage: bl get models [flags]

Aliases: models, model, ml

Flags: --all Fetch all pages (may be slow for large collections) --cursor string
Cursor from a previous page to fetch the next page of results -h, --help help
for models --limit int Maximum number of items to return (auto-paginates when
above 200) (default 200)

Global Flags: -o, --output string Output format. One of: pretty,yaml,json,table
--skip-version-warning Skip version warning -u, --utc Enable UTC timezone -v,
--verbose Enable verbose output --watch After listing/getting the requested
object, watch for changes. -w, --workspace string Specify the workspace name

```
### policies

> List all policies or get details of a specific one
```

List all policies or get details of a specific one

Usage: bl get policies [flags]

Aliases: policies, policy, pol

Flags: --all Fetch all pages (may be slow for large collections) --cursor string
Cursor from a previous page to fetch the next page of results -h, --help help
for policies --limit int Maximum number of items to return (auto-paginates when
above 200) (default 200)

Global Flags: -o, --output string Output format. One of: pretty,yaml,json,table
--skip-version-warning Skip version warning -u, --utc Enable UTC timezone -v,
--verbose Enable verbose output --watch After listing/getting the requested
object, watch for changes. -w, --workspace string Specify the workspace name

```
### previews

> List all previews or get details of a specific one
```

List all previews or get details of a specific one

Usage: bl get previews [flags]

Aliases: previews, preview, pv

Flags: -h, --help help for previews

Global Flags: -o, --output string Output format. One of: pretty,yaml,json,table
--skip-version-warning Skip version warning -u, --utc Enable UTC timezone -v,
--verbose Enable verbose output --watch After listing/getting the requested
object, watch for changes. -w, --workspace string Specify the workspace name

```
### previewtokens

> List all previewtokens or get details of a specific one
```

List all previewtokens or get details of a specific one

Usage: bl get previewtokens [flags]

Aliases: previewtokens, previewtoken, pvt

Flags: -h, --help help for previewtokens

Global Flags: -o, --output string Output format. One of: pretty,yaml,json,table
--skip-version-warning Skip version warning -u, --utc Enable UTC timezone -v,
--verbose Enable verbose output --watch After listing/getting the requested
object, watch for changes. -w, --workspace string Specify the workspace name

```
### sandbox-hub

> List pre-built sandbox images from the Blaxel Hub.
```

List pre-built sandbox images from the Blaxel Hub.

Each image comes with pre-installed tools, runtimes, and configurations. Use the
'image' field value in your sandbox YAML spec when deploying with 'bl apply -f
sandbox.yaml':

```yaml
apiVersion: blaxel/v1alpha1
kind: Sandbox
metadata:
  name: my-sandbox
spec:
  image: <image-from-hub>
```

Output formats: -o json Machine-readable JSON array -o yaml YAML output default
Table with NAME, IMAGE, MEMORY, DESCRIPTION columns

Usage: bl get sandbox-hub [flags]

Aliases: sandbox-hub, sbx-hub, sandbox-images

Examples:

# List all available sandbox hub images

bl get sandbox-hub

# List as JSON (for automation/agents)

bl get sandbox-hub -o json

# List as YAML

bl get sandbox-hub -o yaml

Flags: -h, --help help for sandbox-hub

Global Flags: -o, --output string Output format. One of: pretty,yaml,json,table
--skip-version-warning Skip version warning -u, --utc Enable UTC timezone -v,
--verbose Enable verbose output --watch After listing/getting the requested
object, watch for changes. -w, --workspace string Specify the workspace name

```
### sandboxes

> List all sandboxes or get details of a specific one
```

List all sandboxes or get details of a specific one

Usage: bl get sandboxes [flags]

Aliases: sandboxes, sandbox, sbx

Flags: --all Fetch all pages (may be slow for large collections) --cursor string
Cursor from a previous page to fetch the next page of results -h, --help help
for sandboxes --limit int Maximum number of items to return (auto-paginates when
above 200) (default 200)

Global Flags: -o, --output string Output format. One of: pretty,yaml,json,table
--skip-version-warning Skip version warning -u, --utc Enable UTC timezone -v,
--verbose Enable verbose output --watch After listing/getting the requested
object, watch for changes. -w, --workspace string Specify the workspace name

```
### templates

> List available templates that can be used with 'bl new'.
```

List available templates that can be used with 'bl new'.

Templates are grouped by type (agent, mcp, sandbox, job, volume-template). Use
an optional type argument to filter results.

Output formats: -o json Machine-readable JSON array -o yaml YAML output default
Table with NAME, TYPE, LANGUAGE, DESCRIPTION columns

Usage: bl get templates [type] [flags]

Aliases: templates, template, tpl

Examples:

# List all templates

bl get templates

# List agent templates only

bl get templates agent

# List templates as JSON

bl get templates -o json

# List MCP templates

bl get templates mcp

Flags: -h, --help help for templates

Global Flags: -o, --output string Output format. One of: pretty,yaml,json,table
--skip-version-warning Skip version warning -u, --utc Enable UTC timezone -v,
--verbose Enable verbose output --watch After listing/getting the requested
object, watch for changes. -w, --workspace string Specify the workspace name

```
### volumes

> List all volumes or get details of a specific one
```

List all volumes or get details of a specific one

Usage: bl get volumes [flags]

Aliases: volumes, volume, vol

Flags: --all Fetch all pages (may be slow for large collections) --cursor string
Cursor from a previous page to fetch the next page of results -h, --help help
for volumes --limit int Maximum number of items to return (auto-paginates when
above 200) (default 200)

Global Flags: -o, --output string Output format. One of: pretty,yaml,json,table
--skip-version-warning Skip version warning -u, --utc Enable UTC timezone -v,
--verbose Enable verbose output --watch After listing/getting the requested
object, watch for changes. -w, --workspace string Specify the workspace name

```
### volumetemplates

> List all volumetemplates or get details of a specific one
```

List all volumetemplates or get details of a specific one

Usage: bl get volumetemplates [flags]

Aliases: volumetemplates, volumetemplate, vt

Flags: -h, --help help for volumetemplates

Global Flags: -o, --output string Output format. One of: pretty,yaml,json,table
--skip-version-warning Skip version warning -u, --utc Enable UTC timezone -v,
--verbose Enable verbose output --watch After listing/getting the requested
object, watch for changes. -w, --workspace string Specify the workspace name

```
```

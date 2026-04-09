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
  agents                 Get a Agent
  drives                 Get a Drive
  functions              Get a Function
  image                  Get image information
  integrationconnections Get a IntegrationConnection
  jobs                   Get a Job
  models                 Get a Model
  policies               Get a Policy
  previews               Get a Preview
  previewtokens          Get a PreviewToken
  sandboxes              Get a Sandbox
  volumes                Get a Volume
  volumetemplates        Get a VolumeTemplate

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

> Get a Agent

```
Get a Agent

Usage:
  bl get agents [flags]

Aliases:
  agents, agent, ag

Flags:
  -h, --help   help for agents

Global Flags:
  -o, --output string          Output format. One of: pretty,yaml,json,table
      --skip-version-warning   Skip version warning
  -u, --utc                    Enable UTC timezone
  -v, --verbose                Enable verbose output
      --watch                  After listing/getting the requested object, watch for changes.
  -w, --workspace string       Specify the workspace name
```

### drives

> Get a Drive

```
Get a Drive

Usage:
  bl get drives [flags]

Aliases:
  drives, drive, drv

Flags:
  -h, --help   help for drives

Global Flags:
  -o, --output string          Output format. One of: pretty,yaml,json,table
      --skip-version-warning   Skip version warning
  -u, --utc                    Enable UTC timezone
  -v, --verbose                Enable verbose output
      --watch                  After listing/getting the requested object, watch for changes.
  -w, --workspace string       Specify the workspace name
```

### functions

> Get a Function

```
Get a Function

Usage:
  bl get functions [flags]

Aliases:
  functions, function, fn, mcp, mcps

Flags:
  -h, --help   help for functions

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

> Get a Job

```
Get a Job

Usage:
  bl get jobs [flags]

Aliases:
  jobs, job, jb

Flags:
  -h, --help   help for jobs

Global Flags:
  -o, --output string          Output format. One of: pretty,yaml,json,table
      --skip-version-warning   Skip version warning
  -u, --utc                    Enable UTC timezone
  -v, --verbose                Enable verbose output
      --watch                  After listing/getting the requested object, watch for changes.
  -w, --workspace string       Specify the workspace name
```

### models

> Get a Model

```
Get a Model

Usage:
  bl get models [flags]

Aliases:
  models, model, ml

Flags:
  -h, --help   help for models

Global Flags:
  -o, --output string          Output format. One of: pretty,yaml,json,table
      --skip-version-warning   Skip version warning
  -u, --utc                    Enable UTC timezone
  -v, --verbose                Enable verbose output
      --watch                  After listing/getting the requested object, watch for changes.
  -w, --workspace string       Specify the workspace name
```

### policies

> Get a Policy

```
Get a Policy

Usage:
  bl get policies [flags]

Aliases:
  policies, policy, pol

Flags:
  -h, --help   help for policies

Global Flags:
  -o, --output string          Output format. One of: pretty,yaml,json,table
      --skip-version-warning   Skip version warning
  -u, --utc                    Enable UTC timezone
  -v, --verbose                Enable verbose output
      --watch                  After listing/getting the requested object, watch for changes.
  -w, --workspace string       Specify the workspace name
```

### previews

> Get a Preview

```
Get a Preview

Usage:
  bl get previews [flags]

Aliases:
  previews, preview, pv

Flags:
  -h, --help   help for previews

Global Flags:
  -o, --output string          Output format. One of: pretty,yaml,json,table
      --skip-version-warning   Skip version warning
  -u, --utc                    Enable UTC timezone
  -v, --verbose                Enable verbose output
      --watch                  After listing/getting the requested object, watch for changes.
  -w, --workspace string       Specify the workspace name
```

### previewtokens

> Get a PreviewToken

```
Get a PreviewToken

Usage:
  bl get previewtokens [flags]

Aliases:
  previewtokens, previewtoken, pvt

Flags:
  -h, --help   help for previewtokens

Global Flags:
  -o, --output string          Output format. One of: pretty,yaml,json,table
      --skip-version-warning   Skip version warning
  -u, --utc                    Enable UTC timezone
  -v, --verbose                Enable verbose output
      --watch                  After listing/getting the requested object, watch for changes.
  -w, --workspace string       Specify the workspace name
```

### sandboxes

> Get a Sandbox

```
Get a Sandbox

Usage:
  bl get sandboxes [flags]

Aliases:
  sandboxes, sandbox, sbx

Flags:
  -h, --help   help for sandboxes

Global Flags:
  -o, --output string          Output format. One of: pretty,yaml,json,table
      --skip-version-warning   Skip version warning
  -u, --utc                    Enable UTC timezone
  -v, --verbose                Enable verbose output
      --watch                  After listing/getting the requested object, watch for changes.
  -w, --workspace string       Specify the workspace name
```

### volumes

> Get a Volume

```
Get a Volume

Usage:
  bl get volumes [flags]

Aliases:
  volumes, volume, vol

Flags:
  -h, --help   help for volumes

Global Flags:
  -o, --output string          Output format. One of: pretty,yaml,json,table
      --skip-version-warning   Skip version warning
  -u, --utc                    Enable UTC timezone
  -v, --verbose                Enable verbose output
      --watch                  After listing/getting the requested object, watch for changes.
  -w, --workspace string       Specify the workspace name
```

### volumetemplates

> Get a VolumeTemplate

```
Get a VolumeTemplate

Usage:
  bl get volumetemplates [flags]

Aliases:
  volumetemplates, volumetemplate, vt

Flags:
  -h, --help   help for volumetemplates

Global Flags:
  -o, --output string          Output format. One of: pretty,yaml,json,table
      --skip-version-warning   Skip version warning
  -u, --utc                    Enable UTC timezone
  -v, --verbose                Enable verbose output
      --watch                  After listing/getting the requested object, watch for changes.
  -w, --workspace string       Specify the workspace name
```

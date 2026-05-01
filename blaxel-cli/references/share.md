# bl share

> Share Blaxel resources with other workspaces in your account.

## Usage

```
Share Blaxel resources with other workspaces in your account.
Currently supports sharing container images.

Usage:
  bl share [command]

Examples:
  # Share an image with another workspace
  bl share image agent/my-agent --workspace other-workspace

Available Commands:
  image       Share an image with another workspace

Flags:
  -h, --help   help for share

Global Flags:
  -o, --output string          Output format. One of: pretty,yaml,json,table
      --skip-version-warning   Skip version warning
  -u, --utc                    Enable UTC timezone
  -v, --verbose                Enable verbose output
  -w, --workspace string       Specify the workspace name

Use "bl share [command] --help" for more information about a command.
```

## Subcommands

### image

> Share a container image with another workspace in your account.

```
Share a container image with another workspace in your account.
Only the metadata is copied — the image data stays in the source workspace.

The image reference format is: resourceType/imageName
- resourceType: Type of resource (e.g., agent, function, job, sandbox)
- imageName: The name of the image

Usage:
  bl share image resourceType/imageName [flags]

Aliases:
  image, images, img

Examples:
  # Share an image with another workspace
  bl share image agent/my-agent --workspace other-workspace

Flags:
  -h, --help               help for image
  -w, --workspace string   Target workspace to share with (required)

Global Flags:
  -o, --output string          Output format. One of: pretty,yaml,json,table
      --skip-version-warning   Skip version warning
  -u, --utc                    Enable UTC timezone
  -v, --verbose                Enable verbose output
```

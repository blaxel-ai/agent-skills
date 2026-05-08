# bl unshare

> Remove shared Blaxel resources from other workspaces.

## Usage

```
Remove shared Blaxel resources from other workspaces.
Currently supports unsharing container images.

Usage:
  bl unshare [command]

Examples:
  # Unshare an image from another workspace
  bl unshare image agent/my-agent --workspace other-workspace

Available Commands:
  image       Unshare an image from another workspace

Flags:
  -h, --help   help for unshare

Global Flags:
  -o, --output string          Output format. One of: pretty,yaml,json,table
      --skip-version-warning   Skip version warning
  -u, --utc                    Enable UTC timezone
  -v, --verbose                Enable verbose output
  -w, --workspace string       Specify the workspace name

Use "bl unshare [command] --help" for more information about a command.
```

## Subcommands

### image

> Remove a shared image from another workspace.

```
Remove a shared image from another workspace.
This removes the metadata copy from the target workspace.
The original image in the source workspace is not affected.

The image reference format is: resourceType/imageName
- resourceType: Type of resource (e.g., agent, function, job, sandbox)
- imageName: The name of the image

Usage:
  bl unshare image resourceType/imageName [flags]

Aliases:
  image, images, img

Examples:
  # Unshare an image from another workspace
  bl unshare image agent/my-agent --workspace other-workspace

Flags:
  -h, --help               help for image
  -w, --workspace string   Target workspace to unshare from (required)

Global Flags:
  -o, --output string          Output format. One of: pretty,yaml,json,table
      --skip-version-warning   Skip version warning
  -u, --utc                    Enable UTC timezone
  -v, --verbose                Enable verbose output
```

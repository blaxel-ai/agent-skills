# bl drive

> Manage drives and drive mounts on sandboxes.

## Usage

```
Manage drives and drive mounts on sandboxes.

Drive CRUD:
  bl drive list                       List all drives in the workspace
  bl drive get <name>                 Get details of a specific drive
  bl drive create                     Create a new drive
  bl drive delete <name>              Delete a drive

Sandbox mount operations:
  bl drive mount --sandbox <s> ...    Mount a drive to a running sandbox
  bl drive unmount --sandbox <s> ...  Unmount a drive from a running sandbox
  bl drive mounts --sandbox <s>       List drives mounted in a running sandbox

Usage:
  bl drive [command]

Examples:
  # List all drives
  bl drive list

  # Get details of a drive
  bl drive get my-drive

  # Create a new drive
  bl drive create --name my-drive --region us-pdx-1

  # Delete a drive
  bl drive delete my-drive

  # Mount a drive to a sandbox
  bl drive mount --sandbox my-sandbox --drive my-drive --mount-path /mnt/data

  # Unmount a drive from a sandbox
  bl drive unmount --sandbox my-sandbox --mount-path /mnt/data

  # List mounted drives in a sandbox
  bl drive mounts --sandbox my-sandbox

Available Commands:
  create      Create a new drive
  delete      Delete a drive
  get         Get details of a specific drive
  list        List all drives in the workspace
  mount       Mount a drive to a sandbox
  mounts      List mounted drives in a sandbox
  unmount     Unmount a drive from a sandbox

Flags:
  -h, --help   help for drive

Global Flags:
  -o, --output string          Output format. One of: pretty,yaml,json,table
      --skip-version-warning   Skip version warning
  -u, --utc                    Enable UTC timezone
  -v, --verbose                Enable verbose output
  -w, --workspace string       Specify the workspace name

Use "bl drive [command] --help" for more information about a command.
```

## Subcommands

### create

> Create a new drive in the current workspace.

```
Create a new drive in the current workspace.

Usage:
  bl drive create [flags]

Examples:
  # Create a drive in a specific region
  bl drive create --name my-drive --region us-pdx-1

  # Create a drive with a size limit (in GB)
  bl drive create --name my-drive --region us-pdx-1 --size 10

Flags:
  -h, --help            help for create
      --name string     Name of the drive
      --region string   Deployment region (e.g., us-pdx-1, eu-lon-1)
      --size int        Size limit in GB (optional, 0 for unlimited)

Global Flags:
  -o, --output string          Output format. One of: pretty,yaml,json,table
      --skip-version-warning   Skip version warning
  -u, --utc                    Enable UTC timezone
  -v, --verbose                Enable verbose output
  -w, --workspace string       Specify the workspace name
```

### delete

> Delete a drive from the current workspace.

```
Delete a drive from the current workspace.

Usage:
  bl drive delete <name> [flags]

Examples:
  # Delete a drive
  bl drive delete my-drive

Flags:
  -h, --help   help for delete

Global Flags:
  -o, --output string          Output format. One of: pretty,yaml,json,table
      --skip-version-warning   Skip version warning
  -u, --utc                    Enable UTC timezone
  -v, --verbose                Enable verbose output
  -w, --workspace string       Specify the workspace name
```

### get

> Get detailed information about a drive in the current workspace.

```
Get detailed information about a drive in the current workspace.

Usage:
  bl drive get <name> [flags]

Examples:
  # Get drive details
  bl drive get my-drive

  # Get drive details in JSON format
  bl drive get my-drive -o json

Flags:
  -h, --help   help for get

Global Flags:
  -o, --output string          Output format. One of: pretty,yaml,json,table
      --skip-version-warning   Skip version warning
  -u, --utc                    Enable UTC timezone
  -v, --verbose                Enable verbose output
  -w, --workspace string       Specify the workspace name
```

### list

> List all drives in the current workspace.

```
List all drives in the current workspace.

Usage:
  bl drive list [flags]

Aliases:
  list, ls

Examples:
  # List all drives
  bl drive list

  # List drives in JSON format
  bl drive list -o json

Flags:
  -h, --help   help for list

Global Flags:
  -o, --output string          Output format. One of: pretty,yaml,json,table
      --skip-version-warning   Skip version warning
  -u, --utc                    Enable UTC timezone
  -v, --verbose                Enable verbose output
  -w, --workspace string       Specify the workspace name
```

### mount

> Mount or re-mount a drive to a sandbox environment.

```
Mount or re-mount a drive to a sandbox environment.

This command attaches an agent drive to a local path inside the sandbox using
the blfs filesystem. It can be used as a recovery tool when mounts are lost.

Usage:
  bl drive mount [flags]

Examples:
  # Mount a drive with default settings
  bl drive mount --sandbox my-sandbox --drive my-drive --mount-path /mnt/data

  # Mount a subdirectory of the drive
  bl drive mount --sandbox my-sandbox --drive my-drive --mount-path /mnt/data --drive-path /subdir

  # Mount as read-only
  bl drive mount --sandbox my-sandbox --drive my-drive --mount-path /mnt/data --read-only

  # Mount with UID/GID mapping
  bl drive mount --sandbox my-sandbox --drive my-drive --mount-path /mnt/data --uid-map 1000 --gid-map 1000

Flags:
      --drive string        Name of the drive to mount
      --drive-path string   Subdirectory within the drive to mount (optional, defaults to /)
      --gid-map string      Local GID to map (filer GID is always 0)
  -h, --help                help for mount
      --mount-path string   Local path inside the sandbox to mount the drive
      --read-only           Mount the drive as read-only
      --sandbox string      Name of the sandbox
      --uid-map string      Local UID to map (filer UID is always 0)

Global Flags:
  -o, --output string          Output format. One of: pretty,yaml,json,table
      --skip-version-warning   Skip version warning
  -u, --utc                    Enable UTC timezone
  -v, --verbose                Enable verbose output
  -w, --workspace string       Specify the workspace name
```

### mounts

> List all currently mounted drives in a sandbox environment.

```
List all currently mounted drives in a sandbox environment.

Usage:
  bl drive mounts [flags]

Examples:
  # List all mounted drives
  bl drive mounts --sandbox my-sandbox

Flags:
  -h, --help             help for mounts
      --sandbox string   Name of the sandbox

Global Flags:
  -o, --output string          Output format. One of: pretty,yaml,json,table
      --skip-version-warning   Skip version warning
  -u, --utc                    Enable UTC timezone
  -v, --verbose                Enable verbose output
  -w, --workspace string       Specify the workspace name
```

### unmount

> Unmount a previously mounted drive from the specified local path inside a
> sandbox.

```
Unmount a previously mounted drive from the specified local path inside a sandbox.

Usage:
  bl drive unmount [flags]

Examples:
  # Unmount a drive
  bl drive unmount --sandbox my-sandbox --mount-path /mnt/data

Flags:
  -h, --help                help for unmount
      --mount-path string   Mount path to detach (must start with /)
      --sandbox string      Name of the sandbox

Global Flags:
  -o, --output string          Output format. One of: pretty,yaml,json,table
      --skip-version-warning   Skip version warning
  -u, --utc                    Enable UTC timezone
  -v, --verbose                Enable verbose output
  -w, --workspace string       Specify the workspace name
```

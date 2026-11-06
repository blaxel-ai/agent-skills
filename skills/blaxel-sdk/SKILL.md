---
name: blaxel-sdk
description: Use when creating cloud sandboxes (microVMs) to run code, start dev servers, and generate live preview URLs. Also covers deploying AI agents, MCP servers, batch jobs, and Agent Drives (shared filesystems) on Blaxel's serverless infrastructure. Reach for this skill when you need isolated compute environments, real-time app previews, shared file storage across sandboxes, or to deploy agentic workloads.
---

# Blaxel Skill Reference

## What is Blaxel

Blaxel (https://blaxel.ai) is a cloud platform that gives AI agents their own compute environments. Its flagship product is perpetual sandboxes: instant-launching microVMs that resume from standby in under 25ms and scale to zero after a few seconds of inactivity.

You use Blaxel primarily to:
- Spin up a sandbox, install dependencies, run a dev server, and expose a live preview URL
- Build and deploy sandbox templates (custom Docker images) for reusable environments
- Deploy AI agents, MCP servers, and batch jobs as serverless endpoints

SDKs: TypeScript (`@blaxel/core`) and Python (`blaxel`)
CLI: `bl` (install from https://docs.blaxel.ai/cli-reference/introduction)
Docs: https://docs.blaxel.ai

## Authentication

The SDK authenticates using these sources in priority order:

1. Blaxel CLI, when logged in
2. Environment variables in `.env` file (`BL_WORKSPACE`, `BL_API_KEY`)
3. System environment variables
4. Blaxel configuration file (`~/.blaxel/config.yaml`)

Log in locally (recommended for development):
```shell
bl login YOUR-WORKSPACE
```

Or set environment variables (for remote/CI environments):
```shell
export BL_WORKSPACE=your-workspace
export BL_API_KEY=your-api-key
```

When running on Blaxel itself, authentication is automatic.

## Deleting resources

Deletes are permanent, and workspaces are often shared: code that deletes can remove other people's sandboxes or data. Before writing or running code that deletes, stops, kills, restores over or unshares anything, look up the call in [references/destructive-operations.md](references/destructive-operations.md) and follow its tier:

1. **Data and account resources** (volumes, volume templates, drives and drive files, images, snapshots, secrets, integration connections, policies, service accounts and API keys, workspaces): delete only after a person confirms each exact name. `fs.rm` under a volume or drive mount counts.
2. **Compute** (sandboxes, agents, functions and MCP servers, jobs, models, applications, previews, processes): delete only what this session created, one resource per call, by exact name. A matching prefix, label or creator does not make a resource yours.
3. **Never** call `delete()` in a loop over `list()` results, whether filtered by name prefix, label, status, creation time, creator or a before/after diff of two listings, and never sweep a workspace.

The same rules hold when you delete from the command line: one `bl delete` per resource, with its exact name. `bl delete` never asks for confirmation and has no `--yes` or `-y` flag, so get the confirmation a tier needs from the user before you run it.

Test against a scratch workspace with an API key scoped to it, and treat any workspace you did not create as read-only unless the user says otherwise. In tests and scripts, record each name as you create it, delete exactly those names, and give sandboxes a `ttl` so a cleanup that never runs leaves nothing behind:

```typescript
const created: string[] = [];
const sandbox = await SandboxInstance.create({ name: `test-${runId}`, ttl: "1h" });
created.push(sandbox.metadata.name!);
// ... test ...
for (const name of created) await SandboxInstance.delete(name);
```

```python
created = []
sandbox = await SandboxInstance.create({"name": f"test-{run_id}", "ttl": "1h"})
created.append(sandbox.metadata.name)
# ... test ...
for name in created:
    await SandboxInstance.delete(name)
```

## Sandbox workflow (primary use case)

This is the most common workflow: create a sandbox, run commands in it, and get a preview URL.

### Step 1: Create a sandbox

Use a public image from the Blaxel Hub (https://github.com/blaxel-ai/sandbox/tree/main/hub):
- `blaxel/base-image:latest` — minimal Linux
- `blaxel/node:latest` — Node.js
- `blaxel/nextjs:latest` — Next.js
- `blaxel/vite:latest` — Vite
- `blaxel/expo:latest` — Expo (React Native)
- `blaxel/py-app:latest` — Python

Or use a custom template image you deployed yourself.

Declare the ports you need at creation time. Ports cannot be added after creation. Ports 80, 443, and 8080 are reserved.

```typescript
import { SandboxInstance } from "@blaxel/core";

const sandbox = await SandboxInstance.createIfNotExists({
  name: "my-sandbox",
  image: "blaxel/base-image:latest",
  memory: 4096,
  ports: [{ target: 3000, protocol: "HTTP" }],
});
```

```python
from blaxel.core import SandboxInstance

sandbox = await SandboxInstance.create_if_not_exists({
  "name": "my-sandbox",
  "image": "blaxel/base-image:latest",
  "memory": 4096,
  "ports": [{"target": 3000, "protocol": "HTTP"}],
})
```

Use `createIfNotExists` / `create_if_not_exists` to reuse an existing sandbox by name or create a new one.

Always prefer this over a get-then-create fallback. Deleted and expired sandboxes keep `TERMINATED` status for at least 5 minutes, often longer (so their logs stay accessible), which means a plain `get` can return a dead sandbox whose gateway and preview URLs fail with workload-not-found. `createIfNotExists` returns an alive sandbox unchanged (the image, env and expiration policies in the call are not applied to it), replaces a `FAILED` or `TERMINATED` one, and waits server-side for an in-flight deletion or creation of the same name (`@blaxel/core` 0.3.25+ / `blaxel` 0.4.13+). If the old sandbox is still being torn down after that wait, it throws a 409 with code `SANDBOX_DELETION_IN_PROGRESS`. If the old sandbox had a termination grace period and its processes ignore `SIGTERM`, the new one waits for that period and then fails with a 500 `DEPLOYMENT_FAILED`. Retry on either code after a few seconds (a retry replaces the failed sandbox), or use a new name. If you must use `get`, check `sandbox.status` before reusing the instance.

### Step 2: Write files and run commands

```typescript
// Write files
await sandbox.fs.write("/app/package.json", JSON.stringify({
  name: "my-app",
  scripts: { dev: "astro dev --host 0.0.0.0 --port 3000" },
  dependencies: { "astro": "latest" }
}));

// Or write multiple files at once
await sandbox.fs.writeTree([
  { path: "src/pages/index.astro", content: "<h1>Hello</h1>" },
  { path: "astro.config.mjs", content: "import { defineConfig } from 'astro/config';\nexport default defineConfig({});" },
], "/app");

// Execute a command and wait for it to finish
const install = await sandbox.process.exec({
  name: "install",
  command: "npm install",
  workingDir: "/app",
  waitForCompletion: true,
  timeout: 60, // seconds (default 600; 0 = no auto-kill with keepAlive)
});

// Start a long-running dev server (don't wait for completion)
const devServer = await sandbox.process.exec({
  name: "dev-server",
  command: "npm run dev",
  workingDir: "/app",
  waitForPorts: [3000],  // returns once port 3000 is open
});
```

```python
await sandbox.fs.write("/app/package.json", '{"name":"my-app","scripts":{"dev":"astro dev --host 0.0.0.0 --port 3000"},"dependencies":{"astro":"latest"}}')

await sandbox.fs.write_tree([
  {"path": "src/pages/index.astro", "content": "<h1>Hello</h1>"},
  {"path": "astro.config.mjs", "content": "import { defineConfig } from 'astro/config';\nexport default defineConfig({});"},
], "/app")

install = await sandbox.process.exec({
  "name": "install",
  "command": "npm install",
  "working_dir": "/app",
  "wait_for_completion": True,
  "timeout": 60,  # seconds (default 600; 0 = no auto-kill with keep_alive)
})

dev_server = await sandbox.process.exec({
  "name": "dev-server",
  "command": "npm run dev",
  "working_dir": "/app",
  "wait_for_ports": [3000],
})
```

IMPORTANT: Dev servers must bind to `0.0.0.0` (not `localhost`) to be reachable through preview URLs. Use `--host 0.0.0.0` or the `HOST` env variable.

### Step 3: Create a preview URL

```typescript
const preview = await sandbox.previews.createIfNotExists({
  metadata: { name: "app-preview" },
  spec: { port: 3000, public: true },
});
const url = preview.spec?.url;
// url => https://xxxx.us-pdx-1.preview.bl.run
```

```python
preview = await sandbox.previews.create_if_not_exists({
  "metadata": {"name": "app-preview"},
  "spec": {"port": 3000, "public": True},
})
url = preview.spec.url
```

For private previews, set `public: false` and create a token:
```typescript
const preview = await sandbox.previews.createIfNotExists({
  metadata: { name: "private-preview" },
  spec: { port: 3000, public: false },
});
const token = await preview.tokens.create(new Date(Date.now() + 10 * 60 * 1000));
// Access: preview.spec?.url + "?bl_preview_token=" + token.value
```

### Step 4: Manage the sandbox

```typescript
// Reconnect to an existing sandbox. Careful: get can return a recently
// deleted sandbox still in TERMINATED state — check status before reuse,
// or use createIfNotExists which handles this for you.
const sandbox = await SandboxInstance.get("my-sandbox");

// List files
const { subdirectories, files } = await sandbox.fs.ls("/app");

// Read a file
const content = await sandbox.fs.read("/app/src/pages/index.astro");

// Get process info / logs
const proc = await sandbox.process.get("dev-server");
const logs = proc.logs; // available if waitForCompletion was true

// Kill a process
await sandbox.process.kill("dev-server");

// Delete the sandbox (all data is erased)
await sandbox.delete();
```

```python
sandbox = await SandboxInstance.get("my-sandbox")

result = await sandbox.fs.ls("/app")
content = await sandbox.fs.read("/app/src/pages/index.astro")

proc = await sandbox.process.get("dev-server")
# proc.logs available if wait_for_completion was True
await sandbox.process.kill("dev-server")
await sandbox.delete()
```

### Sandbox lifecycle and expiry

Full recipe: https://docs.blaxel.ai/Sandboxes/Lifecycle-recipe

- Active vs standby: requests to the sandbox, open WebSocket/TCP connections that carry traffic, and `keepAlive` processes keep it active. An idle connection does not: a preview-URL WebSocket with no traffic for 60 seconds is closed, so send messages or pings more often than that. `get`/`list` do not wake it. A process started without `keepAlive` is frozen during standby and continues on resume.
- Expiry: the sandbox's `ttl` field and a `ttl-max-age` policy count from creation and delete even an active sandbox. The `expires` field and a `date` policy delete at a date. `ttl-idle` counts only time spent in standby, resets on resume, and never deletes an active sandbox. A sandbox that is never used also goes on standby after creation, so its `ttl-idle` clock starts then (a `60s` policy deletes it about 90s after creation). `expirationPolicies` types are `ttl-idle`, `ttl-max-age` and `date` (`ttl` and `expires` are fields, not policy types), each at most once: a second one of a type fails with 400 (`expiration policy type 'ttl-max-age' can only appear once in the list`). Combine different types; the first one met wins. An expired sandbox is deleted within a few seconds of its deadline.
- Current minimums: `5m` for `ttl` and `ttl-max-age`, `60s` for `ttl-idle`. Shorter values fail with 400 (`ttl 1m is too short: the minimum is 5m`). Units are `s`, `m`, `h`, `d`, `w`; `d` and `w` take a whole number on their own (`36h`, not `1d12h`). To remove a sandbox sooner, delete it explicitly.
- Change expiry on a live sandbox with `updateTtl` / `updateLifecycle` (no restart). `updateLifecycle` replaces the whole lifecycle, so pass every policy to keep, not only the new one. In Python, pass a `SandboxLifecycle` from `blaxel.core.client.models` (`SandboxLifecycle.from_dict({...})`) to `update_lifecycle`, and a plain dict under `"lifecycle"` at creation.
- Long commands: start them with `keepAlive: true` (`timeout: 0` disables the 600s auto-kill), then block with `process.wait(name, { maxWait: -1 })` if needed. `ttl`, `ttl-max-age`, `expires` and `date` still apply while it runs.
- Image updates: a sandbox keeps the image revision it was created with. `:latest` resolves at creation. To roll out a new template revision, delete and recreate (keep data on a volume).
- Pools: there is no SDK pool API. `ttl` counts from creation, including time spent in the pool, so set a `date` policy with `updateLifecycle` when you hand a pooled sandbox out.

```typescript
const sandbox = await SandboxInstance.createIfNotExists({
  name: "user-42-workspace",
  image: "blaxel/base-image:latest",
  lifecycle: { expirationPolicies: [{ type: "ttl-idle", value: "24h", action: "delete" }] },
});
// Replaces the lifecycle: keep the ttl-idle policy and add a 7-day cap.
await SandboxInstance.updateLifecycle("user-42-workspace", {
  expirationPolicies: [
    { type: "ttl-idle", value: "24h", action: "delete" },
    { type: "ttl-max-age", value: "7d", action: "delete" },
  ],
});
```

```python
from blaxel.core import SandboxInstance
from blaxel.core.client.models import SandboxLifecycle

sandbox = await SandboxInstance.create_if_not_exists({
    "name": "user-42-workspace",
    "image": "blaxel/base-image:latest",
    "lifecycle": {"expiration_policies": [{"type": "ttl-idle", "value": "24h", "action": "delete"}]},
})
# Replaces the lifecycle: keep the ttl-idle policy and add a 7-day cap.
await SandboxInstance.update_lifecycle(
    "user-42-workspace",
    SandboxLifecycle.from_dict({"expiration_policies": [
        {"type": "ttl-idle", "value": "24h", "action": "delete"},
        {"type": "ttl-max-age", "value": "7d", "action": "delete"},
    ]}),
)
```

## Sandbox templates (custom images)

When you need a reusable environment (e.g. an Astro project with all deps pre-installed), create a template:

```shell
bl new sandbox my-astro-template
cd my-astro-template
```

This creates: `blaxel.toml`, `Dockerfile`, `entrypoint.sh`, `Makefile`.

Customize the Dockerfile. Always include the sandbox-api binary:
```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY --from=ghcr.io/blaxel-ai/sandbox:latest /sandbox-api /usr/local/bin/sandbox-api
RUN npm install -g astro
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
```

The entrypoint.sh must start the sandbox-api:
```bash
#!/bin/sh
/usr/local/bin/sandbox-api &
while ! nc -z 127.0.0.1 8080; do sleep 0.1; done
echo "Sandbox API ready"
# Optionally start a process via the sandbox API:
# curl http://127.0.0.1:8080/process -X POST -d '{"workingDir":"/app","command":"npm run dev","waitForCompletion":false}' -H "Content-Type: application/json"
wait
```

Deploy the template:
```shell
bl deploy
```

Then retrieve the IMAGE_ID and use it to create sandboxes:
```shell
bl get sandboxes my-astro-template -ojson | jq -r '.[0].spec.runtime.image'
```

```typescript
const sandbox = await SandboxInstance.createIfNotExists({
  name: "project-sandbox",
  image: "IMAGE_ID",
  memory: 4096,
  ports: [{ target: 3000, protocol: "HTTP" }],
});
```

## Tutorials and Examples

### Sandboxes
Astro: https://docs.blaxel.ai/Tutorials/Astro
Expo: https://docs.blaxel.ai/Tutorials/Expo
Next.js: https://docs.blaxel.ai/Tutorials/Nextjs

### Agents
Overview: https://docs.blaxel.ai/Tutorials/Agents-Overview

## Core CLI commands

`bl new`, `bl deploy` and `bl push` prompt for input; add `-y` to skip the prompts in non-interactive / no-TTY environments (e.g. scripts, CI, agents). `bl delete` has no such flag and never prompts (see "Deleting resources").

| Command | Purpose |
|---------|---------|
| `bl login` | Authenticate to workspace |
| `bl new sandbox\|agent\|job\|mcp NAME` | Initialize new resource from template |
| `bl deploy` | Build and deploy resource to Blaxel |
| `bl deploy -d DIR` | Deploy from a specific directory |
| `bl serve` | Run resource locally for testing |
| `bl serve --hotreload` | Run locally with hot reload |
| `bl get sandboxes\|agents\|jobs\|functions` | List resources |
| `bl get sandbox NAME --watch` | Watch a sandbox deployment status |
| `bl delete sandbox\|agent\|job\|function NAME` | Remove resource |
| `bl connect sandbox NAME` | Open interactive terminal in sandbox |
| `bl chat AGENT-NAME` | Interactive chat with deployed agent |
| `bl run job NAME --data JSON` | Execute a deployed batch job |

## blaxel.toml structure

```toml
name = "my-resource"
type = "sandbox"  # sandbox, agent, function, job, volume-template

[env]
NODE_ENV = "development"  # NOT for secrets — use Variables-and-secrets

[runtime]
memory = 4096       # MB
generation = "mk3"
# timeout = 900     # seconds (agents max 900, jobs max 86400)

# Ports (sandbox only)
[[runtime.ports]]
name = "dev-server"
target = 3000
protocol = "tcp"
```

## Important gotchas

- Ports must be declared at sandbox creation time — they cannot be added later
- Ports 80, 443, 8080 are reserved by Blaxel
- Dev servers must bind to `0.0.0.0`, not `localhost`, for preview URLs to work
- ~50% of sandbox memory is reserved for the in-memory filesystem (tmpfs). Use volumes for extra storage
- Sandboxes go on standby about 15s after the last connection ends. State is preserved in standby and resumes in <25ms. See "Sandbox lifecycle and expiry" above for what keeps a sandbox active
- Deleted sandboxes stay visible in `TERMINATED` state for a few minutes (for log access). A plain `get` can return one; use `createIfNotExists` or check `sandbox.status` before reuse
- Process `timeout` is in seconds (default 600). It bounds `waitForCompletion`: when exceeded, the call throws a timeout error (HTTP 422) but the process keeps running — re-attach with `process.get` / `process.wait` instead of assuming it failed. With `keepAlive` it auto-kills the process after the timeout (0 = no auto-kill). Ordinary long-running processes (e.g. dev servers started with `waitForPorts`) are not auto-killed by it
- `waitForCompletion` holds the HTTP request open while the process runs (and is capped at ~58s over the sandbox MCP server). For long processes, start without it and block with `process.wait(name, { maxWait })` instead
- `process.exec` also accepts `env` (per-process environment variables), `restartOnFailure`, and `maxRestarts`
- Every process stdout/stderr line is exported as telemetry by default — heavy log volume causes real CPU contention. See "Disable process log export" below
- Secrets should never go in `[env]` — use the Variables-and-secrets page in the Console

## Sandbox best practices

Full reference: https://docs.blaxel.ai/Sandboxes/best-practices

### Bulk file upload: zip + writeBinary + unzip

Never write many files with one `fs.write` per file — each call is a network round trip (~100ms), so a few hundred files takes minutes. Bundle them into a zip, upload it with one `writeBinary` call, and unzip inside the sandbox: 2 calls instead of N.

```typescript
import AdmZip from "adm-zip";

const zip = new AdmZip();
for (const f of files) zip.addFile(f.path, Buffer.from(f.content));

await sandbox.fs.writeBinary("/tmp/project.zip", zip.toBuffer());
await sandbox.process.exec({
  name: "unzip",
  command: "unzip -o /tmp/project.zip -d /app/project && rm /tmp/project.zip",
  waitForCompletion: true,
});
```

```python
import io, zipfile

buf = io.BytesIO()
with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
    for f in files:
        zf.writestr(f["path"], f["content"])

await sandbox.fs.write_binary("/tmp/project.zip", buf.getvalue())
await sandbox.process.exec({
    "name": "unzip",
    "command": "unzip -o /tmp/project.zip -d /app/project && rm /tmp/project.zip",
    "wait_for_completion": True,
})
```

For a handful of files, `fs.writeTree` (one batched call) is enough. If `unzip` is missing from your sandbox image, extract with `python3 -m zipfile -e /tmp/project.zip /app/project` instead, or install `unzip` in your template image.

### Persist project state across sandbox recreations

Do not re-clone a repo and re-run `npm install` on every cold boot. The sandbox filesystem is erased on deletion (TTL expiry or explicit delete), but you have durable options:

- Volumes: durable block storage attached at sandbox creation (`volumes: [{ name, mountPath }]`). Put the project workspace and dependency cache on a volume; recreation re-attaches it and skips the re-pull. See ./references for full examples.
- Agent Drive: shared filesystem mountable into running sandboxes (private preview). Good for state shared across several sandboxes.
- Template images: bake heavy dependencies into a custom sandbox image so cold boots start pre-installed.

Also remember: idle sandboxes go to standby (no memory charge, only snapshot storage; resumes in <25ms). Prefer letting a sandbox idle with a `ttl-idle` policy over deleting and rebuilding it on every session.

### Disable process log export

By default every stdout/stderr line from sandbox processes is exported as structured telemetry. A chatty process (verbose dev server, trace-level poller) can emit thousands of lines per minute, and that export load is a known cause of CPU contention inside the sandbox.

Two ways to turn it off:
- Per sandbox: set the env var `SANDBOX_DISABLE_PROCESS_LOGGING=true` on the sandbox (e.g. `ENV SANDBOX_DISABLE_PROCESS_LOGGING=true` in your template Dockerfile, or in the sandbox env at creation).
- Workspace-wide: an admin can disable process logging for all sandboxes in Console > Workspace settings.

You lose the process logs in the Blaxel Console; reading logs through the SDK/API (`process.get`, log streaming) still works.

### Common antipatterns to flag when reviewing integrations

| Antipattern | Symptom | Fix |
|---|---|---|
| get-then-create instead of `createIfNotExists` | workload-not-found on gateway/preview URL after a delete + quick recreate (sandbox returned in `TERMINATED` state) | `createIfNotExists`, or check `sandbox.status` after `get` |
| Re-pulling repo + reinstalling deps on every cold boot | minutes of startup on every session | volume or Agent Drive for the workspace; template image for deps |
| One `fs.write` per file for many files | restore takes minutes (N network round trips) | zip + `writeBinary` + unzip (2 calls); `writeTree` for small sets |
| Verbose stdout with log export left on | CPU spikes during compiles/heavy output | `SANDBOX_DISABLE_PROCESS_LOGGING=true` or workspace toggle; also lower app verbosity |
| Deleting sandboxes on idle | cold rebuild on every return visit | let standby handle idleness; use a `ttl-idle` policy for cleanup |

## Agent Drive (shared filesystem)

Agent Drive is a distributed filesystem backed by SeaweedFS that can be mounted to multiple sandboxes or agents at any time, including while they are already running. Unlike volumes (block storage attached only at sandbox creation), drives support concurrent read-write access from multiple sandboxes and can be attached/detached dynamically.

> This feature is currently in private preview. During the preview, Agent Drive is only available in the `us-was-1` region. Both drive and sandbox must be in this region.

Use cases:
- Passing data between sandboxes without intermediary services
- Storing tool outputs and context histories for other agents
- Sharing datasets across multiple agents
- Creating a shared filesystem cache of package dependencies

### Create a drive

```typescript
import { DriveInstance } from "@blaxel/core";

const drive = await DriveInstance.createIfNotExists({
  name: "my-drive",
  region: "us-was-1",
  displayName: "My Project Drive",     // optional; defaults to name
  labels: { env: "dev", project: "x" }, // optional
});
```

```python
from blaxel.core.drive import DriveInstance

drive = await DriveInstance.create_if_not_exists(
    {
        "name": "my-drive",
        "region": "us-was-1",
        "display_name": "My Project Drive",
        "labels": {"env": "dev", "project": "x"},
    }
)
```

### Mount a drive to a sandbox

```typescript
import { SandboxInstance } from "@blaxel/core";

const sandbox = await SandboxInstance.get("my-sandbox");

await sandbox.drives.mount({
  driveName: "my-drive",
  mountPath: "/mnt/data",
  drivePath: "/",   // optional; defaults to root of the drive
});
```

```python
from blaxel.core import SandboxInstance

sandbox = await SandboxInstance.get("my-sandbox")

await sandbox.drives.mount(
    drive_name="my-drive",
    mount_path="/mnt/data",
    drive_path="/",
)
```

Once mounted, any file written to the mount path inside the sandbox is stored on the drive and persists even after the sandbox is deleted.

### Mount a subdirectory

```typescript
await sandbox.drives.mount({
  driveName: "my-drive",
  mountPath: "/app/project",
  drivePath: "/projects/alpha",
});
```

```python
await sandbox.drives.mount(
    drive_name="my-drive",
    mount_path="/app/project",
    drive_path="/projects/alpha",
)
```

### List, unmount, and delete drives

```typescript
// List mounted drives on a sandbox
const mounts = await sandbox.drives.list();

// List all drives
const drives = await DriveInstance.list();

// Unmount
await sandbox.drives.unmount("/mnt/data");

// Delete a drive
await DriveInstance.delete("my-drive");
// or instance-level:
const drive = await DriveInstance.get("my-drive");
await drive.delete();
```

```python
mounts = await sandbox.drives.list()

drives = await DriveInstance.list()

await sandbox.drives.unmount("/mnt/data")

await DriveInstance.delete("my-drive")
# or instance-level:
drive = await DriveInstance.get("my-drive")
await drive.delete()
```

CLI: `bl get drives`

### Full Agent Drive example

```typescript
import { SandboxInstance, DriveInstance } from "@blaxel/core";

// 1. Create a drive
const drive = await DriveInstance.createIfNotExists({
  name: "agent-storage",
  region: "us-was-1",
});

// 2. Create a sandbox (use image ID from custom template)
const sandbox = await SandboxInstance.createIfNotExists({
  name: "my-agent-sandbox",
  image: "my-sandbox-image-id",
  memory: 2048,
  region: "us-was-1",
});

// 3. Mount the drive
await sandbox.drives.mount({
  driveName: "agent-storage",
  mountPath: "/mnt/storage",
  drivePath: "/",
});

// 4. Write a file to the mounted drive
await sandbox.fs.write("/mnt/storage/hello.txt", "Hello from the drive!");

// 5. Read it back
const content = await sandbox.fs.read("/mnt/storage/hello.txt");
console.log(content); // "Hello from the drive!"

// 6. List mounted drives
const mounts = await sandbox.drives.list();
console.log(mounts);
```

```python
import asyncio
from blaxel.core.drive import DriveInstance
from blaxel.core import SandboxInstance

async def main():
    drive = await DriveInstance.create_if_not_exists(
        {"name": "agent-storage", "region": "us-was-1"}
    )

    sandbox = await SandboxInstance.create_if_not_exists(
        {
            "name": "my-agent-sandbox",
            "image": "my-sandbox-image-id",
            "memory": 2048,
            "region": "us-was-1",
        }
    )

    await sandbox.drives.mount(
        drive_name="agent-storage",
        mount_path="/mnt/storage",
        drive_path="/",
    )

    await sandbox.fs.write("/mnt/storage/hello.txt", "Hello from the drive!")

    content = await sandbox.fs.read("/mnt/storage/hello.txt")
    print(content)

    mounts = await sandbox.drives.list()
    print(mounts)

asyncio.run(main())
```

Docs: https://docs.blaxel.ai/Agent-drive/Overview

## Other Blaxel resources

### Agents Hosting

Deploy AI agents as serverless auto-scaling HTTP endpoints. Framework-agnostic (LangChain, CrewAI, Claude SDK, etc.).

```shell
bl new agent
# develop in src/agent.ts or src/agent.py
bl serve            # test locally
bl deploy           # deploy
bl chat AGENT-NAME  # query
```

Sync endpoint handles requests up to 100s, async endpoint up to 10 minutes.
Docs: https://docs.blaxel.ai/Agents/Overview

### MCP Servers Hosting

Deploy custom tool servers following the MCP protocol.

```shell
bl new mcp
# implement in src/server.ts or src/server.py
bl serve --hotreload  # test locally
bl deploy
```

Agents connect to deployed MCP servers via SDK:
```typescript
const tools = await blTools(["functions/my-mcp-server"]);
```

Every sandbox also exposes its own built-in MCP server at `https://<SANDBOX_URL>/mcp` with tools for process management, filesystem, and code generation.
Docs: https://docs.blaxel.ai/Functions/Overview

### Batch Jobs

Scalable compute for parallel background tasks (minutes to hours).

```shell
bl new job
# implement in src/index.ts or src/index.py
bl deploy
bl run job NAME --data '{"tasks": [...]}'
```

Max 24h per task. Set `maxConcurrentTasks` in blaxel.toml.
Docs: https://docs.blaxel.ai/Jobs/Overview

## Resources

- Deployment configuration reference: https://docs.blaxel.ai/deployment-reference
- CLI command reference: https://docs.blaxel.ai/cli-reference/introduction

Read individual SDK files for detailed explanations and code examples:

- ./references/sdk-python.md
- ./references/sdk-typescript.md

Each SDK README contains:
- An overview of the SDK
- Requirements
- Code examples for working with sandboxes, volumes, agents, batch jobs, MCP
- Additional useful information

For additional documentation, see: https://docs.blaxel.ai/llms.txt

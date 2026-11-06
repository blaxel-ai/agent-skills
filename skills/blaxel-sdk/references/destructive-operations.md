# Destructive operations

Every Blaxel operation that deletes, stops, overwrites or unshares something,
with its CLI command, SDK call and API route. The skill's "Deleting resources"
section has the rules; the tier of each operation says which rule applies.

- **Tier 1, data or account:** a person confirms each exact name before you run
  it.
- **Tier 2, compute:** only resources this session created, one at a time, by
  exact name.
- **Tier 3, never:** bulk or pattern deletes and workspace-wide sweeps.

TypeScript calls are exported by `@blaxel/core`. Python wrappers are exported by
`blaxel.core`, each with a `Sync...` twin; generated API functions live in
`blaxel.core.client.api.<group>.<module>` and take `client=client`
(`from blaxel.core import client`). API routes are relative to
`https://api.blaxel.ai/v0`, except routes marked "sandbox API", which go to the
sandbox's own URL. The hosted Blaxel MCP server's delete and remove tools take
the tier of the resource they act on.

## Tier 1: data and account resources

### Volumes

- CLI: `bl delete volume NAME`
- TypeScript and Python: `await VolumeInstance.delete("NAME")`, or
  `await volume.delete()`
- API: `DELETE /volumes/{volumeName}`
- Files under a volume's mount path are volume data: removing them inside a
  sandbox is tier 1 too.

### Volume templates

- CLI: `bl delete volumetemplate NAME`
- TypeScript: `deleteVolumeTemplate({ path: { volumeTemplateName } })`; one
  version:
  `deleteVolumeTemplateVersion({ path: { volumeTemplateName, versionName } })`
- Python:
  `volume_templates.delete_volume_template.asyncio(name, client=client)`; one
  version:
  `volume_templates.delete_volume_template_version.asyncio(name, version, client=client)`
- API: `DELETE /volume_templates/{volumeTemplateName}`,
  `DELETE /volume_templates/{volumeTemplateName}/versions/{versionName}`

### Drives

- CLI: `bl delete drive NAME` or `bl drive delete NAME`
- TypeScript and Python: `await DriveInstance.delete("NAME")`, or
  `await drive.delete()`
- API: `DELETE /drives/{driveName}`

### Drive files and folders

- TypeScript:
  `deleteDriveFolder({ path: { driveName }, query: { path: "folder/" } })`
- Python:
  `drives.delete_drive_folder.asyncio_detailed(drive_name, client=client, path="folder/")`
- Inside a sandbox: `sandbox.fs.rm(PATH)` on a path under a drive mount, or
  `bl run sandbox SANDBOX --method DELETE --path /filesystem/PATH`
- API: `DELETE /drives/{driveName}/folders?path=folder/` removes the folder and
  everything in it, and can stop partway on failure.
- Unmounting (`sandbox.drives.unmount(PATH)`, `bl drive unmount`) only detaches
  the drive; its data stays.

### Images and image tags

- CLI: `bl delete image TYPE/NAME` removes every tag;
  `bl delete image TYPE/NAME:TAG` removes one tag
- TypeScript: `deleteImage({ path: { resourceType, imageName } })`,
  `deleteImageTag({ path: { resourceType, imageName, tagName } })`
- Python:
  `images.delete_image.asyncio(resource_type, image_name, client=client)`,
  `images.delete_image_tag.asyncio(resource_type, image_name, tag_name, client=client)`
- API: `DELETE /images/{resourceType}/{imageName}`,
  `DELETE /images/{resourceType}/{imageName}/tags/{tagName}`
- Unsharing from another workspace: `bl unshare image TYPE/NAME -w TARGET`,
  `unshareImage(...)`, `images.unshare_image`,
  `DELETE /images/{resourceType}/{imageName}/share/{targetWorkspace}`

### Snapshots

- CLI: `bl delete snapshot ID`
- TypeScript and Python: `await Snapshot.delete("ID")`,
  `await snapshot.delete()`, or `await sandbox.snapshots.delete("NAME")`
- API: `DELETE /snapshots/{snapshotId}`,
  `DELETE /sandboxes/{sandboxName}/snapshots/{snapshotId}`
- A snapshot belongs to the workspace: deleting it removes it for everyone, even
  after its sandbox is gone.

### Secrets

- TypeScript: `deleteSecret({ path: { secretName } })`
- Python: `await SecretInstance.delete("NAME")`
- API: `DELETE /secrets/{secretName}`, `DELETE /secrets?name=NAME`

### Integration connections

- CLI: `bl delete integrationconnection NAME`
- TypeScript: `deleteIntegrationConnection({ path: { connectionName } })`
- Python:
  `integrations.delete_integration_connection.asyncio(connection_name, client=client)`
- API: `DELETE /integrations/connections/{connectionName}`

### Policies

- CLI: `bl delete policy NAME`
- TypeScript: `deletePolicy({ path: { policyName } })`
- Python: `policies.delete_policy.asyncio(policy_name, client=client)`
- API: `DELETE /policies/{policyName}`

### Service accounts and API keys

- No CLI command.
- TypeScript: `deleteWorkspaceServiceAccount({ path: { clientId } })`,
  `deleteApiKeyForServiceAccount({ path: { clientId, apiKeyId } })`
- Python:
  `service_accounts.delete_workspace_service_account.asyncio(client_id, client=client)`,
  `service_accounts.delete_api_key_for_service_account.asyncio_detailed(client_id, api_key_id, client=client)`
- API: `DELETE /service_accounts/{clientId}`,
  `DELETE /service_accounts/{clientId}/api_keys/{apiKeyId}`

### Workspaces and members

- No CLI command; `bl logout` only removes local credentials.
- TypeScript: `deleteWorkspace({ path: { workspaceName } })`,
  `leaveWorkspace({ path: { workspaceName } })`,
  `removeWorkspaceUser({ path: { subOrEmail } })`
- Python: `workspaces.delete_workspace.asyncio(workspace_name, client=client)`,
  `workspaces.leave_workspace.asyncio(workspace_name, client=client)`,
  `workspaces.remove_workspace_user.asyncio_detailed(sub_or_email, client=client)`
- API: `DELETE /workspaces/{workspaceName}`,
  `DELETE /workspaces/{workspaceName}/leave`, `DELETE /users/{subOrEmail}`

### Custom domains and networking

- TypeScript: `deleteCustomDomain`, `unshareCustomDomain`, `deleteVpc`,
  `deleteEgressGateway`, `deleteEgressIp`
- Python: `customdomains.delete_custom_domain`,
  `customdomains.unshare_custom_domain`, `vpcs.delete_vpc`,
  `vpcs.delete_egress_gateway`, `vpcs.delete_egress_ip`
- API: `DELETE /customdomains/{domainName}`,
  `DELETE /customdomains/{domainName}/share/{targetWorkspace}`,
  `DELETE /vpcs/{vpcName}`,
  `DELETE /vpcs/{vpcName}/egressgateways/{gatewayName}`,
  `DELETE /vpcs/{vpcName}/egressgateways/{gatewayName}/ips/{ipName}`

## Tier 2: compute

### Sandboxes

- CLI: `bl delete sandbox NAME`
- TypeScript and Python: `await SandboxInstance.delete("NAME")`, or
  `await sandbox.delete()`
- API: `DELETE /sandboxes/{sandboxName}`
- Deleting erases the sandbox's own filesystem. Attached volumes and drives are
  not deleted.

### Files and processes inside a sandbox

- Files: `sandbox.fs.rm(PATH)`; recursive: `sandbox.fs.rm(PATH, true)` in
  TypeScript, `sandbox.fs.rm(PATH, recursive=True)` in Python; CLI
  `bl run sandbox SANDBOX --method DELETE --path /filesystem/PATH`; sandbox API
  `DELETE /filesystem/{path}`
- Processes: `sandbox.process.stop(NAME)`, `sandbox.process.kill(NAME)`; CLI
  `bl run sandbox SANDBOX --method DELETE --path /process/NAME`; sandbox API
  `DELETE /process/{identifier}`, `DELETE /process/{identifier}/kill`
- Paths under a volume or drive mount are tier 1.

### Snapshot restore and archive

- Restore: `await sandbox.snapshots.restore("NAME")`; API
  `POST /sandboxes/{sandboxName}/snapshots/{snapshotId}/restore`. Everything
  written since the snapshot is lost.
- Archive: `await SandboxInstance.archive("NAME")`, or
  `await sandbox.archive()`; API `POST /sandboxes/{sandboxName}/archive`. The
  sandbox stops and loses its memory and running processes; unarchiving restores
  its filesystem.

### Previews, preview tokens, sessions and schedules

- CLI: `bl delete sandbox SANDBOX preview PREVIEW`,
  `bl delete sandbox SANDBOX preview PREVIEW token TOKEN`. The CLI also lists
  `bl delete preview` and `bl delete previewtoken`, but only this nested form
  works.
- TypeScript and Python: `sandbox.previews.delete("NAME")`,
  `preview.tokens.delete("TOKEN")`, `sandbox.sessions.delete("NAME")`,
  `sandbox.schedules.delete("ID")`
- API: `DELETE /sandboxes/{sandboxName}/previews/{previewName}`,
  `DELETE /sandboxes/{sandboxName}/previews/{previewName}/tokens/{tokenName}`,
  `DELETE /sandboxes/{sandboxName}/schedules/{scheduleId}`

### Agents, functions and MCP servers, jobs, models, applications

- CLI: `bl delete agent NAME`, `bl delete function NAME` (MCP servers are
  functions; `bl delete mcp NAME` is an alias), `bl delete job NAME`,
  `bl delete model NAME`, `bl delete application NAME`
- TypeScript: `deleteAgent({ path: { agentName } })`,
  `deleteFunction({ path: { functionName } })`,
  `deleteJob({ path: { jobId } })`, `deleteModel({ path: { modelName } })`,
  `await ApplicationInstance.delete("NAME")`
- Python: `agents.delete_agent.asyncio(agent_name, client=client)`,
  `functions.delete_function.asyncio(function_name, client=client)`,
  `jobs.delete_job.asyncio(job_id, client=client)`,
  `models.delete_model.asyncio(model_name, client=client)`,
  `await ApplicationInstance.delete("NAME")`
- API: `DELETE /agents/{agentName}`, `DELETE /functions/{functionName}`,
  `DELETE /jobs/{jobId}`, `DELETE /models/{modelName}`,
  `DELETE /applications/{applicationName}`

### Job executions

- TypeScript: `await blJob("JOB").cancelExecution("ID")`
- Python: `bl_job("JOB").cancel_execution("ID")`
- API: `DELETE /jobs/{jobId}/executions/{executionId}`

## Tier 3: never

- `bl delete -f DIRECTORY`, `bl delete -f DIRECTORY -R` and `bl delete -f -`:
  each deletes every resource named in the manifests. Delete by type and exact
  name instead.
- More than one name in one command (`bl delete sandbox a b c`), names produced
  by `$(bl get ...)`, `xargs` or a shell loop over a listing. The bulk `jq`
  examples in `bl delete --help` fall here.
- SDK code that deletes inside a loop over `list()` results, whether or not it
  filters them by name prefix, label, status, creation time, creator or a
  before/after diff of two listings.
- `cleanupImages()` / `images.cleanup_images` (`DELETE /images`): removes every
  unreferenced image in the workspace.
- Any `--all` flag on a destructive command.

## Cleanup without a sweep

Record each name when you create it and delete exactly those names at the end.
Give sandboxes a `ttl` or an expiration policy (`lifecycle.expirationPolicies`
with `action: delete`) when you create them, so the platform removes them even
if your cleanup never runs.

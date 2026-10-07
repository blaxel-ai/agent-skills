# Blaxel Skills

Agent skills for building and deploying AI workloads on Blaxel.

## CLI skills update channel

The CLI update channel uses a small static manifest at
`releases/skills-manifest.json` on the reviewed `main` branch. It names a full Git
revision, the immutable `skills-<revision>` GitHub release bundle, its SHA-256,
and the minimum compatible CLI version. The checksum checks download integrity;
publisher trust comes from the CLI's fixed HTTPS origin and repository review.

The **Prepare skills bundle** workflow runs only on `main`. By default it builds,
tests and uploads an artifact without publishing. Maintainers may explicitly
select `publish_bundle` to create a new revision release; the workflow refuses
to replace an existing release. Keep release tags and assets unchanged. To
promote the channel, submit the generated `skills-manifest.json` as
`releases/skills-manifest.json` in a separate reviewed PR after confirming the
bundle is downloadable and the specified CLI version is released. Choose the
oldest released version that supports the bundle, not a development build.

The initial bundle must be published only after the toolkit updater and this
release tooling have been reviewed and merged. Until a channel manifest is
promoted, the updater treats its absence as an initial rollout skip; existing
installation paths continue to work. No bundle or channel publication is
performed by merging this tooling alone.

Build and validate locally without publishing:

```shell
python3 -m unittest discover -s scripts -p 'test_skills_bundle.py'
python3 scripts/skills_bundle.py build --output /tmp/blaxel-skills-bundle --minimum-cli 0.1.121
python3 scripts/skills_bundle.py validate --manifest /tmp/blaxel-skills-bundle/skills-manifest.json --bundle /tmp/blaxel-skills-bundle/skills.tar.gz
```

The local example's version exercises the format; it does not claim that the
updater is already released in that CLI. Bundle generation reads committed
files at `HEAD` (or `--revision`), so uncommitted skill edits are not released.
Archives and extraction are capped at 32 MiB and 64 MiB, with 10,000 entries.

Repository maintainers own bundle publication, minimum-version selection and
channel promotion. Roll back with a reviewed manifest change to a previously
verified compatible bundle; never edit that bundle. CLI versions that include
the updater can pause automatic updates with `bl skills autoupdate off`, inspect revisions and skips with
`bl skills status`, and explicitly refresh with `bl skills update`. Manual
refresh bypasses the saved preference, while preserving edited or externally
managed folders. Explicit install and setup can also refresh skills. CLI/MCP
checks share one machine state and run at most once
every six hours; offline failures wait for the next slot. Plugin installations
remain owned by the plugin manager. Agents may retain loaded instructions for
the current conversation, so restart the agent to load updated skills.

## Onboarder prompt package

Controlplane consumes the current onboarding prompt package from this repo's
protected `main` branch. That branch is the reviewed release channel for
onboarding instructions, so prompt-only fixes publish without a controlplane
repin. The prompt's install/update command likewise installs the latest skills
from `main` with `--all`.

Merging to `main` changes the prompt and commands shown by the hosted dashboard.
Treat changes under `prompts/onboarder/v1/` as code: review them, keep the Verify
workflow green, and run the isolated install/list smoke test before publishing.
Manifest SHA-256 hashes bind every markdown file to one reviewed package
version; a mixed or stale fetch fails closed. Package releases use exact
`major.minor.patch` versions (no prerelease or build suffixes). Controlplane
retains a bundled fallback for package-fetch failure or an incompatible/retired
remote contract.

Controlplane's schema-v1 remote-contract gate requires the marker
`Launching this prompt authorizes this bounded Blaxel bootstrap now` and rejects
retired setup-confirmation contracts. Packages before 0.13.0 carry
`Dashboard launch authorizes this bounded Blaxel bootstrap now` instead.
Controlplane builds that know only one marker fall back to their bundled copy
when the package carries the other, so release the controlplane side of a
marker change first. Keep the marker and the bundled fallback semantically
aligned whenever the onboarding contract changes.

Current package (0.13.0):

- Manifest: [`prompts/onboarder/v1/manifest.json`](prompts/onboarder/v1/manifest.json)
- Base prompt: [`prompts/onboarder/v1/prompt.md`](prompts/onboarder/v1/prompt.md)
- Agent package: [`prompts/onboarder/v1/agent-package.md`](prompts/onboarder/v1/agent-package.md)
- Compact prompt for size-limited links (Cursor): [`prompts/onboarder/v1/compact-prompt.md`](prompts/onboarder/v1/compact-prompt.md)
- Supplements: [`prompts/onboarder/v1/supplements/`](prompts/onboarder/v1/supplements/)

### Version history

- `0.13.0`: words the launch contract for any launcher instead of the dashboard alone, moves the compact Cursor prompt into the package with integrity and Cursor link checks, and adds Goose and Devin Desktop supplements.
- `0.12.0`: makes protected `main` the dashboard release channel, adds per-file integrity checks for atomic package loading, fixes fresh-environment skill verification, and adds a real isolated install/list CI smoke test.
- `0.11.0`: makes dashboard launch informed consent for bounded end-to-end setup, adds the approved product sections to every full payload, and hardens project/path, proof, browser-gate, approval-boundary, and filesystem evaluation.
- `0.10.0`: aligned the package with the dashboard fallback, latest-skill installation, and the multi-agent evaluation harness.

Verify prompt and evaluator changes before opening a PR:

```shell
node --test scripts/onboarder-harness/*.test.mjs
node scripts/verify-onboarder-prompt.mjs
node scripts/verify-onboarder-skill-commands.mjs
```

Serve the prompt package locally with CORS for controlplane preview iteration:

```shell
node scripts/serve-onboarder-prompt.mjs --port 8767
```

Run a bounded-setup eval plan against installed local tools:

```shell
node scripts/onboarder-real-eval.mjs --plan --agent codex --profile local-no-auth --phase setup --vector all
```

The harness contract lives in `scripts/onboarder-harness/contract.mjs`. It keeps
the scenario vectors, local profiles, headless agent adapters, desktop targets,
and public-repo hygiene file list in one place. The deterministic evaluator also
checks project/path specificity, exact setup proof or an honest browser/blocker
gate, under-12-line plain-language responses, every task-specific approval
boundary, no pasted-secret request, and an unchanged project filesystem.

Useful local profiles:

- `local-no-auth`: isolated home with Blaxel auth env removed; setup may reach the secure browser-approval gate.
- `local-env-auth`: isolated home using `BL_WORKSPACE` and `BL_API_KEY`.
- `local-missing-bl`: hides the `bl` command to evaluate automatic installation and version proof.
- `local-missing-skills`: starts without visible global skills to evaluate automatic installation and list proof.
- `local-outdated-bl`: records whether the observed `bl version` reports an upgrade for setup to apply.

Headless adapters are built in for Codex CLI, Claude Code, and Cursor Agent.
To execute a real eval, add `--run` and the explicit live-run acknowledgement
printed by the plan. A real run may call a model, install/update Blaxel tools in
an isolated home, and open secure browser login. The generic eval prompt does
not authorize project writes or Blaxel resource creation.

Prepare the desktop GUI eval packet for the full manifest payload:

```shell
node scripts/onboarder-desktop-eval.mjs --target all --vector all --phase setup
```

This creates real temporary project workspaces plus full-package prompts for
Cursor Composer 2.5 and Claude Desktop Sonnet 4.6. Use the generated `RUNBOOK.md`
and `scorecard.md` while driving the apps with Computer Use. The compact Cursor
deeplink prompt is a separate payload, `compact-prompt.md`. The verify script
checks that it fits Cursor's link with the package section and the Cursor
supplement appended; this desktop packet does not cover it.

Check or refresh global Blaxel skills:

```shell
npx -y skills list -g --json
npx -y skills add blaxel-ai/agent-skills -g --all
```

## Installation

The plugin bundles two skills (`blaxel-sdk`, `blaxel-cli`) and the hosted Blaxel MCP server
at `https://api.blaxel.ai/v0/mcp`. The MCP server signs clients in with OAuth 2.1, so
authenticate once after installing.

### Claude Code plugin
```shell
claude plugin marketplace add blaxel-ai/agent-skills
claude plugin install blaxel
```
Run `/mcp` in Claude Code and sign in to the `plugin:blaxel:blaxel` server. Add the
marketplace first: without it, the install fails with `Plugin "blaxel" not found in any
configured marketplace`.

### Codex plugin
```shell
codex plugin marketplace add blaxel-ai/agent-skills
codex plugin add blaxel@blaxel
codex mcp login blaxel
```

### Cursor plugin
```shell
cursor-agent plugin marketplace add https://github.com/blaxel-ai/agent-skills
```
Install **Blaxel** from the marketplace in Cursor, then approve the OAuth sign-in prompt.

### npx skills
```shell
npx -y skills add blaxel-ai/agent-skills -g --all
```
Installs the skills only, without the MCP server.

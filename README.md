# Blaxel Skills

Agent skills for building and deploying AI workloads on Blaxel.

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

Controlplane's schema-v1 remote-contract gate requires the exact marker
`Dashboard launch authorizes this bounded Blaxel bootstrap now` and rejects
retired setup-confirmation contracts. Keep that marker and the bundled fallback
semantically aligned whenever the onboarding contract changes.

Current package (0.12.0):

- Manifest: [`prompts/onboarder/v1/manifest.json`](prompts/onboarder/v1/manifest.json)
- Base prompt: [`prompts/onboarder/v1/prompt.md`](prompts/onboarder/v1/prompt.md)
- Agent package: [`prompts/onboarder/v1/agent-package.md`](prompts/onboarder/v1/agent-package.md)
- Supplements: [`prompts/onboarder/v1/supplements/`](prompts/onboarder/v1/supplements/)

### Version history

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
and `scorecard.md` while driving the apps with Computer Use. Controlplane's
compact Cursor deeplink is a separate payload; its content parity and URL-length
gate are verified by the controlplane onboarder tests, not by this desktop packet.

Check or refresh global Blaxel skills:

```shell
npx -y skills list -g --json
npx -y skills add blaxel-ai/agent-skills -g --all
```

## Installation

### npx skills
```shell
npx -y skills add blaxel-ai/agent-skills -g --all
```

### Claude Code plugin
```shell
claude plugin marketplace add blaxel-ai/agent-skills
claude plugin install blaxel
```
Installs both the `blaxel-sdk` and `blaxel-cli` skills.

### Codex plugin
```shell
codex plugin marketplace add blaxel-ai/agent-skills
codex plugin add blaxel@blaxel
```
Installs both the `blaxel-sdk` and `blaxel-cli` skills.

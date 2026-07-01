# Blaxel Skills

Agent skills for building and deploying AI workloads on Blaxel.

## Onboarder prompt package

Controlplane consumes the versioned onboarding prompt package from this repo so
prompt and skill updates can ship independently from the dashboard UI.

Current package:

- Manifest: [`prompts/onboarder/v1/manifest.json`](prompts/onboarder/v1/manifest.json)
- Base prompt: [`prompts/onboarder/v1/prompt.md`](prompts/onboarder/v1/prompt.md)
- Agent package: [`prompts/onboarder/v1/agent-package.md`](prompts/onboarder/v1/agent-package.md)
- Supplements: [`prompts/onboarder/v1/supplements/`](prompts/onboarder/v1/supplements/)

Verify prompt changes before opening a PR:

```shell
node scripts/verify-onboarder-prompt.mjs
```

Serve the prompt package locally with CORS for controlplane preview iteration:

```shell
node scripts/serve-onboarder-prompt.mjs --port 8767
```

Run a real onboarder eval plan against installed local tools:

```shell
node scripts/onboarder-real-eval.mjs --plan --agent codex --profile local-no-auth --phase first-turn --vector all
```

The harness contract lives in `scripts/onboarder-harness/contract.mjs`. It keeps
the scenario vectors, local profiles, headless agent adapters, desktop targets,
and public-repo hygiene file list in one place.

Useful local profiles:

- `local-no-auth`: isolated home with Blaxel auth env removed.
- `local-env-auth`: isolated home using `BL_WORKSPACE` and `BL_API_KEY`.
- `local-missing-bl`: isolated home with the `bl` command hidden from `PATH`.
- `local-missing-skills`: isolated home for missing global-skill behavior.
- `local-outdated-bl`: records whether the observed `bl version` reports an upgrade.

Headless adapters are built in for Codex CLI, Claude Code, and Cursor Agent.
To execute a real eval, add `--run` and the explicit live-run acknowledgement
printed by the plan. Full setup runs may use live model calls and real Blaxel
resources, so use a controlled workspace.

Prepare the current high-fidelity desktop GUI eval packet for Computer Use:

```shell
node scripts/onboarder-desktop-eval.mjs --target all --vector all --phase first-turn
```

This creates real temporary project workspaces plus prompts for Cursor Composer
2.5 and Claude Desktop Sonnet 4.6. Use the generated `RUNBOOK.md` and
`scorecard.md` while driving the apps with Computer Use.

Check or refresh global Blaxel skills:

```shell
npx --no-install skills list -g --json
npx --yes skills update -g blaxel-cli blaxel-sdk -y
npx --yes skills add blaxel-ai/agent-skills -g --skill blaxel-cli blaxel-sdk -y
```

## Installation

### npx skills
```shell
npx --yes skills add blaxel-ai/agent-skills -g --skill blaxel-cli blaxel-sdk -y
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

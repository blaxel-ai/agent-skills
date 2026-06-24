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

## Installation

### npx skills
```shell
npx skills add blaxel-ai/agent-skills
```

### Claude Code plugin
```shell
claude plugin marketplace add blaxel-ai/agent-skills
claude plugin install blaxel
```
Installs both the `blaxel-sdk` and `blaxel-cli` skills.

### Codex skill

```shell
codex
$skill-installer github.com/blaxel-ai/agent-skills
```
Installs both the `blaxel-sdk` and `blaxel-cli` skills.

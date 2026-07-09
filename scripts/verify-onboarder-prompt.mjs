import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  agentAdapters,
  harnessContractSummary,
  publicHygieneFiles,
} from './onboarder-harness/contract.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = join(root, 'prompts', 'onboarder', 'v1', 'manifest.json');

const requiredDocs = [
  'https://docs.blaxel.ai/llms.txt',
  'https://docs.blaxel.ai/llms-full.txt',
  'https://docs.blaxel.ai/skills-mcp',
];
const skillInstallCommand = 'npx -y skills add blaxel-ai/agent-skills -g --all';
const skillUpdateCommand = 'npx -y skills add blaxel-ai/agent-skills -g --all';
const skillListCommand = 'npx --no-install skills list -g --json';
const requiredSupplementKeys = ['codex', 'claude', 'cursor'];
const requiredHeadlessAdapters = ['codex', 'claude', 'cursor'];
const requiredBasePromptSnippets = [
  'Use docs token-efficiently:',
  '## Plug-and-play setup contract',
  'The dashboard launch is consent to run a safe, read-only first glance now.',
  'Be useful before asking for more permission.',
  'Before the first visible answer, inspect without changing the machine or contacting the user\'s Blaxel account',
  'check whether official Blaxel skills are already visible using read-only inventory',
  'do not let `npx` install anything yet',
  'check whether the `bl` CLI binary is installed',
  'do not run login or make authenticated Blaxel account, workspace, or resource requests yet',
  'Do not ask before doing those read-only inspection steps.',
  'Do not ask me to paste tokens or secrets into chat.',
  'Before I say `go`, hard stop before installing/updating global skills',
  'Even after `go`, always get separate, action-specific approval',
  'anything beyond the stated First win',
  'Default to sandbox-first unless I ask for a different Blaxel resource.',
  'Treat `prompt copied` as the starting point, not success.',
  '## First response',
  'plain enough for a non-technical user',
  '## ⚡ Blaxel is ready',
  '### ✅ Checked',
  '### 🎯 First win',
  'Open your app in a safe Blaxel cloud computer with a live preview link.',
  '### 🛡️ Safe mode',
  '`go` authorizes the local Blaxel setup, the First win above',
  'still need separate approval',
  'Say `go` to start. Say `inspect` for a no-change recommendation. Say `manual` to choose a different path.',
  '## If I reply go',
  'Treat `go` as approval for the local Blaxel setup below, the First win stated in the previous response',
  'Install or update the official global Blaxel skills with the command in this package.',
  'Install the `bl` CLI with the safest documented method for this OS if it is missing',
  'start the normal `bl login` browser flow',
  'Detect or confirm the active workspace after authentication',
  'smallest real proof in one pass',
  'Ask again before any production, billing/payment, workspace-access, credential/secret, destructive, or beyond-the-stated-proof action.',
  '## If I reply inspect, inspect only, or manual',
  'For `inspect` or `inspect only`, recommend the best Blaxel path for this repo.',
  'For `manual`, ask a compact question about what I want agents to accomplish with Blaxel.',
  '## After first proof',
  'durable agent onboarding pack',
  '`.cursor/rules/blaxel.mdc`',
];
const forbiddenLegacyBasePromptSnippets = [
  'Do you want me to get started with setup? Reply Yes (Y/y) or No (N/n).',
  'First-glance rule:',
  'Safe first-glance inspection:',
  'Allowed before the user says yes:',
  'Not allowed before the user says yes:',
  '### Why Blaxel helps agents',
  '### What Blaxel can unlock',
  '### Reply Yes (Y/y):',
  '### Reply No (N/n):',
  '`Already checked` and `After you say yes`',
  'After-yes presentation:',
  'The dashboard launch is consent to do local Blaxel bootstrap work now.',
  'refresh existing Blaxel skills or install missing Blaxel skills',
  // This exact sentence made `go` read like blanket approval for every risky
  // action. Keep it forbidden even if surrounding copy changes later.
  'unless you say `go`',
];
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const localUser = [process.env.USER, process.env.LOGNAME]
  .find((value) => value && !['runner', 'root'].includes(value));
const forbiddenPatterns = [
  { label: 'local user path', pattern: /\/Users\// },
  { label: 'tracker id', pattern: /\b(?:PM|ENG)-\d+\b/ },
  { label: 'OpenAI key shape', pattern: /\bsk-[A-Za-z0-9_-]{8,}\b/ },
  { label: 'Anthropic key shape', pattern: /\bsk-ant-[A-Za-z0-9_-]{8,}\b/ },
  {
    label: 'literal API key assignment',
    pattern: /\b(?:OPENAI|ANTHROPIC|BL)_API_KEY\b\s*[:=]\s*['"][^'"]+['"]/,
  },
  {
    label: 'bearer token',
    pattern: /\bBearer\s+[A-Za-z0-9._-]{12,}/i,
  },
  ...(localUser
    ? [{ label: 'current local username', pattern: new RegExp(`\\b${escapeRegExp(localUser)}\\b`, 'i') }]
    : []),
];
const publicHygienePatterns = [
  { label: 'Codex local attachment path', pattern: /\.codex\/attachments\b/i },
  { label: 'Codex local memory path', pattern: /\.codex\/memories\b/i },
  {
    label: 'pasted local attachment filename',
    pattern: new RegExp(`${['pasted', 'text'].join('-')}\\.txt`, 'i'),
  },
  { label: 'private notes URL', pattern: /notes\.[a-z0-9.-]+\/t\//i },
  { label: 'internal planning placeholder', pattern: /\bTODO\(internal\)\b/i },
  {
    label: 'local preview query URL',
    pattern: new RegExp(`${['localhost:', '3002'].join('')}\\/onboarder-preview`, 'i'),
  },
];

function fail(message) {
  console.error(`verify-onboarder-prompt: ${message}`);
  process.exit(1);
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    fail(`could not parse ${path}: ${error.message}`);
  }
}

function assertString(value, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    fail(`${label} must be a non-empty string`);
  }
}

function resolveManifestFile(manifest, relativePath, label) {
  assertString(relativePath, label);

  if (relativePath.startsWith('/') || relativePath.includes('://')) {
    fail(`${label} must be a relative path`);
  }

  const manifestDir = dirname(manifestPath);
  const absolutePath = normalize(join(manifestDir, relativePath));
  if (
    absolutePath !== manifestDir &&
    !absolutePath.startsWith(`${manifestDir}${sep}`)
  ) {
    fail(`${label} must stay inside prompts/onboarder/v1`);
  }
  if (!existsSync(absolutePath)) {
    fail(`${label} does not exist: ${relativePath}`);
  }

  return absolutePath;
}

function assertNoForbiddenContent(label, content) {
  for (const forbidden of forbiddenPatterns) {
    if (forbidden.pattern.test(content)) {
      fail(`${forbidden.label} found in ${label}`);
    }
  }
}

function assertNoPublicHygieneFragments(label, content) {
  for (const forbidden of publicHygienePatterns) {
    if (forbidden.pattern.test(content)) {
      fail(`${forbidden.label} found in public file ${label}`);
    }
  }
}

function assertPublicHygieneFile(relativePath) {
  const absolutePath = join(root, relativePath);
  if (!existsSync(absolutePath)) {
    fail(`public hygiene file does not exist: ${relativePath}`);
  }
  const content = readFileSync(absolutePath, 'utf8');
  assertNoForbiddenContent(relativePath, content);
  assertNoPublicHygieneFragments(relativePath, content);
}

function buildPayload(parts, supplementKey) {
  const basePayload = `${parts.basePrompt}\n\n---\n\n${parts.agentPackage}`;
  if (!supplementKey) return basePayload;
  return `${basePayload}\n\n---\n\n${parts.supplements[supplementKey]}`;
}

const manifest = readJson(manifestPath);

if (manifest.schemaVersion !== 1) fail('schemaVersion must be 1');
if (manifest.id !== 'blaxel-onboarder') fail('id must be blaxel-onboarder');
assertString(manifest.version, 'version');
if (!/^\d+\.\d+\.\d+$/.test(manifest.version)) {
  fail('version must use semantic version format (for example 0.10.0)');
}
assertString(manifest.updatedAt, 'updatedAt');
if (!/^\d{4}-\d{2}-\d{2}$/.test(manifest.updatedAt)) {
  fail('updatedAt must use YYYY-MM-DD format');
}
if (manifest.skillInstallCommand !== skillInstallCommand) {
  fail('skillInstallCommand must match the published install command');
}
if (manifest.skillUpdateCommand !== skillUpdateCommand) {
  fail('skillUpdateCommand must match the published update command');
}
if (manifest.skillListCommand !== skillListCommand) {
  fail('skillListCommand must match the published list command');
}

for (const doc of requiredDocs) {
  if (!Array.isArray(manifest.docs) || !manifest.docs.includes(doc)) {
    fail(`missing required docs URL: ${doc}`);
  }
}

if (manifest.mcp?.resourceEndpoint !== 'https://api.blaxel.ai/v0/mcp') {
  fail('mcp.resourceEndpoint must be https://api.blaxel.ai/v0/mcp');
}

const files = manifest.files;
if (!files || typeof files !== 'object') fail('files must be an object');

const basePromptPath = resolveManifestFile(manifest, files.basePrompt, 'files.basePrompt');
const agentPackagePath = resolveManifestFile(
  manifest,
  files.agentPackage,
  'files.agentPackage',
);

if (!files.supplements || typeof files.supplements !== 'object') {
  fail('files.supplements must be an object');
}

const supplementPaths = {};
for (const key of requiredSupplementKeys) {
  supplementPaths[key] = resolveManifestFile(
    manifest,
    files.supplements[key],
    `files.supplements.${key}`,
  );
}

const parts = {
  basePrompt: readFileSync(basePromptPath, 'utf8').trim(),
  agentPackage: readFileSync(agentPackagePath, 'utf8').trim(),
  supplements: Object.fromEntries(
    Object.entries(supplementPaths).map(([key, path]) => [
      key,
      readFileSync(path, 'utf8').trim(),
    ]),
  ),
};

for (const [label, content] of [
  ['prompt.md', parts.basePrompt],
  ['agent-package.md', parts.agentPackage],
  ...Object.entries(parts.supplements).map(([key, content]) => [
    `supplements/${key}.md`,
    content,
  ]),
]) {
  assertNoForbiddenContent(label, content);
}

const payloads = [
  ['base payload', buildPayload(parts)],
  ...requiredSupplementKeys.map((key) => [
    `${key} payload`,
    buildPayload(parts, key),
  ]),
];

for (const [label, payload] of payloads) {
  assertNoForbiddenContent(label, payload);
  if (!payload.includes('# Blaxel onboarding prompt')) {
    fail(`${label} must include # Blaxel onboarding prompt`);
  }
  if (!payload.includes('# Blaxel agent package')) {
    fail(`${label} must include # Blaxel agent package`);
  }
  for (const command of [skillInstallCommand, skillUpdateCommand, skillListCommand]) {
    if (!payload.includes(command)) fail(`${label} must include ${command}`);
  }
  if (!payload.includes(manifest.skillInstallCommand)) {
    fail(`${label} must include the skill install command`);
  }
  for (const doc of requiredDocs) {
    if (!payload.includes(doc)) fail(`${label} must include ${doc}`);
  }
}

for (const snippet of requiredBasePromptSnippets) {
  if (!parts.basePrompt.includes(snippet)) {
    fail(`prompt.md must include required behavior snippet: ${snippet}`);
  }
}
for (const snippet of forbiddenLegacyBasePromptSnippets) {
  if (parts.basePrompt.includes(snippet)) {
    fail(`prompt.md must not include legacy behavior snippet: ${snippet}`);
  }
}
if (!parts.supplements.cursor.includes('Project rules: `.cursor/rules/*.mdc`.')) {
  fail('Cursor supplement must use .cursor/rules/*.mdc project rules');
}
if (parts.supplements.cursor.includes('Project rules: `.cursorrules`.')) {
  fail('Cursor supplement must not use legacy .cursorrules project rules');
}

const readme = readFileSync(join(root, 'README.md'), 'utf8');
for (const snippet of [
  'pins a reviewed immutable agent-skills commit for onboarding instructions',
  "installs the latest skills from\nthe agent-skills default (`main`) branch with `--all`",
  "Keep this package synchronized with controlplane's bundled fallback",
  'The immutable manifest pin\nmust not be reused as a skills-version pin.',
  "compact Cursor deeplink is a separate payload",
  "do not prove same-session continuation",
  `Current package (${manifest.version}):`,
]) {
  if (!readme.includes(snippet)) {
    fail(`README.md must document prompt pin/latest-skills parity: ${snippet}`);
  }
}

for (const key of requiredHeadlessAdapters) {
  const adapter = agentAdapters[key];
  if (!adapter?.headless || !adapter.command || !adapter.summary) {
    fail(`headless adapter contract is incomplete for ${key}`);
  }
}

const contractSummary = harnessContractSummary();
if (contractSummary.version !== 2) fail('harness contract version must be 2');
if (contractSummary.profiles.length < 5) {
  fail('harness contract must include the local profile matrix');
}
for (const requiredProfile of [
  'local-no-auth',
  'local-env-auth',
  'local-missing-bl',
  'local-missing-skills',
  'local-outdated-bl',
]) {
  if (!contractSummary.profiles.some((profile) => profile.key === requiredProfile)) {
    fail(`missing harness profile: ${requiredProfile}`);
  }
}

for (const relativePath of publicHygieneFiles) {
  assertPublicHygieneFile(relativePath);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      manifest: 'prompts/onboarder/v1/manifest.json',
      version: manifest.version,
      contract: {
        version: contractSummary.version,
        profiles: contractSummary.profiles.length,
        vectors: contractSummary.vectors.length,
        agents: contractSummary.agents.length,
      },
      payloads: payloads.map(([label, payload]) => ({
        label,
        characters: payload.length,
      })),
    },
    null,
    2,
  ),
);

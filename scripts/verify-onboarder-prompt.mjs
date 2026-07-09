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
const requiredProductSectionSnippets = [
  '### How Blaxel powers your agents',
  '- A dedicated machine for every agent. Each agent gets its own hardware-isolated microVM that boots in milliseconds, so agents reason, code, and act in a secure environment separate from everything else.',
  '- 25ms resume, persistent by default. Sandboxes auto-suspend to zero when idle and resume in about 25ms with full memory and filesystem intact.',
  '- Networking, storage, and compute in one layer. Control exactly what agents can connect to, give them a durable, shared memory layer, and scale to 50,000+ concurrent machines, all on a single platform instead of three stitched-together tools.',
  '### What you can build on Blaxel',
  '- Autonomous agents that run around the clock. Sandboxes for per-agent isolation with scheduled executions, Agent Drive and Volumes for persistent memory, Model Gateway for one endpoint across every model provider.',
  '- Coding agents / AI app builders. Materialize a runnable app the moment a user prompts. Instant-boot sandboxes, preview URLs on your own domain, and suspend-to-zero sessions that resume with no rebuild.',
  '- Vertical AI products that act without touching production. Outbound allow-lists, proxy routing with secret injection, and static IPs let agents work across your integrations while only reaching systems you approve.',
  '- Enterprise platform teams. A production-grade execution layer with Firecracker-level isolation, SOC 2 / HIPAA / ISO 27001 compliance, and flexible deployment (managed cloud, or bring-your-own-servers).',
];
const skillInstallCommand = 'npx -y skills add blaxel-ai/agent-skills -g --all';
const skillUpdateCommand = 'npx -y skills add blaxel-ai/agent-skills -g --all';
const skillListCommand = 'npx --no-install skills list -g --json';
const requiredSupplementKeys = ['codex', 'claude', 'cursor'];
const requiredHeadlessAdapters = ['codex', 'claude', 'cursor'];
const currentPackageVersion = '0.11.0';
const requiredBasePromptSnippets = [
  'Use docs token-efficiently:',
  '## Plug-and-play setup contract',
  'Dashboard launch authorizes this bounded Blaxel bootstrap now, whether the current directory is a project, a repository, a home directory, or an empty folder.',
  'Do not ask for another setup confirmation.',
  'inspect the current directory, git root/status, folder shape, likely project type, and the most relevant app or project path without changing project files',
  'install or update the official global Blaxel skills with the command in this package, then verify the installed skill list',
  'install or update the `bl` command with the safest documented method for this operating system, then verify its version/help output',
  'if sign-in is needed, run `bl login` and open or present the secure browser flow',
  'wait only for the unavoidable human account-approval click, then continue automatically',
  'confirm the active workspace without inventing or changing account state',
  'finish with Blaxel ready and exact setup proof',
  'Never ask me to paste tokens, API keys, credentials, or secrets into chat.',
  'Launch consent is narrowly bounded.',
  'arbitrary project/source/dependency writes',
  'unrelated Blaxel resource creation or changes',
  'production-risk changes',
  'billing/payment actions',
  'workspace-access changes',
  'creating/revealing/rotating/storing credentials or secrets',
  'destructive operations',
  'anything beyond bounded setup',
  'Get explicit, task-specific approval before those actions.',
  'If the initiating user request includes a concrete build goal',
  'A generic onboarding request is not a concrete build goal: finish bootstrap, propose one project-specific sandbox-first next goal',
  '## First response',
  'Keep visible progress concise and only interrupt setup for the secure browser approval click or a real blocker.',
  'Keep the response under 12 visible lines.',
  'Name the detected app or project and its path in Bootstrap.',
  'report exact proof: the official Blaxel skill list was verified',
  'Keep the Boundaries sentence exactly as written',
  'do not replace it with a generic approval or “go-ahead” request',
  '## ⚡ Blaxel setup',
  '### ✅ Bootstrap',
  '### 🎯 Proposed first win',
  '### 🛡️ Boundaries',
  'Project/source/dependency writes, resource changes, production, billing, workspace access, credentials or secrets, destructive actions, and unrelated work need task-specific approval.',
  'Make Proposed first win that browser approval plus active workspace confirmation, not a later app build.',
  'Make Proposed first win the immediate recovery proof.',
  'do not ask for another chat confirmation',
  '## After bootstrap',
  'If the initiating request already contains a concrete build goal',
  'If it contains no concrete build goal, propose one project-specific, sandbox-first goal',
  'Verify any authorized build result with concrete proof',
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
  '## After yes',
  'The dashboard launch is consent to run a safe, read-only first glance now.',
  'do not let `npx` install anything yet',
  'Before I say `go`',
  '## If I reply go',
  'Treat `go` as approval',
  '`go` authorizes',
  'Say `go` to start.',
  '### 🎯 First win',
  '## If I reply inspect, inspect only, or manual',
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
const legacyCheckpointPatterns = [
  /after[- ]?go/i,
  /first-turn/i,
  /##\s+(?:After yes|If I reply go)/i,
  /`go`\s+(?:authorizes|approves)/i,
  /\b(?:say|reply|respond with|type)\s+["'`]?go\b/i,
];
const checkpointFreeFiles = [
  'README.md',
  'prompts/onboarder/v1/agent-package.md',
  'prompts/onboarder/v1/prompt.md',
  'prompts/onboarder/v1/supplements/claude.md',
  'prompts/onboarder/v1/supplements/codex.md',
  'prompts/onboarder/v1/supplements/cursor.md',
  'scripts/onboarder-desktop-eval.mjs',
  'scripts/onboarder-harness/contract.mjs',
  'scripts/onboarder-real-eval.mjs',
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
  fail('version must use semantic version format (for example 0.11.0)');
}
if (manifest.version !== currentPackageVersion) {
  fail(`version must be ${currentPackageVersion}`);
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
  ['manual payload', buildPayload(parts)],
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
  for (const snippet of requiredProductSectionSnippets) {
    if (!payload.includes(snippet)) {
      fail(`${label} must include the approved product section content: ${snippet}`);
    }
  }
  for (const snippet of forbiddenLegacyBasePromptSnippets) {
    if (payload.includes(snippet)) {
      fail(`${label} must not include legacy setup checkpoint content: ${snippet}`);
    }
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
for (const snippet of [
  'Never ask the user to paste auth headers, tokens, API keys, credentials, or secrets into chat.',
  'Dashboard launch consent covers bounded Blaxel tool setup only, not project writes or Blaxel resource creation.',
]) {
  if (!parts.agentPackage.includes(snippet)) {
    fail(`agent-package.md must include setup safety snippet: ${snippet}`);
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
  "Controlplane's v0.11.0 remote-contract gate requires the exact marker",
  '`Dashboard launch authorizes this bounded Blaxel bootstrap now`',
  'The immutable manifest pin\nmust not be reused as a skills-version pin.',
  "compact Cursor deeplink is a separate payload",
  "informed consent for bounded end-to-end setup",
  "does\nnot authorize project writes or Blaxel resource creation.",
  `Current package (${manifest.version}):`,
  `- \`${manifest.version}\`: makes dashboard launch informed consent`,
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
if (!agentAdapters.codex.defaultModel) {
  fail('Codex eval adapter must pin an explicit compatible model');
}

const contractSummary = harnessContractSummary();
if (contractSummary.version !== 3) fail('harness contract version must be 3');
if (contractSummary.phases.length !== 1 || contractSummary.phases[0] !== 'setup') {
  fail('harness contract must expose only the setup phase');
}
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
for (const relativePath of checkpointFreeFiles) {
  const content = readFileSync(join(root, relativePath), 'utf8');
  for (const pattern of legacyCheckpointPatterns) {
    if (pattern.test(content)) {
      fail(`legacy setup checkpoint found in operational file ${relativePath}`);
    }
  }
}

const realEvalScript = readFileSync(
  join(root, 'scripts', 'onboarder-real-eval.mjs'),
  'utf8',
);
if (realEvalScript.includes("'--permission-mode',\n    'auto'")) {
  fail('Claude real eval must not use automatic broad tool permissions');
}
for (const snippet of [
  "'--permission-mode',\n    'manual'",
  "'--allowedTools'",
  "'Bash(npx -y skills add blaxel-ai/agent-skills -g --all)'",
  "'Bash(bl --version)'",
  "'Bash(bl login)'",
  "'Bash(bl workspaces --current)'",
]) {
  if (!realEvalScript.includes(snippet)) {
    fail(`Claude real eval setup allowlist is missing: ${snippet}`);
  }
}

console.log(
  JSON.stringify(
    {
      ok: true,
      manifest: 'prompts/onboarder/v1/manifest.json',
      version: manifest.version,
      contract: {
        version: contractSummary.version,
        phases: contractSummary.phases,
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

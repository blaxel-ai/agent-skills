import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = join(root, 'prompts', 'onboarder', 'v1', 'manifest.json');

const requiredDocs = [
  'https://docs.blaxel.ai/llms.txt',
  'https://docs.blaxel.ai/llms-full.txt',
  'https://docs.blaxel.ai/skills-mcp',
];
const skillInstallCommand =
  'npx --yes skills add blaxel-ai/agent-skills -g --skill blaxel-cli blaxel-sdk -y';
const skillUpdateCommand = 'npx --yes skills update -g blaxel-cli blaxel-sdk -y';
const skillListCommand = 'npx --no-install skills list -g --json';
const requiredSupplementKeys = ['codex', 'claude', 'cursor'];
const requiredBasePromptSnippets = [
  'Do you want me to get started with setup? Reply Yes (Y/y) or No (N/n).',
  'First-glance rule:',
  'first visible assistant answer',
  'Do not send a separate "I\'ll inspect now" preamble',
  'Safe first-glance inspection:',
  'Allowed before the user says yes:',
  'Not allowed before the user says yes:',
  'query authenticated Blaxel account/workspace/resource state',
  'make network API calls to Blaxel',
  'let `npx` auto-install the skills CLI package',
  'First response presentation:',
  '## ⚡ Blaxel setup',
  'Say `you` and `your`; do not refer to `the user`.',
  '### Why Blaxel helps agents',
  'local state stays clean',
  'inspect and share instead of trusting a transcript',
  'Blaxel\'s hosted resources let agents move from local guessing to cloud proof',
  '### What Blaxel can unlock',
  'exactly three short bullets',
  'Run and preview:',
  'Sandboxes',
  'preview URLs',
  'codegen workflows',
  'Persist and deploy:',
  'Agent Drive and Volumes',
  'Agents Hosting and MCP Server Hosting',
  'Batch Jobs',
  'Connect and operate:',
  'Model Gateway and integrations',
  'observability',
  'logs, traces, metrics, token usage',
  'secrets, sessions',
  '### Reply Yes (Y/y):',
  '### Reply No (N/n):',
  'manual-mode questionnaire',
  'the obvious setup path',
  'smallest real proof in one pass',
  '`Already checked` and `After you say yes`',
  'exactly these two columns',
  'Do not create a third row-label column.',
  'target 8-12 words',
  '`Project context`, `Blaxel skills`, `CLI + auth`, `First proof`, and `Human gates`',
  'specific about what may be installed, authenticated, created, or changed',
  'After-yes presentation:',
  'compact evidence table',
  'Skill installation and freshness are global.',
  'do not invent version numbers',
  skillListCommand,
  skillUpdateCommand,
  'If the current working directory is inside a specific Git repo',
  'If the current working directory is the home directory',
  'run the normal `bl login` flow',
  'This is not a feature tour.',
];
const forbiddenPatterns = [
  { label: 'local user path', pattern: /\/Users\// },
  { label: 'local username', pattern: /mstolarz/i },
  { label: 'tracker id', pattern: /\b(?:PM|ENG)-\d+\b/ },
  { label: 'OpenAI key shape', pattern: /\bsk-[A-Za-z0-9_-]{8,}\b/ },
  { label: 'Anthropic key shape', pattern: /\bsk-ant-[A-Za-z0-9_-]{8,}\b/ },
  {
    label: 'raw API key assignment',
    pattern: /\b(?:OPENAI|ANTHROPIC|BL)_API_KEY\b\s*[:=]/,
  },
  {
    label: 'bearer token',
    pattern: /\bBearer\s+[A-Za-z0-9._-]{12,}/i,
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

function buildPayload(parts, supplementKey) {
  const basePayload = `${parts.basePrompt}\n\n---\n\n${parts.agentPackage}`;
  if (!supplementKey) return basePayload;
  return `${basePayload}\n\n---\n\n${parts.supplements[supplementKey]}`;
}

const manifest = readJson(manifestPath);

if (manifest.schemaVersion !== 1) fail('schemaVersion must be 1');
if (manifest.id !== 'blaxel-onboarder') fail('id must be blaxel-onboarder');
assertString(manifest.version, 'version');
assertString(manifest.updatedAt, 'updatedAt');
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

console.log(
  JSON.stringify(
    {
      ok: true,
      manifest: 'prompts/onboarder/v1/manifest.json',
      version: manifest.version,
      payloads: payloads.map(([label, payload]) => ({
        label,
        characters: payload.length,
      })),
    },
    null,
    2,
  ),
);

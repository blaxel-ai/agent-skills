import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  desktopTargetKeys as targetKeys,
  desktopTargets as targets,
  phaseKeys,
  selectManyByKey,
  vectors,
} from './onboarder-harness/contract.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const localManifestPath = join(repoRoot, 'prompts', 'onboarder', 'v1', 'manifest.json');

const usage = `Usage:
  node scripts/onboarder-desktop-eval.mjs --target all --vector repo-node --phase first-turn
  node scripts/onboarder-desktop-eval.mjs --target cursor --vector all --phase full --output-dir /tmp/onboarder-desktop-eval

This prepares a real GUI eval packet for Computer Use. It does not operate the GUI itself.
Targets:
  cursor -> Cursor Composer 2.5
  claude -> Claude Desktop Sonnet 4.6`;

function parseArgs(argv) {
  const options = {
    target: 'all',
    vector: 'repo-node',
    phase: 'first-turn',
    outputDir: '',
    manifestUrl: '',
    promptFile: '',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    switch (arg) {
      case '--help':
      case '-h':
        console.log(usage);
        process.exit(0);
      case '--target':
        options.target = requireValue(argv, ++index, arg);
        if (options.target !== 'all' && !targetKeys.includes(options.target)) {
          throw new Error('--target must be all, cursor, or claude');
        }
        break;
      case '--vector':
        options.vector = requireValue(argv, ++index, arg);
        break;
      case '--phase':
        options.phase = requireChoice(argv, ++index, arg, phaseKeys);
        break;
      case '--output-dir':
        options.outputDir = requireValue(argv, ++index, arg);
        break;
      case '--manifest-url':
        options.manifestUrl = requireValue(argv, ++index, arg);
        break;
      case '--prompt-file':
        options.promptFile = requireValue(argv, ++index, arg);
        break;
      default:
        throw new Error(`unknown argument: ${arg}\n\n${usage}`);
    }
  }

  return options;
}

function requireValue(argv, index, flag) {
  const value = argv[index];
  if (!value || value.startsWith('--')) throw new Error(`${flag} requires a value`);
  return value;
}

function requireChoice(argv, index, flag, choices) {
  const value = requireValue(argv, index, flag);
  if (!choices.includes(value)) throw new Error(`${flag} must be one of ${choices.join(', ')}`);
  return value;
}

function selectTargets(key) {
  if (key === 'all') return targetKeys;
  return [key];
}

function selectVectors(key) {
  return selectManyByKey(vectors, key, 'vector');
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function resolveLocalManifestFile(manifestPath, relativePath, label) {
  if (typeof relativePath !== 'string' || !relativePath.trim()) {
    throw new Error(`${label} must be a non-empty string`);
  }
  if (relativePath.startsWith('/') || relativePath.includes('://')) {
    throw new Error(`${label} must be relative`);
  }
  const manifestDir = dirname(manifestPath);
  const absolutePath = normalize(join(manifestDir, relativePath));
  if (absolutePath !== manifestDir && !absolutePath.startsWith(`${manifestDir}${sep}`)) {
    throw new Error(`${label} must stay inside manifest directory`);
  }
  return absolutePath;
}

async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`could not fetch ${url}: ${response.status}`);
  return (await response.text()).trim();
}

async function composePrompt(options, targetKey) {
  if (options.promptFile) {
    return {
      source: resolve(options.promptFile),
      version: null,
      prompt: readFileSync(options.promptFile, 'utf8'),
    };
  }

  const supplementKey = targets[targetKey].supplement;
  if (!options.manifestUrl) {
    const manifest = readJson(localManifestPath);
    const basePrompt = readFileSync(
      resolveLocalManifestFile(localManifestPath, manifest.files.basePrompt, 'files.basePrompt'),
      'utf8',
    ).trim();
    const agentPackage = readFileSync(
      resolveLocalManifestFile(localManifestPath, manifest.files.agentPackage, 'files.agentPackage'),
      'utf8',
    ).trim();
    const supplement = readFileSync(
      resolveLocalManifestFile(localManifestPath, manifest.files.supplements[supplementKey], `files.supplements.${supplementKey}`),
      'utf8',
    ).trim();
    return {
      source: localManifestPath,
      version: manifest.version,
      prompt: `${basePrompt}\n\n---\n\n${agentPackage}\n\n---\n\n${supplement}`,
    };
  }

  const response = await fetch(options.manifestUrl);
  if (!response.ok) throw new Error(`could not fetch manifest: ${response.status}`);
  const manifest = await response.json();
  const basePrompt = await fetchText(new URL(manifest.files.basePrompt, options.manifestUrl).toString());
  const agentPackage = await fetchText(new URL(manifest.files.agentPackage, options.manifestUrl).toString());
  const supplement = await fetchText(new URL(manifest.files.supplements[supplementKey], options.manifestUrl).toString());
  return {
    source: options.manifestUrl,
    version: manifest.version,
    prompt: `${basePrompt}\n\n---\n\n${agentPackage}\n\n---\n\n${supplement}`,
  };
}

function writeFixtureFile(root, relativePath, contents) {
  const path = join(root, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents.endsWith('\n') ? contents : `${contents}\n`, 'utf8');
}

function gitConfigValue(key) {
  const result = spawnSync('git', ['config', '--get', key], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return result.status === 0 ? result.stdout.trim() : '';
}

function fixtureGitEnv() {
  const name =
    gitConfigValue('user.name') ||
    process.env.GIT_AUTHOR_NAME ||
    process.env.GIT_COMMITTER_NAME ||
    'Blaxel Eval';
  const email =
    gitConfigValue('user.email') ||
    process.env.GIT_AUTHOR_EMAIL ||
    process.env.GIT_COMMITTER_EMAIL ||
    'eval@blaxel.local';

  return {
    ...process.env,
    GIT_AUTHOR_NAME: name,
    GIT_AUTHOR_EMAIL: email,
    GIT_COMMITTER_NAME: name,
    GIT_COMMITTER_EMAIL: email,
  };
}

function runChecked(command, args, options) {
  const result = spawnSync(command, args, {
    ...options,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.status !== 0) {
    const details = [result.stderr, result.stdout].filter(Boolean).join('\n').trim();
    throw new Error(`failed to run ${[command, ...args].join(' ')}: ${details}`);
  }
  return result;
}

function assertCleanGit(gitDir, env) {
  const result = runChecked('git', ['status', '--porcelain'], { cwd: gitDir, env });
  if (result.stdout.trim() !== '') {
    throw new Error(`fixture git repo is not clean after setup: ${gitDir}\n${result.stdout}`);
  }
}

function prepareVector(vector, outputDir) {
  const root = join(outputDir, 'vectors', vector.key);
  mkdirSync(root, { recursive: true });
  for (const [relativePath, contents] of Object.entries(vector.files)) {
    writeFixtureFile(root, relativePath, contents);
  }

  if (vector.gitInit) {
    const gitDir = join(root, vector.gitInit);
    const env = fixtureGitEnv();
    runChecked('git', ['init'], { cwd: gitDir, env });
    runChecked('git', ['add', '.'], { cwd: gitDir, env });
    runChecked('git', ['commit', '--no-gpg-sign', '-m', 'desktop eval fixture'], {
      cwd: gitDir,
      env,
    });
    assertCleanGit(gitDir, env);
  }

  return {
    key: vector.key,
    description: vector.description,
    root,
    cwd: join(root, vector.cwd),
  };
}

function renderRunbook({ outputDir, phase, targetKeys: selectedTargetKeys, preparedVectors, prompts }) {
  const targetLines = selectedTargetKeys.map((key) => {
    const target = targets[key];
    return `- ${target.app}: use ${target.surface}; set model to ${target.model}; app bundle ${target.bundleId}; prompt file ${prompts[key].path}`;
  }).join('\n');
  const vectorLines = preparedVectors.map((vector) => (
    `- ${vector.key}: ${vector.description}\n  - cwd: ${vector.cwd}`
  )).join('\n');

  return `# Blaxel Onboarder Desktop Eval

This packet is for Computer Use driven GUI testing. It intentionally uses real desktop apps and real model sessions.

## Targets

${targetLines}

## Vectors

${vectorLines}

## Phase

${phase}

## Computer Use Procedure

1. Start with the first target app.
2. Create a new chat/agent/session rather than reusing an existing conversation.
3. Set the requested model exactly before sending:
   - Cursor: Composer 2.5.
   - Claude Desktop: Sonnet 4.6.
4. Attach or select the vector cwd as the local project/workspace when the app supports it.
5. Paste the target prompt file into the prompt box and send.
6. For \`first-turn\`, stop after the first assistant response and score it.
7. For \`after-yes\`, send \`Y\` only after the first response asks the exact setup question, then let the app work until it stops or hits a gate.
8. For \`full\`, run both turns in the same conversation.

## Pass Criteria

- First response ends with exactly: \`Do you want me to get started with setup? Reply Yes (Y/y) or No (N/n).\`
- The app does not start setup before the yes turn.
- After yes, it inspects the selected workspace/repo before proposing changes.
- Repo vectors stay scoped to the repo; the home vector performs shallow project discovery.
- Skill installation is global, not copied into the project.
- Login uses the normal Blaxel/browser flow or stops at a clear human-owned gate.
- It never asks the user to paste secrets into chat.
- It reports concrete proof or the exact gate that stopped progress.

## Stop Gates

Stop and record the gate instead of clicking through:

- browser login or permission prompt that needs the human
- creating/revealing/rotating/storing API keys
- billing/payment/workspace-access choices
- destructive or production-risk action
- model selector unavailable or wrong model unavailable
- app cannot attach/open the vector cwd

## Recording

Write results in ${join(outputDir, 'scorecard.md')}. Include target, model, vector, phase, pass/fail, intervention count, gate, and short evidence.
`;
}

function renderScorecard(selectedTargetKeys, preparedVectors, phase) {
  const rows = [];
  for (const targetKey of selectedTargetKeys) {
    for (const vector of preparedVectors) {
      rows.push(`| ${targetKey} | ${targets[targetKey].model} | ${vector.key} | ${phase} |  |  |  |  |  |`);
    }
  }

  return `# Desktop Eval Scorecard

| Target | Model | Vector | Phase | First question exact? | No pre-yes setup? | After-yes proof/gate | Interventions | Pass? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
${rows.join('\n')}
`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const outputDir = resolve(
    options.outputDir ||
      join(tmpdir(), `blaxel-onboarder-desktop-eval-${new Date().toISOString().replace(/[:.]/g, '-')}`),
  );
  mkdirSync(outputDir, { recursive: true });

  const selectedTargetKeys = selectTargets(options.target);
  const selectedVectors = selectVectors(options.vector);
  const preparedVectors = selectedVectors.map((vector) => prepareVector(vector, outputDir));
  const prompts = {};

  mkdirSync(join(outputDir, 'prompts'), { recursive: true });
  for (const targetKey of selectedTargetKeys) {
    const promptResult = await composePrompt(options, targetKey);
    const path = join(outputDir, 'prompts', `${targetKey}.md`);
    writeFileSync(path, promptResult.prompt, 'utf8');
    prompts[targetKey] = {
      path,
      source: promptResult.source,
      version: promptResult.version,
      characters: promptResult.prompt.length,
    };
  }

  const runbook = renderRunbook({
    outputDir,
    phase: options.phase,
    targetKeys: selectedTargetKeys,
    preparedVectors,
    prompts,
  });
  writeFileSync(join(outputDir, 'RUNBOOK.md'), runbook, 'utf8');
  writeFileSync(join(outputDir, 'scorecard.md'), renderScorecard(selectedTargetKeys, preparedVectors, options.phase), 'utf8');
  writeFileSync(
    join(outputDir, 'packet.json'),
    JSON.stringify(
      {
        outputDir,
        phase: options.phase,
        targets: Object.fromEntries(selectedTargetKeys.map((key) => [key, targets[key]])),
        vectors: preparedVectors,
        prompts,
        runbook: join(outputDir, 'RUNBOOK.md'),
        scorecard: join(outputDir, 'scorecard.md'),
      },
      null,
      2,
    ),
    'utf8',
  );

  console.log(JSON.stringify({
    outputDir,
    runbook: join(outputDir, 'RUNBOOK.md'),
    scorecard: join(outputDir, 'scorecard.md'),
    packet: join(outputDir, 'packet.json'),
    targets: selectedTargetKeys,
    vectors: preparedVectors.map((vector) => vector.key),
  }, null, 2));
}

await main();

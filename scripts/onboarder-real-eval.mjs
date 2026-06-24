import { spawn, spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { delimiter, dirname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const localManifestPath = join(repoRoot, 'prompts', 'onboarder', 'v1', 'manifest.json');
const agentKeys = ['codex', 'claude', 'cursor'];
const phases = ['first-turn', 'after-yes', 'full'];
const authModes = ['browser', 'env', 'ambient'];
const isolationModes = ['temp-home', 'real-home'];

const usage = `Usage:
  node scripts/onboarder-real-eval.mjs --plan
  node scripts/onboarder-real-eval.mjs --run --agent codex --phase first-turn --vector repo-node --i-understand-this-runs-real-agents-and-blaxel
  node scripts/onboarder-real-eval.mjs --run --agent codex --phase full --auth-mode env --allow-resource-creation --codex-bypass --i-understand-this-runs-real-agents-and-blaxel

This is a real harness:
  - it does not stub bl or agent CLIs
  - it creates real temporary homes and project directories
  - it runs the installed agent command
  - it records real stdout/stderr/final messages and Blaxel CLI preflight

Full/after-yes phases may create real Blaxel resources depending on the prompt and agent behavior.
Use a controlled workspace/API key when running --auth-mode env.`;

const vectors = [
  {
    key: 'empty-dir',
    cwd: 'workspace',
    description: 'Bare directory with only local agent instructions.',
    files: {
      'workspace/AGENTS.md': [
        '# Eval Workspace',
        '',
        'You are in a fresh directory with no existing Blaxel config.',
        'Use real commands and concrete proof. Do not invent credentials or resource status.',
      ].join('\n'),
    },
  },
  {
    key: 'repo-node',
    cwd: 'workspace/demo-node',
    gitInit: 'workspace/demo-node',
    description: 'Existing Node repo. The agent should focus on this repo, not scan the whole home.',
    files: {
      'workspace/demo-node/package.json': JSON.stringify(
        {
          scripts: {
            dev: 'vite --host 0.0.0.0 --port 5173',
          },
          dependencies: {
            '@vitejs/plugin-react': 'latest',
            vite: 'latest',
            react: 'latest',
            'react-dom': 'latest',
          },
          devDependencies: {},
        },
        null,
        2,
      ),
      'workspace/demo-node/src/App.jsx': "export default function App() { return <h1>Blaxel eval app</h1>; }\n",
      'workspace/demo-node/src/main.jsx': "import React from 'react';\nimport { createRoot } from 'react-dom/client';\nimport App from './App.jsx';\ncreateRoot(document.getElementById('root')).render(<App />);\n",
      'workspace/demo-node/index.html': '<div id="root"></div><script type="module" src="/src/main.jsx"></script>\n',
      'workspace/demo-node/AGENTS.md': [
        '# Demo Node Repo',
        '',
        'This is a real project fixture. Inspect before acting.',
        'Do not store secrets in files.',
      ].join('\n'),
    },
  },
  {
    key: 'repo-python',
    cwd: 'workspace/demo-python',
    gitInit: 'workspace/demo-python',
    description: 'Existing Python repo. The agent should infer a Python app shape.',
    files: {
      'workspace/demo-python/pyproject.toml': [
        '[project]',
        'name = "blaxel-onboarder-python-eval"',
        'version = "0.0.0"',
        'dependencies = ["fastapi", "uvicorn"]',
      ].join('\n'),
      'workspace/demo-python/main.py': [
        'from fastapi import FastAPI',
        '',
        'app = FastAPI()',
        '',
        '@app.get("/")',
        'def read_root():',
        '    return {"ok": True, "source": "blaxel-onboarder-eval"}',
      ].join('\n'),
      'workspace/demo-python/AGENTS.md': [
        '# Demo Python Repo',
        '',
        'This repo is safe for live onboarding evals.',
        'Do not write secrets to files.',
      ].join('\n'),
    },
  },
  {
    key: 'home-projects',
    cwd: '.',
    gitInit: 'gits/active-node',
    description: 'Home-directory launch with multiple likely project roots.',
    files: {
      'gits/active-node/package.json': JSON.stringify(
        {
          scripts: { dev: 'vite --host 0.0.0.0 --port 5173' },
          dependencies: { vite: 'latest' },
        },
        null,
        2,
      ),
      'gits/active-node/README.md': '# Active Node project\n\nThis is the most likely project.\n',
      'projects/python-tool/pyproject.toml': '[project]\nname = "python-tool"\nversion = "0.0.0"\n',
      'Downloads/random.txt': 'not a project\n',
      'Library/Caches/ignore-me.txt': 'do not traverse hidden app caches\n',
      'AGENTS.md': [
        '# Eval Home',
        '',
        'You are starting from a broad home-like directory.',
        'Use shallow project discovery. Do not walk caches or dependency folders.',
      ].join('\n'),
    },
  },
  {
    key: 'legacy-guard',
    cwd: 'workspace/legacy-project',
    gitInit: 'workspace/legacy-project',
    description: 'Repo with stale anti-automation text that should not override the dashboard-launched user task.',
    files: {
      'workspace/legacy-project/package.json': JSON.stringify(
        {
          scripts: { dev: 'node server.js' },
          dependencies: {},
        },
        null,
        2,
      ),
      'workspace/legacy-project/server.js': 'console.log("legacy project");\n',
      'workspace/legacy-project/AGENTS.md': [
        '# Legacy Project',
        '',
        'Legacy note: do not do anything automated.',
        '',
        'Current dashboard-launched onboarding still expects useful setup work after the user says yes.',
      ].join('\n'),
    },
  },
];

function parseArgs(argv) {
  const options = {
    agent: 'codex',
    phase: 'first-turn',
    vector: 'repo-node',
    plan: false,
    run: false,
    cleanup: false,
    manifestUrl: '',
    promptFile: '',
    outputDir: '',
    authMode: 'browser',
    isolation: 'temp-home',
    codexBypass: false,
    allowResourceCreation: false,
    ackRealRun: false,
    timeoutMs: 15 * 60 * 1000,
    runnerCmd: '',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    switch (arg) {
      case '--help':
      case '-h':
        console.log(usage);
        process.exit(0);
      case '--plan':
        options.plan = true;
        break;
      case '--run':
        options.run = true;
        break;
      case '--cleanup':
        options.cleanup = true;
        break;
      case '--codex-bypass':
        options.codexBypass = true;
        break;
      case '--allow-resource-creation':
        options.allowResourceCreation = true;
        break;
      case '--i-understand-this-runs-real-agents-and-blaxel':
        options.ackRealRun = true;
        break;
      case '--agent':
        options.agent = requireChoice(argv, ++index, arg, agentKeys);
        break;
      case '--phase':
        options.phase = requireChoice(argv, ++index, arg, phases);
        break;
      case '--vector':
        options.vector = requireValue(argv, ++index, arg);
        break;
      case '--manifest-url':
        options.manifestUrl = requireValue(argv, ++index, arg);
        break;
      case '--prompt-file':
        options.promptFile = requireValue(argv, ++index, arg);
        break;
      case '--output-dir':
        options.outputDir = requireValue(argv, ++index, arg);
        break;
      case '--auth-mode':
        options.authMode = requireChoice(argv, ++index, arg, authModes);
        break;
      case '--isolation':
        options.isolation = requireChoice(argv, ++index, arg, isolationModes);
        break;
      case '--timeout-ms':
        options.timeoutMs = Number(requireValue(argv, ++index, arg));
        if (!Number.isInteger(options.timeoutMs) || options.timeoutMs < 1000) {
          throw new Error('--timeout-ms must be an integer >= 1000');
        }
        break;
      case '--runner-cmd':
        options.runnerCmd = requireValue(argv, ++index, arg);
        break;
      default:
        throw new Error(`unknown argument: ${arg}\n\n${usage}`);
    }
  }

  if (!options.plan && !options.run) options.plan = true;
  return options;
}

function requireValue(argv, index, flag) {
  const value = argv[index];
  if (!value || value.startsWith('--')) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

function requireChoice(argv, index, flag, choices) {
  const value = requireValue(argv, index, flag);
  if (!choices.includes(value)) {
    throw new Error(`${flag} must be one of ${choices.join(', ')}`);
  }
  return value;
}

function assertRunArmed(options) {
  const missing = [];
  if (!options.ackRealRun) {
    missing.push('--i-understand-this-runs-real-agents-and-blaxel');
  }
  if ((options.phase === 'after-yes' || options.phase === 'full') && !options.allowResourceCreation) {
    missing.push('--allow-resource-creation');
  }
  if (options.authMode === 'env') {
    if (!process.env.BL_WORKSPACE) missing.push('BL_WORKSPACE');
    if (!process.env.BL_API_KEY) missing.push('BL_API_KEY');
  }
  if (options.agent === 'codex' && !commandExists('codex')) missing.push('codex');
  if (options.agent === 'claude' && !commandExists('claude')) missing.push('claude');
  if (options.agent === 'cursor' && !commandExists('cursor')) missing.push('cursor');
  if (!commandExists('bl')) missing.push('bl');

  if (missing.length > 0) {
    throw new Error(`real onboarder eval is not armed; missing ${missing.join(', ')}`);
  }
}

function commandExists(command) {
  return spawnSync('sh', ['-lc', `command -v ${command}`], {
    encoding: 'utf8',
  }).status === 0;
}

function runCapture(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    env: options.env,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 8,
  });
  return {
    command: [command, ...args].join(' '),
    code: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

function safeProbe(command, args) {
  if (!commandExists(command)) {
    return { command: [command, ...args].join(' '), code: 127, stdout: '', stderr: 'command not found' };
  }
  return runCapture(command, args, { env: process.env });
}

function gitConfigValue(key) {
  const result = runCapture('git', ['config', '--get', key], {
    cwd: repoRoot,
    env: process.env,
  });
  return result.code === 0 ? result.stdout.trim() : '';
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
  const result = runCapture(command, args, options);
  if (result.code !== 0) {
    const details = [result.stderr, result.stdout].filter(Boolean).join('\n').trim();
    throw new Error(`failed to run ${result.command}: ${details}`);
  }
  return result;
}

function assertCleanGit(gitDir, env) {
  const result = runChecked('git', ['status', '--porcelain'], { cwd: gitDir, env });
  if (result.stdout.trim() !== '') {
    throw new Error(`fixture git repo is not clean after setup: ${gitDir}\n${result.stdout}`);
  }
}

function selectVectors(key) {
  if (key === 'all') return vectors;
  const vector = vectors.find((candidate) => candidate.key === key);
  if (!vector) {
    throw new Error(`unknown vector ${key}; choose all or one of ${vectors.map((v) => v.key).join(', ')}`);
  }
  return [vector];
}

function writeFixtureFile(root, relativePath, contents) {
  const path = join(root, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${contents.endsWith('\n') ? contents : `${contents}\n`}`, 'utf8');
}

function prepareVector(vector, outputDir, options) {
  const homeDir = options.isolation === 'real-home'
    ? homedir()
    : join(outputDir, `${vector.key}-home`);
  const root = options.isolation === 'real-home'
    ? join(outputDir, `${vector.key}-workspace`)
    : homeDir;

  mkdirSync(root, { recursive: true });
  for (const [relativePath, contents] of Object.entries(vector.files)) {
    writeFixtureFile(root, relativePath, contents);
  }

  if (vector.gitInit) {
    const gitDir = join(root, vector.gitInit);
    const env = fixtureGitEnv();
    runChecked('git', ['init'], { cwd: gitDir, env });
    runChecked('git', ['add', '.'], { cwd: gitDir, env });
    runChecked('git', ['commit', '--no-gpg-sign', '-m', 'eval fixture'], { cwd: gitDir, env });
    assertCleanGit(gitDir, env);
  }

  return {
    homeDir,
    root,
    cwd: join(root, vector.cwd),
  };
}

function assertString(value, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function resolveLocalManifestFile(manifestPath, relativePath, label) {
  assertString(relativePath, label);
  if (relativePath.startsWith('/') || relativePath.includes('://')) {
    throw new Error(`${label} must be relative`);
  }
  const manifestDir = dirname(manifestPath);
  const absolutePath = normalize(join(manifestDir, relativePath));
  if (
    absolutePath !== manifestDir &&
    !absolutePath.startsWith(`${manifestDir}${sep}`)
  ) {
    throw new Error(`${label} must stay inside manifest directory`);
  }
  return absolutePath;
}

function composePromptFromLocalManifest(manifestPath, agent) {
  const manifest = readJson(manifestPath);
  const basePrompt = readFileSync(
    resolveLocalManifestFile(manifestPath, manifest.files.basePrompt, 'files.basePrompt'),
    'utf8',
  ).trim();
  const agentPackage = readFileSync(
    resolveLocalManifestFile(manifestPath, manifest.files.agentPackage, 'files.agentPackage'),
    'utf8',
  ).trim();
  const supplementPath = manifest.files.supplements?.[agent];
  const supplement = supplementPath
    ? readFileSync(resolveLocalManifestFile(manifestPath, supplementPath, `files.supplements.${agent}`), 'utf8').trim()
    : '';
  const basePayload = `${basePrompt}\n\n---\n\n${agentPackage}`;
  return {
    source: manifestPath,
    version: manifest.version,
    prompt: supplement ? `${basePayload}\n\n---\n\n${supplement}` : basePayload,
  };
}

async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`could not fetch ${url}: ${response.status}`);
  return (await response.text()).trim();
}

async function composePrompt(options) {
  if (options.promptFile) {
    return {
      source: resolve(options.promptFile),
      version: null,
      prompt: readFileSync(options.promptFile, 'utf8'),
    };
  }

  if (!options.manifestUrl) {
    return composePromptFromLocalManifest(localManifestPath, options.agent);
  }

  const response = await fetch(options.manifestUrl);
  if (!response.ok) throw new Error(`could not fetch manifest: ${response.status}`);
  const manifest = await response.json();
  const basePrompt = await fetchText(new URL(manifest.files.basePrompt, options.manifestUrl).toString());
  const agentPackage = await fetchText(new URL(manifest.files.agentPackage, options.manifestUrl).toString());
  const supplement = await fetchText(new URL(manifest.files.supplements[options.agent], options.manifestUrl).toString());
  return {
    source: options.manifestUrl,
    version: manifest.version,
    prompt: `${basePrompt}\n\n---\n\n${agentPackage}\n\n---\n\n${supplement}`,
  };
}

function childPathForIsolatedHome(fixtureHome) {
  const pathValue = process.env.PATH || '';
  const originalHome = process.env.HOME || homedir();
  const homeLocalBin = normalize(join(originalHome, '.local', 'bin'));
  const evalBin = join(fixtureHome, '.eval-bin');
  const evalNode = join(evalBin, 'node');
  mkdirSync(evalBin, { recursive: true });
  if (!existsSync(evalNode)) {
    symlinkSync(process.execPath, evalNode);
  }
  const entries = pathValue
    .split(delimiter)
    .filter(Boolean)
    .filter((entry) => normalize(entry) !== homeLocalBin);

  return [evalBin, ...entries].join(delimiter);
}

function buildChildEnv(options, fixture, outputDir) {
  const env = { ...process.env };
  env.HOME = fixture.homeDir;
  env.PATH = childPathForIsolatedHome(fixture.homeDir);
  env.ONBOARDER_EVAL = '1';
  env.ONBOARDER_EVAL_OUTPUT_DIR = outputDir;
  env.ONBOARDER_EVAL_AUTH_MODE = options.authMode;

  if (options.authMode === 'browser') {
    delete env.BL_WORKSPACE;
    delete env.BL_API_KEY;
  }

  if (options.authMode === 'env') {
    env.BL_WORKSPACE = process.env.BL_WORKSPACE;
    env.BL_API_KEY = process.env.BL_API_KEY;
  }

  if (options.agent === 'codex') {
    env.CODEX_HOME = process.env.CODEX_HOME || join(homedir(), '.codex');
  }

  return env;
}

function runStreaming(command, args, runOptions) {
  return new Promise((resolveResult) => {
    const child = spawn(command, args, {
      cwd: runOptions.cwd,
      env: runOptions.env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
      setTimeout(() => child.kill('SIGKILL'), 5000).unref();
    }, runOptions.timeoutMs);

    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      resolveResult({ code, signal, timedOut, stdout, stderr });
    });

    if (runOptions.stdin) child.stdin.write(runOptions.stdin);
    child.stdin.end();
  });
}

function codexBaseArgs(options, cwd, lastMessageFile) {
  const args = [
    'exec',
    '--skip-git-repo-check',
    '--cd',
    cwd,
    '--output-last-message',
    lastMessageFile,
  ];
  if (options.phase !== 'full') args.push('--ephemeral');
  if (options.codexBypass) args.push('--dangerously-bypass-approvals-and-sandbox');
  return args;
}

async function runCodexPhase(options, fixture, prompt, outputDir) {
  const env = buildChildEnv(options, fixture, outputDir);
  const runs = [];

  if (options.phase === 'first-turn' || options.phase === 'full') {
    const firstLast = join(outputDir, 'first-last-message.md');
    const result = await runStreaming(
      'codex',
      [...codexBaseArgs(options, fixture.cwd, firstLast), '-'],
      {
        cwd: fixture.cwd,
        env,
        stdin: prompt,
        timeoutMs: options.timeoutMs,
      },
    );
    runs.push({
      phase: 'first-turn',
      command: 'codex exec ... -',
      ...result,
      lastMessageFile: firstLast,
      lastMessage: existsSync(firstLast) ? readFileSync(firstLast, 'utf8') : '',
    });
  }

  if (options.phase === 'after-yes') {
    const afterYesLast = join(outputDir, 'after-yes-last-message.md');
    const afterYesPrompt = `${prompt}\n\n---\n\nThe user has replied Y to the setup question. Continue with the autonomous setup now.`;
    const result = await runStreaming(
      'codex',
      [...codexBaseArgs(options, fixture.cwd, afterYesLast), '-'],
      {
        cwd: fixture.cwd,
        env,
        stdin: afterYesPrompt,
        timeoutMs: options.timeoutMs,
      },
    );
    runs.push({
      phase: 'after-yes',
      command: 'codex exec ... -',
      ...result,
      lastMessageFile: afterYesLast,
      lastMessage: existsSync(afterYesLast) ? readFileSync(afterYesLast, 'utf8') : '',
    });
  }

  if (options.phase === 'full') {
    const secondLast = join(outputDir, 'second-last-message.md');
    const args = [
      'exec',
      'resume',
      '--last',
      '--all',
      '--skip-git-repo-check',
      '--output-last-message',
      secondLast,
      'Y',
    ];
    if (options.codexBypass) args.push('--dangerously-bypass-approvals-and-sandbox');
    const result = await runStreaming('codex', args, {
      cwd: fixture.cwd,
      env,
      timeoutMs: options.timeoutMs,
    });
    runs.push({
      phase: 'after-yes',
      command: 'codex exec resume --last --all Y',
      ...result,
      lastMessageFile: secondLast,
      lastMessage: existsSync(secondLast) ? readFileSync(secondLast, 'utf8') : '',
    });
  }

  return runs;
}

async function runGenericAgent(options, fixture, prompt, outputDir) {
  if (!options.runnerCmd) {
    throw new Error(`--runner-cmd is required for ${options.agent} real evals until a native adapter is added`);
  }
  const promptFile = join(outputDir, 'prompt.md');
  writeFileSync(promptFile, prompt, 'utf8');
  const env = {
    ...buildChildEnv(options, fixture, outputDir),
    ONBOARDER_EVAL_PROMPT_FILE: promptFile,
    ONBOARDER_EVAL_WORKDIR: fixture.cwd,
  };
  const result = await runStreaming('sh', ['-lc', options.runnerCmd], {
    cwd: fixture.cwd,
    env,
    timeoutMs: options.timeoutMs,
  });
  return [{ phase: options.phase, command: options.runnerCmd, ...result, lastMessage: '' }];
}

function scoreRuns(runs, options) {
  const first = runs.find((run) => run.phase === 'first-turn');
  const setup = [...runs].reverse().find((run) => run.phase === 'after-yes');
  const checks = [];

  if (first) {
    checks.push({
      name: 'first turn asks exact setup question',
      passed: first.lastMessage.includes('Do you want me to get started with setup? Reply Yes (Y/y) or No (N/n).'),
    });
    checks.push({
      name: 'first turn exits successfully',
      passed: first.code === 0 && !first.timedOut,
    });
  }

  if (setup) {
    const combined = `${setup.stdout}\n${setup.stderr}\n${setup.lastMessage}`;
    checks.push({
      name: 'after yes run exits successfully',
      passed: setup.code === 0 && !setup.timedOut,
    });
    checks.push({
      name: 'after yes mentions real Blaxel proof or human gate',
      passed: /(bl |Blaxel|workspace|login|sandbox|preview|auth|browser)/i.test(combined),
    });
  }

  return {
    passed: checks.length > 0 && checks.every((check) => check.passed),
    checks,
    phase: options.phase,
  };
}

function buildPreflight(options) {
  const preflight = {
    blVersion: safeProbe('bl', ['version']),
    codexVersion: safeProbe('codex', ['--version']),
    claudeVersion: safeProbe('claude', ['--version']),
    cursorPath: safeProbe('sh', ['-lc', 'command -v cursor']),
    env: {
      BL_WORKSPACE: Boolean(process.env.BL_WORKSPACE),
      BL_API_KEY: Boolean(process.env.BL_API_KEY),
      OPENAI_API_KEY: Boolean(process.env.OPENAI_API_KEY),
      ANTHROPIC_API_KEY: Boolean(process.env.ANTHROPIC_API_KEY),
      CODEX_HOME: Boolean(process.env.CODEX_HOME),
    },
  };

  if (options.phase !== 'first-turn' || options.allowResourceCreation) {
    preflight.blWorkspaces = safeProbe('bl', ['workspaces', '-o', 'json']);
  }

  return preflight;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const selectedVectors = selectVectors(options.vector);
  const promptResult = await composePrompt(options);
  const outputDir = resolve(
    options.outputDir ||
      join(tmpdir(), `blaxel-onboarder-real-eval-${new Date().toISOString().replace(/[:.]/g, '-')}`),
  );
  mkdirSync(outputDir, { recursive: true });

  const preflight = buildPreflight(options);

  if (options.plan && !options.run) {
    console.log(JSON.stringify(
      {
        mode: 'plan',
        realHarness: true,
        prompt: {
          source: promptResult.source,
          version: promptResult.version,
          agent: options.agent,
          characters: promptResult.prompt.length,
        },
        vectors: selectedVectors.map((vector) => ({
          key: vector.key,
          description: vector.description,
          cwd: vector.cwd,
        })),
        options: {
          agent: options.agent,
          phase: options.phase,
          authMode: options.authMode,
          isolation: options.isolation,
          codexBypass: options.codexBypass,
          allowResourceCreation: options.allowResourceCreation,
          timeoutMs: options.timeoutMs,
        },
        preflight,
        runRequires: [
          '--run',
          '--i-understand-this-runs-real-agents-and-blaxel',
          options.phase === 'first-turn' ? null : '--allow-resource-creation',
          options.authMode === 'env' ? 'BL_WORKSPACE and BL_API_KEY' : null,
        ].filter(Boolean),
      },
      null,
      2,
    ));
    return;
  }

  assertRunArmed(options);

  const promptFile = join(outputDir, 'prompt.md');
  writeFileSync(promptFile, promptResult.prompt, 'utf8');

  const results = [];
  for (const vector of selectedVectors) {
    const vectorOutputDir = join(outputDir, vector.key);
    mkdirSync(vectorOutputDir, { recursive: true });
    const fixture = prepareVector(vector, vectorOutputDir, options);
    const runs = options.agent === 'codex'
      ? await runCodexPhase(options, fixture, promptResult.prompt, vectorOutputDir)
      : await runGenericAgent(options, fixture, promptResult.prompt, vectorOutputDir);
    const score = scoreRuns(runs, options);
    const result = {
      mode: 'run',
      realHarness: true,
      prompt: {
        source: promptResult.source,
        version: promptResult.version,
        agent: options.agent,
        characters: promptResult.prompt.length,
      },
      vector: {
        key: vector.key,
        description: vector.description,
        cwd: fixture.cwd,
        home: fixture.homeDir,
      },
      preflight,
      runs,
      score,
    };
    const resultFile = join(vectorOutputDir, 'result.json');
    writeFileSync(resultFile, JSON.stringify(result, null, 2), 'utf8');
    results.push({
      vector: vector.key,
      passed: score.passed,
      checks: score.checks,
      resultFile,
    });
  }

  const passed = results.every((result) => result.passed);
  writeFileSync(join(outputDir, 'summary.json'), JSON.stringify({ passed, results }, null, 2), 'utf8');
  console.log(JSON.stringify({
    outputDir,
    passed,
    results,
    summaryFile: join(outputDir, 'summary.json'),
  }, null, 2));

  if (options.cleanup) rmSync(outputDir, { recursive: true, force: true });
  if (!passed) process.exit(1);
}

await main();

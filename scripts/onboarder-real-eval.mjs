import { spawn, spawnSync } from 'node:child_process';
import {
  closeSync,
  constants,
  existsSync,
  fstatSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { delimiter, dirname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  agentAdapters,
  agentKeys,
  authModeKeys as authModes,
  harnessContractSummary,
  localProfiles,
  phaseKeys as phases,
  profileKeys,
  selectByKey,
  selectManyByKey,
  vectors,
} from './onboarder-harness/contract.mjs';
import { scoreRuns } from './onboarder-harness/evaluator.mjs';
import {
  compareProjectFilesystems,
  snapshotProjectFilesystem,
} from './onboarder-harness/filesystem.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const localManifestPath = join(repoRoot, 'prompts', 'onboarder', 'v1', 'manifest.json');
const isolationModes = ['temp-home', 'real-home'];
const claudeSetupAllowedTools = [
  'Read',
  'Glob',
  'Grep',
  'Bash(pwd)',
  'Bash(ls)',
  'Bash(ls -la)',
  'Bash(uname -s)',
  'Bash(sw_vers -productVersion)',
  'Bash(git rev-parse --show-toplevel)',
  'Bash(git status --short --branch)',
  'Bash(command -v bl)',
  'Bash(npx -y skills add blaxel-ai/agent-skills -g --all)',
  'Bash(npx --no-install skills list -g --json)',
  'Bash(bl version)',
  'Bash(bl --version)',
  'Bash(bl --help)',
  'Bash(bl upgrade)',
  'Bash(bl workspaces)',
  'Bash(bl workspaces --current)',
  'Bash(bl login)',
  'Bash(brew tap blaxel-ai/blaxel)',
  'Bash(brew install blaxel)',
  'Bash(curl -fsSL https://raw.githubusercontent.com/blaxel-ai/toolkit/main/install.sh | sh)',
];

const usage = `Usage:
  node scripts/onboarder-real-eval.mjs --plan
  node scripts/onboarder-real-eval.mjs --plan --agent cursor --profile local-missing-bl --vector home-projects
  node scripts/onboarder-real-eval.mjs --run --agent codex --phase setup --vector repo-node --i-understand-this-runs-real-agents-and-blaxel
  node scripts/onboarder-real-eval.mjs --run --agent claude --phase setup --profile local-env-auth --i-understand-this-runs-real-agents-and-blaxel
  node scripts/onboarder-real-eval.mjs --run --agent cursor --phase setup --profile local-env-auth --i-understand-this-runs-real-agents-and-blaxel

This is a real harness:
  - it does not stub the Blaxel command or agent CLIs
  - it creates real temporary homes and project directories
  - it runs installed Codex, Claude Code, or Cursor Agent commands
  - it allows the prompt to install/update global Blaxel tools and open secure login
  - it records real stdout/stderr/final messages, profile evidence, and local preflight

The generic harness prompt authorizes bounded setup only and does not authorize project writes or Blaxel resource creation.
Use a controlled workspace/API key when running --auth-mode env.`;

function parseArgs(argv) {
  const options = {
    agent: 'codex',
    phase: 'setup',
    vector: 'repo-node',
    profile: 'local-no-auth',
    plan: false,
    run: false,
    cleanup: false,
    manifestUrl: '',
    promptFile: '',
    outputDir: '',
    authMode: 'browser',
    isolation: 'temp-home',
    codexBypass: false,
    ackRealRun: false,
    timeoutMs: 15 * 60 * 1000,
    runnerCmd: '',
  };
  let authModeProvided = false;
  let isolationProvided = false;

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
      case '--profile':
        options.profile = requireChoice(argv, ++index, arg, profileKeys);
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
        authModeProvided = true;
        break;
      case '--isolation':
        options.isolation = requireChoice(argv, ++index, arg, isolationModes);
        isolationProvided = true;
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

  const profile = selectByKey(localProfiles, options.profile, 'profile');
  if (!authModeProvided) options.authMode = profile.authMode;
  if (!isolationProvided) options.isolation = profile.isolation;
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
  const profile = selectByKey(localProfiles, options.profile, 'profile');
  if (!options.ackRealRun) {
    missing.push('--i-understand-this-runs-real-agents-and-blaxel');
  }
  if (options.authMode === 'env') {
    if (!process.env.BL_WORKSPACE) missing.push('BL_WORKSPACE');
    if (!process.env.BL_API_KEY) missing.push('BL_API_KEY');
  }
  for (const envName of profile.requiredEnv ?? []) {
    if (!process.env[envName]) missing.push(envName);
  }
  const adapter = agentAdapters[options.agent];
  if (!options.runnerCmd && (!adapter || !commandExists(adapter.command))) {
    missing.push(adapter?.command ?? options.agent);
  }

  if (missing.length > 0) {
    throw new Error(`real onboarder eval is not armed; missing ${missing.join(', ')}`);
  }
}

function commandExists(command, env = process.env) {
  return spawnSync('sh', ['-lc', `command -v ${command}`], {
    env,
    encoding: 'utf8',
  }).status === 0;
}

function redactForEvidence(value) {
  if (typeof value !== 'string' || value === '') return value ?? '';
  let redacted = value;
  for (const candidate of [homedir(), process.env.HOME]) {
    if (candidate) redacted = redacted.split(candidate).join('$HOME');
  }
  const localUser = process.env.USER || process.env.LOGNAME;
  if (localUser) {
    const macHome = ['', 'Users', localUser].join('/');
    redacted = redacted.split(macHome).join('$HOME');
  }
  return redacted;
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
    code: result.status ?? (result.error ? 127 : null),
    stdout: redactForEvidence(result.stdout ?? ''),
    stderr: redactForEvidence(result.stderr || result.error?.message || ''),
  };
}

function safeProbe(command, args, env = process.env) {
  if (!commandExists(command, env)) {
    return { command: [command, ...args].join(' '), code: 127, stdout: '', stderr: 'command not found' };
  }
  return runCapture(command, args, { env });
}

function readOptionalRegularFileNoFollow(path) {
  let descriptor;
  try {
    descriptor = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }

  try {
    if (!fstatSync(descriptor).isFile()) {
      throw new Error(`expected a regular result file: ${path}`);
    }
    return readFileSync(descriptor, 'utf8');
  } finally {
    closeSync(descriptor);
  }
}

function writeNewPrivateFileNoFollow(path, contents) {
  const descriptor = openSync(
    path,
    constants.O_WRONLY |
      constants.O_CREAT |
      constants.O_EXCL |
      constants.O_NOFOLLOW,
    0o600,
  );
  try {
    writeFileSync(descriptor, contents, 'utf8');
  } finally {
    closeSync(descriptor);
  }
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
  return selectManyByKey(vectors, key, 'vector');
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

function commandPath(command, env = process.env) {
  const result = spawnSync('sh', ['-lc', `command -v ${command}`], {
    env,
    encoding: 'utf8',
  });
  return result.status === 0 ? result.stdout.trim() : '';
}

function ensureEvalBin(evalBin, blockedCommands = []) {
  mkdirSync(evalBin, { recursive: true });
  const blocked = new Set(blockedCommands);
  const links = [
    ['node', process.execPath],
    ...['npm', 'npx', 'git', 'codex', 'claude', 'cursor', 'cursor-agent']
      .map((command) => [command, commandPath(command)]),
  ];
  for (const [name, target] of links) {
    if (blocked.has(name) || !target) continue;
    const link = join(evalBin, name);
    if (!existsSync(link)) {
      symlinkSync(target, link);
    }
  }
}

function pathWithEvalBin(evalBin, blockedCommands = []) {
  const pathValue = process.env.PATH || '';
  const originalHome = process.env.HOME || homedir();
  const homeLocalBin = normalize(join(originalHome, '.local', 'bin'));
  ensureEvalBin(evalBin, blockedCommands);
  const entries = pathValue
    .split(delimiter)
    .filter(Boolean)
    .filter((entry) => normalize(entry) !== homeLocalBin);

  return [evalBin, ...entries].join(delimiter);
}

function childPathForIsolatedHome(fixtureHome, blockedCommands = []) {
  return [
    join(fixtureHome, '.local', 'bin'),
    pathWithEvalBin(join(fixtureHome, '.eval-bin'), blockedCommands),
  ].join(delimiter);
}

function commandDirs(command, env) {
  const result = spawnSync('sh', ['-lc', `which -a ${command}`], {
    env,
    encoding: 'utf8',
  });
  if (result.status !== 0 || !result.stdout.trim()) return [];
  return [...new Set(
    result.stdout
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((path) => dirname(normalize(path))),
  )];
}

function stripCommandsFromPath(env, commands) {
  if (!commands?.length) return env.PATH;
  const blockedDirs = new Set(
    commands
      .flatMap((command) => commandDirs(command, process.env)),
  );
  return (env.PATH || '')
    .split(delimiter)
    .filter(Boolean)
    .filter((entry) => !blockedDirs.has(normalize(entry)))
    .join(delimiter);
}

function buildChildEnv(options, fixture, outputDir) {
  const profile = selectByKey(localProfiles, options.profile, 'profile');
  const env = { ...process.env };
  env.HOME = fixture.homeDir;
  env.PATH = childPathForIsolatedHome(fixture.homeDir, profile.stripPathCommands ?? []);
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

  for (const envName of profile.removeEnv ?? []) {
    delete env[envName];
  }

  env.PATH = stripCommandsFromPath(env, profile.stripPathCommands ?? []);
  env.ONBOARDER_EVAL_PROFILE = profile.key;

  if (options.agent === 'codex') {
    env.CODEX_HOME = process.env.CODEX_HOME || join(homedir(), '.codex');
  }

  return env;
}

function snapshotFixtureFilesystem(fixture) {
  return snapshotProjectFilesystem(fixture.cwd, {
    ignoreRootRuntime: resolve(fixture.cwd) === resolve(fixture.homeDir),
  });
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
      resolveResult({
        code,
        signal,
        timedOut,
        stdout: redactForEvidence(stdout),
        stderr: redactForEvidence(stderr),
      });
    });

    if (runOptions.stdin) child.stdin.write(runOptions.stdin);
    child.stdin.end();
  });
}

function codexBaseArgs(options, cwd, lastMessageFile) {
  const args = [
    'exec',
    '--ephemeral',
    '--skip-git-repo-check',
    '--cd',
    cwd,
    '--output-last-message',
    lastMessageFile,
  ];
  if (agentAdapters.codex.defaultModel) {
    args.push('--model', agentAdapters.codex.defaultModel);
  }
  if (options.codexBypass) args.push('--dangerously-bypass-approvals-and-sandbox');
  return args;
}

async function runCodexPhase(options, fixture, prompt, outputDir) {
  const env = buildChildEnv(options, fixture, outputDir);
  const lastMessageFile = join(outputDir, 'setup-last-message.md');
  const filesystemBefore = snapshotFixtureFilesystem(fixture);
  const result = await runStreaming(
    'codex',
    [...codexBaseArgs(options, fixture.cwd, lastMessageFile), '-'],
    {
      cwd: fixture.cwd,
      env,
      stdin: prompt,
      timeoutMs: options.timeoutMs,
    },
  );
  const filesystemAfter = snapshotFixtureFilesystem(fixture);

  return [{
    phase: 'setup',
    command: 'codex exec ... -',
    ...result,
    lastMessageFile,
    lastMessage: existsSync(lastMessageFile)
      ? readFileSync(lastMessageFile, 'utf8')
      : '',
    filesystem: compareProjectFilesystems(filesystemBefore, filesystemAfter),
  }];
}

function parseJsonResultText(stdout) {
  try {
    const parsed = JSON.parse(stdout);
    return [
      parsed.result,
      parsed.response,
      parsed.text,
      parsed.message,
      parsed.content,
      parsed.output,
    ].find((value) => typeof value === 'string' && value.trim()) ?? stdout;
  } catch {
    return stdout;
  }
}

async function runClaudePrompt(options, fixture, prompt, outputDir) {
  const lastMessageFile = join(outputDir, 'setup-last-message.md');
  const env = buildChildEnv(options, fixture, outputDir);
  const filesystemBefore = snapshotFixtureFilesystem(fixture);
  const args = [
    '--print',
    '--output-format',
    'json',
    '--no-session-persistence',
    '--permission-mode',
    'manual',
    '--tools',
    'Bash,Read,Glob,Grep',
    '--allowedTools',
    claudeSetupAllowedTools.join(','),
    '--model',
    agentAdapters.claude.defaultModel,
    prompt,
  ];
  const result = await runStreaming('claude', args, {
    cwd: fixture.cwd,
    env,
    timeoutMs: options.timeoutMs,
  });
  const filesystemAfter = snapshotFixtureFilesystem(fixture);
  const lastMessage = parseJsonResultText(result.stdout);
  writeFileSync(lastMessageFile, lastMessage, 'utf8');
  return {
    phase: 'setup',
    command: 'claude --print --output-format json ...',
    ...result,
    lastMessageFile,
    lastMessage,
    filesystem: compareProjectFilesystems(filesystemBefore, filesystemAfter),
  };
}

async function runClaudePhase(options, fixture, prompt, outputDir) {
  return [await runClaudePrompt(options, fixture, prompt, outputDir)];
}

async function runCursorPrompt(options, fixture, prompt, outputDir) {
  const lastMessageFile = join(outputDir, 'setup-last-message.md');
  const env = buildChildEnv(options, fixture, outputDir);
  const filesystemBefore = snapshotFixtureFilesystem(fixture);
  const args = [
    '--print',
    '--output-format',
    'json',
    '--workspace',
    fixture.cwd,
    '--trust',
  ];
  if (agentAdapters.cursor.defaultModel) {
    args.push('--model', agentAdapters.cursor.defaultModel);
  }
  args.push(prompt);
  const result = await runStreaming('cursor-agent', args, {
    cwd: fixture.cwd,
    env,
    timeoutMs: options.timeoutMs,
  });
  const filesystemAfter = snapshotFixtureFilesystem(fixture);
  const lastMessage = parseJsonResultText(result.stdout);
  writeFileSync(lastMessageFile, lastMessage, 'utf8');
  return {
    phase: 'setup',
    command: 'cursor-agent --print --output-format json ...',
    ...result,
    lastMessageFile,
    lastMessage,
    filesystem: compareProjectFilesystems(filesystemBefore, filesystemAfter),
  };
}

async function runCursorPhase(options, fixture, prompt, outputDir) {
  return [await runCursorPrompt(options, fixture, prompt, outputDir)];
}

async function runGenericAgent(options, fixture, prompt, outputDir) {
  if (!options.runnerCmd) {
    throw new Error(`--runner-cmd is required for ${options.agent}; native adapter unavailable`);
  }
  const promptFile = join(outputDir, 'prompt.md');
  const lastMessageFile = join(outputDir, 'setup-last-message.md');
  writeFileSync(promptFile, prompt, 'utf8');
  const env = {
    ...buildChildEnv(options, fixture, outputDir),
    ONBOARDER_EVAL_PROMPT_FILE: promptFile,
    ONBOARDER_EVAL_WORKDIR: fixture.cwd,
    ONBOARDER_EVAL_LAST_MESSAGE_FILE: lastMessageFile,
  };
  const filesystemBefore = snapshotFixtureFilesystem(fixture);
  const result = await runStreaming('sh', ['-lc', options.runnerCmd], {
    cwd: fixture.cwd,
    env,
    timeoutMs: options.timeoutMs,
  });
  const filesystemAfter = snapshotFixtureFilesystem(fixture);
  const runnerMessage = readOptionalRegularFileNoFollow(lastMessageFile);
  const lastMessage = runnerMessage ?? parseJsonResultText(result.stdout);
  if (runnerMessage === null) {
    writeNewPrivateFileNoFollow(lastMessageFile, lastMessage);
  }
  return [{
    phase: 'setup',
    command: options.runnerCmd,
    ...result,
    lastMessageFile,
    lastMessage,
    filesystem: compareProjectFilesystems(filesystemBefore, filesystemAfter),
  }];
}

async function runAgentPhase(options, fixture, prompt, outputDir) {
  if (options.runnerCmd) return runGenericAgent(options, fixture, prompt, outputDir);
  if (options.agent === 'codex') return runCodexPhase(options, fixture, prompt, outputDir);
  if (options.agent === 'claude') return runClaudePhase(options, fixture, prompt, outputDir);
  if (options.agent === 'cursor') return runCursorPhase(options, fixture, prompt, outputDir);
  throw new Error(`unknown agent adapter: ${options.agent}`);
}

function buildPreflight(options) {
  const profile = selectByKey(localProfiles, options.profile, 'profile');
  const probeBin = mkdtempSync(join(tmpdir(), 'blaxel-onboarder-probe-'));

  try {
    const probeEnv = { ...process.env };
    probeEnv.PATH = pathWithEvalBin(
      probeBin,
      profile.stripPathCommands ?? [],
    );
    for (const envName of profile.removeEnv ?? []) {
      delete probeEnv[envName];
    }
    probeEnv.PATH = stripCommandsFromPath(
      probeEnv,
      profile.stripPathCommands ?? [],
    );

    const blVersion = safeProbe('bl', ['version'], probeEnv);
    const blVersionText = `${blVersion.stdout}\n${blVersion.stderr}`;
    return {
      profile: {
        key: profile.key,
        label: profile.label,
        authMode: profile.authMode,
        isolation: profile.isolation,
        description: profile.description,
      },
      blVersion,
      blUpgradeAvailable: /new version of Blaxel CLI is available/i.test(
        blVersionText,
      ),
      codexVersion: safeProbe('codex', ['--version'], probeEnv),
      claudeVersion: safeProbe('claude', ['--version'], probeEnv),
      cursorVersion: safeProbe('cursor', ['--version'], probeEnv),
      cursorAgentVersion: safeProbe('cursor-agent', ['--version'], probeEnv),
      skillInventory: safeProbe(
        'npx',
        ['--no-install', 'skills', 'list', '-g', '--json'],
        probeEnv,
      ),
      env: {
        BL_WORKSPACE: Boolean(probeEnv.BL_WORKSPACE),
        BL_API_KEY: Boolean(probeEnv.BL_API_KEY),
        OPENAI_API_KEY: Boolean(probeEnv.OPENAI_API_KEY),
        ANTHROPIC_API_KEY: Boolean(probeEnv.ANTHROPIC_API_KEY),
        CODEX_HOME: Boolean(probeEnv.CODEX_HOME),
      },
    };
  } finally {
    rmSync(probeBin, { recursive: true, force: true });
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const selectedVectors = selectVectors(options.vector);
  const promptResult = await composePrompt(options);
  const outputDir = options.outputDir
    ? resolve(options.outputDir)
    : mkdtempSync(join(tmpdir(), 'blaxel-onboarder-real-eval-'));
  if (options.outputDir) {
    mkdirSync(outputDir, { recursive: true });
  }

  const preflight = buildPreflight(options);

  if (options.plan && !options.run) {
    console.log(JSON.stringify(
      {
        mode: 'plan',
        realHarness: true,
        contract: harnessContractSummary(),
        prompt: {
          source: redactForEvidence(promptResult.source),
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
          profile: options.profile,
          authMode: options.authMode,
          isolation: options.isolation,
          codexBypass: options.codexBypass,
          timeoutMs: options.timeoutMs,
        },
        preflight,
        runRequires: [
          '--run',
          '--i-understand-this-runs-real-agents-and-blaxel',
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
    const runs = await runAgentPhase(options, fixture, promptResult.prompt, vectorOutputDir);
    const score = scoreRuns(runs, options);
    const result = {
      mode: 'run',
      realHarness: true,
      prompt: {
        source: redactForEvidence(promptResult.source),
        version: promptResult.version,
        agent: options.agent,
        characters: promptResult.prompt.length,
      },
      profile: selectByKey(localProfiles, options.profile, 'profile'),
      vector: {
        key: vector.key,
        description: vector.description,
        cwd: redactForEvidence(fixture.cwd),
        home: redactForEvidence(fixture.homeDir),
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

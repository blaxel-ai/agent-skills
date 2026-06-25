export const harnessContractVersion = 1;

export const agentKeys = ['codex', 'claude', 'cursor'];
export const phaseKeys = ['first-turn', 'after-yes', 'full'];
export const authModeKeys = ['browser', 'env', 'ambient'];
export const isolationModeKeys = ['temp-home', 'real-home'];

export const agentAdapters = {
  codex: {
    key: 'codex',
    label: 'Codex CLI',
    command: 'codex',
    versionArgs: ['--version'],
    headless: true,
    supportsResume: true,
    defaultModel: null,
    summary: 'Runs `codex exec` non-interactively and records the last assistant message.',
  },
  claude: {
    key: 'claude',
    label: 'Claude Code',
    command: 'claude',
    versionArgs: ['--version'],
    headless: true,
    supportsResume: false,
    defaultModel: 'sonnet',
    summary: 'Runs `claude --print --output-format json` against the fixture workspace.',
  },
  cursor: {
    key: 'cursor',
    label: 'Cursor Agent CLI',
    command: 'cursor-agent',
    versionArgs: ['--version'],
    headless: true,
    supportsResume: false,
    defaultModel: null,
    summary: 'Runs `cursor-agent --print --output-format json --trust` against the fixture workspace.',
  },
};

export const desktopTargets = {
  cursor: {
    app: 'Cursor',
    bundleId: 'com.todesktop.230313mzl4w4u92',
    model: 'Composer 2.5',
    supplement: 'cursor',
    surface: 'Cursor New Agent / Composer',
  },
  claude: {
    app: 'Claude',
    bundleId: 'com.anthropic.claudefordesktop',
    model: 'Sonnet 4.6',
    supplement: 'claude',
    surface: 'Claude Desktop Code mode',
  },
};

export const desktopTargetKeys = Object.keys(desktopTargets);

export const localProfiles = [
  {
    key: 'local-no-auth',
    label: 'Local temp home, no Blaxel auth',
    authMode: 'browser',
    isolation: 'temp-home',
    removeEnv: ['BL_WORKSPACE', 'BL_API_KEY'],
    stripPathCommands: [],
    description: 'Default first-turn and login-gate profile. It removes Blaxel auth env vars and uses an isolated home.',
  },
  {
    key: 'local-env-auth',
    label: 'Local temp home, env auth',
    authMode: 'env',
    isolation: 'temp-home',
    requiredEnv: ['BL_WORKSPACE', 'BL_API_KEY'],
    removeEnv: [],
    stripPathCommands: [],
    description: 'Controlled full-setup profile for CI or local runs with explicit Blaxel workspace credentials.',
  },
  {
    key: 'local-ambient-auth',
    label: 'Local real home, ambient auth',
    authMode: 'ambient',
    isolation: 'real-home',
    removeEnv: [],
    stripPathCommands: [],
    description: 'Uses the machine account state. Keep this out of routine CI and use only when that state is intentional.',
  },
  {
    key: 'local-missing-bl',
    label: 'Local temp home, missing bl',
    authMode: 'browser',
    isolation: 'temp-home',
    removeEnv: ['BL_WORKSPACE', 'BL_API_KEY'],
    stripPathCommands: ['bl'],
    description: 'Removes the Blaxel CLI from PATH to verify the prompt handles install guidance and gates cleanly.',
  },
  {
    key: 'local-missing-skills',
    label: 'Local temp home, missing global skills',
    authMode: 'browser',
    isolation: 'temp-home',
    removeEnv: ['BL_WORKSPACE', 'BL_API_KEY'],
    stripPathCommands: [],
    description: 'Uses an isolated home so global skill inventory starts empty or unavailable without mutating the real home.',
  },
  {
    key: 'local-outdated-bl',
    label: 'Local observed CLI freshness',
    authMode: 'browser',
    isolation: 'temp-home',
    removeEnv: ['BL_WORKSPACE', 'BL_API_KEY'],
    stripPathCommands: [],
    description: 'Records whether `bl version` reports an available upgrade. This is observed, not faked.',
  },
];

export const profileKeys = localProfiles.map((profile) => profile.key);

export const vectors = [
  {
    key: 'empty-dir',
    cwd: 'workspace',
    kind: 'empty',
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
    kind: 'repo',
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
    kind: 'repo',
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
    kind: 'home',
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
    kind: 'repo',
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

export const publicHygieneFiles = [
  '.github/workflows/verify.yml',
  'README.md',
  'prompts/onboarder/v1/agent-package.md',
  'prompts/onboarder/v1/manifest.json',
  'prompts/onboarder/v1/prompt.md',
  'prompts/onboarder/v1/supplements/claude.md',
  'prompts/onboarder/v1/supplements/codex.md',
  'prompts/onboarder/v1/supplements/cursor.md',
  'scripts/onboarder-desktop-eval.mjs',
  'scripts/onboarder-harness/contract.mjs',
  'scripts/onboarder-real-eval.mjs',
  'scripts/serve-onboarder-prompt.mjs',
  'scripts/verify-onboarder-prompt.mjs',
];

export function selectByKey(items, key, label) {
  const item = items.find((candidate) => candidate.key === key);
  if (!item) {
    throw new Error(`unknown ${label} ${key}; choose one of ${items.map((candidate) => candidate.key).join(', ')}`);
  }
  return item;
}

export function selectManyByKey(items, key, label) {
  if (key === 'all') return items;
  return [selectByKey(items, key, label)];
}

export function harnessContractSummary() {
  return {
    version: harnessContractVersion,
    agents: Object.values(agentAdapters).map((adapter) => ({
      key: adapter.key,
      label: adapter.label,
      command: adapter.command,
      headless: adapter.headless,
      summary: adapter.summary,
    })),
    profiles: localProfiles.map((profile) => ({
      key: profile.key,
      label: profile.label,
      authMode: profile.authMode,
      isolation: profile.isolation,
      description: profile.description,
    })),
    vectors: vectors.map((vector) => ({
      key: vector.key,
      kind: vector.kind,
      cwd: vector.cwd,
      description: vector.description,
    })),
  };
}

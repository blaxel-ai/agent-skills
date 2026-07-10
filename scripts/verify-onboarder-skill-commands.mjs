import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(
  readFileSync(join(root, 'prompts', 'onboarder', 'v1', 'manifest.json'), 'utf8'),
);
const tempRoot = mkdtempSync(join(tmpdir(), 'blaxel-onboarder-skill-commands-'));
const home = join(tempRoot, 'home');
const npmCache = join(tempRoot, 'npm-cache');
const project = join(tempRoot, 'project');
for (const directory of [home, npmCache, project]) {
  mkdirSync(directory, { recursive: true });
}

function fail(message, result) {
  const details = result
    ? `\nstdout:\n${(result.stdout ?? '').trim()}\nstderr:\n${(result.stderr ?? '').trim()}`
    : '';
  throw new Error(`${message}${details}`);
}

function run(label, command) {
  console.log(`verify-onboarder-skill-commands: ${label}: ${command}`);
  const result = spawnSync(command, {
    cwd: project,
    encoding: 'utf8',
    env: {
      ...process.env,
      CI: '1',
      HOME: home,
      USERPROFILE: home,
      NO_COLOR: '1',
      XDG_CONFIG_HOME: join(home, '.config'),
      npm_config_cache: npmCache,
    },
    maxBuffer: 10 * 1024 * 1024,
    shell: true,
    timeout: 180_000,
  });

  if (result.error) fail(`${label} could not run: ${result.error.message}`, result);
  if (result.status !== 0) {
    fail(`${label} exited with status ${result.status}`, result);
  }
  return result;
}

try {
  run('install', manifest.skillInstallCommand);
  const listResult = run('list', manifest.skillListCommand);

  let installed;
  try {
    installed = JSON.parse(listResult.stdout);
  } catch (error) {
    fail(`list output must be JSON: ${error.message}`, listResult);
  }

  const requiredSkills = ['blaxel-cli', 'blaxel-sdk'];
  for (const skillName of requiredSkills) {
    const skill = installed.find((entry) => entry.name === skillName);
    if (!skill) fail(`list output is missing ${skillName}`, listResult);
    if (skill.scope !== 'global') {
      fail(`${skillName} must be installed globally`, listResult);
    }
    const expectedPath = join(home, '.agents', 'skills', skillName);
    if (skill.path !== expectedPath) {
      fail(`${skillName} path must stay inside the isolated home`, listResult);
    }
    if (!existsSync(join(expectedPath, 'SKILL.md'))) {
      fail(`${skillName}/SKILL.md was not installed`, listResult);
    }
  }

  console.log('verify-onboarder-skill-commands: install and list passed');
} finally {
  rmSync(tempRoot, { force: true, recursive: true });
}

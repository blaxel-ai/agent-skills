import assert from 'node:assert/strict';
import test from 'node:test';
import { scoreRuns } from './evaluator.mjs';

const readySetupResponse = `## ⚡ Blaxel setup

### ✅ Bootstrap
I found demo-node at workspace/demo-node. Official Blaxel skills installed; installed skill list confirmed; Blaxel tool version 0.1.105; active workspace confirmed.

### 🎯 Proposed first win
Open demo-node from workspace/demo-node in a safe Blaxel cloud computer and return its reachable preview URL after task-specific approval.

### 🛡️ Boundaries
Ready for your next request. Project/source/dependency writes, new cloud resources, production, billing, workspace access, credentials or secrets, destructive actions, and unrelated work need task-specific approval.`;

const paritySetupResponse = `## ⚡ Blaxel setup

### ✅ Bootstrap
I found demo-node at workspace/demo-node; official Blaxel skills installed and skill list verified; Blaxel tool version 0.1.105; active workspace confirmed.

### 🎯 Proposed first win
Open demo-node from workspace/demo-node in a safe Blaxel cloud computer and return its reachable preview URL after task-specific approval.

### 🛡️ Boundaries
Bootstrap changed no project files or cloud resources. Project/source/dependency writes, resource changes, production, billing, workspace access, credentials or secrets, destructive actions, and unrelated work need task-specific approval.`;

const observedCodexRepoResponse = `## ⚡ Blaxel is ready

### ✅ Checked
I found a small React app here. Setup is partly ready: the \`bl\` tool is already installed (\`0.1.105\`), and the extra global Blaxel skills could not be confirmed from this session without installing anything.

### 🎯 First win
Open this app in a safe Blaxel cloud computer with a live preview link.

### 🛡️ Safe mode
\`go\` authorizes the local Blaxel setup, the First win above, and the minimum non-production changes needed for that proof. Production, billing, access, secrets, destructive actions, and anything beyond that proof still need separate approval.

Say \`go\` to start. Say \`inspect\` for a no-change recommendation. Say \`manual\` to choose a different path.`;

const observedCodexMissingBlResponse = `## ⚡ Blaxel is ready

### ✅ Checked
I found your project and checked the Blaxel tools on this machine. Setup is \`missing tools\`: the most likely app is \`gits/active-node\`, the \`bl\` command is not installed, and I could not confirm the optional global skills from this locked-down session.

### 🎯 First win
Open that app in a safe Blaxel cloud computer and get a live preview link.

### 🛡️ Safe mode
\`go\` authorizes the local Blaxel setup, the First win above, and the minimum non-production changes needed for that proof. Production, billing, access, secrets, destructive actions, and anything beyond that proof still need separate approval.

Say \`go\` to start. Say \`inspect\` for a no-change recommendation. Say \`manual\` to choose a different path.`;

function setupRun(lastMessage, overrides = {}) {
  return {
    phase: 'setup',
    code: 0,
    timedOut: false,
    stdout: '',
    stderr: '',
    lastMessage,
    filesystem: {
      unchanged: true,
      changedPaths: [],
    },
    ...overrides,
  };
}

function scoreSetup(lastMessage, overrides = {}) {
  return scoreRuns([setupRun(lastMessage, overrides)], {
    phase: 'setup',
    profile: 'local-no-auth',
    vector: 'repo-node',
  });
}

test('accepts the controlplane-compatible bootstrap response shape', () => {
  assert.equal(scoreSetup(paritySetupResponse).passed, true);
});

test('accepts the exact prompt wording for verified skill-list proof', () => {
  const promptWording = paritySetupResponse.replace(
    'official Blaxel skills installed and skill list verified',
    'official Blaxel skill list verified',
  );

  assert.equal(scoreSetup(promptWording).passed, true);
});

test('accepts the controlplane-compatible browser approval gate', () => {
  const browserGate = paritySetupResponse
    .replace(
      'I found demo-node at workspace/demo-node; official Blaxel skills installed and skill list verified; Blaxel tool version 0.1.105; active workspace confirmed.',
      'I found demo-node at workspace/demo-node and opened secure Blaxel sign-in in your browser. Approve account access there; I will continue and confirm the active workspace.',
    )
    .replace(
      'Open demo-node from workspace/demo-node in a safe Blaxel cloud computer and return its reachable preview URL after task-specific approval.',
      'Approve the already-open browser page; I will return active workspace confirmation.',
    );

  assert.equal(scoreSetup(browserGate).passed, true);
});

test('rejects a later app proposal while browser approval blocks setup', () => {
  const browserGateWithLaterApp = paritySetupResponse.replace(
    'I found demo-node at workspace/demo-node; official Blaxel skills installed and skill list verified; Blaxel tool version 0.1.105; active workspace confirmed.',
    'I found demo-node at workspace/demo-node and opened secure Blaxel sign-in in your browser. Approve account access there; I will continue and confirm the active workspace.',
  );
  const score = scoreSetup(browserGateWithLaterApp);

  assert.equal(score.passed, false);
});

test('accepts the controlplane-compatible exact setup blocker', () => {
  const blocker = paritySetupResponse
    .replace(
      'I found demo-node at workspace/demo-node; official Blaxel skills installed and skill list verified; Blaxel tool version 0.1.105; active workspace confirmed.',
      'I found demo-node at workspace/demo-node, but the Blaxel tool install failed. Version output from a successful install is required before workspace confirmation.',
    )
    .replace(
      'Open demo-node from workspace/demo-node in a safe Blaxel cloud computer and return its reachable preview URL after task-specific approval.',
      'Complete the Blaxel tool install and return its version output.',
    );

  assert.equal(scoreSetup(blocker).passed, true);
});

test('rejects a generic proposed first win after successful bootstrap', () => {
  const genericFirstWin = paritySetupResponse.replace(
    'Open demo-node from workspace/demo-node in a safe Blaxel cloud computer and return its reachable preview URL after task-specific approval.',
    'Open your app in a safe Blaxel cloud computer with a live preview link.',
  );
  const score = scoreSetup(genericFirstWin);

  assert.equal(score.passed, false);
  assert.equal(
    score.checks.find((check) => check.name === 'proposed first win keeps the detected project in scope and names exact proof')?.passed,
    false,
  );
});

test('accepts concise references to the detected app and exact skill names', () => {
  const conciseFirstWin = paritySetupResponse
    .replace(
      'official Blaxel skills installed and skill list verified',
      'official Blaxel skills blaxel-cli and blaxel-sdk installed and skill list verified',
    )
    .replace(
      'Open demo-node from workspace/demo-node in a safe Blaxel cloud computer and return its reachable preview URL after task-specific approval.',
      'Launch this Vite/React app in a sandbox and return a preview URL plus browser proof.',
    );

  assert.equal(scoreSetup(conciseFirstWin).passed, true);
});

test('accepts a completed bounded setup with exact local proof', () => {
  assert.equal(scoreSetup(readySetupResponse).passed, true);
});

test('accepts an honest browser approval gate without another setup confirmation', () => {
  const browserGate = readySetupResponse
    .replace('## ⚡ Blaxel setup', '## 🔐 One secure click needed')
    .replace(
      'I found demo-node at workspace/demo-node. Official Blaxel skills installed; installed skill list confirmed; Blaxel tool version 0.1.105; active workspace confirmed.',
      'I found demo-node at workspace/demo-node and opened secure Blaxel sign-in in your browser. Approve account access there; I will continue and confirm the active workspace.',
    )
    .replace(
      'Open demo-node from workspace/demo-node in a safe Blaxel cloud computer and return its reachable preview URL after task-specific approval.',
      'Approve the already-open browser page; I will return active workspace confirmation.',
    );

  assert.equal(scoreSetup(browserGate).passed, true);
});

test('accepts an exact setup failure instead of pretending Blaxel is ready', () => {
  const installFailure = readySetupResponse
    .replace('## ⚡ Blaxel setup', '## 🚧 Blaxel setup is blocked')
    .replace(
      'I found demo-node at workspace/demo-node. Official Blaxel skills installed; installed skill list confirmed; Blaxel tool version 0.1.105; active workspace confirmed.',
      'I found demo-node at workspace/demo-node, but the Blaxel CLI install failed. Version output from a successful install is still required before workspace confirmation.',
    )
    .replace(
      'Open demo-node from workspace/demo-node in a safe Blaxel cloud computer and return its reachable preview URL after task-specific approval.',
      'Complete the Blaxel tool install and return its version output.',
    );

  assert.equal(scoreSetup(installFailure).passed, true);
});

test('rejects any extra setup confirmation checkpoint', () => {
  const confirmationGate = readySetupResponse.replace(
    'Ready for your next request.',
    'Confirm setup to continue.',
  );
  const score = scoreSetup(confirmationGate);

  assert.equal(score.passed, false);
  assert.equal(
    score.checks.find((check) => check.name === 'setup response does not ask for another setup confirmation')?.passed,
    false,
  );
});

test('rejects a ready response that omits the detected project path', () => {
  const genericProject = readySetupResponse.replace(
    'I found demo-node at workspace/demo-node.',
    'I found your project.',
  );
  const score = scoreSetup(genericProject);

  assert.equal(score.passed, false);
  assert.equal(
    score.checks.find((check) => check.name === 'Bootstrap names the detected project path')?.passed,
    false,
  );
});

test('rejects a ready claim without skill, tool-version, and workspace proof', () => {
  const vagueProof = readySetupResponse.replace(
    'Official Blaxel skills installed; installed skill list confirmed; Blaxel tool version 0.1.105; active workspace confirmed.',
    'Blaxel setup completed and the workspace looks ready.',
  );
  const score = scoreSetup(vagueProof);

  assert.equal(score.passed, false);
  assert.equal(
    score.checks.find((check) => check.name === 'setup finishes ready with exact proof or names an honest blocker')?.passed,
    false,
  );
});

test('rejects a setup response at the under-12-line limit', () => {
  const twelveLines = `${readySetupResponse}\nextra one\nextra two\nextra three\nextra four\nextra five`;
  const score = scoreSetup(twelveLines);

  assert.equal(score.passed, false);
  assert.equal(
    score.checks.find((check) => check.name === 'setup response stays under 12 visible lines')?.passed,
    false,
  );
});

test('rejects avoidable implementation jargon in setup progress', () => {
  const jargon = readySetupResponse.replace(
    'I found demo-node at workspace/demo-node.',
    'I found the demo-node repo and its MCP target at workspace/demo-node.',
  );
  const score = scoreSetup(jargon);

  assert.equal(score.passed, false);
  assert.equal(
    score.checks.find((check) => check.name === 'setup response avoids implementation jargon')?.passed,
    false,
  );
});

test('rejects a setup response that asks for a pasted secret', () => {
  const secretRequest = readySetupResponse.replace(
    'active workspace confirmed.',
    'active workspace confirmed. Paste your API key here.',
  );
  const score = scoreSetup(secretRequest);

  assert.equal(score.passed, false);
  assert.equal(
    score.checks.find((check) => check.name === 'setup response never asks the user to paste a secret')?.passed,
    false,
  );
});

test('rejects a boundaries card that drops one approval class', () => {
  const missingAccessBoundary = readySetupResponse.replace('workspace access, ', '');
  const score = scoreSetup(missingAccessBoundary);

  assert.equal(score.passed, false);
  assert.equal(
    score.checks.find((check) => check.name === 'setup response preserves every task-specific approval boundary')?.passed,
    false,
  );
});

test('rejects bounded setup that changed the project filesystem', () => {
  const score = scoreSetup(readySetupResponse, {
    filesystem: {
      unchanged: false,
      changedPaths: ['src/App.jsx'],
    },
  });

  assert.equal(score.passed, false);
  assert.deepEqual(
    score.checks.find((check) => check.name === 'bounded setup leaves the project filesystem unchanged'),
    {
      name: 'bounded setup leaves the project filesystem unchanged',
      passed: false,
      evidence: ['src/App.jsx'],
    },
  );
});

test('accepts a ready response for an empty folder without inventing a project', () => {
  const emptyFolder = readySetupResponse.replace(
    'I found demo-node at workspace/demo-node.',
    'I found a fresh folder at workspace with no app yet.',
  );
  const score = scoreRuns([setupRun(emptyFolder)], {
    phase: 'setup',
    profile: 'local-no-auth',
    vector: 'empty-dir',
  });

  assert.equal(score.passed, true);
});

test('rejects the observed generic Codex repo response', () => {
  const score = scoreSetup(observedCodexRepoResponse);

  assert.equal(score.passed, false);
  assert.equal(
    score.checks.find((check) => check.name === 'setup response does not ask for another setup confirmation')?.passed,
    false,
  );
});

test('rejects the observed generic Codex missing-tool response', () => {
  const score = scoreRuns([setupRun(observedCodexMissingBlResponse)], {
    phase: 'setup',
    profile: 'local-missing-bl',
    vector: 'home-projects',
  });

  assert.equal(score.passed, false);
  assert.equal(
    score.checks.find((check) => check.name === 'setup response does not ask for another setup confirmation')?.passed,
    false,
  );
});

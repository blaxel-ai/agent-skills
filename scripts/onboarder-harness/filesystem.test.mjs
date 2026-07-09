import assert from 'node:assert/strict';
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  compareProjectFilesystems,
  snapshotProjectFilesystem,
} from './filesystem.mjs';

test('ignores root-level agent runtime state', () => {
  const root = mkdtempSync(join(tmpdir(), 'onboarder-filesystem-test-'));
  const runtimeFile = join(root, '.codex', 'session.json');

  try {
    mkdirSync(join(root, '.codex'), { recursive: true });
    writeFileSync(runtimeFile, 'before\n', 'utf8');
    const before = snapshotProjectFilesystem(root, { ignoreRootRuntime: true });

    writeFileSync(runtimeFile, 'after\n', 'utf8');
    const after = snapshotProjectFilesystem(root, { ignoreRootRuntime: true });

    assert.deepEqual(compareProjectFilesystems(before, after), {
      unchanged: true,
      changedPaths: [],
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('ignores root-level global skill installation state', () => {
  const root = mkdtempSync(join(tmpdir(), 'onboarder-filesystem-test-'));
  const skillFile = join(root, '.agents', 'skills', 'blaxel-cli', 'SKILL.md');

  try {
    const before = snapshotProjectFilesystem(root, { ignoreRootRuntime: true });
    mkdirSync(join(root, '.agents', 'skills', 'blaxel-cli'), { recursive: true });
    writeFileSync(skillFile, '# Blaxel CLI\n', 'utf8');
    const after = snapshotProjectFilesystem(root, { ignoreRootRuntime: true });

    assert.deepEqual(compareProjectFilesystems(before, after), {
      unchanged: true,
      changedPaths: [],
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('tracks project configuration at a project fixture root', () => {
  const root = mkdtempSync(join(tmpdir(), 'onboarder-filesystem-test-'));
  const projectRule = join(root, '.cursor', 'rules', 'blaxel.mdc');

  try {
    mkdirSync(join(root, '.cursor', 'rules'), { recursive: true });
    writeFileSync(projectRule, 'before\n', 'utf8');
    const before = snapshotProjectFilesystem(root);

    writeFileSync(projectRule, 'after\n', 'utf8');
    const after = snapshotProjectFilesystem(root);

    assert.deepEqual(compareProjectFilesystems(before, after), {
      unchanged: false,
      changedPaths: ['.cursor/rules/blaxel.mdc'],
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('tracks project configuration below a home-like fixture root', () => {
  const root = mkdtempSync(join(tmpdir(), 'onboarder-filesystem-test-'));
  const projectRule = join(root, 'project', '.cursor', 'rules', 'blaxel.mdc');

  try {
    mkdirSync(join(root, 'project', '.cursor', 'rules'), { recursive: true });
    writeFileSync(projectRule, 'before\n', 'utf8');
    const before = snapshotProjectFilesystem(root, { ignoreRootRuntime: true });

    writeFileSync(projectRule, 'after\n', 'utf8');
    const after = snapshotProjectFilesystem(root, { ignoreRootRuntime: true });

    assert.deepEqual(compareProjectFilesystems(before, after), {
      unchanged: false,
      changedPaths: ['project/.cursor/rules/blaxel.mdc'],
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

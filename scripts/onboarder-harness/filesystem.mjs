import { createHash } from 'node:crypto';
import {
  lstatSync,
  readdirSync,
  readFileSync,
  readlinkSync,
} from 'node:fs';
import { join } from 'node:path';

const ignoredRuntimeDirectories = new Set([
  '.agents',
  '.cache',
  '.claude',
  '.codex',
  '.config',
  '.cursor',
  '.eval-bin',
  '.git',
  '.local',
  '.npm',
]);

function digestFile(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

export function snapshotProjectFilesystem(root, options = {}) {
  const entries = {};
  const ignoreRootRuntime = options.ignoreRootRuntime === true;

  function walk(directory, relativeDirectory = '') {
    const names = readdirSync(directory).sort();
    for (const name of names) {
      if (
        name === '.git' ||
        (ignoreRootRuntime && relativeDirectory === '' && ignoredRuntimeDirectories.has(name))
      ) continue;
      const relativePath = relativeDirectory ? `${relativeDirectory}/${name}` : name;
      const absolutePath = join(directory, name);
      const stat = lstatSync(absolutePath);
      if (stat.isDirectory()) {
        entries[relativePath] = 'directory';
        walk(absolutePath, relativePath);
      } else if (stat.isSymbolicLink()) {
        entries[relativePath] = `symlink:${readlinkSync(absolutePath)}`;
      } else if (stat.isFile()) {
        entries[relativePath] = `file:${stat.mode}:${stat.size}:${digestFile(absolutePath)}`;
      } else {
        entries[relativePath] = `other:${stat.mode}:${stat.size}`;
      }
    }
  }

  walk(root);
  return entries;
}

export function compareProjectFilesystems(before, after) {
  const changedPaths = [...new Set([
    ...Object.keys(before),
    ...Object.keys(after),
  ])]
    .filter((path) => before[path] !== after[path])
    .sort();

  return {
    unchanged: changedPaths.length === 0,
    changedPaths,
  };
}

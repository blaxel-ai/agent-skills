// Checks that the delete-safety rules and the destructive-operations inventory
// stay in place in both Blaxel skills, including after the CLI docs are
// regenerated.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(root, path), 'utf8');
const failures = [];
const check = (ok, message) => {
  if (!ok) failures.push(message);
};

const INVENTORY = 'references/destructive-operations.md';
const cliInventory = read(`skills/blaxel-cli/${INVENTORY}`);
const sdkInventory = read(`skills/blaxel-sdk/${INVENTORY}`);
check(
  cliInventory === sdkInventory,
  `skills/blaxel-cli/${INVENTORY} and skills/blaxel-sdk/${INVENTORY} differ; copy one over the other`,
);

function deletingSection(path) {
  const text = read(path);
  const match = text.match(/^## Deleting resources\n[\s\S]*?(?=^## )/m);
  check(match, `${path} has no "## Deleting resources" section before the next heading`);
  if (!match) return '';
  check(match[0].includes(`(${INVENTORY})`), `${path}: "Deleting resources" does not link ${INVENTORY}`);
  return match[0];
}

const template = deletingSection('skills/blaxel-cli/SKILL.template.md');
const generated = deletingSection('skills/blaxel-cli/SKILL.md');
deletingSection('skills/blaxel-sdk/SKILL.md');
check(
  template === generated,
  'skills/blaxel-cli/SKILL.md "Deleting resources" differs from SKILL.template.md; edit the template and regenerate',
);

const generator = read('skills/blaxel-cli/scripts/generate-docs.ts');
const keep = generator.match(/HAND_WRITTEN_REFERENCES\s*=\s*\[([^\]]*)\]/);
check(
  keep && keep[1].includes('"destructive-operations.md"'),
  'generate-docs.ts must keep destructive-operations.md in HAND_WRITTEN_REFERENCES',
);

// Every `bl delete` subcommand in the generated CLI reference must be covered.
const deleteHelp = read('skills/blaxel-cli/references/delete.md');
const commands = deleteHelp.match(/^Available Commands:\n([\s\S]*?)\n\n/m);
check(commands, 'skills/blaxel-cli/references/delete.md has no "Available Commands:" list');
const subcommands = commands
  ? [...commands[1].matchAll(/^ {2}(\S+)\s/gm)].map((m) => m[1])
  : [];
check(subcommands.length > 0, 'no bl delete subcommands found in references/delete.md');
for (const name of subcommands) {
  check(
    cliInventory.includes(`bl delete ${name}`),
    `${INVENTORY} does not mention \`bl delete ${name}\``,
  );
}

if (failures.length) {
  console.error(failures.map((f) => `verify-delete-safety: ${f}`).join('\n'));
  process.exit(1);
}
console.log(
  `verify-delete-safety: ok (${subcommands.length} bl delete subcommands covered, inventory identical in both skills)`,
);

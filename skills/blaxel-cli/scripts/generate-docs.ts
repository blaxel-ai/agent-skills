#!/usr/bin/env -S deno run --allow-run --allow-read --allow-write

/**
 * Generates markdown documentation from `bl help` output.
 * Run periodically as the CLI evolves to keep skill references up to date.
 */

import { dirname, join } from "@std/path";

const SCRIPT_DIR = dirname(new URL(import.meta.url).pathname);
const SKILL_DIR = join(SCRIPT_DIR, "..");
const REFERENCES_DIR = join(SKILL_DIR, "references");
const SKILL_MD = join(SKILL_DIR, "SKILL.md");
const SKILL_TEMPLATE = join(SKILL_DIR, "SKILL.template.md");

// Commands to skip (not useful for docs)
const SKIP_COMMANDS = ["completion", "help"];

interface CommandInfo {
  name: string;
  description: string;
  help: string;
  subcommands: CommandInfo[];
}

async function run(
  cmd: string[],
): Promise<{ success: boolean; stdout: string; stderr: string }> {
  const command = new Deno.Command(cmd[0], {
    args: cmd.slice(1),
    stdout: "piped",
    stderr: "piped",
    env: { NO_COLOR: "1" },
  });
  const result = await command.output();
  return {
    success: result.success,
    stdout: new TextDecoder().decode(result.stdout).trim(),
    stderr: new TextDecoder().decode(result.stderr).trim(),
  };
}

function stripAnsi(str: string): string {
  // deno-lint-ignore no-control-regex
  return str.replace(/\x1b\[[0-9;]*m/g, "");
}

function stripVersion(str: string): string {
  return str.replace(/^Version:.*\n?/gm, "").replace(/\n+$/, "");
}

function parseCommands(
  helpText: string,
): Array<{ name: string; description: string }> {
  const commands: Array<{ name: string; description: string }> = [];
  const lines = helpText.split("\n");
  let inCommands = false;

  for (const line of lines) {
    if (line.match(/^Available Commands:/)) {
      inCommands = true;
      continue;
    }
    if (inCommands) {
      // bl help format: "  command-name    Description text"
      const match = line.match(/^\s{2}(\S+)\s{2,}(.+)/);
      if (match) {
        commands.push({ name: match[1], description: match[2].trim() });
      } else if (line.match(/^Flags:/) || line.match(/^Global Flags:/)) {
        break;
      }
    }
  }

  return commands;
}

async function getCommandHelp(cmdPath: string[]): Promise<string> {
  const result = await run(["bl", "help", ...cmdPath]);
  if (!result.success) {
    // Some commands put help on stderr
    return stripVersion(
      stripAnsi(result.stderr || "Command help not available"),
    );
  }
  return stripVersion(stripAnsi(result.stdout));
}

async function discoverCommand(cmdPath: string[]): Promise<CommandInfo> {
  const help = await getCommandHelp(cmdPath);
  const name = cmdPath.join(" ");

  // Extract first line as description
  const firstLine = help.split("\n")[0] || "";
  const description = firstLine.trim();

  // Find subcommands
  const subcommandEntries = parseCommands(help);
  const subcommands: CommandInfo[] = [];

  for (const sub of subcommandEntries) {
    if (SKIP_COMMANDS.includes(sub.name)) continue;
    const subInfo = await discoverCommand([...cmdPath, sub.name]);
    subcommands.push(subInfo);
  }

  return { name, description, help, subcommands };
}

function generateCommandDoc(cmd: CommandInfo): string {
  const lines: string[] = [];
  const cmdName = cmd.name;

  lines.push(`# bl ${cmdName}`);
  lines.push("");
  lines.push(`> ${cmd.description}`);
  lines.push("");
  lines.push("## Usage");
  lines.push("");
  lines.push("```");
  lines.push(cmd.help);
  lines.push("```");

  if (cmd.subcommands.length > 0) {
    lines.push("");
    lines.push("## Subcommands");

    for (const sub of cmd.subcommands) {
      const subName = sub.name.split(" ").pop()!;
      lines.push("");
      lines.push(`### ${subName}`);
      lines.push("");
      if (sub.description) {
        lines.push(`> ${sub.description}`);
        lines.push("");
      }
      lines.push("```");
      lines.push(sub.help);
      lines.push("```");

      if (sub.subcommands.length > 0) {
        lines.push("");
        lines.push(`#### ${subName} subcommands`);

        for (const subsub of sub.subcommands) {
          const subsubName = subsub.name.split(" ").pop()!;
          lines.push("");
          lines.push(`##### ${subsubName}`);
          lines.push("");
          lines.push("```");
          lines.push(subsub.help);
          lines.push("```");
        }
      }
    }
  }

  return lines.join("\n");
}

function generateCommandsSection(commands: CommandInfo[]): string {
  const lines: string[] = [];
  lines.push("```");

  const maxLen = Math.max(...commands.map((c) => c.name.length));

  for (const cmd of commands) {
    const padding = " ".repeat(maxLen - cmd.name.length + 2);
    lines.push(`bl ${cmd.name}${padding}# ${cmd.description}`);
  }

  lines.push("```");
  return lines.join("\n");
}

function generateReferenceToc(commands: CommandInfo[]): string {
  const lines: string[] = [];

  for (const cmd of commands) {
    lines.push(
      `- [${cmd.name}](references/${cmd.name}.md) - ${cmd.description}`,
    );
  }

  return lines.join("\n");
}

function generateIndex(commands: CommandInfo[]): string {
  const lines: string[] = [];

  lines.push("# Blaxel CLI Command Reference");
  lines.push("");
  lines.push("## Commands");
  lines.push("");

  for (const cmd of commands) {
    lines.push(`- [${cmd.name}](./${cmd.name}.md) - ${cmd.description}`);
  }

  lines.push("");
  lines.push("## Quick Reference");
  lines.push("");
  lines.push("```bash");
  lines.push("# Get help for any command");
  lines.push("bl help <command>");
  lines.push("bl <command> --help");
  lines.push("```");

  return lines.join("\n") + "\n";
}

async function generateSkillMd(
  commands: CommandInfo[],
): Promise<string> {
  const template = await Deno.readTextFile(SKILL_TEMPLATE);
  return template
    .replace("{{COMMANDS}}", generateCommandsSection(commands))
    .replace("{{REFERENCE_TOC}}", generateReferenceToc(commands));
}

async function main() {
  console.log("Generating Blaxel CLI documentation...");

  // Check bl is available
  const versionResult = await run(["bl", "version"]);
  if (!versionResult.success) {
    console.error("Error: bl CLI not found. Is it installed?");
    Deno.exit(1);
  }
  console.log(`Blaxel CLI: ${stripAnsi(versionResult.stdout)}`);

  // Discover top-level commands
  console.log("Discovering commands...");
  const topLevelHelp = await getCommandHelp([]);
  const topLevelEntries = parseCommands(topLevelHelp).filter(
    (entry) => !SKIP_COMMANDS.includes(entry.name),
  );
  console.log(`Found ${topLevelEntries.length} top-level commands`);

  const commands: CommandInfo[] = [];

  for (const entry of topLevelEntries) {
    console.log(`  Discovering: ${entry.name}`);
    const info = await discoverCommand([entry.name]);
    commands.push(info);
  }

  // Generate markdown files
  console.log("Generating markdown files...");

  await Deno.mkdir(REFERENCES_DIR, { recursive: true });

  // Clean up old generated files
  for await (const entry of Deno.readDir(REFERENCES_DIR)) {
    if (entry.name.endsWith(".md")) {
      await Deno.remove(join(REFERENCES_DIR, entry.name));
    }
  }

  // Write command documentation
  for (const cmd of commands) {
    const filename = `${cmd.name}.md`;
    const filepath = join(REFERENCES_DIR, filename);
    const content = generateCommandDoc(cmd);
    await Deno.writeTextFile(filepath, content + "\n");
    console.log(`  Generated: ${filename}`);
  }

  // Generate index
  const indexContent = generateIndex(commands);
  await Deno.writeTextFile(join(REFERENCES_DIR, "commands.md"), indexContent);
  console.log("  Generated: commands.md");

  // Generate SKILL.md from template
  console.log("Generating SKILL.md from template...");
  const skillContent = await generateSkillMd(commands);
  await Deno.writeTextFile(SKILL_MD, skillContent);
  console.log("  Generated: SKILL.md");

  // Format
  console.log("\nFormatting generated files...");
  const fmtResult = await run(["deno", "fmt", SKILL_DIR]);
  if (!fmtResult.success) {
    console.error("Warning: Failed to format generated files");
    console.error(fmtResult.stderr);
  }

  console.log(`\nDone! Generated ${commands.length + 2} files.`);
}

main();

#!/usr/bin/env node
/**
 * Six common gaps in a `.claude/` setup, checked against a config tree
 * instead of a live git checkout — so the audit itself stays a pure
 * function of file contents, and `loadConfigTree()` is the only part that
 * touches disk.
 *
 * The six:
 *   AH01  no CLAUDE.md at the project root
 *   AH02  no PreToolUse hook configured
 *   AH03  .gitignore doesn't exclude .env
 *   AH04  an overly broad Bash permission in permissions.allow
 *   AH05  a hook is configured but has no corresponding test file
 *   AH06  .claude/settings.local.json exists but isn't excluded in .gitignore
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";

const IGNORED_DIRS = new Set(["node_modules", ".git"]);

/**
 * @param {string} dir
 * @returns {{files: string[], contents: Record<string, string>}}
 */
export function loadConfigTree(dir) {
  const contents = {};
  walk(dir, dir, contents);
  return { files: Object.keys(contents), contents };
}

function walk(current, root, contents) {
  for (const entry of readdirSync(current)) {
    if (IGNORED_DIRS.has(entry)) continue;
    const full = join(current, entry);
    if (statSync(full).isDirectory()) {
      walk(full, root, contents);
    } else {
      contents[relative(root, full)] = readFileSync(full, "utf8");
    }
  }
}

function parseSettings(configTree) {
  if (!configTree.files.includes(".claude/settings.json")) return null;
  try {
    return JSON.parse(configTree.contents[".claude/settings.json"]);
  } catch {
    return null;
  }
}

function gitignoreLines(configTree) {
  if (!configTree.files.includes(".gitignore")) return [];
  return configTree.contents[".gitignore"]
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");
}

function extractHookCommands(settings) {
  const commands = [];
  for (const matchers of Object.values(settings?.hooks ?? {})) {
    if (!Array.isArray(matchers)) continue;
    for (const matcher of matchers) {
      for (const hook of matcher?.hooks ?? []) {
        if (typeof hook?.command === "string") commands.push(hook.command);
      }
    }
  }
  return commands;
}

function extractScriptPath(command) {
  const match = command.match(/([\w./-]+\.mjs)\b/);
  return match ? match[1] : null;
}

/**
 * @param {{files: string[], contents: Record<string, string>}} configTree
 * @returns {Array<{id: string, message: string}>}
 */
export function audit(configTree) {
  const gaps = [];
  const has = (path) => configTree.files.includes(path);

  if (!has("CLAUDE.md")) {
    gaps.push({ id: "AH01", message: "No CLAUDE.md at the project root." });
  }

  const settings = parseSettings(configTree);
  const hasPreToolUseHook = Array.isArray(settings?.hooks?.PreToolUse) && settings.hooks.PreToolUse.length > 0;
  if (!hasPreToolUseHook) {
    gaps.push({ id: "AH02", message: "No PreToolUse hook configured in .claude/settings.json." });
  }

  const ignoreLines = gitignoreLines(configTree);
  const excludes = (...names) => names.some((name) => ignoreLines.includes(name));

  if (!excludes(".env", "*.env")) {
    gaps.push({ id: "AH03", message: ".gitignore does not exclude .env." });
  }

  const allow = settings?.permissions?.allow ?? [];
  // "Bash" or "Bash(*)" matches every shell command — the allowlist equivalent
  // of not having a gate at all.
  if (allow.some((entry) => entry === "Bash" || entry === "Bash(*)")) {
    gaps.push({ id: "AH04", message: "permissions.allow grants Bash(*) — every shell command is pre-approved." });
  }

  for (const command of extractHookCommands(settings)) {
    const scriptPath = extractScriptPath(command);
    if (!scriptPath || !has(scriptPath)) continue;
    const testPath = scriptPath.replace(/\.mjs$/, ".test.mjs");
    if (!has(testPath)) {
      gaps.push({ id: "AH05", message: `${scriptPath} is configured as a hook but has no ${testPath}.` });
    }
  }

  if (has(".claude/settings.local.json") && !excludes(".claude/settings.local.json", "settings.local.json")) {
    gaps.push({
      id: "AH06",
      message: ".claude/settings.local.json exists but is not excluded in .gitignore.",
    });
  }

  return gaps;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const target = process.argv[2];
  if (!target) {
    console.error("usage: node auditoria-harness.mjs <dir>");
    process.exit(1);
  }
  const gaps = audit(loadConfigTree(target));
  if (gaps.length === 0) {
    console.log("No gaps found.");
    process.exit(0);
  }
  for (const gap of gaps) console.log(`[${gap.id}] ${gap.message}`);
  process.exit(1);
}

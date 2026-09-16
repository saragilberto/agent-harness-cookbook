import { test } from "node:test";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { audit, loadConfigTree } from "./auditoria-harness.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const ids = (gaps) => gaps.map((g) => g.id).sort();

test("AH01: no CLAUDE.md at the root", () => {
  const gaps = audit({ files: [], contents: {} });
  assert.ok(ids(gaps).includes("AH01"));
});

test("AH02: no PreToolUse hook configured", () => {
  const configTree = { files: [".claude/settings.json"], contents: { ".claude/settings.json": "{}" } };
  assert.ok(ids(audit(configTree)).includes("AH02"));
});

test("AH02 does not fire once a PreToolUse hook exists", () => {
  const settings = { hooks: { PreToolUse: [{ matcher: "Bash", hooks: [{ type: "command", command: "node x.mjs" }] }] } };
  const configTree = { files: [".claude/settings.json"], contents: { ".claude/settings.json": JSON.stringify(settings) } };
  assert.ok(!ids(audit(configTree)).includes("AH02"));
});

test("AH03: .gitignore does not exclude .env", () => {
  const configTree = { files: [".gitignore"], contents: { ".gitignore": "node_modules/\n" } };
  assert.ok(ids(audit(configTree)).includes("AH03"));
});

test("AH03 does not fire once .gitignore excludes .env", () => {
  const configTree = { files: [".gitignore"], contents: { ".gitignore": "node_modules/\n.env\n" } };
  assert.ok(!ids(audit(configTree)).includes("AH03"));
});

test("AH04: Bash(*) in permissions.allow", () => {
  const settings = { permissions: { allow: ["Bash(*)"] } };
  const configTree = { files: [".claude/settings.json"], contents: { ".claude/settings.json": JSON.stringify(settings) } };
  assert.ok(ids(audit(configTree)).includes("AH04"));
});

test("AH04 does not fire for a scoped Bash permission", () => {
  const settings = { permissions: { allow: ["Bash(git log:*)"] } };
  const configTree = { files: [".claude/settings.json"], contents: { ".claude/settings.json": JSON.stringify(settings) } };
  assert.ok(!ids(audit(configTree)).includes("AH04"));
});

test("AH05: a configured hook with no sibling test file", () => {
  const settings = {
    hooks: { PostToolUse: [{ matcher: "Write", hooks: [{ type: "command", command: "node .claude/hooks/log-writes.mjs" }] }] },
  };
  const configTree = {
    files: [".claude/settings.json", ".claude/hooks/log-writes.mjs"],
    contents: { ".claude/settings.json": JSON.stringify(settings), ".claude/hooks/log-writes.mjs": "" },
  };
  assert.ok(ids(audit(configTree)).includes("AH05"));
});

test("AH05 does not fire once the hook has a sibling test file", () => {
  const settings = {
    hooks: { PostToolUse: [{ matcher: "Write", hooks: [{ type: "command", command: "node .claude/hooks/log-writes.mjs" }] }] },
  };
  const configTree = {
    files: [".claude/settings.json", ".claude/hooks/log-writes.mjs", ".claude/hooks/log-writes.test.mjs"],
    contents: {
      ".claude/settings.json": JSON.stringify(settings),
      ".claude/hooks/log-writes.mjs": "",
      ".claude/hooks/log-writes.test.mjs": "",
    },
  };
  assert.ok(!ids(audit(configTree)).includes("AH05"));
});

test("AH06: settings.local.json exists but is not excluded in .gitignore", () => {
  const configTree = {
    files: [".claude/settings.local.json", ".gitignore"],
    contents: { ".claude/settings.local.json": "{}", ".gitignore": "node_modules/\n" },
  };
  assert.ok(ids(audit(configTree)).includes("AH06"));
});

test("AH06 does not fire once .gitignore excludes settings.local.json", () => {
  const configTree = {
    files: [".claude/settings.local.json", ".gitignore"],
    contents: { ".claude/settings.local.json": "{}", ".gitignore": "node_modules/\n.claude/settings.local.json\n" },
  };
  assert.ok(!ids(audit(configTree)).includes("AH06"));
});

test("the clean fixture has zero gaps", () => {
  const gaps = audit(loadConfigTree(join(here, "fixtures/clean")));
  assert.deepEqual(gaps, []);
});

test("the gappy fixture has exactly the six documented gaps", () => {
  const gaps = audit(loadConfigTree(join(here, "fixtures/gappy")));
  assert.deepEqual(ids(gaps), ["AH01", "AH02", "AH03", "AH04", "AH05", "AH06"]);
});

#!/usr/bin/env node
/**
 * PreToolUse hook: the inventory pass only means something if the schema
 * it's inspecting can't be changed out from under it. Same shape as
 * gate-shell.mjs — pure evaluate(), CLI plumbing kept out of it — scoped to
 * one guarantee: no write reaches the legacy database while the inventory
 * is in progress.
 */
import { pathToFileURL } from "node:url";

export const LEGACY_DB_MARKER = /legacy\.fdb|ACME_LEGACY/i;
export const WRITE_VERB = /\b(INSERT|UPDATE|DELETE|ALTER|DROP|CREATE|TRUNCATE|GRANT|REVOKE)\b/i;

/**
 * @param {string} command
 * @returns {{decision: "allow"|"deny", ruleId?: string, reason?: string, hint?: string}}
 */
export function evaluate(command) {
  if (typeof command !== "string" || command.trim() === "") {
    return { decision: "allow" };
  }

  const normalized = command.trim();

  // A command that doesn't touch the legacy database at all isn't this
  // hook's concern — it only guards this one connection, not every write.
  if (!LEGACY_DB_MARKER.test(normalized)) {
    return { decision: "allow" };
  }

  if (WRITE_VERB.test(normalized)) {
    return {
      decision: "deny",
      ruleId: "IL01",
      reason: "write operation against the legacy schema",
      hint: "This connection is read-only until the inventory is signed off. Use a SELECT or the -x metadata extraction instead, and open a migration for any actual write.",
    };
  }

  return { decision: "allow" };
}

export function formatDenial(result) {
  return `[${result.ruleId}] Command blocked: ${result.reason}.\n${result.hint}`;
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

async function main() {
  let payload;
  try {
    payload = JSON.parse(await readStdin());
  } catch {
    process.stderr.write("readonly-guard: invalid input, allowing\n");
    process.exit(0);
  }

  if (payload?.tool_name !== "Bash") process.exit(0);

  const result = evaluate(payload?.tool_input?.command);
  if (result.decision === "deny") {
    process.stderr.write(formatDenial(result) + "\n");
    process.exit(2);
  }

  process.exit(0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}

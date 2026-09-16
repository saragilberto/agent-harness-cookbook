#!/usr/bin/env node
/**
 * PreToolUse hook: the same rule as `regra-texto.mjs`, but as a mechanism.
 *
 * Contract with Claude Code:
 *   - receives JSON on stdin with { tool_name, tool_input }
 *   - exits with code 0 to allow
 *   - exits with code 2 and a message on stderr to block
 *
 * Matches gate-shell.mjs's shape on purpose: decision isolated in a pure
 * evaluate(), CLI plumbing kept out of it, so the rule is testable without
 * simulating an agent's runtime.
 */
import { pathToFileURL } from "node:url";

export const RULE = {
  id: "RC01",
  pattern: /->discountPercent\s*=/,
  reason: "direct assignment to Invoice.discountPercent outside TaxRuleService",
  hint: "Route discount changes through TaxRuleService::applyDiscount(), which recalculates tax alongside the discount.",
};

/**
 * @param {{filePath?: string, content?: string}} input
 * @returns {{decision: "allow"|"deny", ruleId?: string, reason?: string, hint?: string}}
 */
export function evaluate({ filePath, content } = {}) {
  if (typeof content !== "string") {
    return { decision: "allow" };
  }

  // TaxRuleService is the one place allowed to touch this field directly —
  // it's what the rule routes everyone else to.
  if (typeof filePath === "string" && filePath.includes("TaxRuleService")) {
    return { decision: "allow" };
  }

  if (RULE.pattern.test(content)) {
    return { decision: "deny", ruleId: RULE.id, reason: RULE.reason, hint: RULE.hint };
  }

  return { decision: "allow" };
}

export function formatDenial(result) {
  return `[${result.ruleId}] Write blocked: ${result.reason}.\n${result.hint}`;
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
    process.stderr.write("regra-hook: invalid input, allowing\n");
    process.exit(0);
  }

  if (payload?.tool_name !== "Write" && payload?.tool_name !== "Edit") {
    process.exit(0);
  }

  const filePath = payload?.tool_input?.file_path;
  // Write carries the new file as `content`; Edit carries it as `new_string`.
  const content = payload?.tool_input?.content ?? payload?.tool_input?.new_string;

  const result = evaluate({ filePath, content });
  if (result.decision === "deny") {
    process.stderr.write(formatDenial(result) + "\n");
    process.exit(2);
  }

  process.exit(0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}

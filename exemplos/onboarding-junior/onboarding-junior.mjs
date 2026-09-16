#!/usr/bin/env node
/**
 * PreToolUse hook: accepting a suggestion isn't the same as understanding
 * it, and a team of twenty devs where most are junior can't rely on
 * "understand it first" staying true just because it's written in
 * CLAUDE.md. This blocks a write to a sensitive path unless the assistant's
 * own preceding message states, in one line, why the change is correct —
 * not because the line is checked for truth, but because writing it down
 * is the cheapest tax that forces a pause before accepting.
 *
 * Contract with Claude Code: same as gate-shell.mjs and regra-hook.mjs,
 * `{ tool_name, tool_input }` on stdin, exit 0 to allow or 2 with stderr to
 * deny. The one addition here is `transcript_path`, which Claude Code also
 * includes in the hook payload — it's how this hook reads what the
 * assistant said right before proposing the write.
 */
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

/**
 * Paths a junior dev is most likely to accept without understanding:
 * business logic and schema changes, not a template file or a stylesheet.
 */
export const SENSITIVE_PATTERNS = [
  { id: "OJ01", pattern: /^app\/Services\//, area: "a service class" },
  { id: "OJ02", pattern: /^database\/migrations\//, area: "a migration" },
];

export const MIN_JUSTIFICATION_LENGTH = 20;
const JUSTIFICATION_LINE = /^Justification:\s*(.+)$/m;

/**
 * @param {{filePath?: string, precedingAssistantText?: string}} input
 * @returns {{decision: "allow"|"deny", ruleId?: string, reason?: string, hint?: string}}
 */
export function evaluate({ filePath, precedingAssistantText } = {}) {
  if (typeof filePath !== "string") {
    return { decision: "allow" };
  }

  const sensitive = SENSITIVE_PATTERNS.find((rule) => rule.pattern.test(filePath));
  if (!sensitive) {
    return { decision: "allow" };
  }

  const match =
    typeof precedingAssistantText === "string" ? precedingAssistantText.match(JUSTIFICATION_LINE) : null;
  const justification = match ? match[1].trim() : "";

  // The length check doesn't verify the justification is correct — only
  // that one was written. That's a deliberate, narrow guarantee: it forces
  // a pause and a sentence, not a passing grade on the reasoning.
  if (justification.length >= MIN_JUSTIFICATION_LENGTH) {
    return { decision: "allow" };
  }

  return {
    decision: "deny",
    ruleId: sensitive.id,
    reason: `editing ${sensitive.area} with no justification on record`,
    hint: `Write a one-line "Justification: ..." (at least ${MIN_JUSTIFICATION_LENGTH} characters) explaining why this change is correct, before applying it to ${filePath}.`,
  };
}

export function formatDenial(result) {
  return `[${result.ruleId}] Write blocked: ${result.reason}.\n${result.hint}`;
}

/**
 * Pulls the text of the last assistant turn out of a Claude Code transcript
 * (JSONL, one entry per line). Pure on the transcript's text so it's
 * testable without a real transcript file on disk.
 *
 * @param {string} transcriptText
 * @returns {string}
 */
export function lastAssistantText(transcriptText) {
  if (typeof transcriptText !== "string" || transcriptText.trim() === "") {
    return "";
  }

  const lines = transcriptText.trim().split("\n");

  for (let i = lines.length - 1; i >= 0; i--) {
    let entry;
    try {
      entry = JSON.parse(lines[i]);
    } catch {
      continue;
    }

    const role = entry?.type ?? entry?.message?.role;
    if (role !== "assistant") continue;

    const content = entry.message?.content ?? entry.content;
    if (Array.isArray(content)) {
      return content
        .filter((block) => block?.type === "text")
        .map((block) => block.text)
        .join("\n");
    }
    if (typeof content === "string") {
      return content;
    }
  }

  return "";
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
    process.stderr.write("onboarding-junior: invalid input, allowing\n");
    process.exit(0);
  }

  if (payload?.tool_name !== "Write" && payload?.tool_name !== "Edit") {
    process.exit(0);
  }

  let transcriptText = "";
  if (typeof payload?.transcript_path === "string") {
    try {
      transcriptText = readFileSync(payload.transcript_path, "utf8");
    } catch {
      transcriptText = "";
    }
  }

  const result = evaluate({
    filePath: payload?.tool_input?.file_path,
    precedingAssistantText: lastAssistantText(transcriptText),
  });

  if (result.decision === "deny") {
    process.stderr.write(formatDenial(result) + "\n");
    process.exit(2);
  }

  process.exit(0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}

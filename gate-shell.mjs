#!/usr/bin/env node
/**
 * PreToolUse hook: evaluates shell commands before execution.
 *
 * Contract with Claude Code:
 *   - receives JSON on stdin with { tool_name, tool_input }
 *   - exits with code 0 to allow
 *   - exits with code 2 and a message on stderr to block;
 *     the message goes back to the agent, so it needs to say what to do
 *     instead of just saying "no".
 *
 * The decision logic is isolated in evaluate() on purpose: that's what lets
 * the gate be tested without simulating the agent's runtime.
 */

/**
 * Each rule is a thesis about what should never happen without a human in
 * the loop. `hint` is what the agent reads — it matters more than `reason`,
 * because it determines whether the agent retries the right way or gets
 * stuck.
 */
export const RULES = [
  {
    id: "SH001",
    pattern: /\brm\s+(-[a-zA-Z]*[rf][a-zA-Z]*\s+)+(\/|~|\$HOME)(\s|$)/,
    reason: "recursive removal starting from root or home",
    hint: "Delete relative paths inside the project directory.",
  },
  {
    id: "SH002",
    pattern: /\bgit\s+push\b[^\n]*\s(--force|-f)\b/,
    reason: "force push",
    hint: "Use --force-with-lease, or open a PR instead of rewriting the branch.",
  },
  {
    id: "SH003",
    pattern: /\bgit\s+(commit|push)\b[^\n]*\b(main|master)\b/,
    reason: "direct write to the main branch",
    hint: "Create a branch and open a PR. The main branch is protected by policy.",
  },
  {
    id: "SH004",
    pattern: /\b(curl|wget)\b[^\n]*\|\s*(sudo\s+)?(ba)?sh\b/,
    reason: "remote script executed directly in the shell",
    hint: "Download the script, keep it visible in the diff, and run it in a separate step.",
  },
  {
    id: "SH005",
    pattern: /\b(DROP\s+(TABLE|SCHEMA|DATABASE)|TRUNCATE\s+TABLE)\b/i,
    reason: "destructive DDL",
    hint: "Write a migration. DDL outside a migration has no rollback.",
  },
  {
    id: "SH006",
    pattern: /\bchmod\s+(-[a-zA-Z]+\s+)*777\b/,
    reason: "777 permission",
    hint: "Use 755 for directories and 644 for files.",
  },
  {
    id: "SH007",
    pattern: />>?\s*\.?[\w./-]*\.env(\.[\w-]+)?(\s|$)/,
    reason: "write to an environment file",
    hint: "Edit .env.example. The real .env is the operator's responsibility.",
  },
];

/**
 * Commands that would match a rule but are safe given context.
 * Every allowlist is debt: each entry here is a hole in the gate, so it
 * needs to be specific and have a written reason.
 */
export const ALLOWLIST = [
  {
    id: "ALLOW001",
    pattern: /^git\s+log\b/,
    reason: "reading history never writes",
  },
];

/**
 * @param {string} command
 * @returns {{decision: "allow"|"deny", ruleId?: string, reason?: string, hint?: string}}
 */
export function evaluate(command) {
  if (typeof command !== "string" || command.trim() === "") {
    return { decision: "allow" };
  }

  const normalized = command.trim();

  for (const entry of ALLOWLIST) {
    if (entry.pattern.test(normalized)) {
      return { decision: "allow" };
    }
  }

  // A command can chain several with && or ;. Evaluating the whole line
  // as a single block is the classic mistake: `ls && rm -rf /` passes if
  // the gate only looks at the first verb.
  for (const rule of RULES) {
    if (rule.pattern.test(normalized)) {
      return {
        decision: "deny",
        ruleId: rule.id,
        reason: rule.reason,
        hint: rule.hint,
      };
    }
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
    // Failing to parse the input allows instead of blocking.
    // A gate that fails closed locks up the agent over its own bug; a gate
    // that fails open loses one check. The second costs less, as long as
    // the failure is visible.
    process.stderr.write("gate-shell: invalid input, allowing\n");
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

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

# PreToolUse hook as a shell gate

Article: <url>

## The problem

A rule written in `CLAUDE.md` is a suggestion: the agent reads it, agrees,
and sometimes does something different. As long as the prohibition exists
only as text in the context, it depends on the model remembering it at the
right moment, with a full context, in the middle of a long task. What turns
policy into a guarantee is a hook that runs before execution and doesn't
depend on anyone remembering anything.

## How to run

```bash
cd exemplos/gate-shell
node --test
```

Exercising the hook directly, the way the agent does:

```bash
echo '{"tool_name":"Bash","tool_input":{"command":"git push --force origin main"}}' \
  | node gate-shell.mjs; echo "exit=$?"
# [SH002] Command blocked: force push.
# Use --force-with-lease, or open a PR instead of rewriting the branch.
# exit=2
```

To install it in your project, register it in `.claude/settings.json` as a
`PreToolUse` hook on the `Bash` matcher.

## What to look at first

`gate-shell.mjs`, the `evaluate()` function. That's where the decision
happens, and it's pure on purpose: it takes a string, returns a decision.
Everything else in the file is stdin plumbing and exit codes.

Notice two design choices:

**The `hint` matters more than the `reason`.** The stderr message goes back
to the agent, so it's the difference between it retrying the right way or
burning three turns stuck. A denial with no alternative path is what makes
the agent loop.

**The gate fails open, not closed.** If the input isn't valid JSON, it
allows and writes to stderr. A gate that fails closed locks up the whole
team over its own bug; a gate that fails open loses one check and leaves a
trace.

## Limitations

- **Detection is pattern-based on text and is evadable.** `R=rm; $R -rf /`
  passes. There are two tests marked with `skip` documenting known evasions
  — a limitation recorded in a test is more honest than one recorded in a
  README.
- **The allowlist is debt.** Every entry is a hole in the gate. There's only
  one here, and even so it has a written reason.
- **The rules are for the Acme Invoices domain.** Yours will be different.
  What transfers is the structure — a rule with an id, a reason, and a hint,
  the decision isolated in a pure function, and tests separating blocking,
  allowing, and evasion.
- **A false positive costs more than a false negative.** A gate that gets in
  the way of normal work gets disabled in week two, and then the protection
  is zero. That's why the "allows" test group is bigger than the "blocks"
  group.

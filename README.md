# harness-exemplos

Code accompanying the articles on governance of agent-generated code.

Each directory in `exemplos/` corresponds to an article and contains the
executable version of what the text describes. Nothing here is pseudocode: if
it's in the repository, it runs.

## How to use

Each example is self-contained. Enter the directory, read the `README.md`,
and follow the "How to run" block. No example has an external dependency —
everything uses Node 20+ and the standard library.

```bash
git clone <url>
cd harness-exemplos/exemplos/gate-shell
node --test
```

## Examples

| Directory | Article | What it demonstrates |
|---|---|---|
| [`metricas-revisao`](exemplos/metricas-revisao) | The bottleneck moved | PR size and time-to-merge inferred from a git log |
| [`gate-shell`](exemplos/gate-shell) | PreToolUse hook as a shell gate | Blocking destructive commands before execution, with its own test suite |
| [`regra-com-mecanismo`](exemplos/regra-com-mecanismo) | A rule in CLAUDE.md is not a rule | The same rule as text versus as a hook, with a test proving only one blocks |
| [`grader-deterministico`](exemplos/grader-deterministico) | Deterministic grader versus LLM-as-judge | Architectural violation scanner with delta comparison |
| [`eval-multiturno`](exemplos/eval-multiturno) | An eval is not a test | A violation that only exists across turns, invisible to a single-turn check |
| [`onboarding-junior`](exemplos/onboarding-junior) | Twenty devs, most of them junior | A hook that requires a written justification before a sensitive write lands |
| [`auditoria-harness`](exemplos/auditoria-harness) | Six common gaps | Scans a `.claude/` directory and lists which of six known gaps are present |

## Example domain

All examples use the same fictional domain: **Acme Invoices**, a multi-tenant
billing platform with schema-based isolation in Postgres. It's a made-up
domain, chosen for being simple enough to stay out of the way and realistic
enough for the rules to make sense.

Keeping the same domain across articles lets context accumulate: anyone who
read the third article already knows what a tenant means here.

## Conventions

See [`CONVENTIONS.md`](CONVENTIONS.md) — directory structure, each example's
README format, and naming rules.

## License

MIT. Use, copy, adapt, and bring it into your company without asking anything.

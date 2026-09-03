# Deterministic grader versus LLM-as-judge

Article: <url>

## The problem

Every real codebase already has violations. A scanner that reports the
absolute total returns 340 findings before the change and 341 after, and
nobody can judge anything from that. Worse: if you use an LLM as a judge to
decide whether the change respected the architectural rule, it's right most
of the time and wrong some of the time, and you've just added variance on
top of a rule that was binary.

## How to run

```bash
cd exemplos/grader-deterministico
node run-eval.mjs     # runs the cases and returns a score
node --test           # tests the grader itself
```

Inspecting the steps separately:

```bash
node scan.mjs fixtures/baseline
node delta.mjs fixtures/baseline fixtures/candidate-violation
```

## What to look at first

`scan.mjs`, the `fingerprint()` function — three lines that decide whether
the grader is usable. A finding's identity is `rule + file + line text`, and
it doesn't include the line number. If it did, adding an import at the top
of a file would generate a false delta on everything below it, and the
grader would turn into noise on the first real commit.

Then `delta.mjs`. The grader doesn't ask "how many violations exist?", it
asks "did this change introduce a new violation?". The subtraction makes
the historical backlog cancel itself out, with no need for an exception file
or a frozen baseline someone forgets to update.

The `R03` case in `cases.json` is a canary: it compares the baseline against
itself and expects zero. If it fails, the fingerprint is unstable and every
other case has turned into noise. It's worth having an equivalent of this in
any eval suite.

## Where LLM-as-judge fits in

Not here. Tenant isolation is a hard rule, it has a correct answer, and a
deterministic grader answers the same way every time, for free, in
milliseconds.

The judge is indispensable somewhere else: subjective criteria, like "does
the error message explain what to do?" or "does the PR describe the
change?". In those cases no regex is possible, and the judge's variance is
acceptable because the human answer key also varies.

The practical rule: if two experienced reviewers would always agree, use a
deterministic grader. If they could disagree, use a judge.

## Limitations

- **Regex doesn't understand syntax.** `class Invoice extends Model` inside
  a comment or a string counts as a violation. For a rule that requires
  precision, the next step is an AST instead of a line.
- **It only detects what's already been named.** If the pattern isn't in the
  list, the scanner returns zero findings — and zero findings from an
  inapplicable pattern is indistinguishable from zero findings from
  compliance. That's the false zero, and it's the main trap of this
  approach.
- **The delta doesn't see renames.** Moving a file shows up as one resolved
  violation plus one introduced.
- **Four rules is an illustration, not coverage.** A real multi-tenant
  isolation suite has rules for jobs, seeders, commands, migrations, and
  cache keys, and each one is born from an incident.

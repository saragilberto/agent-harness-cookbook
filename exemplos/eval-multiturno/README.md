# An eval is not a test

Article: <url>

## The problem

A unit test checks one call: given this input, expect that output. Some
agent failures aren't a function of any single message — they're a function
of the conversation. "Okay, shipping it now." is an innocuous sentence on
its own. It's only a violation once you know what "it" refers to, and that
context lives two turns earlier. A grader built to check one call at a time
structurally cannot see this class of failure, no matter how good its
pattern matching is.

## How to run

```bash
cd exemplos/eval-multiturno
node --test                                    # runs the eval against both fixtures
node eval-multiturno.mjs fixtures/multi-turn-fail.json
node eval-multiturno.mjs fixtures/single-turn-pass.json
```

## What to look at first

`evaluateTranscript()` in `eval-multiturno.mjs`. It carries exactly one bit
of state while it walks the transcript in order: whether the tenant-scope
check is currently "at risk" of being dropped. That bit is set by an earlier
user turn asking to skip it, and cleared by any assistant turn that pushes
back — a generic "okay" from the assistant is a violation only while that
bit is set. It's not a keyword in one message, it's a fact about the
sequence.

Then `eval-multiturno.test.mjs`'s last test, which is the actual argument:
it takes the last turn of the failing transcript, evaluates it completely
alone — no history, the way a single-turn test would — and asserts that
the violation *disappears*. Not because the grader has a bug, but because
the information needed to see the violation was never in that one message
to begin with.

## Limitations

- **Two hand-written keyword lists, not a real detector.** `RISK_TRIGGER`,
  `REFUSAL`, and `CAPITULATION` are regexes chosen to make this one scenario
  legible, not a general-purpose classifier of "did the agent cave."
- **One scenario, not a suite.** A real multi-turn eval suite needs many
  recorded transcripts, ideally from actual sessions, not two fixtures
  written to make a point.
- **State is binary and doesn't decay.** A real conversation might raise the
  same risk for unrelated reasons twenty turns apart; this tracks one flag,
  not a timeline.
- **This is a fixture-based eval, not a live judge.** The transcripts here
  are recorded data, not a call to a model — there's no LLM-as-judge
  involved, and none of `grader-deterministico`'s "where the judge fits"
  argument changes because of it.

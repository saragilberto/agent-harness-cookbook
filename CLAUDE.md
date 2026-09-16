# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

Code accompanying articles on governance of agent-generated code. Each
directory in `exemplos/` is the runnable version of what one article
describes — nothing here is pseudocode. There is no build step, no shared
library, and no dependency between examples; each one is fully self-contained.

## Commands

Every example uses plain Node 20+ and `node:test` — no test runner or bundler
to install.

```bash
cd exemplos/<slug>
node --test                          # run that example's whole test suite
node --test example.test.mjs         # run a single test file
node --test --test-name-pattern='some case name'   # run a single test by name
```

`grader-deterministico` additionally has a standalone eval runner, separate
from its unit tests:

```bash
cd exemplos/grader-deterministico
node run-eval.mjs                    # scores fixtures/ cases against cases.json
node scan.mjs fixtures/baseline      # inspect one step of the pipeline directly
node delta.mjs fixtures/baseline fixtures/candidate-violation
```

There is no repo-wide test command — run tests from inside each example's
directory.

## Architecture

### Per-example structure (enforced by CONVENTIONS.md)

```
exemplos/<article-slug>/
├── README.md          required, fixed section order (see below)
├── package.json       required, defines `npm test` even with zero dependencies
├── <code>.mjs          the artifact — decision logic isolated in a pure, exported function
├── <code>.test.mjs     tests for that function
└── fixtures/          sample input files, only when the artifact reads files
```

`exemplos/_template/` holds this skeleton with `<placeholder>` markers. To
start a new example: copy `_template/`, rename it to the article's slug, and
fill it in — never rename a slug after it's published, since it's the URL
key back to the article.

Each `.mjs` follows the same shape regardless of what it does: a pure,
exported function holds the decision (`evaluate()`, `scan()`, `delta()`),
and a guarded `if (import.meta.url === pathToFileURL(process.argv[1]).href)`
block at the bottom is the only place that touches stdin/stdout/`process.exit`.
That split is what makes the logic testable without simulating a CLI or an
agent runtime — always keep new examples on this shape rather than mixing
I/O into the decision function.

### `gate-shell` — PreToolUse hook as a shell gate

Implements the actual `PreToolUse` hook contract Claude Code uses: reads
`{tool_name, tool_input}` as JSON from stdin, exits `0` to allow or `2` with
a message on stderr to block. `evaluate(command)` is a pure regex-rule
engine (`RULES`, plus an `ALLOWLIST` checked first) with no knowledge of the
hook protocol. Two invariants worth preserving if you touch this: the gate
**fails open** on invalid input (a bug in the gate shouldn't lock up the
agent), and every `hint` matters more than its `reason` — it's the text the
agent reads back, and a denial with no alternative path is what makes an
agent loop.

### `grader-deterministico` — deterministic grader vs. LLM-as-judge

Three-stage pipeline, each stage its own module:

1. `scan.mjs` — walks a directory, regex-matches architectural rules
   (`RULES`), and produces findings. `fingerprint()` builds a finding's
   identity from `ruleId + file + evidence text`, deliberately **excluding
   the line number** — otherwise an unrelated import added above a
   violation would shift the line and register as a fake new violation.
2. `delta.mjs` — diffs two scans (`baseline` vs. `candidate`) by fingerprint
   set to get `introduced` / `resolved`. This is the core idea of the
   example: grade "did this change introduce a new violation?", not the
   absolute finding count, so pre-existing backlog cancels out instead of
   drowning the signal.
3. `run-eval.mjs` — runs `cases.json` against `fixtures/<case>/` pairs and
   reports pass/fail per case (binary, no partial score). Case `R03`
   compares the baseline against itself and must yield zero delta; if it
   doesn't, the fingerprint is unstable and every other case's result is
   noise — treat a `R03` failure as higher priority than any other case.

Rules encode Acme Invoices' multi-tenant-by-schema isolation (e.g. a model
extending `Model` instead of a tenant-scoped base class, a hardcoded DB
connection, raw `SET search_path`, a cache key with no tenant prefix).

## Repo-wide conventions (CONVENTIONS.md)

- **Language**: everything — docs, README, comments, identifiers — is in
  English, no exceptions. Mixed-language identifiers are treated as a
  correctness issue, not style.
- **Domain**: every example uses the same fictional domain, Acme Invoices (a
  multi-tenant billing platform, one Postgres schema per tenant plus a
  `shared` schema). Entities: `Invoice`, `Customer`, `Payment`, `Tenant`,
  `TaxRule`. Never use a real company's name or vocabulary — rewrite into
  this domain first.
- **Dependencies**: none, by default. An example that needs one must justify
  in its README why the stdlib-only approach doesn't work — the bar is that
  a reader can run any example in under a minute with nothing to install.
- **Tests**: any artifact with decision logic must have a test; this is
  treated as part of the example, not optional polish.
- **README section order** for every example (all required, including
  "Limitations" — an example with no declared limitation is read as one
  nobody ran against real code):
  1. Title (matches the article title)
  2. Link to the article
  3. The problem (2–3 sentences)
  4. How to run (copyable, no implicit steps)
  5. What to look at first (specific file + function)
  6. Limitations

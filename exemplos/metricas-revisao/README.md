# The bottleneck moved

Article: <url>

## The problem

Code generation got faster; review didn't. "PRs feel bigger lately" is a
feeling, not a number — and a team that can't measure PR size and
time-to-merge has no way to notice that the bottleneck already moved from
writing code to reviewing it, let alone act on it.

## How to run

```bash
cd exemplos/metricas-revisao
node --test                          # tests for parseLog and computeMetrics
node metricas-revisao.mjs fixtures/sample.log
```

To generate real input from a repository, the log needs this exact shape —
oldest commit first, one header line per commit followed by its `--numstat`
lines:

```bash
git log --reverse --pretty=format:'%H|%P|%ct' --numstat > my-repo.log
```

## What to look at first

`computeMetrics()` in `metricas-revisao.mjs`. A PR isn't a field in the log —
it's inferred: every regular commit accumulates into a batch, and the next
merge commit (two or more parents) closes it, turning the batch into one
row with a size (total lines changed) and a time-to-merge (merge timestamp
minus the batch's first commit timestamp).

Two edge cases are handled on purpose, not accidentally:

**Trailing commits with no merge yet are "open", not a PR.** Reporting them
as a PR would invent a merge time that hasn't happened. `fixtures/sample.log`
ends with exactly this case.

**A merge with an empty batch is skipped.** Two merges back to back, or an
empty merge commit, would otherwise produce a zero-commit PR — noise, not
signal.

## Limitations

- **The log format is a fixed convention, not a real `git log` call.** This
  example never shells out to `git`, so it stays dependency-free and
  deterministic — but that means a real log needs the exact `--pretty`
  format documented above before this parser can read it.
- **Squash merges aren't distinguished from merge commits.** A squashed PR
  shows up as a single non-merge commit and is silently absorbed into
  whatever batch is open when the next real merge happens, instead of being
  its own PR.
- **Size is lines changed, not complexity.** A 200-line generated migration
  and a 200-line change to `TaxRuleService` count the same, even though one
  takes a reviewer five minutes and the other an afternoon.
- **No file-count or file-type weighting.** A PR that touches one file and a
  PR that touches twenty score identically if the line count matches.

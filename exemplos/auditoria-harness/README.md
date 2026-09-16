# Six common gaps

Article: <url>

## The problem

A team adopts Claude Code, writes a `CLAUDE.md`, maybe adds a hook, and
moves on — nobody goes back to check whether the setup that felt complete
on day one still holds up. The gaps that show up over and over aren't
exotic: a hook with no test, a permission that quietly allows everything, a
`.gitignore` that never learned about `.env`. This scans a `.claude/`
directory and lists exactly which of six known gaps are present.

## How to run

```bash
cd exemplos/auditoria-harness
node --test
node auditoria-harness.mjs fixtures/clean   # No gaps found.
node auditoria-harness.mjs fixtures/gappy   # lists all six
```

## What to look at first

`audit()` in `auditoria-harness.mjs` is a pure function over a plain
`{ files, contents }` object — `loadConfigTree()` is the only part that
touches a real directory, which is what makes every gap testable with a
few lines of inline data instead of a fixture file. `fixtures/clean/` and
`fixtures/gappy/` exist to prove the six checks compose correctly together,
not to be the only way each one is tested.

The six gaps:

```
AH01  no CLAUDE.md at the project root
AH02  no PreToolUse hook configured
AH03  .gitignore doesn't exclude .env
AH04  Bash(*) in permissions.allow
AH05  a configured hook has no corresponding test file
AH06  .claude/settings.local.json exists but isn't excluded in .gitignore
```

AH05 is worth a second look: it doesn't check a fixed path, it reads
`command` out of every hook entry in `settings.json`, pulls the `.mjs`
script out of it, and checks for a sibling `<script>.test.mjs`. A hook
without a test is exactly the situation `gate-shell`'s own README
describes — a working `evaluate()` and a broken entry point, invisible to
`node --test` because the suite never exercised the CLI at all.

## Limitations

- **Six is not exhaustive.** These are the six that showed up repeatedly,
  not a complete taxonomy of `.claude/` misconfiguration.
- **Presence, not quality.** AH02 passes as soon as any `PreToolUse` hook
  exists — it doesn't check whether that hook's rules are any good, only
  that the slot isn't empty.
- **`.gitignore` checks are exact-line matches.** A glob like `*.env.*` or
  a pattern with different spacing won't be recognized as covering `.env`,
  even if it effectively does.
- **AH05's script extraction is a regex on the command string,** not a
  shell parser — a hook invoked through a wrapper script or with extra
  arguments before the path may not be detected correctly.

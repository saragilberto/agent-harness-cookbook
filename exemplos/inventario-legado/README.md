# Auditing a twenty-year-old Firebird database

Article: <url>

## The problem

A schema that's been in production for twenty years has no comments, no
declared foreign keys, and a naming convention nobody wrote down — the
kind of database where the first mistake is proposing a change before
anyone's actually looked at what's there. Before an agent touches this
schema at all, it needs a read-only inventory pass, and the connection it
runs on needs to be mechanically incapable of writing anything while that
pass is happening.

## How to run

```bash
cd exemplos/inventario-legado
node --test
node inventario-legado.mjs fixtures/schema.sql
```

Exercising the guard directly, the way the agent's `Bash` tool call would:

```bash
echo '{"tool_name":"Bash","tool_input":{"command":"isql legacy.fdb -e \"UPDATE CUSTOMERS SET FLG_ACTIVE=\x27N\x27 WHERE CUST_ID=1\""}}' \
  | node readonly-guard.mjs; echo "exit=$?"
# [IL01] Command blocked: write operation against the legacy schema.
# exit=2
```

## What to look at first

`inventory()` in `inventario-legado.mjs`, and specifically the two
heuristics it flags. A `*_ID` column with no `FOREIGN KEY` constraint
declared for it isn't a bug in this schema — it's how every table in
`fixtures/schema.sql` relates to every other one, enforced by nothing but a
naming habit. `TAX_RULES.TEN_ID` is the control case: it's the one column
in the fixture that *does* have a real constraint, and the test suite
checks that it's the one column the heuristic stays quiet about — the same
"prove it doesn't flag the compliant case too" discipline
`grader-deterministico` already established.

Then `readonly-guard.mjs`, which is `gate-shell.mjs`'s exact shape aimed at
one connection instead of the whole shell: it only cares whether a command
touches the legacy database at all, and if it does, whether it's a write.
A write to some other database is none of its business — the guard isn't
"block all writes," it's "this one connection stays read-only."

## Limitations

- **The DDL parser is regex, not a real SQL parser.** Firebird's actual
  syntax has more shapes than four `CREATE TABLE` statements — computed
  columns, domains, `CHECK` constraints — and none of that is handled here.
- **The implicit-foreign-key heuristic is a naming convention, not proof.**
  A column that happens to end in `_ID` without meaning "references another
  table" would be a false positive; a real reference named differently
  would be a false negative.
- **`readonly-guard` matches on a database marker string, not a real
  connection.** A command that reaches the same database through a
  different alias or a wrapper script wouldn't be recognized — the same
  class of limitation `gate-shell`'s own README documents for text-pattern
  gates in general.
- **This proves read-only enforcement, not that the inventory itself is
  complete.** A schema this old can have tables, triggers, or stored
  procedures the inventory pass never sees if nobody points it there.

# A rule in CLAUDE.md is not a rule

Article: <url>

## The problem

Writing "never assign `Invoice.discountPercent` directly" in `CLAUDE.md` is
a sentence, not a guarantee. The model reads it, agrees with it, and can
still write the violation three turns later once the context is full of
something else. This example writes the exact same rule twice — once as
prose, once as a hook — and proves with a test that only one of the two
ever actually stops anything.

## How to run

```bash
cd exemplos/regra-com-mecanismo
node --test
```

Exercising the hook directly, the way the agent's `Write`/`Edit` tool call
would:

```bash
node -e "console.log(JSON.stringify({tool_name:'Write', tool_input:{file_path:'app/Http/Controllers/InvoiceController.php', content:require('fs').readFileSync('fixtures/violation.php','utf8')}}))" \
  | node regra-hook.mjs; echo "exit=$?"
# [RC01] Write blocked: direct assignment to Invoice.discountPercent outside TaxRuleService.
# Route discount changes through TaxRuleService::applyDiscount(), which recalculates tax alongside the discount.
# exit=2
```

## What to look at first

`regra.test.mjs`, side by side with `regra-texto.mjs` and `regra-hook.mjs`.
`checkTextRule()` in `regra-texto.mjs` is written so it's structurally
incapable of returning anything but `"not enforced"` — that's the point
being made, not a bug. `evaluate()` in `regra-hook.mjs` is the same rule,
same domain fact (discounts must go through `TaxRuleService`), but wired as
a `PreToolUse` hook on `Write`/`Edit`, following the exact shape
`gate-shell.mjs` already established: a pure decision function, an
allowlist-like exception (here, `TaxRuleService` itself is allowed to touch
the field), and a CLI entry point that never touches the decision logic.

## Limitations

- **The hook only sees what the tool-use protocol exposes.** It reads the
  file content Claude Code is about to write, nothing more — the same class
  of limitation as `gate-shell`'s text-pattern matching.
- **One rule, one file path exception.** A real rule set would have many
  rules and would need to handle a class defined across multiple files, a
  trait, or a rename of `TaxRuleService` itself — none of that is here.
- **This doesn't prove hooks are sufficient, only that text alone is
  insufficient.** A hook can still be misconfigured, unregistered, or have a
  bug of its own — see `gate-shell`'s own README for exactly that kind of
  failure.

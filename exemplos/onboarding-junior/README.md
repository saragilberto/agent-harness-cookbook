# Twenty devs, most of them junior

Article: <url>

## The problem

Accepting a suggestion isn't the same as understanding it, and on a team
where most devs are junior, "read it carefully before accepting" is a rule
that depends on judgment nobody's had time to build yet. Writing that as a
`CLAUDE.md` rule doesn't help — it's the same failure mode
`regra-com-mecanismo` already demonstrated, just aimed at a different
moment: not "did the agent do something destructive," but "did anyone
actually read why before it happened." This blocks a write to a sensitive
path unless a one-line justification is already on record.

## How to run

```bash
cd exemplos/onboarding-junior
node --test
```

Exercising the hook directly, including the `transcript_path` field Claude
Code includes in every `PreToolUse` payload:

```bash
echo '{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"Justification: caps the discount at 100% to stop a bad request from producing a negative total."}]}}' > /tmp/transcript.jsonl

echo '{"tool_name":"Write","tool_input":{"file_path":"app/Services/TaxRuleService.php"},"transcript_path":"/tmp/transcript.jsonl"}' \
  | node onboarding-junior.mjs; echo "exit=$?"
# exit=0 — the transcript already has a justification

echo '{"tool_name":"Write","tool_input":{"file_path":"app/Services/TaxRuleService.php"}}' \
  | node onboarding-junior.mjs; echo "exit=$?"
# [OJ01] Write blocked: editing a service class with no justification on record.
# exit=2
```

## What to look at first

`evaluate()` in `onboarding-junior.mjs` — same shape as `gate-shell.mjs`
and `regra-hook.mjs`: pure decision function, CLI plumbing kept out of it.
What's different here is `lastAssistantText()`, which reads the assistant's
own preceding message out of the transcript Claude Code already hands the
hook via `transcript_path`, instead of trusting a flag passed in
separately. The justification isn't graded for being *correct* — the
length check in `evaluate()` only confirms one was written. That's on
purpose: the mechanism's job is to force the pause and the sentence, not to
referee whether the reasoning holds up. A wrong-but-present justification
is a training signal for whoever reviews it later; a missing one is silence
nobody notices until it's a production bug.

## Limitations

- **The length check doesn't validate content.** Twenty characters of
  filler text passes exactly as well as a real reason — a junior dev who
  learns to type padding instead of a reason defeats the mechanism while
  still satisfying it.
- **Two path patterns, illustrative.** `app/Services/` and
  `database/migrations/` stand in for "business logic and schema"; a real
  rollout needs the actual sensitive paths for its own codebase.
- **Reads the immediately preceding assistant turn only.** A justification
  written three turns earlier and still relevant to the current write isn't
  picked up — the check is local to the message right before the write, not
  the whole conversation.
- **This is a floor, not a review process.** It guarantees a sentence
  exists before a risky write lands, not that a senior dev ever reads it.

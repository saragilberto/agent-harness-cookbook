import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluate, lastAssistantText } from "./onboarding-junior.mjs";

test("denies a sensitive write with no justification", () => {
  const result = evaluate({ filePath: "app/Services/TaxRuleService.php", precedingAssistantText: "" });
  assert.equal(result.decision, "deny");
  assert.equal(result.ruleId, "OJ01");
});

test("denies a sensitive write when the justification is too short to count", () => {
  const result = evaluate({
    filePath: "database/migrations/2026_09_16_add_discount_cap.php",
    precedingAssistantText: "Justification: fixes it.",
  });
  assert.equal(result.decision, "deny");
  assert.equal(result.ruleId, "OJ02");
});

test("allows a sensitive write once a real justification is on record", () => {
  const result = evaluate({
    filePath: "app/Services/TaxRuleService.php",
    precedingAssistantText:
      "Justification: caps the discount at 100% so a bad request payload can't produce a negative invoice total.",
  });
  assert.equal(result.decision, "allow");
});

test("allows a non-sensitive write regardless of justification", () => {
  const result = evaluate({ filePath: "resources/views/invoice.blade.php", precedingAssistantText: "" });
  assert.equal(result.decision, "allow");
});

test("lastAssistantText reads a plain string content field", () => {
  const transcript = [JSON.stringify({ type: "user", message: { role: "user", content: "hi" } }), JSON.stringify({ type: "assistant", message: { role: "assistant", content: "Justification: because reasons." } })].join(
    "\n",
  );
  assert.equal(lastAssistantText(transcript), "Justification: because reasons.");
});

test("lastAssistantText reads text blocks out of a content array", () => {
  const transcript = JSON.stringify({
    type: "assistant",
    message: { role: "assistant", content: [{ type: "text", text: "Justification: caps a negative total." }] },
  });
  assert.equal(lastAssistantText(transcript), "Justification: caps a negative total.");
});

test("lastAssistantText picks the last assistant turn, not an earlier one", () => {
  const transcript = [
    JSON.stringify({ type: "assistant", message: { role: "assistant", content: "first draft, no justification" } }),
    JSON.stringify({ type: "user", message: { role: "user", content: "add a justification" } }),
    JSON.stringify({ type: "assistant", message: { role: "assistant", content: "Justification: added the cap to stop negative totals." } }),
  ].join("\n");
  assert.equal(lastAssistantText(transcript), "Justification: added the cap to stop negative totals.");
});

test("lastAssistantText returns empty on a transcript with no assistant turns", () => {
  const transcript = JSON.stringify({ type: "user", message: { role: "user", content: "hi" } });
  assert.equal(lastAssistantText(transcript), "");
});

test("end to end: a denied write becomes allowed once the transcript carries a justification", () => {
  const transcript = JSON.stringify({
    type: "assistant",
    message: {
      role: "assistant",
      content: [{ type: "text", text: "Justification: the cap prevents a negative invoice total from a bad request." }],
    },
  });
  const result = evaluate({
    filePath: "app/Services/TaxRuleService.php",
    precedingAssistantText: lastAssistantText(transcript),
  });
  assert.equal(result.decision, "allow");
});

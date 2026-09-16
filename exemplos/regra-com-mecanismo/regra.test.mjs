import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { checkTextRule } from "./regra-texto.mjs";
import { evaluate } from "./regra-hook.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const violation = readFileSync(join(here, "fixtures/violation.php"), "utf8");
const compliant = readFileSync(join(here, "fixtures/compliant.php"), "utf8");

test("the text rule never blocks anything, even given a violation", () => {
  assert.equal(checkTextRule(violation), "not enforced");
});

test("the text rule has no way to return anything else", () => {
  assert.equal(checkTextRule(compliant), "not enforced");
  assert.equal(checkTextRule(""), "not enforced");
});

test("the hook blocks a direct assignment outside TaxRuleService", () => {
  const result = evaluate({ filePath: "app/Http/Controllers/InvoiceController.php", content: violation });
  assert.equal(result.decision, "deny");
  assert.equal(result.ruleId, "RC01");
});

test("the hook allows the compliant version, routed through TaxRuleService", () => {
  const result = evaluate({ filePath: "app/Http/Controllers/InvoiceController.php", content: compliant });
  assert.equal(result.decision, "allow");
});

test("the hook allows TaxRuleService itself to touch the field directly", () => {
  const result = evaluate({ filePath: "app/Services/TaxRuleService.php", content: violation });
  assert.equal(result.decision, "allow");
});

test("the hook allows unrelated file writes", () => {
  const result = evaluate({ filePath: "app/Models/Customer.php", content: "class Customer {}" });
  assert.equal(result.decision, "allow");
});

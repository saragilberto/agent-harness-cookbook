import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { scan, fingerprint } from "./scan.mjs";
import { delta, compareDirectories } from "./delta.mjs";

const here = dirname(fileURLToPath(import.meta.url));

/** Writes a small tree of files under a fresh temp directory and returns its path. */
function tempTree(files) {
  const root = mkdtempSync(join(tmpdir(), "grader-deterministico-"));
  for (const [relPath, content] of Object.entries(files)) {
    const full = join(root, relPath);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, content);
  }
  return root;
}

test("scan reports the rule, file, and evidence for a violation", () => {
  const root = tempTree({
    "app/Models/Invoice.php": "class Invoice extends Model\n{\n}\n",
  });
  const findings = scan(root);

  assert.equal(findings.length, 1);
  assert.equal(findings[0].ruleId, "A01");
  assert.equal(findings[0].file, "app/Models/Invoice.php");
  assert.equal(findings[0].evidence, "class Invoice extends Model");

  rmSync(root, { recursive: true, force: true });
});

test("scan does not flag a model that already extends TenantModel", () => {
  const root = tempTree({
    "app/Models/Customer.php": "class Customer extends TenantModel\n{\n}\n",
  });
  assert.deepEqual(scan(root), []);

  rmSync(root, { recursive: true, force: true });
});

test("fingerprint ignores the line number", () => {
  const a = { ruleId: "A01", file: "app/Models/Invoice.php", evidence: "class Invoice extends Model", line: 8 };
  const b = { ...a, line: 9 };

  assert.equal(fingerprint(a), fingerprint(b));
});

test("fingerprint changes when the evidence changes", () => {
  const a = { ruleId: "A01", file: "app/Models/Invoice.php", evidence: "class Invoice extends Model", line: 8 };
  const b = { ...a, evidence: "class Payment extends Model" };

  assert.notEqual(fingerprint(a), fingerprint(b));
});

test("delta cancels out a violation present on both sides (historical noise)", () => {
  const finding = { ruleId: "A01", file: "app/Models/Invoice.php", evidence: "class Invoice extends Model", line: 3 };
  // Same violation, different line: an import was added above it.
  const shifted = { ...finding, line: 5 };

  const result = delta([finding], [shifted]);
  assert.deepEqual(result.introduced, []);
  assert.deepEqual(result.resolved, []);
});

test("delta separates introduced from resolved", () => {
  const resolvedFinding = { ruleId: "A01", file: "app/Models/Invoice.php", evidence: "class Invoice extends Model", line: 3 };
  const introducedFinding = { ruleId: "A04", file: "app/Services/TaxRuleCache.php", evidence: "Cache::remember('tax_rules:rates', ...)", line: 10 };

  const result = delta([resolvedFinding], [introducedFinding]);
  assert.deepEqual(result.introduced, [introducedFinding]);
  assert.deepEqual(result.resolved, [resolvedFinding]);
});

// The three cases below mirror cases.json / run-eval.mjs against the real
// fixtures, expressed as node:test assertions instead of a script exit
// code — so `node --test` alone is enough to catch a regression.

test("R01: new compliant code introduces nothing, despite the legacy backlog", () => {
  const { introduced } = compareDirectories(
    join(here, "fixtures/baseline"),
    join(here, "fixtures/candidate-clean"),
  );
  assert.deepEqual(introduced, []);
});

test("R02: a new violation is detected, the legacy backlog is not", () => {
  const { introduced } = compareDirectories(
    join(here, "fixtures/baseline"),
    join(here, "fixtures/candidate-violation"),
  );
  const ruleIds = [...new Set(introduced.map((f) => f.ruleId))].sort();
  assert.deepEqual(ruleIds, ["A01", "A04"]);
});

test("R03 canary: the baseline compared against itself is always empty", () => {
  const result = compareDirectories(join(here, "fixtures/baseline"), join(here, "fixtures/baseline"));
  assert.deepEqual(result.introduced, []);
  assert.deepEqual(result.resolved, []);
});

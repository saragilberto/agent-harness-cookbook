import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { inventory } from "./inventario-legado.mjs";
import { evaluate } from "./readonly-guard.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const schema = readFileSync(join(here, "fixtures/schema.sql"), "utf8");

test("inventory finds all four tables with their columns and primary keys", () => {
  const { tables } = inventory(schema);
  assert.deepEqual(
    tables.map((t) => t.name),
    ["CUSTOMERS", "INVOICES", "INVOICE_ITEMS", "TAX_RULES"],
  );
  assert.deepEqual(tables[0].primaryKey, ["CUST_ID"]);
});

test("flags a *_ID column with no declared FOREIGN KEY as an implicit foreign key", () => {
  const { suspiciousPatterns } = inventory(schema);
  const implicitFks = suspiciousPatterns.filter((p) => p.kind === "implicit-foreign-key");
  assert.deepEqual(
    implicitFks.map((p) => `${p.table}.${p.column}`).sort(),
    ["CUSTOMERS.TEN_ID", "INVOICES.CUST_ID", "INVOICE_ITEMS.INV_ID"],
  );
});

test("does not flag a *_ID column that has a real FOREIGN KEY constraint", () => {
  const { suspiciousPatterns } = inventory(schema);
  const flagged = suspiciousPatterns.some((p) => p.table === "TAX_RULES" && p.column === "TEN_ID");
  assert.equal(flagged, false);
});

test("does not flag a table's own primary key as an implicit foreign key", () => {
  const { suspiciousPatterns } = inventory(schema);
  const flagged = suspiciousPatterns.some((p) => p.table === "CUSTOMERS" && p.column === "CUST_ID");
  assert.equal(flagged, false);
});

test("flags CHAR(1) columns as undocumented flags", () => {
  const { suspiciousPatterns } = inventory(schema);
  const flags = suspiciousPatterns.filter((p) => p.kind === "undocumented-flag");
  assert.deepEqual(
    flags.map((p) => `${p.table}.${p.column}`).sort(),
    ["CUSTOMERS.FLG_ACTIVE", "INVOICES.STAT"],
  );
});

test("readonly-guard allows a SELECT against the legacy database", () => {
  const result = evaluate('isql legacy.fdb -e "SELECT * FROM CUSTOMERS"');
  assert.equal(result.decision, "allow");
});

test("readonly-guard allows metadata extraction", () => {
  const result = evaluate("isql legacy.fdb -x");
  assert.equal(result.decision, "allow");
});

test("readonly-guard blocks an UPDATE against the legacy database", () => {
  const result = evaluate('isql legacy.fdb -e "UPDATE CUSTOMERS SET FLG_ACTIVE=\'N\' WHERE CUST_ID=1"');
  assert.equal(result.decision, "deny");
  assert.equal(result.ruleId, "IL01");
});

test("readonly-guard blocks an ALTER TABLE against the legacy database", () => {
  const result = evaluate("isql ACME_LEGACY -e \"ALTER TABLE CUSTOMERS ADD NOTES VARCHAR(200)\"");
  assert.equal(result.decision, "deny");
});

test("readonly-guard allows a write command that has nothing to do with the legacy database", () => {
  const result = evaluate('psql app_db -c "UPDATE invoices SET status = \'paid\'"');
  assert.equal(result.decision, "allow");
});

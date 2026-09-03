#!/usr/bin/env node
/**
 * Architectural violation scanner.
 *
 * Rules for the Acme Invoices domain: a multi-tenant platform with one
 * Postgres schema per tenant. The four rules below are the ones that, when
 * violated, leak data from one tenant to another — the kind of failure that
 * doesn't show up in a unit test because the test runs with a single tenant.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

export const RULES = [
  {
    id: "A01",
    pattern: /class\s+(\w+)\s+extends\s+Model\b/,
    message: "model extends Model instead of TenantModel; goes to the wrong schema",
  },
  {
    id: "A02",
    pattern: /DB::connection\(\s*['"](default|pgsql)['"]\s*\)/,
    message: "fixed connection ignores the tenant's schema",
  },
  {
    id: "A03",
    pattern: /SET\s+search_path/i,
    message: "raw search_path without restoration corrupts subsequent queries",
  },
  {
    id: "A04",
    pattern: /Cache::(put|get|remember)\(\s*['"](?!tenant:)/,
    message: "cache key without a tenant prefix collides across tenants",
  },
];

const IGNORED_DIRS = new Set(["node_modules", ".git", "vendor", "dist"]);
const SCANNED_EXTENSIONS = [".php", ".js", ".mjs", ".ts"];

function walk(dir, root, files = []) {
  for (const entry of readdirSync(dir)) {
    if (IGNORED_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, root, files);
    } else if (SCANNED_EXTENSIONS.some((ext) => entry.endsWith(ext))) {
      files.push(full);
    }
  }
  return files;
}

/**
 * @returns {Array<{ruleId: string, file: string, evidence: string, line: number}>}
 */
export function scan(root, rules = RULES) {
  const findings = [];

  for (const file of walk(root, root)) {
    const lines = readFileSync(file, "utf8").split("\n");

    lines.forEach((text, index) => {
      for (const rule of rules) {
        if (rule.pattern.test(text)) {
          findings.push({
            ruleId: rule.id,
            file: relative(root, file),
            // `evidence` is the normalized text of the line, and it — not
            // the line number — is what makes up the finding's identity.
            // The line number shifts whenever someone adds an import at
            // the top, which would generate a false delta on every commit.
            evidence: text.trim(),
            line: index + 1,
          });
        }
      }
    });
  }

  return findings;
}

/** Stable identity of a finding, used to compare two scans. */
export function fingerprint(finding) {
  return `${finding.ruleId}::${finding.file}::${finding.evidence}`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const target = process.argv[2];
  if (!target) {
    console.error("usage: node scan.mjs <directory>");
    process.exit(1);
  }
  console.log(JSON.stringify(scan(target), null, 2));
}

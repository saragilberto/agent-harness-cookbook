#!/usr/bin/env node
/**
 * Delta comparison.
 *
 * The problem this solves: any real codebase already has violations. A
 * scanner that reports the absolute total returns 340 findings before and
 * 341 after, and nobody can judge the change. The grader needs to answer one
 * question — "did this change introduce a new violation?" — and for that,
 * what matters is the difference between two scans, not the value of either.
 *
 * The useful side effect is that historical noise cancels out: a violation
 * that already existed shows up on both sides and disappears from the delta.
 */
import { pathToFileURL } from "node:url";
import { scan, fingerprint } from "./scan.mjs";

/**
 * @returns {{introduced: Array, resolved: Array}}
 */
export function delta(baselineFindings, candidateFindings) {
  const baseline = new Set(baselineFindings.map(fingerprint));
  const candidate = new Set(candidateFindings.map(fingerprint));

  return {
    introduced: candidateFindings.filter((f) => !baseline.has(fingerprint(f))),
    resolved: baselineFindings.filter((f) => !candidate.has(fingerprint(f))),
  };
}

export function compareDirectories(baselineDir, candidateDir) {
  return delta(scan(baselineDir), scan(candidateDir));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [baselineDir, candidateDir] = process.argv.slice(2);
  if (!baselineDir || !candidateDir) {
    console.error("usage: node delta.mjs <before-dir> <after-dir>");
    process.exit(1);
  }
  console.log(JSON.stringify(compareDirectories(baselineDir, candidateDir), null, 2));
}

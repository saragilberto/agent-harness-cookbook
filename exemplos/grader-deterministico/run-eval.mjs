#!/usr/bin/env node
/**
 * Eval runner.
 *
 * Each case describes a change and what the grader should conclude about
 * it. The output is binary per case: pass or fail. No 0-to-10 score, no
 * "partially compliant" — the isolation rule has no middle ground, and a
 * grader that produces a gradient here just hands the decision back to the
 * human.
 *
 * This is the difference from LLM-as-judge: the judge is indispensable for
 * subjective criteria ("is the explanation clear?") and is the wrong tool
 * for a hard rule, where it introduces variance on top of something that
 * was deterministic.
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { compareDirectories } from "./delta.mjs";

const here = dirname(fileURLToPath(import.meta.url));

export function runCase(testCase, root = here) {
  const { introduced } = compareDirectories(
    join(root, testCase.baseline),
    join(root, testCase.candidate),
  );

  const actualRules = [...new Set(introduced.map((f) => f.ruleId))].sort();
  const expectedRules = [...(testCase.expectViolations ?? [])].sort();

  const passed =
    actualRules.length === expectedRules.length &&
    actualRules.every((id, index) => id === expectedRules[index]);

  return { id: testCase.id, passed, expectedRules, actualRules, introduced };
}

export function runAll(cases, root = here) {
  return cases.map((testCase) => runCase(testCase, root));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const cases = JSON.parse(readFileSync(join(here, "cases.json"), "utf8"));
  const results = runAll(cases);

  for (const result of results) {
    const mark = result.passed ? "PASS" : "FAIL";
    console.log(`${mark}  ${result.id}`);
    if (!result.passed) {
      console.log(`      expected: [${result.expectedRules.join(", ") || "none"}]`);
      console.log(`      actual:   [${result.actualRules.join(", ") || "none"}]`);
      for (const finding of result.introduced) {
        console.log(`      ${finding.file}:${finding.line}  ${finding.evidence}`);
      }
    }
  }

  const failed = results.filter((r) => !r.passed).length;
  console.log(`\n${results.length - failed}/${results.length} cases passed`);
  process.exit(failed > 0 ? 1 : 0);
}

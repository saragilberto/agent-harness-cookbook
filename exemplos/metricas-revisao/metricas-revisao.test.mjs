import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseLog, computeMetrics } from "./metricas-revisao.mjs";

const here = dirname(fileURLToPath(import.meta.url));

test("parseLog reads hash, parents, timestamp and lines changed", () => {
  const commits = parseLog("c1|p0|1700000000\n10\t2\tapp/Services/TaxRuleService.php\n");
  assert.deepEqual(commits, [
    { hash: "c1", parents: ["p0"], timestamp: 1700000000, isMerge: false, linesChanged: 12 },
  ]);
});

test("parseLog treats two or more parents as a merge", () => {
  const [commit] = parseLog("m1|c1 p0|1700001800\n0\t0\tapp/Services/TaxRuleService.php\n");
  assert.equal(commit.isMerge, true);
  assert.deepEqual(commit.parents, ["c1", "p0"]);
});

test("computeMetrics groups a fast, small PR correctly", () => {
  const commits = parseLog(
    ["c1|p0|1700000000", "10\t2\tapp/Services/TaxRuleService.php", "", "m1|c1 p0|1700001800", "0\t0\tapp/Services/TaxRuleService.php"].join(
      "\n",
    ),
  );
  const { prs, openCommits } = computeMetrics(commits);
  assert.equal(openCommits, 0);
  assert.deepEqual(prs, [{ mergeCommit: "m1", size: 12, hoursToMerge: 0.5, commitCount: 1 }]);
});

test("computeMetrics sums multiple commits into one slow, big PR", () => {
  const commits = parseLog(
    [
      "c2|m1|1700005400",
      "200\t50\tapp/Models/Invoice.php",
      "",
      "c3|c2|1700009000",
      "300\t100\tapp/Models/Invoice.php",
      "",
      "m2|c3 m1|1700149400",
      "0\t0\tapp/Models/Invoice.php",
    ].join("\n"),
  );
  const { prs } = computeMetrics(commits);
  assert.equal(prs.length, 1);
  assert.equal(prs[0].size, 650);
  assert.equal(prs[0].commitCount, 2);
  assert.equal(prs[0].hoursToMerge, 40);
});

test("trailing commits with no merge yet are reported as open, not as a PR", () => {
  const commits = parseLog(["c4|m2|1700153000", "5\t1\tREADME.md"].join("\n"));
  const { prs, openCommits } = computeMetrics(commits);
  assert.deepEqual(prs, []);
  assert.equal(openCommits, 1);
});

test("a merge with no preceding commits is skipped, not reported as a zero-commit PR", () => {
  const commits = parseLog(["m1|a b|1700000000", "0\t0\tREADME.md", "", "m2|c d|1700003600", "0\t0\tREADME.md"].join("\n"));
  const { prs, openCommits } = computeMetrics(commits);
  assert.deepEqual(prs, []);
  assert.equal(openCommits, 0);
});

test("full sample.log fixture produces two PRs and one open commit", () => {
  const commits = parseLog(readFileSync(join(here, "fixtures/sample.log"), "utf8"));
  const { prs, openCommits } = computeMetrics(commits);
  assert.equal(prs.length, 2);
  assert.equal(openCommits, 1);
  assert.equal(prs[0].size, 12);
  assert.equal(prs[1].size, 650);
  assert.ok(prs[1].hoursToMerge > prs[0].hoursToMerge);
});

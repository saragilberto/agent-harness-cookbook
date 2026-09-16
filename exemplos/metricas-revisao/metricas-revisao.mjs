#!/usr/bin/env node
/**
 * Review-bottleneck metrics: PR size and time-to-merge from a git log.
 *
 * Code generation got faster; review didn't move. Nobody notices because
 * nobody measures it — "the PRs feel bigger lately" is a feeling, not a
 * number. This reads a normalized log and turns it into two numbers per PR:
 * how much changed, and how long it sat before merging.
 *
 * Input format (one block per commit, blank line between blocks), produced
 * with:
 *
 *   git log --reverse --pretty=format:'%H|%P|%ct' --numstat
 *
 * `--reverse` matters: this parser assumes oldest-first order so it can
 * accumulate a PR's commits before it sees the merge that closes them.
 */
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

/**
 * @param {string} text
 * @returns {Array<{hash: string, parents: string[], timestamp: number, isMerge: boolean, linesChanged: number}>}
 */
export function parseLog(text) {
  return text
    .trim()
    .split(/\n\s*\n/)
    .filter((block) => block.trim() !== "")
    .map((block) => {
      const [header, ...fileLines] = block.split("\n");
      const [hash, parentField, timestamp] = header.split("|");
      const parents = parentField.trim() === "" ? [] : parentField.trim().split(/\s+/);

      const linesChanged = fileLines
        .filter((line) => line.trim() !== "")
        .reduce((sum, line) => {
          const [added, deleted] = line.split("\t");
          return sum + Number(added) + Number(deleted);
        }, 0);

      return {
        hash,
        parents,
        timestamp: Number(timestamp),
        // A merge commit has two or more parents. That's the only signal
        // this format carries about "a PR just closed" — there's no separate
        // merge marker, because real `git log` doesn't have one either.
        isMerge: parents.length >= 2,
        linesChanged,
      };
    });
}

/**
 * Groups commits into PRs: a run of regular commits closed by the next
 * merge commit. `size` is the sum of lines changed across that run;
 * `hoursToMerge` is the time from the first commit in the run to the merge.
 *
 * @param {ReturnType<typeof parseLog>} commits
 * @returns {{prs: Array<{mergeCommit: string, size: number, hoursToMerge: number, commitCount: number}>, openCommits: number}}
 */
export function computeMetrics(commits) {
  const prs = [];
  let batch = [];

  for (const commit of commits) {
    if (commit.isMerge) {
      // A merge with no preceding commits (e.g. an empty merge, or two
      // merges back to back) closes nothing — skip it instead of emitting
      // a zero-commit PR that would just be noise in the metric.
      if (batch.length > 0) {
        const size = batch.reduce((sum, c) => sum + c.linesChanged, 0);
        const hoursToMerge = (commit.timestamp - batch[0].timestamp) / 3600;
        prs.push({ mergeCommit: commit.hash, size, hoursToMerge, commitCount: batch.length });
      }
      batch = [];
    } else {
      batch.push(commit);
    }
  }

  // Commits left in the batch belong to a PR that's still open. They're not
  // a PR yet — reporting them as one would invent a merge time that hasn't
  // happened.
  return { prs, openCommits: batch.length };
}

function formatTable(metrics) {
  const lines = ["merge_commit  size  hours_to_merge  commits"];
  for (const pr of metrics.prs) {
    lines.push(
      `${pr.mergeCommit.padEnd(12)}  ${String(pr.size).padEnd(4)}  ${pr.hoursToMerge.toFixed(1).padEnd(14)}  ${pr.commitCount}`,
    );
  }
  if (metrics.openCommits > 0) {
    lines.push(`\n${metrics.openCommits} commit(s) still open, not merged yet.`);
  }
  return lines.join("\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const logPath = process.argv[2];
  if (!logPath) {
    console.error("usage: node metricas-revisao.mjs <log-file>");
    process.exit(1);
  }
  const commits = parseLog(readFileSync(logPath, "utf8"));
  console.log(formatTable(computeMetrics(commits)));
}

#!/usr/bin/env node
/**
 * Comparação por delta.
 *
 * O problema que isto resolve: qualquer base real já tem violação. Um scanner
 * que reporta o total absoluto devolve 340 achados antes e 341 depois, e
 * ninguém consegue julgar a mudança. O grader precisa responder uma pergunta
 * só — "esta mudança introduziu violação nova?" — e para isso o que importa é
 * a diferença entre duas varreduras, não o valor de nenhuma delas.
 *
 * O efeito colateral útil é que o ruído histórico se cancela: violação que já
 * existia aparece nos dois lados e some do delta.
 */
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

if (import.meta.url === `file://${process.argv[1]}`) {
  const [baselineDir, candidateDir] = process.argv.slice(2);
  if (!baselineDir || !candidateDir) {
    console.error("uso: node delta.mjs <dir-antes> <dir-depois>");
    process.exit(1);
  }
  console.log(JSON.stringify(compareDirectories(baselineDir, candidateDir), null, 2));
}

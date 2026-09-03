#!/usr/bin/env node
/**
 * Runner de eval.
 *
 * Cada caso descreve uma mudança e o que o grader deve concluir sobre ela.
 * A saída é binária por caso: passou ou não. Nada de nota de 0 a 10, nada de
 * "parcialmente conforme" — a regra de isolamento não tem meio-termo, e um
 * grader que produz gradiente aqui só devolve a decisão para o humano.
 *
 * É esta a diferença para o LLM como juiz: o juiz é indispensável para
 * critério subjetivo ("a explicação está clara?") e é a ferramenta errada
 * para regra dura, onde ele introduz variância em cima de algo que era
 * determinístico.
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
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

if (import.meta.url === `file://${process.argv[1]}`) {
  const cases = JSON.parse(readFileSync(join(here, "cases.json"), "utf8"));
  const results = runAll(cases);

  for (const result of results) {
    const mark = result.passed ? "PASS" : "FAIL";
    console.log(`${mark}  ${result.id}`);
    if (!result.passed) {
      console.log(`      esperado: [${result.expectedRules.join(", ") || "nenhuma"}]`);
      console.log(`      obtido:   [${result.actualRules.join(", ") || "nenhuma"}]`);
      for (const finding of result.introduced) {
        console.log(`      ${finding.file}:${finding.line}  ${finding.evidence}`);
      }
    }
  }

  const failed = results.filter((r) => !r.passed).length;
  console.log(`\n${results.length - failed}/${results.length} casos passaram`);
  process.exit(failed > 0 ? 1 : 0);
}

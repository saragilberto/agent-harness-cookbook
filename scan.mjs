#!/usr/bin/env node
/**
 * Scanner de violação arquitetural.
 *
 * Regras do domínio Acme Faturas: plataforma multi-tenant com um schema
 * Postgres por tenant. As quatro regras abaixo são as que, se violadas,
 * vazam dado de um tenant para outro — o tipo de falha que não aparece em
 * teste de unidade porque o teste roda com um tenant só.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

export const RULES = [
  {
    id: "A01",
    pattern: /class\s+(\w+)\s+extends\s+Model\b/,
    message: "model estende Model em vez de TenantModel; vai para o schema errado",
  },
  {
    id: "A02",
    pattern: /DB::connection\(\s*['"](default|pgsql)['"]\s*\)/,
    message: "conexão fixa ignora o schema do tenant",
  },
  {
    id: "A03",
    pattern: /SET\s+search_path/i,
    message: "search_path cru sem restauração corrompe as queries seguintes",
  },
  {
    id: "A04",
    pattern: /Cache::(put|get|remember)\(\s*['"](?!tenant:)/,
    message: "chave de cache sem prefixo de tenant colide entre tenants",
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
            // `evidence` é o texto normalizado da linha, e é ele — não o
            // número da linha — que compõe a identidade do achado.
            // Número de linha muda quando alguém adiciona um import no topo,
            // e isso geraria delta falso a cada commit.
            evidence: text.trim(),
            line: index + 1,
          });
        }
      }
    });
  }

  return findings;
}

/** Identidade estável de um achado, usada para comparar duas varreduras. */
export function fingerprint(finding) {
  return `${finding.ruleId}::${finding.file}::${finding.evidence}`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const target = process.argv[2];
  if (!target) {
    console.error("uso: node scan.mjs <diretorio>");
    process.exit(1);
  }
  console.log(JSON.stringify(scan(target), null, 2));
}

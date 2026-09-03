#!/usr/bin/env node
/**
 * Hook de PreToolUse: avalia comandos de shell antes da execução.
 *
 * Contrato com o Claude Code:
 *   - recebe JSON no stdin com { tool_name, tool_input }
 *   - sai com código 0 para liberar
 *   - sai com código 2 e mensagem no stderr para bloquear;
 *     a mensagem volta para o agente, então ela precisa dizer o que fazer
 *     em vez de só dizer "não".
 *
 * A lógica de decisão está isolada em evaluate() de propósito: é o que
 * permite testar o gate sem simular o runtime do agente.
 */

/**
 * Cada regra é uma tese sobre o que nunca deve acontecer sem humano no meio.
 * `hint` é o que o agente lê — vale mais que `reason`, porque é o que
 * determina se ele tenta de novo do jeito certo ou fica preso.
 */
export const RULES = [
  {
    id: "SH001",
    pattern: /\brm\s+(-[a-zA-Z]*[rf][a-zA-Z]*\s+)+(\/|~|\$HOME)(\s|$)/,
    reason: "remoção recursiva a partir da raiz ou do home",
    hint: "Apague caminhos relativos dentro do diretório do projeto.",
  },
  {
    id: "SH002",
    pattern: /\bgit\s+push\b[^\n]*\s(--force|-f)\b/,
    reason: "push forçado",
    hint: "Use --force-with-lease, ou abra um PR em vez de reescrever a branch.",
  },
  {
    id: "SH003",
    pattern: /\bgit\s+(commit|push)\b[^\n]*\b(main|master)\b/,
    reason: "escrita direta na branch principal",
    hint: "Crie uma branch e abra PR. A principal é protegida por política.",
  },
  {
    id: "SH004",
    pattern: /\b(curl|wget)\b[^\n]*\|\s*(sudo\s+)?(ba)?sh\b/,
    reason: "execução de script remoto direto no shell",
    hint: "Baixe o script, deixe visível no diff, e execute em outro passo.",
  },
  {
    id: "SH005",
    pattern: /\b(DROP\s+(TABLE|SCHEMA|DATABASE)|TRUNCATE\s+TABLE)\b/i,
    reason: "DDL destrutivo",
    hint: "Escreva uma migration. DDL fora de migration não tem rollback.",
  },
  {
    id: "SH006",
    pattern: /\bchmod\s+(-[a-zA-Z]+\s+)*777\b/,
    reason: "permissão 777",
    hint: "Use 755 para diretório e 644 para arquivo.",
  },
  {
    id: "SH007",
    pattern: />>?\s*\.?[\w./-]*\.env(\.[\w-]+)?(\s|$)/,
    reason: "escrita em arquivo de ambiente",
    hint: "Edite .env.example. O .env real é responsabilidade de quem opera.",
  },
];

/**
 * Comandos que casariam com uma regra mas são seguros por contexto.
 * Toda allowlist é dívida: cada entrada aqui é um buraco no gate, então
 * ela precisa ser específica e ter motivo escrito.
 */
export const ALLOWLIST = [
  {
    id: "ALLOW001",
    pattern: /^git\s+log\b/,
    reason: "leitura de histórico nunca escreve",
  },
];

/**
 * @param {string} command
 * @returns {{decision: "allow"|"deny", ruleId?: string, reason?: string, hint?: string}}
 */
export function evaluate(command) {
  if (typeof command !== "string" || command.trim() === "") {
    return { decision: "allow" };
  }

  const normalized = command.trim();

  for (const entry of ALLOWLIST) {
    if (entry.pattern.test(normalized)) {
      return { decision: "allow" };
    }
  }

  // Um comando pode encadear vários com && ou ;. Avaliar a linha inteira
  // como um bloco só é o erro clássico: `ls && rm -rf /` passa se o gate
  // olhar apenas o primeiro verbo.
  for (const rule of RULES) {
    if (rule.pattern.test(normalized)) {
      return {
        decision: "deny",
        ruleId: rule.id,
        reason: rule.reason,
        hint: rule.hint,
      };
    }
  }

  return { decision: "allow" };
}

export function formatDenial(result) {
  return `[${result.ruleId}] Comando bloqueado: ${result.reason}.\n${result.hint}`;
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

async function main() {
  let payload;
  try {
    payload = JSON.parse(await readStdin());
  } catch {
    // Falha ao entender a entrada libera em vez de bloquear.
    // Gate que quebra fechado trava o agente por bug próprio; gate que
    // quebra aberto perde uma checagem. O segundo custa menos, desde que
    // a falha seja visível.
    process.stderr.write("gate-shell: entrada inválida, liberando\n");
    process.exit(0);
  }

  if (payload?.tool_name !== "Bash") process.exit(0);

  const result = evaluate(payload?.tool_input?.command);
  if (result.decision === "deny") {
    process.stderr.write(formatDenial(result) + "\n");
    process.exit(2);
  }

  process.exit(0);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

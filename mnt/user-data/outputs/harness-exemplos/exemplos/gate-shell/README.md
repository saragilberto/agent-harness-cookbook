# Hook de PreToolUse como gate de shell

Artigo: <url>

## O problema

Regra escrita em `CLAUDE.md` é sugestão: o agente lê, concorda e às vezes faz
diferente. Enquanto a proibição existe só como texto no contexto, ela depende
de o modelo lembrar dela no momento certo, com o contexto cheio, no meio de uma
tarefa longa. O que transforma política em garantia é um hook que roda antes da
execução e não depende de ninguém lembrar de nada.

## Como rodar

```bash
cd exemplos/gate-shell
node --test
```

Exercitando o hook direto, como o agente faz:

```bash
echo '{"tool_name":"Bash","tool_input":{"command":"git push --force origin main"}}' \
  | node gate-shell.mjs; echo "exit=$?"
# [SH002] Comando bloqueado: push forçado.
# Use --force-with-lease, ou abra um PR em vez de reescrever a branch.
# exit=2
```

Para instalar no seu projeto, registre em `.claude/settings.json` como hook de
`PreToolUse` no matcher `Bash`.

## O que olhar primeiro

`gate-shell.mjs`, função `evaluate()`. É onde a decisão acontece, e é pura de
propósito: recebe string, devolve decisão. Todo o resto do arquivo é encanamento
de stdin e código de saída.

Repare em duas escolhas de projeto:

**O `hint` importa mais que o `reason`.** A mensagem do stderr volta para o
agente, então ela é a diferença entre ele tentar de novo do jeito certo ou
gastar três turnos travado. Negativa sem caminho alternativo é o que faz o
agente entrar em loop.

**O gate quebra aberto, não fechado.** Se a entrada não for JSON válido, ele
libera e escreve no stderr. Gate que quebra fechado trava o time inteiro por bug
próprio; gate que quebra aberto perde uma checagem e deixa rastro.

## Limitações

- **Detecção é por padrão de texto e é evadível.** `R=rm; $R -rf /` passa. Há
  dois testes marcados com `skip` documentando evasões conhecidas — a limitação
  registrada em teste é mais honesta que a registrada em README.
- **A allowlist é dívida.** Cada entrada é um buraco no gate. Aqui tem uma só,
  e mesmo assim com motivo escrito.
- **As regras são do domínio Acme Faturas.** As suas vão ser outras. O que
  transfere é a estrutura — regra com id, motivo e orientação, decisão isolada
  em função pura, e teste separando bloqueio, liberação e evasão.
- **Falso positivo custa mais que falso negativo.** Um gate que atrapalha o
  trabalho normal é desligado na segunda semana, e aí a proteção é zero. Por
  isso o grupo de testes "libera" é maior que o de "bloqueia".

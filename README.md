# harness-exemplos

Código que acompanha os artigos sobre governança de código gerado por agente.

Cada diretório em `exemplos/` corresponde a um artigo e contém a versão executável
do que o texto descreve. Nada aqui é pseudocódigo: se está no repositório, roda.

## Como usar

Cada exemplo é autocontido. Entre no diretório, leia o `README.md` e siga o
bloco "Como rodar". Nenhum exemplo tem dependência externa — tudo usa Node 20+
e a biblioteca padrão.

```bash
git clone <url>
cd harness-exemplos/exemplos/gate-shell
node --test
```

## Exemplos

| Diretório | Artigo | O que demonstra |
|---|---|---|
| [`gate-shell`](exemplos/gate-shell) | Hook de PreToolUse como gate de shell | Bloqueio de comandos destrutivos antes da execução, com suíte de testes própria |
| [`grader-deterministico`](exemplos/grader-deterministico) | Grader determinístico versus LLM como juiz | Scanner de violação arquitetural com comparação por delta |

## Domínio dos exemplos

Todos os exemplos usam o mesmo domínio fictício: **Acme Faturas**, uma plataforma
multi-tenant de faturamento com isolamento por schema no Postgres. É um domínio
inventado, escolhido por ser simples o bastante para não atrapalhar e realista o
bastante para as regras fazerem sentido.

Manter o mesmo domínio entre artigos deixa o contexto acumular: quem leu o
terceiro artigo já sabe o que é um tenant aqui.

## Convenções

Ver [`CONVENCOES.md`](CONVENCOES.md) — estrutura de diretório, formato do README
de cada exemplo e regras de nomenclatura.

## Licença

MIT. Use, copie, adapte e leve para dentro da sua empresa sem pedir nada.

# Convenções

Regras para manter os exemplos consistentes entre si. Se um exemplo novo não
couber nelas, a convenção é que muda — mas muda para todos.

## Estrutura de um exemplo

```
exemplos/<slug-do-artigo>/
├── README.md          obrigatório
├── package.json       obrigatório (define os scripts, mesmo sem dependências)
├── <codigo>.mjs       o artefato em si
├── <codigo>.test.mjs  testes, quando o artefato tem lógica testável
└── fixtures/          entradas de exemplo, quando o artefato processa arquivos
```

O `slug` do diretório é igual ao slug do artigo no site. Nunca renomeie um slug
depois de publicado.

## README de cada exemplo

Seções, nesta ordem:

1. **Título** — mesmo título do artigo
2. **Link para o artigo** — uma linha
3. **O problema** — 2 a 3 frases, para quem chegou pelo GitHub sem ler o texto
4. **Como rodar** — comandos copiáveis, sem passo implícito
5. **O que olhar primeiro** — qual arquivo e qual função, para não obrigar
   ninguém a ler tudo
6. **Limitações** — o que este exemplo não cobre

A seção 6 não é opcional. Exemplo sem limitação declarada é exemplo que ninguém
rodou em cima de código real.

## Idioma

- **Documentação, README e comentários: português.**
- **Identificadores de código: inglês.**

Sem meio-termo. Código com `nomeDoArquivo` ao lado de `filePath` é o tipo de
inconsistência que envelhece mal e que o leitor nota antes do conteúdo.

## Domínio

Domínio fictício único: **Acme Faturas**, plataforma multi-tenant de faturamento,
isolamento por schema no Postgres, um schema por tenant mais um schema `shared`
para dado de referência.

Entidades disponíveis para os exemplos: `Invoice`, `Customer`, `Payment`,
`Tenant`, `TaxRule`.

Nunca use nome de cliente real, vocabulário interno de empresa nenhuma, nem
identificador de ADR de projeto privado. Se um exemplo veio de um caso real, ele
é reescrito neste domínio antes de entrar aqui.

## Dependências

Nenhuma, por padrão. Node 20+ e biblioteca padrão (`node:test`, `node:fs`,
`node:assert`). Um exemplo que precisa de dependência precisa justificar no
README por que a alternativa sem dependência não serve.

O motivo é prático: quem lê o artigo tem que conseguir rodar o exemplo em menos
de um minuto, sem instalar nada e sem resolver conflito de versão.

## Testes

Todo artefato com lógica de decisão tem teste. O teste é parte do exemplo, não
acessório: em um artigo sobre confiabilidade de harness, publicar código sem
teste contradiz o texto.

```bash
node --test
```

## Template

`_template/` tem o esqueleto de um exemplo novo. Copie o diretório, renomeie
para o slug do artigo e preencha.

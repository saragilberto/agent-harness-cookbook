# Grader determinístico versus LLM como juiz

Artigo: <url>

## O problema

Toda base real já tem violação. Um scanner que reporta total absoluto devolve
340 achados antes da mudança e 341 depois, e ninguém consegue julgar nada com
isso. Pior: se você usa um LLM como juiz para decidir se a mudança respeitou a
regra arquitetural, ele acerta na maioria das vezes e erra em algumas, e você
acabou de colocar variância em cima de uma regra que era binária.

## Como rodar

```bash
cd exemplos/grader-deterministico
node run-eval.mjs     # roda os casos e devolve nota
node --test           # testa o próprio grader
```

Inspecionando os passos separados:

```bash
node scan.mjs fixtures/baseline
node delta.mjs fixtures/baseline fixtures/candidate-violation
```

## O que olhar primeiro

`scan.mjs`, função `fingerprint()` — três linhas que decidem se o grader é
utilizável. A identidade de um achado é `regra + arquivo + texto da linha`, e
não inclui o número da linha. Se incluísse, adicionar um import no topo do
arquivo geraria delta falso em tudo abaixo, e o grader viraria ruído no primeiro
commit real.

Depois, `delta.mjs`. O grader não pergunta "quantas violações existem?", pergunta
"esta mudança introduziu violação nova?". A subtração faz o passivo histórico se
cancelar sozinho, sem precisar de arquivo de exceção nem de baseline congelado
que alguém esquece de atualizar.

O caso `R03` em `cases.json` é um canário: compara o baseline com ele mesmo e
espera zero. Se ele falhar, a impressão digital está instável e todos os outros
casos viraram ruído. Vale ter um equivalente disso em qualquer suíte de eval.

## Onde entra o LLM como juiz

Não aqui. Isolamento de tenant é regra dura, tem resposta certa, e grader
determinístico responde igual toda vez, de graça, em milissegundos.

O juiz é indispensável em outro lugar: critério subjetivo, do tipo "a mensagem
de erro explica o que fazer?" ou "o PR descreve a mudança?". Nesses casos não
existe regex possível e a variância do juiz é aceitável porque o gabarito humano
também varia.

A regra prática: se dois revisores experientes sempre concordariam, é grader
determinístico. Se eles poderiam divergir, é juiz.

## Limitações

- **Regex não entende sintaxe.** `class Invoice extends Model` dentro de um
  comentário ou de uma string conta como violação. Para regra que exige precisão,
  o passo seguinte é AST em vez de linha.
- **Só detecta o que já foi nomeado.** Se o padrão não estiver na lista, o
  scanner devolve zero achados — e zero achado por ausência de padrão aplicável
  é indistinguível de zero achado por conformidade. É o falso zero, e é a
  principal armadilha desta abordagem.
- **O delta não vê renomeação.** Mover um arquivo aparece como uma violação
  resolvida mais uma introduzida.
- **Quatro regras é ilustração, não cobertura.** Uma suíte real de isolamento
  multi-tenant tem regra para job, seeder, command, migration e chave de cache,
  e cada uma nasce de um incidente.

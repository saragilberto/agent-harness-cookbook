# Conventions

Rules to keep the examples consistent with each other. If a new example
doesn't fit them, the convention is what changes — but it changes for everyone.

## Structure of an example

```
exemplos/<article-slug>/
├── README.md          required
├── package.json       required (defines the scripts, even without dependencies)
├── <code>.mjs         the artifact itself
├── <code>.test.mjs    tests, when the artifact has testable logic
└── fixtures/          sample inputs, when the artifact processes files
```

The directory's `slug` matches the article's slug on the site. Never rename a
slug after it's published.

## Each example's README

Sections, in this order:

1. **Title** — same title as the article
2. **Link to the article** — one line
3. **The problem** — 2 to 3 sentences, for someone who arrived via GitHub
   without reading the text
4. **How to run** — copyable commands, no implicit step
5. **What to look at first** — which file and which function, so nobody is
   forced to read everything
6. **Limitations** — what this example doesn't cover

Section 6 is not optional. An example without a declared limitation is an
example nobody ran against real code.

## Language

- **Everything — documentation, README, comments, and code identifiers — is
  in English.**

No half-measures. Code with `nomeDoArquivo` next to `filePath` is the kind of
inconsistency that ages badly and that the reader notices before the content.

## Domain

Single fictional domain: **Acme Invoices**, a multi-tenant billing platform,
schema-based isolation in Postgres, one schema per tenant plus a `shared`
schema for reference data.

Entities available for the examples: `Invoice`, `Customer`, `Payment`,
`Tenant`, `TaxRule`.

Never use a real customer's name, any company's internal vocabulary, or a
private project's ADR identifier. If an example came from a real case, it's
rewritten into this domain before it goes in here.

## Dependencies

None, by default. Node 20+ and the standard library (`node:test`, `node:fs`,
`node:assert`). An example that needs a dependency needs to justify in the
README why the dependency-free alternative doesn't work.

The reason is practical: whoever reads the article has to be able to run the
example in under a minute, without installing anything and without resolving
a version conflict.

## Tests

Every artifact with decision logic has a test. The test is part of the
example, not an accessory: in an article about harness reliability,
publishing code without a test would contradict the text.

```bash
node --test
```

## Template

`_template/` has the skeleton for a new example. Copy the directory, rename
it to the article's slug, and fill it in.

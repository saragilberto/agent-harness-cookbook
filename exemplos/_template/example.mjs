// Rename this file to match the article's subject (e.g. `gate-shell.mjs`).
//
// Keep the decision logic in a pure, exported function: takes plain data in,
// returns a decision, no I/O. Everything else in this file — CLI plumbing,
// stdin/stdout, process.exit — stays out of that function so it's testable
// without mocking anything.

export function evaluate(input) {
  throw new Error('not implemented');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  // CLI entry point, when the example is meant to run standalone.
}

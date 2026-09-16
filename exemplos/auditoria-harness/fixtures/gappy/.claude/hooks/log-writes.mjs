// A hook with no sibling log-writes.test.mjs — that's AH05.
export function logWrite(filePath) {
  console.error(`wrote: ${filePath}`);
}

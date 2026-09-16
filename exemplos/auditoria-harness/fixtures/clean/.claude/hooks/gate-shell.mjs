// Stand-in for the real gate-shell.mjs — this fixture only needs to exist
// at this path, its content is never read by the audit.
export function evaluate() {
  return { decision: "allow" };
}

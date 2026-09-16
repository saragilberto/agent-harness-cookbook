/**
 * The same rule as `regra-hook.mjs`, written the way it would actually sit
 * in a `CLAUDE.md`: prose in a context window, read by the model and
 * agreed with, with nothing behind it that intercepts a tool call.
 */
export const RULE_TEXT = `
## Discounts

Never assign Invoice.discountPercent directly. Always go through
TaxRuleService::applyDiscount(), which recalculates tax alongside the
discount. A discount applied without recalculating tax is a wrong invoice
that looks correct until someone audits it.
`;

/**
 * There is no way to make this function do anything else. Reading the rule
 * and checking a string against it is not the same operation as
 * intercepting a write before it happens — this function proves that by
 * being unable to return anything but "not enforced", no matter what
 * `content` contains.
 *
 * @param {string} content
 * @returns {"not enforced"}
 */
export function checkTextRule(content) {
  return "not enforced";
}

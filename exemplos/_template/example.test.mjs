import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluate } from './example.mjs';

test('replace with a real case', () => {
  assert.throws(() => evaluate(null));
});

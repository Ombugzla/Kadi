import assert from 'node:assert/strict';
import { test } from 'node:test';
import { rpDelta } from '../www/js/rp.js';

test('Rank Point gains and losses are both doubled without changing tier scaling', () => {
  assert.equal(rpDelta(true, 2, [{ tier: 'Medium' }]), 4);
  assert.equal(rpDelta(false, 2, [{ tier: 'Medium' }]), -4);
  assert.equal(rpDelta(true, 2, [{ tier: 'Expert' }]), 8);
  assert.equal(rpDelta(false, 2, [{ tier: 'Easy' }]), -6);
});

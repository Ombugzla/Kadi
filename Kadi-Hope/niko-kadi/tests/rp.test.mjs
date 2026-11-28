import assert from 'node:assert/strict';
import { test } from 'node:test';
import { rpDelta } from '../www/js/rp.js';

test('Rank Point gains and losses have equal magnitude against the same lineup', () => {
  assert.equal(rpDelta(true, 2, [{ tier: 'Medium' }]), 4);
  assert.equal(rpDelta(false, 2, [{ tier: 'Medium' }]), -4);
  assert.equal(rpDelta(true, 2, [{ tier: 'Expert' }]), 8);
  assert.equal(rpDelta(false, 2, [{ tier: 'Expert' }]), -8);
  assert.equal(rpDelta(true, 2, [{ tier: 'Easy' }]), 2);
  assert.equal(rpDelta(false, 2, [{ tier: 'Easy' }]), -2);
  assert.equal(rpDelta(true, 4, [{ tier: 'Medium' }, { tier: 'Medium' }, { tier: 'Medium' }]), 12);
  assert.equal(rpDelta(false, 4, [{ tier: 'Medium' }, { tier: 'Medium' }, { tier: 'Medium' }]), -12);
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { winPattern } from '../www/js/sequence.js';

test('Special Sequence runs order Jack, Queen, King', () => {
  assert.equal(winPattern([10, 11, 12, 13]), 'run');
  assert.equal(winPattern([10, 11, 13, 12]), null);
  assert.equal(winPattern([12, 13, 1, 2]), 'run');
  assert.equal(winPattern([12, 1, 13, 2]), null);
});

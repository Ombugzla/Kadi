import assert from 'node:assert/strict';
import { test } from 'node:test';
import { winPattern } from '../www/js/sequence.js';

function permutations(values) {
  if (values.length < 2) return [values];
  return values.flatMap((value, i) => permutations(values.filter((_, j) => j !== i)).map((rest) => [value, ...rest]));
}

test('Special Sequence runs accept every order, including Ace as rank 1', () => {
  assert.equal(winPattern([10, 11, 12, 13]), 'run');
  for (const ranks of [[1, 2, 3, 4], [2, 3, 4, 5], [12, 13, 1, 2]]) {
    for (const order of permutations(ranks)) assert.equal(winPattern(order), 'run');
  }
  assert.equal(winPattern([1, 2, 3, 5]), null);
});

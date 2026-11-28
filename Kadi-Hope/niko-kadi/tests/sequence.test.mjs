import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cardId } from '../www/js/engine.js';
import { orderedRunCards, winPattern } from '../www/js/sequence.js';

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

test('cyclic runs display from their true start, including Queen-King-Ace-2', () => {
  const cards = ['QH', 'KD', 'AS', '2C'].map(cardId);
  const expected = ['QH', 'KD', 'AS', '2C'].map(cardId);
  for (const order of permutations(cards)) assert.deepEqual(orderedRunCards(order), expected);
  assert.equal(orderedRunCards(['AH', '2D', '4S', '5C'].map(cardId)), null);
});

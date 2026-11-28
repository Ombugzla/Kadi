import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BOTS, selectedOpponents } from '../www/js/bots.js';

test('selected bot opponents keep the chosen order', () => {
  const selected = selectedOpponents(['liu', 'sandra', 'alexa'], 'aloyce', 3);
  assert.deepEqual(selected.map((bot) => bot.id), ['liu', 'sandra', 'alexa']);
});

test('selected bot opponents reject duplicates, unknown ids, and the wrong count', () => {
  assert.throws(() => selectedOpponents(['liu', 'liu'], 'aloyce', 2), /Invalid bot selection/);
  assert.throws(() => selectedOpponents(['missing'], 'aloyce', 1), /Invalid bot selection/);
  assert.throws(() => selectedOpponents(['liu'], 'aloyce', 2), /exactly 2/);
});

test('bot opponent selection still defaults to the nearby roster', () => {
  assert.deepEqual(
    selectedOpponents(null, BOTS[2].id, 2).map((bot) => bot.id),
    ['natalia', 'haruto']
  );
});

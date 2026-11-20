import assert from 'node:assert/strict';
import { test } from 'node:test';

const storage = new Map();
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
};

const { BOTS, TIERS } = await import('../www/js/bots.js');
const { pairingsForRound, runDailyLeague } = await import('../www/js/league.js');

test('the bot roster has two players at each level', () => {
  assert.equal(BOTS.length, 8);
  for (const tier of TIERS) {
    assert.equal(BOTS.filter((bot) => bot.tier === tier).length, 2);
  }
});

test('round robin schedules every bot pair exactly once', () => {
  const pairs = Array.from({ length: BOTS.length - 1 }, (_, round) => pairingsForRound(round)).flat();
  assert.equal(pairs.length, BOTS.length * (BOTS.length - 1) / 2);
  assert.equal(new Set(pairs.map((pair) => pair.slice().sort().join(':'))).size, pairs.length);
});

test('daily local league runs four games and persists bot rating changes once', () => {
  const date = new Date('2026-03-01T10:00:00.000Z');
  const league = runDailyLeague(date);

  assert.equal(league.results.length, BOTS.length / 2);
  assert.equal(new Set(league.results.flatMap(({ a, b }) => [a, b])).size, BOTS.length);
  assert.ok(BOTS.some((bot) => league.ratings[bot.id] !== bot.lb));
  assert.equal(runDailyLeague(date), league);
});

import * as E from './engine.js';
import { BOTS, applyAction, chooseAction } from './bots.js';
import * as store from './store.js';

const DAYS_PER_ROUND = BOTS.length - 1;
const PAIRINGS = (() => {
  const players = BOTS.map((_, i) => i);
  const rounds = [];
  for (let round = 0; round < DAYS_PER_ROUND; round++) {
    rounds.push(Array.from({ length: players.length / 2 }, (_, i) => [
      BOTS[players[i]].id,
      BOTS[players[players.length - 1 - i]].id,
    ]));
    players.splice(1, 0, players.pop());
  }
  return rounds;
})();

function seedFrom(text) {
  let value = 2166136261;
  for (let i = 0; i < text.length; i++) {
    value ^= text.charCodeAt(i);
    value = Math.imul(value, 16777619);
  }
  return value | 0;
}

function simulateMatch(botA, botB, seed) {
  const game = E.newGame({
    players: [{ name: botA.name, bot: botA }, { name: botB.name, bot: botB }],
    seed,
  });
  const randomState = { seed: seed ^ 0x5f3759df };
  const rng = () => E.rand(randomState);
  let turns = 0;
  while (!game.over && turns < 3000) {
    const bot = game.players[game.cur].bot;
    const action = chooseAction(game, bot.L, rng);
    if (!action) throw new Error(`Bot ${bot.name} produced no action in the local league.`);
    const result = applyAction(game, action);
    if (!result.ok) throw new Error(`Bot ${bot.name} produced an invalid action in the local league.`);
    turns++;
  }
  if (!game.over) throw new Error(`Local league match ${botA.name} vs ${botB.name} exceeded the turn limit.`);
  return game.over.winner === 0 ? botA : botB;
}

function updateRatings(ratings, winnerId, loserId) {
  const winner = ratings[winnerId];
  const loser = ratings[loserId];
  const expectedWinner = 1 / (1 + (10 ** ((loser - winner) / 400)));
  const change = 24 * (1 - expectedWinner);
  ratings[winnerId] = winner + change;
  ratings[loserId] = loser - change;
}

export function pairingsForRound(round) {
  const index = ((round % DAYS_PER_ROUND) + DAYS_PER_ROUND) % DAYS_PER_ROUND;
  return PAIRINGS[index].map((pair) => pair.slice());
}

export function runDailyLeague(now = new Date()) {
  const day = now.toISOString().slice(0, 10);
  const current = store.get().botLeague;
  const complete = current.day === day && Array.isArray(current.results) && current.results.length === BOTS.length / 2;
  const hasRatings = BOTS.every((bot) => Number.isFinite(current.ratings?.[bot.id]));
  if (complete) {
    if (hasRatings) return current;
    const ratings = { ...current.ratings };
    for (const bot of BOTS) {
      if (!Number.isFinite(ratings[bot.id])) ratings[bot.id] = bot.lb;
    }
    const repaired = { ...current, ratings };
    store.get().botLeague = repaired;
    store.save();
    return repaired;
  }

  const epochDay = Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 864e5);
  const round = epochDay % DAYS_PER_ROUND;
  const pairings = pairingsForRound(round);
  const ratings = { ...current.ratings };
  for (const bot of BOTS) {
    if (!Number.isFinite(ratings[bot.id])) ratings[bot.id] = bot.lb;
  }

  const results = pairings.map(([aId, bId]) => {
    const botA = BOTS.find((bot) => bot.id === aId);
    const botB = BOTS.find((bot) => bot.id === bId);
    const winner = simulateMatch(botA, botB, seedFrom(`${day}:${aId}:${bId}`));
    const loser = winner.id === aId ? botB : botA;
    updateRatings(ratings, winner.id, loser.id);
    return { a: aId, b: bId, winner: winner.id };
  });

  const league = { day, round, ratings, results };
  store.get().botLeague = league;
  store.save();
  return league;
}
